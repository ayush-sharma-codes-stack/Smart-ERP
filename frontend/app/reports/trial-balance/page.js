'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { Scale, Loader2, Printer } from 'lucide-react';
import ReportsSidebar from '../ReportsSidebar';

const NATURE_ORDER = ['Assets', 'Liabilities', 'Income', 'Expenses'];

export default function TrialBalancePage() {
  const { apiCall, selectedCompany, loading } = useApp();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [fetching, setFetching] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!selectedCompany) return;
    setFetching(true);
    const res = await apiCall(`/reports/trial-balance?companyId=${selectedCompany.id}`);
    if (!res.error) setData(res.data);
    setFetching(false);
  }, [selectedCompany, apiCall]);

  useEffect(() => {
    if (!selectedCompany) { router.push('/companies'); return; }
    fetchReport();
  }, [selectedCompany, router, fetchReport]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-zinc-950"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>;

  // Group ledgers by nature
  const byNature = {};
  NATURE_ORDER.forEach(n => { byNature[n] = []; });
  (data?.ledgers || []).forEach(l => { if (byNature[l.nature]) byNature[l.nature].push(l); });

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <ReportsSidebar companyName={selectedCompany?.name} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <Scale size={20} className="text-emerald-400" />
            <div>
              <h1 className="text-lg font-bold">Trial Balance</h1>
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
            <div className="rounded-xl border border-zinc-800 overflow-x-auto">
              {/* Report Title Header */}
              <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-800 text-center">
                <h2 className="text-base font-bold text-zinc-200">TRIAL BALANCE</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{data.company.name}</p>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-900/70 text-zinc-400 text-xs uppercase tracking-widest border-b border-zinc-800">
                    <th className="text-left px-5 py-3 font-semibold">Particulars</th>
                    <th className="text-left px-5 py-3 font-semibold text-zinc-500">Group</th>
                    <th className="text-right px-5 py-3 font-semibold text-blue-400">Debit (Dr)</th>
                    <th className="text-right px-5 py-3 font-semibold text-emerald-400">Credit (Cr)</th>
                  </tr>
                </thead>
                <tbody>
                  {NATURE_ORDER.map(nature => {
                    const items = byNature[nature];
                    if (!items.length) return null;
                    const groupDr = items.reduce((s, i) => s + parseFloat(i.debit_balance), 0);
                    const groupCr = items.reduce((s, i) => s + parseFloat(i.credit_balance), 0);
                    return (
                      <React.Fragment key={nature}>
                        <tr className="bg-zinc-900/40 border-t border-zinc-800">
                          <td colSpan={4} className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{nature}</td>
                        </tr>
                        {items.map(ledger => (
                          <tr key={ledger.id} className="group hover:bg-zinc-800/20 border-t border-zinc-800/40 transition">
                            <td className="px-5 py-2.5 text-zinc-200 pl-8">{ledger.ledger_name}</td>
                            <td className="px-5 py-2.5 text-zinc-500 text-xs">{ledger.group_name}</td>
                            <td className="px-5 py-2.5 text-right font-mono text-blue-300">
                              {parseFloat(ledger.debit_balance) > 0 ? parseFloat(ledger.debit_balance).toFixed(2) : '—'}
                            </td>
                            <td className="px-5 py-2.5 text-right font-mono text-emerald-300">
                              {parseFloat(ledger.credit_balance) > 0 ? parseFloat(ledger.credit_balance).toFixed(2) : '—'}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-zinc-700 bg-zinc-900/20">
                          <td colSpan={2} className="px-5 py-2 text-xs text-zinc-500 pl-8">Sub-total — {nature}</td>
                          <td className="px-5 py-2 text-right font-mono font-bold text-blue-300 text-xs">{groupDr > 0 ? groupDr.toFixed(2) : '—'}</td>
                          <td className="px-5 py-2 text-right font-mono font-bold text-emerald-300 text-xs">{groupCr > 0 ? groupCr.toFixed(2) : '—'}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-zinc-700 bg-zinc-900">
                    <td colSpan={2} className="px-5 py-3 font-bold text-zinc-200">TOTAL</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-blue-300 text-base">{data.totalDr.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold text-emerald-300 text-base">{data.totalCr.toFixed(2)}</td>
                  </tr>
                  {Math.abs(data.totalDr - data.totalCr) > 0.01 && (
                    <tr className="bg-red-500/5 border-t border-red-800">
                      <td colSpan={4} className="px-5 py-2 text-center text-xs text-red-400 font-bold">
                        ⚠ Trial Balance is unbalanced. Difference: {Math.abs(data.totalDr - data.totalCr).toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {Math.abs(data.totalDr - data.totalCr) <= 0.01 && data.totalDr > 0 && (
                    <tr className="bg-emerald-500/5 border-t border-emerald-800">
                      <td colSpan={4} className="px-5 py-2 text-center text-xs text-emerald-400 font-bold">
                        ✓ Trial Balance is balanced
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
