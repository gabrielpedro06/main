import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

const I = {
  Rocket: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>,
  Check: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  CheckAll: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" /></svg>,
  Arrow: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  Close: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  BellCheck: () => <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="m9.5 9.5 1.8 1.8 3.2-3.3" /></svg>,
};

const MOBILE_QUERY = "(max-width: 640px)";
const PANEL_WIDTH = 410;
const LEAVE_MS = 280;

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
};

const groupLabel = (iso) => {
  if (!iso) return "Anteriores";
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d >= today) return "Hoje";
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  if (d >= weekAgo) return "Esta semana";
  return "Anteriores";
};

/**
 * Painel de notificações ancorado ao sino (desktop) ou bottom sheet (mobile).
 */
export default function NotificationsPanel({ open, onClose, anchorRef, items = [], loading = false, onOpenItem, onMarkRead, onMarkAll }) {
  const [pos, setPos] = useState(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches);
  const [leaving, setLeaving] = useState(() => new Set());

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const mobile = window.matchMedia(MOBILE_QUERY).matches;
      setIsMobile(mobile);
      const anchor = anchorRef?.current;
      if (mobile || !anchor) return;
      const r = anchor.getBoundingClientRect();
      const width = Math.min(PANEL_WIDTH, window.innerWidth - 24);
      const left = Math.min(Math.max(12, r.left), window.innerWidth - width - 12);
      setPos({ top: r.bottom + 10, left, width, arrowLeft: Math.max(18, r.left + r.width / 2 - left) });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || (!isMobile && !pos)) return null;

  const markOne = (id) => {
    setLeaving((prev) => new Set(prev).add(id));
    // A linha fica colapsada até o pai a remover da lista (após gravar na BD)
    setTimeout(() => onMarkRead?.(id), LEAVE_MS);
  };

  const markAll = () => {
    setLeaving(new Set(items.map((n) => n.id)));
    setTimeout(() => onMarkAll?.(), LEAVE_MS + 60);
  };

  // Agrupa por "Hoje" / "Esta semana" / "Anteriores"
  const groups = [];
  items.forEach((n) => {
    const label = groupLabel(n.created_at);
    let g = groups.find((x) => x.label === label);
    if (!g) { g = { label, items: [] }; groups.push(g); }
    g.items.push(n);
  });

  const style = isMobile ? undefined : { top: pos.top, left: pos.left, width: pos.width, "--np-arrow": `${pos.arrowLeft}px` };

  return createPortal(
    <>
      <div className={`np-backdrop ${isMobile ? "is-mobile" : ""}`} onClick={onClose} />
      <div className={`np-panel ${isMobile ? "is-sheet" : ""}`} style={style} role="dialog" aria-label="Notificações">
        {isMobile && <span className="np-grabber" aria-hidden="true" />}

        <div className="np-head">
          <div className="np-head-title">
            <span>Notificações</span>
            {items.length > 0 && <span className="np-count">{items.length}</span>}
          </div>
          <div className="np-head-actions">
            {items.length > 0 && (
              <button type="button" className="np-text-btn" onClick={markAll}>
                <I.CheckAll /> Marcar todas como lidas
              </button>
            )}
            {isMobile && (
              <button type="button" className="np-icon-btn" onClick={onClose} aria-label="Fechar"><I.Close /></button>
            )}
          </div>
        </div>

        <div className="np-body">
          {loading && items.length === 0 ? (
            <div className="np-skeletons" aria-label="A carregar">
              {[0, 1, 2].map((k) => (
                <div key={k} className="np-skeleton">
                  <span className="np-sk-icon" />
                  <span className="np-sk-lines"><span /><span /></span>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="np-empty">
              <span className="np-empty-icon"><I.BellCheck /></span>
              <strong>Estás em dia</strong>
              <span>Não há projetos novos por ver. Avisamos-te quando houver novidades.</span>
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.label} className="np-group">
                <h4 className="np-group-label">{g.label}</h4>
                {g.items.map((n, idx) => (
                  <article
                    key={n.id}
                    className={`np-item ${leaving.has(n.id) ? "is-leaving" : ""}`}
                    style={{ "--i": idx }}
                  >
                    <span className="np-item-icon"><I.Rocket /><span className="np-unread" /></span>
                    <div className="np-item-body">
                      <div className="np-item-top">
                        <span className="np-item-title">{n.titulo}</span>
                        <span className="np-item-time">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.mensagem && <p className="np-item-msg">{n.mensagem}</p>}
                      <div className="np-item-actions">
                        <button type="button" className="np-btn-primary" onClick={() => { onClose(); onOpenItem?.(n); }}>
                          Abrir projeto <I.Arrow />
                        </button>
                        <button type="button" className="np-btn-ghost" onClick={() => markOne(n.id)} title="Marcar como lida">
                          <I.Check /> Lida
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            ))
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
