-- Permite ao endpoint seguro de aprovação por email executar a sincronização.
grant execute on function public.provisionar_saldos_ferias(integer) to service_role;
