import { useState, useEffect } from 'react';
import { Search, Plus, X, PackageCheck, Truck, Clock, CheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL}/api`;

const STATUS_STYLES = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ORDERED: 'bg-blue-100 text-blue-800 border-blue-200',
  RECEIVED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({
    product_id: '',
    supplier_id: '',
    quantity_requested: '',
    cost_per_unit: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      const [poRes, prodRes, supRes] = await Promise.all([
        fetch(`${API}/purchase-orders`).then(r => r.json()),
        fetch(`${API}/products`).then(r => r.json()),
        fetch(`${API}/suppliers`).then(r => r.json()),
      ]);

      setPurchaseOrders(Array.isArray(poRes) ? poRes : []);
      setProducts(Array.isArray(prodRes) ? prodRes : []);
      setSuppliers(Array.isArray(supRes) ? supRes : []);
    } catch (err) {
      console.error('Error fetching PO data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When a product is selected in the modal, auto-fill its supplier and cost price
  const handleProductSelect = (productId) => {
    const selectedProd = products.find(p => p.id === productId);
    setFormData(prev => ({
      ...prev,
      product_id: productId,
      supplier_id: selectedProd?.supplier_id || prev.supplier_id,
      cost_per_unit: selectedProd?.cost_price ?? prev.cost_per_unit,
    }));
  };

  // Submit new PO
  const handleCreatePO = async (e) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);

    try {
      const res = await fetch(`${API}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: formData.product_id,
          supplier_id: formData.supplier_id || undefined,
          quantity_requested: Number(formData.quantity_requested),
          cost_per_unit: Number(formData.cost_per_unit),
          notes: formData.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || 'Failed to create purchase order');
        return;
      }

      setIsModalOpen(false);
      setFormData({
        product_id: '',
        supplier_id: '',
        quantity_requested: '',
        cost_per_unit: '',
        notes: '',
      });
      fetchData();
    } catch (err) {
      setModalError('Network error while creating purchase order.');
    } finally {
      setSubmitting(false);
    }
  };

  // Mark PO as ORDERED
  const handleMarkOrdered = async (id) => {
    try {
      const res = await fetch(`${API}/purchase-orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ORDERED' }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  // Receive Stock (Atomic Stock Increment)
  const handleReceiveStock = async (id, poNumber, qty) => {
    const confirmReceive = window.confirm(
      `Receive ${qty} units for ${poNumber}?\nThis will atomically increment product stock in the database.`
    );
    if (!confirmReceive) return;

    try {
      const res = await fetch(`${API}/purchase-orders/${id}/receive`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Success! Stock received and inventory updated.`);
        fetchData();
      } else {
        alert(data.error || 'Failed to receive purchase order');
      }
    } catch (err) {
      alert('Network error while receiving stock.');
    }
  };

  // Filters
  const filtered = purchaseOrders.filter(po => {
    const q = search.toLowerCase();
    const matchesSearch =
      (po.po_number || '').toLowerCase().includes(q) ||
      (po.products?.title || '').toLowerCase().includes(q) ||
      (po.products?.sku || '').toLowerCase().includes(q) ||
      (po.suppliers?.name || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: purchaseOrders.length,
    pending: purchaseOrders.filter(p => p.status === 'PENDING').length,
    ordered: purchaseOrders.filter(p => p.status === 'ORDERED').length,
    received: purchaseOrders.filter(p => p.status === 'RECEIVED').length,
    totalSpent: purchaseOrders
      .filter(p => p.status === 'RECEIVED')
      .reduce((sum, p) => sum + Number(p.total_cost || 0), 0),
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage replenishment orders, trigger-based auto-reorders & stock receipts
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-sm font-medium text-sm"
        >
          <Plus size={18} /> New Purchase Order
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total POs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="p-3 bg-gray-50 text-gray-600 rounded-xl">
            <ShoppingCart size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending / Ordered</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.pending + stats.ordered}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Truck size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Stock Received</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.received}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <PackageCheck size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fulfilled Spend</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">₹{stats.totalSpent.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search PO #, product, or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto overflow-x-auto">
            {['ALL', 'PENDING', 'ORDERED', 'RECEIVED', 'CANCELLED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === status
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
              <th className="p-4 font-semibold">PO Number</th>
              <th className="p-4 font-semibold">Product</th>
              <th className="p-4 font-semibold">Supplier</th>
              <th className="p-4 font-semibold text-right">Qty</th>
              <th className="p-4 font-semibold text-right">Total Cost</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-gray-400">Loading purchase orders...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-gray-400">No purchase orders found.</td>
              </tr>
            ) : (
              filtered.map((po) => {
                const isAuto = po.po_number?.startsWith('PO-AUTO-');
                return (
                  <tr key={po.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                    <td className="p-4 font-mono text-sm font-semibold text-gray-900">
                      <div className="flex items-center gap-1.5">
                        {po.po_number}
                        {isAuto && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-sans font-semibold">
                            Auto
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 font-sans block mt-0.5 truncate max-w-[140px]">
                        {po.notes || '—'}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="font-medium text-gray-900 text-sm">{po.products?.title || 'Unknown Product'}</div>
                      <div className="text-xs text-gray-400 font-mono">{po.products?.sku || '—'}</div>
                    </td>

                    <td className="p-4 text-sm text-gray-600">
                      {po.suppliers?.name || <span className="text-gray-400 italic">No supplier</span>}
                    </td>

                    <td className="p-4 text-sm font-bold text-gray-900 text-right">
                      {po.quantity_requested}
                    </td>

                    <td className="p-4 text-sm font-medium text-gray-900 text-right">
                      ₹{Number(po.total_cost || 0).toLocaleString()}
                      <span className="text-[11px] text-gray-400 block font-normal">
                        ₹{Number(po.cost_per_unit || 0)} / unit
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          STATUS_STYLES[po.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>

                    <td className="p-4 text-xs text-gray-500">
                      <div>Created: {formatDate(po.created_at)}</div>
                      {po.received_at && (
                        <div className="text-emerald-600">Recv: {formatDate(po.received_at)}</div>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      {po.status === 'PENDING' && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleMarkOrdered(po.id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                            title="Mark as sent to supplier"
                          >
                            Send
                          </button>
                          <button
                            onClick={() => handleReceiveStock(po.id, po.po_number, po.quantity_requested)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1"
                            title="Receive stock into inventory"
                          >
                            Receive
                          </button>
                        </div>
                      )}

                      {po.status === 'ORDERED' && (
                        <button
                          onClick={() => handleReceiveStock(po.id, po.po_number, po.quantity_requested)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1 mx-auto"
                        >
                          <PackageCheck size={14} /> Receive Stock
                        </button>
                      )}

                      {po.status === 'RECEIVED' && (
                        <span className="text-xs font-medium text-emerald-700 inline-flex items-center gap-1">
                          <CheckCircle2 size={14} /> Fulfilled
                        </span>
                      )}

                      {po.status === 'CANCELLED' && (
                        <span className="text-xs text-gray-400">Cancelled</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-1">Create Purchase Order</h2>
            <p className="text-xs text-gray-500 mb-5">
              Issue a restock request to replenish inventory from a supplier
            </p>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePO} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Select Product *
                </label>
                <select
                  required
                  value={formData.product_id}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.sku}) — Stock: {p.current_stock} / Safe: {p.safety_stock_threshold}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Supplier
                </label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.average_lead_time_days || 7}d lead time)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Quantity to Order *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={formData.quantity_requested}
                    onChange={(e) => setFormData({ ...formData, quantity_requested: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Cost Price Per Unit (₹)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 150"
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white"
                  />
                </div>
              </div>

              {formData.quantity_requested && formData.cost_per_unit && (
                <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center text-sm font-medium">
                  <span className="text-gray-600">Calculated Total:</span>
                  <span className="text-gray-900 font-bold">
                    ₹{(Number(formData.quantity_requested) * Number(formData.cost_per_unit)).toLocaleString()}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Urgent restock, festival season demand"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
