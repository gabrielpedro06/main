-- =====================================================================
-- 072 — Segurança (Fase 3, passo 1): cofre de palavras-passe e dados privados
--
-- NÃO APAGA NADA. Só cria estruturas novas e COPIA os dados para lá:
--
--  A. Cofre (Supabase Vault, cifrado): palavras-passe de
--       acessos_cliente.codigo  (Clientes → Acessos)
--       acessos.password        (Ativos TI → Acessos)
--     A app deixa de as receber em lista; cada "mostrar/copiar" pede a palavra-passe
--     ao cofre e fica registado no histórico (quem, quando, qual).
--
--  B. profiles_privado: NIF, NISS, Cartão de Cidadão, morada, estado civil,
--     nacionalidade, sexo, concelho, dependentes e subsídio de alimentação.
--     Só o próprio e os RH (admin/administrador/gestor) os veem.
--
--  C. cursos: deixa de ser legível sem sessão.
--
-- As colunas antigas ficam intactas e continuam sincronizadas (se alguém ainda
-- usar a versão antiga da app). A limpeza é a 073, que só se corre no fim.
-- Pode correr mais do que uma vez.
-- =====================================================================

-- Ativa o cofre do Supabase (Vault), se ainda não estiver ativo
create extension if not exists supabase_vault with schema vault;

do $$
begin
  if to_regclass('vault.secrets') is null then
    raise exception 'O Supabase Vault não ficou ativo. Ative-o em Database → Extensions → supabase_vault e corra de novo.';
  end if;
end $$;

-- =====================================================================
-- A. COFRE
-- =====================================================================
alter table public.acessos_cliente add column if not exists segredo_id uuid;
alter table public.acessos add column if not exists segredo_id uuid;

-- Quem gere os acessos de TI (igual à página Ativos TI)
create or replace function public.bizin_pode_acessos_ti()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.bizin_papel() in ('admin', 'administrador', 'gestor', 'marketing plus')
$$;
revoke all on function public.bizin_pode_acessos_ti() from public, anon;
grant execute on function public.bizin_pode_acessos_ti() to authenticated;

-- Interno: grava/atualiza/limpa o segredo de uma linha (sem verificações de utilizador)
create or replace function public.cofre_gravar_interno(p_tabela text, p_id text, p_valor text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  sid uuid;
begin
  if p_tabela not in ('acessos', 'acessos_cliente') then
    raise exception 'Tabela não suportada.';
  end if;
  execute format('select segredo_id from public.%I where id::text = $1', p_tabela) into sid using p_id;

  if coalesce(p_valor, '') = '' then
    if sid is not null then
      execute format('update public.%I set segredo_id = null where id::text = $1', p_tabela) using p_id;
      delete from vault.secrets where id = sid;
    end if;
    return;
  end if;

  if sid is not null and exists (select 1 from vault.secrets where id = sid) then
    perform vault.update_secret(sid, p_valor);
  else
    sid := vault.create_secret(p_valor, null, format('bizin %s %s', p_tabela, p_id));
    execute format('update public.%I set segredo_id = $1 where id::text = $2', p_tabela) using sid, p_id;
  end if;
end;
$$;
revoke all on function public.cofre_gravar_interno(text, text, text) from public, anon, authenticated;

-- Verifica se quem chama pode mexer nesta tabela (e se tem 2FA confirmado)
create or replace function public.cofre_verificar(p_tabela text, p_id text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  existe boolean;
begin
  if auth.uid() is null or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'Sessão sem verificação em dois passos.' using errcode = '42501';
  end if;
  if p_tabela = 'acessos' then
    if not public.bizin_pode_acessos_ti() then
      raise exception 'Sem permissão para os acessos de TI.' using errcode = '42501';
    end if;
  elsif p_tabela <> 'acessos_cliente' then
    raise exception 'Tabela não suportada.' using errcode = '22023';
  end if;
  execute format('select exists (select 1 from public.%I where id::text = $1)', p_tabela) into existe using p_id;
  if not existe then
    raise exception 'Registo não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.cofre_verificar(text, text) from public, anon, authenticated;

-- App: guardar (ou limpar, com valor vazio) a palavra-passe de um acesso
create or replace function public.cofre_guardar(p_tabela text, p_id text, p_valor text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cofre_verificar(p_tabela, p_id);
  perform public.cofre_gravar_interno(p_tabela, p_id, p_valor);
end;
$$;
revoke all on function public.cofre_guardar(text, text, text) from public, anon;
grant execute on function public.cofre_guardar(text, text, text) to authenticated;

-- App: mostrar/copiar uma palavra-passe (fica no histórico)
create or replace function public.cofre_revelar(p_tabela text, p_id text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  sid uuid;
  valor text;
begin
  perform public.cofre_verificar(p_tabela, p_id);
  execute format('select segredo_id from public.%I where id::text = $1', p_tabela) into sid using p_id;
  if sid is null then
    return null;
  end if;
  select decrypted_secret into valor from vault.decrypted_secrets where id = sid;

  if to_regclass('public.audit_log') is not null then
    insert into public.audit_log (user_id, user_email, operacao, acao, tabela, registo_id, detalhes)
    values (auth.uid(), auth.jwt() ->> 'email', 'EVENTO', 'credencial_revelada', p_tabela, p_id, '{}'::jsonb);
  end if;
  return valor;
end;
$$;
revoke all on function public.cofre_revelar(text, text) from public, anon;
grant execute on function public.cofre_revelar(text, text) to authenticated;

-- Ao apagar um acesso, apaga também o segredo
create or replace function public.cofre_apagar_segredo()
returns trigger
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if old.segredo_id is not null then
    delete from vault.secrets where id = old.segredo_id;
  end if;
  return old;
end;
$$;
revoke all on function public.cofre_apagar_segredo() from public, anon, authenticated;

drop trigger if exists cofre_apagar_segredo on public.acessos_cliente;
create trigger cofre_apagar_segredo after delete on public.acessos_cliente
  for each row execute function public.cofre_apagar_segredo();
drop trigger if exists cofre_apagar_segredo on public.acessos;
create trigger cofre_apagar_segredo after delete on public.acessos
  for each row execute function public.cofre_apagar_segredo();

-- Transição: se a versão antiga da app escrever na coluna antiga, o cofre acompanha
create or replace function public.cofre_sincronizar_coluna()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  novo text := to_jsonb(new) ->> tg_argv[0];
  antigo text := case when tg_op = 'UPDATE' then to_jsonb(old) ->> tg_argv[0] end;
begin
  if coalesce(novo, '') <> '' and novo is distinct from antigo then
    perform public.cofre_gravar_interno(tg_table_name, new.id::text, novo);
  end if;
  return null;
end;
$$;
revoke all on function public.cofre_sincronizar_coluna() from public, anon, authenticated;

drop trigger if exists cofre_sincronizar on public.acessos_cliente;
create trigger cofre_sincronizar after insert or update of codigo on public.acessos_cliente
  for each row execute function public.cofre_sincronizar_coluna('codigo');
drop trigger if exists cofre_sincronizar on public.acessos;
create trigger cofre_sincronizar after insert or update of password on public.acessos
  for each row execute function public.cofre_sincronizar_coluna('password');

-- Cópia das palavras-passe existentes para o cofre (as colunas antigas ficam iguais)
do $$
declare
  r record;
begin
  for r in select id::text as id, codigo from public.acessos_cliente where segredo_id is null and coalesce(codigo, '') <> '' loop
    perform public.cofre_gravar_interno('acessos_cliente', r.id, r.codigo);
  end loop;
  for r in select id::text as id, password from public.acessos where segredo_id is null and coalesce(password, '') <> '' loop
    perform public.cofre_gravar_interno('acessos', r.id, r.password);
  end loop;
end $$;

-- =====================================================================
-- B. DADOS PRIVADOS DO PERFIL
-- =====================================================================
create table if not exists public.profiles_privado (
  id uuid primary key references public.profiles (id) on delete cascade,
  nif text,
  niss text,
  ncc text,
  validade_cc date,
  morada text,
  concelho text,
  estado_civil text,
  nacionalidade text,
  sexo text,
  nr_dependentes integer,
  valor_sa numeric,
  atualizado_em timestamptz not null default now()
);

alter table public.profiles_privado enable row level security;
revoke all on public.profiles_privado from anon;

drop policy if exists profiles_privado_ler on public.profiles_privado;
create policy profiles_privado_ler on public.profiles_privado for select to authenticated
  using (id = auth.uid() or public.bizin_e_staff());
drop policy if exists profiles_privado_criar on public.profiles_privado;
create policy profiles_privado_criar on public.profiles_privado for insert to authenticated
  with check (id = auth.uid() or public.bizin_e_staff());
drop policy if exists profiles_privado_alterar on public.profiles_privado;
create policy profiles_privado_alterar on public.profiles_privado for update to authenticated
  using (id = auth.uid() or public.bizin_e_staff())
  with check (id = auth.uid() or public.bizin_e_staff());
-- (sem regra de apagar: só desaparece quando o perfil é apagado)

drop policy if exists mfa_obrigatorio on public.profiles_privado;
create policy mfa_obrigatorio on public.profiles_privado as restrictive for all to authenticated
  using ((auth.jwt() ->> 'aal') = 'aal2')
  with check ((auth.jwt() ->> 'aal') = 'aal2');

-- O subsídio de alimentação só é alterado pelos RH
create or replace function public.profiles_privado_proteger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.atualizado_em := now();
  if auth.uid() is null or public.bizin_e_staff() then
    return new;
  end if;
  if tg_op = 'INSERT' and new.valor_sa is not null then
    raise exception 'Só os RH podem definir o subsídio de alimentação.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.valor_sa is distinct from old.valor_sa then
    raise exception 'Só os RH podem alterar o subsídio de alimentação.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.profiles_privado_proteger() from public, anon, authenticated;

drop trigger if exists profiles_privado_proteger on public.profiles_privado;
create trigger profiles_privado_proteger before insert or update on public.profiles_privado
  for each row execute function public.profiles_privado_proteger();

-- Cópia e sincronização (transição): a mesma lista de colunas, só as que existem em profiles
do $$
declare
  cols text[] := array['nif', 'niss', 'ncc', 'validade_cc', 'morada', 'concelho', 'estado_civil',
                       'nacionalidade', 'sexo', 'nr_dependentes', 'valor_sa'];
  existentes text[];
  lista text;
  conversoes text;
  atualiza text;
  difere text;
begin
  select array_agg(c order by array_position(cols, c)) into existentes
  from unnest(cols) as c
  where exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = c
  );
  if existentes is null then
    raise notice 'profiles não tem nenhuma das colunas sensíveis: nada a copiar.';
    return;
  end if;

  lista := array_to_string(existentes, ', ');
  -- conversão para o tipo da tabela nova (ex.: validade_cc em texto → date)
  select string_agg(format('nullif(trim((p.%1$I)::text), '''')::%2$s', c,
           case c when 'validade_cc' then 'date' when 'nr_dependentes' then 'integer' when 'valor_sa' then 'numeric' else 'text' end), ', ')
    into conversoes from unnest(existentes) as c;
  select string_agg(format('%1$I = excluded.%1$I', c), ', ') into atualiza from unnest(existentes) as c;
  select string_agg(format('new.%1$I is distinct from old.%1$I', c), ' or ') into difere from unnest(existentes) as c;

  -- 1) cópia de quem ainda não tem linha na tabela nova
  execute format(
    'insert into public.profiles_privado (id, %s) select p.id, %s from public.profiles p
       where not exists (select 1 from public.profiles_privado x where x.id = p.id)',
    lista, conversoes);

  -- 2) sincronização enquanto a app antiga ainda escrever em profiles
  execute format($f$
    create or replace function public.profiles_sincronizar_privado()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $b$
    begin
      if tg_op = 'INSERT' or (%1$s) then
        insert into public.profiles_privado as x (id, %2$s)
        select p.id, %3$s from (select new.*) p
        on conflict (id) do update set %4$s;
      end if;
      return null;
    end;
    $b$;
  $f$, difere, lista, conversoes, atualiza);
end $$;

do $$
begin
  if to_regprocedure('public.profiles_sincronizar_privado()') is not null then
    revoke all on function public.profiles_sincronizar_privado() from public, anon, authenticated;
    drop trigger if exists profiles_sincronizar_privado on public.profiles;
    create trigger profiles_sincronizar_privado after insert or update on public.profiles
      for each row execute function public.profiles_sincronizar_privado();
  end if;
end $$;

-- Aviso de CC a expirar (Dashboard dos RH): só nomes e datas
create or replace function public.bizin_cc_a_expirar(p_ate date)
returns table (id uuid, nome text, validade_cc date)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nome, x.validade_cc
  from public.profiles_privado x
  join public.profiles p on p.id = x.id
  where x.validade_cc is not null
    and x.validade_cc <= p_ate
    and p.ativo is distinct from false
    and (public.bizin_e_staff()
         or exists (select 1 from public.profiles me where me.id = auth.uid() and lower(coalesce(me.funcao, '')) like '%rh%'))
  order by x.validade_cc
$$;
revoke all on function public.bizin_cc_a_expirar(date) from public, anon;
grant execute on function public.bizin_cc_a_expirar(date) to authenticated;

-- =====================================================================
-- C. cursos: só com sessão
-- =====================================================================
drop policy if exists "Cursos leitura pública" on public.cursos;
drop policy if exists cursos_ler on public.cursos;
create policy cursos_ler on public.cursos for select to authenticated using (true);
revoke select on public.cursos from anon;

-- =====================================================================
-- Confirmação
-- =====================================================================
select 'acessos_cliente' as tabela,
       count(*) filter (where coalesce(codigo, '') <> '') as com_palavra_passe,
       count(*) filter (where segredo_id is not null) as no_cofre
from public.acessos_cliente
union all
select 'acessos',
       count(*) filter (where coalesce(password, '') <> ''),
       count(*) filter (where segredo_id is not null)
from public.acessos
union all
select 'profiles → profiles_privado', (select count(*) from public.profiles), (select count(*) from public.profiles_privado);
