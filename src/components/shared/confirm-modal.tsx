'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  requireReason?: boolean;
  reasonPlaceholder?: string;
  onConfirm: (reason: string) => Promise<void> | void;
  destructive?: boolean;
};

export function ConfirmModal({
  open, onOpenChange, title, description,
  confirmLabel = 'Confirmer',
  requireReason = false,
  reasonPlaceholder = 'Raison…',
  onConfirm,
  destructive = false,
}: Props) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (requireReason && reason.trim().length < 3) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-md bg-white rounded-xl shadow-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className={`p-2 rounded-lg flex-shrink-0 ${destructive ? 'bg-red-50' : 'bg-amber-50'}`}>
              <AlertTriangle className={`h-5 w-5 ${destructive ? 'text-red-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <Dialog.Title className="text-base font-semibold text-gray-900">{title}</Dialog.Title>
              <Dialog.Description className="text-sm text-gray-500 mt-1">{description}</Dialog.Description>
            </div>
          </div>

          {requireReason && (
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 mb-4"
            />
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="btn-secondary text-sm py-2"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting || (requireReason && reason.trim().length < 3)}
              className={`text-sm py-2 ${destructive ? 'btn-danger' : 'btn-primary'} disabled:opacity-50`}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
