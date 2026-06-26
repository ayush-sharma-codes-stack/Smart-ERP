'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';
import {
  Keyboard,
  Building,
  Calendar,
  Search,
  BookOpen,
  Plus,
  HelpCircle,
  LogOut,
  Info,
  Layers,
  ShoppingBag,
  PlusCircle,
  FileText,
  DollarSign
} from 'lucide-react';

const MENU_ITEMS = [
  { id: 'ledger-create', category: 'Masters', label: 'Create Ledger', shortcut: 'Alt+L', icon: PlusCircle },
  { id: 'group-create', category: 'Masters', label: 'Create Group', shortcut: 'Alt+G', icon: Layers },
  { id: 'stock-create', category: 'Masters', label: 'Create Stock Item', shortcut: 'Alt+S', icon: ShoppingBag },
  { id: 'voucher-sales', category: 'Transactions', label: 'Sales Voucher (F8)', shortcut: 'F8', icon: DollarSign },
  { id: 'voucher-purchase', category: 'Transactions', label: 'Purchase Voucher (F9)', shortcut: 'F9', icon: DollarSign },
  { id: 'billing-invoice', category: 'Transactions', label: 'Create Invoice', shortcut: 'Ctrl+B', icon: FileText },
  { id: 'report-balance', category: 'Reports', label: 'Balance Sheet', shortcut: 'Alt+B', icon: BookOpen },
  { id: 'report-pl', category: 'Reports', label: 'Profit & Loss A/c', shortcut: 'Alt+P', icon: BookOpen },
  { id: 'report-trial', category: 'Reports', label: 'Trial Balance', shortcut: 'Alt+T', icon: BookOpen },
  { id: 'report-ledger', category: 'Reports', label: 'Ledger Statement', shortcut: 'Alt+S', icon: BookOpen },
  { id: 'report-stock', category: 'Reports', label: 'Stock Summary', shortcut: 'Alt+R', icon: BookOpen },
];

export default function DashboardPage() {
  const { user, selectedCompany, selectCompany, logout } = useApp();
  const router = useRouter();

  const [activeIndex, setActiveIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('');

  const searchInputRef = useRef(null);
  const calcInputRef = useRef(null);

  // Redirect if no company is selected
  useEffect(() => {
    if (!selectedCompany) {
      router.push('/companies');
    }
  }, [selectedCompany, router]);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Calculator Trigger: F4
      if (e.key === 'F4') {
        e.preventDefault();
        setShowCalculator((prev) => !prev);
        return;
      }

      // 2. Command Search Trigger: Ctrl+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch((prev) => !prev);
        return;
      }

      // 3. Company Selection Trigger: F1
      if (e.key === 'F1') {
        e.preventDefault();
        selectCompany(null); // Goes back to company selector
        return;
      }

      // 4. Logout: Ctrl+Q
      if (e.ctrlKey && e.key === 'q') {
        e.preventDefault();
        logout();
        return;
      }

      // If search or calculator is active, intercept key events for menu selection
      if (showSearch || showCalculator) {
        if (e.key === 'Escape') {
          setShowSearch(false);
          setShowCalculator(false);
        }
        return;
      }

      // Arrow navigation for Tally menu selection
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % MENU_ITEMS.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleMenuAction(MENU_ITEMS[activeIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, showSearch, showCalculator, selectCompany, logout]);

  // Focus inputs when toggled
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  useEffect(() => {
    if (showCalculator && calcInputRef.current) {
      calcInputRef.current.focus();
    }
  }, [showCalculator]);

  const handleMenuAction = (id) => {
    switch (id) {
      case 'ledger-create':
        router.push('/masters/ledgers');
        break;
      case 'group-create':
        router.push('/masters/groups');
        break;
      case 'stock-create':
        router.push('/masters/stock');
        break;
      case 'voucher-sales':
        router.push('/transactions/vouchers/sales');
        break;
      case 'voucher-purchase':
        router.push('/transactions/vouchers/purchase');
        break;
      case 'billing-invoice':
        router.push('/billing/invoices/new');
        break;
      case 'report-balance':
        router.push('/reports/balance-sheet');
        break;
      case 'report-pl':
        router.push('/reports/profit-loss');
        break;
      case 'report-trial':
        router.push('/reports/trial-balance');
        break;
      case 'report-ledger':
        router.push('/reports/ledger-account');
        break;
      case 'report-stock':
        router.push('/reports/stock-summary');
        break;
      default:
        break;
    }
  };

  // Calculator Logic
  const evaluateCalc = () => {
    try {
      // Safe evaluation of simple math equations
      const cleanInput = calcInput.replace(/[^0-9+\-*/().\s]/g, '');
      const res = Function(`"use strict"; return (${cleanInput})`)();
      setCalcResult(res !== undefined ? String(res) : 'Error');
    } catch {
      setCalcResult('Error');
    }
  };

  // Filtered menu items for command search
  const filteredMenuItems = MENU_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!selectedCompany) return null;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 relative select-none font-mono">
      {/* Top Banner (Status Bar) */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-bold text-emerald-400">
            <Building size={14} /> {selectedCompany.name}
          </span>
          <span className="text-zinc-500">|</span>
          <span className="flex items-center gap-1.5 text-zinc-400">
            <Calendar size={14} /> FY: {selectedCompany.financial_year_start} - Present
          </span>
        </div>
        <div className="flex items-center gap-4 text-zinc-400">
          <span>Logged in as: <strong className="text-zinc-200">{user?.full_name}</strong></span>
          <button
            onClick={() => selectCompany(null)}
            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 hover:text-zinc-100 transition cursor-pointer"
          >
            [F1] Change Company
          </button>
        </div>
      </div>

      {/* Main Screen Panel */}
      <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
        {/* Left Half: Active Company Details (Tally Classic Style) */}
        <div className="w-full md:w-1/2 p-4 sm:p-6 border-b md:border-b-0 md:border-r border-zinc-850 flex flex-col justify-between bg-zinc-900/10 shrink-0 gap-6">
          <div className="space-y-6">
            <div className="border border-zinc-800 rounded-lg p-5 bg-zinc-900/30">
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3">Active Company Details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-zinc-400">Company Name:</span><span className="font-bold text-zinc-200">{selectedCompany.name}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">GSTIN:</span><span className="font-mono text-emerald-400">{selectedCompany.gstin || 'Unregistered'}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">State:</span><span>{selectedCompany.state || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Currency:</span><span className="text-emerald-400 font-bold">{selectedCompany.currency_symbol}</span></div>
              </div>
            </div>

            <div className="border border-zinc-800 rounded-lg p-5 bg-zinc-900/30">
              <h2 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Voucher Entries Info</h2>
              <p className="text-xs text-zinc-500 leading-normal">
                Use standard hotkeys anytime to record ledger masters, accounts adjust journals, or sales and purchase vouchers. Vouchers instantly increment/decrement stock and balances.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-zinc-900/20 border border-zinc-850 p-4 text-xs text-zinc-500 space-y-1">
            <div className="flex items-center gap-1 text-zinc-400 font-bold mb-1">
              <Keyboard size={14} className="text-emerald-400" />
              Tally Quick Shortcuts
            </div>
            <div>[F1] Company Selector • [F4] Toggle Calculator</div>
            <div>[Ctrl+K] Search Menu • [Ctrl+Q] Sign Out</div>
            <div>[Arrow Up/Down] Move Selection • [Enter] Open</div>
            <button
              onClick={() => router.push('/transactions/vouchers/list')}
              className="mt-2 w-full text-left text-emerald-400 hover:text-emerald-300 transition font-semibold"
            >
              → View Voucher Register
            </button>
          </div>
        </div>

        {/* Right Half: Gateway of SmartERP Menu list (Tally classic gateway) */}
        <div className="w-full md:w-1/2 p-4 sm:p-8 flex flex-col justify-center items-center bg-zinc-950 relative shrink-0">
          {/* Outer retro Tally double border */}
          <div className="w-full max-w-md border-4 border-double border-zinc-800 rounded-lg p-6 bg-zinc-900/20 shadow-2xl">
            <div className="text-center font-bold text-lg text-emerald-400 mb-6 uppercase tracking-widest border-b border-zinc-850 pb-2">
              Gateway of SmartERP
            </div>

            {/* Menu Sections */}
            {['Masters', 'Transactions', 'Reports'].map((cat) => {
              const items = MENU_ITEMS.filter((item) => item.category === cat);
              return (
                <div key={cat} className="mb-6">
                  <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2 pl-3">
                    {cat}
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const absoluteIndex = MENU_ITEMS.findIndex((m) => m.id === item.id);
                      const isFocused = absoluteIndex === activeIndex;
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleMenuAction(item.id)}
                          onMouseEnter={() => setActiveIndex(absoluteIndex)}
                          className={`flex items-center justify-between px-3 py-2 rounded-md border text-sm transition cursor-pointer ${
                            isFocused
                              ? 'bg-emerald-500 border-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/10'
                              : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon size={16} className={isFocused ? 'text-black' : 'text-zinc-500'} />
                            <span>{item.label}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                            isFocused
                              ? 'bg-black/10 text-black'
                              : 'bg-zinc-900 text-zinc-500'
                          }`}>
                            {item.shortcut}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Command Search Modal (Ctrl+K) */}
      {showSearch && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3 mb-3">
              <Search className="text-zinc-500" size={20} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-zinc-100 placeholder-zinc-600 focus:outline-none text-sm"
                placeholder="Search shortcuts, screens or reports..."
              />
              <button
                onClick={() => setShowSearch(false)}
                className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-500 hover:text-zinc-300"
              >
                ESC
              </button>
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto">
              {filteredMenuItems.length === 0 ? (
                <div className="text-xs text-zinc-650 text-center py-6">No matching actions found</div>
              ) : (
                filteredMenuItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setShowSearch(false);
                      handleMenuAction(item.id);
                    }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-400 cursor-pointer transition text-xs"
                  >
                    <span>{item.label} ({item.category})</span>
                    <span className="font-bold text-emerald-400">{item.shortcut}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Retro Tally-Inspired Calculator Overlay (F4) */}
      {showCalculator && (
        <div className="absolute bottom-4 right-4 w-72 rounded-xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-md p-4 shadow-2xl z-50">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <span className="text-xs font-bold text-zinc-400">Tally Calculator [F4]</span>
            <button
              onClick={() => setShowCalculator(false)}
              className="text-zinc-500 hover:text-zinc-300 text-xs"
            >
              Close
            </button>
          </div>
          <div className="space-y-3">
            <div className="bg-zinc-950 p-2 rounded border border-zinc-850 text-right min-h-16 flex flex-col justify-between">
              <div className="text-xs text-zinc-500 font-mono break-all">{calcInput || '0'}</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">{calcResult || '0'}</div>
            </div>
            <input
              ref={calcInputRef}
              type="text"
              value={calcInput}
              onChange={(e) => setCalcInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  evaluateCalc();
                } else if (e.key === 'Escape') {
                  setShowCalculator(false);
                }
              }}
              placeholder="e.g. 5000 * 1.18"
              className="w-full rounded bg-zinc-950 border border-zinc-850 py-1.5 px-3.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 pl-1">
              <span>Press Enter to calculate</span>
              <span>ESC to exit</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
