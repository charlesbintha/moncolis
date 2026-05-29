import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formate un montant en FCFA */
export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formate une date en français */
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy', { locale: fr });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy à HH:mm', { locale: fr });
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
}

/** Couleurs par statut de réservation */
export const bookingStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING:       { label: 'En attente',    color: 'bg-yellow-100 text-yellow-800' },
  ACCEPTED:      { label: 'Acceptée',      color: 'bg-blue-100 text-blue-800' },
  REFUSED:       { label: 'Refusée',       color: 'bg-red-100 text-red-800' },
  PARCEL_HANDED: { label: 'Colis remis',   color: 'bg-purple-100 text-purple-800' },
  IN_TRANSIT:    { label: 'En transit',    color: 'bg-indigo-100 text-indigo-800' },
  DELIVERED:     { label: 'Livré',         color: 'bg-teal-100 text-teal-800' },
  CONFIRMED:     { label: 'Confirmé',      color: 'bg-green-100 text-green-800' },
  DISPUTED:      { label: 'Litige',        color: 'bg-orange-100 text-orange-800' },
  CANCELLED:     { label: 'Annulé',        color: 'bg-gray-100 text-gray-600' },
};

export const disputeStatusConfig: Record<string, { label: string; color: string }> = {
  OPEN:         { label: 'Ouvert',         color: 'bg-red-100 text-red-800' },
  UNDER_REVIEW: { label: 'En révision',    color: 'bg-yellow-100 text-yellow-800' },
  RESOLVED:     { label: 'Résolu',         color: 'bg-green-100 text-green-800' },
};

export const userRoleConfig: Record<string, { label: string; color: string }> = {
  SENDER:  { label: 'Expéditeur',   color: 'bg-blue-100 text-blue-800' },
  CARRIER: { label: 'Transporteur', color: 'bg-green-100 text-green-800' },
  BOTH:    { label: 'Les deux',     color: 'bg-purple-100 text-purple-800' },
  ADMIN:   { label: 'Admin',        color: 'bg-red-100 text-red-800' },
};

export const tripStatusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE:    { label: 'Active',    color: 'bg-green-100 text-green-800' },
  FULL:      { label: 'Complète',  color: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Terminée',  color: 'bg-gray-100 text-gray-700' },
  CANCELLED: { label: 'Annulée',   color: 'bg-red-100 text-red-800' },
};

export const parcelStatusConfig: Record<string, { label: string; color: string }> = {
  OPEN:      { label: 'Ouvert',    color: 'bg-yellow-100 text-yellow-800' },
  MATCHED:   { label: 'Matché',    color: 'bg-blue-100 text-blue-800' },
  BOOKED:    { label: 'Réservé',   color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Annulé',    color: 'bg-red-100 text-red-800' },
};

export const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING:  { label: 'En attente',     color: 'bg-yellow-100 text-yellow-800' },
  HELD:     { label: 'En séquestre',   color: 'bg-blue-100 text-blue-800' },
  RELEASED: { label: 'Versé',          color: 'bg-green-100 text-green-800' },
  REFUNDED: { label: 'Remboursé',      color: 'bg-gray-100 text-gray-700' },
};

export const paymentMethodConfig: Record<string, { label: string }> = {
  WAVE:         { label: 'Wave' },
  ORANGE_MONEY: { label: 'Orange Money' },
  CARD:         { label: 'Carte' },
};

/** Villes principales du Sénégal (filtres) */
export const SENEGAL_CITIES = [
  'Dakar', 'Thiès', 'Touba', 'Saint-Louis', 'Ziguinchor', 'Kaolack',
  'Mbour', 'Diourbel', 'Rufisque', 'Tambacounda', 'Louga', 'Kolda',
  'Fatick', 'Matam', 'Kaffrine', 'Sédhiou', 'Kédougou',
];
