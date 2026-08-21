'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Plus, Trash2, Save, Loader2, CheckCircle, 
  AlertCircle, Search, UserPlus, FileText, ShoppingBag, Percent
} from 'lucide-react';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir', 'Ladakh'
];

const EMPTY_ROW = { stockItemId: '', itemName: '', quantity: '', rate: '', discountPercent: '0', gstPercent: '0', notes: '' };

// ── Searchable Autocomplete Select for Customers ─────────────────────────────
function CustomerSelect({ value, name, customers, onChange, onAddNew }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(name || '');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setQ(name || ''); }, [name]);

  const filtered = customers.filter(c => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 10);

  return (
    <div ref={ref} className="relative w-full">
      <div className="flex gap-2">
        <div className="relative flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 flex items-center">
          <input
            type="text"
            value={q}
            placeholder="Search/Select Customer..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none"
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            autoComplete="off"
          />
          <Search size={14} className="text-zinc-550 ml-1" />
        </div>
        <button
          type="button"
          onClick={onAddNew}
          className="px-3 rounded-lg border border-zinc-700 hover:border-emerald-500 bg-zinc-900 text-zinc-400 hover:text-emerald-400 transition"
          title="Create New Customer"
        >
          <UserPlus size={16} />
        </button>
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-3 text-xs text-zinc-600 text-center">No customers found</div>
          ) : (
            filtered.map(c => (
              <div
                key={c.id}
                onMouseDown={() => { onChange(c); setQ(c.name); setOpen(false); }}
                className="px-3 py-2 text-xs hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer flex justify-between items-center"
              >
                <span className="font-semibold text-zinc-200">{c.name}</span>
                <span className="text-zinc-500 text-[10px]">{c.mobile || 'No Phone'}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Searchable Autocomplete Select for Stock Items ───────────────────────────
function ItemSelect({ value, name, items, onChange, onAddNew, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(name || '');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setQ(name || ''); }, [name]);

  const filtered = items.filter(i => i.name && i.name.toLowerCase().includes(q.toLowerCase())).slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={q}
        placeholder={placeholder || 'Search item...'}
        className={`w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none ${className}`}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-3 text-xs text-zinc-500 text-center flex flex-col gap-2">
              <span>No items found</span>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAddNew(q);
                  setOpen(false);
                }}
                className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-450 font-bold rounded transition cursor-pointer text-[10px]"
              >
                + Register "{q || 'New Item'}"
              </button>
            </div>
          ) : (
            filtered.map(i => (
              <div
                key={i.id}
                onMouseDown={() => { onChange(i); setQ(i.name); setOpen(false); }}
                className="px-3 py-2 text-xs hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer flex flex-col gap-0.5"
              >
                <div className="font-semibold text-zinc-200 flex justify-between">
                  <span>{i.name}</span>
                  <span className="text-emerald-400 font-mono">₹{parseFloat(i.selling_price).toFixed(2)}</span>
                </div>
                <div className="text-[10px] text-zinc-550 flex justify-between">
                  <span>GST: {i.gst_percent}%</span>
                  <span>Stock: {parseFloat(i.quantity_on_hand).toFixed(0)} {i.unit_symbol}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function NewInvoicePage() {
  const { apiCall, selectedCompany, loading } = useApp();
  const router = useRouter();

  // Master Data
  const [customers, setCustomers] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [units, setUnits] = useState([]);

  // Form State
  const today = new Date().toISOString().split('T')[0];
  const [invoiceType, setInvoiceType] = useState('gst_invoice');
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [isInterstate, setIsInterstate] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [rows, setRows] = useState([{ ...EMPTY_ROW }]);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [newItemRowIndex, setNewItemRowIndex] = useState(null);

  // New Stock Item Form State
  const [newItem, setNewItem] = useState({
    name: '', unitId: '', sellingPrice: '0', gstPercent: '0'
  });

  // New Customer Form State
  const [newCust, setNewCust] = useState({
    name: '', mobile: '', email: '', gstin: '', pan: '',
    billingAddress: '', shippingAddress: '', city: '', state: '', pincode: '',
    creditLimit: '0', creditDays: '0'
  });

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    const [custRes, itemsRes, unitsRes] = await Promise.all([
      apiCall(`/customers?companyId=${selectedCompany.id}`),
      apiCall(`/stock/items?companyId=${selectedCompany.id}`),
      apiCall(`/stock/units?companyId=${selectedCompany.id}`)
    ]);

    if (!custRes.error) setCustomers(custRes.data);
    if (!itemsRes.error) setStockItems(itemsRes.data);
    if (!unitsRes.error) {
      setUnits(unitsRes.data);
      if (unitsRes.data.length > 0) {
        setNewItem(prev => ({ ...prev, unitId: unitsRes.data[0].id }));
      }
    }

    // Default place of supply to company state
    if (selectedCompany.state) {
      setPlaceOfSupply(selectedCompany.state);
    }
  }, [selectedCompany, apiCall]);

  useEffect(() => {
    if (!selectedCompany) { router.push('/companies'); return; }
    fetchData();
  }, [selectedCompany, router, fetchData]);

  // Adjust isInterstate automatically when place of supply matches company state
  useEffect(() => {
    if (selectedCompany && placeOfSupply) {
      const isInter = placeOfSupply.trim().toLowerCase() !== selectedCompany.state?.trim().toLowerCase();
      setIsInterstate(isInter);
    }
  }, [placeOfSupply, selectedCompany]);

  const addRow = () => setRows(prev => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (idx) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter((_, i) => i !== idx));
  };
  const updateRow = (idx, fieldOrFields, val) => {
    setRows(prev => prev.map((row, i) => {
      if (i !== idx) return row;
      if (typeof fieldOrFields === 'object') {
        // Batch update: fieldOrFields is a plain object of { field: value }
        return { ...row, ...fieldOrFields };
      }
      return { ...row, [fieldOrFields]: val };
    }));
  };

  // Dynamically calculate calculations
  let subtotal = 0;
  let totalDiscount = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let totalTax = 0;

  const calculatedRows = rows.map(row => {
    const qty = parseFloat(row.quantity) || 0;
    const rate = parseFloat(row.rate) || 0;
    const disc = parseFloat(row.discountPercent) || 0;
    const gstRate = parseFloat(row.gstPercent) || 0;

    const rowSubtotal = qty * rate;
    const rowDiscount = rowSubtotal * (disc / 100);
    const taxableValue = rowSubtotal - rowDiscount;

    let cgst = 0, sgst = 0, igst = 0;
    if (isInterstate) {
      igst = taxableValue * (gstRate / 100);
    } else {
      cgst = taxableValue * (gstRate / 200);
      sgst = taxableValue * (gstRate / 200);
    }

    const rowTotal = taxableValue + cgst + sgst + igst;

    subtotal += rowSubtotal;
    totalDiscount += rowDiscount;
    cgstTotal += cgst;
    sgstTotal += sgst;
    igstTotal += igst;
    totalTax += (cgst + sgst + igst);

    return {
      ...row,
      taxableValue,
      cgst,
      sgst,
      igst,
      rowTotal
    };
  });

  const rawGrandTotal = subtotal - totalDiscount + totalTax;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = grandTotal - rawGrandTotal;

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!newCust.name) { alert('Customer name is required'); return; }

    try {
      const res = await apiCall('/customers', {
        method: 'POST',
        body: JSON.stringify({ ...newCust, companyId: selectedCompany.id })
      });
      if (res.error) {
        alert(res.error);
      } else {
        setCustomers(prev => [...prev, res.data.customer]);
        setCustomer(res.data.customer);
        setIsCustomerModalOpen(false);
        // Reset
        setNewCust({
          name: '', mobile: '', email: '', gstin: '', pan: '',
          billingAddress: '', shippingAddress: '', city: '', state: '', pincode: '',
          creditLimit: '0', creditDays: '0'
        });
      }
    } catch (err) {
      alert('Failed to save customer.');
    }
  };

  const handleCreateStockItem = async (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) { alert('Item name is required'); return; }
    if (!newItem.unitId) { alert('Please select a unit of measure'); return; }

    try {
      const res = await apiCall('/stock/items', {
        method: 'POST',
        body: JSON.stringify({
          companyId: selectedCompany.id,
          name: newItem.name.trim(),
          unitId: newItem.unitId,
          sellingPrice: newItem.sellingPrice,
          gstPercent: newItem.gstPercent
        })
      });

      if (res.error) {
        alert(res.error);
      } else {
        // Refresh items list
        const updatedItemsRes = await apiCall(`/stock/items?companyId=${selectedCompany.id}`);
        if (!updatedItemsRes.error) {
          setStockItems(updatedItemsRes.data);
        }

        // Auto select newly created item for the row
        const createdItem = res.data.item;
        if (newItemRowIndex !== null) {
          updateRow(newItemRowIndex, {
            stockItemId: createdItem.id,
            itemName: createdItem.name,
            rate: String(createdItem.selling_price || 0),
            gstPercent: String(createdItem.gst_percent || 0)
          });
        }

        setIsItemModalOpen(false);
        setNewItem({ name: '', unitId: units[0]?.id || '', sellingPrice: '0', gstPercent: '0' });
      }
    } catch (err) {
      alert('Failed to save stock item.');
    }
  };

  const handlePostInvoice = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!customer) {
      setErrorMsg('Please select a customer from the dropdown. If the customer does not exist, click the "+" button next to the customer field to create them.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!invoiceDate) {
      setErrorMsg('Invoice date is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Try to resolve stockItemId by itemName if user typed but didn't click dropdown
    const resolvedRows = rows.map(row => {
      if (!row.stockItemId && row.itemName) {
        const match = stockItems.find(s => s.name && s.name.toLowerCase() === row.itemName.toLowerCase());
        if (match) return { ...row, stockItemId: match.id };
      }
      return row;
    });

    const hasIncompleteRow = rows.some(r => r.itemName && !r.stockItemId);
    const validRows = resolvedRows.filter(r => r.stockItemId && parseFloat(r.quantity) > 0 && parseFloat(r.rate) > 0);

    if (hasIncompleteRow && !validRows.length) {
      setErrorMsg('The entered stock item was not found. Please click and select it from the search dropdown.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!validRows.length) {
      setErrorMsg('Please select at least one valid stock item from the dropdown, and enter a quantity and rate.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    const payload = {
      companyId: selectedCompany.id,
      customerId: customer.id,
      invoiceType,
      invoiceDate,
      dueDate: dueDate || null,
      placeOfSupply,
      isInterstate,
      subtotal,
      discountAmount: totalDiscount,
      taxableAmount: subtotal - totalDiscount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      totalTax,
      roundOff,
      grandTotal,
      notes,
      termsConditions: terms,
      items: validRows.map(r => ({
        stockItemId: r.stockItemId,
        quantity: parseFloat(r.quantity),
        rate: parseFloat(r.rate),
        notes: r.notes || null
      }))
    };

    console.log('[Invoice] payload being sent:', JSON.stringify(payload));

    const res = await apiCall('/invoices', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res.error) {
      setErrorMsg(res.error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setSuccessMsg(`✓ Invoice ${res.data.invoice.invoice_number} generated successfully!`);
      // Reset form
      setCustomer(null);
      setRows([{ ...EMPTY_ROW }]);
      setNotes('');
      setTerms('');
      setInvoiceDate(today);
      setDueDate('');
      fetchData(); // reload quantities
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <Loader2 className="animate-spin text-emerald-500" size={32} />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 font-mono">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 gap-2 text-xs">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 transition">
            <ArrowLeft size={14} /> Dashboard
          </button>
          <span className="text-zinc-700 hidden sm:inline">|</span>
          <span className="font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded text-xs">Invoice System</span>
          <span className="text-zinc-500 truncate max-w-40 sm:max-w-none">{selectedCompany?.name}</span>
        </div>
        <div className="text-zinc-500 font-sans text-center sm:text-right">
          Double-entry bookkeeping and inventory stock-outs post automatically.
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Header section */}
          <div className="flex items-center gap-2 mb-2">
            <FileText className="text-emerald-400" size={24} />
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Create Sales Invoice</h1>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-400">
              <CheckCircle size={16} /> {successMsg}
            </div>
          )}

          {/* Form Card */}
          <div className="rounded-2xl border border-white/[0.05] bg-zinc-900/40 backdrop-blur-2xl p-4 sm:p-6 shadow-xl space-y-6">
            
            {/* Row 1: Customer and Supplies */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Customer *</label>
                <CustomerSelect
                  value={customer?.id || ''}
                  name={customer?.name || ''}
                  customers={customers}
                  onChange={c => setCustomer(c)}
                  onAddNew={() => setIsCustomerModalOpen(true)}
                />
                {customer && (
                  <div className="mt-2 text-[10px] text-zinc-450 space-y-0.5">
                    {customer.gstin && <p className="font-mono text-emerald-500/80">GSTIN: {customer.gstin}</p>}
                    {customer.billing_address && <p className="truncate">Addr: {customer.billing_address}</p>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Invoice Type</label>
                <select
                  value={invoiceType}
                  onChange={e => setInvoiceType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="gst_invoice">GST Tax Invoice</option>
                  <option value="proforma">Proforma Invoice</option>
                  <option value="quotation">Quotation</option>
                  <option value="estimate">Estimate / Bill of Supply</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Invoice Date *</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Location and Supply Rules */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2 border-t border-zinc-800">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Place of Supply (State)</label>
                <select
                  value={placeOfSupply}
                  onChange={e => setPlaceOfSupply(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select State...</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-zinc-200 select-none">
                  <input
                    type="checkbox"
                    checked={isInterstate}
                    onChange={e => setIsInterstate(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 focus:ring-opacity-25"
                  />
                  <span>Interstate Transaction (IGST)</span>
                </label>
              </div>
              <div className="text-[10px] text-zinc-500 flex flex-col justify-center sm:text-right">
                <span>Supply State: <strong>{placeOfSupply || 'N/A'}</strong></span>
                <span>Company Base State: <strong>{selectedCompany?.state || 'N/A'}</strong></span>
              </div>
            </div>

            {/* Items Table */}
            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-1 mb-2">
                <ShoppingBag size={14} className="text-zinc-400" />
                <h3 className="text-xs uppercase tracking-widest font-bold text-zinc-400">Line Items</h3>
              </div>
              
              <div className="rounded-xl border border-zinc-800 overflow-x-auto bg-zinc-950/20">
                <table className="w-full text-sm min-w-[850px]">
                  <thead>
                    <tr className="bg-zinc-900/80 text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-800">
                      <th className="text-left px-3 py-2.5 w-6">#</th>
                      <th className="text-left px-3 py-2.5 w-64">Stock Item</th>
                      <th className="text-right px-3 py-2.5 w-24">Qty</th>
                      <th className="text-right px-3 py-2.5 w-28">Rate (₹)</th>
                      <th className="text-right px-3 py-2.5 w-20">Disc %</th>
                      <th className="text-right px-3 py-2.5 w-20">GST %</th>
                      <th className="text-right px-3 py-2.5 w-28">Taxable (₹)</th>
                      <th className="text-right px-3 py-2.5 w-28">Total (₹)</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {calculatedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-900/25 group transition">
                        <td className="px-3 py-2 text-zinc-600 text-xs">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <ItemSelect
                            value={row.stockItemId}
                            name={row.itemName}
                            items={stockItems}
                            onChange={item => {
                              updateRow(idx, {
                                stockItemId: item.id,
                                itemName: item.name,
                                rate: String(item.selling_price || 0),
                                gstPercent: String(item.gst_percent || 0),
                              });
                            }}
                            onAddNew={(searchVal) => {
                              setNewItemRowIndex(idx);
                              setNewItem(prev => ({ ...prev, name: searchVal, unitId: units[0]?.id || '' }));
                              setIsItemModalOpen(true);
                            }}
                            className="border-b border-zinc-800 pb-0.5"
                          />
                          <input
                            type="text"
                            value={row.notes}
                            onChange={e => updateRow(idx, 'notes', e.target.value)}
                            placeholder="Item description/notes..."
                            className="w-full bg-transparent text-[10px] text-zinc-500 placeholder-zinc-750 focus:outline-none mt-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.quantity}
                            onChange={e => updateRow(idx, 'quantity', e.target.value)}
                            placeholder="0"
                            className="w-full bg-transparent text-right text-xs font-mono text-zinc-200 focus:outline-none border-b border-zinc-800 pb-0.5"
                            min="0.001" step="any"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.rate}
                            onChange={e => updateRow(idx, 'rate', e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-transparent text-right text-xs font-mono text-zinc-200 focus:outline-none border-b border-zinc-800 pb-0.5"
                            min="0" step="0.01"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.discountPercent}
                            onChange={e => updateRow(idx, 'discountPercent', e.target.value)}
                            placeholder="0"
                            className="w-full bg-transparent text-right text-xs font-mono text-red-300 focus:outline-none border-b border-zinc-800 pb-0.5"
                            min="0" max="100"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.gstPercent}
                            onChange={e => updateRow(idx, 'gstPercent', e.target.value)}
                            placeholder="0"
                            className="w-full bg-transparent text-right text-xs font-mono text-amber-300 focus:outline-none border-b border-zinc-800 pb-0.5"
                            min="0" max="100"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-zinc-400">
                          {row.taxableValue.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-zinc-200">
                          {row.rowTotal.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => removeRow(idx)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-900/40 border-t border-zinc-700">
                      <td colSpan={6} className="px-3 py-2.5">
                        <button onClick={addRow} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 transition">
                          <Plus size={12} /> Add Item Row
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-zinc-400 text-xs">
                        {(subtotal - totalDiscount).toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-zinc-200 text-xs">
                        {rawGrandTotal.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Calculations Card and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-800">
              {/* Notes & Terms */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Invoice Notes / Remarks</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Enter notes visible to the customer..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 resize-none placeholder-zinc-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Terms & Conditions</label>
                  <textarea
                    rows={2}
                    value={terms}
                    onChange={e => setTerms(e.target.value)}
                    placeholder="e.g. Interest @18% will be charged for delayed payments..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 resize-none placeholder-zinc-700 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-zinc-950/40 rounded-xl border border-zinc-800 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-zinc-450">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono text-zinc-300">₹{subtotal.toFixed(2)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Discount:</span>
                    <span className="font-mono">- ₹{totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-zinc-850 my-1"></div>

                {!isInterstate ? (
                  <>
                    <div className="flex justify-between text-zinc-450">
                      <span>Central Tax (CGST):</span>
                      <span className="font-mono text-zinc-300">₹{cgstTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-450">
                      <span>State Tax (SGST):</span>
                      <span className="font-mono text-zinc-300">₹{sgstTotal.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-zinc-450">
                    <span>Integrated Tax (IGST):</span>
                    <span className="font-mono text-zinc-300">₹{igstTotal.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-zinc-500 text-[10px]">
                  <span>Total Tax Amount:</span>
                  <span className="font-mono">₹{totalTax.toFixed(2)}</span>
                </div>

                <div className="border-t border-zinc-850 my-1"></div>

                {Math.abs(roundOff) > 0.001 && (
                  <div className="flex justify-between text-zinc-500">
                    <span>Round Off Difference:</span>
                    <span className="font-mono">{roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm font-bold pt-1.5 text-zinc-100 border-t border-zinc-800">
                  <span className="text-emerald-400 uppercase tracking-widest text-xs">Grand Total Receivable:</span>
                  <span className="font-mono text-lg text-emerald-400">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800 text-xs">
              {/* Error message near button so user sees it without scrolling */}
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                  <AlertCircle size={16} /> {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-400">
                  <CheckCircle size={16} /> {successMsg}
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="text-zinc-500 hover:text-zinc-300 transition"
                >
                  Cancel and exit [Esc]
                </button>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handlePostInvoice}
                    disabled={submitting}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-450 hover:to-teal-550 text-black font-bold text-sm transition disabled:opacity-40 cursor-pointer shadow-lg shadow-emerald-500/10"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Save and Post Invoice
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* CREATE CUSTOMER INLINE MODAL */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 uppercase tracking-wide">Register New Customer</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-zinc-500 hover:text-zinc-300 text-sm">✕</button>
            </div>
            
            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newCust.name}
                    onChange={e => setNewCust(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                    placeholder="Customer Business/Name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-zinc-500 mb-1">Mobile / Phone</label>
                  <input
                    type="text"
                    value={newCust.mobile}
                    onChange={e => setNewCust(prev => ({ ...prev, mobile: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-zinc-500 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={newCust.gstin}
                    onChange={e => setNewCust(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 font-mono focus:outline-none"
                    placeholder="15-digit GST Number"
                    maxLength={15}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-zinc-500 mb-1">PAN</label>
                  <input
                    type="text"
                    value={newCust.pan}
                    onChange={e => setNewCust(prev => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 font-mono focus:outline-none"
                    placeholder="10-digit PAN"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-zinc-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newCust.email}
                    onChange={e => setNewCust(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                    placeholder="email@address.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-zinc-500 mb-1">Credit Limit</label>
                    <input
                      type="number"
                      value={newCust.creditLimit}
                      onChange={e => setNewCust(prev => ({ ...prev, creditLimit: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-wider text-zinc-500 mb-1">Credit Days</label>
                    <input
                      type="number"
                      value={newCust.creditDays}
                      onChange={e => setNewCust(prev => ({ ...prev, creditDays: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-zinc-500 mb-1">Billing Address</label>
                <textarea
                  rows={2}
                  value={newCust.billingAddress}
                  onChange={e => setNewCust(prev => ({ ...prev, billingAddress: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none resize-none"
                  placeholder="Street Address, Area..."
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-zinc-500 mb-1">City</label>
                  <input
                    type="text"
                    value={newCust.city}
                    onChange={e => setNewCust(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-zinc-500 mb-1">State</label>
                  <input
                    type="text"
                    value={newCust.state}
                    onChange={e => setNewCust(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                    placeholder="State name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-zinc-500 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={newCust.pincode}
                    onChange={e => setNewCust(prev => ({ ...prev, pincode: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded bg-emerald-500 hover:bg-emerald-600 text-black font-bold transition cursor-pointer"
                >
                  Create & Select
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="flex-1 py-2.5 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE STOCK ITEM INLINE MODAL */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 uppercase tracking-wide">Register New Stock Item</h3>
              <button onClick={() => setIsItemModalOpen(false)} className="text-zinc-500 hover:text-zinc-300 text-sm">✕</button>
            </div>
            
            <form onSubmit={handleCreateStockItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={newItem.name}
                  onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                  placeholder="e.g. Acer Laptop, Pen"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Unit of Measure *</label>
                  {units.length === 0 ? (
                    <div className="text-[10px] text-red-400 py-2">
                      No units available. Please create a unit in Masters first.
                    </div>
                  ) : (
                    <select
                      required
                      value={newItem.unitId}
                      onChange={e => setNewItem(prev => ({ ...prev, unitId: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                    >
                      {units.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">GST Rate %</label>
                  <input
                    type="number"
                    value={newItem.gstPercent}
                    onChange={e => setNewItem(prev => ({ ...prev, gstPercent: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                    min="0" max="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Selling Price (₹)</label>
                <input
                  type="number"
                  value={newItem.sellingPrice}
                  onChange={e => setNewItem(prev => ({ ...prev, sellingPrice: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none"
                  min="0" step="0.01"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="submit"
                  disabled={units.length === 0}
                  className="flex-1 py-2.5 rounded bg-emerald-500 hover:bg-emerald-600 text-black font-bold transition cursor-pointer disabled:opacity-40"
                >
                  Create & Select
                </button>
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="flex-1 py-2.5 rounded bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
