'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Truck,
  LogOut,
} from 'lucide-react';

export default function DriverSidebar({ user }: { user: any }) {
  return (
    <aside className="w-0 lg:w-64 bg-slate-900 text-white flex flex-col">
      <div className="h-16 flex items-center px-4 border-b border-slate-700/50 gap-2.5">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Truck className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="font-semibold text-[15px] tracking-tight">VanTracker</span>
      </div>

      <nav className="flex-1 py-3 px-2">
        <Link
          href="/dashboard/driver"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium bg-blue-600 text-white"
        >
          <Truck className="w-[18px] h-[18px] shrink-0" />
          <span>My Tracking</span>
        </Link>
      </nav>

      <div className="p-3 border-t border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/20 border border-blue-500/30 rounded-full flex items-center justify-center text-xs font-semibold text-blue-400 shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-400">Driver</p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-800"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
