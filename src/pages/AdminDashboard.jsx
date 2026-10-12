import { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import OrderBoard from '../components/admin/OrderBoard';
import { updateOrderStatus, updatePaymentStatus } from '../services/orderService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const { orders, loading, error } = useOrders();
  const { logout } = useAuth();
  const toast = useToast();
  const [receiptUrl, setReceiptUrl] = useState(null);

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

  if (loading) return <div className="admin-loading">Loading orders...</div>;
  if (error) return <div className="admin-error">Error loading orders!</div>;

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header-content">
          <h1>Admin Dashboard</h1>
          <button className="btn btn-outline btn-sm" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="admin-main">
        <OrderBoard 
          orders={orders} 
          onUpdateStatus={handleUpdateStatus} 
          onViewReceipt={(url) => setReceiptUrl(url)} 
        />
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
              {/* Note: we would need to know WHICH order this receipt belongs to for the verify button to work directly here. 
                  For now, the manager verifies by looking at the receipt and then closing and proceeding. 
                  To make the Verify button work here, we'd need to pass the whole order object to onViewReceipt. */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
