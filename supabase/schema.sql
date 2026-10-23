-- ==============================================================================
-- SCHEMA DO SUPABASE: PLATAFORMA AVN - TESTE DE ATENÇÃO POR CANCELAMENTO (TAC)
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==============================================================================

-- 1. Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabela de Perfis de Avaliadores (Profissionais)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    crp_crm TEXT,
    clinic_institution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Pacientes
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    gender TEXT CHECK (gender IN ('M', 'F', 'Outro')),
    education_level TEXT, -- Ex: '1º ano EF', '2º ano EF', etc.
    school_type TEXT CHECK (school_type IN ('Pública', 'Privada', 'Outra')),
    handedness TEXT CHECK (handedness IN ('Destro', 'Canhoto', 'Ambidestro')),
    clinical_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Sessões de Teste
CREATE TABLE IF NOT EXISTS public.test_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL DEFAULT 'TAC', -- Teste de Atenção por Cancelamento
    status TEXT NOT NULL CHECK (status IN ('em_andamento', 'concluido', 'cancelado')) DEFAULT 'em_andamento',
    current_part INT DEFAULT 1 CHECK (current_part IN (1, 2, 3)),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Resultados Psicométricos do TAC
CREATE TABLE IF NOT EXISTS public.tac_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.test_sessions(id) ON DELETE CASCADE,
    
    -- Parte 1: Atenção Seletiva (1 Alvo)
    p1_hits INT DEFAULT 0,
    p1_errors INT DEFAULT 0,
    p1_omissions INT DEFAULT 0,
    p1_net_score INT DEFAULT 0,
    p1_time_spent_seconds INT DEFAULT 60,
    
    -- Parte 2: Atenção Dividida (2 Alvos Juntos)
    p2_hits INT DEFAULT 0,
    p2_errors INT DEFAULT 0,
    p2_omissions INT DEFAULT 0,
    p2_net_score INT DEFAULT 0,
    p2_time_spent_seconds INT DEFAULT 60,
    
    -- Parte 3: Atenção Alternada (1 Alvo por Linha)
    p3_hits INT DEFAULT 0,
    p3_errors INT DEFAULT 0,
    p3_omissions INT DEFAULT 0,
    p3_net_score INT DEFAULT 0,
    p3_time_spent_seconds INT DEFAULT 60,
    
    -- Escores Totais Brutos
    total_hits INT DEFAULT 0,
    total_errors INT DEFAULT 0,
    total_omissions INT DEFAULT 0,
    total_net_score INT DEFAULT 0,
    
    -- Percentis e Normas (Calculados de acordo com idade/escolaridade)
    p1_percentile INT,
    p2_percentile INT,
    p3_percentile INT,
    total_percentile INT,
    classification TEXT, -- Ex: 'Superior', 'Médio Superior', 'Médio', 'Médio Inferior', 'Inferior'
    
    -- Log detalhado de interações (marcações, coordenadas, timestamp de cada clique)
    raw_interactions JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela Normativa do TAC (Para referência psicométrica)
CREATE TABLE IF NOT EXISTS public.normative_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_type TEXT NOT NULL DEFAULT 'TAC',
    age_min INT NOT NULL,
    age_max INT NOT NULL,
    school_type TEXT DEFAULT 'Geral',
    part INT, -- 1, 2, 3 ou NULL para Total
    score_metric TEXT NOT NULL, -- 'net_score', 'hits', 'errors'
    percentile_10 INT,
    percentile_25 INT,
    percentile_50 INT,
    percentile_75 INT,
    percentile_90 INT,
    mean NUMERIC(5,2),
    std_dev NUMERIC(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tac_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.normative_tables ENABLE ROW LEVEL SECURITY;

-- Regras para Profiles
CREATE POLICY "Avaliadores podem ver e editar apenas seu próprio perfil"
    ON public.profiles FOR ALL
    USING (auth.uid() = id);

-- Regras para Patients
CREATE POLICY "Avaliadores gerenciam apenas seus próprios pacientes"
    ON public.patients FOR ALL
    USING (auth.uid() = evaluator_id);

-- Regras para Test Sessions
CREATE POLICY "Avaliadores gerenciam apenas sessões de seus pacientes"
    ON public.test_sessions FOR ALL
    USING (auth.uid() = evaluator_id);

-- Regras para TAC Results
CREATE POLICY "Avaliadores acessam resultados das suas sessões"
    ON public.tac_results FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.test_sessions s
            WHERE s.id = tac_results.session_id AND s.evaluator_id = auth.uid()
        )
    );

-- Regras para Tabelas Normativas (Leitura aberta a avaliadores autenticados)
CREATE POLICY "Leitura de normas para avaliadores autenticados"
    ON public.normative_tables FOR SELECT
    TO authenticated
    USING (true);

-- ==============================================================================
-- TRIGGERS E FUNÇÕES AUXILIARES
-- ==============================================================================

-- Cria automaticamente o perfil do usuário quando um novo login é cadastrado no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Avaliador(a)')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
