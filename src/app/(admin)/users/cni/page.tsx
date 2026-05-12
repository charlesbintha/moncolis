'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
import { CheckCircle2, XCircle, Eye, Loader2, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CniValidationPage() {
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [preview, setPreview] = useState<{ front: string; back: string; name: string } | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'cni-pending'],
    queryFn: () => adminApi.getPendingCni({ page: 1, limit: 50 }).then((r) => r.data.data),
  });

  const validateMutation = useMutation({
    mutationFn: (userId: string) => adminApi.validateCni(userId),
    onSuccess: () => {
      toast.success('CNI validée avec succès ✓');
      queryClient.invalidateQueries({ queryKey: ['admin', 'cni-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => toast.error('Erreur lors de la validation'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.rejectCni(id, reason),
    onSuccess: () => {
      toast.success('CNI rejetée');
      queryClient.invalidateQueries({ queryKey: ['admin', 'cni-pending'] });
      setRejectModal(null);
      setRejectReason('');
    },
    onError: () => toast.error('Erreur lors du rejet'),
  });

  const users = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Validation des CNI</h1>
        <p className="text-gray-500 text-sm mt-1">
          {users.length} pièce(s) d'identité en attente de vérification
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center shadow-sm">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Toutes les CNI ont été traitées !</p>
          <p className="text-gray-400 text-sm mt-1">Aucune pièce en attente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {users.map((user: any) => (
            <div key={user.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* En-tête utilisateur */}
              <div className="p-4 border-b border-gray-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
                  {user.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{user.fullName}</p>
                  <p className="text-gray-400 text-xs font-mono">{user.phone}</p>
                </div>
                <span className="text-xs text-gray-400">{timeAgo(user.createdAt)}</span>
              </div>

              {/* Photos CNI */}
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Recto</p>
                  {user.cniFrontUrl ? (
                    <img src={user.cniFrontUrl} alt="CNI recto" className="w-full h-28 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setPreview({ front: user.cniFrontUrl, back: user.cniBackUrl, name: user.fullName })} />
                  ) : (
                    <div className="w-full h-28 bg-gray-100 rounded-lg flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Verso</p>
                  {user.cniBackUrl ? (
                    <img src={user.cniBackUrl} alt="CNI verso" className="w-full h-28 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setPreview({ front: user.cniFrontUrl, back: user.cniBackUrl, name: user.fullName })} />
                  ) : (
                    <div className="w-full h-28 bg-gray-100 rounded-lg flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={() => setPreview({ front: user.cniFrontUrl, back: user.cniBackUrl, name: user.fullName })}
                  className="btn-secondary flex-1 text-xs py-2"
                >
                  <Eye className="h-3.5 w-3.5" /> Agrandir
                </button>
                <button
                  onClick={() => setRejectModal({ id: user.id, name: user.fullName })}
                  className="btn-danger px-3 py-2 text-xs"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => validateMutation.mutate(user.id)}
                  disabled={validateMutation.isPending}
                  className="btn-primary px-3 py-2 text-xs bg-green-600 hover:bg-green-700"
                >
                  {validateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal aperçu */}
      {preview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">CNI — {preview.name}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Recto</p>
                <img src={preview.front} alt="Recto" className="w-full rounded-lg border" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Verso</p>
                <img src={preview.back} alt="Verso" className="w-full rounded-lg border" />
              </div>
            </div>
            <button onClick={() => setPreview(null)} className="btn-secondary w-full mt-4">Fermer</button>
          </div>
        </div>
      )}

      {/* Modal rejet */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Rejeter la CNI</h3>
            <p className="text-sm text-gray-500 mb-4">Précisez la raison du rejet pour <strong>{rejectModal.name}</strong></p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Photo floue, document expiré, mauvais document..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason })}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="btn-danger flex-1"
              >
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
