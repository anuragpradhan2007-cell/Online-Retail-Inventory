import { useState, useEffect } from 'react';
import { History, Search, RefreshCw, Filter, ChevronDown, ChevronUp, Database, ArrowRight, ShieldAlert } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL}/api`;

const ACTION_COLORS = {
  INSERT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  UPDATE: 'bg-blue-100 text-blue-800 border-blue-200',
  DELETE: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `${API}/audit-logs?limit=150`;
      if (tableFilter !== 'ALL') url += `&table=${tableFilter}`;
      if (actionFilter !== 'ALL') url += `&action=${actionFilter}`;

      const res = await fetch(url);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [tableFilter, actionFilter]);

  const toggleExpand = (id) => {
    setExpandedRow(prev => (prev === id ? null : id));
  };

  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    const q = search.toLowerCase();
    const str = `${log.table_name} ${log.action} ${log.record_id} ${JSON.stringify(log.new_data || {})} ${JSON.stringify(log.old_data || {})}`.toLowerCase();
    return str.includes(q);
  });

  const stats = {
    total: logs.length,
    inserts: logs.filter(l => l.action === 'INSERT').length,
    updates: logs.filter(l => l.action === 'UPDATE').length,
    deletes: logs.filter(l => l.action === 'DELETE').length,
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Database Audit Logs</h1>
            <span className="text-xs bg-gray-100 text-gray-700 font-semibold px-2.5 py-0.5 rounded-full border border-gray-200">
              DBMS Trigger Powered
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Automatic tracking of all INSERT, UPDATE, and DELETE operations via PostgreSQL Triggers
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh Logs
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Recorded</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="p-3 bg-gray-50 text-gray-600 rounded-xl">
            <History size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Inserts</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.inserts}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Database size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Updates</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.updates}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <RefreshCw size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Deletions</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats.deletes}</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert size={20} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filter Controls */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search in audit trail payload..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Table Filter */}
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 text-xs">
              <span className="text-gray-400 px-2 font-medium">Table:</span>
              {['ALL', 'products', 'orders', 'suppliers'].map(tbl => (
                <button
                  key={tbl}
                  onClick={() => setTableFilter(tbl)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    tableFilter === tbl ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tbl}
                </button>
              ))}
            </div>

            {/* Action Filter */}
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 text-xs">
              <span className="text-gray-400 px-2 font-medium">Action:</span>
              {['ALL', 'INSERT', 'UPDATE', 'DELETE'].map(act => (
                <button
                  key={act}
                  onClick={() => setActionFilter(act)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    actionFilter === act ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {act}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Table */}
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
              <th className="p-4 font-semibold">Action</th>
              <th className="p-4 font-semibold">Table</th>
              <th className="p-4 font-semibold">Record ID</th>
              <th className="p-4 font-semibold">Timestamp</th>
              <th className="p-4 font-semibold">Executed By</th>
              <th className="p-4 font-semibold text-center">Payload Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-400">Loading database audit logs...</td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-gray-400">
                  <Database size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="font-medium text-gray-600">No audit records found</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    Audit triggers automatically record data whenever a Product, Order, or Supplier is inserted, updated, or deleted.
                  </p>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedRow === log.id;
                return (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="p-4 font-mono text-sm font-semibold text-gray-900">
                      {log.table_name}
                    </td>

                    <td className="p-4 font-mono text-xs text-gray-500">
                      {log.record_id ? `${log.record_id.slice(0, 10)}...` : '—'}
                    </td>

                    <td className="p-4 text-xs text-gray-600 whitespace-nowrap">
                      {formatDate(log.changed_at)}
                    </td>

                    <td className="p-4 text-xs text-gray-500 font-medium">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-mono">
                        {log.changed_by || 'system'}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleExpand(log.id)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? 'Hide Diff' : 'View Diff'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Collapsible details for active expanded row */}
        {expandedRow && (
          <div className="bg-gray-900 text-gray-100 p-6 border-t border-gray-800 animate-fadeIn">
            {(() => {
              const activeLog = logs.find(l => l.id === expandedRow);
              if (!activeLog) return null;

              return (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs bg-gray-800 px-2.5 py-1 rounded text-gray-300">
                        {activeLog.table_name} &bull; {activeLog.action}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        ID: {activeLog.record_id}
                      </span>
                    </div>
                    <button
                      onClick={() => setExpandedRow(null)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Close Diff
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Old Data */}
                    <div className="bg-black/50 p-4 rounded-xl border border-gray-800">
                      <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                        Pre-Operation State (OLD Data)
                      </p>
                      <pre className="text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-60">
                        {activeLog.old_data
                          ? JSON.stringify(activeLog.old_data, null, 2)
                          : '<null> (Row was newly inserted)'}
                      </pre>
                    </div>

                    {/* New Data */}
                    <div className="bg-black/50 p-4 rounded-xl border border-gray-800">
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        Post-Operation State (NEW Data)
                      </p>
                      <pre className="text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-60">
                        {activeLog.new_data
                          ? JSON.stringify(activeLog.new_data, null, 2)
                          : '<null> (Row was deleted)'}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
