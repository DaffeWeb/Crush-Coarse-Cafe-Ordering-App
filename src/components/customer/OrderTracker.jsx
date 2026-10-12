import { useState, useEffect } from 'react';
import { useOrder } from '../../hooks/useOrder';
import { useNotifications } from '../../hooks/useNotifications';
import { useToast } from '../../context/ToastContext';
import { db } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ORDER_STATUSES } from '../../config/constants';
import { formatPrice, formatTime, formatOrderNumber } from '../../utils/formatters';
import './OrderTracker.css';

const STATUS_STEPS = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

export default function OrderTracker({ initialOrder, onClose }) {
  const { order: liveOrder } = useOrder(initialOrder?.id);
  const order = liveOrder || initialOrder;
  const { fcmToken, permission, requestPermission } = useNotifications();
  const toast = useToast();
  const [isEnablingNotifs, setIsEnablingNotifs] = useState(false);

  // Auto-sync token to Firestore if order is missing fcmToken but user has granted permission
  useEffect(() => {
    if (order?.id && !order.fcmToken && fcmToken) {
      const orderRef = doc(db, 'orders', order.id);
      updateDoc(orderRef, { fcmToken })
        .then(() => {
          const saved = localStorage.getItem('cc_active_order');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.id === order.id) {
                parsed.fcmToken = fcmToken;
                localStorage.setItem('cc_active_order', JSON.stringify(parsed));
              }
            } catch {
              // ignore
            }
          }
        })
        .catch((e) => console.warn('Could not auto-sync fcmToken to order:', e));
    }
  }, [order?.id, order?.fcmToken, fcmToken]);

  const handleEnableNotifs = async () => {
    setIsEnablingNotifs(true);
    try {
      const res = await requestPermission();
      if (res.permission === 'granted' && res.token && order?.id) {
        await updateDoc(doc(db, 'orders', order.id), { fcmToken: res.token });
        const saved = localStorage.getItem('cc_active_order');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.id === order.id) {
              parsed.fcmToken = res.token;
              localStorage.setItem('cc_active_order', JSON.stringify(parsed));
            }
          } catch {
            // ignore
          }
        }
        toast.success('Live notifications enabled for this order! 🎉');
      } else if (res.permission === 'denied') {
        toast.error('Notifications are blocked in your browser settings.');
      }
    } catch (err) {
      console.error('Failed to enable notifications:', err);
      toast.error('Failed to enable notifications');
    } finally {
      setIsEnablingNotifs(false);
    }
  };

  if (!order) return null;

  const isCancelled = order.status === 'cancelled';
  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="tracker-page">
      <div className="tracker-header">
        <div>
          <h2>Order {formatOrderNumber(order.orderNumber)}</h2>
          <p className="tracker-time">Placed at {formatTime(order.createdAt)}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={onClose} id="close-tracker">
          ✕
        </button>
      </div>

      {/* Status Banner */}
      <div
        className={`tracker-banner ${isCancelled ? 'cancelled' : ''}`}
        style={{ '--status-color': ORDER_STATUSES[order.status]?.color }}
      >
        <span className="tracker-banner-icon">
          {ORDER_STATUSES[order.status]?.icon}
        </span>
        <div>
          <div className="tracker-banner-label">
            {ORDER_STATUSES[order.status]?.label}
          </div>
          <div className="tracker-banner-hint">
            {order.status === 'pending' && 'Waiting for confirmation...'}
            {order.status === 'confirmed' && 'Your order has been accepted!'}
            {order.status === 'preparing' && 'Your items are being made ☕'}
            {order.status === 'ready' && 'Ready for pickup by our rider!'}
            {order.status === 'out_for_delivery' && 'On the way to you 🚀'}
            {order.status === 'delivered' && 'Enjoy your order! ❤️'}
            {order.status === 'cancelled' && 'This order has been cancelled.'}
          </div>
        </div>
      </div>

      {/* Notification Card */}
      {!isCancelled && order.status !== 'delivered' && (
        <div className="tracker-notif-card">
          {permission === 'granted' && (order.fcmToken || fcmToken) ? (
            <div className="tracker-notif-active">
              <span className="tracker-notif-icon">🔔</span>
              <div className="tracker-notif-text">
                <div className="tracker-notif-title">Push Notifications Active</div>
                <p className="tracker-notif-sub">You will receive live alerts when your order is brewing and on the way.</p>
              </div>
            </div>
          ) : (
            <div className="tracker-notif-prompt">
              <div className="tracker-notif-text">
                <div className="tracker-notif-title">
                  <span>🔔</span>
                  <span>Get real-time delivery alerts</span>
                </div>
                <p className="tracker-notif-sub">Never miss your rider! Turn on push notifications for this order.</p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm tracker-notif-btn"
                onClick={handleEnableNotifs}
                disabled={isEnablingNotifs}
                id="tracker-enable-notif-btn"
              >
                {isEnablingNotifs ? 'Enabling...' : 'Turn On Alerts'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step Progress */}
      {!isCancelled && order.status !== 'pending' && (
        <div className="tracker-steps">
          {STATUS_STEPS.map((step, index) => {
            const isComplete = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            return (
              <div
                key={step}
                className={`tracker-step ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}
              >
                <div className="step-dot">
                  {isComplete ? '✓' : (index + 1)}
                </div>
                {index < STATUS_STEPS.length - 1 && (
                  <div className={`step-line ${isComplete ? 'complete' : ''}`} />
                )}
                <div className="step-label">{ORDER_STATUSES[step]?.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details */}
      <div className="tracker-details">
        <h4>Order Details</h4>
        <div className="tracker-items">
          {order.items?.map((item, i) => (
            <div className="tracker-item" key={i}>
              <span>{item.name} × {item.quantity}</span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="tracker-item tracker-total">
            <span>Total</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
        </div>

        <div className="tracker-meta">
          <div className="tracker-meta-row">
            <span>📍 Delivery</span>
            <span>
              {order.deliveryLocation}
              {order.deliveryRoom ? ` — ${order.deliveryRoom}` : ''}
            </span>
          </div>
          <div className="tracker-meta-row">
            <span>💰 Payment</span>
            <span>
              {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'GCash'}
              {' — '}
              <span className={`badge badge-${order.paymentStatus === 'paid' ? 'ready' : 'pending'}`}>
                {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
