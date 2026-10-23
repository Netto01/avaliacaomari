'use client';

import React from 'react';
import { AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';

export default function DeleteSessionModal({
  isOpen,
  onClose,
  onConfirm,
  session,
  isDeleting
}) {
  if (!isOpen || !session) return null;

  const patientName = session.patients?.full_name || 'Paciente';
  const testDate = new Date(session.applied_at || session.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const isDone = session.status === 'concluido';

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 60 }}>
      <div
        className="modal-content"
        style={{ maxWidth: '480px', padding: '28px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'var(--accent-rose-light)',
            color: 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Trash2 size={24} />
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text-main)' }}>
          Excluir Teste da Paciente?
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '20px' }}>
          Esta ação é <strong>irreversível</strong>. Todos os escores psicométricos, histórico de cliques e o relatório desta sessão serão permanentemente removidos.
        </p>

        {/* Resumo da Aplicação */}
        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          marginBottom: '20px',
          fontSize: '0.88rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Paciente:</span>
            <strong style={{ color: 'var(--text-main)' }}>{patientName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Data da Aplicação:</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{testDate}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
            <span className={`badge ${isDone ? 'badge-emerald' : 'badge-amber'}`}>
              {isDone ? 'Concluído' : 'Em Andamento'}
            </span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.82rem',
          color: 'var(--accent-teal)',
          background: 'var(--secondary-light)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '24px'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>O cadastro e ficha da paciente permanecem intactos no sistema.</span>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Trash2 size={16} />
            {isDeleting ? 'Excluindo...' : 'Sim, Excluir Teste'}
          </button>
        </div>
      </div>
    </div>
  );
}
