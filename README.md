# AVN - Plataforma de Avaliação Neuropsicológica Online

Sistema online para aplicação, correção e laudos de testes neuropsicológicos, com foco no **Teste de Atenção por Cancelamento (TAC)** e integração com banco de dados **Supabase**.

---

## 🚀 Como Executar

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Abra no navegador: [http://localhost:3000](http://localhost:3000)

---

## 📋 Funcionalidades

- **Painel do Avaliador**: Cadastro de pacientes, gestão de prontuários, cálculo automático de idade e histórico de testes.
- **Teste de Atenção por Cancelamento (TAC)**:
  - Parte 1: Atenção Seletiva (1 Alvo) • Treino prévio + Teste cronometrado de 1 minuto.
  - Parte 2: Atenção Dividida (2 Alvos Juntos) • Treino prévio + Teste cronometrado de 1 minuto.
  - Parte 3: Atenção Alternada (1 Alvo por Linha) • Treino prévio + Teste cronometrado de 1 minuto.
- **Correção Automática**: Cálculo instantâneo de Acertos ($A$), Erros ($E$), Omissões ($O$) e Escore Líquido ($A - E$).
- **Laudo Diagnóstico**: Tabelas normativas com percentis por faixa etária e layout preparado para impressão/PDF.
- **Banco de Dados Supabase**: Script SQL com Row Level Security (RLS) em `supabase/schema.sql`.
