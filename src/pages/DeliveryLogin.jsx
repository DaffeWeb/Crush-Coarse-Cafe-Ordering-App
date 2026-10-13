import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import './DeliveryLogin.css';

export default function DeliveryLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const toast = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success('Welcome, rider! 🛵');
    } catch (err) {
      console.error(err);
      toast.error('Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="delivery-login-page">
      <div className="delivery-login-card card">
        <div className="delivery-login-header">
          <div className="delivery-login-icon">🛵</div>
          <h2>Delivery Login</h2>
          <p>Crush Coarse Cafe</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label htmlFor="delivery-email">Email</label>
            <input
              type="email"
              id="delivery-email"
              className="input-field"
              placeholder="rider@crushcoarse.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="delivery-password">Password</label>
            <input
              type="password"
              id="delivery-password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg delivery-login-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : '🛵 Start Delivering'}
          </button>
        </form>
      </div>
    </div>
  );
}
