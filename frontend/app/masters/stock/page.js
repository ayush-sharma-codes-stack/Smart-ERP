'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import {
  Plus, Edit2, Trash2, ShoppingBag, ArrowLeft, Loader2,
  ChevronRight, Layers, BookOpen, Search, Package, Settings
} from 'lucide-react';

const DEFAULT_ITEM_FORM = {
  stockGroupId: '', unitId: '', name: '', sku: '', description: '',
  purchasePrice: '0', sellingPrice: '0', gstPercent: '0', hsnCode: '',
};
const DEFAULT_UNIT_FORM = { name: '', symbol: '' };
const DEFAULT_GROUP_FORM = { name: '', parentStockGroupId: '' };

export default function StockMasterPage() {
  const { apiCall, selectedCompany, loading } = useApp();
  const router = useRouter();

  const [items, setItems]         = useState([]);
  const [units, setUnits]         = useState([]);
  const [stockGroups, setStockGroups] = useState([]);
  const [fetching, setFetching]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg]   = useState('');
  const [search, setSearch]       = useState('');

  // Active panel: 'items' | 'units' | 'groups'
  const [activePanel, setActivePanel] = useState('items');

  // Item form
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem]   = useState(null);
  const [itemForm, setItemForm]         = useState(DEFAULT_ITEM_FORM);

  // Unit form
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [unitForm, setUnitForm]         = useState(DEFAULT_UNIT_FORM);

  // Stock Group form
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupForm, setGroupForm]         = useState(DEFAULT_GROUP_FORM);

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setFetching(true);
    const [iRes, uRes, gRes] = await Promise.all([
      apiCall(`/stock/items?companyId=${selectedCompany.id}`),
      apiCall(`/stock/units?companyId=${selectedCompany.id}`),
      apiCall(`/stock/stock-groups?companyId=${selectedCompany.id}`),
    ]);
    if (!iRes.error) setItems(iRes.data);
    if (!uRes.error) setUnits(uRes.data);
    if (!gRes.error) setStockGroups(gRes.data);
    setFetching(false);
  }, [selectedCompany, apiCall]);

  useEffect(() => {
    if (!selectedCompany) { router.push('/companies'); return; }
    fetchData();
  }, [selectedCompany, router, fetchData]);

  // ---- Item handlers ----
  const openCreateItem = () => {
    setEditingItem(null);
    setItemForm({ ...DEFAULT_ITEM_FORM, unitId: units[0]?.id || '' });
    setErrorMsg('');
    setShowItemForm(true);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      stockGroupId:  item.stock_group_id || '',
      unitId:        item.unit_id,
      name:          item.name,
      sku:           item.sku || '',
      description:   item.description || '',
      purchasePrice: String(item.purchase_price),
      sellingPrice:  String(item.selling_price),
      gstPercent:    String(item.gst_percent),
      hsnCode:       item.hsn_code || '',
    });
    setErrorMsg('');
    setShowItemForm(true);
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim()) { setErrorMsg('Item name is required'); return; }
    if (!itemForm.unitId)      { setErrorMsg('Unit is required'); return; }
    setErrorMsg('');
    setSubmitting(true);

    const payload = {
      companyId:     selectedCompany.id,
      stockGroupId:  itemForm.stockGroupId || null,
      unitId:        itemForm.unitId,
      name:          itemForm.name,
      sku:           itemForm.sku || null,
      description:   itemForm.description || null,
      purchasePrice: itemForm.purchasePrice,
      sellingPrice:  itemForm.sellingPrice,
      gstPercent:    itemForm.gstPercent,
      hsnCode:       itemForm.hsnCode || null,
    };

    const res = editingItem
      ? await apiCall(`/stock/items/${editingItem.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      : await apiCall('/stock/items', { method: 'POST', body: JSON.stringify(payload) });

    if (res.error) { setErrorMsg(res.error); }
    else { await fetchData(); setShowItemForm(false); }
    setSubmitting(false);
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`Delete "${item.name}"? If it has transactions it will be deactivated.`)) return;
    const res = await apiCall(`/stock/items/${item.id}`, { method: 'DELETE' });
    if (res.error) alert(res.error);
    else await fetchData();
  };

  // ---- Unit handlers ----
  const handleUnitSubmit = async (e) => {
    e.preventDefault();
    if (!unitForm.name || !unitForm.symbol) { setErrorMsg('Name and symbol are required'); return; }
    setErrorMsg('');
    setSubmitting(true);
    const res = await apiCall('/stock/units', {
      method: 'POST',
      body: JSON.stringify({ companyId: selectedCompany.id, ...unitForm }),
    });
    if (res.error) { setErrorMsg(res.error); }
    else { await fetchData(); setShowUnitForm(false); setUnitForm(DEFAULT_UNIT_FORM); }
    setSubmitting(false);
  };

  // ---- Stock Group handlers ----
  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    if (!groupForm.name) { setErrorMsg('Group name is required'); return; }
    setErrorMsg('');
    setSubmitting(true);
    const res = await apiCall('/stock/stock-groups', {
      method: 'POST',
      body: JSON.stringify({
        companyId: selectedCompany.id,
        name: groupForm.name,
        parentStockGroupId: groupForm.parentStockGroupId || null,
      }),
    });
    if (res.error) { setErrorMsg(res.error); }
    else { await fetchData(); setShowGroupForm(false); setGroupForm(DEFAULT_GROUP_FORM); }
    setSubmitting(false);
  };

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.sku || '').toLowerCase().includes(search.toLowerCase())
  );

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
          <button onClick={() => router.push('/masters/ledgers')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 text-sm transition">
            <BookOpen size={15} /> Ledgers
          </button>
          <button onClick={() => router.push('/masters/stock')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-semibold">
            <ShoppingBag size={15} /> Stock Items
          </button>
        </nav>
        <div className="p-3 border-t border-zinc-800 text-xs text-zinc-600 truncate">{selectedCompany?.name}</div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <ShoppingBag size={20} className="text-emerald-400" />
            <div>
              <h1 className="text-lg font-bold text-zinc-100">Stock Items Master</h1>
              <p className="text-xs text-zinc-500">{items.length} items · {units.length} units · {stockGroups.length} groups</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Sub-tab buttons */}
            <div className="flex rounded-lg border border-zinc-800 overflow-hidden text-xs font-semibold">
              {[['items', Package], ['units', Settings], ['groups', ChevronRight]].map(([tab, Icon]) => (
                <button
                  key={tab}
                  onClick={() => setActivePanel(tab)}
                  className={`flex items-center gap-1 px-3 py-2 transition capitalize ${activePanel === tab ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:bg-zinc-800'}`}
                >
                  <Icon size={12} /> {tab}
                </button>
              ))}
            </div>
            {activePanel === 'items' && (
              <>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search items..."
                    className="pl-7 pr-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none w-44" />
                </div>
                <button onClick={openCreateItem}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition cursor-pointer">
                  <Plus size={15} /> New Item
                </button>
              </>
            )}
            {activePanel === 'units' && (
              <button onClick={() => { setShowUnitForm(true); setErrorMsg(''); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition cursor-pointer">
                <Plus size={15} /> Add Unit
              </button>
            )}
            {activePanel === 'groups' && (
              <button onClick={() => { setShowGroupForm(true); setErrorMsg(''); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition cursor-pointer">
                <Plus size={15} /> Add Group
              </button>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {fetching ? (
              <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-emerald-500" size={24} /></div>
            ) : activePanel === 'items' ? (
              filteredItems.length === 0 ? (
                <div className="text-center py-20 text-zinc-600">
                  <ShoppingBag className="mx-auto mb-3" size={40} />
                  <p className="font-semibold text-zinc-500">{units.length === 0 ? 'Create a Unit first before adding stock items' : 'No stock items yet'}</p>
                  {units.length === 0 && (
                    <button onClick={() => setActivePanel('units')} className="mt-3 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition">
                      Add Unit of Measure
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-900/50 text-zinc-500 text-xs uppercase tracking-wider">
                        <th className="text-left px-4 py-3 font-semibold">Name / SKU</th>
                        <th className="text-left px-4 py-3 font-semibold">Group</th>
                        <th className="text-left px-4 py-3 font-semibold">Unit</th>
                        <th className="text-right px-4 py-3 font-semibold">Purchase ₹</th>
                        <th className="text-right px-4 py-3 font-semibold">Selling ₹</th>
                        <th className="text-right px-4 py-3 font-semibold">GST%</th>
                        <th className="text-right px-4 py-3 font-semibold">Stock</th>
                        <th className="w-20 px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {filteredItems.map(item => (
                        <tr key={item.id} className="group hover:bg-zinc-800/20 transition">
                          <td className="px-4 py-3">
                            <p className="font-medium text-zinc-200">{item.name}</p>
                            {item.sku && <p className="text-xs text-zinc-500 font-mono">{item.sku}</p>}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">{item.stock_group_name || '—'}</td>
                          <td className="px-4 py-3 text-zinc-400">{item.unit_symbol}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-300">{Number(item.purchase_price).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-400">{Number(item.selling_price).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-zinc-400">{item.gst_percent}%</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-300">{Number(item.quantity_on_hand).toFixed(3)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button onClick={() => openEditItem(item)} className="p-1.5 text-zinc-500 hover:text-emerald-400 transition"><Edit2 size={13} /></button>
                              <button onClick={() => handleDeleteItem(item)} className="p-1.5 text-zinc-500 hover:text-red-400 transition"><Trash2 size={13} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : activePanel === 'units' ? (
              <div>
                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Units of Measure</h2>
                {showUnitForm && (
                  <form onSubmit={handleUnitSubmit} className="mb-6 p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 flex flex-wrap items-end gap-3">
                    {errorMsg && <div className="w-full text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">{errorMsg}</div>}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Unit Name</label>
                      <input type="text" value={unitForm.name} onChange={e => setUnitForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Pieces" className="rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none" autoFocus />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Symbol</label>
                      <input type="text" value={unitForm.symbol} onChange={e => setUnitForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                        placeholder="e.g. PCS" className="rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none w-28" maxLength={10} />
                    </div>
                    <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition disabled:opacity-50">
                      {submitting ? <Loader2 className="animate-spin" size={15} /> : 'Add Unit'}
                    </button>
                    <button type="button" onClick={() => setShowUnitForm(false)} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition">Cancel</button>
                  </form>
                )}
                <div className="rounded-xl border border-zinc-800 overflow-hidden">
                  {units.length === 0 ? (
                    <p className="text-center py-10 text-zinc-600 text-sm">No units yet. Add one above.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-zinc-900/50 text-zinc-500 text-xs uppercase tracking-wider">
                          <th className="text-left px-4 py-3 font-semibold">Name</th>
                          <th className="text-left px-4 py-3 font-semibold">Symbol</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {units.map(u => (
                          <tr key={u.id} className="hover:bg-zinc-800/20 transition">
                            <td className="px-4 py-3 text-zinc-200">{u.name}</td>
                            <td className="px-4 py-3 font-mono text-emerald-400">{u.symbol}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Stock Groups</h2>
                {showGroupForm && (
                  <form onSubmit={handleGroupSubmit} className="mb-6 p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 flex flex-wrap items-end gap-3">
                    {errorMsg && <div className="w-full text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">{errorMsg}</div>}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Group Name</label>
                      <input type="text" value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Electronics" className="rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none" autoFocus />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Parent Group</label>
                      <select value={groupForm.parentStockGroupId} onChange={e => setGroupForm(f => ({ ...f, parentStockGroupId: e.target.value }))}
                        className="rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none">
                        <option value="">(None — top level)</option>
                        {stockGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                    <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition disabled:opacity-50">
                      {submitting ? <Loader2 className="animate-spin" size={15} /> : 'Add Group'}
                    </button>
                    <button type="button" onClick={() => setShowGroupForm(false)} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition">Cancel</button>
                  </form>
                )}
                <div className="rounded-xl border border-zinc-800 overflow-hidden">
                  {stockGroups.length === 0 ? (
                    <p className="text-center py-10 text-zinc-600 text-sm">No stock groups yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-zinc-900/50 text-zinc-500 text-xs uppercase tracking-wider">
                          <th className="text-left px-4 py-3 font-semibold">Name</th>
                          <th className="text-left px-4 py-3 font-semibold">Parent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {stockGroups.map(g => (
                          <tr key={g.id} className="hover:bg-zinc-800/20 transition">
                            <td className="px-4 py-3 text-zinc-200">{g.name}</td>
                            <td className="px-4 py-3 text-zinc-400">{g.parent_name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Item Slide-in Form */}
          {showItemForm && (
            <div className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-900/50 p-5 overflow-y-auto">
              <h2 className="text-base font-bold text-zinc-200 mb-4">{editingItem ? 'Alter Stock Item' : 'Create Stock Item'}</h2>
              {errorMsg && <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">{errorMsg}</div>}
              <form onSubmit={handleItemSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Name *</label>
                  <input type="text" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. Laptop Dell XPS" autoFocus disabled={submitting} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">SKU</label>
                  <input type="text" value={itemForm.sku} onChange={e => setItemForm(f => ({ ...f, sku: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 font-mono placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                    placeholder="Optional product code" disabled={submitting} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Unit *</label>
                  <select value={itemForm.unitId} onChange={e => setItemForm(f => ({ ...f, unitId: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                    disabled={submitting}>
                    <option value="">— Select Unit —</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Stock Group</label>
                  <select value={itemForm.stockGroupId} onChange={e => setItemForm(f => ({ ...f, stockGroupId: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                    disabled={submitting}>
                    <option value="">— None —</option>
                    {stockGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Purchase ₹</label>
                    <input type="number" value={itemForm.purchasePrice} onChange={e => setItemForm(f => ({ ...f, purchasePrice: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                      step="0.01" min="0" disabled={submitting} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Selling ₹</label>
                    <input type="number" value={itemForm.sellingPrice} onChange={e => setItemForm(f => ({ ...f, sellingPrice: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                      step="0.01" min="0" disabled={submitting} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">GST %</label>
                    <select value={itemForm.gstPercent} onChange={e => setItemForm(f => ({ ...f, gstPercent: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                      disabled={submitting}>
                      {['0', '5', '12', '18', '28'].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">HSN Code</label>
                    <input type="text" value={itemForm.hsnCode} onChange={e => setItemForm(f => ({ ...f, hsnCode: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 font-mono focus:border-emerald-500 focus:outline-none"
                      placeholder="e.g. 8471" maxLength={8} disabled={submitting} />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition disabled:opacity-50 cursor-pointer">
                    {submitting ? <Loader2 className="animate-spin" size={15} /> : (editingItem ? 'Save Changes' : 'Create Item')}
                  </button>
                  <button type="button" onClick={() => setShowItemForm(false)}
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
