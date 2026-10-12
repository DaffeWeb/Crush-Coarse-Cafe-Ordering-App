import { useState, useRef } from 'react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { formatPrice } from '../../utils/formatters';
import {
  DELIVERY_LOCATIONS,
  LOCATION_TYPES,
  PAYMENT_METHODS,
  APP_CONFIG,
} from '../../config/constants';
import './Checkout.css';

export default function Checkout({ 
  onSubmitOrder, 
  onBack, 
  notificationPermission = 'default',
  onRequestPermission,
}) {
  const { items, totalPrice, clearCart } = useCart();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    locationType: 'buildings',
    deliveryLocation: '',
    deliveryRoom: '',
    deliveryNotes: '',
    paymentMethod: 'cod',
    gcashReceipt: null,
  });

  const [receiptPreview, setReceiptPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentLocations = DELIVERY_LOCATIONS[form.locationType] || [];
  const selectedLocation = currentLocations.find(
    (loc) => loc.id === form.deliveryLocation
  );
  const requiresRoom = selectedLocation?.requiresRoom || false;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'locationType' ? { deliveryLocation: '', deliveryRoom: '' } : {}),
    }));
  };

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Receipt image must be under 5MB');
      return;
    }

    setForm((prev) => ({ ...prev, gcashReceipt: file }));
    const reader = new FileReader();
    reader.onloadend = () => setReceiptPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    if (!form.customerName.trim()) {
      toast.error('Please enter your name');
      return false;
    }
    const phoneClean = form.customerPhone.replace(/\D/g, '');
    if (phoneClean.length !== 11 || !phoneClean.startsWith('09')) {
      toast.error('Please enter a valid PH phone number (09XX XXX XXXX)');
      return false;
    }
    if (!form.deliveryLocation) {
      toast.error('Please select a delivery location');
      return false;
    }
    if (requiresRoom && !form.deliveryRoom.trim()) {
      toast.error('Please enter the room or floor number');
      return false;
    }
    if (form.paymentMethod === 'gcash' && !form.gcashReceipt) {
      toast.error('Please upload your GCash receipt screenshot');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const locationObj = currentLocations.find(
        (l) => l.id === form.deliveryLocation
      );

      const orderData = {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.replace(/\D/g, ''),
        deliveryLocation: locationObj?.name || '',
        deliveryLocationType: form.locationType,
        deliveryRoom: form.deliveryRoom.trim(),
        deliveryNotes: form.deliveryNotes.trim(),
        items: items.map((item) => ({
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        totalAmount: totalPrice,
        paymentMethod: form.paymentMethod,
        paymentStatus: form.paymentMethod === 'cod' ? 'pending' : 'pending',
        gcashReceipt: form.gcashReceipt,
      };

      await onSubmitOrder(orderData);
      clearCart();
    } catch (err) {
      toast.error('Failed to place order. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <button className="btn btn-outline btn-sm" onClick={onBack} id="back-to-menu">
          ← Back
        </button>
        <h2>Checkout</h2>
      </div>

      <form className="checkout-form" onSubmit={handleSubmit}>
        {/* Order Summary */}
        <div className="checkout-section">
          <h4 className="checkout-section-title">📋 Order Summary</h4>
          <div className="checkout-items">
            {items.map((item) => (
              <div className="checkout-item" key={item.id}>
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span className="checkout-item-price">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
            <div className="checkout-item checkout-total-row">
              <span>Total</span>
              <span className="checkout-total-price">{formatPrice(totalPrice)}</span>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="checkout-section">
          <h4 className="checkout-section-title">👤 Your Info</h4>
          <div className="input-group">
            <label htmlFor="customerName">Full Name</label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              className="input-field"
              placeholder="Juan Dela Cruz"
              value={form.customerName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="customerPhone">Phone Number</label>
            <input
              type="tel"
              id="customerPhone"
              name="customerPhone"
              className="input-field"
              placeholder="09XX XXX XXXX"
              value={form.customerPhone}
              onChange={handleChange}
              maxLength={13}
              required
            />
          </div>
        </div>

        {/* Delivery Location */}
        <div className="checkout-section">
          <h4 className="checkout-section-title">📍 Delivery Location</h4>

          <div className="location-type-tabs">
            {LOCATION_TYPES.map((lt) => (
              <button
                key={lt.id}
                type="button"
                className={`location-type-tab ${form.locationType === lt.id ? 'active' : ''}`}
                onClick={() =>
                  handleChange({
                    target: { name: 'locationType', value: lt.id },
                  })
                }
              >
                <span>{lt.icon}</span>
                <span>{lt.label}</span>
              </button>
            ))}
          </div>

          <div className="input-group">
            <label htmlFor="deliveryLocation">Select Location</label>
            <select
              id="deliveryLocation"
              name="deliveryLocation"
              className="select-field"
              value={form.deliveryLocation}
              onChange={handleChange}
              required
            >
              <option value="">Choose a location...</option>
              {currentLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {requiresRoom && (
            <div className="input-group fade-in">
              <label htmlFor="deliveryRoom">Room / Floor</label>
              <input
                type="text"
                id="deliveryRoom"
                name="deliveryRoom"
                className="input-field"
                placeholder="e.g. Room 301, 2nd Floor"
                value={form.deliveryRoom}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="input-group">
            <label htmlFor="deliveryNotes">Delivery Notes (optional)</label>
            <input
              type="text"
              id="deliveryNotes"
              name="deliveryNotes"
              className="input-field"
              placeholder="e.g. Near the elevator, wearing red shirt"
              value={form.deliveryNotes}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Payment */}
        <div className="checkout-section">
          <h4 className="checkout-section-title">💰 Payment Method</h4>

          <div className="payment-options">
            {Object.entries(PAYMENT_METHODS).map(([key, method]) => (
              <label
                key={key}
                className={`payment-option ${form.paymentMethod === key ? 'active' : ''}`}
                htmlFor={`pay-${key}`}
              >
                <input
                  type="radio"
                  id={`pay-${key}`}
                  name="paymentMethod"
                  value={key}
                  checked={form.paymentMethod === key}
                  onChange={handleChange}
                />
                <div className="payment-option-content">
                  <span className="payment-icon">{method.icon}</span>
                  <div>
                    <div className="payment-label">{method.label}</div>
                    <div className="payment-desc">{method.description}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>

          {/* GCash Section */}
          {form.paymentMethod === 'gcash' && (
            <div className="gcash-section fade-in">
              <div className="gcash-info">
                <p className="gcash-instruction">
                  Send <strong>{formatPrice(totalPrice)}</strong> to:
                </p>
                <div className="gcash-details">
                  <div className="gcash-number">{APP_CONFIG.gcashNumber}</div>
                  <div className="gcash-name">{APP_CONFIG.gcashName}</div>
                </div>
                <p className="gcash-note">
                  After sending, take a screenshot and upload it below.
                </p>
              </div>

              <div
                className="receipt-upload"
                onClick={() => fileInputRef.current?.click()}
              >
                {receiptPreview ? (
                  <div className="receipt-preview">
                    <img src={receiptPreview} alt="GCash receipt" />
                    <button
                      type="button"
                      className="receipt-change"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="receipt-placeholder">
                    <span className="receipt-upload-icon">📸</span>
                    <span>Tap to upload receipt screenshot</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptUpload}
                  style={{ display: 'none' }}
                  id="gcash-receipt-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Notification Preference */}
        <div className="checkout-section checkout-notif-section">
          <div className="checkout-notif-row">
            <span className="checkout-notif-icon">🔔</span>
            <div className="checkout-notif-info">
              <div className="checkout-notif-title">Live Order Notifications</div>
              <p className="checkout-notif-desc">
                {notificationPermission === 'granted'
                  ? 'Active on this device. You will receive alerts when your order is brewing and on the way.'
                  : notificationPermission === 'denied'
                  ? 'Notifications are blocked in your browser settings. You can still track your order live on screen.'
                  : 'Get notified in real time when your coffee is brewing and out for delivery.'}
              </p>
            </div>
            {notificationPermission === 'default' && onRequestPermission && (
              <button
                type="button"
                className="btn btn-outline btn-sm checkout-notif-btn"
                onClick={onRequestPermission}
                id="enable-notif-checkout-btn"
              >
                Enable
              </button>
            )}
            {notificationPermission === 'granted' && (
              <span className="checkout-notif-active-badge">✓ Active</span>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-primary btn-block btn-lg checkout-submit"
          disabled={isSubmitting}
          id="submit-order-btn"
        >
          {isSubmitting ? (
            <span className="spinner">⏳</span>
          ) : (
            <>Place Order — {formatPrice(totalPrice)}</>
          )}
        </button>
      </form>
    </div>
  );
}
