import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../hooks/useNotifications';
import MenuGrid from '../components/customer/MenuGrid';
import Cart from '../components/customer/Cart';
import Checkout from '../components/customer/Checkout';
import OrderTracker from '../components/customer/OrderTracker';
import { createOrder } from '../services/orderService';
import { uploadReceipt } from '../services/storageService';
import { useOrder } from '../hooks/useOrder';
import { ORDER_STATUSES } from '../config/constants';
import { formatPrice, formatOrderNumber } from '../utils/formatters';
import cafeLogo from '../assets/logo-main.svg';
import './CustomerPage.css';

export default function CustomerPage() {
  const savedOrder = localStorage.getItem('cc_active_order');
  const initialOrder = savedOrder ? JSON.parse(savedOrder) : null;
  
  const [view, setView] = useState(initialOrder ? 'tracker' : 'menu');
  const [currentOrder, setCurrentOrder] = useState(initialOrder);
  const { order: liveOrder } = useOrder(currentOrder?.id);
  
  // Only evaluate activeOrder if currentOrder is not cleared
  const activeOrder = currentOrder ? (liveOrder || currentOrder) : null;

  // Sync latest order data to localStorage ONLY when order is actively tracked
  useEffect(() => {
    if (currentOrder && liveOrder) {
      localStorage.setItem('cc_active_order', JSON.stringify(liveOrder));
    }
  }, [currentOrder, liveOrder]);

  const handleClearActiveOrder = () => {
    localStorage.removeItem('cc_active_order');
    setCurrentOrder(null);
  };
  const { setCartOpen, isOpen } = useCart();
  const toast = useToast();
  const { fcmToken, permission, requestPermission, ensureToken } = useNotifications();

  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('cc_notif_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    try {
      sessionStorage.setItem('cc_notif_banner_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const res = await requestPermission();
      if (res.permission === 'granted') {
        toast.success('Push notifications enabled! 🎉');
      } else if (res.permission === 'denied') {
        toast.error('Notifications were blocked. Please enable them in browser settings.');
      }
    } catch (err) {
      console.error('Failed to enable notifications', err);
      toast.error('Failed to enable notifications');
    }
  };

  // Foreground push notification listener to show toasts when in the app
  useEffect(() => {
    const handleForegroundPush = (e) => {
      const { title, body } = e.detail || {};
      if (title) {
        toast.info(`${title} — ${body}`);
      }
    };
    window.addEventListener('cc_foreground_push', handleForegroundPush);
    return () => window.removeEventListener('cc_foreground_push', handleForegroundPush);
  }, [toast]);

  const handleGoToCheckout = () => {
    setCartOpen(false);
    setView('checkout');
    window.scrollTo(0, 0);
  };

  const handleSubmitOrder = async (orderData) => {
    try {
      let currentToken = fcmToken;
      // If user has already granted permission, ensure the token is retrieved
      if (!currentToken && permission === 'granted') {
        currentToken = await ensureToken();
      }

      let finalOrderData = { ...orderData };
      if (currentToken) {
        finalOrderData.fcmToken = currentToken;
      }

      if (orderData.paymentMethod === 'gcash' && orderData.gcashReceipt) {
        const downloadUrl = await uploadReceipt(orderData.gcashReceipt);
        finalOrderData.gcashReceiptUrl = downloadUrl;
      }
      delete finalOrderData.gcashReceipt; // Remove File object

      const newOrder = await createOrder(finalOrderData);
      setCurrentOrder(newOrder);
      localStorage.setItem('cc_active_order', JSON.stringify(newOrder));
      setView('tracker');
      toast.success('Order placed successfully! 🎉');
      window.scrollTo(0, 0);
    } catch (err) {
      toast.error(err.message || 'Failed to place order.');
      throw err;
    }
  };

  return (
    <div className="customer-page">
      <header className="customer-header">
        <div className="header-content">
          <div className="header-top-bar">
            <div className="header-branding">
              <div className="header-brand-wrap">
                <img src={cafeLogo} alt="Crush Coarse Cafe Logo" className="header-brand-logo" />
                <div className="header-brand-text">
                  <h1 className="header-brand-title">Crush Coarse Cafe</h1>
                  <p className="header-brand-subtitle">Campus Delivery</p>
                </div>
              </div>
            </div>
            <div className="header-actions">
              {permission === 'default' && (
                <button
                  type="button"
                  className="header-notif-btn"
                  onClick={handleEnableNotifications}
                  title="Enable push notifications"
                >
                  <span className="notif-pulse-dot" />
                  <span className="notif-bell-icon">🔔</span>
                  <span className="notif-btn-label">Alerts</span>
                </button>
              )}
              {permission === 'granted' && (
                <div className="header-notif-badge active" title="Push notifications active">
                  <span className="notif-bell-icon">🔔</span>
                  <span className="notif-badge-label">Alerts On</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Proactive Notification Banner on Menu */}
      {view === 'menu' && !bannerDismissed && permission === 'default' && (
        <div className="customer-notif-banner">
          <div className="customer-notif-banner-content">
            <span className="customer-notif-banner-icon">🔔</span>
            <div className="customer-notif-banner-text">
              <strong>Get live order status updates</strong>
              <p>Receive push notifications when your drink is brewing and out for delivery.</p>
            </div>
          </div>
          <div className="customer-notif-banner-actions">
            <button
              type="button"
              className="btn btn-sm btn-primary customer-notif-enable-btn"
              onClick={handleEnableNotifications}
            >
              Enable
            </button>
            <button
              type="button"
              className="customer-notif-close-btn"
              onClick={handleDismissBanner}
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <main className="customer-main">
        {view === 'menu' && (
          <>
            <MenuGrid />
            <Cart onCheckout={handleGoToCheckout} />
            
            {/* Floating cart button for mobile when cart is closed */}
            {!isOpen && (
              <div className={`floating-cart-wrapper ${activeOrder ? 'has-minimized-order' : ''}`}>
                <button className="floating-cart-btn" onClick={() => setCartOpen(true)}>
                  🛒 View Cart
                </button>
              </div>
            )}
          </>
        )}

        {view === 'checkout' && (
          <Checkout 
            onSubmitOrder={handleSubmitOrder} 
            onBack={() => setView('menu')} 
            notificationPermission={permission}
            fcmToken={fcmToken}
            onRequestPermission={handleEnableNotifications}
          />
        )}

        {view === 'tracker' && (
          <OrderTracker 
            initialOrder={activeOrder} 
            onClose={() => {
              // Persist order and minimize to bottom bar
              setView('menu');
            }} 
            onClearOrder={() => {
              handleClearActiveOrder();
              setView('menu');
            }}
          />
        )}
      </main>

      {/* Minimized Persistent Order Bar at Bottom */}
      {view === 'menu' && activeOrder && (
        <div 
          className="minimized-order-bar" 
          onClick={() => {
            setView('tracker');
            window.scrollTo(0, 0);
          }}
          title="Click to view live order tracking"
        >
          <div className="minimized-order-left">
            <div 
              className={`minimized-status-bubble ${activeOrder.status}`}
              style={{ '--status-color': ORDER_STATUSES[activeOrder.status]?.color }}
            >
              <span className="minimized-status-icon">
                {ORDER_STATUSES[activeOrder.status]?.icon || '☕'}
              </span>
              <span className="minimized-pulse-ring" />
            </div>
            <div className="minimized-order-info">
              <div className="minimized-order-title">
                <span className="order-number-tag">Order {formatOrderNumber(activeOrder.orderNumber)}</span>
                <span className="order-price-tag">
                  {formatPrice(activeOrder.totalAmount)}
                </span>
              </div>
              <div className="minimized-order-status-row">
                <span 
                  className="minimized-status-badge"
                  style={{ 
                    backgroundColor: `${ORDER_STATUSES[activeOrder.status]?.color}22`,
                    color: ORDER_STATUSES[activeOrder.status]?.color || 'var(--cc-gold)'
                  }}
                >
                  {ORDER_STATUSES[activeOrder.status]?.label || activeOrder.status}
                </span>
                <span className="minimized-tap-hint">Tap to view</span>
              </div>
            </div>
          </div>

          <div className="minimized-order-right">
            <button 
              type="button"
              className="minimized-expand-btn"
              aria-label="Expand order status"
            >
              ⤢
            </button>
            {(activeOrder.status === 'delivered' || activeOrder.status === 'cancelled') && (
              <button
                type="button"
                className="minimized-dismiss-btn"
                title="Dismiss order"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearActiveOrder();
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
