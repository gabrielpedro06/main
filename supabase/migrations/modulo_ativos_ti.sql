-- =====================================================================
--  Bizinmanager · Módulo "Ativos TI + Cofre de Acessos"
--  PostgreSQL 14+ / Supabase
--
--  Regras aplicadas:
--   • Chaves primárias: GENERATED ALWAYS AS IDENTITY
--   • Nomenclatura: snake_case estrito
--   • Auditoria em cada entidade: criado_em / atualizado_em / arquivado_em
--   • Pessoas → FK para profiles(id) [uuid] — tabela global já existente
--   • Campos organizacionais (empresa_interna, cliente, fornecedor) ficam
--     em texto, seguindo a convenção de profiles.empresa_interna. Se
--     existir uma tabela global (empresas/entidades), substitua por FK.
--   • Segredos NÃO são guardados em claro: credencial.segredo_ref aponta
--     para um gestor de segredos (Passbolt / Vault / 1Password / Bitwarden).
-- =====================================================================

-- ---------------------------------------------------------------------
--  Função de auditoria: mantém atualizado_em em cada UPDATE
-- ---------------------------------------------------------------------
create or replace function set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- =====================================================================
--  TABELAS DE APOIO
-- =====================================================================
create table tipo_equipamento (
    id            bigint generated always as identity primary key,
    nome          varchar(60) not null unique,          -- Portátil, Desktop, Servidor...
    categoria     varchar(40),                          -- Computação, Rede, Periférico, Móvel
    icone         varchar(40),
    criado_em     timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    arquivado_em  timestamptz
);

create table localizacao (
    id            bigint generated always as identity primary key,
    nome          varchar(120) not null,                -- "Sede - Piso 2 - Sala 3"
    morada        varchar(255),
    criado_em     timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    arquivado_em  timestamptz
);

-- =====================================================================
--  HARDWARE (Ativo Físico)
-- =====================================================================
create table ativo_equipamento (
    id              bigint generated always as identity primary key,
    num_inventario  varchar(40)  not null unique,       -- asset tag etiquetado
    tipo_id         bigint not null references tipo_equipamento(id),
    marca           varchar(80),
    modelo          varchar(120),
    num_serie       varchar(120),
    especificacoes  jsonb,                              -- {cpu, ram_gb, disco_gb, ...}
    estado          varchar(20) not null default 'em_stock'
        check (estado in ('em_uso','em_stock','em_reparacao','reservado','abatido')),
    empresa_interna varchar(120),                        -- empresa proprietária (texto)
    localizacao_id  bigint references localizacao(id),
    colaborador_id  uuid references profiles(id),        -- atribuído a
    fornecedor      varchar(160),
    data_aquisicao  date,
    custo_aquisicao numeric(12,2),
    fim_garantia    date,
    fim_vida        date,
    dados_apagados  boolean not null default false,      -- RGPD: wipe seguro no abate
    notas           text,
    criado_em       timestamptz not null default now(),
    atualizado_em   timestamptz not null default now(),
    arquivado_em    timestamptz
);
create index idx_equip_estado      on ativo_equipamento(estado);
create index idx_equip_colaborador on ativo_equipamento(colaborador_id);
create index idx_equip_garantia    on ativo_equipamento(fim_garantia);

-- =====================================================================
--  SOFTWARE (Catálogo)
-- =====================================================================
create table software (
    id                   bigint generated always as identity primary key,
    nome                 varchar(160) not null,
    fabricante           varchar(120),
    versao               varchar(60),
    tipo                 varchar(20) not null default 'aplicacao'
        check (tipo in ('sistema_operativo','aplicacao','saas','servico')),
    categoria            varchar(80),
    modelo_licenciamento varchar(20)
        check (modelo_licenciamento in
            ('perpetua','subscricao','oem','volume','open_source','freeware')),
    swid_tag             varchar(255),                   -- ISO/IEC 19770-2
    criado_em            timestamptz not null default now(),
    atualizado_em        timestamptz not null default now(),
    arquivado_em         timestamptz,
    unique (nome, versao, fabricante)
);

-- =====================================================================
--  LICENÇAS
-- =====================================================================
create table licenca (
    id              bigint generated always as identity primary key,
    software_id     bigint not null references software(id),
    empresa_interna varchar(120),
    fornecedor      varchar(160),
    tipo_licenca    varchar(20) not null default 'por_dispositivo'
        check (tipo_licenca in ('por_dispositivo','por_utilizador','por_posto','ilimitada')),
    postos_totais   integer not null default 1 check (postos_totais >= 0),
    chave           varchar(255),
    data_inicio     date,
    data_renovacao  date,
    data_expiracao  date,
    custo           numeric(12,2),
    periodicidade   varchar(20)
        check (periodicidade in ('unica','mensal','trimestral','anual')),
    documento_url   varchar(500),
    criado_em       timestamptz not null default now(),
    atualizado_em   timestamptz not null default now(),
    arquivado_em    timestamptz
);
create index idx_licenca_software on licenca(software_id);
create index idx_licenca_expira   on licenca(data_expiracao);

-- =====================================================================
--  INSTALAÇÃO (ligação Hardware × Software × Licença)
-- =====================================================================
create table instalacao (
    id              bigint generated always as identity primary key,
    equipamento_id  bigint not null references ativo_equipamento(id) on delete cascade,
    software_id     bigint not null references software(id),
    licenca_id      bigint references licenca(id),       -- posto consumido (nulo p/ freeware)
    data_instalacao date not null default current_date,
    data_remocao    date,
    estado          varchar(15) not null default 'ativa'
        check (estado in ('ativa','removida')),
    criado_em       timestamptz not null default now(),
    atualizado_em   timestamptz not null default now(),
    arquivado_em    timestamptz,
    unique (equipamento_id, software_id, data_instalacao)
);
create index idx_inst_equip   on instalacao(equipamento_id);
create index idx_inst_licenca on instalacao(licenca_id);

-- =====================================================================
--  SITE / PLATAFORMA (ativo digital)
-- =====================================================================
create table site (
    id                 bigint generated always as identity primary key,
    nome               varchar(160) not null,
    url                varchar(500) not null,
    tipo_cms           varchar(40)
        check (tipo_cms in ('wordpress','joomla','drupal','shopify','webflow','custom','outro')),
    ambiente           varchar(20) not null default 'producao'
        check (ambiente in ('producao','staging','desenvolvimento')),
    empresa_interna    varchar(120),
    cliente            varchar(160),
    fornecedor_hosting varchar(160),
    estado             varchar(20) not null default 'ativo'
        check (estado in ('ativo','suspenso','arquivado')),
    notas              text,
    criado_em          timestamptz not null default now(),
    atualizado_em      timestamptz not null default now(),
    arquivado_em       timestamptz
);
create index idx_site_estado on site(estado);

-- =====================================================================
--  CREDENCIAL DE ACESSO (um site tem várias)
-- =====================================================================
create table credencial (
    id              bigint generated always as identity primary key,
    site_id         bigint not null references site(id) on delete cascade,
    tipo_acesso     varchar(30) not null
        check (tipo_acesso in
            ('cms_admin','ftp_sftp','base_dados','painel_hosting','dns','registo_dominio','api','outro')),
    utilizador      varchar(160),
    segredo_ref     varchar(255) not null,   -- referência ao gestor de segredos (NUNCA a password)
    url_login       varchar(500),
    mfa_ativo       boolean not null default false,
    responsavel_id  uuid references profiles(id),
    ultima_rotacao  date,
    proxima_rotacao date,
    criado_em       timestamptz not null default now(),
    atualizado_em   timestamptz not null default now(),
    arquivado_em    timestamptz
);
create index idx_cred_site    on credencial(site_id);
create index idx_cred_rotacao on credencial(proxima_rotacao);

-- =====================================================================
--  AUDITORIA DE ACESSOS (logs de revelação de segredo — append-only)
-- =====================================================================
create table acesso_log (
    id            bigint generated always as identity primary key,
    credencial_id bigint not null references credencial(id) on delete cascade,
    profile_id    uuid   not null references profiles(id),   -- quem executou a ação
    acao          varchar(20) not null
        check (acao in ('revelou','copiou','criou','editou','rodou','removeu')),
    ip            inet,
    user_agent    text,
    registado_em  timestamptz not null default now()
    -- sem atualizado_em/arquivado_em: registo de auditoria é imutável
);
create index idx_log_cred    on acesso_log(credencial_id);
create index idx_log_profile on acesso_log(profile_id);

-- =====================================================================
--  TRIGGERS de atualizado_em
-- =====================================================================
create trigger trg_tipo_equipamento_upd  before update on tipo_equipamento
    for each row execute function set_atualizado_em();
create trigger trg_localizacao_upd        before update on localizacao
    for each row execute function set_atualizado_em();
create trigger trg_ativo_equipamento_upd  before update on ativo_equipamento
    for each row execute function set_atualizado_em();
create trigger trg_software_upd           before update on software
    for each row execute function set_atualizado_em();
create trigger trg_licenca_upd            before update on licenca
    for each row execute function set_atualizado_em();
create trigger trg_instalacao_upd         before update on instalacao
    for each row execute function set_atualizado_em();
create trigger trg_site_upd               before update on site
    for each row execute function set_atualizado_em();
create trigger trg_credencial_upd         before update on credencial
    for each row execute function set_atualizado_em();

-- =====================================================================
--  VISTAS de apoio (conformidade e rotação)
-- =====================================================================
create view vw_conformidade_licenca as
select  l.id            as licenca_id,
        s.nome          as software,
        l.postos_totais,
        count(i.id) filter (where i.estado = 'ativa')                   as postos_usados,
        l.postos_totais - count(i.id) filter (where i.estado = 'ativa') as saldo,
        case
            when count(i.id) filter (where i.estado = 'ativa') > l.postos_totais then 'sobre_utilizada'
            when count(i.id) filter (where i.estado = 'ativa') = l.postos_totais then 'no_limite'
            else 'conforme'
        end as situacao
from        licenca   l
join        software  s on s.id = l.software_id
left join   instalacao i on i.licenca_id = l.id
where       l.arquivado_em is null
group by    l.id, s.nome, l.postos_totais;

create view vw_rotacao_pendente as
select  c.id                               as credencial_id,
        s.nome                             as site,
        c.tipo_acesso,
        c.proxima_rotacao,
        (c.proxima_rotacao - current_date) as dias_para_rotacao,
        case
            when c.proxima_rotacao <  current_date      then 'vencida'
            when c.proxima_rotacao <  current_date + 15 then 'proxima'
            else 'ok'
        end as situacao
from        credencial c
join        site       s on s.id = c.site_id
where       c.proxima_rotacao is not null
  and       c.arquivado_em is null;
