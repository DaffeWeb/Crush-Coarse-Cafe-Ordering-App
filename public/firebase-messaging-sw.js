importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAg_WziCk7T1qG5-ZXHzY4q79rGF5Ku9e0",
  authDomain: "crush-coarse-cafe.firebaseapp.com",
  projectId: "crush-coarse-cafe",
  storageBucket: "crush-coarse-cafe.firebasestorage.app",
  messagingSenderId: "183399220876",
  appId: "1:183399220876:web:bda4d124ca46d4cd3f5da9"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Crush Coarse Cafe';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Order update received.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
