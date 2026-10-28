import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('seu-projeto')
);

// Cliente oficial do Supabase (quando configurado)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Armazenamento local de fallback para modo de demonstração / testes sem internet
const LOCAL_STORAGE_KEYS = {
  PATIENTS: 'avn_local_patients',
  SESSIONS: 'avn_local_sessions',
  RESULTS: 'avn_local_results',
  TNVRI_RESULTS: 'avn_local_tnvri_results',
  CURRENT_USER: 'avn_local_user'
};

const getLocal = (key, fallback = []) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    return fallback;
  }
};

const setLocal = (key, data) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
  }
};

// Interface unificada que funciona com Supabase ou Fallback Local
export const dbService = {
  // Autenticação
  async getCurrentUser() {
    if (isSupabaseConfigured && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
    return getLocal(LOCAL_STORAGE_KEYS.CURRENT_USER, {
      id: 'demo-evaluator-id',
      email: 'avaliador@clinica.com.br',
      user_metadata: { full_name: 'Avaliador(a) Clínico(a)' }
    });
  },

  async login(email, password) {
    if (isSupabaseConfigured && supabase) {
      return await supabase.auth.signInWithPassword({ email, password });
    }
    const mockUser = {
      id: 'demo-evaluator-id',
      email,
      user_metadata: { full_name: 'Avaliador(a) Clínico(a)' }
    };
    setLocal(LOCAL_STORAGE_KEYS.CURRENT_USER, mockUser);
    return { data: { user: mockUser }, error: null };
  },

  async signup(email, password, fullName, crp) {
    if (isSupabaseConfigured && supabase) {
      return await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, crp_crm: crp }
        }
      });
    }
    const mockUser = {
      id: 'demo-evaluator-id',
      email,
      user_metadata: { full_name: fullName, crp_crm: crp }
    };
    setLocal(LOCAL_STORAGE_KEYS.CURRENT_USER, mockUser);
    return { data: { user: mockUser }, error: null };
  },

  async logout() {
    if (isSupabaseConfigured && supabase) {
      return await supabase.auth.signOut();
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_USER);
    }
    return { error: null };
  },

  // Pacientes
  async getPatients() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          console.warn('Supabase getPatients aviso/erro:', error.message);
          const localList = getLocal(LOCAL_STORAGE_KEYS.PATIENTS, []);
          return { data: localList, error };
        }
        return { data: data || [], error: null };
      } catch (err) {
        console.error('Erro de conexão com Supabase:', err);
        return { data: getLocal(LOCAL_STORAGE_KEYS.PATIENTS, []), error: err };
      }
    }
    const list = getLocal(LOCAL_STORAGE_KEYS.PATIENTS, [
      {
        id: 'paciente-demo-1',
        full_name: 'Lucas Pereira Silva',
        birth_date: '2016-04-15',
        gender: 'M',
        education_level: '3º ano EF',
        school_type: 'Privada',
        handedness: 'Destro',
        clinical_notes: 'Encaminhado para avaliação de atenção e hiperatividade.',
        created_at: new Date().toISOString()
      },
      {
        id: 'paciente-demo-2',
        full_name: 'Beatriz Almeida Santos',
        birth_date: '2017-08-20',
        gender: 'F',
        education_level: '2º ano EF',
        school_type: 'Pública',
        handedness: 'Destro',
        clinical_notes: 'Queixa de lentidão na realização de tarefas escolares.',
        created_at: new Date().toISOString()
      }
    ]);
    return { data: list, error: null };
  },

  async getPatientById(id) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('id', id)
          .single();
        if (!error && data) return { data, error: null };
      } catch (e) {
        console.warn('Erro ao buscar paciente no Supabase:', e);
      }
    }
    const patients = (await this.getPatients()).data;
    const found = patients.find(p => p.id === id);
    return { data: found || null, error: found ? null : { message: 'Não encontrado' } };
  },

  async createPatient(patientData) {
    if (isSupabaseConfigured && supabase) {
      try {
        const user = await this.getCurrentUser();
        const { data, error } = await supabase
          .from('patients')
          .insert([{ ...patientData, evaluator_id: user?.id }])
          .select()
          .single();
        if (!error && data) return { data, error: null };
        console.warn('Erro ao inserir paciente no Supabase, salvando local:', error?.message);
      } catch (e) {
        console.warn('Exceção ao inserir paciente no Supabase:', e);
      }
    }
    const list = (await this.getPatients()).data;
    const newPatient = {
      ...patientData,
      id: 'paciente-' + Date.now(),
      created_at: new Date().toISOString()
    };
    list.unshift(newPatient);
    setLocal(LOCAL_STORAGE_KEYS.PATIENTS, list);
    return { data: newPatient, error: null };
  },

  async deletePatient(patientId) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('patients').delete().eq('id', patientId);
        if (error) console.warn('Erro ao deletar paciente no Supabase:', error.message);
      } catch (e) {
        console.warn('Exceção ao deletar paciente no Supabase:', e);
      }
    }
    const list = getLocal(LOCAL_STORAGE_KEYS.PATIENTS, []);
    setLocal(LOCAL_STORAGE_KEYS.PATIENTS, list.filter(p => p.id !== patientId));
    return { error: null };
  },

  // Sessões de Teste
  async createSession(patientId, testType = 'TAC') {
    if (isSupabaseConfigured && supabase) {
      const user = await this.getCurrentUser();
      const { data, error } = await supabase
        .from('test_sessions')
        .insert([{
          patient_id: patientId,
          evaluator_id: user?.id,
          test_type: testType,
          status: 'em_andamento',
          current_part: 1
        }])
        .select()
        .single();
      return { data, error };
    }
    const newSession = {
      id: 'sessao-' + Date.now(),
      patient_id: patientId,
      test_type: testType,
      status: 'em_andamento',
      current_part: 1,
      applied_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    const sessions = getLocal(LOCAL_STORAGE_KEYS.SESSIONS, []);
    sessions.unshift(newSession);
    setLocal(LOCAL_STORAGE_KEYS.SESSIONS, sessions);
    return { data: newSession, error: null };
  },

  async getSession(sessionId) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('test_sessions')
          .select('*, patients(*), tac_results(*)')
          .eq('id', sessionId)
          .single();

        if (error || !data) {
          // Fallback para storage local caso a sessão tenha sido criada localmente
          const localSessions = getLocal(LOCAL_STORAGE_KEYS.SESSIONS, []);
          const localSess = localSessions.find(s => s.id === sessionId);
          if (localSess) {
            const patient = (await this.getPatientById(localSess.patient_id)).data;
            const tacResults = getLocal(LOCAL_STORAGE_KEYS.RESULTS, []).find(r => r.session_id === sessionId);
            const tnvriResults = getLocal(LOCAL_STORAGE_KEYS.TNVRI_RESULTS, []).find(r => r.session_id === sessionId);
            return {
              data: {
                ...localSess,
                patients: patient,
                tac_results: tacResults ? [tacResults] : [],
                tnvri_results: tnvriResults ? [tnvriResults] : []
              },
              error: null
            };
          }
          return { data, error };
        }

        // Se for sessão TNVRI, tenta carregar resultados de forma resiliente
        if (data && data.test_type === 'TNVRI') {
          try {
            const { data: tnvriData } = await supabase
              .from('tnvri_results')
              .select('*')
              .eq('session_id', sessionId);
            data.tnvri_results = tnvriData || [];
          } catch (e) {
            data.tnvri_results = [];
          }
        }

        return { data, error: null };
      } catch (err) {
        console.warn('Erro ao buscar sessão no Supabase:', err);
      }
    }

    const sessions = getLocal(LOCAL_STORAGE_KEYS.SESSIONS, []);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return { data: null, error: { message: 'Sessão não encontrada' } };
    
    const patient = (await this.getPatientById(session.patient_id)).data;
    const tacResults = getLocal(LOCAL_STORAGE_KEYS.RESULTS, []).find(r => r.session_id === sessionId);
    const tnvriResults = getLocal(LOCAL_STORAGE_KEYS.TNVRI_RESULTS, []).find(r => r.session_id === sessionId);

    return {
      data: {
        ...session,
        patients: patient,
        tac_results: tacResults ? [tacResults] : [],
        tnvri_results: tnvriResults ? [tnvriResults] : []
      },
      error: null
    };
  },

  async saveResults(sessionId, resultsData) {
    if (isSupabaseConfigured && supabase) {
      // 1. Inserir resultado do TAC
      const { data: resData, error: resError } = await supabase
        .from('tac_results')
        .insert([{ session_id: sessionId, ...resultsData }])
        .select()
        .single();

      // 2. Marcar sessão como concluída
      await supabase
        .from('test_sessions')
        .update({ status: 'concluido', completed_at: new Date().toISOString() })
        .eq('id', sessionId);

      return { data: resData, error: resError };
    }

    // Salvar localmente
    const results = getLocal(LOCAL_STORAGE_KEYS.RESULTS, []);
    const newResult = {
      id: 'resultado-' + Date.now(),
      session_id: sessionId,
      ...resultsData,
      created_at: new Date().toISOString()
    };
    results.unshift(newResult);
    setLocal(LOCAL_STORAGE_KEYS.RESULTS, results);

    // Atualizar status da sessão
    const sessions = getLocal(LOCAL_STORAGE_KEYS.SESSIONS, []);
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      sessions[idx].status = 'concluido';
      sessions[idx].completed_at = new Date().toISOString();
      setLocal(LOCAL_STORAGE_KEYS.SESSIONS, sessions);
    }

    return { data: newResult, error: null };
  },

  async saveTnvriResults(sessionId, resultsData) {
    if (isSupabaseConfigured && supabase) {
      // 1. Inserir resultado do TNVRI
      const { data: resData, error: resError } = await supabase
        .from('tnvri_results')
        .insert([{ session_id: sessionId, ...resultsData }])
        .select()
        .single();

      // 2. Marcar sessão como concluída
      await supabase
        .from('test_sessions')
        .update({ status: 'concluido', completed_at: new Date().toISOString() })
        .eq('id', sessionId);

      return { data: resData, error: resError };
    }

    // Salvar localmente
    const results = getLocal(LOCAL_STORAGE_KEYS.TNVRI_RESULTS, []);
    const newResult = {
      id: 'tnvri-resultado-' + Date.now(),
      session_id: sessionId,
      ...resultsData,
      created_at: new Date().toISOString()
    };
    results.unshift(newResult);
    setLocal(LOCAL_STORAGE_KEYS.TNVRI_RESULTS, results);

    // Atualizar status da sessão
    const sessions = getLocal(LOCAL_STORAGE_KEYS.SESSIONS, []);
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      sessions[idx].status = 'concluido';
      sessions[idx].completed_at = new Date().toISOString();
      setLocal(LOCAL_STORAGE_KEYS.SESSIONS, sessions);
    }

    return { data: newResult, error: null };
  },

  async getRecentSessions() {
    let supabaseSessions = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('test_sessions')
          .select('*, patients(full_name, birth_date), tac_results(*)')
          .order('created_at', { ascending: false })
          .limit(20);

        if (!error && data) {
          supabaseSessions = data;
          // Tenta carregar resultados do TNVRI de forma resiliente
          const tnvriIds = supabaseSessions.filter(s => s.test_type === 'TNVRI').map(s => s.id);
          if (tnvriIds.length > 0) {
            try {
              const { data: tnvriData } = await supabase
                .from('tnvri_results')
                .select('*')
                .in('session_id', tnvriIds);
              if (tnvriData) {
                supabaseSessions.forEach(s => {
                  s.tnvri_results = tnvriData.filter(r => r.session_id === s.id);
                });
              }
            } catch (e) {
              // Tabela tnvri_results ainda não criada no Supabase - ignora sem erro
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao buscar sessões do Supabase:', err);
      }
    }

    // Carrega sessões locais (fallback/modo offline/demo)
    const localSessions = getLocal(LOCAL_STORAGE_KEYS.SESSIONS, []);
    const patients = (await this.getPatients()).data;
    const tacResults = getLocal(LOCAL_STORAGE_KEYS.RESULTS, []);
    const tnvriResults = getLocal(LOCAL_STORAGE_KEYS.TNVRI_RESULTS, []);

    const localEnriched = localSessions.map(s => ({
      ...s,
      patients: patients.find(p => p.id === s.patient_id) || { full_name: 'Paciente' },
      tac_results: tacResults.filter(r => r.session_id === s.id),
      tnvri_results: tnvriResults.filter(r => r.session_id === s.id)
    }));

    // Se temos sessões do Supabase, usamos elas + sessões locais que não estejam no Supabase
    const allSessionsMap = new Map();
    supabaseSessions.forEach(s => allSessionsMap.set(s.id, s));
    localEnriched.forEach(s => {
      if (!allSessionsMap.has(s.id)) {
        allSessionsMap.set(s.id, s);
      }
    });

    const combined = Array.from(allSessionsMap.values())
      .sort((a, b) => new Date(b.created_at || b.applied_at || 0) - new Date(a.created_at || a.applied_at || 0))
      .slice(0, 15);

    return { data: combined, error: null };
  },

  async deleteSession(sessionId) {
    if (isSupabaseConfigured && supabase) {
      // 1. Remover resultados atrelados
      await supabase.from('tac_results').delete().eq('session_id', sessionId);
      await supabase.from('tnvri_results').delete().eq('session_id', sessionId);
      // 2. Remover a sessão
      const { data, error } = await supabase.from('test_sessions').delete().eq('id', sessionId);
      return { data, error };
    }

    // Modo local / Fallback
    const sessions = getLocal(LOCAL_STORAGE_KEYS.SESSIONS, []);
    const filteredSessions = sessions.filter(s => s.id !== sessionId);
    setLocal(LOCAL_STORAGE_KEYS.SESSIONS, filteredSessions);

    const tacResults = getLocal(LOCAL_STORAGE_KEYS.RESULTS, []);
    setLocal(LOCAL_STORAGE_KEYS.RESULTS, tacResults.filter(r => r.session_id !== sessionId));

    const tnvriResults = getLocal(LOCAL_STORAGE_KEYS.TNVRI_RESULTS, []);
    setLocal(LOCAL_STORAGE_KEYS.TNVRI_RESULTS, tnvriResults.filter(r => r.session_id !== sessionId));

    return { error: null };
  }
};
