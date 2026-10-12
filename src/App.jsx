import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerPage from './pages/CustomerPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { useAuth } from './hooks/useAuth';

function ProtectedAdminRoute() {
  const { currentUser, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!currentUser) return <AdminLogin />;
  
  return <AdminDashboard />;
}

function App() {
  return (
    <ToastProvider>
      <CartProvider>
        <Router>
          <Routes>
            <Route path="/" element={<CustomerPage />} />
            <Route path="/admin" element={<ProtectedAdminRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </CartProvider>
    </ToastProvider>
  );
}

export default App;
