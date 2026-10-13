import { useState, useEffect } from 'react';
import { subscribeToMenuItems } from '../services/menuService';
import { subscribeToInventory } from '../services/inventoryService';

export function useMenu() {
  const [menuItems, setMenuItems] = useState([]);
  const [inventory, setInventory] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let menuLoaded = false;
    let invLoaded = false;

    const checkDone = () => {
      if (menuLoaded && invLoaded) setLoading(false);
    };

    const unsubMenu = subscribeToMenuItems(
      (items) => {
        // Filter out items that are marked as unavailable
        const availableItems = items.filter(item => item.available !== false);
        setMenuItems(availableItems);
        menuLoaded = true;
        checkDone();
      },
      (err) => {
        console.warn("Menu items subscription error:", err);
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
        console.warn("Inventory subscription error (falling back to default availability):", err);
        invLoaded = true;
        checkDone();
      }
    );

    return () => {
      unsubMenu();
      unsubInv();
    };
  }, []);

  // Merge stock info: if an item has stock tracked and remaining is 0, mark it
  const itemsWithStock = menuItems.map((item) => {
    const stockInfo = inventory[item.id];
    const outOfStock = stockInfo && stockInfo.remaining !== null && stockInfo.remaining <= 0;
    return {
      ...item,
      stockInfo: stockInfo || null,
      outOfStock: !!outOfStock,
    };
  });

  return { menuItems: itemsWithStock, loading };
}
