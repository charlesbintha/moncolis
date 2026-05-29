'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { formatDate, userRoleConfig, cn } from '@/lib/utils';
import { Search, Shield, ShieldOff, Eye, Star, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [banModal, setBanModal] = useState<{ id: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: () => adminApi.getUsers({ page, limit: 20, search: search || undefined }).then((r) => r.data),
  });

  const banMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.banUser(id, reason),
    onSuccess: () => {
      toast.success('Utilisateur banni');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setBanModal(null);
      setBanReason('');
    },
    onError: () => toast.error('Erreur lors du bannissement'),
  });

  const unbanMutation = useMutation({
    mutationFn: (id: string) => adminApi.unbanUser(id),
    onSuccess: () => {
      toast.success('Utilisateur débanni');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => toast.error('Erreur'),
  });

  const users = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-500 text-sm mt-1">{pagination?.total || 0} utilisateurs inscrits</p>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, téléphone, email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Utilisateur</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Téléphone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rôle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">CNI</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Note</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Inscrit le</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                users.map((user: any) => {
                  const roleConf = userRoleConfig[user.role] || userRoleConfig.SENDER;
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs flex-shrink-0">
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.fullName}</p>
                            {user.email && <p className="text-xs text-gray-400">{user.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700">{user.phone}</td>
                      <td className="px-4 py-3">
                        <span className={cn('badge', roleConf.color)}>{roleConf.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {user.cniVerified ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Validée
                          </span>
                        ) : user.cniFrontUrl ? (
                          <a href={`/users/cni`} className="text-amber-600 text-xs font-medium hover:underline">
                            En attente
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs">Non soumise</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.ratingCount > 0 ? (
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            <span className="text-gray-700 text-xs font-medium">{user.rating.toFixed(1)}</span>
                            <span className="text-gray-400 text-xs">({user.ratingCount})</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        {user.isBanned ? (
                          <span className="badge bg-red-100 text-red-700">Banni</span>
                        ) : (
                          <span className="badge bg-green-100 text-green-700">Actif</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <a href={`/users/${user.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors" title="Voir le profil">
                            <Eye className="h-4 w-4" />
                          </a>
                          {user.isBanned ? (
                            <button onClick={() => unbanMutation.mutate(user.id)} title="Débannir"
                              className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors">
                              <Shield className="h-4 w-4" />
                            </button>
                          ) : (
                            <button onClick={() => setBanModal({ id: user.id, name: user.fullName })} title="Bannir"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                              <ShieldOff className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Page {pagination.page} sur {pagination.totalPages} — {pagination.total} résultats
            </p>
            <div className="flex gap-2">
              <button disabled={!pagination.hasPreviousPage} onClick={() => setPage(p => p - 1)}
                className="btn-secondary text-xs py-1.5 disabled:opacity-40">
                Précédent
              </button>
              <button disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}
                className="btn-secondary text-xs py-1.5 disabled:opacity-40">
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal bannissement */}
      {banModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Bannir l'utilisateur</h3>
            <p className="text-gray-500 text-sm mb-4">
              Bannir <strong>{banModal.name}</strong> ? Cette action empêchera toute connexion.
            </p>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Raison du bannissement (obligatoire)..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setBanModal(null); setBanReason(''); }} className="btn-secondary flex-1">
                Annuler
              </button>
              <button
                onClick={() => banMutation.mutate({ id: banModal.id, reason: banReason })}
                disabled={!banReason.trim() || banMutation.isPending}
                className="btn-danger flex-1"
              >
                Confirmer le bannissement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
