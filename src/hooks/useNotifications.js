import { useState, useEffect, useRef, useCallback } from 'react';
import app from '../config/firebase';
import { getMessaging, isSupported, getToken, onMessage } from 'firebase/messaging';

const TOKEN_STORAGE_KEY = 'cc_fcm_token';

export function useNotifications() {
  const [fcmToken, setFcmToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  const [permission, setPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const [isSupportedState, setIsSupportedState] = useState(true);
  const setupPromiseRef = useRef(null);
  const unsubscribeRef = useRef(null);

  const setupMessaging = useCallback(async () => {
    if (setupPromiseRef.current) {
      return setupPromiseRef.current;
    }

    const runSetup = async () => {
      try {
        const supported = await isSupported();
        if (!supported) {
          console.warn('Firebase Messaging is not supported in this browser.');
          setIsSupportedState(false);
          return null;
        }

        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
          console.warn('Service Worker is not supported in this browser.');
          return null;
        }

        const messaging = getMessaging(app);

        // Register service worker and await readiness
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;

        const token = await getToken(messaging, {
          serviceWorkerRegistration: registration,
        });

        if (token) {
          setFcmToken(token);
          try {
            localStorage.setItem(TOKEN_STORAGE_KEY, token);
          } catch {
            // ignore localStorage quota errors
          }

          // Clean up previous foreground listener if any
          if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
          }

          // Set up foreground message listener
          unsubscribeRef.current = onMessage(messaging, (payload) => {
            console.log('Message received in foreground: ', payload);
            const title = payload.notification?.title || payload.data?.title || 'Crush Coarse Cafe';
            const body = payload.notification?.body || payload.data?.body || '';

            // Safe notification display (avoiding "Illegal constructor" on mobile Chrome)
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(title, {
                  body,
                  icon: '/favicon.svg',
                  badge: '/favicon.svg'
                });
              }).catch(() => {
                try {
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(title, { body, icon: '/favicon.svg' });
                  }
                } catch {
                  // ignore
                }
              });
            } else if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(title, { body, icon: '/favicon.svg' });
              } catch {
                // ignore
              }
            }

            // Dispatch custom window event so in-app UI/toast can also show it immediately
            window.dispatchEvent(
              new CustomEvent('cc_foreground_push', {
                detail: { title, body, payload }
              })
            );
          });

          return token;
        }
        return null;
      } catch (err) {
        console.error('An error occurred while retrieving token:', err);
        return null;
      } finally {
        setupPromiseRef.current = null;
      }
    };

    setupPromiseRef.current = runSetup();
    return setupPromiseRef.current;
  }, []);

  useEffect(() => {
    // If permission is already granted, setup messaging eagerly in the background
    if (permission === 'granted') {
      setupMessaging();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [permission, setupMessaging]);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('This browser does not support notifications.');
      return { permission: 'denied', token: null };
    }

    try {
      const p = await Notification.requestPermission();
      setPermission(p);

      if (p === 'granted') {
        const token = await setupMessaging();
        return { permission: p, token };
      }
      return { permission: p, token: null };
    } catch (err) {
      console.error('Failed to request permission', err);
      return { permission: 'denied', token: null };
    }
  }, [setupMessaging]);

  const ensureToken = useCallback(async () => {
    if (fcmToken) return fcmToken;

    try {
      const cached = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (cached) {
        setFcmToken(cached);
        return cached;
      }
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      return await setupMessaging();
    }

    return null;
  }, [fcmToken, setupMessaging]);

  return {
    fcmToken,
    permission,
    requestPermission,
    ensureToken,
    isSupported: isSupportedState,
  };
}
