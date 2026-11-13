import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from "react-router-dom";
import { announceNewMessages, bindNotificationUnlock } from "../utils/notifySound";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase"; 
import WidgetCalendar from "./WidgetCalendar"; 
import AccountMenu from "./AccountMenu";
import "./../styles/dashboard.css";

const logoFull = "/logo4.png"; 
const logoIcon = "/logo3.png"; 
const getChatSeenStorageKey = (userId) => `chat_seen_rooms_${userId}`;

// --- ÍCONES SVG PROFISSIONAIS ---
const Icons = {
  Home: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
  Pin: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.6V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.6a2 2 0 0 1-1.11 1.95l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>,
  Check: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>,
  Rocket: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>,
  Users: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Message: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  Clipboard: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path></svg>,
  Briefcase: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
  Target: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
  Calendar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  Edit: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>,
  Shield: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V5l-8-3z"></path><path d="m9 12 2 2 4-4"></path></svg>,
  Monitor: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>,
  File: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="14" y2="17"></line></svg>,
  Close: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Building: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>,
  Book: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>,
  Graduation: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>,
  Megaphone: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>,
  Transfer: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3 4 7l4 4"></path><path d="M4 7h16"></path><path d="m16 21 4-4-4-4"></path><path d="M20 17H4"></path></svg>,
  Palette: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2.1a1.9 1.9 0 0 0-1.4 3.2A1.6 1.6 0 0 1 12 22z"></path><circle cx="7.5" cy="10.5" r="1.2"></circle><circle cx="10.5" cy="6.8" r="1.2"></circle><circle cx="15" cy="7" r="1.2"></circle><circle cx="17.5" cy="11" r="1.2"></circle></svg>,
  History: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></svg>,
  ChevronDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
};

export default function Sidebar({ menuOpen, setMenuOpen, isMobile = false }) {
  const location = useLocation();
  const { user, userProfile } = useAuth();
  
  const [forumUnreadCount, setForumUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [myChatRoomIds, setMyChatRoomIds] = useState([]);
  const myChatRoomIdsRef = useRef([]);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const [openGroups, setOpenGroups] = useState({
    planeamento: true,
    producao: true,
    comercial: true,
    gestao: true
  });

  const toggleGroup = (groupName) => {
    if (!menuOpen && !isMobile) {
      setMenuOpen(true); 
    }
    setOpenGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const updateTrackedRoomIds = (nextRoomIds) => {
    const normalized = Array.isArray(nextRoomIds) ? nextRoomIds : [];
    myChatRoomIdsRef.current = normalized;
    setMyChatRoomIds(normalized);
  };

  const checkUnreadPosts = async () => {
      const lastVisit = localStorage.getItem('lastForumVisit');
      const queryDate = lastVisit || new Date(0).toISOString(); 

      const { count, error } = await supabase
          .from('forum_posts')
          .select('*', { count: 'exact', head: true })
          .gt('created_at', queryDate); 

        if(!error) setForumUnreadCount(count || 0);
  };

  const checkUnreadChats = async (roomIdsOverride = null) => {
    if (!user?.id) {
      setChatUnreadCount(0);
      setMyChatRoomIds([]);
      return;
    }

    let roomIds = Array.isArray(roomIdsOverride) ? roomIdsOverride : null;
    if (!roomIds) {
      const { data: myParticipants, error: participantsError } = await supabase
        .from('chat_participants')
        .select('room_id')
        .eq('user_id', user.id);

      if (participantsError) return;
      roomIds = (myParticipants || []).map((row) => row.room_id);
    }

    updateTrackedRoomIds(roomIds);
    if (!roomIds.length) {
      setChatUnreadCount(0);
      return;
    }

    const { data: roomReads, error: roomReadsError } = await supabase
      .from('chat_room_reads')
      .select('room_id, last_read_at')
      .eq('user_id', user.id)
      .in('room_id', roomIds);

    if (roomReadsError) return;

    const dbReadAtByRoom = {};
    (roomReads || []).forEach((row) => {
      if (!row?.room_id) return;
      dbReadAtByRoom[row.room_id] = row.last_read_at;
    });

    let seenMap = {};
    try {
      const raw = localStorage.getItem(getChatSeenStorageKey(user.id));
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === 'object') seenMap = parsed;
    } catch {
      seenMap = {};
    }

    const { data: msgs, error: msgsError } = await supabase
      .from('chat_messages')
      .select('room_id, sender_id, created_at')
      .in('room_id', roomIds)
      .order('created_at', { ascending: false })
      .limit(500);

    if (msgsError) return;

    let totalUnread = 0;
    (msgs || []).forEach((msg) => {
      if (!msg?.room_id) return;
      if (msg.sender_id === user.id) return;

      const localSeenAt = seenMap[msg.room_id] || null;
      const dbSeenAt = dbReadAtByRoom[msg.room_id] || null;
      const effectiveSeenAt = !localSeenAt
        ? dbSeenAt
        : !dbSeenAt
        ? localSeenAt
        : new Date(localSeenAt) > new Date(dbSeenAt)
        ? localSeenAt
        : dbSeenAt;

      if (effectiveSeenAt && new Date(msg.created_at) <= new Date(effectiveSeenAt)) return;
      totalUnread += 1;
    });

    setChatUnreadCount(totalUnread);
  };
  
  useEffect(() => {
      checkUnreadPosts();
      window.addEventListener('storage', checkUnreadPosts);
      const interval = setInterval(checkUnreadPosts, 60000);

      return () => {
          window.removeEventListener('storage', checkUnreadPosts);
          clearInterval(interval);
      };
  }, []);

  useEffect(() => {
    checkUnreadChats();
    const interval = setInterval(checkUnreadChats, 20000);

    return () => {
      clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      // nome único: recriar um canal com o mesmo nome devolvia o antigo a fechar
      .channel(`sidebar_chat_badges_${user.id}_${Math.random().toString(36).slice(2, 10)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const incoming = payload.new;
          if (!incoming?.room_id) return;
          if (incoming.sender_id === user.id) return;

          const knownRoomIds = myChatRoomIdsRef.current || [];
          if (knownRoomIds.includes(incoming.room_id)) {
            setChatUnreadCount((prev) => prev + 1);
            setTimeout(() => checkUnreadChats(), 800);
            return;
          }

          setChatUnreadCount((prev) => prev + 1);

          const { data: membership, error: membershipError } = await supabase
            .from('chat_participants')
            .select('room_id')
            .eq('room_id', incoming.room_id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (membershipError || !membership?.room_id) {
            setTimeout(() => checkUnreadChats(), 300);
            return;
          }

          if (!knownRoomIds.includes(incoming.room_id)) {
            updateTrackedRoomIds([...knownRoomIds, incoming.room_id]);
          }
          setTimeout(() => checkUnreadChats(), 800);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${user.id}` },
        () => { checkUnreadChats(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_room_reads', filter: `user_id=eq.${user.id}` },
        () => { checkUnreadChats(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const totalCommsUnread = Number(forumUnreadCount || 0) + Number(chatUnreadCount || 0);

  // --- Aviso de mensagens novas: animação no item + som / notificação do Windows ---
  const navigate = useNavigate();
  const commsLinkRef = useRef(null);
  const prevCommsUnreadRef = useRef(0);
  const commsReadyAtRef = useRef(0);

  useEffect(() => {
    bindNotificationUnlock();
    // Ignora a contagem inicial (ao abrir a app não queremos tocar)
    commsReadyAtRef.current = Date.now() + 4000;
  }, []);

  useEffect(() => {
    const prev = prevCommsUnreadRef.current;
    prevCommsUnreadRef.current = totalCommsUnread;
    if (totalCommsUnread <= prev) return undefined;
    if (!commsReadyAtRef.current || Date.now() < commsReadyAtRef.current) return undefined;

    const el = commsLinkRef.current;
    let timer;
    if (el) {
      el.classList.remove("is-ringing");
      void el.offsetWidth; // reinicia a animação
      el.classList.add("is-ringing");
      timer = setTimeout(() => el.classList.remove("is-ringing"), 1800);
    }
    announceNewMessages({ total: totalCommsUnread, onClick: () => navigate("/dashboard/forum") });
    return () => clearTimeout(timer);
  }, [totalCommsUnread, navigate]);

  const isActive = (path) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return 'active';
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return 'active';
    return '';
  };

  const getSidebarTooltip = (label) => (!menuOpen && !isMobile ? label : undefined);
  // No mobile a gaveta mostra sempre o menu completo
  const showFull = menuOpen || isMobile;

  // --- DESTAQUE DESLIZANTE DO ITEM ATIVO ---
  // Um único "pill" absoluto que se move (e estica) entre itens do menu.
  const navListRef = useRef(null);
  const pillRef = useRef(null);
  const lastPillPos = useRef(null);

  const positionPill = useCallback((animate) => {
    const list = navListRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;

    const activeLink = list.querySelector('li.active > a');
    const isHidden = !activeLink || activeLink.closest('.sidebar-group-content:not(.open)');
    if (isHidden) {
      pill.style.opacity = '0';
      lastPillPos.current = null;
      return;
    }

    // offsetTop/offsetHeight ignoram transforms: assim a medição não é
    // afetada pelas animações de entrada dos itens (ex.: gaveta no mobile).
    // O offsetParent do link é a própria lista (position: relative).
    let top = 0;
    let node = activeLink;
    while (node && node !== list) {
      top += node.offsetTop;
      node = node.offsetParent;
    }
    const bottom = list.clientHeight - (top + activeLink.offsetHeight);
    const prev = lastPillPos.current;

    if (!animate || !prev) {
      pill.style.transition = 'opacity 0.25s ease';
    } else if (prev.top !== top) {
      // A ponta da frente parte primeiro e a de trás segue com atraso:
      // o destaque estica durante o movimento e "assenta" no destino.
      const lead = '0.38s cubic-bezier(0.3, 0.8, 0.25, 1)';
      const trail = '0.52s cubic-bezier(0.55, 0, 0.1, 1) 0.07s';
      const movingDown = top > prev.top;
      pill.style.transition = movingDown
        ? `bottom ${lead}, top ${trail}, opacity 0.25s ease`
        : `top ${lead}, bottom ${trail}, opacity 0.25s ease`;
      pill.classList.remove('is-moving');
      void pill.offsetWidth;
      pill.classList.add('is-moving');
    }

    pill.style.top = `${top}px`;
    pill.style.bottom = `${bottom}px`;
    pill.style.opacity = '1';
    lastPillPos.current = { top, bottom };
  }, []);

  // Ao mudar de rota, o destaque desliza para o novo item
  useLayoutEffect(() => {
    positionPill(true);
  }, [location.pathname, positionPill]);

  // Mudanças de layout (grupos a abrir/fechar, sidebar a encolher) seguem sem animação
  useEffect(() => {
    const list = navListRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => positionPill(false));
    ro.observe(list);
    return () => ro.disconnect();
  }, [positionPill]);

  useEffect(() => {
    positionPill(false);
  }, [openGroups, menuOpen, isMobile, userProfile?.role, positionPill]);

  // --- MENU DA CONTA ---
  const accountCardRef = useRef(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const closeAccountMenu = useCallback(() => setAccountOpen(false), []);

  const displayName = userProfile?.nome || userProfile?.nome_completo || user?.email?.split('@')[0] || 'Utilizador';
  const initials = displayName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const roleLabel = userProfile?.role ? String(userProfile.role).charAt(0).toUpperCase() + String(userProfile.role).slice(1) : '';

  const renderGroupHeader = (key, label) => {
    if (!showFull) return <div className="sidebar-divider" />;
    return (
      <div className="sidebar-group-header" onClick={() => toggleGroup(key)}>
        <span>{label}</span>
        <span className={`chevron-icon ${openGroups[key] ? 'open' : ''}`}>
          <Icons.ChevronDown />
        </span>
      </div>
    );
  };

  return (
    <>
      <aside className={`sidebar ${menuOpen ? "open" : "closed"} ${isMobile ? "is-mobile" : ""}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh', zIndex: 100 }}>
        
        {/* 💡 LOGO CONTAINER TRANSFORMA-SE NO BOTÃO DE TOGGLE */}
        <div 
          onClick={() => setMenuOpen(!menuOpen)}
          className="logo-toggle-container"
        >
            <img 
              src={showFull ? logoFull : logoIcon} 
              alt="Bizin Logo" 
              className={showFull ? "logo-full" : "logo-icon"}
            />
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '15px 0' }} className="sidebar-scroll">
          <ul ref={navListRef} className="sidebar-nav-list" style={{ margin: 0 }}>
            <div ref={pillRef} className="sidebar-active-pill" aria-hidden="true" />
            
            {/* --- INÍCIO --- */}
            <li className={isActive('/dashboard')}>
              <Link to="/dashboard" title={getSidebarTooltip("Início")}>
                <span className="icon"><Icons.Home /></span> 
                <span className="link-text">Início</span>
              </Link>
            </li>

            {/* --- COMUNICAÇÃO INTERNA --- */}
            <li className={isActive('/dashboard/forum')}>
              <Link ref={commsLinkRef} className={totalCommsUnread > 0 ? "has-unread" : undefined} to="/dashboard/forum" title={getSidebarTooltip("Fórum")} onClick={() => {
                  localStorage.setItem('lastForumVisit', new Date().toISOString());
                  setForumUnreadCount(0);
              }}>
                <span className="icon sidebar-icon-wrap">
                    <Icons.Message />
                    {totalCommsUnread > 0 && <span className="sidebar-dot" aria-hidden="true" />}
                </span>
                <span className="link-text">Comunicação Interna</span>
                {totalCommsUnread > 0 && (
                    <span key={totalCommsUnread} className="sidebar-count" aria-label={`${totalCommsUnread} por ler`}>
                        {totalCommsUnread > 99 ? '99+' : totalCommsUnread}
                    </span>
                )}
              </Link>
            </li>

            {/* --- GRUPO: PLANEAMENTO --- */}
            {renderGroupHeader('planeamento', 'PLANEAMENTO')}
            <div className={`sidebar-group-content ${openGroups.planeamento ? 'open' : ''}`} inert={!openGroups.planeamento}>
              <div className="sidebar-group-inner">
                <li className={isActive('/dashboard/minhas-tarefas')}>
                  <Link to="/dashboard/minhas-tarefas" title={getSidebarTooltip("Agenda")}>
                    <span className="icon"><Icons.Pin /></span> 
                    <span className="link-text">Agenda</span>
                  </Link>
                </li>
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); setShowCalendarModal(true); }} title={getSidebarTooltip("Calendário de Prazos")}>
                    <span className="icon"><Icons.Calendar /></span> 
                    <span className="link-text">Calendário</span>
                  </a>
                </li>
                <li className={isActive('/dashboard/tarefas')}>
                  <Link to="/dashboard/tarefas" title={getSidebarTooltip("Tarefas Globais")}>
                    <span className="icon"><Icons.Check /></span> 
                    <span className="link-text">Tarefas</span>
                  </Link>
                </li>
              </div>
              </div>

            {/* --- GRUPO: PRODUÇÃO --- */}
            {renderGroupHeader('producao', 'PRODUÇÃO')}
            <div className={`sidebar-group-content ${openGroups.producao ? 'open' : ''}`} inert={!openGroups.producao}>
              <div className="sidebar-group-inner">
                <li className={isActive('/dashboard/projetos')}>
                  <Link to="/dashboard/projetos" title={getSidebarTooltip("Projetos")}>
                    <span className="icon"><Icons.Rocket /></span> 
                    <span className="link-text">Projetos</span>
                  </Link>
                </li>
                <li className={isActive('/dashboard/modelos')}>
                  <Link to="/dashboard/modelos" title={getSidebarTooltip("Modelos de Projetos")}>
                    <span className="icon"><Icons.Clipboard /></span> 
                    <span className="link-text">Modelos</span>
                  </Link>
                </li>
                <li className={isActive('/dashboard/cursos')}>
                  <Link to="/dashboard/cursos" title={getSidebarTooltip("Gestão de Cursos") }>
                    <span className="icon"><Icons.Book /></span>
                    <span className="link-text">Cursos</span>
                  </Link>
                </li>
                <li className={isActive('/dashboard/acoes-formacao')}>
                  <Link to="/dashboard/acoes-formacao" title={getSidebarTooltip("Ações de Formação") }>
                    <span className="icon"><Icons.Graduation /></span>
                    <span className="link-text">Ações de Formação</span>
                  </Link>
                </li>
              </div>
              </div>

            {/* --- GRUPO: COMERCIAL --- */}
            {renderGroupHeader('comercial', 'COMERCIAL')}
            <div className={`sidebar-group-content ${openGroups.comercial ? 'open' : ''}`} inert={!openGroups.comercial}>
              <div className="sidebar-group-inner">
                <li className={isActive('/dashboard/clientes')}>
                  <Link to="/dashboard/clientes" title={getSidebarTooltip("Entidades")}>
                    <span className="icon"><Icons.Building /></span> 
                    <span className="link-text">Entidades</span>
                  </Link>
                </li>
                <li className={isActive('/dashboard/avisos')}>
                  <Link to="/dashboard/avisos" title={getSidebarTooltip("Programas e Avisos") }>
                    <span className="icon"><Icons.Megaphone /></span>
                    <span className="link-text">Programas/Avisos</span>
                  </Link>
                </li>
                {['admin'].includes(userProfile?.role) && (
                <li className={isActive('/dashboard/propostas')}>
                  <Link to="/dashboard/propostas" title={getSidebarTooltip("Propostas Comerciais") }>
                    <span className="icon"><Icons.Edit /></span>
                    <span className="link-text">Propostas</span>
                  </Link>
                </li>
                )}
                {['admin', 'gestor', 'marketing'].includes(userProfile?.role) && (
                  <li className={isActive('/dashboard/leads')}>
                    <Link to="/dashboard/leads" title={getSidebarTooltip("Leads")}>
                      <span className="icon"><Icons.Target /></span> 
                      <span className="link-text">Leads</span>
                    </Link>
                  </li>
                )}
                {['admin', 'gestor', 'marketing', 'marketing plus'].includes(userProfile?.role) && (
                  <li className={isActive('/dashboard/marketing')}>
                    <Link to="/dashboard/marketing" title={getSidebarTooltip("Marketing")}>
                      <span className="icon"><Icons.Palette /></span> 
                      <span className="link-text">Marketing</span>
                    </Link>
                  </li>
                )}
                {['admin', 'gestor'].includes(userProfile?.role) && (
                  <li className={isActive('/dashboard/transfergest')}>
                    <Link to="/dashboard/transfergest" title={getSidebarTooltip("TransferGest")}>
                      <span className="icon"><Icons.Transfer /></span>
                      <span className="link-text">TransferGest</span>
                    </Link>
                  </li>
                )}
              </div>
              </div>

            {/* --- GRUPO: GESTÃO --- */}
            {((['admin', 'gestor'].includes(userProfile?.role)) || ['admin', 'administrador'].includes(String(userProfile?.role || userProfile?.tipo || '').toLowerCase())) && 
              renderGroupHeader('gestao', 'GESTÃO')
            }
            <div className={`sidebar-group-content ${openGroups.gestao ? 'open' : ''}`} inert={!openGroups.gestao}>
              <div className="sidebar-group-inner">
                {['admin', 'gestor'].includes(userProfile?.role) && (
                  <li className={isActive('/dashboard/rh')}>
                    <Link to="/dashboard/rh" title={getSidebarTooltip("Recursos Humanos")}>
                      <span className="icon"><Icons.Briefcase /></span> 
                      <span className="link-text">Recursos Humanos</span>
                    </Link>
                  </li>
                )}
                {['admin', 'gestor', 'marketing plus'].includes(userProfile?.role) && (
                  <li className={isActive('/dashboard/ativos-ti')}>
                    <Link to="/dashboard/ativos-ti" title={getSidebarTooltip("Ativos TI")}>
                      <span className="icon"><Icons.Monitor /></span> 
                      <span className="link-text">Ativos TI</span>
                    </Link>
                  </li>
                )}
                <li className={isActive('/dashboard/organizador-pdf')}>
                  <Link to="/dashboard/organizador-pdf" title={getSidebarTooltip("Organizador de PDFs")}>
                    <span className="icon"><Icons.File /></span>
                    <span className="link-text">Organizador de PDFs</span>
                  </Link>
                </li>
                {['admin'].includes(String(userProfile?.role || userProfile?.tipo || '').toLowerCase()) && (
                  <li className={isActive('/dashboard/admin')}>
                    <Link to="/dashboard/admin" title={getSidebarTooltip("Admin") }>
                      <span className="icon"><Icons.Shield /></span>
                      <span className="link-text">Admin</span>
                    </Link>
                  </li>
                )}
                {['admin'].includes(String(userProfile?.role || userProfile?.tipo || '').toLowerCase()) && (
                  <li className={isActive('/dashboard/registos')}>
                    <Link to="/dashboard/registos" title={getSidebarTooltip("Registo de atividade")}>
                      <span className="icon"><Icons.History /></span>
                      <span className="link-text">Registos</span>
                    </Link>
                  </li>
                )}
              </div>
              </div>

          </ul>
        </nav>

        {/* --- CARTÃO DO UTILIZADOR (abre o menu da conta) --- */}
        <button
          type="button"
          ref={accountCardRef}
          className={`sidebar-user-card ${accountOpen ? 'is-open' : ''} ${isActive('/dashboard/perfil')}`}
          title={getSidebarTooltip(displayName)}
          onClick={() => setAccountOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={accountOpen}
        >
          <span className="sidebar-user-avatar">
            {userProfile?.avatar_url
              ? <img src={userProfile.avatar_url} alt="" />
              : <span>{initials}</span>}
            <span className="sidebar-user-status" />
          </span>
          <span className="sidebar-user-info">
            <span className="sidebar-user-name">{displayName}</span>
            {roleLabel && <span className="sidebar-user-role">{roleLabel}</span>}
          </span>
          <span className="sidebar-user-chevron" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
          </span>
        </button>

        <AccountMenu
          open={accountOpen}
          onClose={closeAccountMenu}
          anchorRef={accountCardRef}
          placement={showFull ? 'up' : 'right'}
          displayName={displayName}
          initials={initials}
          roleLabel={roleLabel}
        />

        <style>{`
    /* Novo container clicável para o Logo */
    .logo-toggle-container {
        flex-shrink: 0;
        padding: 24px 16px 16px 16px; /* Aumentado ligeiramente o espaço no topo */
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s ease;
        width: 100%;
        box-sizing: border-box;
    }

    .logo-toggle-container:hover {
        background: rgba(255, 255, 255, 0.03);
    }

    /* Animações suaves ao trocar o logo */
    .logo-full {
        animation: fadeIn 0.15s ease-out;
        width: 100%;
        max-width: 160px;
        height: auto !important; 
        object-fit: contain;
    }

    .logo-icon {
        animation: fadeIn 0.15s ease-out;
        max-height: 38px;     /* Mantém o tamanho que disseste que já estava bom */
        width: auto;
        object-fit: contain;
    }

    .sidebar nav ul li {
        margin-bottom: 1px !important;
        height: auto !important;      
    }

    .sidebar nav ul li a {
        height: 36px !important;      
        min-height: unset !important;  
        max-height: 36px !important;
        padding: 0 12px !important;    
        display: flex !important;
        align-items: center !important;
        line-height: 1 !important;     
        font-size: 0.88rem !important;
        border-radius: 6px !important;
        box-sizing: border-box !important;
    }
    
    .sidebar nav ul li a .icon {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin-right: 10px !important;
        height: 100% !important;
    }

    .sidebar nav ul li a .icon svg {
        width: 16px !important;
        height: 16px !important;
        display: block !important;
    }

    .sidebar-group-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 12px 4px 12px !important;
        font-size: 0.68rem !important;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.4) !important; 
        letter-spacing: 0.05em;
        cursor: pointer;
        user-select: none;
        height: auto !important;
    }
    
    .sidebar-group-header:hover {
        color: rgba(255, 255, 255, 0.7) !important;
    }
    
    .chevron-icon {
        display: flex;
        align-items: center;
        transition: transform 0.15s ease;
    }
    
    .chevron-icon.open {
        transform: rotate(-180deg);
    }
    
    .sidebar-group-content {
        display: grid;
        grid-template-rows: 0fr;
        opacity: 0;
        transition: grid-template-rows 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease;
    }

    .sidebar-group-content.open {
        grid-template-rows: 1fr;
        opacity: 1;
    }

    .sidebar-group-inner {
        overflow: hidden;
        min-height: 0;
    }
    
    .sidebar-divider {
        height: 1px;
        background: rgba(255,255,255,0.05);
        margin: 6px 0;
    }
    
    .sidebar-scroll::-webkit-scrollbar { width: 0px; background: transparent; }
    .sidebar-scroll { -ms-overflow-style: none; scrollbar-width: none; }
`}</style>
      </aside>

      {/* --- MODAL DO CALENDÁRIO --- */}
      {showCalendarModal && (
          <div className="cal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCalendarModal(false); }}>
              <div className="cal-modal" role="dialog" aria-label="Calendário">
                  <WidgetCalendar onClose={() => setShowCalendarModal(false)} />
              </div>
          </div>
      )}
    </>
  );
}