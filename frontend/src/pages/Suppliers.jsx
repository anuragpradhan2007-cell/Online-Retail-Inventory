import { useState, useEffect } from 'react';
import { Search, Plus, X, Pencil, Trash2, AlertTriangle, Package } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL}/api`;

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', contact_email: '', phone: '', average_lead_time_days: '',
  });
  const [addError, setAddError] = useState('');

  // Edit modal
  const [editSupplier, setEditSupplier] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '', contact_email: '', phone: '', average_lead_time_days: '',
  });
  const [editError, setEditError] = useState('');

  // Delete Confirmation Modal with Affected Products
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [affectedProducts, setAffectedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchSuppliers = () => {
    fetch(`${API}/suppliers`)
      .then(r => r.json())
      .then(data => { setSuppliers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchSuppliers(); }, []);

  // ── Search filter ────────────────────────────────────────────────────────
  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.contact_email || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q)
    );
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ── Add supplier ─────────────────────────────────────────────────────────
  const closeAddModal = () => {
    setIsAddOpen(false);
    setAddForm({ name: '', contact_email: '', phone: '', average_lead_time_days: '' });
    setAddError('');
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError('');
    try {
      const res = await fetch(`${API}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name,
          contact_email: addForm.contact_email,
          phone: addForm.phone,
          average_lead_time_days: Number(addForm.average_lead_time_days),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || 'Failed to add supplier'); return; }
      setSuppliers([data, ...suppliers]);
      closeAddModal();
    } catch {
      setAddError('Network error — is the backend running?');
    }
  };

  // ── Edit supplier ────────────────────────────────────────────────────────
  const openEditModal = (supplier) => {
    setEditSupplier(supplier);
    setEditForm({
      name: supplier.name || '',
      contact_email: supplier.contact_email || '',
      phone: supplier.phone || '',
      average_lead_time_days: supplier.average_lead_time_days ?? '',
    });
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    try {
      const res = await fetch(`${API}/suppliers/${editSupplier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          contact_email: editForm.contact_email,
          phone: editForm.phone,
          average_lead_time_days: Number(editForm.average_lead_time_days),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setEditError(data.error || 'Failed to update supplier'); return; }
      setSuppliers(suppliers.map(s => (s.id === data.id ? data : s)));
      setEditSupplier(null);
    } catch {
      setEditError('Network error — is the backend running?');
    }
  };

  // ── Delete Supplier Modal with affected products ──────────────────────────
  const openDeleteModal = async (supplier) => {
    setDeleteTarget(supplier);
    setLoadingProducts(true);
    setAffectedProducts([]);
    try {
      const res = await fetch(`${API}/suppliers/${supplier.id}/products`);
      const data = await res.json();
      setAffectedProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch supplier products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const confirmDeleteSupplier = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API}/suppliers/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setSuppliers(prev => prev.filter(s => s.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        alert(data.error || 'Failed to delete supplier');
      }
    } catch {
      alert('Network error while deleting supplier.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-sm font-medium text-sm"
        >
          <Plus size={18} /> Add Supplier
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
              placeholder="Search name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white"
            />
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Phone</th>
              <th className="p-4 font-medium">Lead Time</th>
              <th className="p-4 font-medium">Added On</th>
              <th className="p-4 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading suppliers...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">No suppliers found.</td></tr>
            ) : (
              filtered.map(supplier => (
                <tr key={supplier.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{supplier.name}</td>
                  <td className="p-4 text-gray-600">{supplier.contact_email || '—'}</td>
                  <td className="p-4 text-gray-600">{supplier.phone || '—'}</td>
                  <td className="p-4">
                    {supplier.average_lead_time_days != null ? (
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                        {supplier.average_lead_time_days} days
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-500 text-sm">{formatDate(supplier.created_at)}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => openEditModal(supplier)}
                        className="text-gray-400 hover:text-gray-900 transition-colors"
                        title="Edit supplier"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(supplier)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete supplier"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Add Supplier Modal ─────────────────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={closeAddModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900">
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Supplier</h2>

            {addError && (
              <div className="mb-4 bg-red-50 text-red-700 px-4 py-2 rounded-xl text-sm">{addError}</div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                <input
                  required type="text" value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  required type="email" value={addForm.contact_email}
                  onChange={e => setAddForm({ ...addForm, contact_email: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text" value={addForm.phone}
                    onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (days)</label>
                  <input
                    required type="number" min="0" value={addForm.average_lead_time_days}
                    onChange={e => setAddForm({ ...addForm, average_lead_time_days: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white"
                  />
                </div>
              </div>

              <button type="submit"
                className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors mt-6 shadow-sm">
                Save Supplier
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Supplier Modal ────────────────────────────────────────────── */}
      {editSupplier && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setEditSupplier(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900">
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Supplier</h2>

            {editError && (
              <div className="mb-4 bg-red-50 text-red-700 px-4 py-2 rounded-xl text-sm">{editError}</div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                <input
                  required type="text" value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  required type="email" value={editForm.contact_email}
                  onChange={e => setEditForm({ ...editForm, contact_email: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text" value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (days)</label>
                  <input
                    required type="number" min="0" value={editForm.average_lead_time_days}
                    onChange={e => setEditForm({ ...editForm, average_lead_time_days: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white"
                  />
                </div>
              </div>

              <button type="submit"
                className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors mt-6 shadow-sm">
                Update Supplier
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Supplier Confirmation Modal (Shows Associated Products) ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
            <button
              onClick={() => setDeleteTarget(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-3 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Delete Supplier</h2>
                <p className="text-xs text-red-600 font-medium">Permanent cascading deletion warning</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete <span className="font-bold text-gray-900">"{deleteTarget.name}"</span>?
              {affectedProducts.length > 0 ? (
                <>
                  {' '}The following <span className="font-bold text-red-600">{affectedProducts.length} product(s)</span> provided by this supplier will also be <span className="font-bold text-red-600">permanently deleted</span> from your inventory:
                </>
              ) : (
                ' There are currently no products associated with this supplier.'
              )}
            </p>

            {/* List of affected products */}
            <div className="mb-6 max-h-56 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-gray-50">
              {loadingProducts ? (
                <div className="p-4 text-center text-xs text-gray-400">Loading affected products...</div>
              ) : affectedProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <Package size={16} /> No products will be affected.
                </div>
              ) : (
                affectedProducts.map(p => (
                  <div key={p.id} className="p-3 flex items-center justify-between text-sm bg-white hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900">{p.title}</p>
                      <p className="text-xs text-gray-400 font-mono">SKU: {p.sku}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                        Stock: {p.current_stock}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteSupplier}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isDeleting ? 'Deleting...' : `Delete Supplier (${affectedProducts.length} Products)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
