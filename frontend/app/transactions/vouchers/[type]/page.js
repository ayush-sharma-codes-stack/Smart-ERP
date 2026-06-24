'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save, Loader2, CheckCircle, AlertCircle, Search } from 'lucide-react';

// ── Voucher type configuration ────────────────────────────────────────────────
const VOUCHER_CONFIG = {
  sales:    { label: 'Sales Voucher',    color: 'emerald', prefix: 'F8', defaultPartyType: 'customer', hint: 'Dr: Party/Customer  |  Cr: Sales A/c + Tax' },
  purchase: { label: 'Purchase Voucher', color: 'orange',  prefix: 'F9', defaultPartyType: 'supplier', hint: 'Dr: Purchase A/c + Tax  |  Cr: Party/Supplier' },
  receipt:  { label: 'Receipt Voucher',  color: 'blue',    prefix: 'F6', defaultPartyType: 'customer', hint: 'Dr: Bank/Cash  |  Cr: Party' },
  payment:  { label: 'Payment Voucher',  color: 'red',     prefix: 'F5', defaultPartyType: 'supplier', hint: 'Dr: Party/Expense  |  Cr: Bank/Cash' },
  journal:  { label: 'Journal Voucher',  color: 'purple',  prefix: 'F7', defaultPartyType: null,       hint: 'Free-form double-entry. Total Dr must equal total Cr.' },
  contra:   { label: 'Contra Voucher',   color: 'yellow',  prefix: 'F4', defaultPartyType: null,       hint: 'Cash ↔ Bank transfers only.' },
};

const COLOR_MAP = {
  emerald: { btn: 'bg-emerald-500 hover:bg-emerald-600', badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', ring: 'focus:ring-emerald-500 focus:border-emerald-500' },
  orange:  { btn: 'bg-orange-500 hover:bg-orange-600',   badge: 'text-orange-400 bg-orange-400/10 border-orange-400/30',   ring: 'focus:ring-orange-500 focus:border-orange-500' },
  blue:    { btn: 'bg-blue-500 hover:bg-blue-600',       badge: 'text-blue-400 bg-blue-400/10 border-blue-400/30',         ring: 'focus:ring-blue-500 focus:border-blue-500' },
  red:     { btn: 'bg-red-500 hover:bg-red-600',         badge: 'text-red-400 bg-red-400/10 border-red-400/30',           ring: 'focus:ring-red-500 focus:border-red-500' },
  purple:  { btn: 'bg-purple-500 hover:bg-purple-600',   badge: 'text-purple-400 bg-purple-400/10 border-purple-400/30',   ring: 'focus:ring-purple-500 focus:border-purple-500' },
  yellow:  { btn: 'bg-yellow-500 hover:bg-yellow-600',   badge: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',   ring: 'focus:ring-yellow-500 focus:border-yellow-500' },
};

const EMPTY_LINE = { ledgerId: '', ledgerName: '', debitAmount: '', creditAmount: '', description: '' };

// ── Ledger search dropdown ────────────────────────────────────────────────────
function LedgerSelect({ value, name, ledgers, onChange, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(name || '');
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setQ(name || ''); }, [name]);

  const filtered = ledgers.filter(l => l.name.toLowerCase().includes(q.toLowerCase())).slice(0, 12);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={q}
        placeholder={placeholder || 'Type to search ledger...'}
        className={`w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none ${className}`}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
          {filtered.map(l => (
            <div
              key={l.id}
              onMouseDown={() => { onChange(l); setQ(l.name); setOpen(false); }}
              className="px-3 py-2 text-xs hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer flex justify-between items-center"
            >
              <span className="font-medium text-zinc-200">{l.name}</span>
              <span className="text-zinc-500 ml-2">{l.group_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VoucherEntryPage() {
  const { apiCall, selectedCompany, loading } = useApp();
  const router = useRouter();
  const params = useParams();
  const vType = params.type;
  const config = VOUCHER_CONFIG[vType];
  const colors = COLOR_MAP[config?.color || 'emerald'];

  const [ledgers, setLedgers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form state
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [narration, setNarration] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [partyLedgerId, setPartyLedgerId] = useState('');
  const [partyLedgerName, setPartyLedgerName] = useState('');
  const [lines, setLines] = useState([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);

  // Computed balances
  const totalDr = lines.reduce((s, l) => s + (parseFloat(l.debitAmount) || 0), 0);
  const totalCr = lines.reduce((s, l) => s + (parseFloat(l.creditAmount) || 0), 0);
  const diff = Math.abs(totalDr - totalCr);
  const isBalanced = diff <= 0.01 && totalDr > 0;

  const fetchLedgers = useCallback(async () => {
    if (!selectedCompany) return;
    const res = await apiCall(`/ledgers?companyId=${selectedCompany.id}`);
    if (!res.error) setLedgers(res.data);
  }, [selectedCompany, apiCall]);

  useEffect(() => {
    if (!selectedCompany) { router.push('/companies'); return; }
    if (!config) { router.push('/dashboard'); return; }
    fetchLedgers();
  }, [selectedCompany, config, router, fetchLedgers]);

  // Keyboard shortcut: F2 = Save
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F2') { e.preventDefault(); handleSubmit(); }
      if (e.key === 'Escape') { router.push('/dashboard'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lines, date, narration, referenceNumber, partyLedgerId, isBalanced]);

  const addLine = () => setLines(l => [...l, { ...EMPTY_LINE }]);

  const removeLine = (idx) => {
    if (lines.length <= 1) return;
    setLines(l => l.filter((_, i) => i !== idx));
  };

  const updateLine = (idx, field, val) => {
    setLines(l => l.map((line, i) => i === idx ? { ...line, [field]: val } : line));
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!date) { setErrorMsg('Date is required'); return; }
    const validLines = lines.filter(l => l.ledgerId && (parseFloat(l.debitAmount) > 0 || parseFloat(l.creditAmount) > 0));
    if (validLines.length < 2) { setErrorMsg('At least 2 line items with ledgers and amounts are required'); return; }
    if (!isBalanced) { setErrorMsg(`Voucher is unbalanced. Difference: ₹${diff.toFixed(2)}`); return; }

    setSubmitting(true);
    const payload = {
      companyId: selectedCompany.id,
      voucherType: vType,
      date,
      narration,
      partyLedgerId: partyLedgerId || null,
      referenceNumber: referenceNumber || null,
      lineItems: validLines.map(l => ({
        ledgerId:     l.ledgerId,
        debitAmount:  parseFloat(l.debitAmount) || 0,
        creditAmount: parseFloat(l.creditAmount) || 0,
        description:  l.description || null,
      })),
    };

    const res = await apiCall('/vouchers', { method: 'POST', body: JSON.stringify(payload) });
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`✓ ${config.label} ${res.data.voucher.voucher_number} posted successfully!`);
      // Reset form for next entry
      setLines([{ ...EMPTY_LINE }, { ...EMPTY_LINE }]);
      setNarration('');
      setReferenceNumber('');
      setPartyLedgerId('');
      setPartyLedgerName('');
      setDate(today);
    }
    setSubmitting(false);
  };

  if (loading || !config) return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <Loader2 className="animate-spin text-emerald-500" size={32} />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 font-mono">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 transition">
            <ArrowLeft size={14} /> Dashboard
          </button>
          <span className="text-zinc-700">|</span>
          <span className={`font-bold px-2 py-0.5 rounded border text-xs ${colors.badge}`}>{config.label}</span>
          <span className="text-zinc-500">{selectedCompany?.name}</span>
        </div>
        <div className="text-zinc-500 font-sans">
          [F2] Save &nbsp;|&nbsp; [Esc] Cancel
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Entry Form */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Voucher Header */}
          <div className="px-6 pt-5 pb-4 border-b border-zinc-800 bg-zinc-900/20">
            <div className="flex items-start gap-6 flex-wrap">
              {/* Date */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              {/* Reference */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Ref / Cheque No</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  placeholder="Optional reference"
                  className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 w-48"
                />
              </div>
              {/* Party */}
              {config.defaultPartyType && (
                <div className="flex-1 min-w-48">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Party</label>
                  <div className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2">
                    <LedgerSelect
                      value={partyLedgerId}
                      name={partyLedgerName}
                      ledgers={ledgers}
                      onChange={l => { setPartyLedgerId(l.id); setPartyLedgerName(l.name); }}
                      placeholder="Search party..."
                    />
                  </div>
                </div>
              )}
              {/* Narration */}
              <div className="flex-1 min-w-56">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Narration</label>
                <input
                  type="text"
                  value={narration}
                  onChange={e => setNarration(e.target.value)}
                  placeholder="Brief description of the transaction..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="flex-1 overflow-y-auto px-6 pt-4">
            <p className="text-[10px] text-zinc-500 mb-3 uppercase tracking-widest">{config.hint}</p>

            {/* Messages */}
            {errorMsg && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                <AlertCircle size={16} /> {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-400">
                <CheckCircle size={16} /> {successMsg}
              </div>
            )}

            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-900 text-zinc-500 text-[10px] uppercase tracking-widest">
                    <th className="text-left px-3 py-3 w-8">#</th>
                    <th className="text-left px-3 py-3">Ledger Account</th>
                    <th className="text-left px-3 py-3 w-40">Description</th>
                    <th className="text-right px-3 py-3 w-32">Debit (Dr)</th>
                    <th className="text-right px-3 py-3 w-32">Credit (Cr)</th>
                    <th className="w-8 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/40 transition group">
                      <td className="px-3 py-2 text-zinc-600 text-xs">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <LedgerSelect
                          value={line.ledgerId}
                          name={line.ledgerName}
                          ledgers={ledgers}
                          onChange={l => {
                            setLines(prev => prev.map((ln, i) => i === idx ? { ...ln, ledgerId: l.id, ledgerName: l.name } : ln));
                          }}
                          className="border-b border-zinc-800 pb-0.5 w-full"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={line.description}
                          onChange={e => updateLine(idx, 'description', e.target.value)}
                          placeholder="Note..."
                          className="w-full bg-transparent text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none border-b border-zinc-800 pb-0.5"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={line.debitAmount}
                          onChange={e => { updateLine(idx, 'debitAmount', e.target.value); if (e.target.value) updateLine(idx, 'creditAmount', ''); }}
                          placeholder="0.00"
                          className="w-full bg-transparent text-right text-sm font-mono text-blue-300 placeholder-zinc-700 focus:outline-none border-b border-zinc-800 pb-0.5"
                          min="0" step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={line.creditAmount}
                          onChange={e => { updateLine(idx, 'creditAmount', e.target.value); if (e.target.value) updateLine(idx, 'debitAmount', ''); }}
                          placeholder="0.00"
                          className="w-full bg-transparent text-right text-sm font-mono text-emerald-300 placeholder-zinc-700 focus:outline-none border-b border-zinc-800 pb-0.5"
                          min="0" step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeLine(idx)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-900/50 border-t border-zinc-700">
                    <td colSpan={3} className="px-3 py-2">
                      <button onClick={addLine} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-emerald-400 transition">
                        <Plus size={12} /> Add Line
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-blue-300">
                      {totalDr.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-300">
                      {totalCr.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                  <tr className={`border-t ${isBalanced ? 'border-emerald-800 bg-emerald-500/5' : diff > 0 ? 'border-red-800 bg-red-500/5' : 'border-zinc-800'}`}>
                    <td colSpan={3} className="px-3 py-2 text-xs font-bold">
                      {isBalanced
                        ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle size={12} /> Balanced</span>
                        : diff > 0 ? <span className="text-red-400 flex items-center gap-1"><AlertCircle size={12} /> Difference: ₹{diff.toFixed(2)}</span>
                        : <span className="text-zinc-600">Enter amounts above</span>}
                    </td>
                    <td colSpan={3} className="px-3 py-2 text-right text-xs text-zinc-500">
                      {isBalanced ? 'Ready to post' : ''}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
            <button onClick={() => router.push('/transactions/vouchers/list')} className="text-xs text-zinc-500 hover:text-zinc-300 transition">
              View Voucher Register
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard')} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition">
                Cancel [Esc]
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !isBalanced}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg ${colors.btn} text-white font-bold text-sm transition disabled:opacity-40 cursor-pointer shadow-lg`}
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Post Voucher [F2]
              </button>
            </div>
          </div>
        </div>

        {/* Right: Voucher Shortcuts Panel */}
        <div className="w-48 shrink-0 border-l border-zinc-800 bg-zinc-900/30 p-4 flex flex-col gap-4 text-xs font-sans">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Switch Voucher</p>
            {Object.entries(VOUCHER_CONFIG).map(([type, cfg]) => (
              <button
                key={type}
                onClick={() => router.push(`/transactions/vouchers/${type}`)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left mb-0.5 transition ${
                  vType === type ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
                }`}
              >
                <span>{cfg.label.replace(' Voucher', '')}</span>
                <span className="text-zinc-600">{cfg.prefix}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-zinc-800 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Ledger Balance</p>
            <p className="text-zinc-600 text-[10px]">Hover a ledger to see its current balance.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
