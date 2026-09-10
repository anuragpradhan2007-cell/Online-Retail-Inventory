import { useState, useEffect } from 'react';
import { Search, Plus, X, Pencil, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const API = 'http://localhost:5000/api';

const STATUS_STYLES = {
  PENDING:    'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  DISPATCHED: 'bg-purple-100 text-purple-700',
  DELIVERED:  'bg-green-100 text-green-700',
  CANCELLED:  'bg-red-100 text-red-700',
};

const ALL_STATUSES = ['PENDING', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);

  // Add-order modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ customer_name: '', customer_email: '' });
  const [orderItems, setOrderItems] = useState([{ product_id: '', quantity: 1, unit_price: '' }]);
  const [addError, setAddError] = useState('');

  // Edit-status modal state
  const [editOrder, setEditOrder] = useState(null);
  const [editStatus, setEditStatus] = useState('');

  // ── Fetch orders & products ──────────────────────────────────────────────
  const fetchOrders = () => {
    fetch(`${API}/orders`)
      .then(r => r.json())
      .then(data => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    fetch(`${API}/products`)
      .then(r => r.json())
      .then(setProducts)
      .catch(() => {});
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const orderTotal = (order) => {
    if (!order.order_items) return 0;
    return order.order_items.reduce((sum, i) => sum + Number(i.subtotal || 0), 0);
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return (
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.customer_email || '').toLowerCase().includes(q) ||
      (o.order_status || '').toLowerCase().includes(q) ||
      (o.id || '').toLowerCase().includes(q)
    );
  });

  // ── Add order ────────────────────────────────────────────────────────────
  const handleItemChange = (idx, field, value) => {
    const items = [...orderItems];
    items[idx] = { ...items[idx], [field]: value };

    // Auto-fill price when a product is selected
    if (field === 'product_id') {
      const prod = products.find(p => p.id === value);
      if (prod) items[idx].unit_price = prod.selling_price;
    }
    setOrderItems(items);
  };

  const addItemRow = () => setOrderItems([...orderItems, { product_id: '', quantity: 1, unit_price: '' }]);

  const removeItemRow = (idx) => {
    if (orderItems.length === 1) return;
    setOrderItems(orderItems.filter((_, i) => i !== idx));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError('');

    const items = orderItems.map(i => ({
      product_id: i.product_id,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    }));

    if (items.some(i => !i.product_id || i.quantity <= 0 || !i.unit_price)) {
      setAddError('All item rows must have a product, quantity > 0, and a price.');
      return;
    }

    try {
      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, items }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || 'Failed to place order'); return; }

      // Refresh orders list to get full joined data
      fetchOrders();
      closeAddModal();
    } catch {
      setAddError('Network error — is the backend running?');
    }
  };

  const closeAddModal = () => {
    setIsAddOpen(false);
    setAddForm({ customer_name: '', customer_email: '' });
    setOrderItems([{ product_id: '', quantity: 1, unit_price: '' }]);
    setAddError('');
  };

  // ── Edit status ──────────────────────────────────────────────────────────
  const openEditModal = (order) => { setEditOrder(order); setEditStatus(order.order_status); };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/orders/${editOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_status: editStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(orders.map(o => (o.id === updated.id ? { ...o, ...updated } : o)));
        setEditOrder(null);
      }
    } catch { /* no-op */ }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Plus size={20} /> New Order
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search name, email, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
              <th className="p-4 font-medium w-8"></th>
              <th className="p-4 font-medium">Order ID</th>
              <th className="p-4 font-medium">Customer</th>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Total</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-gray-500">Loading orders...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-gray-500">No orders found.</td></tr>
            ) : (
              filtered.map(order => (
                <>
                  {/* Main row */}
                  <tr
                    key={order.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <td className="pl-4">
                      {expandedOrder === order.id
                        ? <ChevronUp size={16} className="text-gray-400" />
                        : <ChevronDown size={16} className="text-gray-400" />}
                    </td>
                    <td className="p-4 font-medium text-gray-900 font-mono text-sm">{order.id?.slice(0, 8)}…</td>
                    <td className="p-4">
                      <div className="text-gray-900 font-medium">{order.customer_name}</div>
                      <div className="text-gray-400 text-sm">{order.customer_email}</div>
                    </td>
                    <td className="p-4 text-gray-600">{formatDate(order.ordered_at)}</td>
                    <td className="p-4 text-gray-600 font-medium">₹{orderTotal(order).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`${STATUS_STYLES[order.order_status] || 'bg-gray-100 text-gray-700'} px-3 py-1 rounded-full text-xs font-semibold`}>
                        {order.order_status}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(order); }}
                        className="text-gray-400 hover:text-gray-900 transition-colors"
                        title="Edit status"
                      >
                        <Pencil size={18} />
                      </button>
                    </td>
                  </tr>

                  {/* Expanded line-items row */}
                  {expandedOrder === order.id && (
                    <tr key={`${order.id}-items`} className="bg-gray-50/60">
                      <td colSpan="7" className="px-8 py-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Line Items</p>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-400 text-xs">
                              <th className="text-left pb-2 font-medium">Product</th>
                              <th className="text-left pb-2 font-medium">SKU</th>
                              <th className="text-right pb-2 font-medium">Qty</th>
                              <th className="text-right pb-2 font-medium">Unit Price</th>
                              <th className="text-right pb-2 font-medium">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(order.order_items || []).map(item => (
                              <tr key={item.id} className="border-t border-gray-100">
                                <td className="py-2 text-gray-700">{item.products?.title || '—'}</td>
                                <td className="py-2 text-gray-500 font-mono">{item.products?.sku || '—'}</td>
                                <td className="py-2 text-gray-700 text-right">{item.quantity}</td>
                                <td className="py-2 text-gray-500 text-right">₹{Number(item.unit_price).toFixed(2)}</td>
                                <td className="py-2 text-gray-900 font-medium text-right">₹{Number(item.subtotal).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {order.delivered_at && (
                          <p className="mt-3 text-xs text-gray-400">Delivered on {formatDate(order.delivered_at)}</p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add Order Modal ────────────────────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={closeAddModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900">
              <X size={24} />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-6">Place New Order</h2>

            {addError && (
              <div className="mb-4 bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{addError}</div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Customer info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input
                  required type="text" value={addForm.customer_name}
                  onChange={e => setAddForm({ ...addForm, customer_name: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
                <input
                  required type="email" value={addForm.customer_email}
                  onChange={e => setAddForm({ ...addForm, customer_email: e.target.value })}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {/* Order items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Items</label>
                  <button type="button" onClick={addItemRow}
                    className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors">
                    <Plus size={14} /> Add item
                  </button>
                </div>

                <div className="space-y-3">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-gray-50 rounded-lg p-3">
                      <div className="flex-1 space-y-2">
                        <select
                          required value={item.product_id}
                          onChange={e => handleItemChange(idx, 'product_id', e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 bg-white text-sm"
                        >
                          <option value="">Select a product</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.title} — ₹{p.selling_price}  (stock: {p.current_stock})
                            </option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-400">Qty</label>
                            <input
                              required type="number" min="1" value={item.quantity}
                              onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Unit Price (₹)</label>
                            <input
                              required type="number" step="0.01" min="0" value={item.unit_price}
                              onChange={e => handleItemChange(idx, 'unit_price', e.target.value)}
                              className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      {orderItems.length > 1 && (
                        <button type="button" onClick={() => removeItemRow(idx)}
                          className="mt-2 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit"
                className="w-full bg-gray-900 text-white font-semibold py-3 rounded-lg hover:bg-gray-800 transition-colors mt-6">
                Place Order
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Status Modal ──────────────────────────────────────────────── */}
      {editOrder && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setEditOrder(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900">
              <X size={24} />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-1">Update Order Status</h2>
            <p className="text-sm text-gray-400 mb-6 font-mono">{editOrder.id?.slice(0, 8)}…</p>

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <button type="submit"
                className="w-full bg-gray-900 text-white font-semibold py-3 rounded-lg hover:bg-gray-800 transition-colors mt-6">
                Save Status
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
