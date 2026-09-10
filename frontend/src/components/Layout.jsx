import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Box, Users, ShoppingCart, Settings, RotateCcw } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  const handleReset = async () => {
    const firstConfirm = window.confirm('Are you sure you want to reset all values?');
    if (firstConfirm) {
      const secondConfirm = window.confirm('This action cannot be undone. Are you absolutely certain you want to reset?');
      if (secondConfirm) {
        try {
          const res = await fetch('http://localhost:5000/api/analytics/reset', { method: 'POST' });
          if (res.ok) {
            alert('Database has been completely reset.');
            window.location.reload(); // Refresh to clear UI state
          } else {
            alert('Failed to reset database.');
          }
        } catch (error) {
          alert('Error contacting backend.');
        }
      }
    }
  };

  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111111] text-white flex flex-col fixed h-full">
        <div className="p-6 mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="bg-white text-black p-1 rounded">IR</span> Retail
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <div className="mb-6">
            <p className="text-xs text-gray-500 font-bold mb-3 px-4 uppercase tracking-wider">Inventory</p>
            <nav className="flex flex-col gap-1">
              <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
              <NavItem to="/products" icon={Box} label="Products" />
              <NavItem to="/suppliers" icon={Users} label="Suppliers" />
              <NavItem to="/orders" icon={ShoppingCart} label="Orders" />
            </nav>
          </div>

          <div className="mb-6">
            <p className="text-xs text-gray-500 font-bold mb-3 px-4 uppercase tracking-wider">Settings</p>
            <nav className="flex flex-col gap-1">
              <NavItem to="/settings" icon={Settings} label="Settings" />
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={handleReset}
            className="flex items-center gap-3 px-4 py-3 text-red-500 hover:text-white hover:bg-red-600 rounded-lg transition-colors w-full"
          >
            <RotateCcw size={20} />
            <span className="font-medium">Reset Values</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}