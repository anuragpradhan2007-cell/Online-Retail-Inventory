import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Package, Clock } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL}/api`;

// ── Date helpers ─────────────────────────────────────────────────────────────
function startOfDay(d) { const r = new Date(d); r.setHours(0,0,0,0); return r; }

function getWeekRange(d) {
  const day = d.getDay(); // 0=Sun
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7)); // Monday
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6); // Sunday
  return { start: startOfDay(mon), end: startOfDay(sun) };
}

function getMonthRange(d) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: startOfDay(start), end: startOfDay(end) };
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function orderRevenue(order) {
  return (order.order_items || []).reduce((s, i) => s + Number(i.subtotal || 0), 0);
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Card #2 toggle: false = week, true = today
  const [showToday, setShowToday] = useState(false);

  // Chart toggle: false = daily (this week), true = weekly (this month)
  const [chartMonthly, setChartMonthly] = useState(false);

  useEffect(() => {
    fetch(`${API}/orders`)
      .then(r => r.json())
      .then(data => { setOrders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────
  const now = new Date();
  const todayStart = startOfDay(now);
  const week = getWeekRange(now);
  const month = getMonthRange(now);

  const totalSales = useMemo(
    () => orders.reduce((s, o) => s + orderRevenue(o), 0),
    [orders],
  );

  const weekSales = useMemo(
    () => orders
      .filter(o => { const d = new Date(o.ordered_at); return d >= week.start && d <= new Date(week.end.getTime() + 86400000 - 1); })
      .reduce((s, o) => s + orderRevenue(o), 0),
    [orders],
  );

  const todaySales = useMemo(
    () => orders
      .filter(o => startOfDay(new Date(o.ordered_at)).getTime() === todayStart.getTime())
      .reduce((s, o) => s + orderRevenue(o), 0),
    [orders],
  );

  // ── Bar chart data ───────────────────────────────────────────────────────
  const dailyChartData = useMemo(() => {
    // 7 buckets: Mon–Sun of this week
    const buckets = DAY_NAMES.map(name => ({ name, sales: 0 }));
    orders.forEach(o => {
      const d = new Date(o.ordered_at);
      if (d >= week.start && d <= new Date(week.end.getTime() + 86400000 - 1)) {
        const idx = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
        buckets[idx].sales += orderRevenue(o);
      }
    });
    return buckets;
  }, [orders]);

  const weeklyChartData = useMemo(() => {
    // Buckets per week of this month
    const buckets = {};
    orders.forEach(o => {
      const d = new Date(o.ordered_at);
      if (d >= month.start && d <= new Date(month.end.getTime() + 86400000 - 1)) {
        // Week number within month (1-indexed)
        const weekNum = Math.ceil(d.getDate() / 7);
        const label = `Week ${weekNum}`;
        if (!buckets[label]) buckets[label] = { name: label, sales: 0 };
        buckets[label].sales += orderRevenue(o);
      }
    });
    // Ensure at least 4-5 week slots
    const maxWeek = Math.ceil(month.end.getDate() / 7);
    for (let i = 1; i <= maxWeek; i++) {
      const label = `Week ${i}`;
      if (!buckets[label]) buckets[label] = { name: label, sales: 0 };
    }
    return Object.values(buckets).sort((a, b) => {
      const na = Number(a.name.split(' ')[1]);
      const nb = Number(b.name.split(' ')[1]);
      return na - nb;
    });
  }, [orders]);

  // ── Pending / Processing orders (not dispatched) ─────────────────────────
  const pendingOrders = useMemo(
    () => orders.filter(o => o.order_status === 'PENDING' || o.order_status === 'PROCESSING'),
    [orders],
  );

  // ── Tooltip ──────────────────────────────────────────────────────────────
  const ChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100 text-sm">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-gray-500">₹{payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      );
    }
    return null;
  };

  const fmt = (v) => `₹${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const STATUS_STYLES = {
    PENDING:    'bg-yellow-100 text-yellow-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ─── Top KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Total Sales */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36">
          <h3 className="text-sm font-semibold text-gray-500">Total Sales</h3>
          <span className="text-3xl font-bold text-gray-900">
            {loading ? '...' : fmt(totalSales)}
          </span>
        </div>

        {/* 2. Current Week Sales / Today Sales (clickable) */}
        <div
          onClick={() => setShowToday(!showToday)}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-36 cursor-pointer hover:border-gray-300 transition-colors select-none"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-500">
              {showToday ? "Today's Sales" : 'This Week Sales'}
            </h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              click to {showToday ? 'see week' : 'see today'}
            </span>
          </div>
          <span className="text-3xl font-bold text-gray-900">
            {loading ? '...' : fmt(showToday ? todaySales : weekSales)}
          </span>
        </div>
      </div>

      {/* ─── Bar Chart ──────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-md font-semibold text-gray-800">
            {chartMonthly ? 'Weekly Sales This Month' : 'Daily Sales This Week'}
          </h3>

          {/* Toggle switch */}
          <button
            onClick={() => setChartMonthly(!chartMonthly)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg"
          >
            {chartMonthly ? (
              <><Clock size={14} /> Show Daily</>
            ) : (
              <><Package size={14} /> Show Monthly</>
            )}
          </button>
        </div>

        {loading ? (
          <div className="h-72 flex items-center justify-center text-gray-400">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartMonthly ? weeklyChartData : dailyChartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="sales" fill="#111111" radius={[6, 6, 0, 0]} barSize={chartMonthly ? 48 : 36} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ─── Pending Orders List ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-md font-semibold text-gray-800">Orders Awaiting Dispatch</h3>
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {loading ? '...' : pendingOrders.length}
          </span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
              <th className="p-4 font-medium">Order ID</th>
              <th className="p-4 font-medium">Customer</th>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Total</th>
              <th className="p-4 font-medium">Items</th>
              <th className="p-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading...</td></tr>
            ) : pendingOrders.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-400">All orders have been dispatched 🎉</td></tr>
            ) : (
              pendingOrders.map(order => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 font-mono text-sm">{order.id?.slice(0, 8)}…</td>
                  <td className="p-4">
                    <div className="text-gray-900 font-medium">{order.customer_name}</div>
                    <div className="text-gray-400 text-sm">{order.customer_email}</div>
                  </td>
                  <td className="p-4 text-gray-600 text-sm">{formatDate(order.ordered_at)}</td>
                  <td className="p-4 text-gray-600 font-medium">{fmt(orderRevenue(order))}</td>
                  <td className="p-4 text-gray-500 text-sm">
                    {(order.order_items || []).map(i => i.products?.title || 'Item').join(', ')}
                  </td>
                  <td className="p-4">
                    <span className={`${STATUS_STYLES[order.order_status] || 'bg-gray-100 text-gray-700'} px-3 py-1 rounded-full text-xs font-semibold`}>
                      {order.order_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
