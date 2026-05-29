'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { formatFCFA } from '@/lib/utils';
import {
  Users, Package, AlertTriangle,
  CheckCircle, Banknote,
  ArrowUpRight, FileWarning,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';

function StatCard({
  title, value, subtitle, icon: Icon, color, trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="stat-card flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <ArrowUpRight className={`h-3 w-3 ${trend.value < 0 ? 'rotate-180' : ''}`} />
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div
      className="bg-gray-50 rounded animate-pulse"
      style={{ height }}
    />
  );
}

function EmptyChart({ height = 260, message }: { height?: number; message: string }) {
  return (
    <div
      className="flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded"
      style={{ height }}
    >
      {message}
    </div>
  );
}

export default function DashboardPage() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.getDashboard().then((r) => r.data.data),
  });

  const { data: chartsData, isLoading: chartsLoading } = useQuery({
    queryKey: ['admin', 'dashboard', 'charts'],
    queryFn: () => adminApi.getDashboardCharts().then((r) => r.data.data),
  });

  const stats = statsData || {
    users: { total: 0, newThisMonth: 0, pendingCniValidation: 0, trendVsLastMonth: 0 },
    bookings: { total: 0, active: 0, completed: 0, trendVsLastMonth: 0 },
    revenue: { totalTransactions: 0, totalCommission: 0, thisMonth: 0, monthlyCommission: 0, trendVsLastMonth: 0 },
    disputes: { open: 0 },
  };

  const revenueByMonth = chartsData?.revenueByMonth || [];
  const topCorridors = chartsData?.topCorridors || [];
  const hasRevenueData = revenueByMonth.some((m: any) => m.revenue > 0);
  const hasCorridorsData = topCorridors.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de la plateforme ColiSN</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="Utilisateurs inscrits"
          value={isLoading ? '...' : stats.users.total.toLocaleString('fr')}
          subtitle={`+${stats.users.newThisMonth} ce mois`}
          icon={Users}
          color="bg-blue-50 text-blue-600"
          trend={{ value: stats.users.trendVsLastMonth, label: 'vs mois dernier' }}
        />
        <StatCard
          title="Réservations actives"
          value={isLoading ? '...' : stats.bookings.active.toLocaleString('fr')}
          subtitle={`${stats.bookings.completed} confirmées`}
          icon={Package}
          color="bg-green-50 text-green-600"
          trend={{ value: stats.bookings.trendVsLastMonth, label: 'vs mois dernier' }}
        />
        <StatCard
          title="Commission ce mois"
          value={isLoading ? '...' : formatFCFA(stats.revenue.monthlyCommission)}
          subtitle={`Total: ${formatFCFA(stats.revenue.totalCommission)}`}
          icon={Banknote}
          color="bg-gold-50 text-gold-600"
          trend={{ value: stats.revenue.trendVsLastMonth, label: 'vs mois dernier' }}
        />
        <StatCard
          title="Litiges en cours"
          value={isLoading ? '...' : stats.disputes.open}
          subtitle={stats.users.pendingCniValidation > 0 ? `${stats.users.pendingCniValidation} CNI à valider` : 'Aucune CNI en attente'}
          icon={AlertTriangle}
          color={stats.disputes.open > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Revenus & Commissions (6 derniers mois)
          </h3>
          {chartsLoading ? (
            <ChartSkeleton />
          ) : !hasRevenueData ? (
            <EmptyChart message="Pas encore de revenus à afficher" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="colorRevenus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number, name: string) => [formatFCFA(v), name === 'revenue' ? 'Revenus' : 'Commission']} />
                <Legend formatter={(v) => v === 'revenue' ? 'Revenus' : 'Commission'} />
                <Area type="monotone" dataKey="revenue" stroke="#16a34a" fill="url(#colorRevenus)" strokeWidth={2} />
                <Area type="monotone" dataKey="commission" stroke="#eab308" fill="url(#colorCommission)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Top corridors (bookings)
          </h3>
          {chartsLoading ? (
            <ChartSkeleton />
          ) : !hasCorridorsData ? (
            <EmptyChart message="Pas encore de bookings confirmés" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topCorridors} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="route" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#16a34a" radius={[0, 4, 4, 0]} name="Réservations" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stats.users.pendingCniValidation > 0 && (
          <a href="/users/cni" className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors">
            <div className="p-2 bg-amber-100 rounded-lg">
              <FileWarning className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-sm">CNI à valider</p>
              <p className="text-amber-700 text-xs">{stats.users.pendingCniValidation} pièces d'identité en attente</p>
            </div>
          </a>
        )}
        {stats.disputes.open > 0 && (
          <a href="/disputes" className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-xl p-4 hover:bg-red-100 transition-colors">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-900 text-sm">Litiges ouverts</p>
              <p className="text-red-700 text-xs">{stats.disputes.open} litige(s) en attente de résolution</p>
            </div>
          </a>
        )}
        <div className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-900 text-sm">Livraisons confirmées</p>
            <p className="text-green-700 text-xs">{stats.bookings.completed} ce mois</p>
          </div>
        </div>
      </div>
    </div>
  );
}
