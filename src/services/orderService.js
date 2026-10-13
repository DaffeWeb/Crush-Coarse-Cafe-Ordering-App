import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  orderBy, 
  limit,
  getCountFromServer
} from 'firebase/firestore';
import { APP_CONFIG } from '../config/constants';
import { decrementStock, restoreStock } from './inventoryService';

const ORDERS_COL = collection(db, 'orders');

export const createOrder = async (orderData) => {
  // Check daily limit per customer phone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  try {
    const q = query(
      ORDERS_COL,
      where('customerPhone', '==', orderData.customerPhone),
      where('createdAt', '>=', today)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.size >= APP_CONFIG.orderLimitPerDay) {
      throw new Error(`You have reached the daily limit of ${APP_CONFIG.orderLimitPerDay} orders.`);
    }
  } catch (err) {
    if (err.message && err.message.includes('daily limit')) {
      throw err;
    }
    console.warn('Daily limit check query skipped:', err);
  }

  // Get next globally unique, sequential order number
  let highestOrderNumber = 0;
  let totalOrdersCount = 0;

  // 1. Query the document with the highest existing orderNumber
  try {
    const highestNumQ = query(ORDERS_COL, orderBy('orderNumber', 'desc'), limit(1));
    const highestNumSnapshot = await getDocs(highestNumQ);
    if (!highestNumSnapshot.empty) {
      highestOrderNumber = Number(highestNumSnapshot.docs[0].data().orderNumber) || 0;
    }
  } catch (err) {
    console.warn('Could not query highest orderNumber by field:', err);
  }

  // 2. Also inspect the most recently created orders to catch any where orderNumber index is updating
  try {
    const recentQ = query(ORDERS_COL, orderBy('createdAt', 'desc'), limit(10));
    const recentSnapshot = await getDocs(recentQ);
    recentSnapshot.forEach((docSnap) => {
      const num = Number(docSnap.data().orderNumber) || 0;
      if (num > highestOrderNumber) {
        highestOrderNumber = num;
      }
    });
  } catch (err) {
    console.warn('Could not query recent orders by createdAt:', err);
  }

  // 3. Query total count from server so every historical order is accounted for
  try {
    const countSnapshot = await getCountFromServer(ORDERS_COL);
    totalOrdersCount = countSnapshot.data().count || 0;
  } catch (err) {
    console.warn('Could not get total orders count from server:', err);
  }

  // 4. Local client fallback to protect rapid back-to-back submissions
  let localHighest = 0;
  try {
    localHighest = Number(localStorage.getItem('cc_last_global_order_num') || 0);
  } catch {
    // ignore
  }

  // Every single order receives a globally unique, strictly incrementing integer
  const nextOrderNumber = Math.max(highestOrderNumber, totalOrdersCount, localHighest) + 1;

  const newOrder = {
    ...orderData,
    orderNumber: nextOrderNumber,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(ORDERS_COL, newOrder);

  // Decrement stock for each item (best-effort — don't block the order on failure)
  if (orderData.items && Array.isArray(orderData.items)) {
    for (const item of orderData.items) {
      try {
        await decrementStock(item.id, item.quantity || 1);
      } catch (err) {
        console.warn(`Failed to decrement stock for ${item.id}:`, err);
      }
    }
  }

  // Remember latest order number locally
  try {
    localStorage.setItem('cc_last_global_order_num', String(nextOrderNumber));
  } catch {
    // ignore
  }

  return { 
    id: docRef.id, 
    ...newOrder, 
    createdAt: new Date(), 
    updatedAt: new Date() 
  };
};

export const updateOrderStatus = async (orderId, newStatus) => {
  const orderRef = doc(db, 'orders', orderId);

  // If cancelling order, restore stock for items
  if (newStatus === 'cancelled') {
    try {
      const snap = await getDoc(orderRef);
      if (snap.exists()) {
        const orderData = snap.data();
        if (orderData.status !== 'cancelled' && Array.isArray(orderData.items)) {
          for (const item of orderData.items) {
            await restoreStock(item.id, item.quantity || 1);
          }
        }
      }
    } catch (err) {
      console.warn('Could not restore stock on cancellation:', err);
    }
  }

  await updateDoc(orderRef, {
    status: newStatus,
    updatedAt: serverTimestamp()
  });
};

export const updatePaymentStatus = async (orderId, status) => {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
        paymentStatus: status,
        updatedAt: serverTimestamp()
    });
};

export const claimDelivery = async (orderId, delivererId) => {
  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, {
    status: 'out_for_delivery',
    claimedByDeliverer: delivererId,
    updatedAt: serverTimestamp()
  });
};
