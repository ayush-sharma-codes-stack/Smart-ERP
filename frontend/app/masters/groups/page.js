'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Layers, ArrowLeft, Loader2, ChevronRight } from 'lucide-react';

const NATURES = ['Assets', 'Liabilities', 'Income', 'Expenses'];

const NATURE_COLORS = {
  Assets: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  Liabilities: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  Income: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  Expenses: 'text-red-400 bg-red-400/10 border-red-400/30',
};

export default function GroupsMasterPage() {
  const { apiCall, selectedCompany, loading } = useApp();
  const router = useRouter();

  const [groups, setGroups] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  // Form state
  const [form, setForm] = useState({ name: '', nature: 'Assets', parentGroupId: '' });

  const fetchGroups = useCallback(async () => {
    if (!selectedCompany) return;
    setFetching(true);
    const res = await apiCall(`/groups?companyId=${selectedCompany.id}`);
    if (!res.error) setGroups(res.data);
    setFetching(false);
  }, [selectedCompany, apiCall]);

  useEffect(() => {
    if (!selectedCompany) {
      router.push('/companies');
      return;
    }
    fetchGroups();
  }, [selectedCompany, router, fetchGroups]);

  const openCreateForm = () => {
    setEditingGroup(null);
    setForm({ name: '', nature: 'Assets', parentGroupId: '' });
    setErrorMsg('');
    setShowForm(true);
  };

  const openEditForm = (group) => {
    setEditingGroup(group);
    setForm({
      name: group.name,
      nature: group.nature,
      parentGroupId: group.parent_group_id || '',
    });
    setErrorMsg('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErrorMsg('Group name is required'); return; }
    setErrorMsg('');
    setSubmitting(true);

    let res;
    if (editingGroup) {
      res = await apiCall(`/groups/${editingGroup.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: form.name, parentGroupId: form.parentGroupId || null }),
      });
    } else {
      res = await apiCall('/groups', {
        method: 'POST',
        body: JSON.stringify({
          companyId: selectedCompany.id,
          name: form.name,
          nature: form.nature,
          parentGroupId: form.parentGroupId || null,
        }),
      });
    }

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      await fetchGroups();
      setShowForm(false);
    }
    setSubmitting(false);
  };

  const handleDelete = async (group) => {
    if (group.is_system) {
      alert('System groups cannot be deleted.');
      return;
    }
    if (!confirm(`Delete group "${group.name}"? This cannot be undone.`)) return;
    const res = await apiCall(`/groups/${group.id}`, { method: 'DELETE' });
    if (res.error) {
      alert(res.error);
    } else {
      await fetchGroups();
    }
  };

  // Group by nature for display
  const grouped = NATURES.reduce((acc, nat) => {
    acc[nat] = groups.filter(g => g.nature === nat);
    return acc;
  }, {});

  // Only parent groups available as options (where nature matches)
  const parentOptions = groups.filter(
    g => g.nature === form.nature && (!editingGroup || g.id !== editingGroup.id) && !g.parent_group_id
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition"
          >
            <ArrowLeft size={15} /> Dashboard
          </button>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-600 px-2 mb-2">Masters</p>
          <button
            onClick={() => router.push('/masters/groups')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-semibold"
          >
            <Layers size={15} /> Groups
          </button>
          <button
            onClick={() => router.push('/masters/ledgers')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 text-sm transition"
          >
            <ChevronRight size={15} /> Ledgers
          </button>
          <button
            onClick={() => router.push('/masters/stock')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 text-sm transition"
          >
            <ChevronRight size={15} /> Stock Items
          </button>
        </nav>
        <div className="p-3 border-t border-zinc-800 text-xs text-zinc-600 truncate">
          {selectedCompany?.name}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <Layers size={20} className="text-emerald-400" />
            <div>
              <h1 className="text-lg font-bold text-zinc-100">Groups Master</h1>
              <p className="text-xs text-zinc-500">Chart of Accounts — {groups.length} groups</p>
            </div>
          </div>
          <button
            onClick={openCreateForm}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition cursor-pointer"
          >
            <Plus size={15} /> New Group
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Groups List */}
          <div className="flex-1 overflow-y-auto p-6">
            {fetching ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin text-emerald-500" size={24} />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {NATURES.map(nature => (
                  <div key={nature} className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                      <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded border ${NATURE_COLORS[nature]}`}>
                        {nature}
                      </span>
                      <span className="text-xs text-zinc-500">{grouped[nature].length} groups</span>
                    </div>
                    <div className="divide-y divide-zinc-800/50">
                      {grouped[nature].length === 0 ? (
                        <p className="text-xs text-zinc-600 text-center py-6">No groups yet</p>
                      ) : (
                        grouped[nature].map(group => (
                          <div
                            key={group.id}
                            className="group flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition"
                          >
                            <div>
                              <p className="text-sm font-medium text-zinc-200">{group.name}</p>
                              {group.parent_name && (
                                <p className="text-xs text-zinc-500 mt-0.5">↳ under {group.parent_name}</p>
                              )}
                              {group.is_system && (
                                <span className="text-[10px] text-zinc-600 font-semibold uppercase">System</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              {!group.is_system && (
                                <>
                                  <button
                                    onClick={() => openEditForm(group)}
                                    className="p-1.5 text-zinc-500 hover:text-emerald-400 rounded transition"
                                    title="Edit"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(group)}
                                    className="p-1.5 text-zinc-500 hover:text-red-400 rounded transition"
                                    title="Delete"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Slide-in Form */}
          {showForm && (
            <div className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-900/50 p-5 overflow-y-auto">
              <h2 className="text-base font-bold text-zinc-200 mb-4">
                {editingGroup ? 'Alter Group' : 'Create Group'}
              </h2>

              {errorMsg && (
                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="e.g. Office Equipment"
                    autoFocus
                    disabled={submitting}
                  />
                </div>

                {!editingGroup && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      Nature *
                    </label>
                    <select
                      value={form.nature}
                      onChange={e => setForm(f => ({ ...f, nature: e.target.value, parentGroupId: '' }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                      disabled={submitting}
                    >
                      {NATURES.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Under (Parent Group)
                  </label>
                  <select
                    value={form.parentGroupId}
                    onChange={e => setForm(f => ({ ...f, parentGroupId: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                    disabled={submitting}
                  >
                    <option value="">(Primary / Top Level)</option>
                    {parentOptions.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={15} /> : (editingGroup ? 'Save Changes' : 'Create Group')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition cursor-pointer"
                  >
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
