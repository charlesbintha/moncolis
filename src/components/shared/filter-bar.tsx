'use client';

import { Search, X } from 'lucide-react';
import { ReactNode } from 'react';

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  onReset?: () => void;
  hasFilters?: boolean;
  children?: ReactNode;
};

export function FilterBar({
  search, onSearchChange, searchPlaceholder = 'Rechercher…',
  onReset, hasFilters, children,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
        />
      </div>
      {children}
      {hasFilters && onReset && (
        <button
          onClick={onReset}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <X className="h-3 w-3" />
          Réinitialiser
        </button>
      )}
    </div>
  );
}

export function FilterSelect({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function FilterDate({
  value, onChange, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      title={placeholder}
      className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
    />
  );
}
