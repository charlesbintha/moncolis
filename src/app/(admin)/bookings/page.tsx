'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { formatDate, formatFCFA, bookingStatusConfig, cn } from '@/lib/utils';
import { Package, MapPin, Loader2 } from 'lucide-react';

export default function BookingsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'bookings', page],
    queryFn: () => adminApi.getBookings({ page, limit: 25 }).then((r) => r.data),
  });

  const bookings = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
        <p className="text-gray-500 text-sm mt-1">Toutes les réservations de la plateforme</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Trajet</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Expéditeur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Transporteur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Montant</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Paiement</th>
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
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    Aucune réservation
                  </td>
                </tr>
              ) : (
                bookings.map((booking: any) => {
                  const statusConf = bookingStatusConfig[booking.status] || bookingStatusConfig.PENDING;
                  return (
                    <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-400 text-xs">{booking.id.slice(-8)}</td>
                      <td className="px-4 py-3">
                        {booking.trip ? (
                          <div className="flex items-center gap-1 text-xs text-gray-700">
                            <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span>{booking.trip.originCity}</span>
                            <span className="text-gray-400">→</span>
                            <span>{booking.trip.destinationCity}</span>
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900 text-xs font-medium">{booking.sender?.fullName}</p>
                        <p className="text-gray-400 text-xs font-mono">{booking.sender?.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900 text-xs font-medium">{booking.carrier?.fullName}</p>
                        <p className="text-gray-400 text-xs font-mono">{booking.carrier?.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 text-xs">{formatFCFA(booking.payment?.amount || 0)}</p>
                        <p className="text-gray-400 text-xs">{booking.payment?.method || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        {booking.payment ? (
                          <span className={cn('badge text-xs', {
                            'bg-yellow-100 text-yellow-700': booking.payment.status === 'PENDING',
                            'bg-blue-100 text-blue-700': booking.payment.status === 'HELD',
                            'bg-green-100 text-green-700': booking.payment.status === 'RELEASED',
                            'bg-gray-100 text-gray-600': booking.payment.status === 'REFUNDED',
                          })}>
                            {booking.payment.status}
                          </span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('badge text-xs', statusConf.color)}>{statusConf.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatDate(booking.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">Page {page}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1.5 disabled:opacity-40">Précédent</button>
            <button disabled={bookings.length < 25} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1.5 disabled:opacity-40">Suivant</button>
          </div>
        </div>
      </div>
    </div>
  );
}
