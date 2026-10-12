import { db } from '../config/firebase';
import { collection, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore';

const MENU_COL = collection(db, 'menuItems');

// One-time fetch
export const getMenuItems = async () => {
  const q = query(MENU_COL, orderBy('sortOrder', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Real-time listener (useful for when admin updates availability)
export const subscribeToMenuItems = (callback) => {
  const q = query(MENU_COL, orderBy('sortOrder', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(items);
  }, (error) => {
    console.error("Error fetching menu items:", error);
  });
};
