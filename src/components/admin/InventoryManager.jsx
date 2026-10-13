import { useState } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { useToast } from '../../context/ToastContext';
import {
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
  setDailyStock,
  setBatchDailyStocks,
} from '../../services/inventoryService';
import { MENU_CATEGORIES } from '../../config/constants';
import { formatPrice, normalizeCategory } from '../../utils/formatters';
import './InventoryManager.css';

export default function InventoryManager() {
  const { menuItems, loading, error } = useInventory();
  const toast = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [stockInputs, setStockInputs] = useState({});
  const [morningInputs, setMorningInputs] = useState({});
  const [hideMorningBanner, setHideMorningBanner] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New item form state
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    category: 'coffee',
    imageUrl: '',
    initialStock: '20',
  });

  const categories = MENU_CATEGORIES.filter((c) => c.id !== 'all');

  const filteredItems =
    filterCategory === 'all'
      ? menuItems
      : menuItems.filter((item) => normalizeCategory(item.category) === normalizeCategory(filterCategory));

  // ─── Add Item ───────────────────────────────────────────

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;

    setIsSubmitting(true);
    try {
      const added = await addMenuItem({
        name: newItem.name,
        description: newItem.description,
        price: Number(newItem.price),
        category: newItem.category,
        imageUrl: newItem.imageUrl,
      });

      if (newItem.initialStock !== '' && !isNaN(Number(newItem.initialStock))) {
        await setDailyStock(added.id, Number(newItem.initialStock), true);
      }

      toast.success(`"${newItem.name}" added to menu with initial stock!`);
      setNewItem({ name: '', description: '', price: '', category: 'coffee', imageUrl: '', initialStock: '20' });
      setShowAddForm(false);
    } catch (err) {
      toast.error('Failed to add item');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Edit Item ──────────────────────────────────────────

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      await updateMenuItem(editingItem.id, {
        name: editingItem.name,
        description: editingItem.description,
        price: Number(editingItem.price),
        category: editingItem.category,
        imageUrl: editingItem.imageUrl || '',
      });
      toast.success('Item updated!');
      setEditingItem(null);
    } catch (err) {
      toast.error('Failed to update item');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Delete Item ────────────────────────────────────────

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await deleteMenuItem(item.id);
      toast.success(`"${item.name}" removed from menu.`);
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  // ─── Toggle Availability ───────────────────────────────

  const handleToggleAvailability = async (item) => {
    try {
      await toggleItemAvailability(item.id, !item.available);
      toast.success(
        item.available
          ? `"${item.name}" marked as unavailable`
          : `"${item.name}" is now available!`
      );
    } catch (err) {
      toast.error('Failed to update availability');
    }
  };

  // ─── Set Daily Stock ───────────────────────────────────

  const handleSetStock = async (itemId) => {
    const count = parseInt(stockInputs[itemId], 10);
    if (isNaN(count) || count < 0) {
      toast.error('Please enter a valid stock count');
      return;
    }
    try {
      await setDailyStock(itemId, count);
      const item = menuItems.find((i) => i.id === itemId);
      toast.success(`Stock for "${item?.name}" set to ${count}`);
      setStockInputs((prev) => ({ ...prev, [itemId]: '' }));
    } catch (err) {
      toast.error('Failed to set stock');
    }
  };

  if (loading) {
    return <div className="inventory-loading">Loading inventory…</div>;
  }

  // Count items needing restock today
  const itemsNeedingRestock = menuItems.filter(
    (item) => item.available && item.stockInfo.needsRestock
  );
  const needsRestockCount = itemsNeedingRestock.length;

  const handleSetAllMorningStocks = async () => {
    setIsSubmitting(true);
    try {
      const stockMap = {};
      itemsNeedingRestock.forEach((item) => {
        const val =
          morningInputs[item.id] !== undefined
            ? morningInputs[item.id]
            : (item.stockInfo.lastStockCount ?? 20);
        stockMap[item.id] = parseInt(val, 10);
      });
      await setBatchDailyStocks(stockMap);
      toast.success("All today's stocks initialized successfully! 🌅");
    } catch (err) {
      toast.error("Failed to initialize today's stocks");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="inventory-manager">
      {/* Header */}
      <div className="inventory-header">
        <div className="inventory-title-row">
          <div>
            <h2>Inventory Management</h2>
            <p className="inventory-subtitle">
              {menuItems.length} items · {needsRestockCount > 0 && (
                <span className="restock-alert">{needsRestockCount} need today's stock count</span>
              )}
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '✕ Cancel' : '+ Add Item'}
          </button>
        </div>

        {/* Category filter pills */}
        <div className="inventory-filters">
          <button
            className={`filter-pill ${filterCategory === 'all' ? 'active' : ''}`}
            onClick={() => setFilterCategory('all')}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`filter-pill ${filterCategory === cat.id ? 'active' : ''}`}
              onClick={() => setFilterCategory(cat.id)}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Permission Warning Banner if Firestore rules block access */}
      {error && (
        <div className="card fade-in" style={{ background: '#FFF3E0', border: '1px solid #FF9800', padding: '1rem', marginBottom: '1.25rem', color: '#E65100' }}>
          <strong>⚠️ Firestore Permission Denied:</strong>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', lineHeight: '1.4' }}>
            Firebase returned <code>permission-denied</code>. Please update your <strong>Firestore Security Rules</strong> in the Firebase Console to allow reading and writing to the <code>inventory</code>, <code>menuItems</code>, and <code>orders</code> collections. (See <code>firestore.rules</code> file in the project root).
          </p>
        </div>
      )}

      {/* Daily Morning Stock Setup Banner (Prompts whenever it's the next day or stock not set) */}
      {needsRestockCount > 0 && !hideMorningBanner && (
        <div className="daily-setup-banner fade-in">
          <div className="daily-setup-header">
            <div className="daily-setup-title-group">
              <h3>🌅 Daily Morning Stock Setup</h3>
              <p>
                It's a new day! Set today's initial inventory count so the cafe can track stock in real time.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setHideMorningBanner(true)}
              title="Dismiss banner"
            >
              ✕ Dismiss
            </button>
          </div>

          <div className="daily-setup-list">
            {itemsNeedingRestock.map((item) => {
              const defaultQty = item.stockInfo.lastStockCount ?? 20;
              const currentVal =
                morningInputs[item.id] !== undefined ? morningInputs[item.id] : defaultQty;
              return (
                <div className="daily-setup-row" key={item.id}>
                  <div className="daily-setup-item-info">
                    <span className="daily-setup-item-name">{item.name}</span>
                    <span className="daily-setup-item-prev">
                      {item.stockInfo.lastStockCount != null
                        ? `Yesterday: ${item.stockInfo.lastStockCount}`
                        : 'New item'}
                    </span>
                  </div>
                  <div className="daily-setup-input-group">
                    <input
                      type="number"
                      min="0"
                      className="input-field daily-setup-input"
                      value={currentVal}
                      onChange={(e) =>
                        setMorningInputs({ ...morningInputs, [item.id]: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={async () => {
                        const count = parseInt(currentVal, 10);
                        if (isNaN(count) || count < 0) return toast.error('Enter valid stock');
                        await setDailyStock(item.id, count, true);
                        toast.success(`Set ${item.name} stock to ${count}`);
                      }}
                    >
                      Set
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="daily-setup-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSetAllMorningStocks}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving…' : `⚡ Save All ${itemsNeedingRestock.length} Stocks for Today`}
            </button>
          </div>
        </div>
      )}

      {/* Add New Item Form */}
      {showAddForm && (
        <form className="add-item-form card fade-in" onSubmit={handleAddItem}>
          <h3>Add New Menu Item</h3>
          <div className="form-grid">
            <div className="input-group">
              <label>Name *</label>
              <input
                className="input-field"
                placeholder="e.g. Iced Americano"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                required
              />
            </div>
            <div className="input-group">
              <label>Price (₱) *</label>
              <input
                className="input-field"
                type="number"
                placeholder="99"
                min="0"
                step="1"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                required
              />
            </div>
            <div className="input-group">
              <label>Initial Stock (Today) *</label>
              <input
                className="input-field"
                type="number"
                placeholder="20"
                min="0"
                value={newItem.initialStock}
                onChange={(e) => setNewItem({ ...newItem, initialStock: e.target.value })}
                required
              />
            </div>
            <div className="input-group">
              <label>Category</label>
              <select
                className="select-field"
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>Image URL (optional)</label>
              <input
                className="input-field"
                placeholder="https://..."
                value={newItem.imageUrl}
                onChange={(e) => setNewItem({ ...newItem, imageUrl: e.target.value })}
              />
            </div>
            <div className="input-group span-2">
              <label>Description</label>
              <input
                className="input-field"
                placeholder="Short description of the item"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Adding…' : '✓ Add to Menu'}
            </button>
          </div>
        </form>
      )}

      {/* Inventory Grid */}
      <div className="inventory-grid">
        {filteredItems.map((item) => {
          const isEditing = editingItem?.id === item.id;
          const stock = item.stockInfo;

          return (
            <div
              className={`inventory-item card ${!item.available ? 'unavailable' : ''} ${
                stock.needsRestock && item.available ? 'needs-restock' : ''
              }`}
              key={item.id}
            >
              {/* Edit mode */}
              {isEditing ? (
                <div className="item-edit-form fade-in">
                  <input
                    className="input-field"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    placeholder="Item name"
                  />
                  <input
                    className="input-field"
                    value={editingItem.description}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, description: e.target.value })
                    }
                    placeholder="Description"
                  />
                  <div className="edit-row">
                    <input
                      className="input-field"
                      type="number"
                      value={editingItem.price}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, price: e.target.value })
                      }
                      placeholder="Price"
                    />
                    <select
                      className="select-field"
                      value={normalizeCategory(editingItem.category)}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, category: e.target.value })
                      }
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="edit-actions">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingItem(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSaveEdit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving…' : '✓ Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Item info */}
                  <div className="item-info">
                    <div className="item-name-row">
                      <span className="item-name">{item.name}</span>
                      <span className={`item-category-tag ${normalizeCategory(item.category)}`}>
                        {MENU_CATEGORIES.find((c) => c.id === normalizeCategory(item.category))?.icon || '✨'}{' '}
                        {item.category}
                      </span>
                    </div>
                    <p className="item-desc">{item.description}</p>
                    <span className="item-price">{formatPrice(item.price)}</span>
                  </div>

                  {/* Stock info */}
                  <div className="stock-section">
                    {stock.stock != null ? (
                      <div className="stock-display">
                        <div className="stock-bar-wrapper">
                          <div
                            className="stock-bar-fill"
                            style={{
                              width: `${stock.stock > 0 ? (stock.remaining / stock.stock) * 100 : 0}%`,
                            }}
                            data-level={
                              stock.remaining === 0
                                ? 'empty'
                                : stock.remaining <= 3
                                ? 'low'
                                : stock.remaining <= Math.ceil(stock.stock * 0.3)
                                ? 'medium'
                                : 'good'
                            }
                          />
                        </div>
                        <div className="stock-numbers">
                          <span className="stock-remaining">{stock.remaining} left</span>
                          <span className="stock-detail">
                            {stock.sold} sold / {stock.stock} total
                          </span>
                        </div>
                      </div>
                    ) : stock.needsRestock && item.available ? (
                      <div className="stock-prompt">
                        <span className="stock-prompt-label">📦 Set today's stock:</span>
                        <div className="stock-input-row">
                          <input
                            type="number"
                            className="input-field stock-input"
                            min="0"
                            placeholder="Qty"
                            value={stockInputs[item.id] || ''}
                            onChange={(e) =>
                              setStockInputs({ ...stockInputs, [item.id]: e.target.value })
                            }
                          />
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSetStock(item.id)}
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="stock-na">No stock tracking</div>
                    )}

                    {/* Quick re-stock for items that already have today's stock */}
                    {stock.stock != null && (
                      <div className="stock-update-row">
                        <input
                          type="number"
                          className="input-field stock-input"
                          min="0"
                          placeholder="New count"
                          value={stockInputs[item.id] || ''}
                          onChange={(e) =>
                            setStockInputs({ ...stockInputs, [item.id]: e.target.value })
                          }
                        />
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleSetStock(item.id)}
                        >
                          Update Stock
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="item-actions">
                    <button
                      className={`btn btn-sm ${item.available ? 'btn-outline' : 'btn-primary'}`}
                      onClick={() => handleToggleAvailability(item)}
                    >
                      {item.available ? '🚫 Mark Unavailable' : '✅ Mark Available'}
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() =>
                        setEditingItem({
                          id: item.id,
                          name: item.name,
                          description: item.description || '',
                          price: item.price,
                          category: item.category,
                          imageUrl: item.imageUrl || '',
                        })
                      }
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(item)}
                    >
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="inventory-empty">
          <p>No items found {filterCategory !== 'all' ? `in ${filterCategory}` : ''}.</p>
        </div>
      )}
    </div>
  );
}
