const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const keyPath = path.join(__dirname, 'firebase-service-account.json');

if (!fs.existsSync(keyPath)) {
  console.error("❌ ERROR: firebase-service-account.json is missing.");
  console.error("Please place your Firebase Admin SDK json key in this folder.");
  process.exit(1);
}

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log("✅ Server started. Listening for order updates in Firestore...");

db.collection('orders').onSnapshot((snapshot) => {
  snapshot.docChanges().forEach(async (change) => {
    // We only care when an order is MODIFIED (Admin changed status)
    if (change.type === 'modified') {
      const order = change.doc.data();

      // Ensure we have the student's notification token
      if (order.fcmToken) {
        
        let messageTitle = "";
        let messageBody = "";

        // Decide what the notification says based on the status
        switch (order.status) {
          case 'confirmed':
            messageTitle = "Order Confirmed! 🎉";
            messageBody = `Your order #${order.orderNumber} has been accepted.`;
            break;
          case 'preparing':
            messageTitle = "Coffee's Brewing! ☕";
            messageBody = `Your order #${order.orderNumber} is being prepared.`;
            break;
          case 'ready':
            messageTitle = "Order Ready! 🎊";
            messageBody = "Your order is ready for pickup by our rider!";
            break;
          case 'out_for_delivery':
            messageTitle = "On the way! 🚀";
            messageBody = "Your order is out for delivery to you right now.";
            break;
          case 'delivered':
            messageTitle = "Delivered! ❤️";
            messageBody = "Enjoy your Crush Coarse Cafe order!";
            break;
        }

        // Send the notification!
        if (messageTitle) {
          const payload = {
            notification: {
              title: messageTitle,
              body: messageBody,
            },
            data: {
              title: messageTitle,
              body: messageBody,
              orderId: String(change.doc.id),
              orderNumber: String(order.orderNumber || ''),
              status: String(order.status || '')
            },
            webpush: {
              notification: {
                title: messageTitle,
                body: messageBody,
                icon: '/favicon.svg',
                badge: '/favicon.svg'
              },
              fcmOptions: {
                link: '/'
              }
            },
            token: order.fcmToken
          };

          try {
            await admin.messaging().send(payload);
            console.log(`[${new Date().toISOString()}] 📤 Sent notification to order #${order.orderNumber}: ${messageTitle}`);
          } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Error sending notification for order #${order.orderNumber}:`, error.message);
          }
        }
      }
    }
  });
});
