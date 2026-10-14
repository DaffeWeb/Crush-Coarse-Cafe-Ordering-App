import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export function useOrder(orderId) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'orders', orderId),
      (doc) => {
        if (doc.exists()) {
          setOrder({ id: doc.id, ...doc.data() });
        } else {
          setOrder(null);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Error fetching order in useOrder:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  return { order, loading };
}
