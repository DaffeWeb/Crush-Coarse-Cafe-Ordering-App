import { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { updateOrderStatus } from '../services/orderService';
import { ORDER_STATUSES } from '../config/constants';
import { formatPrice, formatOrderNumber, timeAgo, getDeliveryLabel } from '../utils/formatters';
import './DeliveryDashboard.css';

export default function DeliveryDashboard() {
  const { orders, loading, error } = useOrders();
  const { logout, currentUser } = useAuth();
  const toast = useToast();
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('ready');
  const [processingId, setProcessingId] = useState(null);

  // Filter orders relevant to delivery
  const readyOrders = orders.filter((o) => o.status === 'ready');
  const onTheWayOrders = orders.filter((o) => o.status === 'out_for_delivery');
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');

  const displayOrders =
    activeTab === 'ready'
      ? readyOrders
      : activeTab === 'on_the_way'
      ? onTheWayOrders
      : deliveredOrders;

  const handlePickUp = async (orderId) => {
    setProcessingId(orderId);
    try {
      await updateOrderStatus(orderId, 'out_for_delivery');
      toast.success('Order picked up — marked as On the Way! 🚀');
    } catch (err) {
      toast.error('Failed to update order status');
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkDelivered = async (orderId) => {
    setProcessingId(orderId);
    try {
      await updateOrderStatus(orderId, 'delivered');
      toast.success('Order delivered! ✨');
    } catch (err) {
      toast.error('Failed to mark as delivered');
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="delivery-page">
        <div className="delivery-loading">
          <div className="delivery-loading-icon">🚀</div>
          <span>Loading deliveries…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="delivery-page">
        <div className="delivery-error">Error loading orders. Please refresh.</div>
      </div>
    );
  }

  return (
    <div className="delivery-page">
      {/* Header */}
      <header className="delivery-header">
        <div className="delivery-header-content">
          <div className="delivery-header-left">
            <h1>🛵 Deliveries</h1>
            <span className="delivery-user-badge">
              {currentUser?.email?.split('@')[0] || 'Delivery'}
            </span>
          </div>
          <button className="btn btn-outline btn-sm delivery-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {/* Status summary cards */}
      <div className="delivery-stats">
        <div
          className={`stat-card ${activeTab === 'ready' ? 'active' : ''}`}
          onClick={() => setActiveTab('ready')}
        >
          <span className="stat-icon">🎉</span>
          <span className="stat-count">{readyOrders.length}</span>
          <span className="stat-label">Ready for Pickup</span>
        </div>
        <div
          className={`stat-card ${activeTab === 'on_the_way' ? 'active' : ''}`}
          onClick={() => setActiveTab('on_the_way')}
        >
          <span className="stat-icon">🚀</span>
          <span className="stat-count">{onTheWayOrders.length}</span>
          <span className="stat-label">On the Way</span>
        </div>
        <div
          className={`stat-card ${activeTab === 'delivered' ? 'active' : ''}`}
          onClick={() => setActiveTab('delivered')}
        >
          <span className="stat-icon">✨</span>
          <span className="stat-count">{deliveredOrders.length}</span>
          <span className="stat-label">Delivered Today</span>
        </div>
      </div>

      {/* Orders List */}
      <main className="delivery-main">
        <div className="delivery-section-header">
          <h2>
            {activeTab === 'ready' && '🎉 Ready for Pickup'}
            {activeTab === 'on_the_way' && '🚀 On the Way'}
            {activeTab === 'delivered' && '✨ Delivered'}
          </h2>
          <span className="delivery-count-badge">{displayOrders.length}</span>
        </div>

        {displayOrders.length === 0 ? (
          <div className="delivery-empty">
            <div className="delivery-empty-icon">
              {activeTab === 'ready' ? '☕' : activeTab === 'on_the_way' ? '🛵' : '🎊'}
            </div>
            <p>
              {activeTab === 'ready' && 'No orders ready for pickup right now.'}
              {activeTab === 'on_the_way' && 'No deliveries in progress.'}
              {activeTab === 'delivered' && 'No deliveries completed yet today.'}
            </p>
          </div>
        ) : (
          <div className="delivery-orders-list">
            {displayOrders.map((order) => (
              <div
                className={`delivery-order-card card ${
                  expandedOrder === order.id ? 'expanded' : ''
                }`}
                key={order.id}
                onClick={() =>
                  setExpandedOrder(expandedOrder === order.id ? null : order.id)
                }
              >
                {/* Card top */}
                <div className="delivery-card-top">
                  <div className="delivery-card-left">
                    <span className="delivery-order-num">
                      {formatOrderNumber(order.orderNumber)}
                    </span>
                    <span className={`badge badge-${order.status === 'out_for_delivery' ? 'delivering' : order.status}`}>
                      {ORDER_STATUSES[order.status]?.icon} {ORDER_STATUSES[order.status]?.label}
                    </span>
                  </div>
                  <span className="delivery-time">{timeAgo(order.createdAt)}</span>
                </div>

                {/* Customer & Location */}
                <div className="delivery-card-info">
                  <div className="delivery-info-row">
                    <span className="delivery-info-icon">👤</span>
                    <span className="delivery-customer">{order.customerName}</span>
                  </div>
                  <div className="delivery-info-row">
                    <span className="delivery-info-icon">📍</span>
                    <span className="delivery-location">{getDeliveryLabel(order)}</span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="delivery-items-preview">
                  {order.items?.map((item, i) => (
                    <span key={i} className="delivery-item-tag">
                      {item.name} ×{item.quantity}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="delivery-card-footer">
                  <span className="delivery-total">{formatPrice(order.totalAmount)}</span>
                  <span className={`payment-badge ${order.paymentMethod}`}>
                    {order.paymentMethod === 'gcash' ? '📱 GCash' : '💵 COD'}
                    <span className={`pay-status ${order.paymentStatus}`}>
                      {(order.paymentStatus === 'confirmed' || order.paymentStatus === 'paid') ? ' ✓' : ' ⏳'}
                    </span>
                  </span>
                </div>

                {/* Direct Action Buttons for Rider */}
                {order.status === 'ready' && (
                  <div className="delivery-quick-action" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-primary btn-lg btn-block delivery-action-btn"
                      onClick={() => handlePickUp(order.id)}
                      disabled={processingId === order.id}
                    >
                      {processingId === order.id ? 'Updating…' : '🚀 Pick Up & Deliver'}
                    </button>
                  </div>
                )}
                {order.status === 'out_for_delivery' && (
                  <div className="delivery-quick-action" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-primary btn-lg btn-block delivery-action-btn delivered-btn"
                      onClick={() => handleMarkDelivered(order.id)}
                      disabled={processingId === order.id}
                    >
                      {processingId === order.id ? 'Updating…' : '✨ Mark as Delivered'}
                    </button>
                  </div>
                )}

                <div className="delivery-expand-hint">
                  {expandedOrder === order.id ? '▲ Less details' : '▼ Tap for customer contact & delivery notes'}
                </div>

                {/* Expanded Details */}
                {expandedOrder === order.id && (
                  <div className="delivery-expanded fade-in" onClick={(e) => e.stopPropagation()}>
                    <div className="delivery-detail-row">
                      <span>📞</span>
                      <a href={`tel:${order.customerPhone}`} className="delivery-phone-link">
                        Call {order.customerName}: <strong>{order.customerPhone}</strong>
                      </a>
                    </div>
                    {order.deliveryNotes ? (
                      <div className="delivery-detail-row">
                        <span>📝</span>
                        <span className="delivery-notes">"{order.deliveryNotes}"</span>
                      </div>
                    ) : (
                      <div className="delivery-detail-row">
                        <span>📝</span>
                        <span className="delivery-notes">No special delivery instructions</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
