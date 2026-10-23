'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dbService } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const fallbackTimer = setTimeout(() => {
      if (active) router.replace('/login');
    }, 2500);

    dbService.getCurrentUser()
      .then((user) => {
        if (!active) return;
        clearTimeout(fallbackTimer);
        if (user) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      })
      .catch((err) => {
        console.warn('Erro ao obter usuário inicial:', err);
        if (active) {
          clearTimeout(fallbackTimer);
          router.replace('/login');
        }
      });

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
    };
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div className="brand-icon" style={{ width: '48px', height: '48px', fontSize: '1.2rem' }}>AVN</div>
      <p style={{ color: 'var(--text-secondary)' }}>Carregando plataforma de avaliação...</p>
    </div>
  );
}
