-- =====================================================================
-- 072b — As colunas antigas das palavras-passe deixam de ser obrigatórias
--
-- A app nova guarda a palavra-passe no cofre e não a envia para estas colunas;
-- se continuassem "NOT NULL", criar um acesso novo dava erro.
-- Não apaga nem altera nenhum dado. Pode correr mais do que uma vez.
-- =====================================================================
alter table public.acessos alter column password drop not null;
alter table public.acessos_cliente alter column codigo drop not null;

-- O mesmo para as colunas sensíveis antigas de profiles (se alguma for obrigatória)
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
