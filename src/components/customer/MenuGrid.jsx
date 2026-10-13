import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useMenu } from '../../hooks/useMenu';
import { formatPrice, normalizeCategory } from '../../utils/formatters';
import { MENU_CATEGORIES } from '../../config/constants';
import './MenuGrid.css';

export default function MenuGrid() {
  const [activeCategory, setActiveCategory] = useState('all');
  const { addItem } = useCart();
  const toast = useToast();
  const { menuItems, loading } = useMenu();

  const filteredItems =
    activeCategory === 'all'
      ? menuItems
      : menuItems.filter((item) => normalizeCategory(item.category) === normalizeCategory(activeCategory));

  const handleAddToCart = (item) => {
    if (item.outOfStock) return;
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
    });
    toast.success(`${item.name} added to cart!`);
  };

  const getCategoryIcon = (category) => {
    switch(normalizeCategory(category)) {
      case 'coffee': return '☕';
      case 'non-coffee': return '🧋';
      case 'snacks': return '🍪';
      default: return '✨';
    }
  };

  return (
    <section className="menu-section" id="menu">
      {/* Category Tabs */}
      <div className="category-tabs">
        {MENU_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
            id={`tab-${cat.id}`}
          >
            <span className="category-icon">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="menu-grid stagger-children">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 6 }).map((_, i) => (
            <div className="menu-card card skeleton" key={`skel-${i}`} style={{ height: '300px' }}></div>
          ))
        ) : filteredItems.length === 0 ? (
          <div className="menu-empty" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--cc-brown-light)' }}>
            <p>No items found in this category.</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isOutOfStock = item.outOfStock;
            const showLowStock =
              item.stockInfo &&
              item.stockInfo.remaining !== null &&
              item.stockInfo.remaining > 0 &&
              item.stockInfo.remaining <= 3;

            return (
              <div
                className={`menu-card card ${isOutOfStock ? 'out-of-stock' : ''}`}
                key={item.id}
                id={`menu-item-${item.id}`}
              >
                <div className="menu-card-image">
                  <div className="menu-card-placeholder">
                    <span>{getCategoryIcon(item.category)}</span>
                  </div>
                  <div className="menu-card-badge">{item.category}</div>
                  {isOutOfStock && (
                    <div className="menu-card-oos-overlay">
                      <span>Sold Out</span>
                    </div>
                  )}
                </div>
                <div className="menu-card-body">
                  <h3 className="menu-card-title">{item.name}</h3>
                  <p className="menu-card-desc">{item.description}</p>
                  {showLowStock && (
                    <span className="menu-card-low-stock">
                      🔥 Only {item.stockInfo.remaining} left!
                    </span>
                  )}
                  <div className="menu-card-footer">
                    <span className="menu-card-price">{formatPrice(item.price)}</span>
                    <button
                      className="btn btn-primary btn-sm add-to-cart-btn"
                      onClick={() => handleAddToCart(item)}
                      id={`add-${item.id}`}
                      disabled={isOutOfStock}
                    >
                      {isOutOfStock ? 'Sold Out' : <><span>+</span> Add</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          }))
        }
      </div>
    </section>
  );
}
