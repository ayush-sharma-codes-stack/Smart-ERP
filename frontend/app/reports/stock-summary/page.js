'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { Package, Loader2, Printer } from 'lucide-react';
import ReportsSidebar from '../ReportsSidebar';

function groupByStockGroup(items) {
  const map = {};
  items.forEach(item => {
    const groupName = item.stock_group_name || 'Uncategorized';
    if (!map[groupName]) map[groupName] = [];
    map[groupName].push(item);
  });
  return map;
}

export default function StockSummaryPage() {
  const { apiCall, selectedCompany, loading } = useApp();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [fetching, setFetching] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!selectedCompany) return;
    setFetching(true);
    const res = await apiCall(`/reports/stock-summary?companyId=${selectedCompany.id}`);
    if (!res.error) setData(res.data);
    setFetching(false);
  }, [selectedCompany, apiCall]);

  useEffect(() => {
    if (!selectedCompany) { router.push('/companies'); return; }
    fetchReport();
  }, [selectedCompany, router, fetchReport]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-zinc-950"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>;

  const cur = selectedCompany?.currency_symbol || '₹';
  const groupedItems = data ? groupByStockGroup(data.items) : {};
  // Sort groups alphabetically, but put Uncategorized last
  const sortedGroups = Object.keys(groupedItems).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <ReportsSidebar companyName={selectedCompany?.name} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <Package size={20} className="text-orange-400" />
            <div>
              <h1 className="text-lg font-bold">Stock Summary</h1>
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
            <p className="text-zinc-600 text-center py-20">No data available.</p>
          ) : (
            <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
              {/* Statement Header */}
              <div className="px-6 py-5 border-b border-zinc-800 text-center bg-zinc-900/50">
                <h2 className="text-xl font-bold text-zinc-100 uppercase tracking-widest">STOCK SUMMARY</h2>
                <p className="text-sm text-zinc-400 mt-1">{data.company.name}</p>
                <p className="text-xs text-zinc-500 mt-1">As on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-900/80 text-zinc-400 text-[10px] uppercase tracking-widest border-b border-zinc-800">
                    <th className="text-left px-5 py-3 font-semibold">Stock Item</th>
                    <th className="text-left px-5 py-3 font-semibold">SKU / Code</th>
                    <th className="text-right px-5 py-3 font-semibold">Quantity</th>
                    <th className="text-left px-2 py-3 font-semibold">Unit</th>
                    <th className="text-right px-5 py-3 font-semibold">Rate ({cur})</th>
                    <th className="text-right px-5 py-3 font-semibold text-orange-300">Value ({cur})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {data.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-zinc-600 text-sm italic">No stock items found.</td>
                    </tr>
                  ) : (
                    sortedGroups.map(groupName => {
                      const items = groupedItems[groupName];
                      const groupValue = items.reduce((s, i) => s + parseFloat(i.stock_value || 0), 0);
                      
                      return (
                        <React.Fragment key={groupName}>
                          <tr className="bg-zinc-900/40 border-t border-zinc-800">
                            <td colSpan={5} className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-zinc-500">{groupName}</td>
                            <td className="px-5 py-2 text-right font-mono font-bold text-orange-400/70 text-xs">{groupValue.toFixed(2)}</td>
                          </tr>
                          {items.map(item => (
                            <tr key={item.id} className="hover:bg-zinc-800/20 transition group">
                              <td className="px-5 py-2.5 text-zinc-200 pl-8 font-medium">{item.name}</td>
                              <td className="px-5 py-2.5 text-zinc-500 font-mono text-xs">{item.sku || '—'}</td>
                              <td className="px-5 py-2.5 text-right font-mono text-zinc-300">
                                {parseFloat(item.quantity_on_hand).toFixed(3)}
                              </td>
                              <td className="px-2 py-2.5 text-left text-zinc-500 text-xs">{item.unit_symbol}</td>
                              <td className="px-5 py-2.5 text-right font-mono text-zinc-400">
                                {parseFloat(item.purchase_price).toFixed(2)}
                              </td>
                              <td className="px-5 py-2.5 text-right font-mono font-semibold text-orange-300">
                                {parseFloat(item.stock_value || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      )
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-zinc-700 bg-zinc-900">
                    <td colSpan={5} className="px-5 py-4 font-bold text-right text-zinc-200 text-xs uppercase tracking-widest">Grand Total Value</td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-orange-400 text-lg">
                      {cur}{data.totalValue.toFixed(2)}
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
