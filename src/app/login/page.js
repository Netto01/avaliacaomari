'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { dbService, isSupabaseConfigured } from '@/lib/supabaseClient';
import { LogIn, UserCheck, ShieldCheck, Database, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [crp, setCrp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (isRegistering) {
      const { data, error } = await dbService.signup(email, password, fullName, crp);
      setLoading(false);
      if (error) {
        setErrorMsg(error.message || 'Erro ao criar conta.');
      } else {
        router.push('/dashboard');
      }
    } else {
      const { data, error } = await dbService.login(email, password);
      setLoading(false);
      if (error) {
        setErrorMsg(error.message || 'E-mail ou senha inválidos.');
      } else {
        router.push('/dashboard');
      }
    }
  };

  const handleDemoAccess = async () => {
    setLoading(true);
    await dbService.login('avaliador@clinica.com.br', 'demo123');
    router.push('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)'
    }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="brand-icon" style={{ width: '54px', height: '54px', margin: '0 auto 14px', fontSize: '1.4rem' }}>
            AVN
          </div>
          <h1 style={{ fontSize: '1.6rem', color: 'var(--text-main)', marginBottom: '6px' }}>
            AVN
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Plataforma de Avaliação Neuropsicológica Online
          </p>
        </div>

        {errorMsg && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--accent-rose-light)',
            color: 'var(--accent-rose)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            fontSize: '0.88rem'
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth}>
          {isRegistering && (
            <>
              <div className="form-group">
                <label className="form-label">Nome Completo do Avaliador</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dr(a). Psicólogo(a)"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Registro Profissional (CRP / CRM)</label>
                <input
                  type="text"
                  placeholder="Ex: CRP 06/123456"
                  className="form-input"
                  value={crp}
                  onChange={(e) => setCrp(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">E-mail Profissional</label>
            <input
              type="email"
              required
              placeholder="seu.email@exemplo.com"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '10px' }}
          >
            {isRegistering ? (
              <><UserCheck size={18} /> {loading ? 'Cadastrando...' : 'Criar Conta'}</>
            ) : (
              <><LogIn size={18} /> {loading ? 'Entrando...' : 'Entrar na Plataforma'}</>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '18px' }}>
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 500
            }}
          >
            {isRegistering
              ? 'Já possui uma conta? Faça login aqui'
              : 'Novo avaliador? Cadastre-se gratuitamente'}
          </button>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '24px 0' }} />

        {/* Botão de Demonstração Rápida */}
        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            onClick={handleDemoAccess}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.9rem' }}
          >
            <ShieldCheck size={18} color="var(--accent-emerald)" /> Entrar em Modo Demonstração Rápida <ArrowRight size={16} />
          </button>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            {isSupabaseConfigured
              ? 'Conexão ativa com o banco Supabase'
              : 'Permite testar e usar todas as funções antes de conectar o banco.'}
          </div>
        </div>
      </div>
    </div>
  );
}
