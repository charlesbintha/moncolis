'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import {
  formatDateTime, formatDate, formatFCFA, tripStatusConfig,
  bookingStatusConfig, cn,
} from '@/lib/utils';
import {
  ArrowLeft, MapPin, Calendar, Weight, Banknote, User, Phone,
  Star, ShieldCheck, Ban, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/components/shared/confirm-modal';

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: trip, isLoading, isError } = useQuery({
    queryKey: ['admin', 'trips', id],
    queryFn: () => adminApi.getTripById(id).then((r) => r.data.data),
    enabled: !!id,
  });

  const suspendMutation = useMutation({
    mutationFn: (reason: string) => adminApi.suspendTrip(id, reason),
    onSuccess: () => {
      toast.success('Trajet suspendu');
      qc.invalidateQueries({ queryKey: ['admin', 'trips'] });
      router.push('/trips');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Erreur lors de la suspension');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }
  if (isError || !trip) {
    return <p className="text-red-600 text-sm">Trajet introuvable.</p>;
  }

  const statusConf = tripStatusConfig[trip.status] || tripStatusConfig.ACTIVE;
  const canSuspend = trip.status === 'ACTIVE' || trip.status === 'FULL';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/trips" className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Trajets
        </Link>
        {canSuspend && (
          <button onClick={() => setConfirmOpen(true)} className="btn-danger text-sm py-2">
            <Ban className="h-4 w-4" />
            Suspendre ce trajet
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <MapPin className="h-5 w-5 text-brand-600" />
              {trip.originCity} <span className="text-gray-400">→</span> {trip.destinationCity}
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">{trip.id}</p>
          </div>
          <span className={cn('badge', statusConf.color)}>{statusConf.label}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <Field icon={Calendar} label="Date départ" value={formatDate(trip.departureDate)} />
          <Field icon={Weight} label="Capacité"
            value={`${trip.bookedKg}/${trip.availableKg} kg`} />
          <Field icon={Banknote} label="Prix/kg" value={formatFCFA(trip.pricePerKg)} />
          <Field icon={Calendar} label="Créé le" value={formatDateTime(trip.createdAt)} />
        </div>

        {(trip.originDetail || trip.destinationDetail || trip.description) && (
          <div className="pt-4 mt-4 border-t border-gray-100 space-y-2 text-sm text-gray-700">
            {trip.originDetail && <p><span className="text-gray-500">Lieu départ:</span> {trip.originDetail}</p>}
            {trip.destinationDetail && <p><span className="text-gray-500">Lieu arrivée:</span> {trip.destinationDetail}</p>}
            {trip.description && <p><span className="text-gray-500">Description:</span> {trip.description}</p>}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" /> Transporteur
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Link
              href={`/users?search=${encodeURIComponent(trip.carrier?.phone || '')}`}
              className="font-semibold text-gray-900 hover:text-brand-600"
            >
              {trip.carrier?.fullName}
            </Link>
            <p className="text-xs text-gray-400 font-mono flex items-center gap-1 mt-1">
              <Phone className="h-3 w-3" />{trip.carrier?.phone}
            </p>
            {trip.carrier?.email && (
              <p className="text-xs text-gray-400 mt-0.5">{trip.carrier.email}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-50 text-yellow-700">
              <Star className="h-3 w-3" />
              {trip.carrier?.rating?.toFixed(1) || '—'} ({trip.carrier?.ratingCount || 0})
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700">
              {trip.carrier?.totalTrips || 0} trajets
            </span>
            {trip.carrier?.cniVerified ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 text-green-700">
                <ShieldCheck className="h-3 w-3" />
                CNI vérifiée
              </span>
            ) : (
              <span className="px-2 py-1 rounded bg-gray-100 text-gray-600">CNI non vérifiée</span>
            )}
            {trip.carrier?.isBanned && (
              <span className="px-2 py-1 rounded bg-red-100 text-red-700">Banni</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            Réservations ({trip.bookings?.length || 0})
          </h3>
        </div>
        {!trip.bookings?.length ? (
          <p className="text-center py-8 text-sm text-gray-400">Aucune réservation</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">ID</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Expéditeur</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Poids</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Montant</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Paiement</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {trip.bookings.map((b: any) => {
                const conf = bookingStatusConfig[b.status] || bookingStatusConfig.PENDING;
                return (
                  <tr key={b.id}>
                    <td className="px-4 py-2 font-mono text-xs text-gray-400">{b.id.slice(-8)}</td>
                    <td className="px-4 py-2 text-xs text-gray-700">
                      {b.sender?.fullName}
                      <span className="text-gray-400 ml-1 font-mono">{b.sender?.phone}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600">{b.weightKg} kg</td>
                    <td className="px-4 py-2 text-xs font-semibold text-gray-900">
                      {formatFCFA(b.totalAmount)}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {b.payment ? (
                        <span className={cn('badge', {
                          'bg-yellow-100 text-yellow-700': b.payment.status === 'PENDING',
                          'bg-blue-100 text-blue-700': b.payment.status === 'HELD',
                          'bg-green-100 text-green-700': b.payment.status === 'RELEASED',
                          'bg-gray-100 text-gray-600': b.payment.status === 'REFUNDED',
                        })}>
                          {b.payment.status}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      <span className={cn('badge', conf.color)}>{conf.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Suspendre ce trajet ?"
        description="Le trajet passera en statut Annulé. Cette action est irréversible et notifie le transporteur."
        confirmLabel="Suspendre"
        destructive
        requireReason
        reasonPlaceholder="Raison de la suspension (visible dans les logs)…"
        onConfirm={async (reason) => { await suspendMutation.mutateAsync(reason); }}
      />
    </div>
  );
}

function Field({
  icon: Icon, label, value,
}: { icon: any; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <Icon className="h-3 w-3" />{label}
      </p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
