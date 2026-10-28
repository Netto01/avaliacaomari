'use client';

import { useState } from 'react';
import { dbService } from '@/lib/supabaseClient';

export default function PatientModal({ isOpen, onClose, onPatientSaved }) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [birthDateInput, setBirthDateInput] = useState('');
  const [gender, setGender] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [schoolType, setSchoolType] = useState('Pública');
  const [handedness, setHandedness] = useState('Destro');
  const [clinicalNotes, setClinicalNotes] = useState('');

  if (!isOpen) return null;

  // Máscara automática para dd/mm/aaaa
  const handleBirthDateChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (val.length >= 5) {
      val = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
    } else if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setBirthDateInput(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      alert('Por favor, informe o nome completo do paciente.');
      return;
    }

    if (!birthDateInput.trim()) {
      alert('Por favor, informe a data de nascimento.');
      return;
    }

    // Validação e conversão de dd/mm/aaaa para yyyy-mm-dd
    let formattedBirthDate = birthDateInput.trim();
    if (formattedBirthDate.includes('/')) {
      const parts = formattedBirthDate.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        const dia = parts[0].padStart(2, '0');
        const mes = parts[1].padStart(2, '0');
        const ano = parts[2];
        formattedBirthDate = `${ano}-${mes}-${dia}`;
      } else {
        alert('Por favor, informe a data no formato dd/mm/aaaa válido.');
        return;
      }
    }

    setLoading(true);
    const payload = {
      full_name: fullName.trim(),
      birth_date: formattedBirthDate,
      gender: gender === 'Feminino' ? 'F' : gender === 'Masculino' ? 'M' : gender || 'Outro',
      education_level: educationLevel.trim() || 'Geral',
      school_type: schoolType,
      handedness: handedness,
      clinical_notes: clinicalNotes.trim()
    };

    try {
      const { data, error } = await dbService.createPatient(payload);
      if (error) {
        alert('Erro ao salvar paciente: ' + (error.message || 'Tente novamente.'));
      } else {
        // Reset do formulário
        setFullName('');
        setBirthDateInput('');
        setGender('');
        setEducationLevel('');
        setSchoolType('Pública');
        setHandedness('Destro');
        setClinicalNotes('');

        if (onPatientSaved) onPatientSaved(data);
        onClose();
      }
    } catch (err) {
      alert('Erro inesperado: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20, 30, 21, 0.48)',
        backdropFilter: 'blur(2px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="modal-novo"
        style={{
          width: '640px',
          maxWidth: 'calc(100% - 32px)',
          padding: 0,
          border: 0,
          borderRadius: '14px',
          background: '#ffffff',
          color: '#28352c',
          boxShadow: '0 12px 32px rgba(27, 38, 28, 0.16)',
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Cabeçalho do Modal */}
        <header style={{ display: 'flex', alignSelf: 'stretch', alignItems: 'flex-start', gap: '16px', padding: '24px 24px 20px', borderBottom: '1px solid #d6dccd' }}>
          <span aria-hidden="true" style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '8px', background: '#dafeaa', color: '#22512a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </svg>
          </span>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h2 id="titulo-modal" style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontSize: '22px', lineHeight: '28px', fontWeight: 560 }}>
              Novo paciente
            </h2>
            <p id="desc-modal" style={{ margin: 0, fontSize: '14px', lineHeight: '20px', color: '#566152' }}>
              Os dados ficam na ficha e entram nos relatórios dos testes. Campos com <span style={{ color: '#a8261d', fontWeight: 600 }}>*</span> são obrigatórios.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              border: 0,
              background: 'transparent',
              width: '44px',
              height: '44px',
              flexShrink: 0,
              borderRadius: '8px',
              color: '#28352c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        {/* Formulário */}
        <form
          id="form-novo"
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            padding: '24px',
            maxHeight: 'calc(85vh - 160px)',
            overflowY: 'auto'
          }}
        >
          {/* Fieldset: Identificação */}
          <fieldset style={{ margin: 0, padding: 0, border: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <legend style={{ padding: 0, marginBottom: '12px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#566152' }}>
              Identificação
            </legend>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="nome" style={{ fontSize: '13px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em' }}>
                Nome completo <span style={{ color: '#a8261d' }} aria-hidden="true">*</span>
              </label>
              <input
                id="nome"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex.: Lucas Gabriel da Silva"
                style={{
                  boxSizing: 'border-box',
                  width: '100%',
                  minHeight: '44px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #7d8775',
                  background: '#ffffff',
                  fontFamily: 'inherit',
                  fontSize: '15px',
                  color: '#28352c',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="nasc" style={{ fontSize: '13px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em' }}>
                  Data de nascimento <span style={{ color: '#a8261d' }} aria-hidden="true">*</span>
                </label>
                <input
                  id="nasc"
                  type="text"
                  inputMode="numeric"
                  required
                  value={birthDateInput}
                  onChange={handleBirthDateChange}
                  placeholder="dd/mm/aaaa"
                  aria-describedby="idade"
                  style={{
                    boxSizing: 'border-box',
                    width: '100%',
                    minHeight: '44px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #7d8775',
                    background: '#ffffff',
                    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                    fontSize: '15px',
                    color: '#28352c',
                    outline: 'none'
                  }}
                />
                <span id="idade" style={{ fontSize: '12px', lineHeight: '16px', color: '#566152' }}>
                  A idade é calculada na data de cada aplicação.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="sexo" style={{ fontSize: '13px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em' }}>
                  Sexo
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    id="sexo"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={{
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      boxSizing: 'border-box',
                      width: '100%',
                      minHeight: '44px',
                      padding: '10px 40px 10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #7d8775',
                      background: '#ffffff',
                      fontFamily: 'inherit',
                      fontSize: '15px',
                      color: gender ? '#28352c' : '#566152',
                      outline: 'none'
                    }}
                  >
                    <option value="">Selecione</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                  </select>
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#28352c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: '12px', top: '13px', pointerEvents: 'none' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Fieldset: Escolaridade e lateralidade */}
          <fieldset style={{ margin: 0, padding: 0, border: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <legend style={{ padding: 0, marginBottom: '12px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#566152' }}>
              Escolaridade e lateralidade
            </legend>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="escol" style={{ fontSize: '13px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em' }}>
                  Escolaridade atual
                </label>
                <input
                  id="escol"
                  type="text"
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value)}
                  placeholder="Ex.: 3º ano do Ensino Fundamental"
                  style={{
                    boxSizing: 'border-box',
                    width: '100%',
                    minHeight: '44px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #7d8775',
                    background: '#ffffff',
                    fontFamily: 'inherit',
                    fontSize: '15px',
                    color: '#28352c',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span id="lbl-escola" style={{ fontSize: '13px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em' }}>
                  Tipo de escola
                </span>
                <div role="radiogroup" aria-labelledby="lbl-escola" style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={schoolType === 'Pública'}
                    onClick={() => setSchoolType('Pública')}
                    style={{
                      flex: 1,
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: schoolType === 'Pública' ? '1px solid #2f6b31' : '1px solid #7d8775',
                      background: schoolType === 'Pública' ? '#dafeaa' : '#ffffff',
                      color: schoolType === 'Pública' ? '#22512a' : '#28352c',
                      fontSize: '14px',
                      fontWeight: schoolType === 'Pública' ? 600 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    Pública
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={schoolType === 'Privada'}
                    onClick={() => setSchoolType('Privada')}
                    style={{
                      flex: 1,
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: schoolType === 'Privada' ? '1px solid #2f6b31' : '1px solid #7d8775',
                      background: schoolType === 'Privada' ? '#dafeaa' : '#ffffff',
                      color: schoolType === 'Privada' ? '#22512a' : '#28352c',
                      fontSize: '14px',
                      fontWeight: schoolType === 'Privada' ? 600 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    Privada
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span id="lbl-lat" style={{ fontSize: '13px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em' }}>
                Dominância manual
              </span>
              <div role="radiogroup" aria-labelledby="lbl-lat" style={{ display: 'flex', gap: '8px' }}>
                {['Destro', 'Canhoto', 'Ambidestro'].map((tipo) => {
                  const isChecked = handedness === tipo;
                  return (
                    <button
                      key={tipo}
                      type="button"
                      role="radio"
                      aria-checked={isChecked}
                      onClick={() => setHandedness(tipo)}
                      style={{
                        flex: 1,
                        minHeight: '44px',
                        borderRadius: '8px',
                        border: isChecked ? '1px solid #2f6b31' : '1px solid #7d8775',
                        background: isChecked ? '#dafeaa' : '#ffffff',
                        color: isChecked ? '#22512a' : '#28352c',
                        fontSize: '14px',
                        fontWeight: isChecked ? 600 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {tipo}
                    </button>
                  );
                })}
              </div>
            </div>
          </fieldset>

          {/* Fieldset: Dados clínicos */}
          <fieldset style={{ margin: 0, padding: 0, border: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <legend style={{ padding: 0, marginBottom: '12px', fontSize: '12px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#566152' }}>
              Dados clínicos
            </legend>
            <label htmlFor="obs" style={{ fontSize: '13px', lineHeight: '16px', fontWeight: 600, letterSpacing: '0.02em' }}>
              Queixa principal e observações
            </label>
            <textarea
              id="obs"
              rows={3}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Ex.: queixa de desatenção relatada pela escola"
              style={{
                boxSizing: 'border-box',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #7d8775',
                background: '#ffffff',
                fontFamily: 'inherit',
                fontSize: '15px',
                lineHeight: '22px',
                color: '#28352c',
                resize: 'vertical',
                outline: 'none'
              }}
            />
          </fieldset>
        </form>

        {/* Rodapé do Modal */}
        <footer style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid #d6dccd', background: '#f4f6f0', borderRadius: '0 0 14px 14px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              minHeight: '44px',
              borderRadius: '8px',
              border: '1px solid #7d8775',
              background: '#ffffff',
              color: '#28352c',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              boxSizing: 'border-box',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-novo"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 18px',
              minHeight: '44px',
              borderRadius: '8px',
              border: 0,
              background: '#2f6b31',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.02em',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            {loading ? 'Salvando...' : 'Salvar paciente'}
          </button>
        </footer>
      </div>
    </div>
  );
}
