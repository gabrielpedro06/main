-- Move prazo tracking from programas to avisos and support multiple phases

alter table if exists public.avisos
add column if not exists fases jsonb not null default '[]'::jsonb;

alter table if exists public.programas_financiamento
drop column if exists prazo_fase_1,
drop column if exists prazo_fase_2;

drop trigger if exists trg_avisos_updated_at on public.avisos;
create trigger trg_avisos_updated_at
before update on public.avisos
for each row execute function public.set_updated_at_generic();
