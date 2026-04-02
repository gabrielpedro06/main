import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import StopTimerNoteModal from "../components/StopTimerNoteModal";
import { resolveActiveTimerMeta } from "../utils/activeTimerResolver";
import "./../styles/dashboard.css";

// --- ÍCONES SVG PROFISSIONAIS ---
const Icons = {
  Message: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
    Paperclip: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-8.49 8.49a5 5 0 0 1-7.07-7.07l8.49-8.49a3 3 0 1 1 4.24 4.24l-8.5 8.49a1 1 0 0 1-1.41-1.41l7.79-7.78"></path></svg>,
  Plus: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Close: ({ size = 18, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Trash: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Send: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>,
  CheckCircle: ({ size = 48, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
  XCircle: ({ size = 48, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>,
  AlertTriangle: ({ size = 48, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
  Image: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
  User: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
    Heart: ({ size = 16, color = "currentColor", fill = "none" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
    Stop: ({ size = 12, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>,
    GripVertical: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>,
  Edit: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
};

const ModalPortal = ({ children }) => createPortal(children, document.body);
const getChatSeenStorageKey = (userId) => `chat_seen_rooms_${userId}`;

const BLOCKS_PREFIX = "BLOCKS_V1:";
const IMAGE_SIZE_OPTIONS = [
    { value: "sm", label: "Pequena", maxWidth: "320px" },
    { value: "md", label: "Média", maxWidth: "520px" },
    { value: "lg", label: "Grande", maxWidth: "760px" },
    { value: "full", label: "Largura total", maxWidth: "100%" },
];
const TEXT_ALIGNMENT_OPTIONS = [
    { value: "left", label: "Esquerda" },
    { value: "center", label: "Centro" },
    { value: "right", label: "Direita" },
    { value: "justify", label: "Justificado" },
];

const getImageSizeConfig = (size) => IMAGE_SIZE_OPTIONS.find((option) => option.value === size) || IMAGE_SIZE_OPTIONS[2];

const createTextBlock = (text = "", align = "left") => ({ id: `${Date.now()}_${Math.random()}`, type: "text", text, align });
const createImageBlock = (size = "lg") => ({ id: `${Date.now()}_${Math.random()}`, type: "image", file: null, previewUrl: "", uploadedUrl: "", size });

const parsePostBlocks = (post) => {
    const conteudo = typeof post?.conteudo === "string" ? post.conteudo : "";
    if (conteudo.startsWith(BLOCKS_PREFIX)) {
        try {
            const parsed = JSON.parse(conteudo.slice(BLOCKS_PREFIX.length));
            if (Array.isArray(parsed)) {
                const blocks = parsed
                    .filter((b) => b && (b.type === "text" || b.type === "image"))
                    .map((b) => {
                        if (b.type === "text") {
                            return { id: `${Date.now()}_${Math.random()}`, type: "text", text: String(b.text || ""), align: String(b.align || "left") };
                        }
                        return {
                            id: `${Date.now()}_${Math.random()}`,
                            type: "image",
                            file: null,
                            previewUrl: String(b.url || ""),
                            uploadedUrl: String(b.url || ""),
                            size: String(b.size || b.displaySize || "lg"),
                        };
                    });
                if (blocks.length) return blocks;
            }
        } catch {
            // Fall back to legacy format below if parsing fails.
        }
    }

    const blocks = [];
    if (conteudo.trim()) blocks.push(createTextBlock(conteudo));
    if (post?.image_url) {
        const img = createImageBlock("lg");
        img.previewUrl = post.image_url;
        img.uploadedUrl = post.image_url;
        blocks.push(img);
    }

    return blocks.length ? blocks : [createTextBlock("")];
};

const serializeBlocksToContent = (blocks) => {
    const normalized = (blocks || [])
        .map((block) => {
            if (block.type === "text") {
                return { type: "text", text: String(block.text || ""), align: String(block.align || "left") };
            }
            const url = block.uploadedUrl || block.previewUrl || "";
            return { type: "image", url: String(url), size: String(block.size || "lg") };
        })
        .filter((block) => (block.type === "text" ? block.text.trim().length > 0 : Boolean(block.url)));

    return `${BLOCKS_PREFIX}${JSON.stringify(normalized)}`;
};

export default function Forum() {
  const { user, userProfile } = useAuth(); 
    const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
    const [activeLog, setActiveLog] = useState(null);
    const [activeLogTitle, setActiveLogTitle] = useState("");
    const [activeLogRoute, setActiveLogRoute] = useState("/dashboard/tarefas");
    const [stopNoteModal, setStopNoteModal] = useState({ show: false });

  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null); 
  const [selectedUserFilter, setSelectedUserFilter] = useState(null); 

  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [confirmModal, setConfirmModal] = useState({ show: false, id: null, type: null, postId: null }); 

  // Dados Novo Post
    const [newPost, setNewPost] = useState({ titulo: "", categoria: "geral" });
    const [postBlocks, setPostBlocks] = useState([createTextBlock("")]);
        const [draggedBlockIndex, setDraggedBlockIndex] = useState(null);
        const [dragOverBlockIndex, setDragOverBlockIndex] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Dados Modal Comentários
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");
    const [postCommentsByPost, setPostCommentsByPost] = useState({});
    const [inlineCommentDrafts, setInlineCommentDrafts] = useState({});
    const [inlineCommentOpen, setInlineCommentOpen] = useState({});
    const [inlineCommentExpanded, setInlineCommentExpanded] = useState({});
    const [loadingInlineComments, setLoadingInlineComments] = useState({});
    const [replyTargetByPost, setReplyTargetByPost] = useState({});
    const [modalReplyTarget, setModalReplyTarget] = useState(null);
    const [chatModal, setChatModal] = useState({ show: false, target: null });
    const [chatRooms, setChatRooms] = useState([]);
    const [activeChatRoom, setActiveChatRoom] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const chatMessagesRef = useRef([]);
    const activeRoomChannelRef = useRef(null);
    const typingTimersRef = useRef({});
    const typingLastSentAtRef = useRef(0);
    const chatMessagesContainerRef = useRef(null);
    const [chatDraft, setChatDraft] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [chatSending, setChatSending] = useState(false);
    const [chatUploadingFile, setChatUploadingFile] = useState(false);
    const [chatError, setChatError] = useState("");
    const [chatRlsNeedsFix, setChatRlsNeedsFix] = useState(false);
    const [chatCollaborators, setChatCollaborators] = useState([]);
    const [typingUsersById, setTypingUsersById] = useState({});
    const [readReceiptsByRoom, setReadReceiptsByRoom] = useState({});
    const [unreadByRoom, setUnreadByRoom] = useState({});
    const [chatNotice, setChatNotice] = useState({ show: false, text: "" });
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [newChatType, setNewChatType] = useState("private"); // "private" or "group"
    const [newChatName, setNewChatName] = useState("");
    const [selectedUserForChat, setSelectedUserForChat] = useState(null);
    const [selectedUsersForGroupChat, setSelectedUsersForGroupChat] = useState([]);
    const [newChatLoading, setNewChatLoading] = useState(false);
    const [showAddGroupMembersModal, setShowAddGroupMembersModal] = useState(false);
    const [existingGroupMemberIds, setExistingGroupMemberIds] = useState([]);
    const [selectedUsersToAddInGroup, setSelectedUsersToAddInGroup] = useState([]);
    const [addingGroupMembers, setAddingGroupMembers] = useState(false);

  useEffect(() => {
    fetchPosts();
    localStorage.setItem('lastForumVisit', new Date().toISOString());
    window.dispatchEvent(new Event('storage')); 
  }, []);

    useEffect(() => {
        if (user?.id) checkActiveLog();
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;

        const refresh = () => checkActiveLog();
        const intervalId = setInterval(refresh, 45000);
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", refresh);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener("focus", refresh);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [user?.id]);

    useEffect(() => {
        let cancelled = false;

        const resolveActiveTitle = async () => {
            if (!activeLog) {
                if (!cancelled) {
                    setActiveLogTitle("");
                    setActiveLogRoute("/dashboard/tarefas");
                }
                return;
            }

            const timerMeta = await resolveActiveTimerMeta(supabase, activeLog);
            if (cancelled) return;

            setActiveLogTitle(timerMeta.title || "Tempo a decorrer...");
            setActiveLogRoute(timerMeta.route || "/dashboard/tarefas");
        };

        resolveActiveTitle();

        return () => {
            cancelled = true;
        };
    }, [activeLog]);

    useEffect(() => {
        if (!chatModal.show || !activeChatRoom?.id) return;

        // Criamos o canal para a sala específica
        const channel = supabase
            .channel(`room_${activeChatRoom.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "chat_messages",
                    filter: `room_id=eq.${activeChatRoom.id}`,
                },
                (payload) => {
                    const incoming = payload.new;
                    setChatMessages((prev) => {
                        // Verifica se a mensagem já existe no estado (evita duplicados se o insert retornar antes do realtime)
                        if (prev.some((m) => m.id === incoming.id)) return prev;
                        return [...prev, incoming];
                    });
                }
            )
            .on("broadcast", { event: "typing" }, ({ payload }) => {
                const typingUserId = payload?.userId;
                const isTyping = Boolean(payload?.isTyping);
                if (!typingUserId || typingUserId === user?.id) return;

                if (isTyping) {
                    markUserAsTyping(typingUserId);
                    return;
                }

                removeTypingUser(typingUserId);
                if (typingTimersRef.current[typingUserId]) {
                    clearTimeout(typingTimersRef.current[typingUserId]);
                    delete typingTimersRef.current[typingUserId];
                }
            })
            .subscribe();

        activeRoomChannelRef.current = channel;

        return () => {
            activeRoomChannelRef.current = null;
            supabase.removeChannel(channel);
        };
    }, [chatModal.show, activeChatRoom?.id, user?.id]);

    useEffect(() => {
        chatMessagesRef.current = chatMessages;
    }, [chatMessages]);

    useEffect(() => {
        if (!chatModal.show || !activeChatRoom?.id || !chatMessages.length) return;

        const latest = chatMessages[chatMessages.length - 1];
        markRoomAsSeen(activeChatRoom.id, latest?.created_at || new Date().toISOString());

        const container = chatMessagesContainerRef.current;
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 40);
        }
    }, [chatMessages, chatModal.show, activeChatRoom?.id]);

    useEffect(() => {
        if (!chatModal.show || !activeChatRoom?.id) return;

        loadRoomReadReceipts(activeChatRoom.id);
    }, [chatModal.show, activeChatRoom?.id]);

    useEffect(() => {
        if (!chatModal.show || !activeChatRoom?.id) return;

        const channel = supabase
            .channel(`chat_room_reads_${activeChatRoom.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "chat_room_reads",
                    filter: `room_id=eq.${activeChatRoom.id}`,
                },
                (payload) => {
                    const row = payload.new || payload.old;
                    if (!row?.room_id || !row?.user_id) return;

                    if (payload.eventType === "DELETE") {
                        setReadReceiptsByRoom((prev) => {
                            const roomReads = { ...(prev[row.room_id] || {}) };
                            delete roomReads[row.user_id];
                            return {
                                ...prev,
                                [row.room_id]: roomReads,
                            };
                        });
                        return;
                    }

                    setReadReceiptsByRoom((prev) => ({
                        ...prev,
                        [row.room_id]: {
                            ...(prev[row.room_id] || {}),
                            [row.user_id]: row.last_read_at,
                        },
                    }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [chatModal.show, activeChatRoom?.id]);

    useEffect(() => {
        setTypingUsersById({});
        Object.values(typingTimersRef.current || {}).forEach((timerId) => clearTimeout(timerId));
        typingTimersRef.current = {};
        typingLastSentAtRef.current = 0;
    }, [activeChatRoom?.id]);

    // Load chat data for current user
    useEffect(() => {
        if (!user?.id) return;
        loadChatCollaborators();
        if (!chatRlsNeedsFix) loadMyChatRooms();
    }, [user?.id, chatRlsNeedsFix]);

    useEffect(() => {
        if (!user?.id) return;

        let noticeTimeoutId = null;

        const channel = supabase
            .channel(`chat_notice_${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "chat_messages",
                },
                async (payload) => {
                    const incoming = payload.new;
                    if (!incoming?.room_id) return;
                    if (incoming.sender_id === user.id) return;

                    const roomIdSet = new Set(chatRooms.map((room) => room.id));
                    let canSeeRoom = roomIdSet.has(incoming.room_id);

                    if (!canSeeRoom) {
                        // Always confirm membership when the room is not yet loaded locally.
                        const { data: membership, error: membershipError } = await supabase
                            .from("chat_participants")
                            .select("room_id")
                            .eq("room_id", incoming.room_id)
                            .eq("user_id", user.id)
                            .maybeSingle();

                        if (membershipError || !membership?.room_id) return;
                        canSeeRoom = true;
                        if (!chatRlsNeedsFix) {
                            loadMyChatRooms();
                        }
                    }

                    if (!canSeeRoom) return;

                    if (activeChatRoom?.id === incoming.room_id) {
                        markRoomAsSeen(incoming.room_id);
                        return;
                    }

                    setUnreadByRoom((prev) => ({
                        ...prev,
                        [incoming.room_id]: (prev[incoming.room_id] || 0) + 1,
                    }));

                    const roomName = chatRooms.find((room) => room.id === incoming.room_id)?.display_title || "Chat";
                    setChatNotice({ show: true, text: `Nova mensagem em ${roomName}` });

                    if (noticeTimeoutId) clearTimeout(noticeTimeoutId);
                    noticeTimeoutId = setTimeout(() => {
                        setChatNotice({ show: false, text: "" });
                    }, 3000);
                }
            )
            .subscribe();

        return () => {
            if (noticeTimeoutId) clearTimeout(noticeTimeoutId);
            supabase.removeChannel(channel);
        };
    }, [user?.id, chatRooms, activeChatRoom?.id, chatRlsNeedsFix]);

    useEffect(() => {
        if (!user?.id || chatRlsNeedsFix) return;

        const channel = supabase
            .channel(`chat_membership_${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "chat_participants",
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    setChatNotice({ show: true, text: "Foste adicionado a uma nova conversa." });
                    setTimeout(() => setChatNotice({ show: false, text: "" }), 3000);
                    loadMyChatRooms();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, chatRlsNeedsFix]);

  const showToast = (message, type = 'success') => {
      setNotification({ show: true, message, type });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  function getSeenRoomsMap() {
      if (!user?.id) return {};
      try {
          const raw = localStorage.getItem(getChatSeenStorageKey(user.id));
          const parsed = raw ? JSON.parse(raw) : {};
          return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
          return {};
      }
  }

  function saveSeenRoomsMap(nextMap) {
      if (!user?.id) return;
      localStorage.setItem(getChatSeenStorageKey(user.id), JSON.stringify(nextMap || {}));
  }

  function markRoomAsSeen(roomId, lastReadAt = null) {
      if (!roomId) return;
      const nowIso = lastReadAt || new Date().toISOString();
      const current = getSeenRoomsMap();
      current[roomId] = nowIso;
      saveSeenRoomsMap(current);
      setUnreadByRoom((prev) => ({ ...prev, [roomId]: 0 }));
      upsertRoomReadReceipt(roomId, nowIso);
  }

  async function upsertRoomReadReceipt(roomId, lastReadAt) {
      if (!roomId || !user?.id) return;

      const readAt = lastReadAt || new Date().toISOString();

      const { error } = await supabase.from("chat_room_reads").upsert(
          [
              {
                  room_id: roomId,
                  user_id: user.id,
                  last_read_at: readAt,
              },
          ],
          { onConflict: "room_id,user_id" }
      );

      if (error) return;

      setReadReceiptsByRoom((prev) => ({
          ...prev,
          [roomId]: {
              ...(prev[roomId] || {}),
              [user.id]: readAt,
          },
      }));
  }

  async function loadRoomReadReceipts(roomId) {
      if (!roomId) return;

      const { data, error } = await supabase
          .from("chat_room_reads")
          .select("room_id, user_id, last_read_at")
          .eq("room_id", roomId);

      if (error) return;

      const roomReadMap = {};
      (data || []).forEach((row) => {
          if (!row?.user_id) return;
          roomReadMap[row.user_id] = row.last_read_at;
      });

      setReadReceiptsByRoom((prev) => ({
          ...prev,
          [roomId]: roomReadMap,
      }));
  }

  async function refreshUnreadCounts(roomIds = []) {
      if (!user?.id || !roomIds.length) {
          setUnreadByRoom({});
          return;
      }

      const seenMap = getSeenRoomsMap();

      const { data, error } = await supabase
          .from("chat_messages")
          .select("room_id, sender_id, created_at")
          .in("room_id", roomIds)
          .order("created_at", { ascending: false })
          .limit(500);

      if (error) return;

      const nextCounts = {};
      roomIds.forEach((id) => {
          nextCounts[id] = 0;
      });

      (data || []).forEach((msg) => {
          if (!msg?.room_id) return;
          if (msg.sender_id === user.id) return;

          const seenAt = seenMap[msg.room_id];
          if (seenAt && new Date(msg.created_at) <= new Date(seenAt)) return;

          nextCounts[msg.room_id] = (nextCounts[msg.room_id] || 0) + 1;
      });

      setUnreadByRoom(nextCounts);
  }

    async function checkActiveLog() {
        if (!user?.id) {
            setActiveLog(null);
            return;
        }

        const { data, error } = await supabase
            .from("task_logs")
            .select("*")
            .eq("user_id", user.id)
            .is("end_time", null)
            .order("start_time", { ascending: false })
            .limit(1);

        if (error) {
            setActiveLog(null);
            return;
        }

        setActiveLog(Array.isArray(data) ? data[0] || null : null);
    }

    async function stopLogById(logToStop, stopNote = "") {
        if (!logToStop) return null;
        const diffMins = Math.max(1, Math.floor((new Date() - new Date(logToStop.start_time)) / 60000));
        const stopTimestamp = new Date().toISOString();
        const note = typeof stopNote === "string" ? stopNote.trim() : "";
        const payload = { end_time: stopTimestamp, duration_minutes: diffMins };
        if (note) payload.observacoes = note;

        let { error } = await supabase.from("task_logs").update(payload).eq("id", logToStop.id);

        if (error && note) {
            const retry = await supabase
                .from("task_logs")
                .update({ end_time: stopTimestamp, duration_minutes: diffMins })
                .eq("id", logToStop.id);
            error = retry.error;
        }

        if (error) {
            showToast("Erro ao terminar o cronómetro atual.", "error");
            return null;
        }

        return diffMins;
    }

    function openStopNoteModal(e) {
        if (e?.stopPropagation) e.stopPropagation();
        if (!activeLog) return;
        setStopNoteModal({ show: true });
    }

    function closeStopNoteModal() {
        setStopNoteModal({ show: false });
    }

    async function confirmStopWithNote(note) {
        setStopNoteModal({ show: false });
        if (!activeLog) return;

        const logToStop = activeLog;
        const diffMins = await stopLogById(logToStop, note);
        if (diffMins === null) return;

        setActiveLog(null);
        showToast(`Tempo registado: ${diffMins} min.`, "success");
    }

  async function fetchPosts(showLoader = true) {
    if (showLoader) setLoading(true);
    const { data, error } = await supabase
      .from("forum_posts")
      .select(`
        *,
                profiles ( nome, empresa_interna, avatar_url ),
        forum_comments ( count ),
        forum_reactions ( id, reaction_type, user_id )
      `)
      .order("created_at", { ascending: false });

    if (!error) setPosts(data || []);
    if (showLoader) setLoading(false);
  }

  // --- CRIAR POST ---
  async function handleCreatePost(e) {
    e.preventDefault();
    setIsUploading(true);

    const blocksForUpload = [...postBlocks];

    try {
        for (let i = 0; i < blocksForUpload.length; i += 1) {
            const block = blocksForUpload[i];
            if (block.type !== "image") continue;
            if (!block.file) continue;

            const fileExt = block.file.name.split(".").pop();
            const fileName = `${user.id}_${Date.now()}_${i}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from("forum_media").upload(fileName, block.file);
            if (uploadError) {
                throw new Error("Nao foi possivel carregar uma das imagens. Verifica se o bucket 'forum_media' existe.");
            }

            const { data } = supabase.storage.from("forum_media").getPublicUrl(fileName);
            blocksForUpload[i] = { ...block, uploadedUrl: data.publicUrl, previewUrl: data.publicUrl, file: null };
        }

        const normalizedBlocks = blocksForUpload
            .map((block) => {
                if (block.type === "text") return { type: "text", text: String(block.text || "") };
                const url = block.uploadedUrl || block.previewUrl || "";
                return { type: "image", url: String(url) };
            })
            .filter((block) => (block.type === "text" ? block.text.trim().length > 0 : Boolean(block.url)));

        if (!normalizedBlocks.length) {
            throw new Error("Adiciona texto ou imagem antes de publicar.");
        }

        const firstImageUrl = normalizedBlocks.find((b) => b.type === "image")?.url || null;

        const payload = {
            titulo: newPost.titulo,
            conteudo: serializeBlocksToContent(blocksForUpload),
            categoria: newPost.categoria,
            user_id: user.id
        };

        if (firstImageUrl) {
            payload.image_url = firstImageUrl;
        }

        const { error } = await supabase.from("forum_posts").insert([payload]);

        if (error) {
            console.error(error);
            throw new Error(error.message.includes('image_url') ? 'A coluna image_url ainda não foi criada na base de dados.' : error.message);
        }

        closeNewPostModal();
        fetchPosts(true);
        showToast("Publicado com sucesso!", "success");

    } catch (err) {
        showToast("Erro ao publicar: " + err.message, "error");
    } finally {
        setIsUploading(false);
    }
  }

  function requestDelete(id, type, postId = null) {
      setConfirmModal({ show: true, id, type, postId });
  }

  async function confirmDelete() {
      const { id, type, postId } = confirmModal;
      try {
          if (type === 'post') {
              const { error } = await supabase.from("forum_posts").delete().eq("id", id);
              if (error) throw error;
              setPosts(posts.filter(p => p.id !== id));
              if (selectedPost?.id === id) setSelectedPost(null);
              setPostCommentsByPost((prev) => {
                  const next = { ...prev };
                  delete next[id];
                  return next;
              });
              showToast("Publicação apagada.", "success");
          } 
          else if (type === 'comment') {
              const { error } = await supabase.from("forum_comments").delete().eq("id", id);
              if (error) throw error;
              setComments(comments.filter(c => c.id !== id));

              if (postId) {
                  setPostCommentsByPost((prev) => ({
                      ...prev,
                      [postId]: (prev[postId] || []).filter((c) => c.id !== id),
                  }));
              }

              setPosts(posts.map(p => {
                  const shouldUpdate = postId ? p.id === postId : p.id === selectedPost?.id;
                  if (shouldUpdate) {
                      const currCount = p.forum_comments?.[0]?.count || 1;
                      return { ...p, forum_comments: [{ count: currCount - 1 }] };
                  }
                  return p;
              }));
              
              showToast("Comentário removido.", "success");
          }
      } catch (err) {
          showToast("Erro ao apagar: " + err.message, "error");
      } finally {
          setConfirmModal({ show: false, id: null, type: null, postId: null }); 
      }
  }

  async function fetchCommentsForPost(postId) {
      if (!postId) return;
      setLoadingInlineComments((prev) => ({ ...prev, [postId]: true }));
      const { data, error } = await supabase
          .from("forum_comments")
          .select(`*, profiles ( nome, avatar_url )`)
          .eq("post_id", postId)
          .order("created_at", { ascending: true });

      if (!error) {
          setPostCommentsByPost((prev) => ({ ...prev, [postId]: data || [] }));
      }
      setLoadingInlineComments((prev) => ({ ...prev, [postId]: false }));
  }

  function toggleInlineComments(postId) {
      setInlineCommentOpen((prev) => {
          const nextOpen = !prev[postId];
          if (nextOpen && !postCommentsByPost[postId]) {
              fetchCommentsForPost(postId);
          }
          return { ...prev, [postId]: nextOpen };
      });
  }

  async function handleSendInlineComment(e, postId) {
      e.preventDefault();
      const draft = String(inlineCommentDrafts[postId] || "").trim();
      if (!draft) return;
      const replyTarget = replyTargetByPost[postId];
      const payloadText = replyTarget?.nome ? `@${replyTarget.nome} ${draft}` : draft;

      setInlineCommentDrafts((prev) => ({ ...prev, [postId]: "" }));

      const { data, error } = await supabase
          .from("forum_comments")
          .insert([{ post_id: postId, user_id: user.id, conteudo: payloadText }])
          .select(`*, profiles ( nome, avatar_url )`)
          .single();

      if (error || !data) {
          setInlineCommentDrafts((prev) => ({ ...prev, [postId]: draft }));
          showToast("Erro ao comentar.", "error");
          return;
      }

      setPostCommentsByPost((prev) => {
          const existing = prev[postId] || [];
          return { ...prev, [postId]: [...existing, data] };
      });

      if (selectedPost?.id === postId) {
          setComments((prev) => [...prev, data]);
      }

      setPosts((prev) =>
          prev.map((p) => {
              if (p.id !== postId) return p;
              const currentCount = p.forum_comments?.[0]?.count || 0;
              return { ...p, forum_comments: [{ count: currentCount + 1 }] };
          })
      );

      setReplyTargetByPost((prev) => ({ ...prev, [postId]: null }));
  }

  async function handleOpenPost(post) {
    setSelectedPost(post);
    const { data: cData } = await supabase
      .from("forum_comments")
            .select(`*, profiles ( nome, avatar_url )`)
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    setComments(cData || []);
  }

  async function handleSendComment(e) {
    e.preventDefault();
    if(!newCommentText.trim()) return;

    const textoComentario = newCommentText;
    const payloadText = modalReplyTarget?.nome ? `@${modalReplyTarget.nome} ${textoComentario}` : textoComentario;
    setNewCommentText(""); 

    const { data, error } = await supabase
        .from("forum_comments")
        .insert([{ post_id: selectedPost.id, user_id: user.id, conteudo: payloadText }])
        .select(`*, profiles ( nome, avatar_url )`)
        .single();

    if (!error && data) {
        setComments([...comments, data]); 
        
        setPosts(posts.map(p => {
            if(p.id === selectedPost.id) {
                const currentCount = p.forum_comments?.[0]?.count || 0;
                return { ...p, forum_comments: [{ count: currentCount + 1 }] };
            }
            return p;
        }));

        setPostCommentsByPost((prev) => {
            const existing = prev[selectedPost.id] || [];
            return { ...prev, [selectedPost.id]: [...existing, data] };
        });

        setModalReplyTarget(null);
        
        fetchPosts(false);
    } else {
        setNewCommentText(textoComentario); 
        showToast("Erro ao comentar.", "error");
    }
  }

  const canDelete = (authorId) => {
      const myRole = userProfile?.role || '';
      return user.id === authorId || ['admin', 'gestor'].includes(myRole);
  };

  const openNewPostModal = () => {
      setNewPost({ titulo: "", categoria: "geral" });
      setPostBlocks([createTextBlock("")]);
      setShowNewPostModal(true);
  };

  const closeNewPostModal = () => {
      setShowNewPostModal(false);
      setNewPost({ titulo: "", categoria: "geral" });
      setPostBlocks([createTextBlock("")]);
  };

  const closeInternalChatModal = () => {
      setChatModal({ show: false, target: null });
      setActiveChatRoom(null);
      setChatMessages([]);
      setChatDraft("");
      setChatError("");
      setShowAddGroupMembersModal(false);
      setExistingGroupMemberIds([]);
      setSelectedUsersToAddInGroup([]);
      setTypingUsersById({});

      Object.values(typingTimersRef.current || {}).forEach((timerId) => clearTimeout(timerId));
      typingTimersRef.current = {};
      typingLastSentAtRef.current = 0;
  };

  function removeTypingUser(userId) {
      setTypingUsersById((prev) => {
          if (!prev[userId]) return prev;
          const next = { ...prev };
          delete next[userId];
          return next;
      });
  }

  function markUserAsTyping(userId) {
      if (!userId || userId === user?.id) return;

      setTypingUsersById((prev) => ({ ...prev, [userId]: true }));

      if (typingTimersRef.current[userId]) {
          clearTimeout(typingTimersRef.current[userId]);
      }

      typingTimersRef.current[userId] = setTimeout(() => {
          removeTypingUser(userId);
          delete typingTimersRef.current[userId];
      }, 2400);
  }

  function emitTypingStatus(isTyping) {
      if (!activeChatRoom?.id || !activeRoomChannelRef.current || !user?.id) return;

      const now = Date.now();
      if (isTyping && now - typingLastSentAtRef.current < 800) return;
      if (isTyping) typingLastSentAtRef.current = now;

      activeRoomChannelRef.current.send({
          type: "broadcast",
          event: "typing",
          payload: {
              userId: user.id,
              isTyping: Boolean(isTyping),
          },
      });
  }

  function getMessageReadTick(msg) {
      if (!msg || msg.sender_id !== user?.id || !activeChatRoom?.id) return "";

      const roomReceipts = readReceiptsByRoom[activeChatRoom.id] || {};
      const readByOthers = Object.entries(roomReceipts).some(([readerUserId, readAt]) => {
          if (!readerUserId || readerUserId === user.id) return false;
          if (!readAt) return false;
          return new Date(readAt) >= new Date(msg.created_at || new Date().toISOString());
      });

      return readByOthers ? "✓✓" : "✓";
  }

  function handleChatDraftChange(value) {
      setChatDraft(value);

      if (!value.trim()) {
          emitTypingStatus(false);
          return;
      }

      emitTypingStatus(true);
  }

  async function loadChatMessages(roomId) {
      if (!roomId) {
          setChatMessages([]);
          return;
      }

      const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true });

      if (error) throw error;
      setChatMessages(data || []);
  }

  async function syncActiveChatMessages(roomId) {
      if (!roomId) return;

      const latestKnown = chatMessagesRef.current || [];
      const lastKnownCreatedAt = latestKnown.length ? latestKnown[latestKnown.length - 1]?.created_at : null;

      let query = supabase
          .from("chat_messages")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true })
          .limit(50);

      if (lastKnownCreatedAt) {
          query = query.gt("created_at", lastKnownCreatedAt);
      }

      const { data, error } = await query;
      if (error || !data?.length) return;

      setChatMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const incoming = data.filter((m) => !existingIds.has(m.id));
          if (!incoming.length) return prev;
          return [...prev, ...incoming];
      });
  }

  async function getOrCreateGroupRoom(groupName) {
      const { data: existing, error: existingError } = await supabase
          .from("chat_rooms")
          .select("*")
          .eq("is_group", true)
          .eq("nome", groupName)
          .limit(1)
          .maybeSingle();

      if (existingError) throw existingError;
      if (existing) {
          await supabase.from("chat_participants").upsert(
              [{ room_id: existing.id, user_id: user.id }],
              { onConflict: "room_id,user_id" }
          );
          return existing;
      }

      const { data: created, error: createError } = await supabase
          .from("chat_rooms")
          .insert([{ nome: groupName, is_group: true }])
          .select("*")
          .single();

      if (createError) throw createError;

      await supabase.from("chat_participants").upsert(
          [{ room_id: created.id, user_id: user.id }],
          { onConflict: "room_id,user_id" }
      );

      return created;
  }

  async function createGroupRoomWithParticipants(groupName, participantIds = []) {
      const { data: created, error: createError } = await supabase
          .from("chat_rooms")
          .insert([{ nome: groupName, is_group: true }])
          .select("*")
          .single();

      if (createError) throw createError;

      const uniqueUserIds = Array.from(new Set([user.id, ...(participantIds || [])]));
      const participantsPayload = uniqueUserIds.map((userId) => ({ room_id: created.id, user_id: userId }));

      const { error: participantsError } = await supabase
          .from("chat_participants")
          .upsert(participantsPayload, { onConflict: "room_id,user_id" });

      if (participantsError) throw participantsError;
      return created;
  }

  async function getOrCreatePrivateRoomByName(targetName) {
      const { data: targetProfile, error: targetProfileError } = await supabase
          .from("profiles")
          .select("id, nome")
          .eq("nome", targetName)
          .limit(1)
          .maybeSingle();

      if (targetProfileError) throw targetProfileError;
      if (!targetProfile?.id) {
          throw new Error("Não encontrei o utilizador para iniciar chat privado.");
      }

      const { data: myParts, error: myPartsError } = await supabase
          .from("chat_participants")
          .select("room_id")
          .eq("user_id", user.id);

      if (myPartsError) throw myPartsError;
      const myRoomIds = (myParts || []).map((p) => p.room_id);

      if (myRoomIds.length) {
          const { data: targetParts, error: targetPartsError } = await supabase
              .from("chat_participants")
              .select("room_id")
              .eq("user_id", targetProfile.id)
              .in("room_id", myRoomIds);

          if (targetPartsError) throw targetPartsError;

          const commonRoomIds = (targetParts || []).map((p) => p.room_id);
          if (commonRoomIds.length) {
              const { data: existingRoom, error: existingRoomError } = await supabase
                  .from("chat_rooms")
                  .select("*")
                  .eq("is_group", false)
                  .in("id", commonRoomIds)
                  .limit(1)
                  .maybeSingle();

              if (existingRoomError) throw existingRoomError;
              if (existingRoom) return existingRoom;
          }
      }

      const { data: created, error: createError } = await supabase
          .from("chat_rooms")
          .insert([{ nome: null, is_group: false }])
          .select("*")
          .single();

      if (createError) throw createError;

      const { error: participantsError } = await supabase.from("chat_participants").upsert(
          [
              { room_id: created.id, user_id: user.id },
              { room_id: created.id, user_id: targetProfile.id },
          ],
          { onConflict: "room_id,user_id" }
      );

      if (participantsError) throw participantsError;
      return created;
  }

  async function openInternalChat(target) {
      if (!target) return;

      setChatModal({ show: true, target });
      setChatLoading(true);
      setChatError("");

      try {
          const isGroup = String(target.subtitle || "").toLowerCase().includes("group");
          const room = isGroup
              ? await getOrCreateGroupRoom(target.title)
              : await getOrCreatePrivateRoomByName(target.title);

          setActiveChatRoom(room);
          setChatRooms((prev) => {
              const others = prev.filter((r) => r.id !== room.id);
              return [room, ...others];
          });
          await loadChatMessages(room.id);
          await loadRoomReadReceipts(room.id);
          markRoomAsSeen(room.id);
      } catch (err) {
          setChatError(err?.message || "Não foi possível abrir o chat. Verifica se as tabelas de chat já existem.");
      } finally {
          setChatLoading(false);
      }
  }

  async function handleSendChatText(e) {
      e.preventDefault();
      const content = String(chatDraft || "").trim();
      if (!content || !activeChatRoom?.id) return;

      setChatSending(true);
      try {
          const { data, error } = await supabase
              .from("chat_messages")
              .insert([
                  {
                      room_id: activeChatRoom.id,
                      sender_id: user.id,
                      content,
                  },
              ])
              .select("*")
              .single();

          if (error) throw error;
          setChatDraft("");

          if (data) {
              setChatMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
          }

          emitTypingStatus(false);
      } catch (err) {
          setChatError(err?.message || "Erro ao enviar mensagem.");
      } finally {
          setChatSending(false);
      }
  }

    async function uploadChatFile(file) {
      if (!file || !activeChatRoom?.id) return;

      setChatUploadingFile(true);
      try {
          const fileExt = file.name.split(".").pop();
          const fileName = `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
          const filePath = `chat-files/${fileName}`;

          const { error: uploadError } = await supabase.storage
              .from("documents")
              .upload(filePath, file);

          if (uploadError) throw uploadError;

          const {
              data: { publicUrl },
          } = supabase.storage.from("documents").getPublicUrl(filePath);

          const { data, error } = await supabase
              .from("chat_messages")
              .insert([
                  {
                      room_id: activeChatRoom.id,
                      sender_id: user.id,
                      file_url: publicUrl,
                      file_name: file.name,
                  },
              ])
              .select("*")
              .single();

          if (error) throw error;
          if (data) {
              setChatMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
          }
      } catch (err) {
          setChatError(err?.message || "Erro no envio de ficheiro.");
      } finally {
          setChatUploadingFile(false);
      }
  }

  async function loadChatCollaborators() {
      try {
          const { data, error } = await supabase
              .from("profiles")
              .select("id, nome, avatar_url")
              .order("nome", { ascending: true });

          if (error) throw error;
          const others = (data || []).filter((profile) => profile.id !== user?.id);
          setChatCollaborators(others);
      } catch (err) {
          console.error("Erro ao carregar colaboradores:", err?.message);
      }
  }

  async function loadMyChatRooms() {
      if (!user?.id) {
          setChatRooms([]);
          return;
      }

      try {
          const { data: myParticipants, error: participantsError } = await supabase
              .from("chat_participants")
              .select("room_id")
              .eq("user_id", user.id);

          if (participantsError) throw participantsError;

          const roomIds = (myParticipants || []).map((row) => row.room_id);
          if (!roomIds.length) {
              setChatRooms([]);
              return;
          }

          const { data: rooms, error: roomsError } = await supabase
              .from("chat_rooms")
              .select("*")
              .in("id", roomIds)
              .order("created_at", { ascending: false });

          if (roomsError) throw roomsError;

          const { data: peerParticipants, error: peersError } = await supabase
              .from("chat_participants")
              .select("room_id, user_id, profiles(nome, avatar_url)")
              .in("room_id", roomIds)
              .neq("user_id", user.id);

          if (peersError) throw peersError;

          const peerByRoom = new Map();
          (peerParticipants || []).forEach((row) => {
              if (!peerByRoom.has(row.room_id)) {
                  peerByRoom.set(row.room_id, row);
              }
          });

          const normalizedRooms = (rooms || []).map((room) => {
              if (room.is_group) {
                  return {
                      ...room,
                      display_title: room.nome || "Grupo",
                      display_avatar_url: null,
                      display_subtitle: "Group Chat",
                  };
              }

              const peer = peerByRoom.get(room.id);
              const peerName = peer?.profiles?.nome || "Conversa privada";
              const peerAvatar = peer?.profiles?.avatar_url || null;

              return {
                  ...room,
                  display_title: peerName,
                  display_avatar_url: peerAvatar,
                  display_subtitle: "Chat",
              };
          });

          setChatRooms(normalizedRooms);
          setChatRlsNeedsFix(false);
          await refreshUnreadCounts(roomIds);
      } catch (err) {
          if (String(err?.message || "").includes("infinite recursion detected in policy for relation \"chat_participants\"")) {
              setChatRlsNeedsFix(true);
              setChatError("Falha de permissões no chat (RLS). Executa a migration 014_fix_chat_participants_rls_recursion.sql no Supabase.");
              return;
          }
          console.error("Erro ao carregar chats do utilizador:", err?.message);
      }
  }

  async function openExistingRoom(room) {
      if (!room?.id) return;

      const target = {
          id: room.id,
          title: room.display_title || room.nome || "Conversa privada",
          subtitle: room.display_subtitle || (room.is_group ? "Group Chat" : "Chat"),
          avatar_url: room.display_avatar_url || null,
      };

      setChatModal({ show: true, target });
      setChatLoading(true);
      setChatError("");

      try {
          setActiveChatRoom(room);
          await loadChatMessages(room.id);
          await loadRoomReadReceipts(room.id);
          markRoomAsSeen(room.id);
      } catch (err) {
          setChatError(err?.message || "Não foi possível abrir o chat.");
      } finally {
          setChatLoading(false);
      }
  }

  useEffect(() => {
      if (!chatModal.show || !activeChatRoom?.id) return;

      const intervalId = setInterval(() => {
          syncActiveChatMessages(activeChatRoom.id);
      }, 1200);

      return () => {
          clearInterval(intervalId);
      };
  }, [chatModal.show, activeChatRoom?.id]);

  function closeNewChatModal() {
      setShowNewChatModal(false);
      setNewChatName("");
      setNewChatType("private");
      setSelectedUserForChat(null);
      setSelectedUsersForGroupChat([]);
  }

  function closeAddGroupMembersModal() {
      setShowAddGroupMembersModal(false);
      setExistingGroupMemberIds([]);
      setSelectedUsersToAddInGroup([]);
  }

  function toggleUserToAddInGroup(userId) {
      setSelectedUsersToAddInGroup((prev) =>
          prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
  }

  async function openAddGroupMembersModal() {
      if (!activeChatRoom?.id || !activeChatRoom?.is_group) return;

      try {
          const { data, error } = await supabase
              .from("chat_participants")
              .select("user_id")
              .eq("room_id", activeChatRoom.id);

          if (error) throw error;

          setExistingGroupMemberIds((data || []).map((row) => row.user_id));
          setSelectedUsersToAddInGroup([]);
          setShowAddGroupMembersModal(true);
      } catch (err) {
          setChatError(err?.message || "Não foi possível carregar os membros atuais do grupo.");
      }
  }

  async function addSelectedUsersToGroup() {
      if (!activeChatRoom?.id || !activeChatRoom?.is_group) return;
      if (!selectedUsersToAddInGroup.length) {
          setChatError("Seleciona pelo menos 1 colaborador para adicionar.");
          return;
      }

      setAddingGroupMembers(true);
      try {
          const payload = selectedUsersToAddInGroup.map((userId) => ({
              room_id: activeChatRoom.id,
              user_id: userId,
          }));

          const { error } = await supabase
              .from("chat_participants")
              .upsert(payload, { onConflict: "room_id,user_id" });

          if (error) throw error;

          closeAddGroupMembersModal();
          showToast("Membros adicionados ao grupo.", "success");
          if (!chatRlsNeedsFix) {
              await loadMyChatRooms();
          }
      } catch (err) {
          setChatError(err?.message || "Não foi possível adicionar membros ao grupo.");
      } finally {
          setAddingGroupMembers(false);
      }
  }

  function toggleGroupParticipant(userId) {
      setSelectedUsersForGroupChat((prev) =>
          prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
      );
  }

  async function createNewChat() {
      if (!user?.id) return;

      setNewChatLoading(true);
      try {
          if (newChatType === "group") {
              if (!newChatName.trim()) {
                  setChatError("Por favor, insira um nome para o grupo.");
                  return;
              }
              if (!selectedUsersForGroupChat.length) {
                  setChatError("Seleciona pelo menos 1 colaborador para o grupo.");
                  return;
              }
              const room = await createGroupRoomWithParticipants(newChatName.trim(), selectedUsersForGroupChat);
              closeNewChatModal();
              await openExistingRoom({
                  ...room,
                  display_title: room.nome || "Grupo",
                  display_subtitle: "Group Chat",
                  display_avatar_url: null,
              });
          } else {
              if (!selectedUserForChat?.nome) {
                  setChatError("Por favor, selecione um utilizador.");
                  return;
              }
              const room = await getOrCreatePrivateRoomByName(selectedUserForChat.nome);
              closeNewChatModal();
              await openInternalChat({ title: selectedUserForChat.nome, subtitle: "Chat", avatar_url: selectedUserForChat.avatar_url });
          }
      } catch (err) {
          setChatError(err?.message || "Erro ao criar chat.");
      } finally {
          if (!chatRlsNeedsFix) {
              await loadMyChatRooms();
          }
          setNewChatLoading(false);
      }
  }

  async function handleReact(type, postId, currentReactions) {
      const myExistingReaction = currentReactions.find(r => r.user_id === user.id);
      
      let newReactions = [...currentReactions];

      if (myExistingReaction && myExistingReaction.reaction_type === type) {
          newReactions = newReactions.filter(r => r.id !== myExistingReaction.id);
          supabase.from("forum_reactions").delete().eq("id", myExistingReaction.id).then(() => fetchPosts(false));
      } else {
          const tempId = Date.now();
          if (myExistingReaction) {
              newReactions = newReactions.map(r => r.id === myExistingReaction.id ? { ...r, reaction_type: type } : r);
          } else {
              newReactions.push({ id: tempId, post_id: postId, user_id: user.id, reaction_type: type });
          }
          supabase.from("forum_reactions").upsert({ 
              post_id: postId, user_id: user.id, reaction_type: type 
          }, { onConflict: 'post_id, user_id' }).then(() => fetchPosts(false));
      }
      
      setPosts(posts.map(p => p.id === postId ? { ...p, forum_reactions: newReactions } : p));
      
      if (selectedPost && selectedPost.id === postId) {
          setSelectedPost({ ...selectedPost, forum_reactions: newReactions });
      }
  }

  const getReactionCounts = (currentReactions) => {
      const counts = {};
      if(currentReactions) {
          currentReactions.forEach(r => {
              counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
          });
      }
      return counts;
  };

  const getCategoryBadge = (cat) => {
      const configs = { 
          aviso: { bg: '#fee2e2', text: '#ef4444', label: 'Aviso' },
          duvida: { bg: '#fefce8', text: '#eab308', label: 'Dúvida' },
          ideia: { bg: '#f0fdf4', text: '#22c55e', label: 'Ideia' },
          geral: { bg: '#f1f5f9', text: '#64748b', label: 'Geral' }
      };
      const config = configs[cat] || configs.geral;
      
      return (
          <span style={{
              backgroundColor: config.bg, color: config.text, padding: '4px 8px', borderRadius: '6px', 
              fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
              {config.label}
          </span>
      );
  };

  const formatDate = (dateString) => {
      const date = new Date(dateString);
      const hoje = new Date();
      const isHoje = date.getDate() === hoje.getDate() && date.getMonth() === hoje.getMonth() && date.getFullYear() === hoje.getFullYear();
      
      if (isHoje) return `Hoje às ${date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
      return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) => {
      if (!name) return "?";
      const parts = name.split(" ");
      if (parts.length > 1) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
  };

  const renderAvatar = (name, avatarUrl, size = 40, fontSize = "1rem") => {
      if (avatarUrl) {
          return (
              <img
                  src={avatarUrl}
                  alt={name || "Avatar"}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block", borderRadius: "50%" }}
              />
          );
      }

      return (
          <span style={{ fontWeight: "bold", fontSize }}>
              {getInitials(name)}
          </span>
      );
  };

  const getChatSenderDisplayName = (senderId) => {
      if (!senderId) return "Utilizador";
      if (senderId === user?.id) return userProfile?.nome || "Tu";

      const collaborator = chatCollaborators.find((profile) => profile.id === senderId);
      return collaborator?.nome || "Utilizador";
  };

  const renderWithLinks = (text) => {
      if (!text) return text;
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = text.split(urlRegex);

      return parts.map((part, i) => {
          if (part.match(urlRegex)) {
              return (
                  <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-btnPrimary)', textDecoration: 'underline', wordBreak: 'break-all' }} onClick={(e) => e.stopPropagation()}>
                      {part}
                  </a>
              );
          }
          return part;
      });
  };

  const addTextBlock = () => {
      setPostBlocks((prev) => [...prev, createTextBlock("")]);
  };

  const addImageBlock = () => {
      setPostBlocks((prev) => [...prev, createImageBlock("lg")]);
  };

  const updateTextBlock = (blockId, value) => {
      setPostBlocks((prev) => prev.map((block) => (block.id === blockId ? { ...block, text: value } : block)));
  };

  const updateTextBlockAlignment = (blockId, align) => {
      setPostBlocks((prev) => prev.map((block) => (block.id === blockId ? { ...block, align } : block)));
  };

  const updateImageBlockFile = (blockId, file) => {
      if (!file) return;
      const previewUrl = URL.createObjectURL(file);
      setPostBlocks((prev) =>
          prev.map((block) => (block.id === blockId ? { ...block, file, previewUrl, uploadedUrl: "" } : block))
      );
  };

  const updateImageBlockSize = (blockId, size) => {
      setPostBlocks((prev) => prev.map((block) => (block.id === blockId ? { ...block, size } : block)));
  };

  const handleComposerPaste = (event) => {
      const items = Array.from(event.clipboardData?.items || []);
      const imageFiles = items
          .filter((item) => item.type && item.type.startsWith("image/"))
          .map((item) => item.getAsFile())
          .filter(Boolean);

      if (!imageFiles.length) return;

      event.preventDefault();
      setPostBlocks((prev) => {
          const appended = imageFiles.map((file) => {
              const img = createImageBlock();
              img.file = file;
              img.previewUrl = URL.createObjectURL(file);
              return img;
          });
          return [...prev, ...appended];
      });

      showToast(`${imageFiles.length} imagem(ns) colada(s) no post.`, "success");
  };

  const handleComposerDrop = (event) => {
      const imageFiles = Array.from(event.dataTransfer?.files || []).filter((file) => file.type && file.type.startsWith("image/"));

      if (!imageFiles.length) return;

      event.preventDefault();
      setPostBlocks((prev) => {
          const appended = imageFiles.map((file) => {
              const img = createImageBlock("lg");
              img.file = file;
              img.previewUrl = URL.createObjectURL(file);
              return img;
          });
          return [...prev, ...appended];
      });

      showToast(`${imageFiles.length} imagem(ns) adicionada(s) por drag & drop.`, "success");
  };

  const moveBlock = (index, direction) => {
      const nextIndex = index + direction;
      setPostBlocks((prev) => {
          if (nextIndex < 0 || nextIndex >= prev.length) return prev;
          const next = [...prev];
          const [item] = next.splice(index, 1);
          next.splice(nextIndex, 0, item);
          return next;
      });
  };

  const reorderBlock = (fromIndex, toIndex) => {
      if (fromIndex === null || toIndex === null || fromIndex === toIndex) return;

      setPostBlocks((prev) => {
          if (fromIndex < 0 || fromIndex >= prev.length) return prev;
          if (toIndex < 0 || toIndex >= prev.length) return prev;

          const next = [...prev];
          const [item] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, item);
          return next;
      });
  };

  const handleBlockDragStart = (index) => {
      setDraggedBlockIndex(index);
      setDragOverBlockIndex(index);
  };

  const handleBlockDragOver = (event, index) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (dragOverBlockIndex !== index) setDragOverBlockIndex(index);
  };

  const handleBlockDrop = (event, index) => {
      event.preventDefault();
      reorderBlock(draggedBlockIndex, index);
      setDraggedBlockIndex(null);
      setDragOverBlockIndex(null);
  };

  const handleBlockDragEnd = () => {
      setDraggedBlockIndex(null);
      setDragOverBlockIndex(null);
  };

  const removeBlock = (index) => {
      setPostBlocks((prev) => {
          const next = prev.filter((_, i) => i !== index);
          return next.length ? next : [createTextBlock("")];
      });
  };

  const renderPostBlocks = (post, options = {}) => {
      const blocks = parsePostBlocks(post);
      const imageMaxHeight = options.imageMaxHeight || 350;
      return (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {blocks.map((block, idx) => {
                  if (block.type === "image") {
                      const imageUrl = block.previewUrl || block.uploadedUrl;
                      if (!imageUrl) return null;
                      const sizeConfig = getImageSizeConfig(block.size);

                      return (
                          <div key={`img_${idx}`} style={{ borderRadius: "12px", overflow: "hidden", background: "transparent", display: "flex", justifyContent: "center", padding: "0", width: "100%", maxWidth: sizeConfig.maxWidth, alignSelf: "center" }}>
                              <img src={imageUrl} alt="Anexo da publicação" style={{ width: "100%", maxHeight: `${imageMaxHeight}px`, objectFit: "contain", display: "block", borderRadius: sizeConfig.value === "full" ? "0" : "8px" }} loading="lazy" />
                          </div>
                      );
                  }

                  if (!String(block.text || "").trim()) return null;
                  return (
                      <div key={`txt_${idx}`} style={{ fontSize: "0.95rem", color: "#334155", lineHeight: "1.6", whiteSpace: "pre-wrap", overflowWrap: "break-word", textAlign: block.align || "left" }}>
                          {renderWithLinks(block.text)}
                      </div>
                  );
              })}
          </div>
      );
  };

  const inputStyle = { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', color: '#1e293b', outline: 'none', boxSizing: 'border-box', marginBottom: '15px', transition: '0.2s' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const actionBtnStyle = { background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, transition: '0.2s' };

  const displayedPosts = selectedUserFilter ? posts.filter(p => p.user_id === selectedUserFilter.id) : posts;
    const totalUnreadChats = Object.values(unreadByRoom).reduce((acc, value) => acc + Number(value || 0), 0);

    return (
        <div className="page-container" style={{maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px'}}>

          <div className="card" style={{ marginBottom: 25, padding: '25px', display: "flex", justifyContent: "space-between", alignItems: 'center', flexWrap: 'wrap', gap: '15px', background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                <div style={{background: 'var(--color-bgSecondary)', color: 'var(--color-btnPrimary)', padding: '12px', borderRadius: '12px', display: 'flex'}}><Icons.Message size={24} /></div>
                <div>
                    <h1 style={{margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.02em'}}>Comunicacao Interna</h1>
                    <p style={{color: '#64748b', margin: 0, fontWeight: '500', fontSize: '0.9rem'}}>Forum de partilha de informacoes e discussoes</p>
                </div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                {activeLog && (
                    <div onClick={() => navigate(activeLogRoute || '/dashboard/tarefas')} title="Ir para o item com cronometro em curso" className="hover-shadow" style={{background: 'linear-gradient(to right, #ef4444, #b91c1c)', color: 'white', padding: '10px 20px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '15px', border: '2px solid #fecaca', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)', transition: '0.2s', whiteSpace: 'nowrap', cursor: 'pointer'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '0.95rem'}}>
                            <span className="pulse-dot-white" style={{width: '8px', height: '8px'}}></span>
                            {(activeLogTitle || 'Tempo a decorrer...').length > 30 ? `${(activeLogTitle || 'Tempo a decorrer...').slice(0, 30)}...` : (activeLogTitle || 'Tempo a decorrer...')}
                        </div>
                        <div style={{width: '1px', height: '20px', background: 'rgba(255,255,255,0.3)'}}></div>
                        <button type="button" onClick={openStopNoteModal} style={{background: 'white', color:'#ef4444', border:'none', borderRadius:'20px', padding:'6px 12px', cursor:'pointer', fontWeight:'700', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', transition: '0.2s'}}><Icons.Stop /> Parar</button>
                    </div>
                )}
            </div>
          </div>

          {selectedUserFilter && (
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-bgSecondary)', padding: '15px 20px', borderRadius: '12px', border: '1px solid var(--color-borderColor)', marginBottom: '25px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <Icons.User color="var(--color-btnPrimary)" />
                     <span style={{ color: 'var(--color-btnPrimaryHover)', fontWeight: 'bold', fontSize: '1.1rem' }}>A ver o perfil de: {selectedUserFilter.nome}</span>
                 </div>
                 <button onClick={() => setSelectedUserFilter(null)} style={{ background: 'white', border: '1px solid var(--color-borderColor)', color: 'var(--color-btnPrimary)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }} className="hover-shadow">Ver Tudo</button>
             </div>
          )}

          <div className="card forum-collab-bar" style={{background: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
              <div style={{display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap'}}>
                  <div style={{display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0}}>
                      <div style={{width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                          {renderAvatar(userProfile?.nome, userProfile?.avatar_url, 44, '1rem')}
                      </div>
                      <div style={{minWidth: 0}}>
                          <div style={{fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.05em'}}>Colaborador</div>
                          <div style={{fontSize: '1.02rem', color: '#1e293b', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{userProfile?.nome || 'Utilizador'}</div>
                      </div>
                  </div>

                  <button className="btn-cta" onClick={openNewPostModal} style={{ marginRight: '6px' }}><Icons.Plus /> Novo Post</button>
              </div>
          </div>

      {/* --- FEED DE PUBLICAÇÕES + CHAT LATERAL --- */}
      <div className="forum-main-layout">
      <div className="forum-feed" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        {displayedPosts.length === 0 && !loading && (
            <div style={{textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1'}}>
                <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px', color: '#cbd5e1'}}><Icons.Message size={48} /></div>
                <h4 style={{color: '#1e293b', margin: '0 0 5px 0', fontSize:'1.2rem'}}>Ainda não há publicações.</h4>
                <p style={{color:'#64748b'}}>Sê o primeiro a partilhar algo!</p>
            </div>
        )}
        
        {displayedPosts.map((post) => {
            const postComments = postCommentsByPost[post.id] || [];
            const commentsLoaded = Boolean(postCommentsByPost[post.id]);
            const showCommentBox = Boolean(inlineCommentOpen[post.id]);
            const showAllComments = Boolean(inlineCommentExpanded[post.id]);
            const visibleComments = showAllComments ? postComments : postComments.slice(0, 3);

            return (
            <div key={post.id} className="card" style={{ display: 'flex', flexDirection: 'column', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                
                {/* CABEÇALHO DO POST */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px'}}>
                    <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                        <div 
                            onClick={(e) => { e.stopPropagation(); setSelectedUserFilter({ id: post.user_id, nome: post.profiles?.nome }); }}
                            style={{width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', border: '1px solid #cbd5e1', cursor: 'pointer'}} 
                            className="hover-avatar"
                            title={`Ver publicações de ${post.profiles?.nome}`}
                        >
                            {renderAvatar(post.profiles?.nome, post.profiles?.avatar_url, 40, '0.95rem')}
                        </div>
                        <div>
                            <div style={{fontWeight: '800', color: '#1e293b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <span onClick={(e) => { e.stopPropagation(); setSelectedUserFilter({ id: post.user_id, nome: post.profiles?.nome }); }} className="hover-name" style={{cursor: 'pointer'}}>{post.profiles?.nome}</span>
                                {getCategoryBadge(post.categoria)}
                            </div>
                            <div style={{fontSize: '0.75rem', color: '#94a3b8', fontWeight: '500', marginTop: '2px'}}>{formatDate(post.created_at)}</div>
                        </div>
                    </div>
                    
                    {canDelete(post.user_id) && (
                        <button onClick={(e) => { e.stopPropagation(); requestDelete(post.id, 'post'); }} style={actionBtnStyle} className="hover-red-btn" title="Apagar Publicação">
                            <Icons.Trash />
                        </button>
                    )}
                </div>
                
                {/* CORPO DO POST */}
                <div style={{marginBottom: '15px'}}>
                    <h3 style={{margin: '0 0 10px 0', color: '#0f172a', fontSize: '1.2rem', fontWeight: '800'}}>{post.titulo}</h3>
                    {renderPostBlocks(post, { imageMaxHeight: 560 })}
                </div>

                {/* RODAPÉ DO POST */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '15px', color: '#64748b', fontSize: '0.85rem', fontWeight: '600'}}>
                    <div style={{display: 'flex', gap: '8px'}}>
                        {['👍','❤️','💡','🚀'].map(emoji => {
                            const count = getReactionCounts(post.forum_reactions)[emoji] || 0;
                            const hasReacted = post.forum_reactions?.find(r => r.user_id === user.id && r.reaction_type === emoji);
                            
                            if (count === 0 && emoji !== '❤️') return null;

                            return (
                                <button 
                                    key={emoji} 
                                    onClick={(e) => { e.stopPropagation(); handleReact(emoji, post.id, post.forum_reactions); }} 
                                    style={{
                                        background: hasReacted ? 'var(--color-bgSecondary)' : 'transparent', color: hasReacted ? 'var(--color-btnPrimary)' : '#64748b',
                                        border: hasReacted ? '1px solid var(--color-borderColor)' : '1px solid transparent', borderRadius: '20px', padding: '6px 12px', cursor: 'pointer', transition: '0.2s',
                                        display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold'
                                    }}
                                    className="hover-bg-light"
                                >
                                    <span style={{fontSize: '1.1rem'}}>{emoji}</span> {count > 0 ? count : 'Gostar'}
                                </button>
                            );
                        })}
                    </div>
                    
                    <button onClick={() => toggleInlineComments(post.id)} style={{background: 'transparent', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px'}} className="hover-bg-light">
                        <Icons.Message size={14} /> {post.forum_comments?.[0]?.count || 0} Comentários
                    </button>
                </div>

                {showCommentBox && (
                    <div style={{ marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                        {loadingInlineComments[post.id] && (
                            <div style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '8px' }}>A carregar comentários...</div>
                        )}

                        {!loadingInlineComments[post.id] && commentsLoaded && postComments.length === 0 && (
                            <div style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '10px' }}>Ainda sem comentários neste post.</div>
                        )}

                        {!loadingInlineComments[post.id] && visibleComments.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                                {visibleComments.map((c) => (
                                    <div key={c.id} className="comment-bubble-row">
                                        <div className="comment-avatar-mini" style={{overflow:'hidden'}}>{renderAvatar(c.profiles?.nome, c.profiles?.avatar_url, 28, '0.68rem')}</div>
                                        <div className="comment-bubble">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: '800' }}>
                                                    {c.profiles?.nome} <span style={{ color: '#94a3b8', fontWeight: '600' }}>· {formatDate(c.created_at)}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <button
                                                        onClick={() => setReplyTargetByPost((prev) => ({ ...prev, [post.id]: { id: c.id, nome: c.profiles?.nome || 'Utilizador' } }))}
                                                        style={{ background: 'transparent', border: 'none', color: 'var(--color-btnPrimary)', fontWeight: '700', cursor: 'pointer', fontSize: '0.78rem' }}
                                                    >
                                                        Responder
                                                    </button>
                                                    {canDelete(c.user_id) && (
                                                        <button onClick={() => requestDelete(c.id, 'comment', post.id)} style={actionBtnStyle} className="hover-red-btn" title="Apagar Comentário">
                                                            <Icons.Trash size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: '#475569', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
                                                {renderWithLinks(c.conteudo)}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {postComments.length > 3 && (
                                    <button
                                        onClick={() => setInlineCommentExpanded((prev) => ({ ...prev, [post.id]: !showAllComments }))}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--color-btnPrimary)', fontWeight: '700', cursor: 'pointer', textAlign: 'left', padding: '2px 0' }}
                                    >
                                        {showAllComments ? 'Mostrar menos comentários' : `Ver mais ${postComments.length - 3} comentário(s)`}
                                    </button>
                                )}
                            </div>
                        )}

                        {replyTargetByPost[post.id]?.nome && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px', padding: '6px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', color: '#1e3a8a', fontSize: '0.82rem' }}>
                                <span>A responder a <strong>{replyTargetByPost[post.id].nome}</strong></span>
                                <button onClick={() => setReplyTargetByPost((prev) => ({ ...prev, [post.id]: null }))} style={{ background: 'transparent', border: 'none', color: '#1e3a8a', cursor: 'pointer', fontWeight: '700' }}>Cancelar</button>
                            </div>
                        )}

                        <form onSubmit={(e) => handleSendInlineComment(e, post.id)} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', flexShrink: 0, overflow:'hidden', border:'1px solid #cbd5e1' }}>
                                {renderAvatar(userProfile?.nome, userProfile?.avatar_url, 30, '0.75rem')}
                            </div>
                            <input
                                type="text"
                                value={inlineCommentDrafts[post.id] || ''}
                                onChange={(e) => setInlineCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                                placeholder={replyTargetByPost[post.id]?.nome ? `Responder a ${replyTargetByPost[post.id].nome}...` : 'Escreve um comentário...'}
                                className="input-focus"
                                style={{ flex: 1, padding: '10px 14px', borderRadius: '999px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}
                            />
                            <button
                                type="submit"
                                disabled={!String(inlineCommentDrafts[post.id] || '').trim()}
                                className="btn-primary"
                                style={{ borderRadius: '999px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '5px', opacity: String(inlineCommentDrafts[post.id] || '').trim() ? 1 : 0.6 }}
                            >
                                <Icons.Send size={14} />
                            </button>
                        </form>
                    </div>
                )}
            </div>
            );
        })}
      </div>

      <aside className="forum-chat-sidebar card" style={{ position: 'sticky', top: '24px', alignSelf: 'start', padding: '18px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
              <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: '900' }}>Chats Internos</h4>
              {totalUnreadChats > 0 && (
                  <span style={{padding:'4px 10px', borderRadius:'999px', fontSize:'0.72rem', fontWeight:'900', color:'#fff', background:'linear-gradient(135deg, #ef4444, #f97316)', boxShadow:'0 6px 14px rgba(239,68,68,0.35)'}}>
                      {totalUnreadChats} nova(s)
                  </span>
              )}
          </div>

          {totalUnreadChats > 0 && (
              <div style={{marginBottom:'12px', padding:'10px 12px', borderRadius:'10px', border:'1px solid #fecaca', background:'linear-gradient(135deg, #fff1f2, #fff7ed)', color:'#9f1239', fontSize:'0.82rem', fontWeight:'700'}}>
                  Tens {totalUnreadChats} mensagem(ns) nova(s) por ler.
              </div>
          )}
          
          <button
              onClick={() => setShowNewChatModal(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '12px', border: '1px solid #d1d5db', borderRadius: '10px', background: 'var(--color-btnPrimary)', color: '#fff', padding: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', transition: '0.2s' }}
              className="hover-shadow"
          >
              <Icons.Plus size={16} /> Novo Chat
          </button>

          <p style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '0.84rem' }}>Meus Chats</p>

          {chatRooms.length > 0 ? (
              chatRooms.map((room) => {
                  const unreadCount = unreadByRoom[room.id] || 0;
                  return (
                      <button
                          key={room.id}
                          onClick={() => openExistingRoom(room)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', marginBottom: '8px', border: unreadCount ? '1px solid #fca5a5' : '1px solid #e2e8f0', borderRadius: '10px', background: activeChatRoom?.id === room.id ? '#eff6ff' : '#fff', padding: '10px', cursor: 'pointer', transition: '0.2s', boxShadow: unreadCount ? '0 6px 16px rgba(239,68,68,0.12)' : 'none' }}
                          className="hover-shadow"
                      >
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--color-bgSecondary)', color: 'var(--color-btnPrimary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', overflow:'hidden' }}>
                              {renderAvatar(room.display_title || room.nome || 'Conversa privada', room.display_avatar_url || null, 34, '0.78rem')}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ color: '#1e293b', fontWeight: '800', fontSize: '0.9rem', display:'flex', alignItems:'center', gap:'8px' }}>
                                  <span style={{minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{room.display_title || room.nome || 'Conversa privada'}</span>
                                  {unreadCount > 0 && <span style={{width:'8px', height:'8px', borderRadius:'999px', background:'#ef4444', boxShadow:'0 0 0 4px rgba(239,68,68,0.2)', flexShrink:0}}></span>}
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: '0.78rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
                                  <span>{room.display_subtitle || (room.is_group ? 'Group Chat' : 'Chat')}</span>
                                  {unreadCount > 0 && <span style={{padding:'2px 7px', borderRadius:'999px', fontSize:'0.7rem', fontWeight:'900', color:'#fff', background:'#ef4444'}}>{unreadCount}</span>}
                              </div>
                          </div>
                      </button>
                  );
              })
          ) : (
              <p style={{ margin: '8px 0', color: '#94a3b8', fontSize: '0.85rem' }}>Ainda não criaste chats.</p>
          )}
      </aside>
      </div>

      {/* --- MODAL NOVO CHAT --- */}
      {showNewChatModal && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(5px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000001, padding:'16px'}}>
                  <div style={{background:'white', width:'min(480px, 95vw)', borderRadius:'18px', boxShadow: '0 30px 60px -20px rgba(15, 23, 42, 0.45)', overflow: 'hidden', border:'1px solid var(--color-borderColorLight)'}}>
                      <div style={{padding:'18px 24px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <div>
                              <p style={{margin:'0 0 4px 0', fontSize:'0.72rem', fontWeight:'800', letterSpacing:'0.07em', color:'var(--color-btnPrimary)', textTransform:'uppercase'}}>Novo Chat</p>
                              <h3 style={{margin:0, color:'#1e293b', fontSize:'1.25rem', fontWeight:'900'}}>Criar Conversa</h3>
                          </div>
                          <button onClick={closeNewChatModal} style={{background:'#fff', border:'1px solid #cbd5e1', cursor:'pointer', color:'#64748b', width:'36px', height:'36px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center'}} className="hover-red-text"><Icons.Close size={20} /></button>
                      </div>

                      <div style={{padding:'24px'}}>
                          {chatError && (
                              <div style={{padding:'12px', background:'#fee2e2', border:'1px solid #fecaca', borderRadius:'8px', color:'#991b1b', marginBottom:'16px', fontSize:'0.9rem'}}>
                                  {chatError}
                              </div>
                          )}

                          <div style={{marginBottom:'20px'}}>
                              <label style={{display:'block', marginBottom:'10px', fontSize:'0.85rem', fontWeight:'700', color:'#1e293b', textTransform:'uppercase', letterSpacing:'0.05em'}}>Tipo de Chat</label>
                              <div style={{display:'flex', gap:'12px'}}>
                                  <button
                                      type="button"
                                      onClick={() => {
                                          setNewChatType('private');
                                          setSelectedUsersForGroupChat([]);
                                      }}
                                      style={{
                                          flex:1,
                                          padding:'12px',
                                          border:'1px solid #cbd5e1',
                                          borderRadius:'10px',
                                          background: newChatType === 'private' ? '#e0e7ff' : '#fff',
                                          color:'#1e293b',
                                          fontWeight:'800',
                                          cursor:'pointer',
                                          transition:'0.2s'
                                      }}
                                  >
                                      Chat Privado
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => {
                                          setNewChatType('group');
                                          setSelectedUserForChat(null);
                                      }}
                                      style={{
                                          flex:1,
                                          padding:'12px',
                                          border:'1px solid #cbd5e1',
                                          borderRadius:'10px',
                                          background: newChatType === 'group' ? '#e0e7ff' : '#fff',
                                          color:'#1e293b',
                                          fontWeight:'800',
                                          cursor:'pointer',
                                          transition:'0.2s'
                                      }}
                                  >
                                      Grupo
                                  </button>
                              </div>
                          </div>

                          {newChatType === 'group' ? (
                              <div style={{marginBottom:'20px', display:'grid', gap:'14px'}}>
                                  <label style={{display:'block', marginBottom:'8px', fontSize:'0.85rem', fontWeight:'700', color:'#1e293b', textTransform:'uppercase', letterSpacing:'0.05em'}}>Nome do Grupo</label>
                                  <input
                                      type="text"
                                      value={newChatName}
                                      onChange={(e) => setNewChatName(e.target.value)}
                                      placeholder="Ex: Equipa de Vendas"
                                      style={{width:'100%', padding:'12px 15px', borderRadius:'8px', border:'1px solid #cbd5e1', background:'#fff', fontSize:'0.95rem', color:'#1e293b', outline:'none', boxSizing:'border-box'}}
                                  />

                                  <div>
                                      <label style={{display:'block', marginBottom:'8px', fontSize:'0.85rem', fontWeight:'700', color:'#1e293b', textTransform:'uppercase', letterSpacing:'0.05em'}}>
                                          Membros do Grupo ({selectedUsersForGroupChat.length} selecionado(s))
                                      </label>
                                      <div style={{maxHeight:'220px', overflowY:'auto', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'8px', display:'grid', gap:'8px', background:'#fff'}}>
                                          {chatCollaborators.length === 0 && (
                                              <div style={{fontSize:'0.85rem', color:'#94a3b8', padding:'8px'}}>Sem colaboradores disponíveis.</div>
                                          )}
                                          {chatCollaborators.map((collab) => {
                                              const selected = selectedUsersForGroupChat.includes(collab.id);
                                              return (
                                                  <button
                                                      key={collab.id}
                                                      type="button"
                                                      onClick={() => toggleGroupParticipant(collab.id)}
                                                      style={{
                                                          width:'100%',
                                                          display:'flex',
                                                          alignItems:'center',
                                                          justifyContent:'space-between',
                                                          gap:'10px',
                                                          border: selected ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                                                          borderRadius:'8px',
                                                          padding:'10px',
                                                          background: selected ? '#eff6ff' : '#fff',
                                                          cursor:'pointer',
                                                          textAlign:'left'
                                                      }}
                                                  >
                                                      <span style={{fontWeight:'700', color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{collab.nome}</span>
                                                      <span style={{fontSize:'0.75rem', fontWeight:'800', color: selected ? '#1d4ed8' : '#94a3b8'}}>{selected ? 'Selecionado' : 'Selecionar'}</span>
                                                  </button>
                                              );
                                          })}
                                      </div>
                                  </div>
                              </div>
                          ) : (
                              <div style={{marginBottom:'20px'}}>
                                  <label style={{display:'block', marginBottom:'8px', fontSize:'0.85rem', fontWeight:'700', color:'#1e293b', textTransform:'uppercase', letterSpacing:'0.05em'}}>Selecionar Utilizador</label>
                                  <select
                                      value={selectedUserForChat?.id || ''}
                                      onChange={(e) => {
                                          const user = chatCollaborators.find(u => u.id === e.target.value);
                                          setSelectedUserForChat(user);
                                      }}
                                      style={{width:'100%', padding:'12px 15px', borderRadius:'8px', border:'1px solid #cbd5e1', background:'#fff', fontSize:'0.95rem', color:'#1e293b', outline:'none', boxSizing:'border-box'}}
                                  >
                                      <option value="">-- Escolha um utilizador --</option>
                                      {chatCollaborators.map(collab => (
                                          <option key={collab.id} value={collab.id}>{collab.nome}</option>
                                      ))}
                                  </select>
                              </div>
                          )}

                          <div style={{display:'flex', gap:'12px', marginTop:'24px'}}>
                              <button
                                  onClick={closeNewChatModal}
                                  style={{flex:1, padding:'12px 20px', borderRadius:'8px', border:'1px solid #cbd5e1', background:'#fff', color:'#1e293b', fontWeight:'700', cursor:'pointer', transition:'0.2s'}}
                                  className="hover-shadow"
                              >
                                  Cancelar
                              </button>
                              <button
                                  onClick={createNewChat}
                                  disabled={newChatLoading || (newChatType === 'group' && !newChatName.trim()) || (newChatType === 'private' && !selectedUserForChat)}
                                  style={{flex:1, padding:'12px 20px', borderRadius:'8px', border:'none', background:'var(--color-btnPrimary)', color:'#fff', fontWeight:'700', cursor: newChatLoading || (newChatType === 'group' && !newChatName.trim()) || (newChatType === 'private' && !selectedUserForChat) ? 'not-allowed' : 'pointer', opacity: newChatLoading || (newChatType === 'group' && !newChatName.trim()) || (newChatType === 'private' && !selectedUserForChat) ? 0.6 : 1, transition:'0.2s'}}
                                  className="hover-shadow"
                              >
                                  {newChatLoading ? 'Criando...' : 'Criar Chat'}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* --- MODAL NOVO POST --- */}
      {showNewPostModal && (
        <ModalPortal>
            <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(5px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999, padding:'16px'}}>
                <div style={{background:'white', width:'min(1220px, 98vw)', height:'88vh', borderRadius:'18px', boxShadow: '0 30px 60px -20px rgba(15, 23, 42, 0.45)', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out', display:'flex', flexDirection:'column', border:'1px solid var(--color-borderColorLight)'}}>
                    <div style={{padding:'18px 24px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div>
                            <p style={{margin:'0 0 4px 0', fontSize:'0.72rem', fontWeight:'800', letterSpacing:'0.07em', color:'var(--color-btnPrimary)', textTransform:'uppercase'}}>Novo Conteudo</p>
                            <h3 style={{margin:0, color:'#1e293b', fontSize:'1.35rem', fontWeight:'900', display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <span style={{color: 'var(--color-btnPrimary)'}}><Icons.Edit size={22} /></span> Compositor de Publicação
                            </h3>
                        </div>
                        <button onClick={closeNewPostModal} style={{background:'#fff', border:'1px solid #cbd5e1', cursor:'pointer', color:'#64748b', width:'36px', height:'36px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center'}} className="hover-red-text"><Icons.Close size={20} /></button>
                    </div>

                    <form onSubmit={handleCreatePost} onPaste={handleComposerPaste} style={{display:'grid', gridTemplateColumns:'280px 1fr', flex:1, minHeight:0}}>
                        <aside style={{borderRight:'1px solid #e2e8f0', background:'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)', padding:'20px 16px', overflowY:'auto'}}>
                            <div style={{border:'1px solid var(--color-borderColorLight)', borderRadius:'12px', background:'var(--color-bgSecondary)', padding:'12px', marginBottom:'14px'}}>
                                <p style={{margin:'0 0 6px 0', fontSize:'0.72rem', fontWeight:'800', letterSpacing:'0.06em', color:'var(--color-btnPrimaryDark)', textTransform:'uppercase'}}>Guia Rapido</p>
                                <div style={{fontSize:'0.85rem', color:'var(--color-btnPrimaryDark)', lineHeight:'1.45'}}>
                                    1. Define titulo e categoria.
                                    <br />2. Adiciona blocos de texto e imagem.
                                    <br />3. Podes colar imagem com CTRL+V.
                                </div>
                            </div>

                            <div style={{display:'grid', gap:'8px', marginBottom:'14px'}}>
                                <button type="button" onClick={addTextBlock} style={{border: '1px solid #cbd5e1', background: 'white', color: '#334155', borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', textAlign:'left'}}>+ Bloco de texto</button>
                                <button type="button" onClick={addImageBlock} style={{border: '1px solid var(--color-borderColor)', background: 'var(--color-bgSecondary)', color: 'var(--color-btnPrimary)', borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', textAlign:'left'}}>+ Bloco de imagem</button>
                            </div>

                            <div style={{fontSize:'0.8rem', color:'#64748b', lineHeight:'1.5', borderTop:'1px solid #e2e8f0', paddingTop:'12px'}}>
                                Blocos atuais: <strong>{postBlocks.length}</strong>
                                <br />
                                Dica: usa CTRL+V para colar prints diretamente no post.
                            </div>
                        </aside>

                        <div style={{display:'flex', flexDirection:'column', minHeight:0}}>
                            <div style={{padding: '18px 22px 12px 22px', borderBottom:'1px solid #f1f5f9', background:'#fff'}}>
                                <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px'}}>
                                    <div>
                                        <label style={labelStyle}>Titulo Breve *</label>
                                        <input type="text" value={newPost.titulo} onChange={e => setNewPost({...newPost, titulo: e.target.value})} required style={inputStyle} className="input-focus" placeholder="Ex: Nova atualização do sistema..." />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Categoria *</label>
                                        <select value={newPost.categoria} onChange={e => setNewPost({...newPost, categoria: e.target.value})} style={{...inputStyle, cursor: 'pointer'}} className="input-focus" required>
                                            <option value="geral">Geral</option>
                                            <option value="aviso">Aviso</option>
                                            <option value="duvida">Dúvida</option>
                                            <option value="ideia">Ideia</option>
                                        </select>
                                    </div>
                                </div>
                                <p style={{margin:'0', fontSize:'0.82rem', color:'#64748b'}}>Compositor em blocos: texto e imagem na ordem que quiseres.</p>
                            </div>

                            <div
                                style={{padding:'16px 22px 18px 22px', overflowY:'auto', flex:1, background:'#ffffff'}}
                                className="custom-scrollbar"
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = "copy";
                                }}
                                onDrop={handleComposerDrop}
                            >
                                <div style={{marginBottom: '14px', padding: '14px 16px', borderRadius: '14px', border: '1px dashed var(--color-borderColor)', background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)', color: '#475569', fontSize: '0.9rem', lineHeight: '1.5'}}>
                                    Solta imagens aqui para criar blocos automaticamente. Também podes usar CTRL+V para colar capturas.
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                    {postBlocks.map((block, idx) => (
                                        <div
                                            key={block.id}
                                            draggable
                                            onDragStart={() => handleBlockDragStart(idx)}
                                            onDragOver={(event) => handleBlockDragOver(event, idx)}
                                            onDrop={(event) => handleBlockDrop(event, idx)}
                                            onDragEnd={handleBlockDragEnd}
                                            style={{
                                                border: dragOverBlockIndex === idx ? '2px dashed var(--color-btnPrimary)' : '1px solid #e2e8f0',
                                                borderRadius: '12px',
                                                background: draggedBlockIndex === idx ? '#eff6ff' : '#f8fafc',
                                                padding: '12px',
                                                opacity: draggedBlockIndex === idx ? 0.85 : 1,
                                                boxShadow: dragOverBlockIndex === idx ? '0 0 0 3px rgba(59, 130, 246, 0.08)' : 'none',
                                                cursor: 'grab',
                                            }}
                                        >
                                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                                    <span style={{display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'white', border: '1px solid #dbe4ee', color: '#64748b'}}>
                                                        <Icons.GripVertical size={14} />
                                                    </span>
                                                    <div style={{fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                                                        Bloco {idx + 1}: {block.type === 'text' ? 'Texto' : 'Imagem'}
                                                    </div>
                                                </div>
                                                <div style={{display: 'flex', gap: '6px'}}>
                                                    <button type="button" onClick={() => removeBlock(idx)} style={{border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer'}}>Remover</button>
                                                </div>
                                            </div>

                                            {block.type === 'text' ? (
                                                <div style={{display: 'grid', gap: '8px'}}>
                                                    <div style={{display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: '10px'}}>
                                                        <span style={{fontSize: '0.8rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Alinhamento</span>
                                                        <select
                                                            value={block.align || 'left'}
                                                            onChange={(e) => updateTextBlockAlignment(block.id, e.target.value)}
                                                            style={{...inputStyle, marginBottom: 0, cursor: 'pointer', padding: '10px 12px'}}
                                                            className="input-focus"
                                                        >
                                                            {TEXT_ALIGNMENT_OPTIONS.map((option) => (
                                                                <option key={option.value} value={option.value}>{option.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <textarea
                                                        rows="4"
                                                        value={block.text}
                                                        onChange={(e) => updateTextBlock(block.id, e.target.value)}
                                                        style={{...inputStyle, marginBottom: 0, resize: 'vertical', textAlign: block.align || 'left'}}
                                                        className="input-focus"
                                                        placeholder="Escreve o texto deste bloco..."
                                                    />
                                                </div>
                                            ) : (
                                                <div style={{display: 'grid', gap: '8px'}}>
                                                    <label style={{display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', color: 'var(--color-btnPrimary)'}}>
                                                        <Icons.Image size={18} color="var(--color-btnPrimary)" /> Selecionar imagem
                                                        <input type="file" accept="image/*" onChange={(e) => updateImageBlockFile(block.id, e.target.files?.[0])} style={{display: 'none'}} />
                                                    </label>
                                                    <div style={{display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: '10px'}}>
                                                        <span style={{fontSize: '0.8rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Tamanho</span>
                                                        <select
                                                            value={block.size || 'lg'}
                                                            onChange={(e) => updateImageBlockSize(block.id, e.target.value)}
                                                            style={{...inputStyle, marginBottom: 0, cursor: 'pointer', padding: '10px 12px'}}
                                                            className="input-focus"
                                                        >
                                                            {IMAGE_SIZE_OPTIONS.map((option) => (
                                                                <option key={option.value} value={option.value}>{option.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {(block.previewUrl || block.uploadedUrl) ? (
                                                        <div style={{borderRadius: '8px', overflow: 'hidden', background: 'transparent', padding: '0', display: 'flex', justifyContent: 'center', width: '100%', maxWidth: getImageSizeConfig(block.size).maxWidth, alignSelf: 'center'}}>
                                                            <img src={block.previewUrl || block.uploadedUrl} alt="Preview do bloco" style={{width: '100%', maxHeight: '360px', objectFit: 'contain', borderRadius: '6px'}} />
                                                        </div>
                                                    ) : (
                                                        <div style={{fontSize: '0.8rem', color: '#64748b'}}>Sem imagem selecionada neste bloco.</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', padding:'14px 22px', borderTop: '1px solid #e2e8f0', background:'#f8fafc'}}>
                                <button type="button" onClick={closeNewPostModal} style={{padding: '11px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                                <button type="submit" disabled={isUploading} className="btn-primary hover-shadow" style={{padding: '11px 24px', borderRadius: '10px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    {isUploading ? "A carregar..." : <><Icons.Send size={16}/> Publicar</>}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </ModalPortal>
      )}

      {/* --- MODAL SPLIT-SCREEN GIGANTE (DETALHE DO POST) --- */}
      {selectedPost && (
        <ModalPortal>
            <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}} onClick={() => setSelectedPost(null)}>
            
            <div style={{background:'#fff', width:'98%', maxWidth:'1100px', borderRadius:'16px', boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow:'hidden', display:'flex', flexDirection:'column', height:'90vh', maxHeight:'90vh', animation: 'fadeIn 0.2s ease-out'}} onClick={e => e.stopPropagation()}>
                
                <div style={{padding:'20px 25px', background:'white', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <h3 style={{margin:0, color:'#1e293b', fontSize:'1.2rem', fontWeight:'800'}}>Discussão Aberta</h3>
                    <button onClick={() => setSelectedPost(null)} style={{background:'#f1f5f9', border:'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor:'pointer', color:'#64748b', transition: '0.2s'}} className="hover-red-btn"><Icons.Close size={18} /></button>
                </div>

                <div className="post-modal-layout">
                    
                    {/* ESQUERDA: POST ORIGINAL */}
                    <div className="post-modal-left custom-scrollbar" style={{padding: '30px', overflowY: 'auto'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px'}}>
                            <div style={{width: '50px', height: '50px', borderRadius: '50%', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', border: '1px solid #e2e8f0'}}>
                                {renderAvatar(selectedPost.profiles?.nome, selectedPost.profiles?.avatar_url, 50, '1rem')}
                            </div>
                            <div>
                                <div style={{fontSize: '1.1rem', color: '#1e293b', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    {selectedPost.profiles?.nome} 
                                    {getCategoryBadge(selectedPost.categoria)}
                                </div>
                                <div style={{fontSize: '0.85rem', color: '#94a3b8', fontWeight: '500', marginTop: '2px'}}>
                                    {formatDate(selectedPost.created_at)}
                                </div>
                            </div>
                        </div>
                        
                        <h2 style={{margin: '0 0 15px 0', color: '#0f172a', fontSize: '1.6rem', fontWeight: '900', lineHeight: '1.3'}}>{selectedPost.titulo}</h2>
                        <div style={{ marginBottom: '25px' }}>
                            {renderPostBlocks(selectedPost, { imageMaxHeight: 560 })}
                        </div>

                        <div style={{marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display:'flex', gap:'10px', alignItems:'center', flexWrap: 'wrap'}}>
                            {['👍','❤️','💡','🚀','😂','😮','😢'].map(emoji => {
                                const count = getReactionCounts(selectedPost.forum_reactions)[emoji] || 0;
                                const hasReacted = selectedPost.forum_reactions?.find(r => r.user_id === user.id && r.reaction_type === emoji);
                                return (
                                    <button key={emoji} onClick={() => handleReact(emoji, selectedPost.id, selectedPost.forum_reactions)} style={{
                                            background: hasReacted ? 'var(--color-bgSecondary)' : 'white', border: hasReacted ? '1px solid var(--color-borderColor)' : '1px solid #e2e8f0', 
                                            borderRadius: '20px', padding: '8px 16px', cursor: 'pointer', fontSize:'1.2rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
                                        }} className={!hasReacted ? "hover-shadow" : ""}>
                                        {emoji} <span style={{fontSize:'0.9rem', fontWeight:'bold', color: hasReacted ? 'var(--color-btnPrimary)' : '#64748b'}}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* DIREITA: COMENTÁRIOS */}
                    <div className="post-modal-right" style={{background: '#f8fafc', display: 'flex', flexDirection: 'column'}}>
                        
                        <div style={{padding: '20px 25px', borderBottom: '1px solid #e2e8f0', background: 'white'}}>
                            <h4 style={{margin: 0, color: '#1e293b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <Icons.Message size={18} color="var(--color-btnPrimary)" /> Comentários ({comments.length})
                            </h4>
                        </div>

                        <div style={{flex: 1, overflowY: 'auto', padding: '20px 25px', display: 'flex', flexDirection: 'column', gap: '15px'}} className="custom-scrollbar">
                            {comments.map(c => (
                                <div key={c.id} style={{background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem'}}>
                                            <div style={{width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-bgSecondary)', color: 'var(--color-btnPrimary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem', border: '1px solid var(--color-borderColor)', overflow:'hidden'}}>
                                                {renderAvatar(c.profiles?.nome, c.profiles?.avatar_url, 28, '0.7rem')}
                                            </div>
                                            <span style={{fontWeight: '800', color: '#1e293b', fontSize: '0.95rem'}}>{c.profiles?.nome}</span>
                                            <span style={{color: '#94a3b8', fontWeight: '500'}}>{formatDate(c.created_at)}</span>
                                        </div>
                                        
                                        {canDelete(c.user_id) && (
                                            <button onClick={() => requestDelete(c.id, 'comment', selectedPost?.id || null)} style={actionBtnStyle} className="hover-red-btn" title="Apagar Comentário">
                                                <Icons.Trash />
                                            </button>
                                        )}
                                        <button onClick={() => setModalReplyTarget({ id: c.id, nome: c.profiles?.nome || 'Utilizador' })} style={{background:'transparent', border:'none', color:'var(--color-btnPrimary)', fontWeight:'700', cursor:'pointer', fontSize:'0.78rem'}}>Responder</button>
                                    </div>
                                    <div style={{fontSize: '0.95rem', color: '#475569', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', lineHeight: '1.5', paddingLeft: '38px'}}>
                                        {renderWithLinks(c.conteudo)}
                                    </div>
                                </div>
                            ))}
                            {comments.length === 0 && (
                                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', opacity: 0.6}}>
                                    <Icons.Message size={40} />
                                    <p style={{marginTop: '10px', fontWeight: '500'}}>Sê o primeiro a comentar.</p>
                                </div>
                            )}
                        </div>

                        <div style={{padding: '20px 25px', borderTop: '1px solid #e2e8f0', background: 'white'}}>
                            {modalReplyTarget?.nome && (
                                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px', padding:'8px 10px', borderRadius:'10px', border:'1px solid #bfdbfe', background:'#eff6ff', color:'#1e3a8a', fontSize:'0.84rem'}}>
                                    <span>A responder a <strong>{modalReplyTarget.nome}</strong></span>
                                    <button onClick={() => setModalReplyTarget(null)} style={{background:'transparent', border:'none', color:'#1e3a8a', cursor:'pointer', fontWeight:'700'}}>Cancelar</button>
                                </div>
                            )}
                            <form onSubmit={handleSendComment} style={{display:'flex', gap:'10px', alignItems: 'center'}}>
                                <input type="text" placeholder={modalReplyTarget?.nome ? `Responder a ${modalReplyTarget.nome}...` : 'Escreve uma resposta...'} value={newCommentText} onChange={e => setNewCommentText(e.target.value)} style={{ flex: 1, padding: '15px 20px', borderRadius: '30px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', background: '#f1f5f9', transition: '0.2s' }} className="input-focus" />
                                <button type="submit" className="btn-primary hover-shadow" style={{width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0}} disabled={!newCommentText.trim()}>
                                    <Icons.Send size={20} />
                                </button>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
            </div>
        </ModalPortal>
      )}

      {chatModal.show && (
        <ModalPortal>
            <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999999, padding:'14px'}} onClick={closeInternalChatModal}>
                <div style={{background:'white', width:'min(1420px, 98vw)', height:'92vh', borderRadius:'18px', border:'1px solid #e2e8f0', boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow:'hidden', display:'grid', gridTemplateColumns:'320px 1fr'}} onClick={(e) => e.stopPropagation()}>
                    <div style={{borderRight:'1px solid #e2e8f0', background:'#f8fafc', display:'flex', flexDirection:'column', minHeight:0}}>
                        <div style={{padding:'16px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px'}}>
                            <h3 style={{margin:0, color:'#0f172a', fontSize:'1rem', fontWeight:'900'}}>Chats Internos</h3>
                            <button onClick={closeInternalChatModal} style={{background:'#fff', border:'1px solid #cbd5e1', width: '30px', height: '30px', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor:'pointer', color:'#64748b'}} className="hover-red-btn"><Icons.Close size={15} /></button>
                        </div>

                        <div style={{padding:'12px', overflowY:'auto', minHeight:0}} className="custom-scrollbar">
                            <button
                                onClick={() => {
                                    setShowNewChatModal(true);
                                }}
                                style={{width:'100%', display:'flex', alignItems:'center', gap:'10px', justifyContent:'center', marginBottom:'12px', border:'1px solid #d1d5db', borderRadius:'10px', background:'var(--color-btnPrimary)', color:'#fff', padding:'10px', cursor:'pointer', fontWeight:'700', fontSize:'0.9rem', transition:'0.2s'}}
                                className="hover-shadow"
                            >
                                <Icons.Plus size={16} /> Novo Chat
                            </button>

                            {chatRooms.length > 0 ? (
                                chatRooms.map((room) => {
                                    const unreadCount = unreadByRoom[room.id] || 0;
                                    return (
                                        <button
                                            key={room.id}
                                            onClick={() => openExistingRoom(room)}
                                            className="hover-shadow"
                                            style={{
                                                width:'100%',
                                                display:'flex',
                                                alignItems:'center',
                                                gap:'10px',
                                                textAlign:'left',
                                                border: unreadCount ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                                                borderRadius:'10px',
                                                background: activeChatRoom?.id === room.id ? '#eff6ff' : '#fff',
                                                marginBottom:'8px',
                                                padding:'10px',
                                                cursor:'pointer',
                                                boxShadow: unreadCount ? '0 6px 16px rgba(239,68,68,0.12)' : 'none',
                                            }}
                                        >
                                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--color-bgSecondary)', color: 'var(--color-btnPrimary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', overflow:'hidden' }}>
                                                {renderAvatar(room.display_title || room.nome || 'Conversa privada', room.display_avatar_url || null, 34, '0.78rem')}
                                            </div>
                                            <div style={{minWidth:0, flex:1}}>
                                                <div style={{color:'#0f172a', fontWeight:'800', fontSize:'0.95rem', display:'flex', alignItems:'center', gap:'8px'}}>
                                                    <span style={{minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{room.display_title || room.nome || 'Conversa privada'}</span>
                                                    {unreadCount > 0 && <span style={{width:'8px', height:'8px', borderRadius:'999px', background:'#ef4444', boxShadow:'0 0 0 4px rgba(239,68,68,0.2)', flexShrink:0}}></span>}
                                                </div>
                                                <div style={{color:'#94a3b8', fontSize:'0.8rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px'}}>
                                                    <span>{room.display_subtitle || (room.is_group ? 'Group Chat' : 'Chat')}</span>
                                                    {unreadCount > 0 && <span style={{padding:'2px 7px', borderRadius:'999px', fontSize:'0.7rem', fontWeight:'900', color:'#fff', background:'#ef4444'}}>{unreadCount}</span>}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            ) : (
                                <div style={{padding:'12px', color:'#94a3b8', fontSize:'0.85rem', textAlign:'center'}}>Ainda não criaste chats.</div>
                            )}

                        </div>
                    </div>

                    <div style={{display:'flex', flexDirection:'column', minHeight:0}}>
                        <div style={{padding:'16px 18px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px'}}>
                            <div>
                                <h3 style={{margin:'0 0 3px 0', color:'#0f172a', fontSize:'1.15rem', fontWeight:'900'}}>{chatModal.target?.title || 'Seleciona um chat'}</h3>
                                <p style={{margin:0, color:'#94a3b8', fontSize:'0.82rem'}}>{activeChatRoom?.id ? `Sala: ${activeChatRoom.id.slice(0, 8)}...` : 'Sem sala ativa'}</p>
                            </div>
                            {activeChatRoom?.is_group && (
                                <button
                                    type="button"
                                    onClick={openAddGroupMembersModal}
                                    style={{border:'1px solid #cbd5e1', background:'#fff', color:'#1e293b', borderRadius:'10px', padding:'8px 12px', cursor:'pointer', fontWeight:'700', fontSize:'0.82rem'}}
                                    className="hover-shadow"
                                >
                                    + Adicionar pessoas
                                </button>
                            )}
                        </div>

                        {chatError && (
                            <div style={{margin:'10px 16px 0 16px', padding:'10px 12px', border:'1px solid #fecaca', background:'#fef2f2', color:'#991b1b', borderRadius:'10px', fontSize:'0.85rem'}}>{chatError}</div>
                        )}

                        <div style={{margin:'10px 16px 0 16px', minHeight:'20px', color:'#64748b', fontSize:'0.82rem', fontStyle:'italic'}}>
                            {(() => {
                                const typingNames = Object.keys(typingUsersById)
                                    .map((typingUserId) => getChatSenderDisplayName(typingUserId))
                                    .filter(Boolean);

                                if (!typingNames.length) return null;
                                return `${typingNames.join(', ') || 'Alguém'} a escrever...`;
                            })()}
                        </div>

                        <div ref={chatMessagesContainerRef} style={{flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:'10px'}} className="custom-scrollbar">
                            {chatLoading && <div style={{color:'#94a3b8', fontSize:'0.9rem'}}>A carregar mensagens...</div>}

                            {!chatLoading && chatMessages.length === 0 && (
                                <div style={{margin:'auto', textAlign:'center', color:'#94a3b8'}}>
                                    <Icons.Message size={42} />
                                    <div style={{marginTop:'8px'}}>Sem mensagens nesta conversa.</div>
                                </div>
                            )}

                            {!chatLoading && chatMessages.map((msg) => {
                                const mine = msg.sender_id === user.id;
                                const showSenderName = Boolean(activeChatRoom?.is_group);
                                const tick = getMessageReadTick(msg);
                                return (
                                    <div key={msg.id} style={{display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start'}}>
                                        <div style={{maxWidth:'72%', background: mine ? '#eff6ff' : '#f1f5f9', border:'1px solid #e2e8f0', borderRadius:'12px', padding:'9px 12px'}}>
                                            {showSenderName && (
                                                <div style={{marginBottom:'6px', fontSize:'0.76rem', fontWeight:'800', color: mine ? '#1d4ed8' : '#475569'}}>
                                                    {mine ? (userProfile?.nome || 'Tu') : getChatSenderDisplayName(msg.sender_id)}
                                                </div>
                                            )}
                                            {msg.file_url ? (
                                                <div style={{display:'grid', gap:'6px'}}>
                                                    <a href={msg.file_url} target="_blank" rel="noreferrer" style={{color:'var(--color-btnPrimary)', fontWeight:'700', textDecoration:'none'}}>📄 {msg.file_name || 'Ficheiro'}</a>
                                                    {msg.requires_sig && !msg.is_signed && <span style={{fontSize:'0.78rem', color:'#b45309'}}>Aguarda assinatura</span>}
                                                    {msg.is_signed && <span style={{fontSize:'0.78rem', color:'#16a34a'}}>Assinado</span>}
                                                </div>
                                            ) : (
                                                <div style={{color:'#334155', whiteSpace:'pre-wrap', overflowWrap:'break-word'}}>{msg.content}</div>
                                            )}
                                            <div style={{marginTop:'5px', fontSize:'0.72rem', color:'#94a3b8', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px'}}>
                                                <span>{formatDate(msg.created_at || new Date().toISOString())}</span>
                                                {mine && <span style={{fontWeight:'800', color: tick === '✓✓' ? '#0ea5e9' : '#94a3b8'}}>{tick}</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <form onSubmit={handleSendChatText} style={{padding:'12px 16px', borderTop:'1px solid #e2e8f0', display:'flex', gap:'8px', alignItems:'center'}}>
                            <input
                                type="text"
                                value={chatDraft}
                                onChange={(e) => handleChatDraftChange(e.target.value)}
                                placeholder="Escreve uma mensagem..."
                                className="input-focus"
                                style={{flex:1, padding:'12px 14px', borderRadius:'10px', border:'1px solid #cbd5e1', outline:'none'}}
                                disabled={!activeChatRoom?.id || chatSending || chatUploadingFile}
                            />
                            <label
                                className="hover-shadow"
                                title="Anexar ficheiro"
                                style={{
                                    border:'1px solid #cbd5e1',
                                    borderRadius:'999px',
                                    width:'38px',
                                    height:'38px',
                                    cursor: !activeChatRoom?.id || chatSending || chatUploadingFile ? 'not-allowed' : 'pointer',
                                    color:'#334155',
                                    background:'#fff',
                                    display:'inline-flex',
                                    alignItems:'center',
                                    justifyContent:'center',
                                    opacity: !activeChatRoom?.id || chatSending || chatUploadingFile ? 0.6 : 1
                                }}
                            >
                                <Icons.Paperclip size={17} />
                                <input
                                    type="file"
                                    style={{display:'none'}}
                                    disabled={!activeChatRoom?.id || chatSending || chatUploadingFile}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) uploadChatFile(file);
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                            <button type="submit" className="btn-primary" style={{borderRadius:'10px', padding:'10px 14px', opacity: chatDraft.trim() && activeChatRoom?.id ? 1 : 0.6}} disabled={!chatDraft.trim() || !activeChatRoom?.id || chatSending || chatUploadingFile}>
                                {chatSending ? '...' : 'Enviar'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </ModalPortal>
      )}

      {showAddGroupMembersModal && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.72)', backdropFilter:'blur(5px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000003, padding:'16px'}}>
                  <div style={{background:'white', width:'min(500px, 96vw)', borderRadius:'16px', border:'1px solid #e2e8f0', boxShadow:'0 30px 60px -20px rgba(15, 23, 42, 0.45)', overflow:'hidden'}}>
                      <div style={{padding:'16px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#f8fafc'}}>
                          <div>
                              <p style={{margin:'0 0 3px 0', fontSize:'0.72rem', fontWeight:'800', letterSpacing:'0.05em', color:'var(--color-btnPrimary)', textTransform:'uppercase'}}>Grupo</p>
                              <h3 style={{margin:0, color:'#0f172a', fontSize:'1.1rem', fontWeight:'900'}}>Adicionar pessoas</h3>
                          </div>
                          <button onClick={closeAddGroupMembersModal} style={{background:'#fff', border:'1px solid #cbd5e1', cursor:'pointer', color:'#64748b', width:'34px', height:'34px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center'}} className="hover-red-text"><Icons.Close size={18} /></button>
                      </div>

                      <div style={{padding:'18px 20px'}}>
                          <p style={{margin:'0 0 10px 0', color:'#475569', fontSize:'0.87rem'}}>Seleciona quem queres adicionar à conversa.</p>
                          <div style={{maxHeight:'260px', overflowY:'auto', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'8px', display:'grid', gap:'8px', background:'#fff'}}>
                              {chatCollaborators.filter((collab) => !existingGroupMemberIds.includes(collab.id)).length === 0 && (
                                  <div style={{fontSize:'0.85rem', color:'#94a3b8', padding:'10px'}}>Todos os colaboradores já estão neste grupo.</div>
                              )}

                              {chatCollaborators
                                  .filter((collab) => !existingGroupMemberIds.includes(collab.id))
                                  .map((collab) => {
                                      const selected = selectedUsersToAddInGroup.includes(collab.id);
                                      return (
                                          <button
                                              key={collab.id}
                                              type="button"
                                              onClick={() => toggleUserToAddInGroup(collab.id)}
                                              style={{
                                                  width:'100%',
                                                  display:'flex',
                                                  alignItems:'center',
                                                  justifyContent:'space-between',
                                                  gap:'10px',
                                                  border: selected ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                                                  borderRadius:'8px',
                                                  padding:'10px',
                                                  background: selected ? '#eff6ff' : '#fff',
                                                  cursor:'pointer',
                                                  textAlign:'left'
                                              }}
                                          >
                                              <span style={{fontWeight:'700', color:'#1e293b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{collab.nome}</span>
                                              <span style={{fontSize:'0.75rem', fontWeight:'800', color: selected ? '#1d4ed8' : '#94a3b8'}}>{selected ? 'Selecionado' : 'Selecionar'}</span>
                                          </button>
                                      );
                                  })}
                          </div>

                          <div style={{display:'flex', gap:'10px', marginTop:'16px'}}>
                              <button onClick={closeAddGroupMembersModal} style={{flex:1, padding:'11px 14px', borderRadius:'8px', border:'1px solid #cbd5e1', background:'#fff', color:'#1e293b', fontWeight:'700', cursor:'pointer'}} className="hover-shadow">Cancelar</button>
                              <button
                                  onClick={addSelectedUsersToGroup}
                                  disabled={addingGroupMembers || !selectedUsersToAddInGroup.length}
                                  style={{flex:1, padding:'11px 14px', borderRadius:'8px', border:'none', background:'var(--color-btnPrimary)', color:'#fff', fontWeight:'700', cursor: addingGroupMembers || !selectedUsersToAddInGroup.length ? 'not-allowed' : 'pointer', opacity: addingGroupMembers || !selectedUsersToAddInGroup.length ? 0.6 : 1}}
                                  className="hover-shadow"
                              >
                                  {addingGroupMembers ? 'A adicionar...' : `Adicionar (${selectedUsersToAddInGroup.length})`}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* --- NOTIFICAÇÃO GLOBAL --- */}
      {notification.show && (
          <ModalPortal>
              <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999999}}>
                  <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'90%', maxWidth: '350px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                      <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px'}}>
                          {notification.type === 'success' ? <Icons.CheckCircle color="#10b981" /> : <Icons.XCircle color="#ef4444" />}
                      </div>
                      <h3 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.25rem'}}>{notification.type === 'success' ? 'Sucesso!' : 'Atenção'}</h3>
                      <p style={{color: '#64748b', marginBottom: '25px', lineHeight: '1.5', fontSize: '0.95rem'}}>{notification.message}</p>
                      <button onClick={() => setNotification({ show: false, message: '', type: 'success' })} className="btn-primary hover-shadow" style={{width: '100%', padding: '12px', borderRadius: '10px', fontWeight: 'bold'}}>Fechar</button>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* --- MODAL DE CONFIRMAÇÃO --- */}
      {confirmModal.show && (
        <ModalPortal>
            <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999999}}>
            <div style={{background:'white', padding:'30px', borderRadius:'16px', width:'90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', animation: 'fadeIn 0.2s ease-out'}}>
                <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px'}}><Icons.AlertTriangle color="#ef4444" /></div>
                <h3 style={{margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.25rem'}}>Tem a certeza?</h3>
                <p style={{color: '#64748b', marginBottom: '25px', lineHeight: '1.5', fontSize: '0.95rem'}}>
                    {confirmModal.type === 'post' 
                        ? 'Quer mesmo apagar este post e todos os comentários associados?' 
                        : 'Quer apagar este comentário?'}
                    <br/>Esta ação não pode ser desfeita.
                </p>
                <div style={{display: 'flex', gap: '10px'}}>
                    <button onClick={() => setConfirmModal({ show: false, id: null, type: null, postId: null })} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 'bold', color: '#475569', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                    <button onClick={confirmDelete} style={{flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Sim, Apagar</button>
                </div>
            </div>
            </div>
        </ModalPortal>
      )}

      {chatNotice.show && (
          <ModalPortal>
              <div style={{position:'fixed', right:'22px', bottom:'22px', zIndex:1000002, pointerEvents:'none'}}>
                  <div style={{minWidth:'260px', maxWidth:'360px', padding:'12px 14px', borderRadius:'12px', background:'linear-gradient(135deg, #111827, #1f2937)', color:'#fff', boxShadow:'0 18px 35px rgba(15,23,42,0.35)', border:'1px solid rgba(255,255,255,0.14)'}}>
                      <div style={{display:'flex', alignItems:'center', gap:'8px', fontWeight:'800', fontSize:'0.86rem'}}>
                          <span style={{width:'8px', height:'8px', borderRadius:'999px', background:'#22c55e', boxShadow:'0 0 0 5px rgba(34,197,94,0.25)'}}></span>
                          Nova mensagem interna
                      </div>
                      <div style={{marginTop:'6px', fontSize:'0.84rem', color:'#cbd5e1'}}>{chatNotice.text}</div>
                  </div>
              </div>
          </ModalPortal>
      )}

            <StopTimerNoteModal
                open={stopNoteModal.show}
                title="Parar cronometro"
                message="Se quiseres, adiciona uma nota breve sobre o que foi feito (opcional)."
                placeholder="Ex: Concluída análise e próximos passos definidos"
                showCompleteOption={false}
                onCancel={closeStopNoteModal}
                onConfirm={(note) => confirmStopWithNote(note)}
            />

      <style>{`
        .hover-shadow:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .hover-red-btn:hover { background-color: #fef2f2 !important; color: #ef4444 !important; opacity: 1 !important; }
        .hover-red-text:hover { color: #ef4444 !important; }
        .hover-bg-light:hover { background-color: #f1f5f9 !important; color: #1e293b !important; }
        .hover-input-fake:hover { background-color: #e2e8f0 !important; color: #334155 !important; }
        .hover-border-blue:hover { border-color: var(--color-btnPrimary) !important; background: var(--color-bgSecondary) !important; }
        
        .hover-avatar:hover { background: #e2e8f0 !important; border-color: #94a3b8 !important; }
        .hover-name:hover { text-decoration: underline; color: var(--color-btnPrimary) !important; }

        .input-focus:focus { border-color: var(--color-btnPrimary) !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }

        .forum-main-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 300px;
            gap: 20px;
            align-items: start;
        }

        .forum-collab-bar {
            max-width: calc(100% - 362px);
        }

        .forum-chat-sidebar {
            margin-top: -96px;
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 #f1f5f9;
        }

        .forum-chat-sidebar::-webkit-scrollbar {
            width: 6px;
        }

        .forum-chat-sidebar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 3px;
        }

        .forum-chat-sidebar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
        }

        .forum-chat-sidebar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }

        .comment-bubble-row {
            display: flex;
            align-items: flex-start;
            gap: 8px;
        }

        .comment-avatar-mini {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #e2e8f0;
            color: #475569;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 0.68rem;
            flex-shrink: 0;
            margin-top: 2px;
        }

        .comment-bubble {
            flex: 1;
            min-width: 0;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 8px 10px;
        }

        /* Layout Split Screen do Modal */
        .post-modal-layout { display: flex; flex-direction: row; height: calc(100% - 77px); }
        .post-modal-left { flex: 1.5; border-right: 1px solid #e2e8f0; }
        .post-modal-right { flex: 1; border-left: none; }
        
        @media (max-width: 800px) {
            .post-modal-layout { flex-direction: column; overflow-y: auto; }
            .post-modal-left { flex: none; height: auto; border-right: none; }
            .post-modal-right { flex: none; height: 500px; border-top: 1px solid #e2e8f0; }

            .forum-main-layout {
                grid-template-columns: 1fr;
            }

            .forum-collab-bar {
                max-width: 100%;
            }

            .forum-chat-sidebar {
                position: static !important;
                top: auto !important;
                margin-top: 0;
            }
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
