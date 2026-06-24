'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Loader2, Trash2, Eye, Plus, Filter } from 'lucide-react';

const VOUCHER_TYPES = ['sales', 'purchase', 'receipt', 'payment', 'journal', 'contra', 'credit_note', 'debit_note'];

const TYPE_COLORS = {
  sales:       'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  purchase:    'text-orange-400 bg-orange-400/10 border-orange-400/30',
  receipt:     'text-blue-400 bg-blue-400/10 border-blue-400/30',
  payment:     'text-red-400 bg-red-400/10 border-red-400/30',
  journal:     'text-purple-400 bg-purple-400/10 border-purple-400/30',
  contra:      'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  credit_note: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  debit_note:  'text-pink-400 bg-pink-400/10 border-pink-400/30',
};

export default function VoucherListPage() {
  const { apiCall, selectedCompany, loading } = useApp();
  const router = useRouter();

  const [vouchers, setVouchers] = useState([]);
  const [fetching, setFetching] = useState(false);

  // Filters
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [from, setFrom]       = useState(firstOfMonth);
  const [to, setTo]           = useState(todayStr);
  const [typeFilter, setTypeFilter] = useState('');

  // Detail modal
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [voucherDetail, setVoucherDetail]     = useState(null);
  const [loadingDetail, setLoadingDetail]     = useState(false);

  const fetchVouchers = useCallback(async () => {
    if (!selectedCompany) return;
    setFetching(true);
    let url = `/vouchers?companyId=${selectedCompany.id}&from=${from}&to=${to}`;
    if (typeFilter) url += `&type=${typeFilter}`;
    const res = await apiCall(url);
    if (!res.error) setVouchers(res.data);
    setFetching(false);
  }, [selectedCompany, apiCall, from, to, typeFilter]);

  useEffect(() => {
    if (!selectedCompany) { router.push('/companies'); return; }
    fetchVouchers();
  }, [selectedCompany, router, fetchVouchers]);

  const openDetail = async (voucher) => {
    setSelectedVoucher(voucher);
    setLoadingDetail(true);
    const res = await apiCall(`/vouchers/${voucher.id}`);
    if (!res.error) setVoucherDetail(res.data);
    setLoadingDetail(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this voucher? This will reverse all ledger entries.')) return;
    const res = await apiCall(`/vouchers/${id}`, { method: 'DELETE' });
    if (res.error) alert(res.error);
    else {
      setSelectedVoucher(null);
      setVoucherDetail(null);
      await fetchVouchers();
    }
  };

  const totalAmount = vouchers.reduce((s, v) => s + parseFloat(v.total_amount || 0), 0);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <Loader2 className="animate-spin text-emerald-500" size={32} />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition">
              <ArrowLeft size={15} /> Dashboard
            </button>
            <span className="text-zinc-700">|</span>
            <FileText size={18} className="text-emerald-400" />
            <div>
              <h1 className="text-base font-bold text-zinc-100">Voucher Register</h1>
              <p className="text-xs text-zinc-500">{vouchers.length} entries · Total: ₹{totalAmount.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/transactions/vouchers/sales')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs transition"
            >
              <Plus size={13} /> New Voucher
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/10 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-zinc-500" />
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Filters:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">From:</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">To:</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">Type:</label>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500">
              <option value="">All Types</option>
              {VOUCHER_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>
          <button onClick={fetchVouchers}
            className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition">
            Apply
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Voucher List */}
          <div className="flex-1 overflow-y-auto">
            {fetching ? (
              <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-emerald-500" size={24} /></div>
            ) : vouchers.length === 0 ? (
              <div className="text-center py-20 text-zinc-600">
                <FileText className="mx-auto mb-3" size={40} />
                <p className="font-semibold text-zinc-500">No vouchers in this period</p>
                <button onClick={() => router.push('/transactions/vouchers/sales')}
                  className="mt-3 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition">
                  Create First Voucher
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-zinc-900 text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-800">
                    <th className="text-left px-4 py-3 font-semibold">Date</th>
                    <th className="text-left px-4 py-3 font-semibold">Voucher No</th>
                    <th className="text-left px-4 py-3 font-semibold">Type</th>
                    <th className="text-left px-4 py-3 font-semibold">Party</th>
                    <th className="text-left px-4 py-3 font-semibold">Narration</th>
                    <th className="text-right px-4 py-3 font-semibold">Amount</th>
                    <th className="text-right px-4 py-3 font-semibold w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {vouchers.map(v => (
                    <tr
                      key={v.id}
                      onClick={() => openDetail(v)}
                      className={`group cursor-pointer transition ${selectedVoucher?.id === v.id ? 'bg-zinc-800/40' : 'hover:bg-zinc-800/20'}`}
                    >
                      <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                        {new Date(v.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-zinc-200 text-xs">{v.voucher_number}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${TYPE_COLORS[v.voucher_type] || 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30'}`}>
                          {v.voucher_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{v.party_name || '—'}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs truncate max-w-xs">{v.narration || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-zinc-200">
                        ₹{parseFloat(v.total_amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => { e.stopPropagation(); openDetail(v); }}
                            className="p-1.5 text-zinc-600 hover:text-emerald-400 transition" title="View">
                            <Eye size={13} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }}
                            className="p-1.5 text-zinc-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail Panel */}
          {selectedVoucher && (
            <div className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-900/30 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <span className="text-sm font-bold text-zinc-200">{selectedVoucher.voucher_number}</span>
                <button onClick={() => { setSelectedVoucher(null); setVoucherDetail(null); }}
                  className="text-zinc-500 hover:text-zinc-300 text-xs">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {loadingDetail ? (
                  <div className="flex items-center justify-center h-20"><Loader2 className="animate-spin text-emerald-500" size={18} /></div>
                ) : voucherDetail ? (
                  <>
                    <div className="space-y-2 text-xs mb-4">
                      <div className="flex justify-between"><span className="text-zinc-500">Date</span><span className="text-zinc-200">{new Date(voucherDetail.date).toLocaleDateString('en-IN')}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">Type</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${TYPE_COLORS[voucherDetail.voucher_type]}`}>
                          {voucherDetail.voucher_type.replace('_', ' ')}
                        </span>
                      </div>
                      {voucherDetail.party_name && <div className="flex justify-between"><span className="text-zinc-500">Party</span><span className="text-zinc-200">{voucherDetail.party_name}</span></div>}
                      {voucherDetail.reference_number && <div className="flex justify-between"><span className="text-zinc-500">Ref</span><span className="text-zinc-200 font-mono">{voucherDetail.reference_number}</span></div>}
                      {voucherDetail.narration && <div className="pt-1"><p className="text-zinc-500">Narration</p><p className="text-zinc-300 mt-0.5">{voucherDetail.narration}</p></div>}
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Ledger Entries</p>
                    <div className="rounded-lg border border-zinc-800 overflow-hidden mb-4">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-zinc-900 text-zinc-600 text-[10px]">
                            <th className="text-left px-2 py-2">Ledger</th>
                            <th className="text-right px-2 py-2">Dr</th>
                            <th className="text-right px-2 py-2">Cr</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {(voucherDetail.lineItems || []).map((l, i) => (
                            <tr key={i} className="hover:bg-zinc-800/20">
                              <td className="px-2 py-1.5 text-zinc-300">{l.ledger_name || '—'}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-blue-300">
                                {parseFloat(l.debit_amount) > 0 ? parseFloat(l.debit_amount).toFixed(2) : '—'}
                              </td>
                              <td className="px-2 py-1.5 text-right font-mono text-emerald-300">
                                {parseFloat(l.credit_amount) > 0 ? parseFloat(l.credit_amount).toFixed(2) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-zinc-900 font-bold border-t border-zinc-700">
                            <td className="px-2 py-2 text-zinc-500">Total</td>
                            <td className="px-2 py-2 text-right font-mono text-blue-300">
                              {(voucherDetail.lineItems || []).reduce((s, l) => s + parseFloat(l.debit_amount || 0), 0).toFixed(2)}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-emerald-300">
                              {(voucherDetail.lineItems || []).reduce((s, l) => s + parseFloat(l.credit_amount || 0), 0).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <button
                      onClick={() => handleDelete(voucherDetail.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition"
                    >
                      <Trash2 size={12} /> Delete & Reverse Entries
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
