import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../utils/formatters';
import './Cart.css';

export default function Cart({ onCheckout }) {
  const { items, isOpen, totalItems, totalPrice, updateQuantity, removeItem, setCartOpen } = useCart();

  if (!isOpen) return null;

  return (
    <>
      <div className="cart-overlay" onClick={() => setCartOpen(false)} />
      <div className={`cart-sheet ${isOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h3>Your Cart</h3>
          <div className="cart-header-right">
            {totalItems > 0 && (
              <span className="cart-count">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
            )}
            <button className="btn btn-icon" onClick={() => setCartOpen(false)} id="close-cart">
              ✕
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <span className="cart-empty-icon">🛒</span>
            <p>Your cart is empty</p>
            <p className="cart-empty-hint">Add some delicious items from our menu!</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-info">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-price">{formatPrice(item.price)}</span>
                  </div>
                  <div className="cart-item-actions">
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      id={`qty-dec-${item.id}`}
                    >
                      −
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      id={`qty-inc-${item.id}`}
                    >
                      +
                    </button>
                    <button
                      className="cart-item-remove"
                      onClick={() => removeItem(item.id)}
                      id={`remove-${item.id}`}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-total">
                <span>Total</span>
                <span className="cart-total-price">{formatPrice(totalPrice)}</span>
              </div>
              <button
                className="btn btn-primary btn-block btn-lg"
                onClick={onCheckout}
                id="checkout-btn"
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
