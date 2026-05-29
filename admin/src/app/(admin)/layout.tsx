import { Sidebar } from '@/components/layout/sidebar';
import { AuthGuard } from '@/components/providers/auth-guard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
