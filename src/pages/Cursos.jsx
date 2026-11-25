// =====================================================================
// Cursos (rota /dashboard/cursos) — catálogo de cursos usado nas propostas
// de formação.
//
// Cada curso (tabela cursos) tem nome, duração, valor, textos para a proposta
// (enquadramento, objetivos pedagógicos, metodologia, honorários, plano de
// pagamento, considerações) e uma lista de módulos (jsonb).
// Cartões + gaveta lateral para ver/editar; modal para criar.
// Regras (migração 032): todos com sessão leem e criam; só o criador
// (criado_por) edita e apaga (para os outros a gravação não muda nada).
// Documentação: docs/modulos/clientes-e-comercial.md
// =====================================================================
import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../services/supabase';
import './gestao.css';
import { confirmar } from "../utils/dialogo";
import { OctagonX, TriangleAlert, CircleCheck } from "lucide-react";
import PageHero from "../components/PageHero";

const Icons = {
  Plus: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
  Edit: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  ),
  Trash: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  ),
  Eye: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  ),
  Close: ({ size = 18, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  Search: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
  BookOpen: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5a2 2 0 0 1 2-2h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H4a2 2 0 0 1-2-2V5z"></path>
      <path d="M22 5a2 2 0 0 0-2-2h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7a2 2 0 0 0 2-2V5z"></path>
    </svg>
  ),
  Layers: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 22 7 12 12 2 7 12 2"></polygon>
      <polyline points="2 17 12 22 22 17"></polyline>
      <polyline points="2 12 12 17 22 12"></polyline>
    </svg>
  ),
  Lock: ({ size = 16, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  ),
};

const DEFAULT_FORM = {
  nome: '',
  duracao_horas: 0,
  texto_enquadramento: '',
  objetivos_pedagogicos: '',
  metodologia: '',
  honorarios_texto: '',
  plano_pagamento: '',
  valor: 0,
  consideracoes: '',
  modulos: [],
  ativo: true,
};

const fieldStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid #dbe3ef',
  background: '#fff',
  color: '#0f172a',
  fontSize: '0.96rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '0.84rem',
  fontWeight: 700,
  color: '#475569',
  letterSpacing: '0.01em',
};

const sectionTitleStyle = {
  fontSize: '0.76rem',
  fontWeight: 800,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '14px',
  marginTop: '24px',
  borderBottom: '1px solid #e2e8f0',
  paddingBottom: '6px',
};

const ModalPortal = ({ children }) => ReactDOM.createPortal(children, document.body);
const ToastPortal = ({ children }) => ReactDOM.createPortal(children, document.body);

function getCourseAccent(seed = '') {
  const palette = ['#0f172a', '#c2410c', '#db2777', '#0f766e', '#1d4ed8', '#7c3aed', '#b45309'];
  const hash = String(seed).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CUR';
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function Toast({ notification, onClose }) {
  if (!notification) return null;

  const isError = notification.type === 'error';
  const isWarning = notification.type === 'warning';

  const colors = isError
    ? { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', accent: '#dc2626', icon: <OctagonX size={18} aria-hidden="true" /> }
    : isWarning
      ? { bg: '#fffbeb', border: '#fde68a', text: '#92400e', accent: '#d97706', icon: <TriangleAlert size={18} aria-hidden="true" /> }
      : { bg: '#ffffff', border: 'var(--color-borderColorLight)', text: 'var(--color-textPrimary)', accent: 'var(--color-btnPrimary)', icon: <CircleCheck size={18} aria-hidden="true" /> };

  return (
    <ToastPortal>
      <div style={{ position: 'fixed', top: 22, right: 22, zIndex: "calc(var(--z-modal-topo) + 1)", width: 'min(420px, calc(calc(100 * var(--bz-vw, 1vw)) - 32px))', pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 18, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderLeft: `5px solid ${colors.accent}`, boxShadow: '0 22px 40px rgba(15, 23, 42, 0.18)', backdropFilter: 'blur(6px)' }}>
          <div style={{ width: 30, height: 30, borderRadius: 999, display: 'grid', placeItems: 'center', flexShrink: 0, background: isError ? '#fecaca' : isWarning ? '#fde68a' : 'var(--color-bgSecondary)', color: colors.accent, fontSize: '0.95rem', fontWeight: 900 }}>
            {colors.icon}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, lineHeight: 1.35 }}>{notification.message}</div>
          </div>
          <button aria-label="Fechar" type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 0, flexShrink: 0, opacity: 0.75 }}>
            <Icons.Close size={16} />
          </button>
        </div>
      </div>
    </ToastPortal>
  );
}

function formatDuration(value) {
  const hours = Number(value) || 0;
  return `${hours}h`;
}

function formatCurrency(value) {
  const amount = Number(value) || 0;
  return amount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function getModulesHours(modules = []) {
  return (Array.isArray(modules) ? modules : []).reduce((total, module) => total + Number(module.duracao_horas || 0), 0);
}

function isCourseActive(curso) {
  return curso?.ativo !== false;
}

function CourseCard({ curso, onView, onEdit, onDelete }) {
  const accent = getCourseAccent(curso.nome);
  const modulesCount = Array.isArray(curso.modulos) ? curso.modulos.length : 0;
  const active = isCourseActive(curso);

  return (
    <div style={{ background: 'var(--sup-1)', borderRadius: '22px', border: '1px solid #dbe3ef', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 240 }}>
      <div style={{ height: 5, background: accent }} />
      <div style={{ padding: '18px 18px 14px 18px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
            <div style={{ alignSelf: 'flex-start', padding: '4px 10px', borderRadius: '999px', background: 'var(--n-50)', border: '1px solid var(--n-200)', color: 'var(--n-500)', fontSize: '0.72rem', fontWeight: 800 }}>
              {formatDuration(curso.duracao_horas)}
            </div>
            <h3 style={{ margin: 0, color: 'var(--n-900)', fontSize: '1.25rem', lineHeight: 1.08, fontWeight: 900, letterSpacing: '-0.02em' }}>
              {curso.nome}
            </h3>
          </div>
          <div style={{ minWidth: 42, height: 32, padding: '0 10px', borderRadius: '999px', border: '1px solid #eadfd4', background: 'linear-gradient(180deg, #fffaf3, var(--sup-1))', color: 'var(--cx-7c2d12, #7c2d12)', fontSize: '0.78rem', fontWeight: 900, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            {getInitials(curso.nome)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--n-700)', fontSize: '0.92rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.Layers size={15} color="#94a3b8" />
            <span>{modulesCount} módulo{modulesCount === 1 ? '' : 's'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.BookOpen size={15} color="#94a3b8" />
            <span style={{ color: curso.ativo ? '#059669' : '#dc2626', fontWeight: 700 }}>
              {active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #eef2f7', display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '8px', padding: '12px 14px' }}>
        <button type="button" onClick={onView} style={{ border: 'none', background: 'transparent', color: 'var(--cx-92400e, #92400e)', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 8px', borderRadius: '12px' }}>
          <Icons.Eye size={16} />
          Ver Curso
        </button>
        <button aria-label="Editar" type="button" onClick={onEdit} style={{ width: 38, height: 38, borderRadius: '12px', border: '1px solid #fed7aa', background: 'var(--cx-fff7ed, #fff7ed)', color: '#f59e0b', cursor: 'pointer', display: 'grid', placeItems: 'center' }} title="Editar">
          <Icons.Edit size={16} />
        </button>
        <button aria-label="Eliminar" type="button" onClick={onDelete} style={{ width: 38, height: 38, borderRadius: '12px', border: '1px solid #fecaca', background: '#fff1f2', color: '#ef4444', cursor: 'pointer', display: 'grid', placeItems: 'center' }} title="Eliminar">
          <Icons.Trash size={16} />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onNew }) {
  return (
    <div style={{ minHeight: 320, display: 'grid', placeItems: 'center', padding: '28px 16px' }}>
      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center', border: '1px solid var(--n-200)', background: 'linear-gradient(180deg, var(--sup-1), var(--n-50))', borderRadius: 24, padding: '34px 28px', boxShadow: '0 14px 36px rgba(15, 23, 42, 0.06)' }}>
        <div style={{ width: 72, height: 72, borderRadius: 24, margin: '0 auto 18px', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, var(--color-bgSecondary), var(--sup-1))', color: 'var(--color-btnPrimary)', boxShadow: '0 14px 30px rgba(37, 99, 235, 0.12)' }}>
          <Icons.BookOpen size={32} />
        </div>
        <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', fontWeight: 900, color: 'var(--n-900)' }}>Ainda não existem cursos neste filtro</h3>
        <p style={{ margin: '0 auto 22px', color: 'var(--n-500)', lineHeight: 1.55, maxWidth: 420 }}>
          Cria um curso novo para começares a organizar os conteúdos, módulos e textos comerciais.
        </p>
        <button type="button" onClick={onNew} style={{ border: 'none', borderRadius: 14, padding: '12px 18px', background: 'linear-gradient(135deg, var(--color-btnPrimary), var(--color-btnPrimaryDark))', color: '#fff', fontWeight: 900, cursor: 'pointer', boxShadow: '0 12px 24px var(--color-btnPrimaryShadow)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icons.Plus size={16} />
            Novo Curso
          </span>
        </button>
      </div>
    </div>
  );
}

function CourseForm({ formData, setFormData, novoModulo, setNovoModulo, onAddModulo, onRemoveModulo, onSubmit, submitLabel, onCancel, isSaving, editable = true, editingModuleIdx, onEditModule, onCancelModuleForm }) {
  const modules = Array.isArray(formData.modulos) ? formData.modulos : [];
  const readOnlyStyle = editable ? {} : { background: '#f8fafc', color: '#475569' };
  const totalHours = getModulesHours(modules);

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: '18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Nome do Curso *</label>
          <input aria-label="Nome do Curso"
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            style={{ ...fieldStyle, ...readOnlyStyle }}
            placeholder="ex: Contabilidade Avançada"
            disabled={!editable || isSaving}
          />
        </div>
        <div>
          <label style={labelStyle}>Duração total</label>
          <input
            type="text"
            value={`${totalHours} horas`}
            readOnly
            style={{ ...fieldStyle, ...readOnlyStyle, background: 'var(--n-50)', color: 'var(--n-900)', fontWeight: 700 }}
          />
        </div>
      </div>

      <div style={sectionTitleStyle}>Textos do Curso</div>
      <div style={{ display: 'grid', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Enquadramento</label>
          <textarea
            value={formData.texto_enquadramento}
            onChange={(e) => setFormData({ ...formData, texto_enquadramento: e.target.value })}
            rows={3}
            style={{ ...fieldStyle, minHeight: 92, resize: 'vertical', ...readOnlyStyle }}
            disabled={!editable || isSaving}
          />
        </div>
        <div>
          <label style={labelStyle}>Objetivos Pedagógicos</label>
          <textarea
            value={formData.objetivos_pedagogicos}
            onChange={(e) => setFormData({ ...formData, objetivos_pedagogicos: e.target.value })}
            rows={3}
            style={{ ...fieldStyle, minHeight: 92, resize: 'vertical', ...readOnlyStyle }}
            disabled={!editable || isSaving}
          />
        </div>
        <div>
          <label style={labelStyle}>Metodologia</label>
          <textarea
            value={formData.metodologia}
            onChange={(e) => setFormData({ ...formData, metodologia: e.target.value })}
            rows={3}
            style={{ ...fieldStyle, minHeight: 92, resize: 'vertical', ...readOnlyStyle }}
            disabled={!editable || isSaving}
          />
        </div>
        <div>
          <label style={labelStyle}>Texto Honorários</label>
          <textarea
            value={formData.honorarios_texto}
            onChange={(e) => setFormData({ ...formData, honorarios_texto: e.target.value })}
            rows={2}
            style={{ ...fieldStyle, minHeight: 70, resize: 'vertical', ...readOnlyStyle }}
            disabled={!editable || isSaving}
          />
        </div>
        <div>
          <label style={labelStyle}>Plano de Pagamento</label>
          <textarea
            value={formData.plano_pagamento}
            onChange={(e) => setFormData({ ...formData, plano_pagamento: e.target.value })}
            rows={2}
            style={{ ...fieldStyle, minHeight: 70, resize: 'vertical', ...readOnlyStyle }}
            disabled={!editable || isSaving}
          />
        </div>
      </div>

      <div style={sectionTitleStyle}>Módulos</div>
      {modules.length > 0 && (
        <div style={{ display: 'grid', gap: '10px', maxHeight: 220, overflowY: 'auto', paddingRight: 2 }}>
          {modules.map((mod, idx) => (
            <div key={`${mod.nome || 'mod'}-${idx}`} style={{ border: '1px solid var(--n-200)', background: 'var(--n-50)', borderRadius: '16px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: 'var(--n-900)', fontSize: '0.92rem' }}>{mod.nome || 'Sem nome'}</div>
                <div style={{ color: 'var(--n-500)', fontSize: '0.78rem', marginTop: 4, fontWeight: 700 }}>{Number(mod.duracao_horas || 0)}h</div>
                {mod.conteudo && <div style={{ color: 'var(--n-500)', fontSize: '0.84rem', marginTop: 4, lineHeight: 1.4 }}>{mod.conteudo}</div>}
              </div>
              {editable && (
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button aria-label="Editar módulo" type="button" onClick={() => onEditModule(idx)} style={{ border: '1px solid #dbeafe', background: 'var(--cx-eff6ff, #eff6ff)', color: '#0284c7', borderRadius: '10px', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }} title="Editar módulo">
                    <Icons.Edit size={15} />
                  </button>
                  <button aria-label="Remover módulo" type="button" onClick={() => onRemoveModulo(idx)} style={{ border: '1px solid #fecaca', background: '#fff1f2', color: '#dc2626', borderRadius: '10px', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }} title="Remover módulo">
                    <Icons.Trash size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && editingModuleIdx === null && (
        <button type="button" onClick={() => onEditModule(null)} style={{ border: '1px solid var(--n-300)', background: 'var(--sup-1)', color: 'var(--n-900)', borderRadius: '12px', padding: '11px 14px', fontWeight: 800, cursor: 'pointer', width: '100%' }}>
          + Criar novo módulo
        </button>
      )}

      {editable && editingModuleIdx !== null && editingModuleIdx !== undefined && (
        <div style={{ background: 'var(--n-50)', border: '1px solid var(--n-200)', borderRadius: '18px', padding: '14px' }}>
          <div style={{ display: 'grid', gap: '10px' }}>
            <input aria-label="Nome do módulo"
              type="text"
              value={novoModulo.nome}
              onChange={(e) => setNovoModulo({ ...novoModulo, nome: e.target.value })}
              placeholder="Nome do módulo"
              style={fieldStyle}
              disabled={isSaving}
            />
            <input aria-label="Duração do módulo (horas)"
              type="number"
              min="0"
              step="0.5"
              value={novoModulo.duracao_horas}
              onChange={(e) => setNovoModulo({ ...novoModulo, duracao_horas: e.target.value })}
              placeholder="Duração do módulo (horas)"
              style={fieldStyle}
              disabled={isSaving}
            />
            <textarea aria-label="Conteúdo (opcional)"
              value={novoModulo.conteudo}
              onChange={(e) => setNovoModulo({ ...novoModulo, conteudo: e.target.value })}
              placeholder="Conteúdo (opcional)"
              rows={2}
              style={{ ...fieldStyle, minHeight: 72, resize: 'vertical' }}
              disabled={isSaving}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={onAddModulo} style={{ flex: 1, border: 'none', borderRadius: '12px', padding: '11px 14px', background: 'var(--color-btnPrimary)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                {editingModuleIdx >= 0 ? 'Atualizar Módulo' : 'Adicionar Módulo'}
              </button>
              <button type="button" onClick={onCancelModuleForm} style={{ flex: 1, border: '1px solid var(--n-300)', borderRadius: '12px', padding: '11px 14px', background: 'var(--sup-1)', color: 'var(--n-900)', fontWeight: 800, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={sectionTitleStyle}>Preço e Considerações</div>
      <div style={{ display: 'grid', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Valor (€)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.valor}
            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
            style={{ ...fieldStyle, minHeight: 48 }}
            disabled={!editable || isSaving}
          />
        </div>
        <div>
          <label style={labelStyle}>Considerações</label>
          <textarea
            value={formData.consideracoes}
            onChange={(e) => setFormData({ ...formData, consideracoes: e.target.value })}
            rows={3}
            style={{ ...fieldStyle, minHeight: 92, resize: 'vertical' }}
            disabled={!editable || isSaving}
          />
        </div>
      </div>

      {editable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid var(--n-200)', paddingTop: '16px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--n-900)', fontWeight: 700 }}>
            <input
              type="checkbox"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              disabled={isSaving}
              style={{ width: 16, height: 16 }}
            />
            Curso Ativo
          </label>
        </div>
      )}

      {/* rodapé dentro do formulário (que vive no corpo da janela): sem fundo nem cantos próprios */}
      <div className="jn-rodape" style={{ padding: '16px 0 0', background: 'transparent', borderRadius: 0 }}>
        {editable ? (
          <>
            <button type="button" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="is-primary" disabled={isSaving}>
              {isSaving ? 'A guardar…' : submitLabel}
            </button>
          </>
        ) : (
          <button type="button" onClick={onCancel}>
            Fechar
          </button>
        )}
      </div>
    </form>
  );
}

function CreateModal({ show, title, onClose, children }) {
  if (!show) return null;

  return (
    <ModalPortal>
      <div onClick={onClose} className="jn-fundo" style={{ zIndex: "calc(var(--z-modal) + 13)" }}>
        <div onClick={(e) => e.stopPropagation()} className="jn-caixa jn-simples is-folha" style={{ maxWidth: 920, maxHeight: 'calc(92 * var(--bz-vh, 1vh))', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <header className="jn-cabecalho">
            <span className="jn-cabecalho-ico"><Icons.BookOpen size={20} /></span>
            <div className="jn-cabecalho-txt">
              <h3>{title}</h3>
              <p>Novo curso</p>
            </div>
            <button type="button" className="jn-fechar" aria-label="Fechar" onClick={onClose}>
              <Icons.Close size={18} />
            </button>
          </header>
          <div className="jn-corpo">{children}</div>
        </div>
      </div>
    </ModalPortal>
  );
}

function SideDrawer({ show, isClosing, title, subtitle, onClose, children }) {
  if (!show) return null;

  return (
    <ModalPortal>
      <div onClick={onClose} className="jn-fundo" style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', zIndex: "calc(var(--z-modal) + 13)" }}>
        <div onClick={(e) => e.stopPropagation()} className="jn-caixa jn-simples" style={{ width: 'min(calc(98 * var(--bz-vw, 1vw)), 1180px)', height: 'calc(100 * var(--bz-vh, 1vh))', margin: 0, borderRadius: '24px 0 0 24px', animation: isClosing ? 'sidePanelPullOut 0.36s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'sidePanelPullIn 0.56s cubic-bezier(0.2, 0.9, 0.2, 1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100 * var(--bz-vh, 1vh))' }}>
          <header className="jn-cabecalho" style={{ borderRadius: '24px 0 0 0' }}>
            <span className="jn-cabecalho-ico"><Icons.BookOpen size={20} /></span>
            <div className="jn-cabecalho-txt">
              <span style={{ display: 'block', marginBottom: 2, fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--jn-acento)' }}>Curso</span>
              <h3>{title}</h3>
              {subtitle && <p>{subtitle}</p>}
            </div>
            <button type="button" className="jn-fechar" aria-label="Fechar" onClick={onClose}>
              <Icons.Close size={18} />
            </button>
          </header>
          <div className="jn-corpo" style={{ padding: '24px' }}>{children}</div>
        </div>
      </div>
    </ModalPortal>
  );
}

export default function Cursos() {
  const { user } = useAuth();
  const { themeColors } = useTheme();
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState('ativos');
  const [notification, setNotification] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isClosingDrawer, setIsClosingDrawer] = useState(false);
  const [drawerMode, setDrawerMode] = useState('view');
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [novoModulo, setNovoModulo] = useState({ nome: '', duracao_horas: 0, conteudo: '' });
  const [editingModuleIdx, setEditingModuleIdx] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.id) fetchCursos();
  }, [user?.id]);

  async function fetchCursos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cursos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCursos(data || []);
    } catch (err) {
      console.error('Erro ao carregar cursos:', err);
      showToast('Erro ao carregar cursos', 'error');
    } finally {
      setLoading(false);
    }
  }

  function showToast(message, type = 'success') {
    setNotification({ message, type });
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setNotification(null), 3000);
  }

  function resetForm() {
    setFormData(DEFAULT_FORM);
    setNovoModulo({ nome: '', duracao_horas: 0, conteudo: '' });
    setEditingModuleIdx(null);
    setEditId(null);
  }

  function handleNovo() {
    resetForm();
    setShowCreateModal(true);
  }

  function openDrawer(curso, mode = 'view') {
    setIsClosingDrawer(false);
    setEditId(curso.id);
    setDrawerMode(mode);
    setFormData({
      nome: curso.nome || '',
      duracao_horas: curso.duracao_horas ?? 0,
      texto_enquadramento: curso.texto_enquadramento || '',
      objetivos_pedagogicos: curso.objetivos_pedagogicos || '',
      metodologia: curso.metodologia || '',
      honorarios_texto: curso.honorarios_texto || '',
      plano_pagamento: curso.plano_pagamento || '',
      valor: curso.valor ?? curso.preco ?? 0,
      consideracoes: curso.consideracoes || '',
      modulos: Array.isArray(curso.modulos) ? curso.modulos : [],
      ativo: Boolean(curso.ativo),
    });
    setNovoModulo({ nome: '', duracao_horas: 0, conteudo: '' });
    setShowDrawer(true);
  }

  function openDrawerForEdit(curso) {
    openDrawer(curso, 'edit');
  }

  function openDrawerForView(curso) {
    openDrawer(curso, 'view');
  }

  function closeDrawer() {
    if (isClosingDrawer) return;
    setIsClosingDrawer(true);
    setTimeout(() => {
      setShowDrawer(false);
      setIsClosingDrawer(false);
      setEditId(null);
      setEditingModuleIdx(null);
    }, 360);
  }

  function handleEditModule(index) {
    if (index === null) {
      // Criar novo módulo - usar -1 para indicar modo de criação
      setNovoModulo({ nome: '', duracao_horas: 0, conteudo: '' });
      setEditingModuleIdx(-1);
    } else {
      // Editar módulo existente
      const modules = Array.isArray(formData.modulos) ? formData.modulos : [];
      const moduleToEdit = modules[index];
      if (moduleToEdit) {
        setNovoModulo({ nome: moduleToEdit.nome, duracao_horas: moduleToEdit.duracao_horas, conteudo: moduleToEdit.conteudo });
        setEditingModuleIdx(index);
      }
    }
  }

  function handleCancelModuleForm() {
    setNovoModulo({ nome: '', duracao_horas: 0, conteudo: '' });
    setEditingModuleIdx(null);
  }

  function handleAddModulo() {
    if (!novoModulo.nome.trim()) {
      showToast('Nome do módulo é obrigatório', 'error');
      return;
    }

    const duracaoHoras = Number(novoModulo.duracao_horas) || 0;
    const modules = Array.isArray(formData.modulos) ? formData.modulos : [];

    if (editingModuleIdx >= 0) {
      // Atualizar módulo existente
      const updatedModules = [...modules];
      updatedModules[editingModuleIdx] = { ...novoModulo, duracao_horas: duracaoHoras };
      setFormData({ ...formData, modulos: updatedModules });
    } else {
      // Adicionar novo módulo
      setFormData({
        ...formData,
        modulos: [...modules, { ...novoModulo, duracao_horas: duracaoHoras, ordem: modules.length }],
      });
    }

    setNovoModulo({ nome: '', duracao_horas: 0, conteudo: '' });
    setEditingModuleIdx(null);
  }

  function handleRemoveModulo(index) {
    const modules = Array.isArray(formData.modulos) ? formData.modulos : [];
    setFormData({
      ...formData,
      modulos: modules.filter((_, i) => i !== index),
    });
    // Se estava a editar o módulo que foi removido, cancela a edição
    if (editingModuleIdx === index) {
      handleCancelModuleForm();
    }
    // Se o índice que estava a editar era maior que o removido, decrementa
    if (editingModuleIdx > index) {
      setEditingModuleIdx(editingModuleIdx - 1);
    }
  }

  /** Insert/update do curso (criado_por = utilizador atual na criação). */
  async function saveCurso(isEdit) {
    if (!formData.nome.trim()) {
      showToast('Nome do curso é obrigatório', 'error');
      return false;
    }

    setIsSaving(true);
    try {
      const payload = {
        nome: formData.nome.trim(),
        duracao_horas: Number(formData.duracao_horas) || 0,
        texto_enquadramento: formData.texto_enquadramento || '',
        objetivos_pedagogicos: formData.objetivos_pedagogicos || '',
        metodologia: formData.metodologia || '',
        honorarios_texto: formData.honorarios_texto || '',
        plano_pagamento: formData.plano_pagamento || '',
        valor: Number(formData.valor) || 0,
        consideracoes: formData.consideracoes || '',
        modulos: Array.isArray(formData.modulos) ? formData.modulos : [],
        ativo: Boolean(formData.ativo),
      };

      if (isEdit) {
        const { error } = await supabase
          .from('cursos')
          .update(payload)
          .eq('id', editId);
        if (error) throw error;
        showToast('Curso atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('cursos')
          .insert([{ ...payload, criado_por: user.id }]);
        if (error) throw error;
        showToast('Curso criado com sucesso');
      }

      return true;
    } catch (err) {
      console.error('Erro ao salvar curso:', err);
      showToast('Erro ao salvar curso', 'error');
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    const saved = await saveCurso(false);
    if (saved) {
      setShowCreateModal(false);
      resetForm();
      fetchCursos();
    }
  }

  async function handleDrawerSubmit(e) {
    e.preventDefault();
    const saved = await saveCurso(true);
    if (saved) {
      closeDrawer();
      fetchCursos();
    }
  }

  async function handleDelete(id) {
    if (!(await confirmar("Eliminar este curso?", { mensagem: "Esta ação não se desfaz.", perigoso: true, botao: "Eliminar" }))) return;

    try {
      const { error } = await supabase
        .from('cursos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Curso eliminado com sucesso');
      fetchCursos();
    } catch (err) {
      console.error('Erro ao eliminar curso:', err);
      showToast('Erro ao eliminar curso', 'error');
    }
  }

  const filtered = useMemo(() => {
    let result = cursos;

    if (statusTab === 'ativos') {
      result = result.filter((curso) => isCourseActive(curso));
    } else if (statusTab === 'inativos') {
      result = result.filter((curso) => curso.ativo === false);
    }

    const query = searchTerm.trim().toLowerCase();
    if (!query) return result;
    return result.filter((curso) => {
      const nome = String(curso.nome || '').toLowerCase();
      return nome.includes(query);
    });
  }, [cursos, searchTerm, statusTab]);

  return (
    <div style={{ minHeight: 'calc(100 * var(--bz-vh, 1vh))', background: 'linear-gradient(180deg, var(--color-bgPrimary) 0%, var(--color-bgSecondary) 36%, var(--color-bgSecondary) 100%)', padding: '22px 18px 32px' }}>
      <div style={{ maxWidth: 1420, margin: '0 auto' }}>
        <PageHero
          icon={<Icons.BookOpen size={24} />}
          kicker="Formação"
          title="Cursos"
          subtitle="Gestão de conteúdos e módulos formativos"
          stats={[{ valor: cursos.length, label: cursos.length === 1 ? "curso" : "cursos" }]}
          side={<button type="button" className="page-hero-btn" onClick={handleNovo}><Icons.Plus size={18} /> Novo curso</button>}
          tools={
            <label className="page-hero-busca">
              <Icons.Search />
              <input
                aria-label="Procurar por curso"
                type="text"
                placeholder="Procurar por curso…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
          }
        />

        <Toast notification={notification} onClose={() => setNotification(null)} />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--n-500)', fontWeight: 700 }}>A carregar cursos…</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '4px', paddingLeft: '10px', marginBottom: '-1px', position: 'relative', zIndex: 2 }}>
              <button
                onClick={() => setStatusTab('ativos')}
                style={{
                  padding: '12px 25px',
                  background: statusTab === 'ativos' ? '#fff' : '#f1f5f9',
                  color: statusTab === 'ativos' ? 'var(--color-btnPrimary)' : '#64748b',
                  border: '1px solid var(--n-200)',
                  borderBottom: statusTab === 'ativos' ? '1px solid #fff' : '1px solid #e2e8f0',
                  borderRadius: '12px 12px 0 0',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, opacity 0.2s ease, width 0.2s ease, filter 0.2s ease'
                }}
              >
                <Icons.BookOpen size={16} /> 
                Ativos
                <span style={{ background: statusTab === 'ativos' ? 'var(--color-bgSecondary)' : '#cbd5e1', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>
                  {cursos.filter((curso) => isCourseActive(curso)).length}
                </span>
              </button>

              <button
                onClick={() => setStatusTab('inativos')}
                style={{
                  padding: '12px 25px',
                  background: statusTab === 'inativos' ? '#fff' : '#f1f5f9',
                  color: statusTab === 'inativos' ? 'var(--color-btnPrimary)' : '#64748b',
                  border: '1px solid var(--n-200)',
                  borderBottom: statusTab === 'inativos' ? '1px solid #fff' : '1px solid #e2e8f0',
                  borderRadius: '12px 12px 0 0',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, opacity 0.2s ease, width 0.2s ease, filter 0.2s ease'
                }}
              >
                <Icons.Lock size={16} /> 
                Inativos
                <span style={{ background: statusTab === 'inativos' ? 'var(--color-bgSecondary)' : '#cbd5e1', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>
                  {cursos.filter(c => !c.ativo).length}
                </span>
              </button>
            </div>

            <div style={{
              background: 'var(--sup-1)', 
              padding: '25px', 
              borderRadius: '0 18px 18px 18px',
              border: '1px solid var(--n-200)', 
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
              position: 'relative',
              zIndex: 1,
              marginBottom: '25px'
            }}>
              {filtered.length === 0 ? (
                <EmptyState onNew={handleNovo} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {filtered.map((curso) => (
                    <CourseCard
                      key={curso.id}
                      curso={curso}
                      onView={() => openDrawerForView(curso)}
                      onEdit={() => openDrawerForEdit(curso)}
                      onDelete={() => handleDelete(curso.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <CreateModal show={showCreateModal} title="Criar novo curso" onClose={() => setShowCreateModal(false)}>
        <CourseForm
          formData={formData}
          setFormData={setFormData}
          novoModulo={novoModulo}
          setNovoModulo={setNovoModulo}
          onAddModulo={handleAddModulo}
          onRemoveModulo={handleRemoveModulo}
          onEditModule={handleEditModule}
          onCancelModuleForm={handleCancelModuleForm}
          editingModuleIdx={editingModuleIdx}
          onSubmit={handleCreateSubmit}
          submitLabel="Criar Curso"
          onCancel={() => setShowCreateModal(false)}
          isSaving={isSaving}
          editable
        />
      </CreateModal>

      <SideDrawer
        show={showDrawer}
        isClosing={isClosingDrawer}
        title={drawerMode === 'edit' ? 'Editar curso' : 'Vista do curso'}
        subtitle={drawerMode === 'edit' ? 'Ajusta os detalhes do curso e os módulos' : 'Consulta os dados e abre a edição quando precisares'}
        onClose={closeDrawer}
      >
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', color: 'var(--cx-c2410c, #c2410c)', display: 'grid', placeItems: 'center', fontWeight: 950, boxShadow: '0 8px 18px rgba(249, 115, 22, 0.12)' }}>
                {getInitials(formData.nome)}
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 900, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{formatDuration(formData.duracao_horas)} • {Array.isArray(formData.modulos) ? formData.modulos.length : 0} módulos</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--n-900)' }}>{formData.nome || 'Curso sem nome'}</div>
              </div>
            </div>

            {drawerMode === 'view' ? (
              <button type="button" onClick={() => setDrawerMode('edit')} style={{ border: '1px solid #fed7aa', background: 'var(--cx-fff7ed, #fff7ed)', color: 'var(--cx-c2410c, #c2410c)', borderRadius: 14, padding: '11px 14px', fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icons.Edit size={16} />
                Editar
              </button>
            ) : null}
          </div>

          {drawerMode === 'view' ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                <div style={{ background: 'var(--sup-1)', border: '1px solid var(--n-200)', borderRadius: 18, padding: '18px' }}>
                  <div style={sectionTitleStyle}>Textos</div>
                  <div style={{ display: 'grid', gap: 10, color: 'var(--n-700)', lineHeight: 1.55, fontSize: '0.94rem' }}>
                      <div><strong style={{ color: 'var(--n-900)' }}>Enquadramento:</strong> {formData.texto_enquadramento || 'Sem conteúdo.'}</div>
                      <div><strong style={{ color: 'var(--n-900)' }}>Objetivos:</strong> {formData.objetivos_pedagogicos || 'Sem conteúdo.'}</div>
                      <div><strong style={{ color: 'var(--n-900)' }}>Metodologia:</strong> {formData.metodologia || 'Sem conteúdo.'}</div>
                      <div><strong style={{ color: 'var(--n-900)' }}>Honorários:</strong> {formData.honorarios_texto || 'Sem conteúdo.'}</div>
                      <div><strong style={{ color: 'var(--n-900)' }}>Pagamento:</strong> {formData.plano_pagamento || 'Sem conteúdo.'}</div>
                      <div><strong style={{ color: 'var(--n-900)' }}>Valor:</strong> {formatCurrency(formData.valor)}</div>
                      <div><strong style={{ color: 'var(--n-900)' }}>Considerações:</strong> {formData.consideracoes || 'Sem conteúdo.'}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--sup-1)', border: '1px solid var(--n-200)', borderRadius: 18, padding: '18px' }}>
                  <div style={sectionTitleStyle}>Módulos</div>
                  {Array.isArray(formData.modulos) && formData.modulos.length > 0 ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {formData.modulos.map((mod, idx) => (
                        <div key={`${mod.nome || 'mod'}-${idx}`} style={{ border: '1px solid var(--n-200)', borderRadius: 14, padding: '12px 14px', background: 'var(--n-50)' }}>
                          <div style={{ fontWeight: 800, color: 'var(--n-900)' }}>{mod.nome || `Módulo ${idx + 1}`}</div>
                          {mod.conteudo && <div style={{ color: 'var(--n-500)', fontSize: '0.88rem', marginTop: 4, lineHeight: 1.45 }}>{mod.conteudo}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--n-500)', fontStyle: 'italic' }}>Sem módulos registados.</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeDrawer} style={{ border: '1px solid var(--n-300)', background: 'var(--sup-1)', color: 'var(--n-700)', borderRadius: 14, padding: '12px 16px', fontWeight: 900, cursor: 'pointer' }}>
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <CourseForm
              formData={formData}
              setFormData={setFormData}
              novoModulo={novoModulo}
              setNovoModulo={setNovoModulo}
              onAddModulo={handleAddModulo}
              onRemoveModulo={handleRemoveModulo}
              onEditModule={handleEditModule}
              onCancelModuleForm={handleCancelModuleForm}
              editingModuleIdx={editingModuleIdx}
              onSubmit={handleDrawerSubmit}
              submitLabel="Guardar Alterações"
              onCancel={closeDrawer}
              isSaving={isSaving}
              editable={drawerMode === 'edit'}
            />
          )}
        </div>
      </SideDrawer>

      <style>{`
        @keyframes sidePanelPullIn {
          from { transform: translateX(36px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes sidePanelPullOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(36px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}