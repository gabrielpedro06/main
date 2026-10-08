-- Permite ao RH sincronizar os saldos depois de aprovar ou cancelar férias.
create policy "RH insere saldos de férias"
  on public.vacation_balances for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and lower(coalesce(profiles.role::text, profiles.tipo::text, '')) in ('admin', 'administrador', 'rh', 'recursos humanos')
    )
  );

create policy "RH atualiza saldos de férias"
  on public.vacation_balances for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and lower(coalesce(profiles.role::text, profiles.tipo::text, '')) in ('admin', 'administrador', 'rh', 'recursos humanos')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and lower(coalesce(profiles.role::text, profiles.tipo::text, '')) in ('admin', 'administrador', 'rh', 'recursos humanos')
    )
  );
