-- =====================================================================
-- 079 · Convites de videochamada ("a tocar" no Bizin)
-- Cada linha = uma pessoa chamada para a videochamada de uma conversa.
--   sala   → chat_rooms.id (a sala Jitsi é "bizin-chat-<sala>")
--   de     → quem liga;  para → quem é chamado
--   estado → 'a_tocar' | 'aceite' | 'recusada' | 'perdida' | 'cancelada'
-- A app mostra o aviso de chamada a quem tem convites 'a_tocar' recentes (Realtime).
-- A API /api/reunioes deixa entrar quem participa na conversa OU tem convite
-- (permite convidar colegas que não estão na conversa).
-- Idempotente.
-- =====================================================================
create table if not exists public.chamadas_convites (
  id         uuid primary key default gen_random_uuid(),
  sala       uuid not null references public.chat_rooms(id) on delete cascade,
  titulo     text,
  de         uuid not null references auth.users(id) on delete cascade,
  para       uuid not null references auth.users(id) on delete cascade,
  estado     text not null default 'a_tocar'
             check (estado in ('a_tocar', 'aceite', 'recusada', 'perdida', 'cancelada')),
  criado_em  timestamptz not null default now(),
  respondido_em timestamptz,
  constraint chamadas_convites_nao_a_si_proprio check (de <> para)
);

create index if not exists idx_chamadas_convites_para on public.chamadas_convites (para, criado_em desc);
create index if not exists idx_chamadas_convites_de   on public.chamadas_convites (de, criado_em desc);
create index if not exists idx_chamadas_convites_sala on public.chamadas_convites (sala, criado_em desc);

alter table public.chamadas_convites enable row level security;

-- Ver: quem liga e quem é chamado
drop policy if exists chamadas_convites_ver on public.chamadas_convites;
create policy chamadas_convites_ver on public.chamadas_convites
  for select to authenticated
  using (de = auth.uid() or para = auth.uid());

-- Criar: só em nome próprio, para uma conversa em que participa, e só para contas ativas
drop policy if exists chamadas_convites_criar on public.chamadas_convites;
create policy chamadas_convites_criar on public.chamadas_convites
  for insert to authenticated
  with check (
    de = auth.uid()
    and estado = 'a_tocar'
    and exists (select 1 from public.chat_participants cp where cp.room_id = sala and cp.user_id = auth.uid())
    and exists (select 1 from public.profiles p where p.id = para and coalesce(p.ativo, true))
  );

-- Responder (quem é chamado) ou cancelar (quem liga)
drop policy if exists chamadas_convites_atualizar on public.chamadas_convites;
create policy chamadas_convites_atualizar on public.chamadas_convites
  for update to authenticated
  using (de = auth.uid() or para = auth.uid())
  with check (de = auth.uid() or para = auth.uid());

-- 2FA obrigatório (igual às outras tabelas — migração 071)
drop policy if exists mfa_obrigatorio on public.chamadas_convites;
create policy mfa_obrigatorio on public.chamadas_convites as restrictive for all to authenticated
  using ((auth.jwt() ->> 'aal') = 'aal2')
  with check ((auth.jwt() ->> 'aal') = 'aal2');

-- Só se pode mudar o estado (e a hora da resposta); o resto fica como foi criado.
create or replace function public.chamadas_convites_proteger()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.sala <> old.sala or new.de <> old.de or new.para <> old.para or new.criado_em <> old.criado_em
     or coalesce(new.titulo, '') <> coalesce(old.titulo, '') then
    raise exception 'Só o estado do convite pode ser alterado.';
  end if;
  -- quem é chamado só aceita/recusa/perde; quem liga só cancela
  if auth.uid() = old.para and auth.uid() <> old.de and new.estado not in ('aceite', 'recusada', 'perdida') then
    raise exception 'Estado inválido.';
  end if;
  if auth.uid() = old.de and auth.uid() <> old.para and new.estado <> 'cancelada' then
    raise exception 'Estado inválido.';
  end if;
  new.respondido_em := coalesce(new.respondido_em, now());
  return new;
end $$;

drop trigger if exists trg_chamadas_convites_proteger on public.chamadas_convites;
create trigger trg_chamadas_convites_proteger
  before update on public.chamadas_convites
  for each row execute function public.chamadas_convites_proteger();

-- Realtime (o aviso de chamada chega sem recarregar a página)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chamadas_convites'
  ) then
    alter publication supabase_realtime add table public.chamadas_convites;
  end if;
end $$;

-- Confirmação
select relname, relrowsecurity from pg_class where relname = 'chamadas_convites';
