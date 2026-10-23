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

  // Sessões de Teste
  async createSession(patientId) {
    if (isSupabaseConfigured && supabase) {
      const user = await this.getCurrentUser();
      const { data, error } = await supabase
        .from('test_sessions')
        .insert([{
          patient_id: patientId,
          evaluator_id: user?.id,
          test_type: 'TAC',
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
      test_type: 'TAC',
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
      const { data, error } = await supabase
        .from('test_sessions')
        .select('*, patients(*), tac_results(*)')
        .eq('id', sessionId)
        .single();
      return { data, error };
    }
    const sessions = getLocal(LOCAL_STORAGE_KEYS.SESSIONS, []);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return { data: null, error: { message: 'Sessão não encontrada' } };
    
    const patient = (await this.getPatientById(session.patient_id)).data;
    const results = getLocal(LOCAL_STORAGE_KEYS.RESULTS, []).find(r => r.session_id === sessionId);

    return {
      data: {
        ...session,
        patients: patient,
        tac_results: results ? [results] : []
      },
      error: null
    };
  },

  async saveResults(sessionId, resultsData) {
    if (isSupabaseConfigured && supabase) {
      // 1. Inserir resultado
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

  async getRecentSessions() {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('test_sessions')
        .select('*, patients(full_name, birth_date), tac_results(*)')
        .order('created_at', { ascending: false })
        .limit(10);
      return { data: data || [], error };
    }
    const sessions = getLocal(LOCAL_STORAGE_KEYS.SESSIONS, []);
    const patients = (await this.getPatients()).data;
    const results = getLocal(LOCAL_STORAGE_KEYS.RESULTS, []);

    const enriched = sessions.slice(0, 10).map(s => ({
      ...s,
      patients: patients.find(p => p.id === s.patient_id) || { full_name: 'Paciente' },
      tac_results: results.filter(r => r.session_id === s.id)
    }));
    return { data: enriched, error: null };
  },

  async deleteSession(sessionId) {
    if (isSupabaseConfigured && supabase) {
      // 1. Remover resultados atrelados
      await supabase.from('tac_results').delete().eq('session_id', sessionId);
      // 2. Remover a sessão
      const { data, error } = await supabase.from('test_sessions').delete().eq('id', sessionId);
      return { data, error };
    }

    // Modo local / Fallback
    const sessions = getLocal(LOCAL_STORAGE_KEYS.SESSIONS, []);
    const filteredSessions = sessions.filter(s => s.id !== sessionId);
    setLocal(LOCAL_STORAGE_KEYS.SESSIONS, filteredSessions);

    const results = getLocal(LOCAL_STORAGE_KEYS.RESULTS, []);
    const filteredResults = results.filter(r => r.session_id !== sessionId);
    setLocal(LOCAL_STORAGE_KEYS.RESULTS, filteredResults);

    return { error: null };
  }
};
