import { useState } from 'react';
import { ORDER_STATUSES, STATUS_FLOW } from '../../config/constants';
import { formatPrice, formatOrderNumber, timeAgo, getDeliveryLabel } from '../../utils/formatters';
import './OrderBoard.css';

const BOARD_COLUMNS = [
  { status: 'pending', label: '⏳ Pending' },
  { status: 'confirmed', label: '✅ Confirmed' },
  { status: 'preparing', label: '☕ Preparing' },
  { status: 'ready', label: '🎉 Ready' },
  { status: 'out_for_delivery', label: '🚀 On the Way' },
  { status: 'delivered', label: '✨ Delivered' },
];

export default function OrderBoard({ orders, onUpdateStatus, onViewReceipt }) {
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  const activeOrders = orders.filter(
    (o) => !['delivered', 'cancelled'].includes(o.status)
  );
  const completedOrders = orders.filter(
    (o) => ['delivered', 'cancelled'].includes(o.status)
  );

  const displayOrders = activeTab === 'active' ? activeOrders : completedOrders;
  const displayColumns = activeTab === 'active'
    ? BOARD_COLUMNS.filter((c) => c.status !== 'delivered')
    : [
        { status: 'delivered', label: '✨ Delivered' },
        { status: 'cancelled', label: '❌ Cancelled' },
      ];

  const getOrdersByStatus = (status) =>
    displayOrders.filter((o) => o.status === status);

  const handleStatusChange = (orderId, newStatus) => {
    onUpdateStatus(orderId, newStatus);
  };

  return (
    <div className="order-board">
      {/* Tabs */}
      <div className="board-tabs">
        <button
          className={`board-tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Orders
          {activeOrders.length > 0 && (
            <span className="board-tab-count">{activeOrders.length}</span>
          )}
        </button>
        <button
          className={`board-tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
      </div>

      {/* Columns */}
      <div className="board-columns">
        {displayColumns.map((col) => {
          const colOrders = getOrdersByStatus(col.status);
          return (
            <div className="board-column" key={col.status}>
              <div className="column-header">
                <span>{col.label}</span>
                <span className="column-count">{colOrders.length}</span>
              </div>
              <div className="column-body">
                {colOrders.length === 0 ? (
                  <div className="column-empty">No orders</div>
                ) : (
                  colOrders.map((order) => (
                    <div
                      className={`order-card card ${expandedOrder === order.id ? 'expanded' : ''}`}
                      key={order.id}
                      onClick={() =>
                        setExpandedOrder(
                          expandedOrder === order.id ? null : order.id
                        )
                      }
                    >
                      <div className="order-card-top">
                        <div className="order-card-num">
                          {formatOrderNumber(order.orderNumber)}
                        </div>
                        <span className={`badge badge-${order.status === 'out_for_delivery' ? 'delivering' : order.status}`}>
                          {ORDER_STATUSES[order.status]?.label}
                        </span>
                      </div>

                      <div className="order-card-customer">
                        <span className="customer-name">{order.customerName}</span>
                        <span className="order-time">{timeAgo(order.createdAt)}</span>
                      </div>

                      <div className="order-card-items">
                        {order.items?.map((item, i) => (
                          <span key={i} className="order-item-tag">
                            {item.name} ×{item.quantity}
                          </span>
                        ))}
                      </div>

                      <div className="order-card-footer">
                        <span className="order-total">{formatPrice(order.totalAmount)}</span>
                        <span className={`payment-badge ${order.paymentMethod}`}>
                          {order.paymentMethod === 'gcash' ? '📱 GCash' : '💵 COD'}
                          {order.paymentMethod === 'gcash' && (
                            <span className={`pay-status ${order.paymentStatus}`}>
                              {order.paymentStatus === 'paid' ? ' ✓' : ' ⏳'}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Expanded details */}
                      {expandedOrder === order.id && (
                        <div className="order-expanded fade-in" onClick={(e) => e.stopPropagation()}>
                          <div className="order-detail-row">
                            <span>📞</span>
                            <a href={`tel:${order.customerPhone}`}>{order.customerPhone}</a>
                          </div>
                          <div className="order-detail-row">
                            <span>📍</span>
                            <span>{getDeliveryLabel(order)}</span>
                          </div>
                          {order.paymentMethod === 'gcash' && order.gcashReceiptUrl && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => onViewReceipt(order.gcashReceiptUrl)}
                            >
                              📸 View Receipt
                            </button>
                          )}

                          {/* Status actions */}
                          <div className="order-actions">
                            {STATUS_FLOW[order.status]?.map((nextStatus) => (
                              <button
                                key={nextStatus}
                                className={`btn btn-sm ${nextStatus === 'cancelled' ? 'btn-danger' : 'btn-primary'}`}
                                onClick={() => handleStatusChange(order.id, nextStatus)}
                              >
                                {nextStatus === 'cancelled'
                                  ? '❌ Cancel'
                                  : `→ ${ORDER_STATUSES[nextStatus]?.label}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
