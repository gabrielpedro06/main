import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/fancy-select.css";

const Check = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const Search = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
);
const Caret = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
);

const normalize = (v) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Dropdown moderno (substitui o <select> nativo).
 * options: [{ value, label, hint?, icon?, group? }]
 * Aparece numa "portal" para não ser cortado; pesquisa automática com 7+ opções.
 */
export default function FancySelect({
  value,
  onChange,
  options = [],
  icon = null,
  placeholder = "Selecionar...",
  className = "",
  menuWidth = 320,
  searchPlaceholder = "Procurar...",
  ariaLabel,
}) {
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);

  const selected = options.find((o) => String(o.value) === String(value));
  const searchable = options.length >= 7;

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options;
    return options.filter((o) => normalize(o.label).includes(q) || normalize(o.hint).includes(q));
  }, [options, query]);

  const openMenu = () => {
    const idx = Math.max(0, options.findIndex((o) => String(o.value) === String(value)));
    setActive(idx);
    setQuery("");
    setOpen(true);
  };
  const close = () => setOpen(false);
  const choose = (opt) => {
    if (!opt) return;
    onChange?.(opt.value);
    close();
    triggerRef.current?.focus();
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    const update = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.min(Math.max(menuWidth, r.width), window.innerWidth - 24);
      const left = Math.min(Math.max(12, r.left), window.innerWidth - width - 12);
      const spaceBelow = window.innerHeight - r.bottom;
      const up = spaceBelow < 260 && r.top > spaceBelow;
      setPos({ left, width, top: up ? undefined : r.bottom + 8, bottom: up ? window.innerHeight - r.top + 8 : undefined, up });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, menuWidth]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => (searchable ? searchRef.current : listRef.current)?.focus(), 30);
    return () => clearTimeout(t);
  }, [open, searchable]);

  // Mantém a opção ativa visível
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); triggerRef.current?.focus(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(filtered.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); choose(filtered[active]); }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`fs-trigger ${open ? "is-open" : ""} ${className}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => { if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); openMenu(); } }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        {icon && <span className="fs-trigger-icon">{icon}</span>}
        <span className="fs-trigger-text">
          {selected ? <>{selected.icon && <span className="fs-trigger-opt-icon">{selected.icon}</span>}{selected.label}</> : <span className="fs-placeholder">{placeholder}</span>}
        </span>
        <span className="fs-caret"><Caret /></span>
      </button>

      {open && pos && createPortal(
        <>
          <div className="fs-backdrop" onMouseDown={close} />
          <div
            className={`fs-menu ${pos.up ? "is-up" : ""}`}
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
            onKeyDown={onKeyDown}
          >
            {searchable && (
              <div className="fs-search">
                <Search />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                />
              </div>
            )}
            <div ref={listRef} className="fs-list" role="listbox" tabIndex={-1}>
              {filtered.length === 0 && <div className="fs-empty">Sem resultados para “{query}”.</div>}
              {filtered.map((opt, idx) => {
                const showGroup = Boolean(opt.group) && opt.group !== filtered[idx - 1]?.group;
                const isSel = String(opt.value) === String(value);
                return (
                  <div key={String(opt.value)}>
                    {showGroup && <div className="fs-group">{opt.group}</div>}
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      data-idx={idx}
                      className={`fs-option ${isSel ? "is-selected" : ""} ${idx === active ? "is-active" : ""}`}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => choose(opt)}
                      style={{ "--k": Math.min(idx, 10) }}
                    >
                      {opt.icon && <span className="fs-opt-icon">{opt.icon}</span>}
                      <span className="fs-opt-text">
                        <span className="fs-opt-label">{opt.label}</span>
                        {opt.hint && <span className="fs-opt-hint">{opt.hint}</span>}
                      </span>
                      {isSel && <span className="fs-opt-check"><Check /></span>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
