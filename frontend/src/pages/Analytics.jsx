import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Star,
  Lightbulb,
  TrendingDown,
  Package,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL}/api`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function orderRevenue(order) {
  return (order.order_items || []).reduce((s, i) => s + Number(i.subtotal || 0), 0);
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Analytics() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/products`).then(r => r.json()),
      fetch(`${API}/orders`).then(r => r.json()),
      fetch(`${API}/suppliers`).then(r => r.json()),
    ]).then(([p, o, s]) => {
      setProducts(Array.isArray(p) ? p : []);
      setOrders(Array.isArray(o) ? o : []);
      setSuppliers(Array.isArray(s) ? s : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ── 1. STOCK-OUT WARNINGS ─────────────────────────────────────────────────
  const stockoutWarnings = useMemo(() => {
    // Calculate daily sales per product over last 30 days
    const thirtyDaysAgo = daysAgo(30);
    const salesByProduct = {};

    orders.forEach(order => {
      const orderedAt = new Date(order.ordered_at);
      if (orderedAt >= thirtyDaysAgo) {
        (order.order_items || []).forEach(item => {
          const pid = item.products?.sku || item.product_id;
          if (!salesByProduct[pid]) salesByProduct[pid] = { units: 0, title: item.products?.title };
          salesByProduct[pid].units += Number(item.quantity || 0);
        });
      }
    });

    return products
      .map(product => {
        const salesKey = product.sku;
        const totalUnits = salesByProduct[salesKey]?.units || 0;
        const avgDailySales = totalUnits / 30;
        const daysUntilStockout =
          avgDailySales > 0 ? Math.floor(product.current_stock / avgDailySales) : null;

        return {
          id: product.id,
          title: product.title,
          sku: product.sku,
          currentStock: product.current_stock,
          safetyThreshold: product.safety_stock_threshold,
          avgDailySales: avgDailySales.toFixed(2),
          daysUntilStockout,
          severity:
            daysUntilStockout === null
              ? 'no-sales'
              : daysUntilStockout <= 7
              ? 'critical'
              : daysUntilStockout <= 14
              ? 'warning'
              : 'safe',
        };
      })
      .filter(p => p.severity === 'critical' || p.severity === 'warning')
      .sort((a, b) => (a.daysUntilStockout ?? 999) - (b.daysUntilStockout ?? 999));
  }, [products, orders]);

  // ── 2. SUPPLIER SCORES ────────────────────────────────────────────────────
  const supplierScores = useMemo(() => {
    // Map orders delivered to suppliers via products
    const supplierMap = {};
    suppliers.forEach(s => {
      supplierMap[s.id] = {
        id: s.id,
        name: s.name,
        promisedLeadDays: s.average_lead_time_days || 7,
        totalOrders: 0,
        onTimeOrders: 0,
        lateOrders: 0,
      };
    });

    // Check delivered orders against supplier promised lead time
    orders.forEach(order => {
      if (order.order_status === 'DELIVERED' && order.ordered_at && order.delivered_at) {
        const orderedAt = new Date(order.ordered_at);
        const deliveredAt = new Date(order.delivered_at);
        const actualDays = Math.ceil(
          (deliveredAt.getTime() - orderedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Find which supplier(s) filled this order via products
        const supplierIds = new Set();
        (order.order_items || []).forEach(item => {
          const product = products.find(p => p.sku === item.products?.sku);
          if (product?.supplier_id) supplierIds.add(product.supplier_id);
        });

        supplierIds.forEach(sid => {
          if (!supplierMap[sid]) return;
          const promised = supplierMap[sid].promisedLeadDays;
          supplierMap[sid].totalOrders++;
          if (actualDays <= promised) {
            supplierMap[sid].onTimeOrders++;
          } else {
            supplierMap[sid].lateOrders++;
          }
        });
      }
    });

    return Object.values(supplierMap).map((s) => {
      const score =
        s.totalOrders === 0
          ? null
          : Math.round((s.onTimeOrders / s.totalOrders) * 100);
      return { ...s, score };
    }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [suppliers, orders, products]);

  // ── 3. SCHEME SUGGESTIONS ─────────────────────────────────────────────────
  const schemeSuggestions = useMemo(() => {
    const suggestions = [];

    // Calculate 30-day sales velocity per product
    const thirtyDaysAgo = daysAgo(30);
    const salesVelocity = {};
    orders.forEach(order => {
      const orderedAt = new Date(order.ordered_at);
      if (orderedAt >= thirtyDaysAgo) {
        (order.order_items || []).forEach(item => {
          const sku = item.products?.sku;
          if (!sku) return;
          if (!salesVelocity[sku]) salesVelocity[sku] = { units: 0, revenue: 0 };
          salesVelocity[sku].units += Number(item.quantity || 0);
          salesVelocity[sku].revenue += Number(item.subtotal || 0);
        });
      }
    });

    const avgOrderValue =
      orders.length > 0
        ? orders.reduce((s, o) => s + orderRevenue(o), 0) / orders.length
        : 0;

    // Sort products by velocity
    const withVelocity = products.map(p => ({
      ...p,
      velocity: salesVelocity[p.sku]?.units || 0,
      margin: p.selling_price - p.cost_price,
      marginPct:
        p.selling_price > 0
          ? ((p.selling_price - p.cost_price) / p.selling_price) * 100
          : 0,
    }));

    const fastMovers = [...withVelocity]
      .filter(p => p.velocity > 0)
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, 3);

    const slowMovers = [...withVelocity]
      .filter(p => p.velocity === 0 || p.current_stock > p.safety_stock_threshold * 3)
      .slice(0, 3);

    const highMarginProducts = [...withVelocity]
      .filter(p => p.marginPct > 30)
      .sort((a, b) => b.marginPct - a.marginPct)
      .slice(0, 3);

    // Scheme 1: Combo — pair slow item with fast item
    if (slowMovers.length > 0 && fastMovers.length > 0) {
      const slow = slowMovers[0];
      const fast = fastMovers[0];
      if (slow.id !== fast.id) {
        suggestions.push({
          type: 'Combo',
          icon: '🎁',
          color: 'bg-purple-50 border-purple-200 text-purple-800',
          badgeColor: 'bg-purple-100 text-purple-700',
          title: `Bundle "${slow.title}" with "${fast.title}"`,
          description: `"${fast.title}" sells fast. Pair it with slow-moving "${slow.title}" in a combo to clear excess stock.`,
          action: `Suggested combo price: ₹${(Number(slow.selling_price) + Number(fast.selling_price) * 0.9).toFixed(0)}`,
        });
      }
    }

    // Scheme 2: Bulk — buy 3, get 10% off on high margin items
    if (highMarginProducts.length > 0) {
      highMarginProducts.slice(0, 2).forEach(p => {
        suggestions.push({
          type: 'Bulk',
          icon: '📦',
          color: 'bg-blue-50 border-blue-200 text-blue-800',
          badgeColor: 'bg-blue-100 text-blue-700',
          title: `"${p.title}" — Buy 3, Get 10% Off`,
          description: `This product has a ${p.marginPct.toFixed(0)}% margin. A 10% bulk discount still yields a ${(p.marginPct - 10).toFixed(0)}% margin and boosts volume.`,
          action: `Discounted price per unit: ₹${(Number(p.selling_price) * 0.9).toFixed(0)} (Margin retained: ₹${(p.margin * 0.9).toFixed(0)})`,
        });
      });
    }

    // Scheme 3: Basket — flat ₹50 off above average order value
    if (avgOrderValue > 0) {
      suggestions.push({
        type: 'Basket',
        icon: '🛒',
        color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        badgeColor: 'bg-emerald-100 text-emerald-700',
        title: `Flat ₹50 Off Orders Above ₹${Math.round(avgOrderValue)}`,
        description: `Your average order value is ₹${avgOrderValue.toFixed(0)}. Offering ₹50 off above this threshold encourages customers to add one more item.`,
        action: `Minimum order threshold: ₹${Math.round(avgOrderValue)} • Discount: ₹50 flat`,
      });
    }

    return suggestions;
  }, [products, orders]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Smart Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Stock-out predictions, supplier reliability scores, and scheme recommendations
        </p>
      </div>

      {/* ─── Section 1: Stock-out Warnings ───────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Stock-out Warnings</h2>
            <p className="text-xs text-gray-500">Based on average daily sales over the last 30 days</p>
          </div>
          {stockoutWarnings.length > 0 && (
            <span className="ml-auto px-2.5 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
              {stockoutWarnings.length} at risk
            </span>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {stockoutWarnings.length === 0 ? (
            <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
              <CheckCircle size={32} className="text-emerald-400" />
              <p className="font-medium text-gray-600">All products have healthy stock levels!</p>
              <p className="text-sm">No items are predicted to run out in the next 14 days.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                  <th className="p-4 font-medium">Product</th>
                  <th className="p-4 font-medium">SKU</th>
                  <th className="p-4 font-medium">Stock Left</th>
                  <th className="p-4 font-medium">Avg Daily Sales</th>
                  <th className="p-4 font-medium">Days to Stockout</th>
                  <th className="p-4 font-medium">Urgency</th>
                </tr>
              </thead>
              <tbody>
                {stockoutWarnings.map(item => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{item.title}</td>
                    <td className="p-4 text-gray-500 font-mono text-sm">{item.sku}</td>
                    <td className="p-4 text-gray-700">{item.currentStock} units</td>
                    <td className="p-4 text-gray-600">{item.avgDailySales} units/day</td>
                    <td className="p-4 font-semibold">
                      {item.daysUntilStockout !== null ? (
                        <span className={item.severity === 'critical' ? 'text-red-600' : 'text-orange-500'}>
                          ~{item.daysUntilStockout} days
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-4">
                      {item.severity === 'critical' ? (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                          🔴 Critical
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                          🟡 Warning
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ─── Section 2: Supplier Scores ──────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
            <Star size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Supplier Reliability Scores</h2>
            <p className="text-xs text-gray-500">Compares promised vs. actual delivery lead times</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {supplierScores.length === 0 ? (
            <div className="col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
              No suppliers found. Add suppliers to see reliability scores.
            </div>
          ) : (
            supplierScores.map(supplier => {
              const score = supplier.score;
              const scoreColor =
                score === null
                  ? 'text-gray-400'
                  : score >= 80
                  ? 'text-emerald-600'
                  : score >= 60
                  ? 'text-orange-500'
                  : 'text-red-600';
              const barColor =
                score === null
                  ? 'bg-gray-200'
                  : score >= 80
                  ? 'bg-emerald-500'
                  : score >= 60
                  ? 'bg-orange-400'
                  : 'bg-red-500';

              return (
                <div
                  key={supplier.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{supplier.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Promised: {supplier.promisedLeadDays} day lead time
                      </p>
                    </div>
                    <span className={`text-2xl font-black ${scoreColor}`}>
                      {score !== null ? `${score}%` : 'N/A'}
                    </span>
                  </div>

                  {/* Score bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${barColor}`}
                      style={{ width: `${score ?? 0}%` }}
                    />
                  </div>

                  <div className="flex gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle size={13} className="text-emerald-500" />
                      {supplier.onTimeOrders} on-time
                    </span>
                    <span className="flex items-center gap-1">
                      <XCircle size={13} className="text-red-400" />
                      {supplier.lateOrders} late
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-gray-400" />
                      {supplier.totalOrders} total
                    </span>
                  </div>

                  {score === null && (
                    <p className="text-xs text-gray-400 italic">
                      No delivered orders yet — score will appear after first delivery.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ─── Section 3: Scheme Suggestions ───────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-yellow-100 text-yellow-600">
            <Lightbulb size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Scheme Suggestions</h2>
            <p className="text-xs text-gray-500">AI-driven promotions to boost revenue and clear slow-moving stock</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {schemeSuggestions.length === 0 ? (
            <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-400">
              Add more products and orders to generate scheme suggestions.
            </div>
          ) : (
            schemeSuggestions.map((scheme, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border p-5 flex flex-col gap-3 ${scheme.color}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{scheme.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scheme.badgeColor}`}>
                        {scheme.type}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm leading-snug">{scheme.title}</h3>
                  </div>
                </div>
                <p className="text-sm leading-relaxed opacity-90">{scheme.description}</p>
                <div className="text-xs font-semibold opacity-75 border-t border-current border-opacity-20 pt-3">
                  💡 {scheme.action}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
