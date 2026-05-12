'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  page: number;
  totalPages?: number;
  hasNext: boolean;
  onChange: (page: number) => void;
};

export function Pagination({ page, totalPages, hasNext, onChange }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-500">
        Page {page}{totalPages ? ` sur ${totalPages}` : ''}
      </p>
      <div className="flex gap-2">
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="btn-secondary text-xs py-1.5 disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Précédent
        </button>
        <button
          disabled={!hasNext}
          onClick={() => onChange(page + 1)}
          className="btn-secondary text-xs py-1.5 disabled:opacity-40"
        >
          Suivant
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
