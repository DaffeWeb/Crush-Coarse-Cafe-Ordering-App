import { useState, useEffect } from 'react';
import { subscribeToAllMenuItems, subscribeToInventory } from '../services/inventoryService';

export function useInventory() {
  const [menuItems, setMenuItems] = useState([]);
  const [inventory, setInventory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let menuLoaded = false;
    let invLoaded = false;

    const checkDone = () => {
      if (menuLoaded && invLoaded) setLoading(false);
    };

    const unsubMenu = subscribeToAllMenuItems(
      (items) => {
        setMenuItems(items);
        menuLoaded = true;
        checkDone();
      },
      (err) => {
        console.warn("Menu items subscription error in useInventory:", err);
        setError(err);
        menuLoaded = true;
        checkDone();
      }
    );

    const unsubInv = subscribeToInventory(
      (inv) => {
        setInventory(inv);
        invLoaded = true;
        checkDone();
      },
      (err) => {
        console.warn("Inventory subscription error in useInventory:", err);
        setError(err);
        invLoaded = true;
        checkDone();
      }
    );

    return () => {
      unsubMenu();
      unsubInv();
    };
  }, []);

  // Merge inventory data into menu items for convenience
  const itemsWithStock = menuItems.map((item) => ({
    ...item,
    stockInfo: inventory[item.id] || {
      stock: null,
      sold: 0,
      remaining: null,
      needsRestock: true,
    },
  }));

  return { menuItems: itemsWithStock, inventory, loading, error };
}
