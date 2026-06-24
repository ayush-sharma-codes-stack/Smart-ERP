'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, BookOpen, ArrowLeft, Loader2, ChevronRight, Layers, Search } from 'lucide-react';

const LEDGER_TYPES = [
  'customer', 'supplier', 'bank', 'cash',
  'expense', 'income', 'stock', 'tax', 'capital', 'loan', 'other'
];

const TYPE_COLORS = {
  customer:  'bg-blue-400/10 text-blue-400 border-blue-400/30',
  supplier:  'bg-orange-400/10 text-orange-400 border-orange-400/30',
  bank:      'bg-cyan-400/10 text-cyan-400 border-cyan-400/30',
  cash:      'bg-emerald-400/10 text-emerald-400 border-emerald-400/30',
  expense:   'bg-red-400/10 text-red-400 border-red-400/30',
  income:    'bg-green-400/10 text-green-400 border-green-400/30',
  stock:     'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
  tax:       'bg-purple-400/10 text-purple-400 border-purple-400/30',
  capital:   'bg-indigo-400/10 text-indigo-400 border-indigo-400/30',
  loan:      'bg-pink-400/10 text-pink-400 border-pink-400/30',
  other:     'bg-zinc-400/10 text-zinc-400 border-zinc-400/30',
};

const DEFAULT_FORM = {
  groupId: '', name: '', ledgerType: 'expense',
  openingBalance: '0', gstin: '', pan: '',
  address: '', mobile: '', email: '',
  creditLimit: '', creditDays: '',
};

export default function LedgersMasterPage() {
  const { apiCall, selectedCompany, loading } = useApp();
  const router = useRouter();

  const [ledgers, setLedgers] = useState([]);
  const [groups, setGroups]   = useState([]);
  const [fetching, setFetching]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLedger, setEditingLedger] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setFetching(true);
    const [lRes, gRes] = await Promise.all([
      apiCall(`/ledgers?companyId=${selectedCompany.id}`),
      apiCall(`/groups?companyId=${selectedCompany.id}`),
    ]);
    if (!lRes.error) setLedgers(lRes.data);
    if (!gRes.error) setGroups(gRes.data);
    setFetching(false);
  }, [selectedCompany, apiCall]);

  useEffect(() => {
    if (!selectedCompany) { router.push('/companies'); return; }
    fetchData();
  }, [selectedCompany, router, fetchData]);

  const openCreateForm = () => {
    setEditingLedger(null);
    setForm(DEFAULT_FORM);
    setErrorMsg('');
    setShowForm(true);
  };

  const openEditForm = (ledger) => {
    setEditingLedger(ledger);
    setForm({
      groupId:        ledger.group_id,
      name:           ledger.name,
      ledgerType:     ledger.ledger_type,
      openingBalance: String(ledger.opening_balance || '0'),
      gstin:          ledger.gstin || '',
      pan:            ledger.pan || '',
      address:        ledger.address || '',
      mobile:         ledger.mobile || '',
      email:          ledger.email || '',
      creditLimit:    ledger.credit_limit || '',
      creditDays:     ledger.credit_days || '',
    });
    setErrorMsg('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())    { setErrorMsg('Name is required'); return; }
    if (!form.groupId)        { setErrorMsg('Group is required'); return; }
    if (!form.ledgerType)     { setErrorMsg('Ledger type is required'); return; }
    setErrorMsg('');
    setSubmitting(true);

    const payload = {
      companyId:      selectedCompany.id,
      groupId:        form.groupId,
      name:           form.name,
      ledgerType:     form.ledgerType,
      openingBalance: form.openingBalance,
      gstin:          form.gstin || null,
      pan:            form.pan || null,
      address:        form.address || null,
      mobile:         form.mobile || null,
      email:          form.email || null,
      creditLimit:    form.creditLimit || null,
      creditDays:     form.creditDays || null,
    };

    const res = editingLedger
      ? await apiCall(`/ledgers/${editingLedger.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      : await apiCall('/ledgers', { method: 'POST', body: JSON.stringify(payload) });

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      await fetchData();
      setShowForm(false);
    }
    setSubmitting(false);
  };

  const handleDelete = async (ledger) => {
    if (!confirm(`Delete ledger "${ledger.name}"? This cannot be undone.`)) return;
    const res = await apiCall(`/ledgers/${ledger.id}`, { method: 'DELETE' });
    if (res.error) alert(res.error);
    else await fetchData();
  };

  const filtered = ledgers.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.group_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Group ledgers by nature for display
  const byNature = {
    Assets:      filtered.filter(l => l.group_nature === 'Assets'),
    Liabilities: filtered.filter(l => l.group_nature === 'Liabilities'),
    Income:      filtered.filter(l => l.group_nature === 'Income'),
    Expenses:    filtered.filter(l => l.group_nature === 'Expenses'),
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <Loader2 className="animate-spin text-emerald-500" size={32} />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition">
            <ArrowLeft size={15} /> Dashboard
          </button>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-600 px-2 mb-2">Masters</p>
          <button onClick={() => router.push('/masters/groups')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 text-sm transition">
            <Layers size={15} /> Groups
          </button>
          <button onClick={() => router.push('/masters/ledgers')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-semibold">
            <BookOpen size={15} /> Ledgers
          </button>
          <button onClick={() => router.push('/masters/stock')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 text-sm transition">
            <ChevronRight size={15} /> Stock Items
          </button>
        </nav>
        <div className="p-3 border-t border-zinc-800 text-xs text-zinc-600 truncate">{selectedCompany?.name}</div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-emerald-400" />
            <div>
              <h1 className="text-lg font-bold text-zinc-100">Ledgers Master</h1>
              <p className="text-xs text-zinc-500">{ledgers.length} ledgers across all groups</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ledgers..."
                className="pl-8 pr-4 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none w-52"
              />
            </div>
            <button
              onClick={openCreateForm}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition cursor-pointer"
            >
              <Plus size={15} /> New Ledger
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Ledger List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {fetching ? (
              <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-emerald-500" size={24} /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-zinc-600">
                <BookOpen className="mx-auto mb-3" size={40} />
                <p className="font-semibold text-zinc-500">No ledgers found</p>
                <p className="text-sm mt-1">Create your first ledger using the button above</p>
              </div>
            ) : (
              Object.entries(byNature).map(([nature, items]) => items.length > 0 && (
                <div key={nature}>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">{nature}</h2>
                  <div className="rounded-xl border border-zinc-800 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-zinc-900/50 text-zinc-500 text-xs uppercase tracking-wider">
                          <th className="text-left px-4 py-3 font-semibold">Name</th>
                          <th className="text-left px-4 py-3 font-semibold">Group</th>
                          <th className="text-left px-4 py-3 font-semibold">Type</th>
                          <th className="text-right px-4 py-3 font-semibold">Opening Bal</th>
                          <th className="text-right px-4 py-3 font-semibold w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {items.map(ledger => (
                          <tr key={ledger.id} className="group hover:bg-zinc-800/20 transition">
                            <td className="px-4 py-3 font-medium text-zinc-200">{ledger.name}</td>
                            <td className="px-4 py-3 text-zinc-400">{ledger.group_name}</td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${TYPE_COLORS[ledger.ledger_type] || TYPE_COLORS.other}`}>
                                {ledger.ledger_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-zinc-300">
                              {selectedCompany?.currency_symbol}{Number(ledger.opening_balance).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={() => openEditForm(ledger)} className="p-1.5 text-zinc-500 hover:text-emerald-400 transition" title="Edit">
                                  <Edit2 size={13} />
                                </button>
                                <button onClick={() => handleDelete(ledger)} className="p-1.5 text-zinc-500 hover:text-red-400 transition" title="Delete">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Form Panel */}
          {showForm && (
            <div className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-900/50 p-5 overflow-y-auto">
              <h2 className="text-base font-bold text-zinc-200 mb-4">
                {editingLedger ? 'Alter Ledger' : 'Create Ledger'}
              </h2>

              {errorMsg && (
                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">{errorMsg}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. State Bank of India" autoFocus disabled={submitting} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Under (Group) *</label>
                  <select value={form.groupId} onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                    disabled={submitting}>
                    <option value="">— Select Group —</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.nature})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Ledger Type *</label>
                  <select value={form.ledgerType} onChange={e => setForm(f => ({ ...f, ledgerType: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                    disabled={submitting}>
                    {LEDGER_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Opening Balance</label>
                  <input type="number" value={form.openingBalance} onChange={e => setForm(f => ({ ...f, openingBalance: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                    step="0.01" disabled={submitting} />
                </div>

                <hr className="border-zinc-800 my-2" />
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Optional Details</p>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">GSTIN</label>
                  <input type="text" value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 font-mono focus:border-emerald-500 focus:outline-none"
                    placeholder="15-char GSTIN" maxLength={15} disabled={submitting} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Mobile</label>
                    <input type="text" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                      placeholder="Phone" disabled={submitting} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Credit Days</label>
                    <input type="number" value={form.creditDays} onChange={e => setForm(f => ({ ...f, creditDays: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                      placeholder="0" disabled={submitting} />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition disabled:opacity-50 cursor-pointer">
                    {submitting ? <Loader2 className="animate-spin" size={15} /> : (editingLedger ? 'Save Changes' : 'Create Ledger')}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition cursor-pointer">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
