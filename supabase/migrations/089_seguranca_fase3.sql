-- =====================================================================
-- 089 · Segurança, fase 3 (riscos de alta prioridade, 27/11/2026)
--  1. Marketing (marketing_*): só gestão + marketing ("marketing", "marketing plus"),
--     como as rotas /dashboard/marketing e /dashboard/leads. Exceções:
--       - marcas: todos leem (nome/cor aparecem no cronómetro e nas aprovações);
--       - conteúdos: quem é APROVADOR de uma peça vê-a e pode decidir (atualizar).
--  2. software (licenças): só quem acede aos Ativos TI (bizin_pode_acessos_ti()).
--  3. proposta_cursos: só gestão (as propostas são da administração).
--  4. notificacoes_projetos: quem cria só pode assinar como si próprio e só com
--     links internos ("/…"): acaba com notificações falsas com links para fora.
--  5. provisionar_saldos_ferias: só gestão (ou o cron / servidor).
--  6. Balde "documents" (anexos e guia de marca do Marketing) passa a PRIVADO:
--     abre só com sessão (links temporários, utils/ficheirosPrivados.js).
--  7. Formação, Programas e Avisos: todos editam, só a gestão apaga.
-- Idempotente. Ver docs/04-seguranca.md e docs/riscos-e-pendentes.md.
-- =====================================================================

-- 0. Quem trabalha no Marketing --------------------------------------------
create or replace function public.bizin_pode_marketing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.bizin_e_staff() or public.bizin_papel() in ('marketing', 'marketing plus'), false);
$$;
revoke all on function public.bizin_pode_marketing() from public, anon;
grant execute on function public.bizin_pode_marketing() to authenticated;

-- apaga as regras antigas de uma tabela (exceto a do 2FA, da 071)
create or replace function pg_temp.limpar_regras(p_tabela text)
returns void
language plpgsql
as $$
declare
  r record;
begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = p_tabela and policyname <> 'mfa_obrigatorio' loop
    execute format('drop policy %I on public.%I', r.policyname, p_tabela);
  end loop;
end;
$$;

-- 1. Marketing ---------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['marketing_marcas', 'marketing_conteudos', 'marketing_personas', 'marketing_ciclos',
                           'marketing_recursos', 'marketing_leads', 'marketing_prospects'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    perform pg_temp.limpar_regras(t);
    if t = 'marketing_marcas' then
      execute 'create policy marketing_marcas_ler on public.marketing_marcas for select to authenticated using (true)';
      execute 'create policy marketing_marcas_gerir on public.marketing_marcas for all to authenticated using (public.bizin_pode_marketing()) with check (public.bizin_pode_marketing())';
    elsif t = 'marketing_conteudos' then
      execute 'create policy marketing_conteudos_ler on public.marketing_conteudos for select to authenticated
                 using (public.bizin_pode_marketing() or auth.uid() = any (aprovadores))';
      execute 'create policy marketing_conteudos_criar on public.marketing_conteudos for insert to authenticated
                 with check (public.bizin_pode_marketing())';
      execute 'create policy marketing_conteudos_alterar on public.marketing_conteudos for update to authenticated
                 using (public.bizin_pode_marketing() or auth.uid() = any (aprovadores))
                 with check (public.bizin_pode_marketing() or auth.uid() = any (aprovadores))';
      execute 'create policy marketing_conteudos_apagar on public.marketing_conteudos for delete to authenticated
                 using (public.bizin_pode_marketing())';
    else
      execute format('create policy %I on public.%I for all to authenticated using (public.bizin_pode_marketing()) with check (public.bizin_pode_marketing())',
                     t || '_marketing', t);
    end if;
  end loop;
end $$;

-- 2. software ------------------------------------------------------------------
do $$
begin
  if to_regclass('public.software') is not null then
    alter table public.software enable row level security;
    perform pg_temp.limpar_regras('software');
    create policy software_ativos_ti on public.software for all to authenticated
      using (public.bizin_pode_acessos_ti()) with check (public.bizin_pode_acessos_ti());
  end if;
end $$;

-- 3. proposta_cursos -------------------------------------------------------------
do $$
begin
  if to_regclass('public.proposta_cursos') is not null then
    alter table public.proposta_cursos enable row level security;
    perform pg_temp.limpar_regras('proposta_cursos');
    create policy proposta_cursos_gestao on public.proposta_cursos for all to authenticated
      using (public.bizin_e_staff()) with check (public.bizin_e_staff());
  end if;
end $$;

-- 4. notificacoes_projetos: criar só em nome próprio e com link interno --------------
drop policy if exists notificacoes_projetos_insert_authenticated on public.notificacoes_projetos;
create policy notificacoes_projetos_insert_authenticated on public.notificacoes_projetos
  for insert to authenticated
  with check (
    (created_by is null or created_by = auth.uid())
    and (link is null or (link like '/%' and link not like '//%'))
  );

-- 5. provisionar_saldos_ferias: só gestão (o cron e o servidor não têm auth.uid()) ------
create or replace function public.provisionar_saldos_ferias(p_ano integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.bizin_e_staff() then
    raise exception 'Só a gestão pode preparar os saldos de férias.' using errcode = '42501';
  end if;

  insert into public.vacation_balances as saldo (user_id, ano, dias_atribuidos, dias_transitados, transito_expira_em)
  select
    profiles.id,
    p_ano,
    case
      when data_admissao is not null and extract(year from data_admissao::date) = p_ano
        then coalesce(dias_ferias_total, dias_ferias, 22)
      else 22
    end,
    coalesce(anterior.dias_disponiveis, 0),
    make_date(p_ano, 3, 31)
  from public.profiles
  left join public.vacation_balances anterior on anterior.user_id = profiles.id and anterior.ano = p_ano - 1
  where coalesce(ativo, true)
  on conflict (user_id, ano) do update
    set dias_transitados = case
          when saldo.ano = extract(year from current_date)::integer + 1 then excluded.dias_transitados
          else saldo.dias_transitados
        end,
        dias_gozados = public.calcular_dias_ferias_gozados(saldo.user_id, p_ano),
        atualizado_em = now();
end;
$$;
revoke all on function public.provisionar_saldos_ferias(integer) from public, anon;
grant execute on function public.provisionar_saldos_ferias(integer) to authenticated, service_role;

-- 6. Balde "documents" privado ----------------------------------------------------
update storage.buckets set public = false where id = 'documents';

do $$
declare
  r record;
begin
  -- regras antigas deste balde (criadas no painel), exceto as novas e a do 2FA
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname not in ('mfa_obrigatorio', 'documents_ler', 'documents_carregar', 'documents_apagar')
      and (coalesce(qual, '') like '%''documents''%' or coalesce(with_check, '') like '%''documents''%')
      -- só regras exclusivas deste balde: uma que sirva também outros baldes fica (senão cortava o acesso a esses)
      and coalesce(qual, '') || coalesce(with_check, '') !~ '''(avatars|forum_media|documentos|rh_anexos|chat_ficheiros|medalhas)'''
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

drop policy if exists documents_ler on storage.objects;
create policy documents_ler on storage.objects for select to authenticated
  using (bucket_id = 'documents');

drop policy if exists documents_carregar on storage.objects;
create policy documents_carregar on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.bizin_pode_marketing());

drop policy if exists documents_apagar on storage.objects;
create policy documents_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (owner = auth.uid() or public.bizin_pode_marketing()));

-- 7. Formação, Programas e Avisos: todos veem, criam e alteram; só a gestão apaga ----------
--    (decisão de 27/11/2026; pedidos_reembolso já era assim; o cofre fica como está)
do $$
declare
  t text;
begin
  foreach t in array array['acoes_formacao', 'acoes_formacao_checklist', 'areas_formacao', 'homologacoes_formacao',
                           'programas_financiamento', 'avisos'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    perform pg_temp.limpar_regras(t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_ler', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (true)', t || '_criar', t);
    execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', t || '_alterar', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.bizin_e_staff())', t || '_apagar', t);
  end loop;
end $$;
