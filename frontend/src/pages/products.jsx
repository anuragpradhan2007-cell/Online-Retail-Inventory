import { useState, useEffect } from 'react';
import { Search, Plus, X, Pencil } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  // Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    sku: '',
    cost_price: '',
    selling_price: '',
    current_stock: '',
    safety_stock_threshold: '',
    supplier_id: ''
  });

  // Edit Modal State
  const [editProduct, setEditProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    sku: '',
    cost_price: '',
    selling_price: '',
    current_stock: '',
    safety_stock_threshold: '',
    supplier_id: ''
  });
  const [editError, setEditError] = useState('');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/products`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      });
      
    fetch(`${import.meta.env.VITE_API_URL}/api/suppliers`)
      .then(res => res.json())
      .then(data => setSuppliers(data));
  }, []);

  // ── Search filter ────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return (
      (p.sku || '').toLowerCase().includes(q) ||
      (p.title || '').toLowerCase().includes(q)
    );
  });

  // ── Add Product ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplier_id && suppliers.length > 0) {
      alert('Please select a supplier');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          sku: formData.sku,
          cost_price: Number(formData.cost_price),
          selling_price: Number(formData.selling_price),
          current_stock: Number(formData.current_stock),
          safety_stock_threshold: Number(formData.safety_stock_threshold),
          supplier_id: formData.supplier_id || undefined
        })
      });

      if (response.ok) {
        const addedProduct = await response.json();
        // The newly returned product might not have the supplier join yet, but we reload or just append.
        // Easiest is to reload the products list so we get the supplier name joined.
        fetch(`${import.meta.env.VITE_API_URL}/api/products`).then(r => r.json()).then(setProducts);
        
        setIsModalOpen(false);
        setFormData({ title: '', sku: '', cost_price: '', selling_price: '', current_stock: '', safety_stock_threshold: '', supplier_id: '' });
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to add product (Make sure you have added a supplier first)');
      }
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ── Edit Product ─────────────────────────────────────────────────────────
  const openEditModal = (product) => {
    setEditProduct(product);
    setEditForm({
      title: product.title || '',
      sku: product.sku || '',
      cost_price: product.cost_price ?? '',
      selling_price: product.selling_price ?? '',
      current_stock: product.current_stock ?? '',
      safety_stock_threshold: product.safety_stock_threshold ?? '',
      supplier_id: product.supplier_id || ''
    });
    setEditError('');
  };

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.supplier_id && suppliers.length > 0) {
      setEditError('Please select a supplier');
      return;
    }
    setEditError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products/${editProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          sku: editForm.sku,
          cost_price: Number(editForm.cost_price),
          selling_price: Number(editForm.selling_price),
          current_stock: Number(editForm.current_stock),
          safety_stock_threshold: Number(editForm.safety_stock_threshold),
          supplier_id: editForm.supplier_id || undefined
        }),
      });
      const data = await response.json();
      if (!response.ok) { setEditError(data.error || 'Failed to update product'); return; }
      
      // Reload from backend to get the updated join data
      fetch(`${import.meta.env.VITE_API_URL}/api/products`).then(r => r.json()).then(setProducts);
      setEditProduct(null);
    } catch {
      setEditError('Network error — is the backend running?');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Products Inventory</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Plus size={20} /> Add Product
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search SKU or title..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" 
            />
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
              <th className="p-4 font-medium">SKU</th>
              <th className="p-4 font-medium">Title</th>
              <th className="p-4 font-medium">Cost</th>
              <th className="p-4 font-medium">Price</th>
              <th className="p-4 font-medium">Stock</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-gray-500">Loading products...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="7" className="p-8 text-center text-gray-500">No products found.</td></tr>
            ) : (
              filtered.map(product => (
                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{product.sku}</td>
                  <td className="p-4 text-gray-600">{product.title}</td>
                  <td className="p-4 text-gray-500">₹{product.cost_price}</td>
                  <td className="p-4 text-gray-600">₹{product.selling_price}</td>
                  <td className="p-4 text-gray-600">{product.current_stock}</td>
                  <td className="p-4">
                    {product.current_stock === 0 ? (
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">Out of Stock</span>
                    ) : product.current_stock <= product.safety_stock_threshold ? (
                      <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">Low Stock</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">In Stock</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => openEditModal(product)}
                      className="text-gray-400 hover:text-gray-900 transition-colors"
                      title="Edit product"
                    >
                      <Pencil size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Product</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input required type="text" name="sku" value={formData.sku} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <select required name="supplier_id" value={formData.supplier_id} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900">
                    <option value="">Select supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₹)</label>
                  <input required type="number" step="0.01" name="cost_price" value={formData.cost_price} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹)</label>
                  <input required type="number" step="0.01" name="selling_price" value={formData.selling_price} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
                  <input required type="number" name="current_stock" value={formData.current_stock} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Safety Alert At</label>
                  <input required type="number" name="safety_stock_threshold" value={formData.safety_stock_threshold} onChange={handleChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900" />
                </div>
              </div>

              <button type="submit" className="w-full bg-gray-900 text-white font-semibold py-3 rounded-lg hover:bg-gray-800 transition-colors mt-6">
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal Overlay */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setEditProduct(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
            >
              <X size={24} />
            </button>
            
            <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Product</h2>

            {editError && (
              <div className="mb-4 bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{editError}</div>
            )}
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
                <input required type="text" name="title" value={editForm.title} onChange={handleEditChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input required type="text" name="sku" value={editForm.sku} onChange={handleEditChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <select required name="supplier_id" value={editForm.supplier_id} onChange={handleEditChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900">
                    <option value="">Select supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₹)</label>
                  <input required type="number" step="0.01" name="cost_price" value={editForm.cost_price} onChange={handleEditChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹)</label>
                  <input required type="number" step="0.01" name="selling_price" value={editForm.selling_price} onChange={handleEditChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                  <input required type="number" name="current_stock" value={editForm.current_stock} onChange={handleEditChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Safety Alert At</label>
                  <input required type="number" name="safety_stock_threshold" value={editForm.safety_stock_threshold} onChange={handleEditChange} className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900" />
                </div>
              </div>

              <button type="submit" className="w-full bg-gray-900 text-white font-semibold py-3 rounded-lg hover:bg-gray-800 transition-colors mt-6">
                Update Product
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
