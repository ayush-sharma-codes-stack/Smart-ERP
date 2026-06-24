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
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-600 px-2 mb-2">Reports</p>
        {REPORT_LINKS.map(({ href, label, icon: Icon }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
              pathname === href
                ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-zinc-800 text-xs text-zinc-600 truncate">{companyName}</div>
    </aside>
  );
}
