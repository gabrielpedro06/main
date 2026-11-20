-- =====================================================================
-- 078 · Catálogo de programas para o BizInControl (leitura pública controlada)
-- Desde a 070 a tabela programas_financiamento só é legível com sessão; o
-- BizInControl lê com a chave pública (sem sessão) e passou a receber 0 linhas.
-- Esta função devolve SÓ o nome de todos os programas (ativos e inativos),
-- como pedido. A tabela continua protegida (ninguém sem sessão a lê
-- diretamente) e colunas novas da tabela NÃO ficam públicas automaticamente.
-- Se o BizInControl precisar de mais campos, acrescentá-los aqui, um a um.
-- Atenção: com o grant a anon, qualquer pessoa com a chave pública (que está no
-- site) consegue ler esta lista. Só incluir colunas que podem ser públicas.
-- Idempotente.
-- =====================================================================
drop function if exists public.bizin_programas_financiamento();

create function public.bizin_programas_financiamento()
returns table (nome text)
language sql
stable
security definer
set search_path = public
as $$
    select p.nome
      from public.programas_financiamento p
     order by p.nome;
$$;

revoke all on function public.bizin_programas_financiamento() from public;
grant execute on function public.bizin_programas_financiamento() to anon, authenticated;

-- Teste: deve devolver os nomes de todos os programas
select nome from public.bizin_programas_financiamento();
