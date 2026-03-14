-- LOCUNI PASS — Schema Supabase
-- Cole tudo isso no SQL Editor do Supabase e clique em Run

-- Tabela de contas
CREATE TABLE IF NOT EXISTS contas (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefone TEXT DEFAULT '',
  senha TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de eventos
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL,
  data TEXT,
  local TEXT,
  descricao TEXT,
  emoji TEXT DEFAULT '🎪',
  destaque BOOLEAN DEFAULT FALSE,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de lotes
CREATE TABLE IF NOT EXISTS lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  preco NUMERIC NOT NULL,
  total INTEGER NOT NULL,
  vendidos INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT FALSE,
  ordem INTEGER DEFAULT 1
);

-- Tabela de add-ons
CREATE TABLE IF NOT EXISTS addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  emoji TEXT DEFAULT '🎁',
  preco NUMERIC NOT NULL,
  ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de cupons
CREATE TABLE IF NOT EXISTS cupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  tipo TEXT DEFAULT '%',
  valor NUMERIC NOT NULL,
  limite INTEGER DEFAULT 100,
  usados INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES contas(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  lote_id UUID,
  lote_nome TEXT,
  addons_json JSONB DEFAULT '[]',
  cupom TEXT DEFAULT '',
  desconto NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  pagamento TEXT DEFAULT 'pix',
  status TEXT DEFAULT 'pendente',
  checkin BOOLEAN DEFAULT FALSE,
  checkin_em TIMESTAMPTZ,
  cortesia BOOLEAN DEFAULT FALSE,
  motivo TEXT DEFAULT '',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Dados iniciais — 5 lotes
INSERT INTO lotes (nome, preco, total, vendidos, ativo, ordem) VALUES
  ('1º Lote', 35, 20, 100, TRUE, 1),
  ('2º Lote', 40, 60, 150, FALSE, 2),
  ('3º Lote', 45, 170, 0,  FALSE, 3),
  ('4º Lote', 50, 60, 0,   FALSE, 4),
  ('5º Lote', 55, 30, 0,   FALSE, 5)
ON CONFLICT DO NOTHING;

-- Evento inicial
INSERT INTO eventos (id, nome, data, local, descricao, emoji, destaque, ativo) VALUES
  (gen_random_uuid(), 'LOCUNI 2026 - LA CASA DE PAPEL', '04 de Julho de 2026', 'Viçosa, MG', 'O Rock mais aguardado do ano!!.', '🎪', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- Cupom de teste
INSERT INTO cupons (codigo, tipo, valor, limite, usados, ativo) VALUES
  ('LOCUNI10', '%', 10, 10, 0, TRUE),
  ('LOCUNI5', '%', 5, 50, 0, TRUE)
ON CONFLICT DO NOTHING;

SELECT 'Schema criado com sucesso! ✅' as resultado;
