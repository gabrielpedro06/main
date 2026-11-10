import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/**
 * Abas com destaque deslizante (mesmo efeito "líquido" da sidebar).
 *
 * <SlidingTabs
 *   tabs={[{ id: "hoje", label: "Para hoje", count: 3, icon: <Icon/> }]}
 *   value={activeTab}
 *   onChange={setActiveTab}
 *   variant="pill" | "underline"
 * />
 */
export default function SlidingTabs({ tabs, value, onChange, className = "", ariaLabel = "Separadores", variant = "pill" }) {
  const listRef = useRef(null);
  const pillRef = useRef(null);
  const lastPos = useRef(null);

  const positionPill = useCallback((animate) => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;

    const activeBtn = list.querySelector('[data-active="true"]');
    if (!activeBtn) {
      pill.style.opacity = "0";
      lastPos.current = null;
      return;
    }

    const left = activeBtn.offsetLeft;
    const right = list.clientWidth - (activeBtn.offsetLeft + activeBtn.offsetWidth);
    const prev = lastPos.current;

    if (!animate || !prev) {
      pill.style.transition = "opacity 0.25s ease";
    } else if (prev.left !== left) {
      // A ponta da frente parte primeiro, a de trás segue: o destaque estica e assenta
      const lead = "0.36s cubic-bezier(0.3, 0.8, 0.25, 1)";
      const trail = "0.5s cubic-bezier(0.55, 0, 0.1, 1) 0.06s";
      const movingRight = left > prev.left;
      pill.style.transition = movingRight
        ? `right ${lead}, left ${trail}, opacity 0.25s ease`
        : `left ${lead}, right ${trail}, opacity 0.25s ease`;
    }

    pill.style.left = `${left}px`;
    pill.style.right = `${right}px`;
    pill.style.opacity = "1";
    lastPos.current = { left, right };

    // Garante que a aba ativa fica visível quando há scroll horizontal (mobile)
    if (animate && list.scrollWidth > list.clientWidth) {
      activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, []);

  useLayoutEffect(() => {
    positionPill(true);
  }, [value, positionPill]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => positionPill(false));
    ro.observe(list);
    Array.from(list.children).forEach((child) => ro.observe(child));
    return () => ro.disconnect();
  }, [tabs.length, positionPill]);

  return (
    <div ref={listRef} className={`bz-sliding-tabs bz-sliding-tabs--${variant} ${className}`} role="tablist" aria-label={ariaLabel}>
      <span ref={pillRef} className="bz-sliding-tabs-pill" aria-hidden="true" />
      {tabs.map((tab) => {
        const isActive = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-active={isActive ? "true" : "false"}
            className={`bz-sliding-tab ${isActive ? "active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span className="bz-sliding-tab-icon">{tab.icon}</span>}
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span className={`bz-sliding-tab-count ${tab.tone ? `tone-${tab.tone}` : ""}`}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
