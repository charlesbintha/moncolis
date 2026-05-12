import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Injecter le token JWT dans chaque requête
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Rafraîchir le token automatiquement si expiré
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as any;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = Cookies.get('refresh_token');

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          Cookies.set('access_token', data.data.accessToken, { expires: 1 / 96 }); // 15min
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch {
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  },
);

// ─── API functions ────────────────────────────────────────────────────────────

export const authApi = {
  login: (phone: string, otpCode: string) =>
    api.post('/auth/login', { phone, otpCode }),
  sendLoginOtp: (phone: string) =>
    api.post('/auth/send-login-otp', { phone }),
};

export type TripFilters = {
  page?: number;
  limit?: number;
  status?: string;
  originCity?: string;
  destinationCity?: string;
  dateFrom?: string;
  dateTo?: string;
  carrierId?: string;
  search?: string;
};

export type ParcelFilters = {
  page?: number;
  limit?: number;
  status?: string;
  originCity?: string;
  destinationCity?: string;
  dateFrom?: string;
  dateTo?: string;
  senderId?: string;
  search?: string;
};

export type PaymentFilters = {
  page?: number;
  limit?: number;
  status?: string;
  method?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getDashboardCharts: () => api.get('/admin/dashboard/charts'),
  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/admin/users', { params }),
  getUserById: (id: string) => api.get(`/admin/users/${id}`),
  getPendingCni: (params?: { page?: number; limit?: number }) =>
    api.get('/admin/users/pending-cni', { params }),
  validateCni: (userId: string) => api.patch(`/admin/users/${userId}/validate-cni`),
  rejectCni: (userId: string, reason: string) =>
    api.patch(`/admin/users/${userId}/reject-cni`, { reason }),
  banUser: (userId: string, reason: string) =>
    api.patch(`/admin/users/${userId}/ban`, { reason }),
  unbanUser: (userId: string) => api.patch(`/admin/users/${userId}/unban`),
  getDisputes: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/admin/disputes', { params }),
  updateDisputeStatus: (id: string, status: string) =>
    api.patch(`/admin/disputes/${id}/status`, { status }),
  getBookings: (params?: { page?: number; limit?: number }) =>
    api.get('/admin/bookings', { params }),

  // Trips
  getTrips: (params?: TripFilters) => api.get('/admin/trips', { params }),
  getTripById: (id: string) => api.get(`/admin/trips/${id}`),
  suspendTrip: (id: string, reason: string) =>
    api.patch(`/admin/trips/${id}/suspend`, { reason }),

  // Parcels
  getParcels: (params?: ParcelFilters) => api.get('/admin/parcels', { params }),
  getParcelById: (id: string) => api.get(`/admin/parcels/${id}`),
  suspendParcel: (id: string, reason: string) =>
    api.patch(`/admin/parcels/${id}/suspend`, { reason }),

  // Payments
  getPayments: (params?: PaymentFilters) => api.get('/admin/payments', { params }),
  getPaymentsStats: () => api.get('/admin/payments/stats'),
};

export const disputesApi = {
  resolve: (id: string, data: { resolution: string; refundAmount?: number }) =>
    api.patch(`/disputes/${id}/resolve`, data),
};
