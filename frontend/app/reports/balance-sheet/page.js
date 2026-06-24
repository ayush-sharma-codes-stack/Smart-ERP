'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { TrendingUp, Loader2, Printer } from 'lucide-react';
import ReportsSidebar from '../ReportsSidebar';

function groupByGroupName(rows) {
  const map = {};
  rows.forEach(r => {
    if (!map[r.group_name]) map[r.group_name] = [];
    map[r.group_name].push(r);
  });
  return map;
}

export default function BalanceSheetPage() {
  const { apiCall, selectedCompany, loading } = useApp();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [fetching, setFetching] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!selectedCompany) return;
    setFetching(true);
    const res = await apiCall(`/reports/balance-sheet?companyId=${selectedCompany.id}`);
    if (!res.error) setData(res.data);
    setFetching(false);
  }, [selectedCompany, apiCall]);

  useEffect(() => {
    if (!selectedCompany) { router.push('/companies'); return; }
    fetchReport();
  }, [selectedCompany, router, fetchReport]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-zinc-950"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>;

  const assetGroups = data ? groupByGroupName(data.assets) : {};
  const liabilityGroups = data ? groupByGroupName(data.liabilities) : {};
  const cur = selectedCompany?.currency_symbol || '₹';

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <ReportsSidebar companyName={selectedCompany?.name} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-blue-400" />
            <div>
              <h1 className="text-lg font-bold">Balance Sheet</h1>
              <p className="text-xs text-zinc-500">{selectedCompany?.name} · As of today</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchReport} className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition">Refresh</button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition">
              <Printer size={13} /> Print
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {fetching ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-emerald-500" size={24} /></div>
          ) : !data ? (
            <p className="text-zinc-600 text-center py-20">No data available</p>
          ) : (
            <>
              {/* Report Header */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-zinc-100">BALANCE SHEET</h2>
                <p className="text-sm text-zinc-400 mt-1">{data.company.name}</p>
                <p className="text-xs text-zinc-600 mt-0.5">As on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>

              {/* Two-column Tally-style layout */}
              <div className="grid grid-cols-2 gap-4">
                {/* Liabilities Side (Cr) */}
                <div className="rounded-xl border border-purple-800/40 overflow-hidden">
                  <div className="bg-purple-500/10 px-4 py-3 border-b border-purple-800/40 flex justify-between items-center">
                    <span className="text-sm font-bold text-purple-300 uppercase tracking-wide">Liabilities</span>
                    <span className="text-xs text-zinc-500">Capital & Obligations</span>
                  </div>

                  {/* Net Profit (transferred from P&L) */}
                  {data.netProfit !== 0 && (
                    <div className="border-b border-zinc-800/50">
                      <div className="px-4 py-2 bg-zinc-900/30 text-xs font-bold uppercase tracking-wider text-zinc-500">Profit & Loss A/c</div>
                      <div className="px-4 py-2.5 flex justify-between items-center">
                        <span className="text-sm text-zinc-300">Net {data.netProfit >= 0 ? 'Profit' : 'Loss'}</span>
                        <span className={`font-mono font-bold text-sm ${data.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {cur}{Math.abs(data.netProfit).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {Object.entries(liabilityGroups).map(([groupName, items]) => {
                    const groupTotal = items.reduce((s, i) => s + parseFloat(i.current_balance), 0);
                    return (
                      <div key={groupName} className="border-b border-zinc-800/40">
                        <div className="px-4 py-2 bg-zinc-900/30 flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{groupName}</span>
                          <span className="font-mono text-xs font-bold text-purple-300">{cur}{groupTotal.toFixed(2)}</span>
                        </div>
                        {items.map(l => (
                          <div key={l.ledger_id} className="px-4 py-2 flex justify-between items-center hover:bg-zinc-800/20 transition pl-8">
                            <span className="text-sm text-zinc-300">{l.ledger_name}</span>
                            <span className="font-mono text-sm text-zinc-400">{cur}{parseFloat(l.current_balance).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {/* Total Liabilities */}
                  <div className="px-4 py-3 bg-zinc-900/60 border-t border-purple-700/40 flex justify-between font-bold">
                    <span className="text-purple-300">Total Liabilities</span>
                    <span className="font-mono text-purple-300 text-base">
                      {cur}{(data.totalLiabilities + (data.netProfit >= 0 ? data.netProfit : 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Assets Side (Dr) */}
                <div className="rounded-xl border border-blue-800/40 overflow-hidden">
                  <div className="bg-blue-500/10 px-4 py-3 border-b border-blue-800/40 flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-300 uppercase tracking-wide">Assets</span>
                    <span className="text-xs text-zinc-500">Resources Owned</span>
                  </div>

                  {Object.entries(assetGroups).map(([groupName, items]) => {
                    const groupTotal = items.reduce((s, i) => s + parseFloat(i.current_balance), 0);
                    return (
                      <div key={groupName} className="border-b border-zinc-800/40">
                        <div className="px-4 py-2 bg-zinc-900/30 flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{groupName}</span>
                          <span className="font-mono text-xs font-bold text-blue-300">{cur}{groupTotal.toFixed(2)}</span>
                        </div>
                        {items.map(l => (
                          <div key={l.ledger_id} className="px-4 py-2 flex justify-between items-center hover:bg-zinc-800/20 transition pl-8">
                            <span className="text-sm text-zinc-300">{l.ledger_name}</span>
                            <span className="font-mono text-sm text-zinc-400">{cur}{parseFloat(l.current_balance).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {/* Loss (if any, goes to asset side) */}
                  {data.netProfit < 0 && (
                    <div className="border-b border-zinc-800/50">
                      <div className="px-4 py-2 bg-zinc-900/30 text-xs font-bold uppercase tracking-wider text-zinc-500">Profit & Loss A/c</div>
                      <div className="px-4 py-2.5 flex justify-between items-center">
                        <span className="text-sm text-zinc-300">Net Loss</span>
                        <span className="font-mono font-bold text-sm text-red-400">{cur}{Math.abs(data.netProfit).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Total Assets */}
                  <div className="px-4 py-3 bg-zinc-900/60 border-t border-blue-700/40 flex justify-between font-bold">
                    <span className="text-blue-300">Total Assets</span>
                    <span className="font-mono text-blue-300 text-base">
                      {cur}{(data.totalAssets + (data.netProfit < 0 ? Math.abs(data.netProfit) : 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Profit Summary Bar */}
              <div className={`mt-4 rounded-xl border p-4 flex items-center justify-between ${data.netProfit >= 0 ? 'border-emerald-800/40 bg-emerald-500/5' : 'border-red-800/40 bg-red-500/5'}`}>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Profit & Loss Summary</p>
                  <p className="text-sm text-zinc-300 mt-1">
                    Total Income: <span className="text-emerald-400 font-mono">{cur}{data.totalIncome.toFixed(2)}</span>
                    &nbsp;— Total Expenses: <span className="text-red-400 font-mono">{cur}{data.totalExpenses.toFixed(2)}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">{data.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</p>
                  <p className={`text-2xl font-bold font-mono ${data.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {cur}{Math.abs(data.netProfit).toFixed(2)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
