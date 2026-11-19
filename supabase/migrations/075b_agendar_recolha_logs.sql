-- =====================================================================
-- 075b · AGENDAR A RECOLHA DOS LOGS DO SUPABASE (a cada 10 minutos)
-- Correr DEPOIS da 075 e DEPOIS de publicar a nova versão no Vercel.
--
-- Antes de correr, troque no passo 2 o endereço pelo domínio real da app
-- (ex.: https://bizinmanager.pt). Depois siga os passos 4 e 5 no fim.
-- =====================================================================

-- 1) Extensões: agendador (pg_cron) e pedidos HTTP a partir da BD (pg_net)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2) Endereço da app e segredo partilhado, guardados no Vault (cifrados)
do $$
begin
    if not exists (select 1 from vault.secrets where name = 'bizin_seguranca_url') then
        perform vault.create_secret('https://O-SEU-DOMINIO/api/seguranca/recolher', 'bizin_seguranca_url');   -- <== trocar
    end if;
    if not exists (select 1 from vault.secrets where name = 'bizin_seguranca_segredo') then
        perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'bizin_seguranca_segredo');
    end if;
end;
$$;

-- 3) Tarefas agendadas (recriadas se já existirem)
do $$
begin
    perform cron.unschedule(jobid) from cron.job where jobname in ('bizin-seguranca-recolha', 'bizin-seguranca-limpeza');
end;
$$;

select cron.schedule(
    'bizin-seguranca-recolha',
    '*/10 * * * *',
    $c$
    select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'bizin_seguranca_url'),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-segredo', (select decrypted_secret from vault.decrypted_secrets where name = 'bizin_seguranca_segredo')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 55000
    );
    $c$
);

-- Limpeza mensal: logs e tentativas com mais de 180 dias (os alertas ficam)
select cron.schedule('bizin-seguranca-limpeza', '30 3 1 * *', $c$select public.seguranca_limpar(180)$c$);

-- 4) Mostra o segredo UMA vez para o copiar para o Vercel
--    (Settings → Environment Variables → SEGURANCA_CRON_SEGREDO)
select decrypted_secret as copiar_para_o_vercel_SEGURANCA_CRON_SEGREDO
  from vault.decrypted_secrets where name = 'bizin_seguranca_segredo';

-- 5) Se precisar de corrigir o endereço mais tarde:
--    select vault.update_secret(
--        (select id from vault.secrets where name = 'bizin_seguranca_url'),
--        'https://bizinmanager.pt/api/seguranca/recolher');
--
-- Ver as últimas execuções:
--    select status, return_message, start_time from cron.job_run_details
--     where jobid = (select jobid from cron.job where jobname = 'bizin-seguranca-recolha')
--     order by start_time desc limit 10;
-- Ver as respostas do servidor:
--    select status_code, content, created from net._http_response order by created desc limit 10;
