import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../services/supabase';
import './gestao.css';

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
  color: '#94a3b8',
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
    ? { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', accent: '#dc2626', icon: '⛔' }
    : isWarning
      ? { bg: '#fffbeb', border: '#fde68a', text: '#92400e', accent: '#d97706', icon: '⚠️' }
      : { bg: '#ffffff', border: 'var(--color-borderColorLight)', text: 'var(--color-textPrimary)', accent: 'var(--color-btnPrimary)', icon: '✅' };

  return (
    <ToastPortal>
      <div style={{ position: 'fixed', top: 22, right: 22, zIndex: 100001, width: 'min(420px, calc(100vw - 32px))', pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 18, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, borderLeft: `5px solid ${colors.accent}`, boxShadow: '0 22px 40px rgba(15, 23, 42, 0.18)', backdropFilter: 'blur(6px)' }}>
          <div style={{ width: 30, height: 30, borderRadius: 999, display: 'grid', placeItems: 'center', flexShrink: 0, background: isError ? '#fecaca' : isWarning ? '#fde68a' : 'var(--color-bgSecondary)', color: colors.accent, fontSize: '0.95rem', fontWeight: 900 }}>
            {colors.icon}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, lineHeight: 1.35 }}>{notification.message}</div>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 0, flexShrink: 0, opacity: 0.75 }}>
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

function CourseCard({ curso, onView, onEdit, onDelete }) {
  const accent = getCourseAccent(curso.nome);
  const modulesCount = Array.isArray(curso.modulos) ? curso.modulos.length : 0;

  return (
    <div style={{ background: '#fff', borderRadius: '22px', border: '1px solid #dbe3ef', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 240 }}>
      <div style={{ height: 5, background: accent }} />
      <div style={{ padding: '18px 18px 14px 18px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
            <div style={{ alignSelf: 'flex-start', padding: '4px 10px', borderRadius: '999px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.72rem', fontWeight: 800 }}>
              {formatDuration(curso.duracao_horas)}
            </div>
            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', lineHeight: 1.08, fontWeight: 900, letterSpacing: '-0.02em' }}>
              {curso.nome}
            </h3>
          </div>
          <div style={{ minWidth: 42, height: 32, padding: '0 10px', borderRadius: '999px', border: '1px solid #eadfd4', background: 'linear-gradient(180deg, #fffaf3, #fff)', color: '#7c2d12', fontSize: '0.78rem', fontWeight: 900, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            {getInitials(curso.nome)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#475569', fontSize: '0.92rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.Layers size={15} color="#94a3b8" />
            <span>{modulesCount} módulo{modulesCount === 1 ? '' : 's'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icons.BookOpen size={15} color="#94a3b8" />
            <span style={{ color: curso.ativo ? '#059669' : '#dc2626', fontWeight: 700 }}>
              {curso.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #eef2f7', display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '8px', padding: '12px 14px' }}>
        <button type="button" onClick={onView} style={{ border: 'none', background: 'transparent', color: '#92400e', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 8px', borderRadius: '12px' }}>
          <Icons.Eye size={16} />
          Ver Curso
        </button>
        <button type="button" onClick={onEdit} style={{ width: 38, height: 38, borderRadius: '12px', border: '1px solid #fed7aa', background: '#fff7ed', color: '#f59e0b', cursor: 'pointer', display: 'grid', placeItems: 'center' }} title="Editar">
          <Icons.Edit size={16} />
        </button>
        <button type="button" onClick={onDelete} style={{ width: 38, height: 38, borderRadius: '12px', border: '1px solid #fecaca', background: '#fff1f2', color: '#ef4444', cursor: 'pointer', display: 'grid', placeItems: 'center' }} title="Eliminar">
          <Icons.Trash size={16} />
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
          <input
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
            style={{ ...fieldStyle, ...readOnlyStyle, background: '#f8fafc', color: '#0f172a', fontWeight: 700 }}
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
            <div key={`${mod.nome || 'mod'}-${idx}`} style={{ border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '16px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>{mod.nome || 'Sem nome'}</div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 4, fontWeight: 700 }}>{Number(mod.duracao_horas || 0)}h</div>
                {mod.conteudo && <div style={{ color: '#64748b', fontSize: '0.84rem', marginTop: 4, lineHeight: 1.4 }}>{mod.conteudo}</div>}
              </div>
              {editable && (
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button type="button" onClick={() => onEditModule(idx)} style={{ border: '1px solid #dbeafe', background: '#eff6ff', color: '#0284c7', borderRadius: '10px', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }} title="Editar módulo">
                    <Icons.Edit size={15} />
                  </button>
                  <button type="button" onClick={() => onRemoveModulo(idx)} style={{ border: '1px solid #fecaca', background: '#fff1f2', color: '#dc2626', borderRadius: '10px', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }} title="Remover módulo">
                    <Icons.Trash size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && editingModuleIdx === null && (
        <button type="button" onClick={() => onEditModule(null)} style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: '12px', padding: '11px 14px', fontWeight: 800, cursor: 'pointer', width: '100%' }}>
          + Criar novo módulo
        </button>
      )}

      {editable && editingModuleIdx !== null && editingModuleIdx !== undefined && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '14px' }}>
          <div style={{ display: 'grid', gap: '10px' }}>
            <input
              type="text"
              value={novoModulo.nome}
              onChange={(e) => setNovoModulo({ ...novoModulo, nome: e.target.value })}
              placeholder="Nome do módulo"
              style={fieldStyle}
              disabled={isSaving}
            />
            <input
              type="number"
              min="0"
              step="0.5"
              value={novoModulo.duracao_horas}
              onChange={(e) => setNovoModulo({ ...novoModulo, duracao_horas: e.target.value })}
              placeholder="Duração do módulo (horas)"
              style={fieldStyle}
              disabled={isSaving}
            />
            <textarea
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
              <button type="button" onClick={onCancelModuleForm} style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '12px', padding: '11px 14px', background: '#fff', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#0f172a', fontWeight: 700 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: editable ? '1fr 1fr' : '1fr', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
        {editable ? (
          <>
            <button type="submit" disabled={isSaving} style={{ border: 'none', borderRadius: '14px', padding: '13px 16px', background: 'linear-gradient(135deg, var(--color-btnPrimary), var(--color-btnPrimaryDark))', color: '#fff', fontWeight: 900, cursor: 'pointer', boxShadow: '0 12px 24px var(--color-btnPrimaryShadow)' }}>
              {isSaving ? 'A guardar...' : submitLabel}
            </button>
            <button type="button" onClick={onCancel} style={{ border: '1px solid #cbd5e1', borderRadius: '14px', padding: '13px 16px', background: '#fff', color: '#334155', fontWeight: 900, cursor: 'pointer' }}>
              Cancelar
            </button>
          </>
        ) : (
          <button type="button" onClick={onCancel} style={{ border: '1px solid #cbd5e1', borderRadius: '14px', padding: '13px 16px', background: '#fff', color: '#334155', fontWeight: 900, cursor: 'pointer' }}>
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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.58)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 20 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(920px, 96vw)', maxHeight: '92vh', overflow: 'hidden', borderRadius: 22, background: '#fff', border: '1px solid #dbe3ef', boxShadow: '0 30px 60px -20px rgba(15, 23, 42, 0.35)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--color-borderColorLight)', background: 'linear-gradient(135deg, var(--color-bgSecondary), #fff)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.74rem', fontWeight: 900, letterSpacing: '0.08em', color: 'var(--color-btnPrimaryDark)', textTransform: 'uppercase' }}>Novo Curso</p>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.32rem', fontWeight: 900 }}>{title}</h3>
            </div>
            <button type="button" onClick={onClose} style={{ background: '#fff', border: '1px solid #cbd5e1', width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#475569' }}>
              <Icons.Close size={18} />
            </button>
          </div>
          <div style={{ padding: '22px', overflowY: 'auto' }}>{children}</div>
        </div>
      </div>
    </ModalPortal>
  );
}

function SideDrawer({ show, isClosing, title, subtitle, onClose, children }) {
  if (!show) return null;

  return (
    <ModalPortal>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.58)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', zIndex: 99999 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: 'min(98vw, 1180px)', height: '100vh', margin: 0, borderRadius: '18px 0 0 18px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '100vh', animation: isClosing ? 'sidePanelPullOut 0.36s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'sidePanelPullIn 0.56s cubic-bezier(0.2, 0.9, 0.2, 1)' }}>
          <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--color-borderColorLight)', background: 'linear-gradient(135deg, var(--color-bgSecondary), #fff)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18 }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.08em', color: 'var(--color-btnPrimaryDark)', textTransform: 'uppercase' }}>Curso</p>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.35rem', fontWeight: 900 }}>{title}</h3>
              {subtitle && <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>{subtitle}</p>}
            </div>
            <button onClick={onClose} style={{ background: '#fff', border: '1px solid #cbd5e1', width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#475569' }}>
              <Icons.Close size={18} />
            </button>
          </div>
          <div style={{ padding: '24px', overflowY: 'auto' }}>{children}</div>
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
        .eq('criado_por', user.id)
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
    if (!confirm('Tem a certeza que deseja eliminar este curso?')) return;

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
      result = result.filter((curso) => curso.ativo === true);
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, var(--color-bgPrimary) 0%, var(--color-bgSecondary) 36%, var(--color-bgSecondary) 100%)', padding: '22px 18px 32px' }}>
      <div style={{ maxWidth: 1420, margin: '0 auto' }}>
        <div className="page-header" style={{background: '#fff', padding: '20px 25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap'}}>
          <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <div style={{background: 'var(--color-bgSecondary)', color: 'var(--color-btnPrimary)', padding: '12px', borderRadius: '12px', display: 'flex'}}><Icons.BookOpen size={24} /></div>
            <div>
              <h1 style={{margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.02em'}}>Cursos</h1>
              <p style={{color: '#64748b', margin: 0, fontWeight: '500', fontSize: '0.9rem'}}>Gestão de conteúdos e módulos formativos</p>
            </div>
          </div>
          <button className="btn-cta" onClick={handleNovo} style={{background: 'var(--color-btnPrimary)', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)'}}>
            <Icons.Plus size={18} /> Novo Curso
          </button>
        </div>

        <div style={{background: '#fff', padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap'}}>
          <div style={{flex: 1, minWidth: '250px', position: 'relative'}}>
            <span style={{position: 'absolute', left: '12px', top: '10px', color: '#94a3b8'}}><Icons.Search /></span>
            <input
              type="text"
              placeholder="Procurar por curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{width: '100%', padding: '8px 12px 8px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box'}}
            />
          </div>
        </div>

        <Toast notification={notification} onClose={() => setNotification(null)} />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b', fontWeight: 700 }}>A carregar cursos...</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '4px', paddingLeft: '10px', marginBottom: '-1px', position: 'relative', zIndex: 2 }}>
              <button
                onClick={() => setStatusTab('ativos')}
                style={{
                  padding: '12px 25px',
                  background: statusTab === 'ativos' ? '#fff' : '#f1f5f9',
                  color: statusTab === 'ativos' ? 'var(--color-btnPrimary)' : '#64748b',
                  border: '1px solid #e2e8f0',
                  borderBottom: statusTab === 'ativos' ? '1px solid #fff' : '1px solid #e2e8f0',
                  borderRadius: '12px 12px 0 0',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icons.BookOpen size={16} /> 
                Ativos
                <span style={{ background: statusTab === 'ativos' ? 'var(--color-bgSecondary)' : '#cbd5e1', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>
                  {cursos.filter(c => c.ativo).length}
                </span>
              </button>

              <button
                onClick={() => setStatusTab('inativos')}
                style={{
                  padding: '12px 25px',
                  background: statusTab === 'inativos' ? '#fff' : '#f1f5f9',
                  color: statusTab === 'inativos' ? 'var(--color-btnPrimary)' : '#64748b',
                  border: '1px solid #e2e8f0',
                  borderBottom: statusTab === 'inativos' ? '1px solid #fff' : '1px solid #e2e8f0',
                  borderRadius: '12px 12px 0 0',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
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
              background: '#fff', 
              padding: '25px', 
              borderRadius: '0 18px 18px 18px',
              border: '1px solid #e2e8f0', 
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
              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', color: '#c2410c', display: 'grid', placeItems: 'center', fontWeight: 950, boxShadow: '0 8px 18px rgba(249, 115, 22, 0.12)' }}>
                {getInitials(formData.nome)}
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', fontWeight: 900, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{formatDuration(formData.duracao_horas)} • {Array.isArray(formData.modulos) ? formData.modulos.length : 0} módulos</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>{formData.nome || 'Curso sem nome'}</div>
              </div>
            </div>

            {drawerMode === 'view' ? (
              <button type="button" onClick={() => setDrawerMode('edit')} style={{ border: '1px solid #fed7aa', background: '#fff7ed', color: '#c2410c', borderRadius: 14, padding: '11px 14px', fontWeight: 900, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icons.Edit size={16} />
                Editar
              </button>
            ) : null}
          </div>

          {drawerMode === 'view' ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '18px' }}>
                  <div style={sectionTitleStyle}>Textos</div>
                  <div style={{ display: 'grid', gap: 10, color: '#475569', lineHeight: 1.55, fontSize: '0.94rem' }}>
                      <div><strong style={{ color: '#0f172a' }}>Enquadramento:</strong> {formData.texto_enquadramento || 'Sem conteúdo.'}</div>
                      <div><strong style={{ color: '#0f172a' }}>Objetivos:</strong> {formData.objetivos_pedagogicos || 'Sem conteúdo.'}</div>
                      <div><strong style={{ color: '#0f172a' }}>Metodologia:</strong> {formData.metodologia || 'Sem conteúdo.'}</div>
                      <div><strong style={{ color: '#0f172a' }}>Honorários:</strong> {formData.honorarios_texto || 'Sem conteúdo.'}</div>
                      <div><strong style={{ color: '#0f172a' }}>Pagamento:</strong> {formData.plano_pagamento || 'Sem conteúdo.'}</div>
                      <div><strong style={{ color: '#0f172a' }}>Valor:</strong> {formatCurrency(formData.valor)}</div>
                      <div><strong style={{ color: '#0f172a' }}>Considerações:</strong> {formData.consideracoes || 'Sem conteúdo.'}</div>
                  </div>
                </div>

                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '18px' }}>
                  <div style={sectionTitleStyle}>Módulos</div>
                  {Array.isArray(formData.modulos) && formData.modulos.length > 0 ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {formData.modulos.map((mod, idx) => (
                        <div key={`${mod.nome || 'mod'}-${idx}`} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: '12px 14px', background: '#f8fafc' }}>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{mod.nome || `Módulo ${idx + 1}`}</div>
                          {mod.conteudo && <div style={{ color: '#64748b', fontSize: '0.88rem', marginTop: 4, lineHeight: 1.45 }}>{mod.conteudo}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sem módulos registados.</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeDrawer} style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 14, padding: '12px 16px', fontWeight: 900, cursor: 'pointer' }}>
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