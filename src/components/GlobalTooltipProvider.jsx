import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TOOLTIP_GAP = 10;
const TOOLTIP_MAX_WIDTH = 300;
const TOOLTIP_VIEWPORT_PADDING = 12;

const getClosestTitleTarget = (target) => {
    if (!(target instanceof Element)) return null;
    return target.closest("[title]");
};

const getRelatedElement = (relatedTarget) => (relatedTarget instanceof Element ? relatedTarget : null);

export default function GlobalTooltipProvider({ children }) {
    const activeRef = useRef(null);
    const tooltipRef = useRef(null);
    const [tooltip, setTooltip] = useState({
        isOpen: false,
        text: "",
        top: 0,
        left: 0,
        placement: "top",
        arrowOffset: 0,
    });

    const updateTooltipPosition = useCallback(() => {
        const active = activeRef.current;
        const el = active?.element;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            return;
        }

        const placeOnTop = rect.top > 90;
        const triggerCenterX = rect.left + (rect.width / 2);
        const measuredWidth = tooltipRef.current?.offsetWidth || TOOLTIP_MAX_WIDTH;
        const tooltipWidth = Math.min(TOOLTIP_MAX_WIDTH, measuredWidth);
        const minCenterX = TOOLTIP_VIEWPORT_PADDING + (tooltipWidth / 2);
        const maxCenterX = window.innerWidth - TOOLTIP_VIEWPORT_PADDING - (tooltipWidth / 2);

        const clampedCenterX = minCenterX > maxCenterX
            ? window.innerWidth / 2
            : Math.min(Math.max(triggerCenterX, minCenterX), maxCenterX);

        const arrowLimit = Math.max(0, (tooltipWidth / 2) - 18);
        const rawArrowOffset = triggerCenterX - clampedCenterX;
        const arrowOffset = Math.min(Math.max(rawArrowOffset, -arrowLimit), arrowLimit);

        setTooltip((prev) => ({
            ...prev,
            top: placeOnTop ? rect.top - TOOLTIP_GAP : rect.bottom + TOOLTIP_GAP,
            left: clampedCenterX,
            placement: placeOnTop ? "top" : "bottom",
            arrowOffset,
        }));
    }, []);

    const closeTooltip = useCallback(() => {
        const active = activeRef.current;
        if (active?.element && active.originalTitle) {
            const currentTitle = active.element.getAttribute("title");
            if (!currentTitle) {
                active.element.setAttribute("title", active.originalTitle);
            }
        }

        activeRef.current = null;
        setTooltip((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    }, []);

    const openTooltipForElement = useCallback((element) => {
        if (!element) return;

        const sameElementIsActive = activeRef.current?.element === element;
        if (sameElementIsActive) {
            updateTooltipPosition();
            return;
        }

        closeTooltip();

        const text = element.getAttribute("title");
        if (!text) return;

        element.removeAttribute("title");
        activeRef.current = { element, originalTitle: text };

        setTooltip((prev) => ({
            ...prev,
            isOpen: true,
            text,
        }));

        requestAnimationFrame(() => {
            updateTooltipPosition();
        });
    }, [closeTooltip, updateTooltipPosition]);

    useEffect(() => {
        const handleMouseOver = (event) => {
            const target = getClosestTitleTarget(event.target);
            if (!target) return;
            openTooltipForElement(target);
        };

        const handleMouseOut = (event) => {
            const activeElement = activeRef.current?.element;
            if (!activeElement) return;

            const next = getRelatedElement(event.relatedTarget);
            if (next && activeElement.contains(next)) return;

            closeTooltip();
        };

        const handleFocusIn = (event) => {
            const target = getClosestTitleTarget(event.target);
            if (!target) return;
            openTooltipForElement(target);
        };

        const handleFocusOut = (event) => {
            const activeElement = activeRef.current?.element;
            if (!activeElement) return;

            const next = getRelatedElement(event.relatedTarget);
            if (next && activeElement.contains(next)) return;

            closeTooltip();
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                closeTooltip();
            }
        };

        document.addEventListener("mouseover", handleMouseOver, true);
        document.addEventListener("mouseout", handleMouseOut, true);
        document.addEventListener("focusin", handleFocusIn, true);
        document.addEventListener("focusout", handleFocusOut, true);
        document.addEventListener("keydown", handleKeyDown, true);

        return () => {
            document.removeEventListener("mouseover", handleMouseOver, true);
            document.removeEventListener("mouseout", handleMouseOut, true);
            document.removeEventListener("focusin", handleFocusIn, true);
            document.removeEventListener("focusout", handleFocusOut, true);
            document.removeEventListener("keydown", handleKeyDown, true);
            closeTooltip();
        };
    }, [closeTooltip, openTooltipForElement]);

    useEffect(() => {
        if (!tooltip.isOpen) return undefined;

        const rafId = requestAnimationFrame(() => {
            updateTooltipPosition();
        });

        return () => cancelAnimationFrame(rafId);
    }, [tooltip.isOpen, tooltip.text, updateTooltipPosition]);

    useEffect(() => {
        if (!tooltip.isOpen) return undefined;

        const handleViewportChange = () => {
            updateTooltipPosition();
        };

        window.addEventListener("scroll", handleViewportChange, true);
        window.addEventListener("resize", handleViewportChange);

        return () => {
            window.removeEventListener("scroll", handleViewportChange, true);
            window.removeEventListener("resize", handleViewportChange);
        };
    }, [tooltip.isOpen, updateTooltipPosition]);

    useEffect(() => {
        return () => {
            closeTooltip();
        };
    }, [closeTooltip]);

    return (
        <>
            {children}
            {tooltip.isOpen && createPortal(
                <div
                    ref={tooltipRef}
                    role="tooltip"
                    style={{
                        position: "fixed",
                        left: tooltip.left,
                        top: tooltip.top,
                        transform: tooltip.placement === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
                        zIndex: 12000,
                        pointerEvents: "none",
                        maxWidth: `${TOOLTIP_MAX_WIDTH}px`,
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--color-borderColor)",
                        background: "var(--color-bgSecondary)",
                        boxShadow: "0 10px 22px rgba(29, 78, 216, 0.14)",
                        color: "var(--color-btnPrimaryDark)",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        lineHeight: 1.35,
                        textAlign: "left",
                        wordBreak: "break-word",
                    }}
                >
                    {tooltip.text}
                    <span
                        aria-hidden="true"
                        style={{
                            position: "absolute",
                            left: "50%",
                            width: "9px",
                            height: "9px",
                            borderRadius: "1px",
                            border: "1px solid var(--color-borderColor)",
                            background: "var(--color-bgSecondary)",
                            transform: `translateX(calc(-50% + ${tooltip.arrowOffset}px)) rotate(45deg)`,
                            ...(tooltip.placement === "top"
                                ? { bottom: "-5px", borderTop: "none", borderLeft: "none" }
                                : { top: "-5px", borderBottom: "none", borderRight: "none" }),
                        }}
                    />
                </div>,
                document.body,
            )}
        </>
    );
}

