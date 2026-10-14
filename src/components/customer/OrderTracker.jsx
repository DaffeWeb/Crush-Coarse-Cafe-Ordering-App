import { useState, useEffect } from 'react';
import { useOrder } from '../../hooks/useOrder';
import { useNotifications } from '../../hooks/useNotifications';
import { useToast } from '../../context/ToastContext';
import { db } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateOrderStatus } from '../../services/orderService';
import { ORDER_STATUSES } from '../../config/constants';
import { formatPrice, formatTime, formatOrderNumber } from '../../utils/formatters';
import './OrderTracker.css';

const STATUS_STEPS = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];

export default function OrderTracker({ initialOrder, onClose, onClearOrder }) {
  const { order: liveOrder } = useOrder(initialOrder?.id);
  const order = liveOrder || initialOrder;
  const { fcmToken, permission, requestPermission } = useNotifications();
  const toast = useToast();
  const [isEnablingNotifs, setIsEnablingNotifs] = useState(false);

  // Cancellation State
  const [showConfirmCancelModal, setShowConfirmCancelModal] = useState(false);
  const [showCannotCancelModal, setShowCannotCancelModal] = useState(false);
  const [refundPlatform, setRefundPlatform] = useState('gcash');
  const [refundAccount, setRefundAccount] = useState(order?.customerPhone || '');
  const [isCancelling, setIsCancelling] = useState(false);

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

  const handleCancelClick = () => {
    if (order.status === 'pending') {
      setShowConfirmCancelModal(true);
    } else {
      setShowCannotCancelModal(true);
    }
  };

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      await updateOrderStatus(order.id, 'cancelled', {
        cancellationReason: 'Cancelled by customer while pending',
        refundPlatform: order.paymentMethod === 'gcash' ? refundPlatform : null,
        refundAccount: order.paymentMethod === 'gcash' ? refundAccount.trim() : null,
        refundStatus: order.paymentMethod === 'gcash' ? 'pending' : null,
      });
      toast.info('Your order has been cancelled.');
      setShowConfirmCancelModal(false);
    } catch (err) {
      console.error('Failed to cancel order:', err);
      toast.error('Failed to cancel order. Please try again.');
    } finally {
      setIsCancelling(false);
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
        <button 
          className="btn btn-outline btn-sm tracker-close-btn" 
          onClick={onClose} 
          id="close-tracker"
          title="Minimize order tracker to bottom bar"
        >
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
              <span className={`badge badge-${(order.paymentStatus === 'confirmed' || order.paymentStatus === 'paid') ? 'ready' : 'pending'}`}>
                {(order.paymentStatus === 'confirmed' || order.paymentStatus === 'paid') ? 'Confirmed' : 'Pending'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Cancellation & Actions Footer */}
      <div className="tracker-footer-actions">
        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <div className="tracker-cancel-container">
            <button
              type="button"
              className={`tracker-cancel-btn ${order.status === 'pending' ? 'active' : 'grayed-out'}`}
              onClick={handleCancelClick}
              id="tracker-cancel-btn"
            >
              <span>✕</span> Cancel Order
            </button>
            {order.status !== 'pending' && (
              <p className="tracker-cancel-note">
                Order is confirmed. Cancellation is disabled.
              </p>
            )}
          </div>
        )}

        {(order.status === 'cancelled' || order.status === 'delivered') && (
          <div className="tracker-completed-actions">
            {order.status === 'cancelled' && (
              <div className="tracker-cancelled-info">
                <span className="cancelled-pill">Order Cancelled</span>
                {order.refundPlatform && (
                  <p className="cancelled-refund-msg">
                    Refund requested via <strong>{order.refundPlatform.toUpperCase()}</strong>
                    {order.refundAccount ? ` (${order.refundAccount})` : ''}.
                    Our team will process this shortly.
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              className="btn btn-primary btn-block tracker-new-order-btn"
              onClick={onClearOrder}
            >
              {order.status === 'delivered' ? '☕ Order Again / New Order' : 'Start a New Order'}
            </button>
          </div>
        )}
      </div>

      {/* Modal: Cannot Cancel Once Confirmed */}
      {showCannotCancelModal && (
        <div 
          className="custom-modal-backdrop fade-in" 
          onClick={() => setShowCannotCancelModal(false)}
        >
          <div 
            className="custom-modal-dialog zoom-in" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="custom-modal-header">
              <div className="custom-modal-icon warning">⚠️</div>
              <h3 className="custom-modal-title">Cannot Cancel Order</h3>
            </div>
            <div className="custom-modal-body">
              <p className="custom-modal-main-text">
                You can&apos;t cancel the order now that it&apos;s confirmed.
              </p>
              <p className="custom-modal-sub-text">
                Our baristas have already accepted your order and begun brewing/preparing your drinks. For special assistance, please reach out to cafe staff.
              </p>
            </div>
            <div className="custom-modal-footer">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => setShowCannotCancelModal(false)}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Cancel while Pending */}
      {showConfirmCancelModal && (
        <div 
          className="custom-modal-backdrop fade-in" 
          onClick={() => !isCancelling && setShowConfirmCancelModal(false)}
        >
          <div 
            className="custom-modal-dialog zoom-in" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="custom-modal-header">
              <div className="custom-modal-icon danger">✕</div>
              <h3 className="custom-modal-title">Cancel Order?</h3>
            </div>
            <div className="custom-modal-body">
              <p className="custom-modal-main-text">
                Are you sure you want to cancel this order?
              </p>

              {order.paymentMethod === 'gcash' ? (
                <div className="modal-refund-box">
                  <div className="modal-refund-notice">
                    <span className="notice-icon">📢</span>
                    <div>
                      <strong>Refund Notice</strong>
                      <p>Refunds will only be given later for online payments.</p>
                    </div>
                  </div>

                  <div className="modal-platform-group">
                    <label className="modal-field-label">
                      What platform did you use to pay?
                    </label>
                    <div className="modal-platform-selector">
                      {[
                        { id: 'gcash', label: 'GCash', icon: '📱' },
                        { id: 'paymaya', label: 'Paymaya', icon: '💳' },
                        { id: 'gotyme', label: 'Gotyme', icon: '🏦' },
                      ].map((plat) => (
                        <button
                          type="button"
                          key={plat.id}
                          className={`platform-choice-btn ${refundPlatform === plat.id ? 'active' : ''}`}
                          onClick={() => setRefundPlatform(plat.id)}
                        >
                          <span className="platform-icon">{plat.icon}</span>
                          <span className="platform-name">{plat.label}</span>
                          {refundPlatform === plat.id && <span className="platform-check">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="modal-input-group">
                    <label htmlFor="refund-acct-input" className="modal-field-label">
                      Account / Phone Number for Refund:
                    </label>
                    <input
                      id="refund-acct-input"
                      type="text"
                      className="modal-text-input"
                      placeholder="e.g. 0917 123 4567"
                      value={refundAccount}
                      onChange={(e) => setRefundAccount(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="modal-cod-notice">
                  <span>💵</span>
                  <p>Since your order is Cash on Delivery, no payment has been charged.</p>
                </div>
              )}
            </div>
            <div className="custom-modal-footer dual">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowConfirmCancelModal(false)}
                disabled={isCancelling}
              >
                Keep Order
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
