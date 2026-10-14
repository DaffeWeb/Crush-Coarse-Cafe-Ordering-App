import { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useInventory } from '../hooks/useInventory';
import OrderBoard from '../components/admin/OrderBoard';
import InventoryManager from '../components/admin/InventoryManager';
import { updateOrderStatus, updatePaymentStatus, updateRefundStatus } from '../services/orderService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { orders, loading, error } = useOrders();
  const { menuItems } = useInventory();
  const { logout } = useAuth();
  const toast = useToast();
  const [previewModal, setPreviewModal] = useState(null); // { url, title, subtitle }
  const [activeSection, setActiveSection] = useState('orders');
  const [boardTab, setBoardTab] = useState('active');

  const needsRestockCount = menuItems?.filter((i) => i.available && i.stockInfo?.needsRestock).length || 0;
  
  const pendingRefundsCount = orders?.filter(
    (o) => o.status === 'cancelled' && 
      (o.paymentMethod === 'gcash' || o.refundPlatform || o.gcashReceiptUrl) && 
      o.refundStatus !== 'refunded'
  ).length || 0;

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleVerifyPayment = async (orderId) => {
    try {
      await updatePaymentStatus(orderId, 'confirmed');
      toast.success('Payment verified!');
      setPreviewModal(null);
    } catch (err) {
      toast.error('Failed to verify payment');
    }
  };

  const handleViewReceipt = (url, orderNumber, customerName) => {
    setPreviewModal({
      url,
      title: `🧾 GCash Receipt ${orderNumber ? `(#${orderNumber})` : ''}`,
      subtitle: customerName ? `Customer: ${customerName}` : null,
    });
  };

  const handleViewDeliveryProof = (url, orderNumber, customerName) => {
    setPreviewModal({
      url,
      title: `📷 Proof of Delivery ${orderNumber ? `(#${orderNumber})` : ''}`,
      subtitle: customerName ? `Customer: ${customerName}` : null,
    });
  };

  const handleUpdateRefundStatus = async (orderId, refundStatus) => {
    try {
      await updateRefundStatus(orderId, refundStatus);
      toast.success(refundStatus === 'refunded' ? 'Order marked as refunded! ✓' : 'Refund status reset.');
    } catch (err) {
      toast.error('Failed to update refund status');
    }
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-content">
          <h1>Admin Dashboard</h1>
          <div className="admin-header-right">
            <nav className="admin-nav">
              <button
                className={`admin-nav-btn ${activeSection === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveSection('orders')}
              >
                📋 Orders
              </button>
              <button
                className={`admin-nav-btn ${activeSection === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveSection('inventory')}
              >
                📦 Inventory
                {needsRestockCount > 0 && (
                  <span className="admin-nav-alert-badge">{needsRestockCount}</span>
                )}
              </button>
            </nav>
            <button className="btn btn-outline btn-sm admin-logout-btn" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        {activeSection === 'orders' && (
          <>
            {/* Refund Alert Banner */}
            {pendingRefundsCount > 0 && (
              <div className="admin-refund-banner fade-in">
                <div className="admin-refund-banner-text">
                  <span className="refund-banner-icon">💸</span>
                  <div>
                    <strong>
                      {pendingRefundsCount} Cancelled Order{pendingRefundsCount > 1 ? 's' : ''} Need Refund
                    </strong>
                    <p>Customers cancelled their online order and are awaiting refund processing.</p>
                  </div>
                </div>
                <button
                  className="btn btn-sm admin-refund-banner-btn"
                  onClick={() => {
                    setActiveSection('orders');
                    setBoardTab('refunds');
                  }}
                >
                  Review Refunds ({pendingRefundsCount}) →
                </button>
              </div>
            )}

            {needsRestockCount > 0 && (
              <div className="admin-morning-banner fade-in">
                <div className="admin-morning-banner-text">
                  <span>🌅</span>
                  <span>
                    <strong>Daily Stock Check-in:</strong> {needsRestockCount} menu items need today's starting stock count.
                  </span>
                </div>
                <button
                  className="btn btn-primary btn-sm admin-morning-banner-btn"
                  onClick={() => setActiveSection('inventory')}
                >
                  Set Stock Now →
                </button>
              </div>
            )}
            {loading ? (
              <div className="admin-loading">Loading orders...</div>
            ) : error ? (
              <div className="admin-error">Error loading orders!</div>
            ) : (
              <OrderBoard
                orders={orders}
                onUpdateStatus={handleUpdateStatus}
                onViewReceipt={handleViewReceipt}
                onViewDeliveryProof={handleViewDeliveryProof}
                onUpdateRefundStatus={handleUpdateRefundStatus}
                activeTab={boardTab}
                onTabChange={setBoardTab}
              />
            )}
          </>
        )}

        {activeSection === 'inventory' && <InventoryManager />}
      </main>

      {/* Image / Proof / Receipt Viewer Modal */}
      {previewModal && (
        <div className="modal-overlay" onClick={() => setPreviewModal(null)}>
          <div className="modal-content receipt-modal fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="admin-modal-title-wrap">
                <h3>{previewModal.title || 'Image Preview'}</h3>
                {previewModal.subtitle && (
                  <p className="admin-modal-subtitle">{previewModal.subtitle}</p>
                )}
              </div>
              <button className="btn btn-icon" onClick={() => setPreviewModal(null)}>✕</button>
            </div>
            <div className="modal-body admin-modal-image-body">
              <img src={previewModal.url} alt={previewModal.title} className="receipt-full-img" />
            </div>
            <div className="modal-footer">
              <a
                href={previewModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
              >
                ↗ Open Full Resolution
              </a>
              <button className="btn btn-primary btn-sm" onClick={() => setPreviewModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
