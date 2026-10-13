import { db } from '../config/firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  setDoc,
  writeBatch,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';

const MENU_COL = collection(db, 'menuItems');
const INVENTORY_COL = collection(db, 'inventory');

// ─── Menu Item CRUD ──────────────────────────────────────

export const addMenuItem = async (itemData) => {
  // Get next sort order
  const snapshot = await getDocs(query(MENU_COL, orderBy('sortOrder', 'desc')));
  const maxSort = snapshot.empty ? 0 : (snapshot.docs[0].data().sortOrder || 0);

  const newItem = {
    ...itemData,
    sortOrder: maxSort + 1,
    available: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(MENU_COL, newItem);
  return { id: docRef.id, ...newItem };
};

export const updateMenuItem = async (itemId, updates) => {
  const ref = doc(db, 'menuItems', itemId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteMenuItem = async (itemId) => {
  const ref = doc(db, 'menuItems', itemId);
  await deleteDoc(ref);
  // Also delete matching inventory doc if it exists
  try {
    const invRef = doc(db, 'inventory', itemId);
    await deleteDoc(invRef);
  } catch {
    // Ignore — inventory doc may not exist
  }
};

export const toggleItemAvailability = async (itemId, available) => {
  const ref = doc(db, 'menuItems', itemId);
  await updateDoc(ref, {
    available,
    updatedAt: serverTimestamp(),
  });
};

// ─── Stock / Inventory ───────────────────────────────────

/**
 * Get today's date string for keying daily stock.
 */
export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Set today's stock for an item.
 * Stored in inventory/{menuItemId}.
 * If resetSold is false and item was already initialized today, keeps existing sold count.
 */
export const setDailyStock = async (menuItemId, stockCount, resetSold = false) => {
  const ref = doc(db, 'inventory', menuItemId);
  const key = todayKey();
  const count = Number(stockCount);

  let existingSold = 0;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      const isNewDay = data.lastStockDate !== key;
      if (!isNewDay && !resetSold) {
        existingSold = data[`sold_${key}`] || 0;
      }
    }
  } catch {
    // If read fails, fallback to 0
  }

  await setDoc(ref, {
    [`stock_${key}`]: count,
    [`sold_${key}`]: existingSold,
    lastStockDate: key,
    lastStockCount: count,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

/**
 * Batch set today's initial stock for multiple items in one atomic operation.
 * itemsStockMap is { [itemId]: count }
 */
export const setBatchDailyStocks = async (itemsStockMap) => {
  const key = todayKey();
  const batch = writeBatch(db);

  for (const [itemId, count] of Object.entries(itemsStockMap)) {
    const num = parseInt(count, 10);
    if (!isNaN(num) && num >= 0) {
      const ref = doc(db, 'inventory', itemId);
      batch.set(ref, {
        [`stock_${key}`]: num,
        [`sold_${key}`]: 0,
        lastStockDate: key,
        lastStockCount: num,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  }

  await batch.commit();
};

/**
 * Decrement stock when an order is placed.
 * Reduces remaining for today.
 */
export const decrementStock = async (menuItemId, quantity = 1) => {
  const ref = doc(db, 'inventory', menuItemId);
  const key = todayKey();

  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const currentSold = data[`sold_${key}`] || 0;

  await updateDoc(ref, {
    [`sold_${key}`]: currentSold + quantity,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Restore stock if an order is cancelled.
 */
export const restoreStock = async (menuItemId, quantity = 1) => {
  const ref = doc(db, 'inventory', menuItemId);
  const key = todayKey();

  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const currentSold = data[`sold_${key}`] || 0;
  const newSold = Math.max(0, currentSold - quantity);

  await updateDoc(ref, {
    [`sold_${key}`]: newSold,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Subscribe to all inventory docs in real-time.
 * Returns { [menuItemId]: { stock, sold, remaining, date } }
 */
export const subscribeToInventory = (callback, onError) => {
  return onSnapshot(
    INVENTORY_COL,
    (snapshot) => {
      const key = todayKey();
      const inventory = {};

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const stock = data[`stock_${key}`];
        const sold = data[`sold_${key}`] || 0;

        inventory[docSnap.id] = {
          stock: stock ?? null,           // null means no stock set for today
          sold,
          remaining: stock != null ? Math.max(0, stock - sold) : null,
          lastStockDate: data.lastStockDate,
          lastStockCount: data.lastStockCount,
          needsRestock: data.lastStockDate !== key, // true if stock hasn't been set today
        };
      });

      callback(inventory);
    },
    (err) => {
      console.warn("Inventory subscription error (check Firestore rules for 'inventory' collection):", err);
      if (onError) onError(err);
    }
  );
};

/**
 * Subscribe to all menu items (including unavailable ones — for admin).
 */
export const subscribeToAllMenuItems = (callback, onError) => {
  const q = query(MENU_COL, orderBy('sortOrder', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(items);
    },
    (err) => {
      console.warn("Menu items subscription error (check Firestore rules for 'menuItems' collection):", err);
      if (onError) onError(err);
    }
  );
};
