'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { Package, Loader2, Phone, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.sendLoginOtp(phone);
      toast.success('Code OTP envoyé par SMS');
      setStep('otp');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi du SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.login(phone, otpCode);
      const { accessToken, refreshToken, user } = data.data;

      if (user.role !== 'ADMIN') {
        toast.error('Accès réservé aux administrateurs');
        return;
      }

      Cookies.set('access_token', accessToken, { expires: 1 / 96 }); // 15 min
      Cookies.set('refresh_token', refreshToken, { expires: 30 });
      Cookies.set('user', JSON.stringify(user), { expires: 30 });

      toast.success(`Bienvenue, ${user.fullName} !`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Code incorrect ou expiré');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <Package className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">ColiSN Admin</h1>
          <p className="text-brand-200 mt-1">Tableau de bord administrateur</p>
        </div>

        {/* Carte de connexion */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {step === 'phone' ? 'Connexion' : 'Vérification OTP'}
          </h2>

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+221771234567"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Envoyer le code OTP
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <p className="text-sm text-gray-600">
                Code envoyé au <strong>{phone}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code OTP (6 chiffres)
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-center text-2xl tracking-widest font-mono"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading || otpCode.length !== 6}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Se connecter
              </button>
              <button type="button" onClick={() => { setStep('phone'); setOtpCode(''); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 text-center">
                ← Changer de numéro
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-brand-200 text-sm mt-6">
          ColiSN © {new Date().getFullYear()} — Accès réservé aux administrateurs
        </p>
      </div>
    </div>
  );
}
