'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import PatientModal from '@/components/PatientModal';
import { dbService } from '@/lib/supabaseClient';
import { calculateAge } from '@/lib/norms';
import { Users, UserPlus, Search, PlayCircle, Calendar, GraduationCap, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PacientesPage() {
  const router = useRouter();
  const [patients, setPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const { data } = await dbService.getPatients();
      setPatients(data || []);
    } catch (e) {
      console.error('Erro ao carregar pacientes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleStartTest = async (patientId) => {
    const { data: session, error } = await dbService.createSession(patientId);
    if (error) {
      alert('Erro ao iniciar teste: ' + error.message);
      return;
    }
    router.push(`/teste/tac/${session.id}`);
  };

  const filteredPatients = patients.filter(p =>
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.education_level?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Navbar />

      <main className="app-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Link href="/dashboard" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                <ArrowLeft size={16} /> Voltar ao Painel
              </Link>
            </div>
            <h1 style={{ fontSize: '1.75rem' }}>Gerenciamento de Pacientes</h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Cadastre pacientes e acompanhe o histórico de avaliações neuropsicológicas
            </p>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            <UserPlus size={18} /> Novo Paciente
          </button>
        </div>

        {/* Barra de Pesquisa */}
        <div className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Search size={20} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar por nome ou escolaridade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: '0.95rem',
                background: 'transparent'
              }}
            />
          </div>
        </div>

        {/* Lista de Pacientes */}
        <div className="card">
          {filteredPatients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>{searchQuery ? 'Nenhum paciente encontrado com essa busca.' : 'Nenhum paciente cadastrado.'}</p>
              {!searchQuery && (
                <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>
                  Cadastrar Primeiro Paciente
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '12px 16px' }}>Nome do Paciente</th>
                    <th style={{ padding: '12px 16px' }}>Idade</th>
                    <th style={{ padding: '12px 16px' }}>Escolaridade</th>
                    <th style={{ padding: '12px 16px' }}>Tipo de Escola</th>
                    <th style={{ padding: '12px 16px' }}>Lateralidade</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => {
                    const ageInfo = calculateAge(patient.birth_date);
                    return (
                      <tr key={patient.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                          {patient.full_name}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                          {ageInfo.formatted}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                          {patient.education_level || '--'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span className={`badge ${patient.school_type === 'Privada' ? 'badge-indigo' : 'badge-emerald'}`}>
                            {patient.school_type || 'Geral'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                          {patient.handedness || 'Destro'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleStartTest(patient.id)}
                            className="btn btn-primary btn-sm"
                            title="Iniciar Teste de Atenção por Cancelamento"
                          >
                            <PlayCircle size={15} /> Iniciar TAC
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <PatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPatientSaved={fetchPatients}
      />
    </>
  );
}
