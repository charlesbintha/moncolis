'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { adminApi, TripFilters } from '@/lib/api';
import {
  formatDate, formatFCFA, tripStatusConfig, cn, SENEGAL_CITIES,
} from '@/lib/utils';
import { Truck, MapPin, Loader2, ChevronRight, Calendar, Weight } from 'lucide-react';
import { FilterBar, FilterSelect, FilterDate } from '@/components/shared/filter-bar';
import { Pagination } from '@/components/shared/pagination';

const cityOptions = SENEGAL_CITIES.map((c) => ({ value: c, label: c }));
const statusOptions = Object.entries(tripStatusConfig).map(([value, c]) => ({
  value, label: c.label,
}));

export default function AdminTripsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filters: TripFilters = {
    page, limit: 25,
    ...(search && { search }),
    ...(status && { status }),
    ...(originCity && { originCity }),
    ...(destinationCity && { destinationCity }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'trips', filters],
    queryFn: () => adminApi.getTrips(filters).then((r) => r.data),
  });

  const trips = data?.data || [];
  const pagination = data?.pagination;
  const hasFilters = !!(search || status || originCity || destinationCity || dateFrom || dateTo);

  const reset = () => {
    setSearch(''); setStatus(''); setOriginCity('');
    setDestinationCity(''); setDateFrom(''); setDateTo('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trajets</h1>
        <p className="text-gray-500 text-sm mt-1">Annonces des transporteurs sur la plateforme</p>
      </div>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Rechercher un transporteur (nom, téléphone)…"
        hasFilters={hasFilters}
        onReset={reset}
      >
        <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }}
          options={statusOptions} placeholder="Statut" />
        <FilterSelect value={originCity} onChange={(v) => { setOriginCity(v); setPage(1); }}
          options={cityOptions} placeholder="Ville départ" />
        <FilterSelect value={destinationCity} onChange={(v) => { setDestinationCity(v); setPage(1); }}
          options={cityOptions} placeholder="Ville arrivée" />
        <FilterDate value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} placeholder="Date min" />
        <FilterDate value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} placeholder="Date max" />
      </FilterBar>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isError && (
          <div className="p-8 text-center text-red-600 text-sm">
            Impossible de charger les trajets. Réessaie.
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Trajet</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Transporteur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date départ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Capacité</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Prix/kg</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Bookings</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="w-10"></th>
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
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <Truck className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    Aucun trajet
                  </td>
                </tr>
              ) : (
                trips.map((trip: any) => {
                  const statusConf = tripStatusConfig[trip.status] || tripStatusConfig.ACTIVE;
                  return (
                    <tr key={trip.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-700">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="font-medium">{trip.originCity}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium">{trip.destinationCity}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900 text-xs font-medium">{trip.carrier?.fullName}</p>
                        <p className="text-gray-400 text-xs font-mono">{trip.carrier?.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        <Calendar className="h-3 w-3 inline mr-1 text-gray-400" />
                        {formatDate(trip.departureDate)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <Weight className="h-3 w-3 inline mr-1 text-gray-400" />
                        {trip.bookedKg}/{trip.availableKg} kg
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-900">
                        {formatFCFA(trip.pricePerKg)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {trip._count?.bookings || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('badge', statusConf.color)}>{statusConf.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/trips/${trip.id}`}
                          className="text-gray-400 hover:text-brand-600 inline-flex"
                          aria-label="Voir le détail"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
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
