'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useApp } from '@/context/AppContext';
import { Plus, Edit2, Trash2, Building, ArrowRight, Loader2, LogOut } from 'lucide-react';

const companySchema = zod.object({
  name: zod.string().min(2, 'Company name must be at least 2 characters'),
  address: zod.string().optional(),
  city: zod.string().optional(),
  state: zod.string().optional(),
  pincode: zod.string().optional(),
  gstin: zod.string().length(15, 'GSTIN must be exactly 15 characters').or(zod.string().length(0)),
  pan: zod.string().length(10, 'PAN must be exactly 10 characters').or(zod.string().length(0)),
  contactPhone: zod.string().optional(),
  contactEmail: zod.string().email('Please enter a valid email').or(zod.string().length(0)),
  financialYearStart: zod.enum(['April', 'January']),
  currencySymbol: zod.string().min(1).max(5),
});

export default function CompaniesPage() {
  const { user, companies, loading, selectCompany, logout, apiCall, refreshCompanies } = useApp();
  const [editingCompany, setEditingCompany] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: {
      financialYearStart: 'April',
      currencySymbol: '₹',
      gstin: '',
      pan: '',
      contactEmail: '',
    },
  });

  // Load values if editing
  useEffect(() => {
    if (editingCompany) {
      setValue('name', editingCompany.name);
      setValue('address', editingCompany.address || '');
      setValue('city', editingCompany.city || '');
      setValue('state', editingCompany.state || '');
      setValue('pincode', editingCompany.pincode || '');
      setValue('gstin', editingCompany.gstin || '');
      setValue('pan', editingCompany.pan || '');
      setValue('contactPhone', editingCompany.contact_phone || '');
      setValue('contactEmail', editingCompany.contact_email || '');
      setValue('financialYearStart', editingCompany.financial_year_start || 'April');
      setValue('currencySymbol', editingCompany.currency_symbol || '₹');
      setIsFormOpen(true);
    }
  }, [editingCompany, setValue]);

  const onSubmit = async (data) => {
    setErrorMsg('');
    setSubmitting(true);

    // Prepare payload
    const payload = {
      ...data,
      gstin: data.gstin || null,
      pan: data.pan || null,
      contactEmail: data.contactEmail || null,
    };

    try {
      let res;
      if (editingCompany) {
        res = await apiCall(`/companies/${editingCompany.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiCall('/companies', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        await refreshCompanies();
        handleCloseForm();
      }
    } catch (err) {
      setErrorMsg('Failed to save company details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Avoid triggering company selection
    if (!confirm('Are you sure you want to delete this company? All financial vouchers, ledger records, and settings will be permanently lost.')) {
      return;
    }

    try {
      const res = await apiCall(`/companies/${id}`, {
        method: 'DELETE',
      });
      if (res.error) {
        alert(res.error);
      } else {
        await refreshCompanies();
      }
    } catch (err) {
      alert('Failed to delete company.');
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCompany(null);
    setErrorMsg('');
    reset({
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gstin: '',
      pan: '',
      contactPhone: '',
      contactEmail: '',
      financialYearStart: 'April',
      currencySymbol: '₹',
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden font-sans">
      {/* Decorative BG */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10" />

      <div className="w-full max-w-6xl mx-auto p-6 md:p-8 z-10 flex flex-col">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Select <span className="text-emerald-400">Company</span></h1>
            <p className="text-zinc-400 mt-1">Hello, {user?.full_name || 'User'} • Select or manage your business profiles (Max 5)</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition cursor-pointer text-sm"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </header>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          {/* Left Column: Companies List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-300">Your Companies ({companies.length}/5)</h2>
              {!isFormOpen && companies.length < 5 && (
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-sm transition cursor-pointer"
                >
                  <Plus size={16} /> Create Company
                </button>
              )}
            </div>

            {companies.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center bg-zinc-900/20">
                <Building className="mx-auto text-zinc-600 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-zinc-300">No Companies Found</h3>
                <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-2">
                  Create a company profile first to start recording vouchers, double-entry ledgers, and billing.
                </p>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition cursor-pointer"
                >
                  <Plus size={16} /> Create Your First Company
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companies.map((comp) => (
                  <div
                    key={comp.id}
                    onClick={() => selectCompany(comp)}
                    className="group relative rounded-xl border border-zinc-850 hover:border-emerald-500/50 bg-zinc-900/50 hover:bg-zinc-900/80 p-5 transition cursor-pointer flex flex-col justify-between shadow-lg shadow-black/20"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-wide">
                          FY: {comp.financial_year_start}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCompany(comp);
                            }}
                            className="p-1 text-zinc-500 hover:text-emerald-400 transition"
                            title="Edit Company"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(comp.id, e)}
                            className="p-1 text-zinc-500 hover:text-red-400 transition"
                            title="Delete Company"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-zinc-100 group-hover:text-emerald-400 transition truncate">
                        {comp.name}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                        {comp.address ? `${comp.address}, ` : ''}{comp.city || ''} {comp.state || ''}
                      </p>
                      {comp.gstin && (
                        <p className="text-xs text-emerald-400/80 mt-2 font-mono">
                          GSTIN: {comp.gstin}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-end text-xs text-zinc-400 group-hover:text-emerald-400 mt-4 transition">
                      Open Company <ArrowRight size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Form Panel (Slide-in / Toggle) */}
          <div className="lg:col-span-1">
            {isFormOpen ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-md shadow-xl sticky top-6">
                <h2 className="text-lg font-bold text-zinc-200 mb-4 border-b border-zinc-800 pb-3">
                  {editingCompany ? 'Alter Company Details' : 'Create New Company'}
                </h2>

                {errorMsg && (
                  <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Company Name *</label>
                    <input
                      type="text"
                      {...register('name')}
                      className="w-full rounded-lg border border-zinc-850 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 placeholder-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="e.g. Acme Corporation"
                      disabled={submitting}
                    />
                    {errors.name && <p className="text-xs text-red-400 mt-0.5">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Address</label>
                    <textarea
                      {...register('address')}
                      rows={2}
                      className="w-full rounded-lg border border-zinc-850 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 placeholder-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                      placeholder="Street address, landmark"
                      disabled={submitting}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">City</label>
                      <input
                        type="text"
                        {...register('city')}
                        className="w-full rounded-lg border border-zinc-850 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 placeholder-zinc-700 focus:border-emerald-500"
                        placeholder="City"
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">State</label>
                      <input
                        type="text"
                        {...register('state')}
                        className="w-full rounded-lg border border-zinc-850 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 placeholder-zinc-700 focus:border-emerald-500"
                        placeholder="State (e.g. Maharashtra)"
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Pincode</label>
                      <input
                        type="text"
                        {...register('pincode')}
                        className="w-full rounded-lg border border-zinc-850 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 placeholder-zinc-700 focus:border-emerald-500"
                        placeholder="400001"
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Currency</label>
                      <input
                        type="text"
                        {...register('currencySymbol')}
                        className="w-full rounded-lg border border-zinc-850 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500"
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">GSTIN</label>
                      <input
                        type="text"
                        {...register('gstin')}
                        className="w-full rounded-lg border border-zinc-850 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 placeholder-zinc-700 focus:border-emerald-500 font-mono uppercase"
                        placeholder="15-digit alphanumeric"
                        disabled={submitting}
                      />
                      {errors.gstin && <p className="text-xs text-red-400 mt-0.5">{errors.gstin.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">PAN</label>
                      <input
                        type="text"
                        {...register('pan')}
                        className="w-full rounded-lg border border-zinc-850 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 placeholder-zinc-700 focus:border-emerald-500 font-mono uppercase"
                        placeholder="10-digit alphanumeric"
                        disabled={submitting}
                      />
                      {errors.pan && <p className="text-xs text-red-400 mt-0.5">{errors.pan.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Phone</label>
                      <input
                        type="text"
                        {...register('contactPhone')}
                        className="w-full rounded-lg border border-zinc-850 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 placeholder-zinc-750 focus:border-emerald-500"
                        placeholder="Phone"
                        disabled={submitting}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Financial Year</label>
                      <select
                        {...register('financialYearStart')}
                        className="w-full rounded-lg border border-zinc-855 bg-zinc-950 py-2 px-3 text-sm text-zinc-100 focus:border-emerald-500"
                        disabled={submitting || editingCompany}
                      >
                        <option value="April">Starts April (India standard)</option>
                        <option value="January">Starts January (Calendar year)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-zinc-850">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-sm transition cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Save Profile'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseForm}
                      className="flex-1 py-2.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 text-sm font-semibold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-850 p-6 bg-zinc-900/10 text-center sticky top-6">
                <Building className="mx-auto text-zinc-700 mb-3" size={32} />
                <h4 className="font-bold text-zinc-400">Need Another Profile?</h4>
                <p className="text-xs text-zinc-650 mt-1 max-w-xs mx-auto">
                  You can register and manage up to 5 distinct businesses under this single user account.
                </p>
                {companies.length < 5 && (
                  <button
                    onClick={() => setIsFormOpen(true)}
                    className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-750 text-xs font-semibold transition cursor-pointer"
                  >
                    <Plus size={14} /> Add Company
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
