-- =====================================================================
-- Medalhas de eventos internos (Recursos Humanos)
-- Uma medalha = um evento (nome + data + imagem PNG); é atribuída a vários colaboradores.
-- A imagem fica no balde público "medalhas" do Storage.
-- Todos os utilizadores autenticados veem as medalhas (aparecem no perfil);
-- só admin/gestor (quem tem acesso aos RH) cria, edita, atribui e apaga.
-- =====================================================================

create table if not exists public.medalhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) between 1 and 120),
  data date not null,
  descricao text check (descricao is null or length(descricao) <= 500),
  imagem_path text not null,           -- caminho no balde "medalhas"
  imagem_url text not null,            -- URL pública da imagem
  criado_por uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medalhas_colaboradores (
  medalha_id uuid not null references public.medalhas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  atribuida_por uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (medalha_id, user_id)
);

create index if not exists medalhas_colaboradores_user_idx on public.medalhas_colaboradores (user_id);
create index if not exists medalhas_data_idx on public.medalhas (data desc);

-- updated_at automático
create or replace function public.medalhas_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists medalhas_touch_updated_at on public.medalhas;
create trigger medalhas_touch_updated_at
  before update on public.medalhas
  for each row execute function public.medalhas_touch_updated_at();

-- Quem pode gerir medalhas (mesmos papéis que veem os Recursos Humanos)
create or replace function public.pode_gerir_medalhas()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role::text, p.tipo::text, '')) in ('admin', 'administrador', 'gestor')
  );
$$;

revoke all on function public.pode_gerir_medalhas() from public;
grant execute on function public.pode_gerir_medalhas() to authenticated;

alter table public.medalhas enable row level security;
alter table public.medalhas_colaboradores enable row level security;

-- Leitura: qualquer utilizador autenticado
drop policy if exists medalhas_select on public.medalhas;
create policy medalhas_select on public.medalhas
  for select to authenticated using (true);

drop policy if exists medalhas_colab_select on public.medalhas_colaboradores;
create policy medalhas_colab_select on public.medalhas_colaboradores
  for select to authenticated using (true);

-- Escrita: só admin/gestor
drop policy if exists medalhas_insert on public.medalhas;
create policy medalhas_insert on public.medalhas
  for insert to authenticated with check (public.pode_gerir_medalhas());

drop policy if exists medalhas_update on public.medalhas;
create policy medalhas_update on public.medalhas
  for update to authenticated using (public.pode_gerir_medalhas()) with check (public.pode_gerir_medalhas());

drop policy if exists medalhas_delete on public.medalhas;
create policy medalhas_delete on public.medalhas
  for delete to authenticated using (public.pode_gerir_medalhas());

drop policy if exists medalhas_colab_insert on public.medalhas_colaboradores;
create policy medalhas_colab_insert on public.medalhas_colaboradores
  for insert to authenticated with check (public.pode_gerir_medalhas());

drop policy if exists medalhas_colab_delete on public.medalhas_colaboradores;
create policy medalhas_colab_delete on public.medalhas_colaboradores
  for delete to authenticated using (public.pode_gerir_medalhas());

grant select, insert, update, delete on public.medalhas to authenticated;
grant select, insert, delete on public.medalhas_colaboradores to authenticated;

-- ---------------------------------------------------------------------
-- Storage: balde público "medalhas" (imagens PNG/WebP/JPEG até 2 MB)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('medalhas', 'medalhas', true, 2097152, array['image/png', 'image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists medalhas_storage_select on storage.objects;
create policy medalhas_storage_select on storage.objects
  for select using (bucket_id = 'medalhas');

drop policy if exists medalhas_storage_insert on storage.objects;
create policy medalhas_storage_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'medalhas' and public.pode_gerir_medalhas());

drop policy if exists medalhas_storage_update on storage.objects;
create policy medalhas_storage_update on storage.objects
  for update to authenticated using (bucket_id = 'medalhas' and public.pode_gerir_medalhas());

drop policy if exists medalhas_storage_delete on storage.objects;
create policy medalhas_storage_delete on storage.objects
  for delete to authenticated using (bucket_id = 'medalhas' and public.pode_gerir_medalhas());
