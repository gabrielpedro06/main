import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import StopTimerNoteModal from "../components/StopTimerNoteModal";
import { resolveActiveTimerMeta } from "../utils/activeTimerResolver";
import { applyStopStatusUpdateForLogTarget } from "../utils/taskTimerLifecycle";
import "./../styles/dashboard.css";
import EmojiPicker from 'emoji-picker-react';
import "../styles/forum.css";

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
  Smile: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>,  
  Heart: ({ size = 16, color = "currentColor", fill = "none" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
    Stop: ({ size = 12, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect></svg>,
    GripVertical: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle></svg>,
  Expand: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>,
  Check: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  Search: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  Users: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  Edit: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
};

const CAT_ICON_PATHS = {
  all: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  aviso: <><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>,
  duvida: <><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  ideia: <><path d="M9 18h6" /><path d="M10 22h4" /><path d="M15.1 14c.2-1 .7-1.7 1.4-2.5A5.5 5.5 0 1 0 7.5 11.5c.7.8 1.2 1.5 1.4 2.5" /></>,
  geral: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" /></>,
};
const CatIcon = ({ k, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {CAT_ICON_PATHS[k] || CAT_ICON_PATHS.geral}
  </svg>
);

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

// Caixa de escrita do chat. O texto vive AQUI (estado local), para que escrever
// não obrigue o fórum inteiro (feed, salas, mensagens) a redesenhar-se a cada tecla.
function ChatComposer({ disabled, busy, stagedFile, onStageFile, onPaste, onSend, onTyping }) {
  const inputRef = useRef(null);
  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);

  const focusInput = () => setTimeout(() => inputRef.current?.focus(), 50);

  const handleChange = (value) => {
    setDraft(value);
    onTyping(Boolean(value.trim()));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content && !stagedFile) return;
    const ok = await onSend(content);
    if (ok) {
      setDraft("");
      setShowEmoji(false);
    }
    focusInput();
  };

  return (
    <form onSubmit={handleSubmit} className="fx-chat-composer">
      {showEmoji && (
        <div className="fx-emoji-pop">
          <EmojiPicker
            onEmojiClick={(emojiObject) => {
              setDraft((prev) => prev + emojiObject.emoji);
              inputRef.current?.focus();
            }}
            autoFocusSearch={false}
            theme="light"
            searchPlaceHolder="Procurar emojis..."
            width={320}
            height={400}
          />
        </div>
      )}

      <div className="fx-chat-input">
        <button type="button" onClick={() => setShowEmoji((v) => !v)} className={`fx-icon-btn ${showEmoji ? 'is-on' : ''}`} aria-label="Emojis">
          <Icons.Smile size={20} />
        </button>
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            // Enter envia; Shift+Enter muda de linha
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          onPaste={(e) => {
            onPaste(e);
            if (e.defaultPrevented) setShowEmoji(false);
          }}
          onClick={() => setShowEmoji(false)}
          placeholder={stagedFile ? "Adicionar uma legenda..." : "Escreve uma mensagem..."}
          disabled={disabled}
        />
        <label className={`fx-icon-btn ${disabled ? 'is-disabled' : ''}`} title="Anexar ficheiro">
          <Icons.Paperclip size={18} />
          <input type="file" style={{ display: 'none' }} disabled={disabled} onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) { onStageFile(file); setShowEmoji(false); }
            e.target.value = '';
          }} />
        </label>
      </div>
      <button type="submit" className="fx-send fx-send-lg" disabled={(!draft.trim() && !stagedFile) || disabled} aria-label="Enviar mensagem">
        {busy ? <span className="fx-spinner" /> : <Icons.Send size={18} />}
      </button>
    </form>
  );
}

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
  const [editingPost, setEditingPost] = useState(null); 
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
    const [chatLoading, setChatLoading] = useState(false);
    const [chatSending, setChatSending] = useState(false);
    const [chatUploadingFile, setChatUploadingFile] = useState(false);
    const [chatError, setChatError] = useState("");
    const [chatRlsNeedsFix, setChatRlsNeedsFix] = useState(false);
    const [isDraggingChatFile, setIsDraggingChatFile] = useState(false);
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
    const [chatStagedFile, setChatStagedFile] = useState(null); // <-- NOVO ESTADO
    const stagedPreviewUrl = useMemo(
        () => (chatStagedFile && chatStagedFile.type.startsWith('image/') ? URL.createObjectURL(chatStagedFile) : null),
        [chatStagedFile]
    );
    useEffect(() => () => { if (stagedPreviewUrl) URL.revokeObjectURL(stagedPreviewUrl); }, [stagedPreviewUrl]);
    const [reactionMenuMessageId, setReactionMenuMessageId] = useState(null);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [chatPeopleQuery, setChatPeopleQuery] = useState('');
    const [feedReactPicker, setFeedReactPicker] = useState(null);
    const [lastMessageByRoom, setLastMessageByRoom] = useState({});
    const [commentLikes, setCommentLikes] = useState({});
    const [commentLikesAvailable, setCommentLikesAvailable] = useState(true);
    const [expandedReplies, setExpandedReplies] = useState({});
    const reactPressTimerRef = useRef(null);
    const reactLongPressRef = useRef(false);

  function scrollChatToBottom(delayMs = 0) {
      const run = () => {
          const container = chatMessagesContainerRef.current;
          if (!container) return;
          container.scrollTop = container.scrollHeight;
      };

      if (delayMs > 0) {
          setTimeout(run, delayMs);
          return;
      }

      requestAnimationFrame(() => {
          requestAnimationFrame(run);
      });
  }

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
            .on("broadcast", { event: "read_receipt" }, ({ payload }) => {
                const roomId = payload?.roomId;
                const readerId = payload?.userId;
                const lastReadAt = payload?.lastReadAt;

                if (!roomId || !readerId || !lastReadAt) return;

                setReadReceiptsByRoom((prev) => ({
                    ...prev,
                    [roomId]: {
                        ...(prev[roomId] || {}),
                        [readerId]: lastReadAt,
                    },
                }));
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
        scrollChatToBottom();
    }, [chatMessages, chatModal.show, activeChatRoom?.id]);

    useEffect(() => {
        if (!chatModal.show || !activeChatRoom?.id || chatLoading) return;
        scrollChatToBottom(30);
    }, [chatModal.show, activeChatRoom?.id, chatLoading]);

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
                    rememberLastMessages([incoming]);
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

                    const seenMap = getSeenRoomsMap();
                    const localSeenAt = seenMap[incoming.room_id] || null;

                    const { data: roomRead } = await supabase
                        .from("chat_room_reads")
                        .select("last_read_at")
                        .eq("room_id", incoming.room_id)
                        .eq("user_id", user.id)
                        .maybeSingle();

                    const dbSeenAt = roomRead?.last_read_at || null;
                    const effectiveSeenAt = !localSeenAt
                        ? dbSeenAt
                        : !dbSeenAt
                        ? localSeenAt
                        : new Date(localSeenAt) > new Date(dbSeenAt)
                        ? localSeenAt
                        : dbSeenAt;

                    if (effectiveSeenAt && new Date(incoming.created_at) <= new Date(effectiveSeenAt)) {
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
        if (!user?.id || !chatRooms.length) return;

        const roomIds = chatRooms.map((room) => room.id).filter(Boolean);
        if (!roomIds.length) return;

        const channel = supabase
            .channel(`chat_unread_reads_${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "chat_room_reads",
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    refreshUnreadCounts(roomIds);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, chatRooms]);

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

      if (activeChatRoom?.id === roomId && activeRoomChannelRef.current && user?.id) {
          activeRoomChannelRef.current.send({
              type: "broadcast",
              event: "read_receipt",
              payload: {
                  roomId,
                  userId: user.id,
                  lastReadAt: nowIso,
              },
          });
      }

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

  function rememberLastMessages(messages = []) {
      if (!messages.length) return;
      setLastMessageByRoom((prev) => {
          const next = { ...prev };
          messages.forEach((msg) => {
              if (!msg?.room_id || !msg.created_at) return;
              const current = next[msg.room_id];
              if (!current || new Date(msg.created_at) > new Date(current.created_at)) {
                  next[msg.room_id] = {
                      created_at: msg.created_at,
                      sender_id: msg.sender_id,
                      content: msg.content || "",
                      file_name: msg.file_name || "",
                  };
              }
          });
          return next;
      });
  }

  async function refreshUnreadCounts(roomIds = []) {
      if (!user?.id || !roomIds.length) {
          setUnreadByRoom({});
          return;
      }

      const seenMap = getSeenRoomsMap();

      const { data: roomReads, error: roomReadsError } = await supabase
          .from("chat_room_reads")
          .select("room_id, last_read_at")
          .eq("user_id", user.id)
          .in("room_id", roomIds);

      if (roomReadsError) return;

      const dbReadAtByRoom = {};
      (roomReads || []).forEach((row) => {
          if (!row?.room_id) return;
          dbReadAtByRoom[row.room_id] = row.last_read_at;
      });

      const { data, error } = await supabase
          .from("chat_messages")
          .select("room_id, sender_id, created_at, content, file_name")
          .in("room_id", roomIds)
          .order("created_at", { ascending: false })
          .limit(500);

      if (error) return;
      rememberLastMessages(data || []);

      const nextCounts = {};
      roomIds.forEach((id) => {
          nextCounts[id] = 0;
      });

      (data || []).forEach((msg) => {
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

    async function confirmStopWithNote(note, _shouldComplete, statusMeta) {
        setStopNoteModal({ show: false });
        if (!activeLog) return;

        const logToStop = activeLog;
        const diffMins = await stopLogById(logToStop, note);
        if (diffMins === null) return;

        await applyStopStatusUpdateForLogTarget(supabase, logToStop, statusMeta);

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

  // --- CRIAR / EDITAR POST ---
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
                throw new Error("Não foi possível carregar uma das imagens. Verifica se o bucket 'forum_media' existe.");
            }

            const { data } = supabase.storage.from("forum_media").getPublicUrl(fileName);
            blocksForUpload[i] = { ...block, uploadedUrl: data.publicUrl, previewUrl: data.publicUrl, file: null };
        }

        const normalizedBlocks = blocksForUpload
            .map((block) => {
                if (block.type === "text") return { type: "text", text: String(block.text || ""), align: String(block.align || "left") };
                const url = block.uploadedUrl || block.previewUrl || "";
                return { type: "image", url: String(url), size: String(block.size || "lg") };
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
        };

        if (firstImageUrl) {
            payload.image_url = firstImageUrl;
        }

        let error;

        if (editingPost) {
            const res = await supabase
                .from("forum_posts")
                .update(payload)
                .eq("id", editingPost.id);
            error = res.error;
        } else {
            payload.user_id = user.id;
            const res = await supabase
                .from("forum_posts")
                .insert([payload]);
            error = res.error;
        }

        if (error) {
            console.error(error);
            throw new Error(error.message);
        }

        // Se o post editado estiver aberto no modal de detalhes, atualiza-o também
        if (selectedPost && editingPost && selectedPost.id === editingPost.id) {
            setSelectedPost((prev) => ({ ...prev, ...payload }));
        }

        closeNewPostModal();
        
        // Pequena pausa estratégica para o banco de dados processar o commit antes do refresh
        await new Promise(resolve => setTimeout(resolve, 150));
        fetchPosts(true);
        
        showToast(editingPost ? "Publicação editada com sucesso!" : "Publicado com sucesso!", "success");

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
              const pool = postId ? (postCommentsByPost[postId] || comments) : comments;
              const removedCount = 1 + pool.filter((c) => c.parent_id === id).length;
              setComments(comments.filter(c => c.id !== id && c.parent_id !== id));

              if (postId) {
                  setPostCommentsByPost((prev) => ({
                      ...prev,
                      [postId]: (prev[postId] || []).filter((c) => c.id !== id && c.parent_id !== id),
                  }));
              }

              setPosts(posts.map(p => {
                  const shouldUpdate = postId ? p.id === postId : p.id === selectedPost?.id;
                  if (shouldUpdate) {
                      const currCount = p.forum_comments?.[0]?.count || removedCount;
                      return { ...p, forum_comments: [{ count: Math.max(0, currCount - removedCount) }] };
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

  // --- Gostos em comentários (tabela forum_comment_likes; se não existir, a funcionalidade esconde-se) ---
  async function loadCommentLikes(commentIds = []) {
      const ids = commentIds.filter(Boolean);
      if (!ids.length || !commentLikesAvailable) return;
      const { data, error } = await supabase
          .from("forum_comment_likes")
          .select("comment_id, user_id")
          .in("comment_id", ids);
      if (error) {
          if (["42P01", "PGRST205", "PGRST200"].includes(error.code)) setCommentLikesAvailable(false);
          return;
      }
      setCommentLikes((prev) => {
          const next = { ...prev };
          ids.forEach((id) => { next[id] = []; });
          (data || []).forEach((row) => {
              next[row.comment_id] = [...(next[row.comment_id] || []), row.user_id];
          });
          return next;
      });
  }

  async function toggleCommentLike(comment) {
      if (!comment?.id || !user?.id || !commentLikesAvailable) return;
      const current = commentLikes[comment.id] || [];
      const liked = current.includes(user.id);
      setCommentLikes((prev) => ({
          ...prev,
          [comment.id]: liked ? (prev[comment.id] || []).filter((id) => id !== user.id) : [...(prev[comment.id] || []), user.id],
      }));
      const { error } = liked
          ? await supabase.from("forum_comment_likes").delete().eq("comment_id", comment.id).eq("user_id", user.id)
          : await supabase.from("forum_comment_likes").insert([{ comment_id: comment.id, user_id: user.id }]);
      if (error) {
          setCommentLikes((prev) => ({ ...prev, [comment.id]: current }));
          if (["42P01", "PGRST205"].includes(error.code)) setCommentLikesAvailable(false);
      }
  }

  // Insere um comentário; se for resposta, tenta guardar parent_id (cai para o modo antigo se a coluna não existir)
  async function insertForumComment(postId, conteudo, parentId = null) {
      const base = { post_id: postId, user_id: user.id, conteudo };
      const select = `*, profiles ( nome, avatar_url )`;
      if (parentId) {
          const res = await supabase.from("forum_comments").insert([{ ...base, parent_id: parentId }]).select(select).single();
          if (!res.error) return res;
          if (!["42703", "PGRST204"].includes(res.error.code)) return res;
      }
      return supabase.from("forum_comments").insert([base]).select(select).single();
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
          loadCommentLikes((data || []).map((c) => c.id));
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

      const { data, error } = await insertForumComment(postId, payloadText, replyTarget?.rootId || null);

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

      if (replyTarget?.rootId) setExpandedReplies((prev) => ({ ...prev, [replyTarget.rootId]: true }));
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
    loadCommentLikes((cData || []).map((c) => c.id));
  }

  async function handleSendComment(e) {
    e.preventDefault();
    if(!newCommentText.trim()) return;

    const textoComentario = newCommentText;
    const payloadText = modalReplyTarget?.nome ? `@${modalReplyTarget.nome} ${textoComentario}` : textoComentario;
    setNewCommentText(""); 

    const { data, error } = await insertForumComment(selectedPost.id, payloadText, modalReplyTarget?.rootId || null);

    if (!error && data) {
        setComments([...comments, data]);
        if (modalReplyTarget?.rootId) setExpandedReplies((prev) => ({ ...prev, [modalReplyTarget.rootId]: true }));
        
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

  const canEdit = (authorId) => {
    const myRole = userProfile?.role || '';
    // Regra padrão: o próprio autor ou os administradores/gestores
    return user.id === authorId || ['admin', 'gestor'].includes(myRole);
    };

  const openNewPostModal = () => {
      setEditingPost(null);
      setNewPost({ titulo: "", categoria: "geral" });
      setPostBlocks([createTextBlock("")]);
      setShowNewPostModal(true);
  };

  const handleStartEdit = (post) => {
    setEditingPost(post);
    setNewPost({ titulo: post.titulo, categoria: post.categoria });
    setPostBlocks(parsePostBlocks(post));
    setShowNewPostModal(true);
    };

  const closeNewPostModal = () => {
    setShowNewPostModal(false);
    setEditingPost(null);
    setNewPost({ titulo: "", categoria: "geral" });
    setPostBlocks([createTextBlock("")]);
    };

  const closeInternalChatModal = () => {
      setChatModal({ show: false, target: null });
      setActiveChatRoom(null);
      setChatMessages([]);
      setChatError("");
      setChatStagedFile(null); // <--- SÓ FALTAVA ISTO AQUI!
      setShowAddGroupMembersModal(false);
      setExistingGroupMemberIds([]);
      setSelectedUsersToAddInGroup([]);
      setTypingUsersById({});

      Object.values(typingTimersRef.current || {}).forEach((timerId) => clearTimeout(timerId));
      typingTimersRef.current = {};
      typingLastSentAtRef.current = 0;
  };

async function handleChatReaction(messageId, emoji) {
    // 1. Analisa o estado atual antes de fazer o set
    const targetMsg = chatMessages.find(m => m.id === messageId);
    if (!targetMsg) return;

    const existingReactions = targetMsg.chat_reactions || [];
    const myReactionIndex = existingReactions.findIndex(r => r.user_id === user.id);
    
    // Determina antecipadamente se é uma remoção
    const isRemoving = myReactionIndex >= 0 && existingReactions[myReactionIndex].emoji === emoji;

    // 2. Atualização otimista da UI
    setChatMessages(prev => prev.map(msg => {
        if (msg.id !== messageId) return msg;
        
        let newReactions = [...(msg.chat_reactions || [])];
        
        if (isRemoving) {
            // Clicou no mesmo emoji: REMOVE
            newReactions = newReactions.filter(r => r.user_id !== user.id);
        } else if (myReactionIndex >= 0) {
            // Clicou num emoji diferente: SUBSTITUI
            const localIdx = newReactions.findIndex(r => r.user_id === user.id);
            if (localIdx >= 0) {
                newReactions[localIdx] = { ...newReactions[localIdx], emoji };
            }
        } else {
            // Não tinha reação: ADICIONA NOVA
            newReactions.push({ id: Date.now(), user_id: user.id, emoji });
        }
        
        return { ...msg, chat_reactions: newReactions };
    }));

    // Esconde o menu flutuante
    setReactionMenuMessageId(null); 
    
    // 3. Guarda ou Apaga na base de dados (agora isRemoving tem o valor correto!)
    try {
        if (isRemoving) {
            await supabase.from('chat_reactions')
                .delete()
                .match({ message_id: messageId, user_id: user.id });
        } else {
            await supabase.from('chat_reactions')
                .upsert({ message_id: messageId, user_id: user.id, emoji }, { onConflict: 'message_id,user_id' });
        }
    } catch (err) {
        console.error("Erro a processar reação:", err);
    }
}

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

  async function loadChatMessages(roomId) {
      if (!roomId) {
          setChatMessages([]);
          return;
      }

      const { data, error } = await supabase
          .from("chat_messages")
          .select("*, chat_reactions(*)")
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
          .select("*, chat_reactions(*)") // <-- Puxa sempre as reações
          .eq("room_id", roomId)
          .order("created_at", { ascending: true })
          .limit(50);

      if (lastKnownCreatedAt) {
          query = query.gt("created_at", lastKnownCreatedAt);
      }

      const { data, error } = await query;
      if (error || !data?.length) return;

      setChatMessages((prev) => {
          const next = [...prev];
          data.forEach(incomingMsg => {
              const index = next.findIndex(m => m.id === incomingMsg.id);
              if (index >= 0) {
                  // Se a mensagem já existe na UI, atualiza as reações (Para veres os likes dos outros!)
                  next[index] = { ...next[index], chat_reactions: incomingMsg.chat_reactions };
              } else {
                  // Se é uma mensagem nova, adiciona-a ao fim
                  next.push(incomingMsg);
              }
          });
          return next;
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

async function sendChatMessage(rawContent) {
      const content = String(rawContent || "").trim();
      
      // Se não houver nem texto nem ficheiro, não faz nada
      if (!content && !chatStagedFile) return false;
      if (!activeChatRoom?.id) return false;
      let sent = false;

      setChatSending(true);
      try {
          let fileUrl = null;
          let fileName = null;

          // 1. Faz o upload do ficheiro se existir algum em "espera"
          if (chatStagedFile) {
              setChatUploadingFile(true);
              const fileExt = chatStagedFile.name.split(".").pop();
              const fName = `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
              const filePath = `chat-files/${fName}`;

              const { error: uploadError } = await supabase.storage
                  .from("documents") // O teu bucket atual
                  .upload(filePath, chatStagedFile);

              if (uploadError) throw uploadError;

              const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(filePath);
              fileUrl = publicUrl;
              fileName = chatStagedFile.name;
              setChatUploadingFile(false);
          }

          // 2. Insere a mensagem (agora pode ter texto, ficheiro, ou ambos)
          const { data, error } = await supabase
              .from("chat_messages")
              .insert([{
                  room_id: activeChatRoom.id,
                  sender_id: user.id,
                  content: content || null,
                  file_url: fileUrl,
                  file_name: fileName,
              }])
              .select("*")
              .single();

          if (error) throw error;
          
          // 3. Limpa o anexo (o texto é limpo pelo ChatComposer)
          setChatStagedFile(null);
          sent = true;
          
          if (data) {
              setChatMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
          }

          emitTypingStatus(false);
      } catch (err) {
          setChatError(err?.message || "Erro ao enviar mensagem.");
          setChatUploadingFile(false);
      } finally {
          setChatSending(false);
      }
      return sent;
  }

  const handleChatDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeChatRoom?.id && !chatSending && !chatUploadingFile) {
          setIsDraggingChatFile(true);
      }
  };

  const handleChatDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeChatRoom?.id && !chatSending && !chatUploadingFile) {
          e.dataTransfer.dropEffect = "copy";
          setIsDraggingChatFile(true);
      }
  };

  const handleChatDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Previne que o estado mude a piscar quando passa por cima de elementos filhos
      if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsDraggingChatFile(false);
      }
  };

  const handleChatDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingChatFile(false);

      if (!activeChatRoom?.id || chatSending || chatUploadingFile) return;

      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
          setChatStagedFile(files[0]); // <-- Substitui uploadChatFile(files[0]) por isto
      }
  };

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
      const labels = { aviso: 'Aviso', duvida: 'Dúvida', ideia: 'Ideia', geral: 'Geral' };
      const key = labels[cat] ? cat : 'geral';
      return <span className={`fx-cat fx-cat-${key}`}>{labels[key]}</span>;
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
          <div className="fx-blocks">
              {blocks.map((block, idx) => {
                  if (block.type === "image") {
                      const imageUrl = block.previewUrl || block.uploadedUrl;
                      if (!imageUrl) return null;
                      const sizeConfig = getImageSizeConfig(block.size);

                      return (
                          <div key={`img_${idx}`} className={`fx-block-img ${sizeConfig.value === "full" ? "is-full" : ""}`} style={{ maxWidth: sizeConfig.maxWidth }}>
                              <img src={imageUrl} alt="Anexo da publicação" style={{ maxHeight: `${imageMaxHeight}px` }} loading="lazy" />
                          </div>
                      );
                  }

                  if (!String(block.text || "").trim()) return null;
                  return (
                      <div key={`txt_${idx}`} className="fx-block-text" style={{ textAlign: block.align || "left" }}>
                          {renderWithLinks(block.text)}
                      </div>
                  );
              })}
          </div>
      );
  };

  const FORUM_CATEGORIES = {
      geral: { label: 'Geral', plural: 'Geral', emoji: '💬' },
      aviso: { label: 'Aviso', plural: 'Avisos', emoji: '📣' },
      duvida: { label: 'Dúvida', plural: 'Dúvidas', emoji: '🤔' },
      ideia: { label: 'Ideia', plural: 'Ideias', emoji: '💡' },
  };
  const getCategoryKey = (cat) => (FORUM_CATEGORIES[cat] ? cat : 'geral');

  const userPosts = selectedUserFilter ? posts.filter(p => p.user_id === selectedUserFilter.id) : posts;
  const displayedPosts = categoryFilter === 'all' ? userPosts : userPosts.filter((p) => getCategoryKey(p.categoria) === categoryFilter);
  const feedTabs = [
      { id: 'all', label: 'Tudo', count: userPosts.length },
      ...['aviso', 'duvida', 'ideia', 'geral'].map((key) => ({
          id: key,
          label: FORUM_CATEGORIES[key].plural,
          count: userPosts.filter((p) => getCategoryKey(p.categoria) === key).length,
      })),
  ];
  const totalUnreadChats = Object.values(unreadByRoom).reduce((acc, value) => acc + Number(value || 0), 0);
  const firstName = String(userProfile?.nome || '').trim().split(/\s+/)[0];
  const typingNames = Object.keys(typingUsersById).map((typingUserId) => getChatSenderDisplayName(typingUserId)).filter(Boolean);
  const chatInputDisabled = !activeChatRoom?.id || chatSending || chatUploadingFile;
  const newChatDisabled = newChatLoading || (newChatType === 'group' && !newChatName.trim()) || (newChatType === 'private' && !selectedUserForChat);
  const peopleQuery = chatPeopleQuery.trim().toLowerCase();
  const filterPeople = (list) => (peopleQuery ? list.filter((c) => String(c.nome || '').toLowerCase().includes(peopleQuery)) : list);
  const addableCollaborators = chatCollaborators.filter((collab) => !existingGroupMemberIds.includes(collab.id));
  const timerLabel = activeLogTitle || 'Tempo a decorrer...';

  const openNewPostWithCategory = (categoria) => {
      openNewPostModal();
      setNewPost({ titulo: '', categoria });
  };

  const myPostsCount = posts.filter((p) => p.user_id === user?.id).length;

  const openNewPostWithImage = () => {
      openNewPostModal();
      setPostBlocks([createTextBlock(""), createImageBlock("lg")]);
  };

  const FEED_REACTIONS = ['👍', '❤️', '💡', '🚀', '😂', '😮', '😢'];
  const REACTION_LABELS = { '👍': 'Gosto', '❤️': 'Adoro', '💡': 'Inspirador', '🚀': 'Top', '😂': 'Haha', '😮': 'Uau', '😢': 'Triste' };
  const REACTION_COLORS = { '👍': '#2563eb', '❤️': '#e11d48', '💡': '#d97706', '🚀': '#7c3aed', '😂': '#d97706', '😮': '#d97706', '😢': '#d97706' };

  // Toque longo (telemóvel) abre o seletor de reações sem dar logo "Adoro"
  const startReactPress = (e, postId) => {
      if (e.pointerType !== 'touch') return;
      reactLongPressRef.current = false;
      clearTimeout(reactPressTimerRef.current);
      reactPressTimerRef.current = setTimeout(() => {
          reactLongPressRef.current = true;
          setFeedReactPicker(postId);
          if (navigator.vibrate) navigator.vibrate(12);
      }, 420);
  };
  const cancelReactPress = () => clearTimeout(reactPressTimerRef.current);

  const closeNewChatDialog = () => {
      setChatPeopleQuery('');
      closeNewChatModal();
  };

  const closeAddMembersDialog = () => {
      setChatPeopleQuery('');
      closeAddGroupMembersModal();
  };

  // Última atividade de cada sala: mensagem mais recente conhecida (ou a criação da sala)
  const getRoomLastMessage = (room) => {
      const known = lastMessageByRoom[room.id];
      if (activeChatRoom?.id === room.id && chatMessages.length) {
          const last = chatMessages[chatMessages.length - 1];
          if (last?.created_at && (!known || new Date(last.created_at) >= new Date(known.created_at))) return last;
      }
      return known || null;
  };
  const getRoomActivity = (room) => {
      const last = getRoomLastMessage(room);
      return new Date(last?.created_at || room.created_at || 0).getTime();
  };
  const sortedChatRooms = [...chatRooms].sort((a, b) => getRoomActivity(b) - getRoomActivity(a));
  const formatRoomTime = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (d >= startToday) return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
      const diffDays = Math.floor((startToday - d) / 86400000);
      if (diffDays < 1) return 'Ontem';
      if (diffDays < 6) return d.toLocaleDateString('pt-PT', { weekday: 'short' }).replace('.', '');
      return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  };
  // Ctrl+V de imagens (ou ficheiros) no chat: fica em pré-visualização pronta a enviar
  const handleChatPaste = (event) => {
      if (chatInputDisabled) return;
      const items = Array.from(event.clipboardData?.items || []);
      const fileItem = items.find((item) => item.kind === "file");
      const file = fileItem?.getAsFile();
      if (!file) return;
      event.preventDefault();
      let staged = file;
      // As capturas coladas chegam como "image.png": damos-lhes um nome com data/hora
      if (file.type.startsWith("image/") && (!file.name || /^image\.\w+$/i.test(file.name))) {
          const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg");
          const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
          staged = new File([file], `captura-${stamp}.${ext}`, { type: file.type });
      }
      setChatStagedFile(staged);
  };

  const getSenderAvatar = (senderId) => chatCollaborators.find((profile) => profile.id === senderId)?.avatar_url || null;

  const renderRoomItem = (room) => {
      const unreadCount = unreadByRoom[room.id] || 0;
      const title = room.display_title || room.nome || 'Conversa privada';
      return (
          <button
              key={room.id}
              type="button"
              onClick={() => openExistingRoom(room)}
              className={`fx-room ${activeChatRoom?.id === room.id && chatModal.show ? 'is-active' : ''} ${unreadCount ? 'has-unread' : ''}`}
              title={title}
          >
              <span className={`fx-avatar fx-avatar-sm ${room.is_group ? 'is-group' : ''}`}>
                  {renderAvatar(title, room.display_avatar_url || null, 38, '0.8rem')}
              </span>
              <span className="fx-room-text">
                  <span className="fx-room-top">
                      <span className="fx-room-title">{title}</span>
                      {getRoomLastMessage(room) && <span className="fx-room-time">{formatRoomTime(getRoomLastMessage(room).created_at)}</span>}
                  </span>
                  <span className="fx-room-bottom">
                      <span className="fx-room-sub">{room.is_group ? 'Grupo' : 'Conversa privada'}</span>
                      {unreadCount > 0 && <span className="fx-badge">{unreadCount}</span>}
                  </span>
              </span>
          </button>
      );
  };

  const renderPersonOption = (collab, selected, onToggle, multi) => (
      <button key={collab.id} type="button" onClick={onToggle} className={`fx-person ${selected ? 'is-selected' : ''}`} aria-pressed={selected}>
          <span className="fx-avatar fx-avatar-sm">{renderAvatar(collab.nome, collab.avatar_url, 36, '0.78rem')}</span>
          <span className="fx-person-name">{collab.nome}</span>
          <span className={`fx-check ${multi ? 'is-multi' : ''}`}><Icons.Check size={13} /></span>
      </button>
  );

  const renderReactionButtons = (post, emojis, { showEmpty }) =>
      emojis.map((emoji) => {
          const count = getReactionCounts(post.forum_reactions)[emoji] || 0;
          const hasReacted = post.forum_reactions?.find(r => r.user_id === user.id && r.reaction_type === emoji);
          if (!showEmpty && count === 0 && emoji !== '❤️') return null;
          return (
              <button
                  key={emoji}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFeedReactPicker(null); handleReact(emoji, post.id, post.forum_reactions); }}
                  className={`fx-react ${hasReacted ? 'is-mine' : ''}`}
                  title={hasReacted ? 'Remover reação' : 'Reagir'}
              >
                  <span className="fx-react-emoji">{emoji}</span>
                  <span className="fx-react-count">{count > 0 ? count : (showEmpty ? 0 : 'Gostar')}</span>
              </button>
          );
      });

  // --- Comentários estilo Instagram: fio de respostas + gostos ---
  const timeAgoShort = (iso) => {
      if (!iso) return '';
      const mins = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000));
      if (mins < 1) return 'agora';
      if (mins < 60) return `${mins} min`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} h`;
      const days = Math.floor(hrs / 24);
      if (days < 7) return `${days} d`;
      const weeks = Math.floor(days / 7);
      if (weeks < 5) return `${weeks} sem`;
      return new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
  };

  // Destaca "@Nome" no início de uma resposta
  const renderCommentText = (c, names) => {
      const text = String(c.conteudo || '');
      const mention = names.find((n) => n && text.startsWith(`@${n} `));
      if (!mention) return renderWithLinks(text);
      return (
          <>
              <span className="fx-mention">@{mention}</span> {renderWithLinks(text.slice(mention.length + 2))}
          </>
      );
  };

  const renderCommentThread = (list, { limit = null, onReply, onDelete, onToggleMore, showAll = false }) => {
      const ids = new Set(list.map((c) => c.id));
      const roots = list.filter((c) => !c.parent_id || !ids.has(c.parent_id));
      const repliesByRoot = {};
      list.forEach((c) => {
          if (c.parent_id && ids.has(c.parent_id)) (repliesByRoot[c.parent_id] = repliesByRoot[c.parent_id] || []).push(c);
      });
      const names = Array.from(new Set(list.map((c) => c.profiles?.nome).filter(Boolean))).sort((a, b) => b.length - a.length);
      const visibleRoots = limit ? roots.slice(0, limit) : roots;

      const row = (c, rootId, isReply) => {
          const likes = commentLikes[c.id] || [];
          const liked = likes.includes(user?.id);
          return (
              <div key={c.id} className={`fx-ig ${isReply ? 'is-reply' : ''}`} onDoubleClick={() => toggleCommentLike(c)}>
                  <span className={`fx-avatar ${isReply ? 'fx-avatar-xxs' : 'fx-avatar-xs'}`}>{renderAvatar(c.profiles?.nome, c.profiles?.avatar_url, isReply ? 24 : 32, '0.62rem')}</span>
                  <div className="fx-ig-body">
                      <div className="fx-ig-text">
                          <strong>{c.profiles?.nome}</strong> {renderCommentText(c, names)}
                      </div>
                      <div className="fx-ig-meta">
                          <span title={formatDate(c.created_at)}>{timeAgoShort(c.created_at)}</span>
                          {likes.length > 0 && <span className="fx-ig-likes">{likes.length} {likes.length === 1 ? 'gosto' : 'gostos'}</span>}
                          <button type="button" onClick={() => onReply(c, rootId)}>Responder</button>
                          {canDelete(c.user_id) && <button type="button" className="is-danger" onClick={() => onDelete(c)}>Apagar</button>}
                      </div>
                  </div>
                  {commentLikesAvailable && (
                      <button type="button" className={`fx-ig-heart ${liked ? 'is-on' : ''}`} onClick={() => toggleCommentLike(c)} aria-label={liked ? 'Retirar gosto' : 'Gostar do comentário'}>
                          <Icons.Heart size={14} fill={liked ? 'currentColor' : 'none'} />
                      </button>
                  )}
              </div>
          );
      };

      return (
          <div className="fx-ig-list">
              {visibleRoots.map((root) => {
                  const replies = repliesByRoot[root.id] || [];
                  const open = Boolean(expandedReplies[root.id]);
                  return (
                      <div key={root.id} className="fx-ig-thread">
                          {row(root, root.id, false)}
                          {replies.length > 0 && (
                              <div className="fx-ig-replies">
                                  <button type="button" className="fx-ig-toggle" onClick={() => setExpandedReplies((prev) => ({ ...prev, [root.id]: !open }))}>
                                      <span className="fx-ig-toggle-line" />
                                      {open ? 'Ocultar respostas' : `Ver ${replies.length === 1 ? 'resposta' : `${replies.length} respostas`}`}
                                  </button>
                                  {open && replies.map((r) => row(r, root.id, true))}
                              </div>
                          )}
                      </div>
                  );
              })}
              {limit && roots.length > limit && onToggleMore && (
                  <button type="button" className="fx-text-btn fx-more-comments" onClick={onToggleMore}>
                      {showAll ? 'Mostrar menos' : `Ver todos os ${list.length} comentários`}
                  </button>
              )}
              {showAll && onToggleMore && limit === null && roots.length > 3 && (
                  <button type="button" className="fx-text-btn fx-more-comments" onClick={onToggleMore}>Mostrar menos</button>
              )}
          </div>
      );
  };

  const renderReplyChip = (target, onCancel) => target?.nome && (
      <div className="fx-reply-chip">
          <span>A responder a <strong>{target.nome}</strong></span>
          <button type="button" onClick={onCancel} aria-label="Cancelar resposta"><Icons.Close size={14} /></button>
      </div>
  );

    return (
        <div className="page-container fx-page">

          {/* --- HERO (compacto) --- */}
          <header className="fx-hero fx-hero-compact">
            <div className="fx-hero-bg" aria-hidden="true">
                <span className="fx-orb fx-orb-a" />
                <span className="fx-orb fx-orb-b" />
                <span className="fx-hero-grid" />
            </div>

            <div className="fx-hero-top">
                <div className="fx-hero-main">
                    <span className="fx-hero-icon"><Icons.Message size={22} /></span>
                    <div className="fx-hero-copy">
                        <h1 className="fx-hero-title">Comunicação Interna</h1>
                        <p className="fx-hero-sub">Fórum de partilha de informações e discussões</p>
                    </div>
                </div>

                <div className="fx-hero-side">
                    <div className="fx-hero-stats">
                        <span className="fx-stat"><strong>{posts.length}</strong> publicações</span>
                        <span className="fx-stat"><strong>{chatRooms.length}</strong> conversas</span>
                        {totalUnreadChats > 0 && <span className="fx-stat is-alert"><strong>{totalUnreadChats}</strong> por ler</span>}
                    </div>
                    {activeLog && (
                        <div onClick={() => navigate(activeLogRoute || '/dashboard/tarefas')} title="Ir para o item com cronometro em curso" className="fx-live">
                            <span className="fx-live-dot" />
                            <span className="fx-live-title">{timerLabel.length > 30 ? `${timerLabel.slice(0, 30)}...` : timerLabel}</span>
                            <button type="button" onClick={openStopNoteModal} className="fx-live-stop"><Icons.Stop /> Parar</button>
                        </div>
                    )}
                </div>
            </div>
          </header>

      {/* --- 3 COLUNAS: perfil + filtros | feed | chats --- */}
      <div className="fx-layout fx-layout-3">

      <aside className="fx-left">
          <div className="fx-me">
              <div className="fx-me-cover" aria-hidden="true" />
              <span className="fx-avatar fx-me-avatar">{renderAvatar(userProfile?.nome, userProfile?.avatar_url, 64, '1.2rem')}</span>
              <strong className="fx-me-name">{userProfile?.nome || 'Utilizador'}</strong>
              {userProfile?.funcao && <span className="fx-me-role">{userProfile.funcao}</span>}
              <div className="fx-me-stats">
                  <div><strong>{myPostsCount}</strong><span>publicações</span></div>
                  <div><strong>{chatRooms.length}</strong><span>conversas</span></div>
              </div>
              <button
                  type="button"
                  className={`fx-me-link ${selectedUserFilter?.id === user?.id ? 'is-on' : ''}`}
                  onClick={() => (selectedUserFilter?.id === user?.id ? setSelectedUserFilter(null) : setSelectedUserFilter({ id: user?.id, nome: userProfile?.nome || 'Tu' }))}
              >
                  <Icons.User size={15} /> {selectedUserFilter?.id === user?.id ? 'Ver todas as publicações' : 'As minhas publicações'}
              </button>
          </div>

          <nav className="fx-nav" aria-label="Filtrar publicações">
              <p className="fx-nav-title">Feed</p>
              {feedTabs.map((tab) => (
                  <button
                      key={tab.id}
                      type="button"
                      className={`fx-nav-item ${tab.id !== 'all' ? `fx-cat-${tab.id}` : ''} ${categoryFilter === tab.id ? 'is-on' : ''}`}
                      onClick={() => setCategoryFilter(tab.id)}
                      aria-pressed={categoryFilter === tab.id}
                  >
                      <span className={`fx-nav-icon fx-tile fx-tile-${tab.id}`} aria-hidden="true"><CatIcon k={tab.id} size={16} /></span>
                      <span className="fx-nav-label">{tab.label}</span>
                      <span className="fx-nav-count">{tab.count}</span>
                  </button>
              ))}
          </nav>
      </aside>

      <div className="fx-feed">

        {/* Compositor */}
        <div className="fx-composer-card fx-composer-v4">
            <span className="fx-avatar fx-avatar-md">{renderAvatar(userProfile?.nome, userProfile?.avatar_url, 44, '1rem')}</span>
            <button type="button" className="fx-composer-fake" onClick={openNewPostModal}>
                Em que estás a pensar{firstName ? `, ${firstName}` : ''}?
            </button>
            <div className="fx-composer-quick">
                <button type="button" className="fx-quick fx-quick-photo" onClick={openNewPostWithImage}>
                    <span className="fx-tile fx-tile-sm fx-tile-photo"><Icons.Image size={13} /></span> Foto
                </button>
                {['aviso', 'duvida', 'ideia'].map((key) => (
                    <button key={key} type="button" className={`fx-quick fx-cat-${key}`} onClick={() => openNewPostWithCategory(key)}>
                        <span className={`fx-tile fx-tile-sm fx-tile-${key}`}><CatIcon k={key} size={13} /></span> {FORUM_CATEGORIES[key].label}
                    </button>
                ))}
            </div>
        </div>



        {selectedUserFilter && (
           <div className="fx-filter-banner">
               <span className="fx-filter-icon"><Icons.User /></span>
               <span className="fx-filter-text">A ver as publicações de <strong>{selectedUserFilter.nome}</strong></span>
               <button type="button" onClick={() => setSelectedUserFilter(null)} className="fx-btn fx-btn-ghost fx-btn-sm">Ver tudo</button>
           </div>
        )}

        {loading && posts.length === 0 && (
            <div className="fx-skeletons" aria-label="A carregar publicações">
                {[0, 1].map((k) => (
                    <div key={k} className="fx-post fx-post-skeleton">
                        <div className="fx-sk-row"><span className="fx-sk fx-sk-avatar" /><span className="fx-sk-lines"><span className="fx-sk" /><span className="fx-sk" /></span></div>
                        <span className="fx-sk fx-sk-title" />
                        <span className="fx-sk fx-sk-text" />
                        <span className="fx-sk fx-sk-text is-short" />
                    </div>
                ))}
            </div>
        )}

        {displayedPosts.length === 0 && !loading && (
            <div className="fx-empty">
                <span className="fx-empty-icon"><Icons.Message size={30} /></span>
                <h4>{categoryFilter === 'all' ? 'Ainda não há publicações.' : `Sem ${FORUM_CATEGORIES[categoryFilter]?.plural.toLowerCase() || 'publicações'} por aqui.`}</h4>
                <p>Sê o primeiro a partilhar algo!</p>
                <button type="button" className="fx-btn fx-btn-primary" onClick={() => (categoryFilter === 'all' ? openNewPostModal() : openNewPostWithCategory(categoryFilter))}>
                    <Icons.Plus size={15} /> Criar publicação
                </button>
            </div>
        )}

        {displayedPosts.map((post, postIndex) => {
            const postComments = postCommentsByPost[post.id] || [];
            const commentsLoaded = Boolean(postCommentsByPost[post.id]);
            const showCommentBox = Boolean(inlineCommentOpen[post.id]);
            const showAllComments = Boolean(inlineCommentExpanded[post.id]);
            const catKey = getCategoryKey(post.categoria);
            const commentCount = post.forum_comments?.[0]?.count || 0;
            const openAuthor = (e) => { e.stopPropagation(); setSelectedUserFilter({ id: post.user_id, nome: post.profiles?.nome }); };
            const reactions = post.forum_reactions || [];
            const reactionCounts = getReactionCounts(reactions);
            const topEmojis = Object.entries(reactionCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([emoji]) => emoji);
            const myReaction = reactions.find((r) => r.user_id === user.id)?.reaction_type || null;

            return (
            <article key={post.id} className={`fx-post fx-post-${catKey} ${catKey === 'aviso' ? 'is-highlight' : ''}`} style={{ '--i': Math.min(postIndex, 6) }}>
                {catKey === 'aviso' && (
                    <div className="fx-post-ribbon"><span className="fx-tile fx-tile-sm fx-tile-aviso"><CatIcon k="aviso" size={12} /></span> Aviso importante</div>
                )}

                {/* CABEÇALHO DO POST */}
                <header className="fx-post-head">
                    <button type="button" onClick={openAuthor} className="fx-avatar fx-avatar-md fx-avatar-btn" title={`Ver publicações de ${post.profiles?.nome}`}>
                        {renderAvatar(post.profiles?.nome, post.profiles?.avatar_url, 44, '0.95rem')}
                    </button>
                    <div className="fx-post-meta">
                        <button type="button" onClick={openAuthor} className="fx-link-name">{post.profiles?.nome}</button>
                        <div className="fx-post-sub">
                            <span className="fx-post-time">{formatDate(post.created_at)}</span>
                            {catKey !== 'aviso' && <><span className="fx-dot-sep" aria-hidden="true" />{getCategoryBadge(post.categoria)}</>}
                        </div>
                    </div>

                    <div className="fx-post-tools">
                        {canEdit(post.user_id) && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleStartEdit(post); }} className="fx-icon-btn" title="Editar Publicação">
                                <Icons.Edit size={16} />
                            </button>
                        )}
                        {canDelete(post.user_id) && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); requestDelete(post.id, 'post'); }} className="fx-icon-btn is-danger" title="Apagar Publicação">
                                <Icons.Trash />
                            </button>
                        )}
                    </div>
                </header>

                {/* CORPO DO POST */}
                <div className="fx-post-body">
                    <h3 className="fx-post-title">
                        <button type="button" onClick={() => handleOpenPost(post)} title="Abrir discussão">{post.titulo}</button>
                    </h3>
                    {renderPostBlocks(post, { imageMaxHeight: 620 })}
                </div>

                {/* RESUMO: reações e comentários */}
                {(reactions.length > 0 || commentCount > 0) && (
                    <div className="fx-post-summary">
                        {reactions.length > 0 ? (
                            <span className="fx-summary-reacts" title={Object.entries(reactionCounts).map(([emoji, n]) => `${emoji} ${n}`).join('   ')}>
                                <span className="fx-summary-emojis">
                                    {topEmojis.map((emoji) => <span key={emoji}>{emoji}</span>)}
                                </span>
                                {myReaction
                                    ? (reactions.length > 1 ? `Tu e mais ${reactions.length - 1}` : 'Tu')
                                    : reactions.length}
                            </span>
                        ) : <span />}
                        {commentCount > 0 && (
                            <button type="button" className="fx-summary-comments" onClick={() => toggleInlineComments(post.id)}>
                                {commentCount} {commentCount === 1 ? 'comentário' : 'comentários'}
                            </button>
                        )}
                    </div>
                )}

                {/* BARRA DE AÇÕES */}
                <div className="fx-post-bar">
                    <div
                        className={`fx-like-wrap ${feedReactPicker === post.id ? 'is-open' : ''}`}
                        onMouseLeave={() => { if (feedReactPicker === post.id) setFeedReactPicker(null); }}
                    >
                        <button
                            type="button"
                            className={`fx-bar-btn fx-like-btn ${myReaction ? 'is-on' : ''}`}
                            style={myReaction ? { '--react-color': REACTION_COLORS[myReaction] } : undefined}
                            onPointerDown={(e) => startReactPress(e, post.id)}
                            onPointerUp={cancelReactPress}
                            onPointerLeave={cancelReactPress}
                            onContextMenu={(e) => e.preventDefault()}
                            onClick={() => {
                                if (reactLongPressRef.current) { reactLongPressRef.current = false; return; }
                                setFeedReactPicker(null);
                                handleReact(myReaction || '❤️', post.id, reactions);
                            }}
                        >
                            {myReaction
                                ? <span className="fx-like-emoji" key={myReaction}>{myReaction}<span className="fx-like-burst" aria-hidden="true" /></span>
                                : <Icons.Heart size={19} />}
                            <span>{myReaction ? (REACTION_LABELS[myReaction] || 'Reagiste') : 'Gostar'}</span>
                        </button>
                        <div className="fx-react-dock" role="menu" aria-label="Escolher reação">
                            {FEED_REACTIONS.map((emoji, i) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    style={{ '--k': i }}
                                    className={myReaction === emoji ? 'is-on' : ''}
                                    data-label={REACTION_LABELS[emoji]}
                                    aria-label={REACTION_LABELS[emoji]}
                                    onClick={() => { setFeedReactPicker(null); handleReact(emoji, post.id, reactions); }}
                                >
                                    <span>{emoji}</span>
                                </button>
                            ))}
                        </div>
                        {feedReactPicker === post.id && <div className="fx-click-away" onClick={() => setFeedReactPicker(null)} />}
                    </div>

                    <button type="button" onClick={() => toggleInlineComments(post.id)} className={`fx-bar-btn ${showCommentBox ? 'is-active' : ''}`}>
                        <Icons.Message size={17} /> <span>Comentar</span>
                    </button>
                    <button type="button" onClick={() => handleOpenPost(post)} className="fx-bar-btn">
                        <Icons.Expand size={16} /> <span>Abrir discussão</span>
                    </button>
                </div>

                {showCommentBox && (
                    <div className="fx-comments">
                        {loadingInlineComments[post.id] && (
                            <div className="fx-comments-note"><span className="fx-spinner is-dark" /> A carregar comentários...</div>
                        )}

                        {!loadingInlineComments[post.id] && commentsLoaded && postComments.length === 0 && (
                            <div className="fx-comments-note">Ainda sem comentários. Começa tu a conversa.</div>
                        )}

                        {!loadingInlineComments[post.id] && postComments.length > 0 && renderCommentThread(postComments, {
                            limit: showAllComments ? null : 3,
                            onReply: (c, rootId) => setReplyTargetByPost((prev) => ({ ...prev, [post.id]: { id: c.id, nome: c.profiles?.nome || 'Utilizador', rootId } })),
                            onDelete: (c) => requestDelete(c.id, 'comment', post.id),
                            onToggleMore: () => setInlineCommentExpanded((prev) => ({ ...prev, [post.id]: !showAllComments })),
                            showAll: showAllComments,
                        })}

                        {renderReplyChip(replyTargetByPost[post.id], () => setReplyTargetByPost((prev) => ({ ...prev, [post.id]: null })))}

                        <form onSubmit={(e) => handleSendInlineComment(e, post.id)} className="fx-comment-form">
                            <span className="fx-avatar fx-avatar-xs">{renderAvatar(userProfile?.nome, userProfile?.avatar_url, 30, '0.75rem')}</span>
                            <div className="fx-input-pill">
                                <input
                                    type="text"
                                    value={inlineCommentDrafts[post.id] || ''}
                                    onChange={(e) => setInlineCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                                    placeholder={replyTargetByPost[post.id]?.nome ? `Responder a ${replyTargetByPost[post.id].nome}...` : 'Escreve um comentário...'}
                                />
                                <button type="submit" className="fx-send" disabled={!String(inlineCommentDrafts[post.id] || '').trim()} aria-label="Enviar comentário">
                                    <Icons.Send size={15} />
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </article>
            );
        })}
      </div>

      <aside className="fx-chats">
          <div className="fx-chats-head">
              <div>
                  <h4>Chats internos</h4>
                  <p>{chatRooms.length} {chatRooms.length === 1 ? 'conversa' : 'conversas'}</p>
              </div>
              {totalUnreadChats > 0 && <span className="fx-badge fx-badge-lg">{totalUnreadChats} nova{totalUnreadChats === 1 ? '' : 's'}</span>}
          </div>

          <button type="button" onClick={() => setShowNewChatModal(true)} className="fx-btn fx-btn-primary fx-btn-block">
              <Icons.Plus size={16} /> Novo chat
          </button>

          <div className="fx-room-list custom-scrollbar">
              {chatRooms.length > 0 ? sortedChatRooms.map(renderRoomItem) : (
                  <div className="fx-rooms-empty">
                      <Icons.Message size={22} />
                      <span>Ainda não criaste chats.</span>
                  </div>
              )}
          </div>
      </aside>
      </div>

      {/* --- MODAL NOVO CHAT --- */}
      {showNewChatModal && (
          <ModalPortal>
              <div className="fx-overlay" style={{ zIndex: 1000001 }} onClick={closeNewChatDialog}>
                  <div className="fx-modal fx-modal-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Novo chat">
                      <div className="fx-modal-head">
                          <div>
                              <p className="fx-kicker">Novo chat</p>
                              <h3>Com quem queres falar?</h3>
                          </div>
                          <button type="button" onClick={closeNewChatDialog} className="fx-close" aria-label="Fechar"><Icons.Close size={18} /></button>
                      </div>

                      <div className="fx-modal-body">
                          {chatError && <div className="fx-alert">{chatError}</div>}

                          <div className="fx-segment" data-value={newChatType}>
                              <span className="fx-segment-pill" aria-hidden="true" />
                              <button type="button" className={newChatType === 'private' ? 'is-on' : ''} onClick={() => { setNewChatType('private'); setSelectedUsersForGroupChat([]); }}>
                                  <Icons.User size={15} /> Privado
                              </button>
                              <button type="button" className={newChatType === 'group' ? 'is-on' : ''} onClick={() => { setNewChatType('group'); setSelectedUserForChat(null); }}>
                                  <Icons.Users size={15} /> Grupo
                              </button>
                          </div>

                          {newChatType === 'group' && (
                              <label className="fx-field">
                                  <span className="fx-label">Nome do grupo</span>
                                  <input type="text" className="fx-input" value={newChatName} onChange={(e) => setNewChatName(e.target.value)} placeholder="Ex: Equipa de Vendas" />
                              </label>
                          )}

                          <div className="fx-field">
                              <span className="fx-label">
                                  {newChatType === 'group' ? `Membros · ${selectedUsersForGroupChat.length} selecionado(s)` : 'Escolhe um colega'}
                              </span>
                              <div className="fx-search">
                                  <Icons.Search size={16} />
                                  <input type="text" value={chatPeopleQuery} onChange={(e) => setChatPeopleQuery(e.target.value)} placeholder="Procurar colega..." />
                              </div>
                              <div className="fx-people custom-scrollbar">
                                  {chatCollaborators.length === 0 && <div className="fx-people-empty">Sem colaboradores disponíveis.</div>}
                                  {chatCollaborators.length > 0 && filterPeople(chatCollaborators).length === 0 && <div className="fx-people-empty">Ninguém com esse nome.</div>}
                                  {filterPeople(chatCollaborators).map((collab) => (
                                      newChatType === 'group'
                                          ? renderPersonOption(collab, selectedUsersForGroupChat.includes(collab.id), () => toggleGroupParticipant(collab.id), true)
                                          : renderPersonOption(collab, selectedUserForChat?.id === collab.id, () => setSelectedUserForChat(collab), false)
                                  ))}
                              </div>
                          </div>
                      </div>

                      <div className="fx-modal-foot">
                          <button type="button" onClick={closeNewChatDialog} className="fx-btn fx-btn-ghost">Cancelar</button>
                          <button type="button" onClick={createNewChat} disabled={newChatDisabled} className="fx-btn fx-btn-primary">
                              {newChatLoading ? <><span className="fx-spinner" /> A criar...</> : 'Criar chat'}
                          </button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* --- MODAL NOVO POST (estilo rede social) --- */}
      {showNewPostModal && (
        <ModalPortal>
            <div className="fx-overlay" style={{ zIndex: 99999 }}>
                <div className={`fx-modal fx-modal-post ${editingPost ? 'is-editing' : ''}`} role="dialog" aria-label={editingPost ? 'Editar publicação' : 'Criar publicação'}>
                    <div className="fx-pm-head">
                        <span className="fx-pm-head-spacer" />
                        <h3>{editingPost ? 'Editar publicação' : 'Criar publicação'}</h3>
                        <button type="button" onClick={closeNewPostModal} className="fx-close" aria-label="Fechar"><Icons.Close size={18} /></button>
                    </div>

                    <form
                        onSubmit={handleCreatePost}
                        onPaste={handleComposerPaste}
                        className="fx-pm"
                        onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "copy";
                        }}
                        onDrop={handleComposerDrop}
                    >
                        <div className="fx-pm-scroll custom-scrollbar">
                            <div className="fx-pm-author">
                                <span className="fx-avatar fx-avatar-md">{renderAvatar(userProfile?.nome, userProfile?.avatar_url, 44, '1rem')}</span>
                                <div className="fx-pm-author-text">
                                    <strong>{userProfile?.nome || 'Utilizador'}</strong>
                                    <div className="fx-pm-cats" role="radiogroup" aria-label="Categoria">
                                        {['geral', 'aviso', 'duvida', 'ideia'].map((key) => (
                                            <button
                                                key={key}
                                                type="button"
                                                role="radio"
                                                aria-checked={newPost.categoria === key}
                                                className={`fx-pm-cat fx-cat-${key} ${newPost.categoria === key ? 'is-on' : ''}`}
                                                onClick={() => setNewPost({ ...newPost, categoria: key })}
                                            >
                                                <span className={`fx-tile fx-tile-sm fx-tile-${key}`}><CatIcon k={key} size={13} /></span> {FORUM_CATEGORIES[key].label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <input
                                type="text"
                                value={newPost.titulo}
                                onChange={e => setNewPost({ ...newPost, titulo: e.target.value })}
                                required
                                className="fx-pm-title"
                                placeholder="Dá um título à publicação"
                                autoFocus
                            />

                            <div className="fx-pm-blocks">
                                {postBlocks.map((block, idx) => {
                                    const imageUrl = block.previewUrl || block.uploadedUrl;
                                    return (
                                        <div
                                            key={block.id}
                                            draggable={postBlocks.length > 1}
                                            onDragStart={() => handleBlockDragStart(idx)}
                                            onDragOver={(event) => handleBlockDragOver(event, idx)}
                                            onDrop={(event) => handleBlockDrop(event, idx)}
                                            onDragEnd={handleBlockDragEnd}
                                            className={`fx-pm-block is-${block.type} ${dragOverBlockIndex === idx && draggedBlockIndex !== null ? 'is-over' : ''} ${draggedBlockIndex === idx ? 'is-dragging' : ''}`}
                                        >
                                            <div className="fx-pm-tools">
                                                {postBlocks.length > 1 && (
                                                    <span className="fx-pm-grip" title="Arrastar para reordenar"><Icons.GripVertical size={13} /></span>
                                                )}
                                                {block.type === 'text' ? (
                                                    <select value={block.align || 'left'} onChange={(e) => updateTextBlockAlignment(block.id, e.target.value)} className="fx-pm-select" title="Alinhamento">
                                                        {TEXT_ALIGNMENT_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <select value={block.size || 'lg'} onChange={(e) => updateImageBlockSize(block.id, e.target.value)} className="fx-pm-select" title="Tamanho">
                                                        {IMAGE_SIZE_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                )}
                                                {(postBlocks.length > 1 || block.type === 'image') && (
                                                    <button type="button" onClick={() => removeBlock(idx)} className="fx-pm-tool-btn" title="Remover bloco" aria-label="Remover bloco">
                                                        <Icons.Close size={13} />
                                                    </button>
                                                )}
                                            </div>

                                            {block.type === 'text' ? (
                                                <textarea
                                                    rows={idx === 0 ? 4 : 2}
                                                    value={block.text}
                                                    onChange={(e) => updateTextBlock(block.id, e.target.value)}
                                                    style={{ textAlign: block.align || 'left' }}
                                                    className={`fx-pm-text ${idx === 0 && postBlocks.length === 1 && block.text.length < 90 ? 'is-big' : ''}`}
                                                    placeholder={idx === 0 ? `Em que estás a pensar${firstName ? `, ${firstName}` : ''}?` : 'Continua a escrever...'}
                                                />
                                            ) : imageUrl ? (
                                                <div className="fx-pm-image" style={{ maxWidth: getImageSizeConfig(block.size).maxWidth }}>
                                                    <img src={imageUrl} alt="Pré-visualização" />
                                                    <label className="fx-pm-image-swap">
                                                        <Icons.Image size={14} /> Trocar
                                                        <input type="file" accept="image/*" onChange={(e) => updateImageBlockFile(block.id, e.target.files?.[0])} style={{ display: 'none' }} />
                                                    </label>
                                                </div>
                                            ) : (
                                                <label className="fx-pm-drop">
                                                    <span className="fx-pm-drop-icon"><Icons.Image size={22} /></span>
                                                    <strong>Adicionar foto</strong>
                                                    <small>ou arrasta para aqui · cola com Ctrl+V</small>
                                                    <input type="file" accept="image/*" onChange={(e) => updateImageBlockFile(block.id, e.target.files?.[0])} style={{ display: 'none' }} />
                                                </label>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="fx-pm-add">
                            <span>Adicionar à publicação</span>
                            <div className="fx-pm-add-btns">
                                <button type="button" onClick={addImageBlock} className="fx-pm-add-btn is-photo" title="Foto">
                                    <Icons.Image size={20} />
                                </button>
                                <button type="button" onClick={addTextBlock} className="fx-pm-add-btn is-text" title="Novo parágrafo">
                                    ¶
                                </button>
                            </div>
                        </div>

                        <div className="fx-pm-foot">
                            <button type="submit" disabled={isUploading || !newPost.titulo.trim()} className="fx-btn fx-btn-primary fx-btn-block fx-pm-submit">
                                {isUploading ? (
                                    <><span className="fx-spinner" /> {editingPost ? "A guardar..." : "A publicar..."}</>
                                ) : (
                                    editingPost ? "Guardar alterações" : "Publicar"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </ModalPortal>
      )}

      {/* --- MODAL DE DETALHE DO POST --- */}
      {selectedPost && (
        <ModalPortal>
            <div className="fx-overlay" style={{ zIndex: 99999 }} onClick={() => setSelectedPost(null)}>
            <div className="fx-modal fx-modal-detail" onClick={e => e.stopPropagation()} role="dialog" aria-label="Discussão">
                <div className="fx-modal-head">
                    <div>
                        <p className="fx-kicker">Discussão aberta</p>
                        <h3 className="fx-ellipsis">{selectedPost.titulo}</h3>
                    </div>
                    <button type="button" onClick={() => setSelectedPost(null)} className="fx-close" aria-label="Fechar"><Icons.Close size={18} /></button>
                </div>

                <div className="fx-detail">
                    {/* ESQUERDA: POST ORIGINAL */}
                    <div className={`fx-detail-post fx-post-${getCategoryKey(selectedPost.categoria)} custom-scrollbar`}>
                        <div className="fx-post-head">
                            <span className="fx-avatar fx-avatar-lg">{renderAvatar(selectedPost.profiles?.nome, selectedPost.profiles?.avatar_url, 52, '1rem')}</span>
                            <div className="fx-post-meta">
                                <div className="fx-post-author">
                                    <strong className="fx-detail-author">{selectedPost.profiles?.nome}</strong>
                                    {getCategoryBadge(selectedPost.categoria)}
                                </div>
                                <span className="fx-post-time">{formatDate(selectedPost.created_at)}</span>
                            </div>
                        </div>

                        <h2 className="fx-detail-title">{selectedPost.titulo}</h2>
                        <div className="fx-detail-body">
                            {renderPostBlocks(selectedPost, { imageMaxHeight: 560 })}
                        </div>

                        <div className="fx-detail-reactions">
                            {renderReactionButtons(selectedPost, ['👍', '❤️', '💡', '🚀', '😂', '😮', '😢'], { showEmpty: true })}
                        </div>
                    </div>

                    {/* DIREITA: COMENTÁRIOS */}
                    <div className="fx-thread">
                        <div className="fx-thread-head">
                            <Icons.Message size={17} /> Comentários <span className="fx-count">{comments.length}</span>
                        </div>

                        <div className="fx-thread-list custom-scrollbar">
                            {comments.length > 0 && renderCommentThread(comments, {
                                limit: null,
                                onReply: (c, rootId) => setModalReplyTarget({ id: c.id, nome: c.profiles?.nome || 'Utilizador', rootId }),
                                onDelete: (c) => requestDelete(c.id, 'comment', selectedPost?.id || null),
                            })}
                            {comments.length === 0 && (
                                <div className="fx-thread-empty">
                                    <span className="fx-empty-icon"><Icons.Message size={26} /></span>
                                    <p>Sê o primeiro a comentar.</p>
                                </div>
                            )}
                        </div>

                        <div className="fx-thread-form">
                            {renderReplyChip(modalReplyTarget, () => setModalReplyTarget(null))}
                            <form onSubmit={handleSendComment} className="fx-input-pill fx-input-pill-lg">
                                <input type="text" placeholder={modalReplyTarget?.nome ? `Responder a ${modalReplyTarget.nome}...` : 'Escreve uma resposta...'} value={newCommentText} onChange={e => setNewCommentText(e.target.value)} />
                                <button type="submit" className="fx-send" disabled={!newCommentText.trim()} aria-label="Enviar">
                                    <Icons.Send size={17} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </ModalPortal>
      )}

      {/* --- MODAL DE CHAT --- */}
      {chatModal.show && (
    <ModalPortal>
        <div className="fx-overlay fx-overlay-chat" style={{ zIndex: 999999 }} onClick={closeInternalChatModal}>
            <div className="fx-chat" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Chats internos">
                <aside className="fx-chat-rooms">
                    <div className="fx-chat-rooms-head">
                        <h3>Conversas</h3>
                        <button type="button" onClick={() => setShowNewChatModal(true)} className="fx-icon-btn fx-icon-btn-solid" title="Novo chat" aria-label="Novo chat">
                            <Icons.Plus size={16} />
                        </button>
                    </div>

                    <div className="fx-room-list custom-scrollbar">
                        {chatRooms.length > 0 ? sortedChatRooms.map(renderRoomItem) : (
                            <div className="fx-rooms-empty"><span>Ainda não criaste chats.</span></div>
                        )}
                    </div>
                </aside>

                <section
                    className="fx-chat-main"
                    onDragEnter={handleChatDragEnter}
                    onDragOver={handleChatDragOver}
                    onDragLeave={handleChatDragLeave}
                    onDrop={handleChatDrop}
                >
                    {isDraggingChatFile && (
                        <div className="fx-chat-drop">
                            <span className="fx-chat-drop-icon"><Icons.Paperclip size={36} /></span>
                            <h3>Larga o ficheiro para enviar</h3>
                        </div>
                    )}

                    <header className="fx-chat-head">
                        <span className={`fx-avatar fx-avatar-md ${activeChatRoom?.is_group ? 'is-group' : ''}`}>
                            {renderAvatar(chatModal.target?.title || 'Chat', chatModal.target?.avatar_url || null, 42, '0.9rem')}
                        </span>
                        <div className="fx-chat-head-text">
                            <h3>{chatModal.target?.title || 'Seleciona um chat'}</h3>
                            <p className={typingNames.length ? 'is-typing' : ''}>
                                {typingNames.length
                                    ? `${typingNames.join(', ') || 'Alguém'} a escrever...`
                                    : (chatModal.target?.subtitle || (activeChatRoom?.id ? 'Conversa' : 'Sem sala ativa'))}
                            </p>
                        </div>
                        {activeChatRoom?.is_group && (
                            <button type="button" onClick={openAddGroupMembersModal} className="fx-btn fx-btn-ghost fx-btn-sm">
                                <Icons.Plus size={14} /> <span className="fx-hide-sm">Adicionar pessoas</span>
                            </button>
                        )}
                        <button type="button" onClick={closeInternalChatModal} className="fx-close" aria-label="Fechar"><Icons.Close size={18} /></button>
                    </header>

                    {chatError && <div className="fx-alert fx-chat-alert">{chatError}</div>}

                    <div ref={chatMessagesContainerRef} className="fx-chat-messages custom-scrollbar">
                        {chatLoading && <div className="fx-chat-note"><span className="fx-spinner is-dark" /> A carregar mensagens...</div>}

                        {!chatLoading && chatMessages.length === 0 && (
                            <div className="fx-chat-empty">
                                <span className="fx-empty-icon"><Icons.Message size={28} /></span>
                                <strong>Sem mensagens nesta conversa.</strong>
                                <span>Diz olá 👋</span>
                            </div>
                        )}

                        {!chatLoading && chatMessages.map((msg, index) => {
                            const mine = msg.sender_id === user.id;
                            const isGroup = Boolean(activeChatRoom?.is_group);
                            const tick = getMessageReadTick(msg);

                            // LÓGICA DE AGRUPAMENTO
                            const prevMsg = chatMessages[index - 1];
                            const nextMsg = chatMessages[index + 1];
                            const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                            const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;
                            const hasReactions = msg.chat_reactions && msg.chat_reactions.length > 0;

                            // VERIFICA QUAL É A TUA REAÇÃO ATUAL
                            const myCurrentReaction = msg.chat_reactions?.find(r => r.user_id === user.id)?.emoji;
                            const isImage = msg.file_url && msg.file_name && /\.(jpeg|jpg|gif|png|webp|svg)$/i.test(msg.file_name);
                            const timeLabel = formatDate(msg.created_at || new Date().toISOString());

                            return (
                                <div
                                    key={msg.id}
                                    className={`fx-msg-row ${mine ? 'is-mine' : ''} ${isFirstInGroup ? 'is-first' : ''} ${isLastInGroup ? 'is-last' : ''} ${hasReactions ? 'has-reactions' : ''}`}
                                >
                                    {!mine && isGroup && (
                                        <span className="fx-msg-avatar">
                                            {isLastInGroup && <span className="fx-avatar fx-avatar-xs">{renderAvatar(getChatSenderDisplayName(msg.sender_id), getSenderAvatar(msg.sender_id), 28, '0.62rem')}</span>}
                                        </span>
                                    )}

                                    <div className={`fx-bubble ${isImage && !msg.content ? 'is-media' : ''}`}>

                                        {/* BOTÃO FLUTUANTE DE HOVER */}
                                        {reactionMenuMessageId !== msg.id && (
                                            <button
                                                type="button"
                                                title="Reagir"
                                                className="fx-bubble-react"
                                                onClick={(e) => { e.stopPropagation(); setReactionMenuMessageId(msg.id); }}
                                            >
                                                <Icons.Smile size={17} />
                                            </button>
                                        )}

                                        {/* MENU RÁPIDO DE REAÇÕES */}
                                        {reactionMenuMessageId === msg.id && (
                                            <>
                                                <div className="fx-click-away" onClick={(e) => { e.stopPropagation(); setReactionMenuMessageId(null); }} />
                                                <div className="fx-react-menu fx-react-menu-chat">
                                                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            type="button"
                                                            className={myCurrentReaction === emoji ? 'is-on' : ''}
                                                            onClick={(e) => { e.stopPropagation(); handleChatReaction(msg.id, emoji); }}
                                                            title={myCurrentReaction === emoji ? "Remover reação" : "Reagir"}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        {/* REMETENTE, FICHEIROS E TEXTO */}
                                        {isGroup && isFirstInGroup && !mine && (
                                            <div className="fx-bubble-sender">{getChatSenderDisplayName(msg.sender_id)}</div>
                                        )}

                                        {msg.file_url && (
                                            isImage ? (
                                                <a href={msg.file_url} target="_blank" rel="noreferrer" className="fx-bubble-image">
                                                    <img src={msg.file_url} alt={msg.file_name} />
                                                </a>
                                            ) : (
                                                <div className="fx-bubble-file">
                                                    <a href={msg.file_url} target="_blank" rel="noreferrer">
                                                        <span className="fx-file-icon"><Icons.Paperclip size={16} /></span>
                                                        <span className="fx-file-name">{msg.file_name || 'Documento'}</span>
                                                    </a>
                                                    {msg.requires_sig && !msg.is_signed && <span className="fx-file-tag is-warn">Aguarda assinatura</span>}
                                                    {msg.is_signed && <span className="fx-file-tag is-ok">Assinado</span>}
                                                </div>
                                            )
                                        )}

                                        <div className="fx-bubble-line">
                                            {msg.content && <div className="fx-bubble-text">{msg.content}</div>}
                                            <span className="fx-bubble-meta">
                                                {timeLabel.includes(' às ') ? timeLabel.split(' às ')[1] : timeLabel}
                                                {mine && <span className={`fx-tick ${tick === '✓✓' ? 'is-read' : ''}`}>{tick}</span>}
                                            </span>
                                        </div>

                                        {/* MOSTRAR AS REAÇÕES PRESAS À BOLHA */}
                                        {hasReactions && (
                                            <div className="fx-bubble-reactions">
                                                {Array.from(new Set(msg.chat_reactions.map(r => r.emoji))).map((emoji, i) => (
                                                    <span key={i}>{emoji}</span>
                                                ))}
                                                {msg.chat_reactions.length > 1 && <span className="fx-bubble-reactions-count">{msg.chat_reactions.length}</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ZONA DE PREVIEW DOS FICHEIROS STAGED */}
                    {chatStagedFile && (
                        <div className="fx-staged">
                            <div className="fx-staged-thumb">
                                {chatStagedFile.type.startsWith('image/') ? (
                                    <img src={stagedPreviewUrl} alt="Preview" />
                                ) : (
                                    <span><Icons.Paperclip size={22} /></span>
                                )}
                                <button type="button" onClick={() => setChatStagedFile(null)} aria-label="Remover ficheiro"><Icons.Close size={12} /></button>
                            </div>
                            <div className="fx-staged-text">
                                <strong>{chatStagedFile.name}</strong>
                                <span>Pronto a enviar</span>
                            </div>
                        </div>
                    )}

                    {/* CAIXA DE ESCRITA (componente próprio: escrever não redesenha o fórum) */}
                    <ChatComposer
                        disabled={chatInputDisabled}
                        busy={chatSending || chatUploadingFile}
                        stagedFile={chatStagedFile}
                        onStageFile={setChatStagedFile}
                        onPaste={handleChatPaste}
                        onSend={sendChatMessage}
                        onTyping={emitTypingStatus}
                    />
                </section>
            </div>
        </div>
    </ModalPortal>
)}

      {/* --- MODAL ADICIONAR PESSOAS AO GRUPO --- */}
      {showAddGroupMembersModal && (
          <ModalPortal>
              <div className="fx-overlay" style={{ zIndex: 1000003 }} onClick={closeAddMembersDialog}>
                  <div className="fx-modal fx-modal-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Adicionar pessoas">
                      <div className="fx-modal-head">
                          <div>
                              <p className="fx-kicker">Grupo</p>
                              <h3>Adicionar pessoas</h3>
                          </div>
                          <button type="button" onClick={closeAddMembersDialog} className="fx-close" aria-label="Fechar"><Icons.Close size={18} /></button>
                      </div>

                      <div className="fx-modal-body">
                          <p className="fx-modal-hint">Seleciona quem queres adicionar à conversa.</p>
                          <div className="fx-search">
                              <Icons.Search size={16} />
                              <input type="text" value={chatPeopleQuery} onChange={(e) => setChatPeopleQuery(e.target.value)} placeholder="Procurar colega..." />
                          </div>
                          <div className="fx-people custom-scrollbar">
                              {addableCollaborators.length === 0 && <div className="fx-people-empty">Todos os colaboradores já estão neste grupo.</div>}
                              {addableCollaborators.length > 0 && filterPeople(addableCollaborators).length === 0 && <div className="fx-people-empty">Ninguém com esse nome.</div>}
                              {filterPeople(addableCollaborators).map((collab) =>
                                  renderPersonOption(collab, selectedUsersToAddInGroup.includes(collab.id), () => toggleUserToAddInGroup(collab.id), true)
                              )}
                          </div>
                      </div>

                      <div className="fx-modal-foot">
                          <button type="button" onClick={closeAddMembersDialog} className="fx-btn fx-btn-ghost">Cancelar</button>
                          <button type="button" onClick={addSelectedUsersToGroup} disabled={addingGroupMembers || !selectedUsersToAddInGroup.length} className="fx-btn fx-btn-primary">
                              {addingGroupMembers ? <><span className="fx-spinner" /> A adicionar...</> : `Adicionar (${selectedUsersToAddInGroup.length})`}
                          </button>
                      </div>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* --- NOTIFICAÇÃO GLOBAL --- */}
      {notification.show && (
          <ModalPortal>
              <div className="fx-overlay" style={{ zIndex: 999999 }}>
                  <div className="fx-dialog" role="alertdialog">
                      <span className={`fx-dialog-icon ${notification.type === 'success' ? 'is-success' : 'is-danger'}`}>
                          {notification.type === 'success' ? <Icons.CheckCircle size={30} /> : <Icons.XCircle size={30} />}
                      </span>
                      <h3>{notification.type === 'success' ? 'Sucesso!' : 'Atenção'}</h3>
                      <p>{notification.message}</p>
                      <button type="button" onClick={() => setNotification({ show: false, message: '', type: 'success' })} className="fx-btn fx-btn-primary fx-btn-block">Fechar</button>
                  </div>
              </div>
          </ModalPortal>
      )}

      {/* --- MODAL DE CONFIRMAÇÃO --- */}
      {confirmModal.show && (
        <ModalPortal>
            <div className="fx-overlay" style={{ zIndex: 999999 }} onClick={() => setConfirmModal({ show: false, id: null, type: null, postId: null })}>
            <div className="fx-dialog" role="alertdialog" onClick={(e) => e.stopPropagation()}>
                <span className="fx-dialog-icon is-danger"><Icons.Trash size={26} /></span>
                <h3>Tem a certeza?</h3>
                <p>
                    {confirmModal.type === 'post'
                        ? 'Quer mesmo apagar este post e todos os comentários associados?'
                        : 'Quer apagar este comentário?'}
                    <br/>Esta ação não pode ser desfeita.
                </p>
                <div className="fx-dialog-actions">
                    <button type="button" onClick={() => setConfirmModal({ show: false, id: null, type: null, postId: null })} className="fx-btn fx-btn-ghost">Cancelar</button>
                    <button type="button" onClick={confirmDelete} className="fx-btn fx-btn-danger">Sim, apagar</button>
                </div>
            </div>
            </div>
        </ModalPortal>
      )}

      {chatNotice.show && (
          <ModalPortal>
              <div className="fx-toast" style={{ zIndex: 1000002 }}>
                  <span className="fx-toast-icon"><Icons.Message size={16} /></span>
                  <div>
                      <strong>Nova mensagem interna</strong>
                      <span>{chatNotice.text}</span>
                  </div>
              </div>
          </ModalPortal>
      )}

            <StopTimerNoteModal
                open={stopNoteModal.show}
                analysisTargetLog={activeLog}
                title="Parar cronometro"
                message="Se quiseres, adiciona uma nota breve sobre o que foi feito (opcional)."
                placeholder="Ex: Concluída análise e próximos passos definidos"
                showCompleteOption={false}
                showStatusOption={Boolean(activeLog)}
                onCancel={closeStopNoteModal}
                onConfirm={confirmStopWithNote}
            />
    </div>
  );
}
