import { useState, useEffect } from 'react';
import { subscribeToMenuItems } from '../services/menuService';

export function useMenu() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToMenuItems((items) => {
      // Filter out items that are marked as unavailable
      const availableItems = items.filter(item => item.available !== false);
      setMenuItems(availableItems);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { menuItems, loading };
}
