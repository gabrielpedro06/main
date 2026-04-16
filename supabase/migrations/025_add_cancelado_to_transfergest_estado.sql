alter table if exists public.transfergest_registos
  drop constraint if exists transfergest_estado_chk;

alter table if exists public.transfergest_registos
  add constraint transfergest_estado_chk
  check (estado in ('novo', 'contactado', 'reuniao', 'cancelado', 'proposta', 'ganho', 'perdido'));
