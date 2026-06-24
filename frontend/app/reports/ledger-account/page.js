'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2, Printer, Search } from 'lucide-react';
import ReportsSidebar from '../ReportsSidebar';

export default function LedgerAccountPage() {
  const { apiCall, selectedCompany, loading } = useApp();
  const router = useRouter();

  const [ledgers, setLedgers] = useState([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState('');
  
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];
  
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(todayStr);

  const [data, setData] = useState(null);
  const [fetching, setFetching] = useState(false);

  // Fetch all ledgers for the dropdown
  useEffect(() => {
    if (!selectedCompany) return;
    const fetchLedgers = async () => {
      const res = await apiCall(`/ledgers?companyId=${selectedCompany.id}`);
      if (!res.error) setLedgers(res.data);
    };
    fetchLedgers();
  }, [selectedCompany, apiCall]);

  const fetchReport = useCallback(async () => {
    if (!selectedCompany || !selectedLedgerId) return;
    setFetching(true);
    let url = `/reports/ledger-account?companyId=${selectedCompany.id}&ledgerId=${selectedLedgerId}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;
    const res = await apiCall(url);
    if (!res.error) setData(res.data);
    else setData(null);
    setFetching(false);
  }, [selectedCompany, selectedLedgerId, from, to, apiCall]);

  // Auto-fetch when ledger is selected
  useEffect(() => {
    if (selectedLedgerId) fetchReport();
  }, [selectedLedgerId, fetchReport]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-zinc-950"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>;

  const cur = selectedCompany?.currency_symbol || '₹';

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <ReportsSidebar companyName={selectedCompany?.name} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-purple-400" />
            <div>
              <h1 className="text-lg font-bold">Ledger Account Statement</h1>
              <p className="text-xs text-zinc-500">{selectedCompany?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchReport} disabled={!selectedLedgerId} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition disabled:opacity-50">Refresh</button>
            <button onClick={() => window.print()} disabled={!data} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition disabled:opacity-50">
              <Printer size={13} /> Print
            </button>
          </div>
        </header>

        {/* Filters Panel */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/10 flex-wrap">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Account:</label>
            <select
              value={selectedLedgerId}
              onChange={e => setSelectedLedgerId(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500"
            >
              <option value="">-- Select Ledger --</option>
              {ledgers.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.group_name})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">From:</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-sm text-zinc-300 focus:outline-none focus:border-purple-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">To:</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-sm text-zinc-300 focus:outline-none focus:border-purple-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!selectedLedgerId ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600">
              <BookOpen size={48} className="mb-4 opacity-20" />
              <p>Select a ledger account to view its statement</p>
            </div>
          ) : fetching ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-purple-500" size={24} /></div>
          ) : !data ? (
            <p className="text-zinc-600 text-center py-20">No data available.</p>
          ) : (
            <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
              {/* Statement Header */}
              <div className="px-6 py-5 border-b border-zinc-800 text-center bg-zinc-900/50">
                <h2 className="text-xl font-bold text-zinc-100 uppercase tracking-widest">{data.ledger.name}</h2>
                <p className="text-sm text-zinc-400 mt-1">{data.ledger.group_name} ({data.ledger.nature})</p>
                <p className="text-xs text-zinc-500 mt-1">Period: {new Date(from).toLocaleDateString()} to {new Date(to).toLocaleDateString()}</p>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-900/80 text-zinc-400 text-[10px] uppercase tracking-widest border-b border-zinc-800">
                    <th className="text-left px-4 py-3 font-semibold">Date</th>
                    <th className="text-left px-4 py-3 font-semibold">Particulars</th>
                    <th className="text-left px-4 py-3 font-semibold">Vch Type</th>
                    <th className="text-left px-4 py-3 font-semibold">Vch No.</th>
                    <th className="text-right px-4 py-3 font-semibold text-blue-400">Debit</th>
                    <th className="text-right px-4 py-3 font-semibold text-emerald-400">Credit</th>
                    <th className="text-right px-4 py-3 font-semibold text-purple-400">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {/* Opening Balance */}
                  <tr className="bg-zinc-900/20 text-zinc-300">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{new Date(from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3 font-bold text-zinc-400 italic" colSpan={3}>Opening Balance</td>
                    <td className="px-4 py-3 text-right"></td>
                    <td className="px-4 py-3 text-right"></td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-purple-300">
                      {data.openingBalance >= 0 ? `${data.openingBalance.toFixed(2)} Dr` : `${Math.abs(data.openingBalance).toFixed(2)} Cr`}
                    </td>
                  </tr>

                  {/* Transactions */}
                  {data.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-zinc-600 text-sm italic">No transactions in this period.</td>
                    </tr>
                  ) : (
                    data.transactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/20 transition group">
                        <td className="px-4 py-2.5 font-mono text-xs text-zinc-400 whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-zinc-200 block">{tx.line_description || '—'}</span>
                          {tx.narration && <span className="text-[10px] text-zinc-600 truncate block max-w-xs">{tx.narration}</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[10px] uppercase font-bold text-zinc-500">{tx.voucher_type.replace('_', ' ')}</span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{tx.voucher_number}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-blue-300">
                          {parseFloat(tx.debit_amount) > 0 ? parseFloat(tx.debit_amount).toFixed(2) : ''}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-emerald-300">
                          {parseFloat(tx.credit_amount) > 0 ? parseFloat(tx.credit_amount).toFixed(2) : ''}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-purple-300">
                          {tx.running_balance >= 0 ? `${tx.running_balance.toFixed(2)} Dr` : `${Math.abs(tx.running_balance).toFixed(2)} Cr`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-700 bg-zinc-900/50">
                    <td colSpan={4} className="px-4 py-3 font-bold text-right text-zinc-400 text-xs uppercase tracking-widest">Current Total</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-400">{data.totalDr.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">{data.totalCr.toFixed(2)}</td>
                    <td className="px-4 py-3"></td>
                  </tr>
                  <tr className="border-t-2 border-zinc-700 bg-zinc-900">
                    <td colSpan={4} className="px-4 py-3 font-bold text-right text-zinc-200 text-xs uppercase tracking-widest">Closing Balance</td>
                    <td colSpan={3} className="px-4 py-3 text-right font-mono font-bold text-purple-400 text-base">
                      {data.closingBalance >= 0 ? `${data.closingBalance.toFixed(2)} Dr` : `${Math.abs(data.closingBalance).toFixed(2)} Cr`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
