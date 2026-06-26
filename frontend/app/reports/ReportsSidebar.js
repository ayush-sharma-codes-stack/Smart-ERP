'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, Scale, TrendingUp, BookOpen, Package, FileText } from 'lucide-react';

const REPORT_LINKS = [
  { href: '/reports/trial-balance',  label: 'Trial Balance',     icon: Scale },
  { href: '/reports/balance-sheet',  label: 'Balance Sheet',     icon: TrendingUp },
  { href: '/reports/profit-loss',    label: 'Profit & Loss',     icon: TrendingUp },
  { href: '/reports/ledger-account', label: 'Ledger Account',    icon: BookOpen },
  { href: '/reports/stock-summary',  label: 'Stock Summary',     icon: Package },
];

export default function ReportsSidebar({ companyName }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-900/50 flex flex-row lg:flex-col items-center lg:items-stretch justify-between lg:justify-start">
      <div className="p-4 border-r lg:border-r-0 lg:border-b border-zinc-800 shrink-0">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition"
        >
          <ArrowLeft size={15} /> <span className="hidden sm:inline">Dashboard</span>
        </button>
      </div>
      <nav className="p-2 lg:p-3 space-y-0 lg:space-y-1 flex-1 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-1.5 select-none">
        <p className="hidden lg:block text-xs font-bold uppercase tracking-widest text-zinc-600 px-2 mb-2">Reports</p>
        {REPORT_LINKS.map(({ href, label, icon: Icon }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`flex items-center gap-2 px-2.5 py-1.5 lg:px-3 lg:py-2 rounded-lg text-xs lg:text-sm transition whitespace-nowrap ${
              pathname === href
                ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <Icon size={14} /> <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="hidden lg:block p-3 border-t border-zinc-800 text-xs text-zinc-600 truncate">{companyName}</div>
    </aside>
  );
}
