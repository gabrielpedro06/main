-- =====================================================================
-- 081 · Chaves de idempotência (evitar envios repetidos)
-- Cada linha = um pedido "único" ao servidor (ex.: envio de uma campanha).
-- O browser manda o cabeçalho Idempotency-Key (impressão digital do conteúdo);
-- se o mesmo pedido chegar outra vez (duplo clique, rede que falhou a meio,
-- repetição por engano) dentro da janela de tempo, o servidor NÃO volta a
-- enviar e devolve o resultado guardado.
--   chave   → "<user_id>:<tipo>:<Idempotency-Key>"
--   estado  → 'em_curso' (a ser processado) | 'feito' (resposta guardada)
-- Só o servidor (service_role) lê/escreve: RLS ligada e sem políticas para
-- utilizadores. Ver api/_lib/idempotencia.js.
-- Idempotente.
-- =====================================================================
create table if not exists public.pedidos_idempotentes (
  chave      text primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  tipo       text not null,
  estado     text not null default 'em_curso' check (estado in ('em_curso', 'feito')),
  resposta   jsonb,
  criado_em  timestamptz not null default now()
);

create index if not exists idx_pedidos_idempotentes_criado on public.pedidos_idempotentes (criado_em);

alter table public.pedidos_idempotentes enable row level security;
-- (sem políticas: os utilizadores não têm acesso; o servidor usa a service_role)
