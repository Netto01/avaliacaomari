'use client';

import { useState } from 'react';
import { dbService } from '@/lib/supabaseClient';
import { X, UserPlus, Check } from 'lucide-react';

export default function PatientModal({ isOpen, onClose, onPatientSaved }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    birth_date: '',
    gender: 'M',
    education_level: '3º ano EF',
    school_type: 'Privada',
    handedness: 'Destro',
    clinical_notes: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.birth_date) {
      alert('Por favor, informe o nome completo e data de nascimento.');
      return;
    }

    setLoading(true);
    const { data, error } = await dbService.createPatient(formData);
    setLoading(false);

    if (error) {
      alert('Erro ao salvar paciente: ' + (error.message || 'Tente novamente.'));
    } else {
      if (onPatientSaved) onPatientSaved(data);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={22} color="var(--primary)" /> Cadastrar Novo Paciente
          </h2>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome Completo do Paciente *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="Ex: Lucas Gabriel da Silva"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Data de Nascimento *</label>
              <input
                type="date"
                required
                className="form-input"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sexo</label>
              <select
                className="form-select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Escolaridade Atual</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: 3º ano EF"
                value={formData.education_level}
                onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Escola</label>
              <select
                className="form-select"
                value={formData.school_type}
                onChange={(e) => setFormData({ ...formData, school_type: e.target.value })}
              >
                <option value="Privada">Privada</option>
                <option value="Pública">Pública</option>
                <option value="Outra">Outra</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Dominância Manual (Lateralidade)</label>
            <select
              className="form-select"
              value={formData.handedness}
              onChange={(e) => setFormData({ ...formData, handedness: e.target.value })}
            >
              <option value="Destro">Destro</option>
              <option value="Canhoto">Canhoto</option>
              <option value="Ambidestro">Ambidestro</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Observações Clínicas / Queixa Principal</label>
            <textarea
              rows={3}
              className="form-textarea"
              placeholder="Ex: Queixa de desatenção relatada pela escola..."
              value={formData.clinical_notes}
              onChange={(e) => setFormData({ ...formData, clinical_notes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              <Check size={18} /> {loading ? 'Salvando...' : 'Salvar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
