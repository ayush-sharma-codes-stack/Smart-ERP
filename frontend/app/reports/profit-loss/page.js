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

export default function ProfitLossPage() {
  const { apiCall, selectedCompany, loading } = useApp();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [fetching, setFetching] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!selectedCompany) return;
    setFetching(true);
    const res = await apiCall(`/reports/profit-loss?companyId=${selectedCompany.id}`);
    if (!res.error) setData(res.data);
    setFetching(false);
  }, [selectedCompany, apiCall]);

  useEffect(() => {
    if (!selectedCompany) { router.push('/companies'); return; }
    fetchReport();
  }, [selectedCompany, router, fetchReport]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-zinc-950"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>;

  const incomeGroups  = data ? groupByGroupName(data.income)   : {};
  const expenseGroups = data ? groupByGroupName(data.expenses)  : {};
  const cur = selectedCompany?.currency_symbol || '₹';

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <ReportsSidebar companyName={selectedCompany?.name} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <TrendingUp size={20} className="text-emerald-400" />
            <div>
              <h1 className="text-lg font-bold">Profit & Loss</h1>
              <p className="text-xs text-zinc-500">{selectedCompany?.name} · Current period</p>
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
            <p className="text-zinc-600 text-center py-20">No data available. Post some vouchers first.</p>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-zinc-100">PROFIT & LOSS ACCOUNT</h2>
                <p className="text-sm text-zinc-400 mt-1">{data.company.name}</p>
                <p className="text-xs text-zinc-600 mt-0.5">For the period ending {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Expenditure / Losses (Left Side) */}
                <div className="rounded-xl border border-red-800/40 overflow-hidden">
                  <div className="bg-red-500/10 px-4 py-3 border-b border-red-800/40 flex justify-between">
                    <span className="text-sm font-bold text-red-300 uppercase tracking-wide">Expenditure</span>
                    <span className="font-mono font-bold text-red-300">{cur}{data.totalExpenses.toFixed(2)}</span>
                  </div>

                  {Object.entries(expenseGroups).map(([groupName, items]) => {
                    const groupTotal = items.reduce((s, i) => s + parseFloat(i.current_balance), 0);
                    return (
                      <div key={groupName} className="border-b border-zinc-800/40">
                        <div className="px-4 py-2 bg-zinc-900/30 flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{groupName}</span>
                          <span className="font-mono text-xs font-bold text-red-300">{cur}{groupTotal.toFixed(2)}</span>
                        </div>
                        {items.map((l, idx) => (
                          <div key={idx} className="px-4 py-2 flex justify-between hover:bg-zinc-800/20 transition pl-8">
                            <span className="text-sm text-zinc-300">{l.ledger_name}</span>
                            <span className="font-mono text-sm text-zinc-400">{cur}{parseFloat(l.current_balance).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {/* Net Profit goes to expenditure side */}
                  {data.netProfit >= 0 && (
                    <div className="px-4 py-3 bg-emerald-500/5 border-t border-emerald-700/40 flex justify-between font-bold">
                      <span className="text-emerald-300">Net Profit (c/o to Balance Sheet)</span>
                      <span className="font-mono text-emerald-300">{cur}{data.netProfit.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="px-4 py-3 bg-zinc-900/60 border-t border-red-700/40 flex justify-between font-bold">
                    <span className="text-red-300">Total</span>
                    <span className="font-mono text-red-300 text-base">{cur}{Math.max(data.totalExpenses, data.totalIncome).toFixed(2)}</span>
                  </div>
                </div>

                {/* Income / Gains (Right Side) */}
                <div className="rounded-xl border border-emerald-800/40 overflow-hidden">
                  <div className="bg-emerald-500/10 px-4 py-3 border-b border-emerald-800/40 flex justify-between">
                    <span className="text-sm font-bold text-emerald-300 uppercase tracking-wide">Income</span>
                    <span className="font-mono font-bold text-emerald-300">{cur}{data.totalIncome.toFixed(2)}</span>
                  </div>

                  {Object.entries(incomeGroups).map(([groupName, items]) => {
                    const groupTotal = items.reduce((s, i) => s + parseFloat(i.current_balance), 0);
                    return (
                      <div key={groupName} className="border-b border-zinc-800/40">
                        <div className="px-4 py-2 bg-zinc-900/30 flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{groupName}</span>
                          <span className="font-mono text-xs font-bold text-emerald-300">{cur}{groupTotal.toFixed(2)}</span>
                        </div>
                        {items.map((l, idx) => (
                          <div key={idx} className="px-4 py-2 flex justify-between hover:bg-zinc-800/20 transition pl-8">
                            <span className="text-sm text-zinc-300">{l.ledger_name}</span>
                            <span className="font-mono text-sm text-zinc-400">{cur}{parseFloat(l.current_balance).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {/* Net Loss goes to income side */}
                  {data.netProfit < 0 && (
                    <div className="px-4 py-3 bg-red-500/5 border-t border-red-700/40 flex justify-between font-bold">
                      <span className="text-red-300">Net Loss (c/o to Balance Sheet)</span>
                      <span className="font-mono text-red-300">{cur}{Math.abs(data.netProfit).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="px-4 py-3 bg-zinc-900/60 border-t border-emerald-700/40 flex justify-between font-bold">
                    <span className="text-emerald-300">Total</span>
                    <span className="font-mono text-emerald-300 text-base">{cur}{Math.max(data.totalExpenses, data.totalIncome).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Net Profit/Loss Banner */}
              <div className={`mt-4 rounded-xl p-5 flex items-center justify-between ${data.netProfit >= 0 ? 'bg-emerald-500/5 border border-emerald-700/40' : 'bg-red-500/5 border border-red-700/40'}`}>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Bottom Line</p>
                  <p className="text-lg font-bold text-zinc-100">{data.netProfit >= 0 ? '🎉 Profitable Period' : '📉 Loss-Making Period'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 mb-1">Net {data.netProfit >= 0 ? 'Profit' : 'Loss'}</p>
                  <p className={`text-3xl font-bold font-mono ${data.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
