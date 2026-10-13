import { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useInventory } from '../hooks/useInventory';
import OrderBoard from '../components/admin/OrderBoard';
import InventoryManager from '../components/admin/InventoryManager';
import { updateOrderStatus, updatePaymentStatus } from '../services/orderService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { orders, loading, error } = useOrders();
  const { menuItems } = useInventory();
  const { logout } = useAuth();
  const toast = useToast();
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [activeSection, setActiveSection] = useState('orders');

  const needsRestockCount = menuItems?.filter((i) => i.available && i.stockInfo?.needsRestock).length || 0;

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
      await updatePaymentStatus(orderId, 'paid');
      toast.success('Payment verified!');
      setReceiptUrl(null);
    } catch (err) {
      toast.error('Failed to verify payment');
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
                onViewReceipt={(url) => setReceiptUrl(url)}
              />
            )}
          </>
        )}

        {activeSection === 'inventory' && <InventoryManager />}
      </main>

      {/* Receipt Viewer Modal */}
      {receiptUrl && (
        <div className="modal-overlay" onClick={() => setReceiptUrl(null)}>
          <div className="modal-content receipt-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>GCash Receipt</h3>
              <button className="btn btn-icon" onClick={() => setReceiptUrl(null)}>✕</button>
            </div>
            <div className="modal-body">
              <img src={receiptUrl} alt="GCash Receipt" className="receipt-full-img" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setReceiptUrl(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
