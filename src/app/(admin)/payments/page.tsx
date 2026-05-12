'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, PaymentFilters } from '@/lib/api';
import {
  formatDate, formatFCFA, paymentStatusConfig, paymentMethodConfig, cn,
} from '@/lib/utils';
import {
  CreditCard, MapPin, Banknote, Lock, RotateCcw, HourglassIcon,
} from 'lucide-react';
import { FilterBar, FilterSelect, FilterDate } from '@/components/shared/filter-bar';
import { Pagination } from '@/components/shared/pagination';

const statusOptions = Object.entries(paymentStatusConfig).map(([value, c]) => ({
  value, label: c.label,
}));
const methodOptions = Object.entries(paymentMethodConfig).map(([value, c]) => ({
  value, label: c.label,
}));

function StatCard({
  title, amount, count, subtitle, icon: Icon, color,
}: {
  title: string;
  amount: number;
  count?: number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="stat-card flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{formatFCFA(amount)}</p>
        {count !== undefined && (
          <p className="text-xs text-gray-400 mt-1">{count} paiement{count > 1 ? 's' : ''}</p>
        )}
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['admin', 'payments', 'stats'],
    queryFn: () => adminApi.getPaymentsStats().then((r) => r.data.data),
  });

  const filters: PaymentFilters = {
    page, limit: 25,
    ...(search && { search }),
    ...(status && { status }),
    ...(method && { method }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'payments', filters],
    queryFn: () => adminApi.getPayments(filters).then((r) => r.data),
  });

  const payments = data?.data || [];
  const pagination = data?.pagination;
  const hasFilters = !!(search || status || method || dateFrom || dateTo);

  const reset = () => {
    setSearch(''); setStatus(''); setMethod('');
    setDateFrom(''); setDateTo(''); setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
        <p className="text-gray-500 text-sm mt-1">Transactions, escrow et payouts en attente</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="En séquestre (HELD)"
          amount={stats?.held?.amount || 0}
          count={stats?.held?.count}
          icon={Lock}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Payouts en attente"
          amount={stats?.pendingPayouts?.amount || 0}
          count={stats?.pendingPayouts?.count}
          subtitle="Bookings confirmés à virer"
          icon={HourglassIcon}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Versés (RELEASED)"
          amount={stats?.released?.amount || 0}
          count={stats?.released?.count}
          subtitle={stats ? `Commission ce mois : ${formatFCFA(stats.commissionThisMonth)}` : undefined}
          icon={Banknote}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          title="Remboursés"
          amount={stats?.refunded?.amount || 0}
          count={stats?.refunded?.count}
          icon={RotateCcw}
          color="bg-gray-100 text-gray-600"
        />
      </div>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Rechercher (booking ID, référence fournisseur)…"
        hasFilters={hasFilters}
        onReset={reset}
      >
        <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }}
          options={statusOptions} placeholder="Statut" />
        <FilterSelect value={method} onChange={(v) => { setMethod(v); setPage(1); }}
          options={methodOptions} placeholder="Méthode" />
        <FilterDate value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} placeholder="Date min" />
        <FilterDate value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} placeholder="Date max" />
      </FilterBar>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isError && (
          <div className="p-8 text-center text-red-600 text-sm">
            Impossible de charger les paiements. Réessaie.
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Booking</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Trajet</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Expéditeur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Transporteur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Montant</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Méthode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    Aucun paiement
                  </td>
                </tr>
              ) : (
                payments.map((p: any) => {
                  const statusConf = paymentStatusConfig[p.status] || paymentStatusConfig.PENDING;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {p.booking?.id?.slice(-8) || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {p.booking?.trip ? (
                          <div className="flex items-center gap-1 text-xs text-gray-700">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span>{p.booking.trip.originCity}</span>
                            <span className="text-gray-400">→</span>
                            <span>{p.booking.trip.destinationCity}</span>
                          </div>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900 text-xs font-medium">{p.booking?.sender?.fullName || '—'}</p>
                        <p className="text-gray-400 text-xs font-mono">{p.booking?.sender?.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900 text-xs font-medium">{p.booking?.carrier?.fullName || '—'}</p>
                        <p className="text-gray-400 text-xs font-mono">{p.booking?.carrier?.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-900">
                        {formatFCFA(p.amount)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {paymentMethodConfig[p.method]?.label || p.method}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('badge', statusConf.color)}>{statusConf.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(p.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={pagination?.totalPages}
          hasNext={!!pagination?.hasNextPage}
          onChange={setPage}
        />
      </div>
    </div>
  );
}
