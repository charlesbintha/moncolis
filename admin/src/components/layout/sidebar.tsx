'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Package, Truck, BookOpen,
  CreditCard, AlertTriangle, LogOut, Package2, CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Cookies from 'js-cookie';

const navItems = [
  { href: '/dashboard',  label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/users',      label: 'Utilisateurs',     icon: Users },
  { href: '/users/cni',  label: 'Validation CNI',   icon: CheckCircle },
  { href: '/bookings',   label: 'Réservations',      icon: BookOpen },
  { href: '/trips',      label: 'Trajets',           icon: Truck },
  { href: '/parcels',    label: 'Colis',             icon: Package },
  { href: '/payments',   label: 'Paiements',         icon: CreditCard },
  { href: '/disputes',   label: 'Litiges',           icon: AlertTriangle },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    Cookies.remove('user');
    router.push('/login');
  };

  return (
    <aside className="w-64 h-screen flex flex-col bg-gray-900 text-white fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
          <Package2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm">ColiSN Admin</p>
          <p className="text-gray-400 text-xs">Backoffice</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
