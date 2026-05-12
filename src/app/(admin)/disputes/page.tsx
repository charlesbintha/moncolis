'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { formatDate, formatFCFA, disputeStatusConfig, bookingStatusConfig, cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Loader2, Scale, Eye, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

export default function DisputesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [resolveModal, setResolveModal] = useState<any | null>(null);
  const [resolution, setResolution] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundType, setRefundType] = useState<'full' | 'partial' | 'none'>('full');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'disputes', page, statusFilter],
    queryFn: () =>
      adminApi.getDisputes({ page, limit: 20, status: statusFilter || undefined })
        .then((r) => r.data),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/disputes/${id}/resolve`, data),
    onSuccess: () => {
      toast.success('Litige résolu');
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      setResolveModal(null);
      setResolution('');
      setRefundAmount('');
    },
    onError: () => toast.error('Erreur lors de la résolution'),
  });

  const handleResolve = () => {
    if (!resolveModal || !resolution.trim()) return;

    let refund: number | undefined;
    if (refundType === 'full') refund = undefined;
    else if (refundType === 'partial') refund = parseInt(refundAmount) || 0;
    else refund = 0;

    resolveMutation.mutate({
      id: resolveModal.id,
      data: { resolution, refundAmount: refund },
    });
  };

  const disputes = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Litiges</h1>
          <p className="text-gray-500 text-sm mt-1">{pagination?.total || 0} litige(s) au total</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Tous les statuts</option>
            <option value="OPEN">Ouverts</option>
            <option value="UNDER_REVIEW">En révision</option>
            <option value="RESOLVED">Résolus</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
          </div>
        ) : disputes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
            <Scale className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun litige {statusFilter ? 'avec ce statut' : ''}</p>
          </div>
        ) : (
          disputes.map((dispute: any) => {
            const statusConf = disputeStatusConfig[dispute.status] || disputeStatusConfig.OPEN;
            const isResolved = dispute.status === 'RESOLVED';

            return (
              <div key={dispute.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 rounded-lg', isResolved ? 'bg-green-50' : 'bg-red-50')}>
                        {isResolved
                          ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                          : <AlertTriangle className="h-5 w-5 text-red-600" />
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('badge', statusConf.color)}>{statusConf.label}</span>
                          <span className="text-xs text-gray-400">#{dispute.id.slice(-8)}</span>
                          <span className="text-xs text-gray-400">{formatDate(dispute.createdAt)}</span>
                        </div>
                        <p className="font-semibold text-gray-900 mt-1">{dispute.reason}</p>
                        {dispute.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{dispute.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">Montant réservation</p>
                      <p className="font-bold text-gray-900">{formatFCFA(dispute.booking?.totalAmount || 0)}</p>
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 font-medium">Expéditeur</p>
                      <p className="text-sm font-medium text-gray-900">{dispute.booking?.sender?.fullName}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400 font-medium">Transporteur</p>
                      <p className="text-sm font-medium text-gray-900">{dispute.booking?.carrier?.fullName}</p>
                    </div>
                  </div>

                  {/* Trajet */}
                  {dispute.booking?.trip && (
                    <p className="text-xs text-gray-400 mt-3">
                      Trajet : {dispute.booking.trip.originCity} → {dispute.booking.trip.destinationCity}
                    </p>
                  )}

                  {/* Preuves */}
                  {dispute.evidenceUrls?.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {dispute.evidenceUrls.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity">
                          <img src={url} alt={`Preuve ${i + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Résolution existante */}
                  {isResolved && dispute.resolution && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-green-700 mb-1">Décision de l'admin :</p>
                      <p className="text-sm text-green-900">{dispute.resolution}</p>
                      {dispute.refundAmount !== null && dispute.refundAmount !== undefined && (
                        <p className="text-xs text-green-700 mt-1">
                          Remboursement : {dispute.refundAmount === 0 ? 'Aucun' : formatFCFA(dispute.refundAmount)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!isResolved && (
                  <div className="px-5 pb-5 flex gap-2">
                    <button
                      onClick={() => adminApi.updateDisputeStatus(dispute.id, 'UNDER_REVIEW').then(() => {
                        queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
                        toast.success('Litige passé en révision');
                      })}
                      disabled={dispute.status === 'UNDER_REVIEW'}
                      className="btn-secondary text-xs disabled:opacity-40"
                    >
                      Prendre en charge
                    </button>
                    <button
                      onClick={() => setResolveModal(dispute)}
                      className="btn-primary text-xs"
                    >
                      <Scale className="h-3.5 w-3.5" />
                      Résoudre le litige
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <button disabled={!pagination.hasPreviousPage} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs disabled:opacity-40">Précédent</button>
          <button disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs disabled:opacity-40">Suivant</button>
        </div>
      )}

      {/* Modal résolution */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Résoudre le litige</h3>
            <p className="text-sm text-gray-500 mb-5">
              Montant en jeu : <strong>{formatFCFA(resolveModal.booking?.totalAmount || 0)}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Décision / Résolution *</label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Décrivez votre décision et les raisons..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Remboursement</label>
                <div className="space-y-2">
                  {(['full', 'partial', 'none'] as const).map((type) => (
                    <label key={type} className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="refund" checked={refundType === type} onChange={() => setRefundType(type)} className="text-brand-600" />
                      <span className="text-sm text-gray-700">
                        {type === 'full' ? '✅ Remboursement total' : type === 'partial' ? '⚠️ Remboursement partiel' : '❌ Aucun remboursement'}
                      </span>
                    </label>
                  ))}
                </div>
                {refundType === 'partial' && (
                  <div className="mt-3">
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="Montant en FCFA"
                      max={resolveModal.booking?.totalAmount}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setResolveModal(null); setResolution(''); setRefundAmount(''); }} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={handleResolve}
                disabled={!resolution.trim() || resolveMutation.isPending}
                className="btn-primary flex-1"
              >
                {resolveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
                Confirmer la décision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
