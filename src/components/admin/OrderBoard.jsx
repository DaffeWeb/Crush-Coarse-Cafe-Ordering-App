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

export default function OrderBoard({ 
  orders, 
  onUpdateStatus, 
  onViewReceipt,
  onViewDeliveryProof,
  onUpdateRefundStatus,
  activeTab: externalTab,
  onTabChange,
}) {
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [internalTab, setInternalTab] = useState('active');
  const [refundFilter, setRefundFilter] = useState('pending'); // 'pending' | 'refunded' | 'all'
  const [copiedId, setCopiedId] = useState(null);

  const activeTab = externalTab || internalTab;
  const setActiveTab = onTabChange || setInternalTab;

  const activeOrders = orders.filter(
    (o) => !['delivered', 'cancelled'].includes(o.status)
  );
  const completedOrders = orders.filter(
    (o) => ['delivered', 'cancelled'].includes(o.status)
  );

  // Online orders that were cancelled (needing or having received refunds)
  const refundOrders = orders.filter(
    (o) => o.status === 'cancelled' && (o.paymentMethod === 'gcash' || o.refundPlatform || o.gcashReceiptUrl)
  );
  const pendingRefunds = refundOrders.filter(
    (o) => o.refundStatus !== 'refunded'
  );
  const completedRefunds = refundOrders.filter(
    (o) => o.refundStatus === 'refunded'
  );

  const totalPendingRefundAmount = pendingRefunds.reduce(
    (sum, o) => sum + (o.totalAmount || 0), 0
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

  const handleCopyAccount = (text, orderId) => {
    if (navigator?.clipboard?.writeText && text) {
      navigator.clipboard.writeText(text);
      setCopiedId(orderId);
      setTimeout(() => setCopiedId(null), 2000);
    }
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
          className={`board-tab refund-tab ${activeTab === 'refunds' ? 'active' : ''}`}
          onClick={() => setActiveTab('refunds')}
        >
          <span>💸 Refund Requests</span>
          {pendingRefunds.length > 0 && (
            <span className="board-tab-count refund-count-badge">
              {pendingRefunds.length}
            </span>
          )}
        </button>

        <button
          className={`board-tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed
        </button>
      </div>

      {/* Refunds View */}
      {activeTab === 'refunds' ? (
        <div className="refunds-view fade-in">
          {/* Summary Stats */}
          <div className="refunds-summary-grid">
            <div className="refund-summary-card pending">
              <div className="summary-icon">⏳</div>
              <div className="summary-data">
                <span className="summary-label">Pending Refunds</span>
                <span className="summary-value">{pendingRefunds.length}</span>
                <span className="summary-subtext">Total: {formatPrice(totalPendingRefundAmount)}</span>
              </div>
            </div>

            <div className="refund-summary-card completed">
              <div className="summary-icon">✅</div>
              <div className="summary-data">
                <span className="summary-label">Completed Refunds</span>
                <span className="summary-value">{completedRefunds.length}</span>
                <span className="summary-subtext">Processed back to customers</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="refunds-filter-bar">
            <button
              className={`refund-filter-btn ${refundFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setRefundFilter('pending')}
            >
              Needs Refund ({pendingRefunds.length})
            </button>
            <button
              className={`refund-filter-btn ${refundFilter === 'refunded' ? 'active' : ''}`}
              onClick={() => setRefundFilter('refunded')}
            >
              Completed ({completedRefunds.length})
            </button>
            <button
              className={`refund-filter-btn ${refundFilter === 'all' ? 'active' : ''}`}
              onClick={() => setRefundFilter('all')}
            >
              All Cancelled Online ({refundOrders.length})
            </button>
          </div>

          {/* Refund Cards List */}
          <div className="refunds-list">
            {(refundFilter === 'pending'
              ? pendingRefunds
              : refundFilter === 'refunded'
              ? completedRefunds
              : refundOrders
            ).length === 0 ? (
              <div className="refunds-empty-state">
                <span className="empty-icon">🎉</span>
                <h4>No {refundFilter === 'pending' ? 'pending refunds' : 'orders found'}</h4>
                <p>
                  {refundFilter === 'pending'
                    ? 'All cancelled online payment orders have been processed!'
                    : 'No refund requests in this view.'}
                </p>
              </div>
            ) : (
              (refundFilter === 'pending'
                ? pendingRefunds
                : refundFilter === 'refunded'
                ? completedRefunds
                : refundOrders
              ).map((order) => {
                const targetAccount = order.refundAccount || order.customerPhone;
                const platform = order.refundPlatform || 'gcash';
                const isRefunded = order.refundStatus === 'refunded';

                return (
                  <div 
                    className={`refund-card card ${isRefunded ? 'is-refunded' : 'needs-refund'}`} 
                    key={order.id}
                  >
                    <div className="refund-card-header">
                      <div>
                        <div className="refund-card-order-num">
                          {formatOrderNumber(order.orderNumber)}
                        </div>
                        <div className="refund-order-time">
                          Placed {timeAgo(order.createdAt)}
                        </div>
                      </div>
                      <div className="refund-status-badges">
                        <span className="badge badge-cancelled">Cancelled</span>
                        <span className={`refund-pill ${isRefunded ? 'completed' : 'pending'}`}>
                          {isRefunded ? '✅ Refunded' : '⚠️ Needs Refund'}
                        </span>
                      </div>
                    </div>

                    <div className="refund-card-body">
                      {/* Customer Info */}
                      <div className="refund-customer-row">
                        <span className="customer-name">{order.customerName}</span>
                        <a href={`tel:${order.customerPhone}`} className="customer-phone-link">
                          📞 {order.customerPhone}
                        </a>
                        <span className="customer-loc">📍 {getDeliveryLabel(order)}</span>
                      </div>

                      {/* Items */}
                      <div className="refund-items-summary">
                        {order.items?.map((item, i) => (
                          <span key={i} className="order-item-tag">
                            {item.name} ×{item.quantity}
                          </span>
                        ))}
                      </div>

                      {/* Amount to Refund */}
                      <div className="refund-amount-box">
                        <span className="refund-amount-label">Amount to Refund:</span>
                        <span className="refund-amount-val">{formatPrice(order.totalAmount)}</span>
                      </div>

                      {/* Destination Platform & Account */}
                      <div className="refund-destination-box">
                        <div className="destination-header">
                          <span className="destination-title">Refund Destination</span>
                          <span className="destination-plat">
                            {platform === 'paymaya' ? '💳 Paymaya' : platform === 'gotyme' ? '🏦 Gotyme' : '📱 GCash'}
                          </span>
                        </div>
                        <div className="destination-account-row">
                          <span className="destination-label">Account/Number:</span>
                          <span className="destination-val">{targetAccount}</span>
                          <button
                            type="button"
                            className="btn-copy-account"
                            onClick={() => handleCopyAccount(targetAccount, order.id)}
                            title="Copy number to clipboard"
                          >
                            {copiedId === order.id ? '✓ Copied' : '📋 Copy'}
                          </button>
                        </div>
                        {order.cancellationReason && (
                          <div className="destination-reason">
                            <span>Reason:</span> {order.cancellationReason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="refund-card-footer">
                      <div className="refund-footer-left">
                        {order.gcashReceiptUrl && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => onViewReceipt(order.gcashReceiptUrl, order.orderNumber, order.customerName)}
                          >
                            📸 View Customer Receipt
                          </button>
                        )}
                      </div>

                      <div className="refund-footer-actions">
                        {!isRefunded ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm btn-mark-refunded"
                            onClick={() => onUpdateRefundStatus?.(order.id, 'refunded')}
                          >
                            💸 Mark as Refunded
                          </button>
                        ) : (
                          <div className="refunded-complete-wrap">
                            <span className="refunded-time-text">
                              Refund completed {order.refundedAt ? timeAgo(order.refundedAt) : ''}
                            </span>
                            <button
                              type="button"
                              className="btn btn-outline btn-xs btn-undo-refund"
                              onClick={() => onUpdateRefundStatus?.(order.id, 'pending')}
                              title="Revert to pending"
                            >
                              ↩ Undo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Columns */
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
                          <div className="order-footer-badges">
                            <span className={`payment-badge ${order.paymentMethod}`}>
                              {order.paymentMethod === 'gcash' ? '📱 GCash' : '💵 COD'}
                              <span className={`pay-status ${order.paymentStatus}`}>
                                {(order.paymentStatus === 'confirmed' || order.paymentStatus === 'paid') ? ' ✓' : ' ⏳'}
                              </span>
                            </span>
                            {order.status === 'cancelled' && (order.paymentMethod === 'gcash' || order.refundPlatform) && (
                              <span className={`refund-mini-badge ${order.refundStatus === 'refunded' ? 'refunded' : 'pending'}`}>
                                {order.refundStatus === 'refunded' ? '✓ Refunded' : '⚠️ Needs Refund'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Media preview chips on card */}
                        {(order.deliveryProofUrl || (order.paymentMethod === 'gcash' && order.gcashReceiptUrl)) && (
                          <div className="order-media-chips" onClick={(e) => e.stopPropagation()}>
                            {order.deliveryProofUrl && (
                              <button
                                type="button"
                                className="media-chip proof-chip"
                                onClick={() => onViewDeliveryProof?.(order.deliveryProofUrl, order.orderNumber, order.customerName)}
                                title="View proof of delivery photo"
                              >
                                📷 Delivery Photo
                              </button>
                            )}
                            {order.paymentMethod === 'gcash' && order.gcashReceiptUrl && (
                              <button
                                type="button"
                                className="media-chip receipt-chip"
                                onClick={() => onViewReceipt?.(order.gcashReceiptUrl, order.orderNumber, order.customerName)}
                                title="View customer payment receipt"
                              >
                                🧾 Receipt
                              </button>
                            )}
                          </div>
                        )}

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

                            {/* Media buttons in expanded view */}
                            {(order.deliveryProofUrl || (order.paymentMethod === 'gcash' && order.gcashReceiptUrl)) && (
                              <div className="order-expanded-media-row">
                                {order.deliveryProofUrl && (
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm admin-media-btn proof-btn"
                                    onClick={() => onViewDeliveryProof?.(order.deliveryProofUrl, order.orderNumber, order.customerName)}
                                  >
                                    📷 View Delivery Photo
                                  </button>
                                )}
                                {order.paymentMethod === 'gcash' && order.gcashReceiptUrl && (
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm admin-media-btn receipt-btn"
                                    onClick={() => onViewReceipt?.(order.gcashReceiptUrl, order.orderNumber, order.customerName)}
                                  >
                                    🧾 View Payment Receipt
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Refund Details inside Cancelled card */}
                            {order.status === 'cancelled' && (order.paymentMethod === 'gcash' || order.refundPlatform) && (
                              <div className="order-card-refund-box">
                                <div className="refund-box-title">
                                  <span>💸 Refund Information</span>
                                  <span className={`refund-pill ${order.refundStatus === 'refunded' ? 'completed' : 'pending'}`}>
                                    {order.refundStatus === 'refunded' ? '✓ Refunded' : '⚠️ Pending'}
                                  </span>
                                </div>
                                <div className="refund-box-details">
                                  <div>
                                    <span>Send via:</span> <strong>{(order.refundPlatform || 'gcash').toUpperCase()}</strong>
                                  </div>
                                  <div>
                                    <span>To:</span> <strong>{order.refundAccount || order.customerPhone}</strong>
                                    <button
                                      type="button"
                                      className="btn-copy-account-sm"
                                      onClick={() => handleCopyAccount(order.refundAccount || order.customerPhone, order.id)}
                                    >
                                      {copiedId === order.id ? '✓' : 'Copy'}
                                    </button>
                                  </div>
                                </div>
                                {order.refundStatus !== 'refunded' ? (
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm btn-block"
                                    onClick={() => onUpdateRefundStatus?.(order.id, 'refunded')}
                                  >
                                    Mark as Refunded
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-xs"
                                    onClick={() => onUpdateRefundStatus?.(order.id, 'pending')}
                                  >
                                    ↩ Undo Refund
                                  </button>
                                )}
                              </div>
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
      )}
    </div>
  );
}
