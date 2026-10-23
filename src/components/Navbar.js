'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { dbService, isSupabaseConfigured } from '@/lib/supabaseClient';
import { Activity, Users, FileText, LogOut, Database, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    dbService.getCurrentUser().then(setUser);
  }, []);

  const handleLogout = async () => {
    await dbService.logout();
    router.push('/login');
  };

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <Link href="/dashboard" className="brand">
          <div className="brand-icon">AVN</div>
          <span>AVN</span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            href="/dashboard"
            className={`btn btn-sm ${pathname === '/dashboard' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Activity size={16} /> Dashboard
          </Link>
          <Link
            href="/dashboard/pacientes"
            className={`btn btn-sm ${pathname.startsWith('/dashboard/pacientes') ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Users size={16} /> Pacientes
          </Link>
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Status da conexão com Supabase */}
        {isSupabaseConfigured ? (
          <span className="badge badge-emerald" title="Conectado ao Supabase">
            <CheckCircle2 size={13} /> Supabase Ativo
          </span>
        ) : (
          <span className="badge badge-amber" title="Configuração pendente em .env.local">
            <Database size={13} /> Modo Local (Demo)
          </span>
        )}

        <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          {user?.user_metadata?.full_name || user?.email || 'Avaliador(a)'}
        </div>

        <button onClick={handleLogout} className="btn btn-secondary btn-sm" title="Sair do Sistema">
          <LogOut size={16} /> Sair
        </button>
      </div>
    </header>
  );
}
