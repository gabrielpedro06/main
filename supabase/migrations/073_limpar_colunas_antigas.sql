-- =====================================================================
-- 073 — Segurança (Fase 3, passo 3): LIMPAR as cópias antigas
--
-- ⚠️  SÓ CORRER DEPOIS DE CONFIRMAR QUE TUDO FUNCIONA com a 072 e a app nova:
--     - Clientes → Acessos: mostrar, copiar, editar e criar passwords
--     - Ativos TI → Acessos: o mesmo
--     - Perfil e Recursos Humanos: NIF, NISS, CC, morada, S.A. aparecem e gravam
--     - PDFs dos RH (individual, deslocações) com NIF e S.A.
--
-- O que faz (isto NÃO se desfaz; os dados continuam no cofre e em profiles_privado):
--   1. Pára a sincronização da transição.
--   2. Esvazia as colunas antigas (as colunas ficam, vazias, para nada partir).
--   3. Garante que cada perfil novo tem a sua linha privada.
-- =====================================================================

-- 0. Segurança: não continua se algum dado ainda não estiver copiado
do $$
declare
  faltam int;
begin
  select count(*) into faltam from public.acessos_cliente where coalesce(codigo, '') <> '' and segredo_id is null;
  if faltam > 0 then raise exception 'Há % acessos de clientes sem cópia no cofre. Corra a 072 de novo.', faltam; end if;
  select count(*) into faltam from public.acessos where coalesce(password, '') <> '' and segredo_id is null;
  if faltam > 0 then raise exception 'Há % acessos de TI sem cópia no cofre. Corra a 072 de novo.', faltam; end if;
  select count(*) into faltam from public.profiles p where not exists (select 1 from public.profiles_privado x where x.id = p.id);
  if faltam > 0 then raise exception 'Há % perfis sem linha em profiles_privado. Corra a 072 de novo.', faltam; end if;
end $$;

-- 1. Fim da transição
drop trigger if exists cofre_sincronizar on public.acessos_cliente;
drop trigger if exists cofre_sincronizar on public.acessos;
drop trigger if exists profiles_sincronizar_privado on public.profiles;

-- 2. Esvaziar as colunas antigas (deixam de ser obrigatórias; o mesmo que a 072b)
alter table public.acessos alter column password drop not null;
alter table public.acessos_cliente alter column codigo drop not null;
do $$
declare
  c text;
begin
  foreach c in array array['nif', 'niss', 'ncc', 'validade_cc', 'morada', 'concelho', 'estado_civil',
                           'nacionalidade', 'sexo', 'nr_dependentes', 'valor_sa'] loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'profiles' and column_name = c and is_nullable = 'NO') then
      execute format('alter table public.profiles alter column %I drop not null', c);
    end if;
  end loop;
end $$;

update public.acessos_cliente set codigo = null where codigo is not null;
update public.acessos set password = null where password is not null;

do $$
declare
  c text;
begin
  foreach c in array array['nif', 'niss', 'ncc', 'validade_cc', 'morada', 'concelho', 'estado_civil',
                           'nacionalidade', 'sexo', 'nr_dependentes', 'valor_sa'] loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'profiles' and column_name = c) then
      execute format('update public.profiles set %1$I = null where %1$I is not null', c);
    end if;
  end loop;
end $$;

-- 3. Perfis novos (convites) recebem logo a linha privada
create or replace function public.profiles_criar_privado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles_privado (id) values (new.id) on conflict (id) do nothing;
  return null;
end;
$$;
revoke all on function public.profiles_criar_privado() from public, anon, authenticated;
drop trigger if exists profiles_criar_privado on public.profiles;
create trigger profiles_criar_privado after insert on public.profiles
  for each row execute function public.profiles_criar_privado();

-- Confirmação: tudo a zero nas colunas antigas
select
  (select count(*) from public.acessos_cliente where codigo is not null) as acessos_cliente_em_claro,
  (select count(*) from public.acessos where password is not null) as acessos_ti_em_claro,
  (select count(*) from public.profiles where nif is not null or niss is not null) as perfis_com_nif_niss;
