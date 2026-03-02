import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

// --- ÍCONES SVG PROFISSIONAIS ---
const Icons = {
  Message: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
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
  Edit: ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
};

const ModalPortal = ({ children }) => createPortal(children, document.body);

export default function Forum() {
  const { user, userProfile } = useAuth(); 
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null); 
  const [selectedUserFilter, setSelectedUserFilter] = useState(null); 

  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, type: null }); 

  // Dados Novo Post
  const [newPost, setNewPost] = useState({ titulo: "", conteudo: "", categoria: "geral" });
  const [imageFile, setImageFile] = useState(null); 
  const [isUploading, setIsUploading] = useState(false);

  // Dados Modal Comentários
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");

  useEffect(() => {
    fetchPosts();
    localStorage.setItem('lastForumVisit', new Date().toISOString());
    window.dispatchEvent(new Event('storage')); 
  }, []);

  const showToast = (message, type = 'success') => {
      setNotification({ show: true, message, type });
      setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  async function fetchPosts(showLoader = true) {
    if (showLoader) setLoading(true);
    const { data, error } = await supabase
      .from("forum_posts")
      .select(`
        *,
        profiles ( nome, empresa_interna ),
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

    let imageUrl = null;

    try {
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${user.id}_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage.from("forum_media").upload(fileName, imageFile);
            if (uploadError) {
                throw new Error("Não foi possível carregar a imagem. Verifica se o bucket 'forum_media' existe.");
            }
            
            const { data } = supabase.storage.from("forum_media").getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }

        const payload = {
            titulo: newPost.titulo,
            conteudo: newPost.conteudo,
            categoria: newPost.categoria,
            user_id: user.id
        };

        if (imageUrl) {
            payload.image_url = imageUrl;
        }

        const { error } = await supabase.from("forum_posts").insert([payload]);

        if (error) {
            console.error(error);
            throw new Error(error.message.includes('image_url') ? 'A coluna image_url ainda não foi criada na base de dados.' : error.message);
        }

        setShowNewPostModal(false);
        setNewPost({ titulo: "", conteudo: "", categoria: "geral" });
        setImageFile(null);
        fetchPosts(true);
        showToast("Publicado com sucesso!", "success");

    } catch (err) {
        showToast("Erro ao publicar: " + err.message, "error");
    } finally {
        setIsUploading(false);
    }
  }

  function requestDelete(id, type) {
      setConfirmModal({ show: true, id, type });
  }

  async function confirmDelete() {
      const { id, type } = confirmModal;
      try {
          if (type === 'post') {
              const { error } = await supabase.from("forum_posts").delete().eq("id", id);
              if (error) throw error;
              setPosts(posts.filter(p => p.id !== id));
              if (selectedPost?.id === id) setSelectedPost(null);
              showToast("Publicação apagada.", "success");
          } 
          else if (type === 'comment') {
              const { error } = await supabase.from("forum_comments").delete().eq("id", id);
              if (error) throw error;
              setComments(comments.filter(c => c.id !== id));
              
              setPosts(posts.map(p => {
                  if (p.id === selectedPost.id) {
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
          setConfirmModal({ show: false, id: null, type: null }); 
      }
  }

  async function handleOpenPost(post) {
    setSelectedPost(post);
    const { data: cData } = await supabase
      .from("forum_comments")
      .select(`*, profiles ( nome )`)
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    setComments(cData || []);
  }

  async function handleSendComment(e) {
    e.preventDefault();
    if(!newCommentText.trim()) return;

    const textoComentario = newCommentText;
    setNewCommentText(""); 

    const { data, error } = await supabase
        .from("forum_comments")
        .insert([{ post_id: selectedPost.id, user_id: user.id, conteudo: textoComentario }])
        .select(`*, profiles ( nome )`)
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

  const renderWithLinks = (text) => {
      if (!text) return text;
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = text.split(urlRegex);

      return parts.map((part, i) => {
          if (part.match(urlRegex)) {
              return (
                  <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }} onClick={(e) => e.stopPropagation()}>
                      {part}
                  </a>
              );
          }
          return part;
      });
  };

  const inputStyle = { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.95rem', color: '#1e293b', outline: 'none', boxSizing: 'border-box', marginBottom: '15px', transition: '0.2s' };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const actionBtnStyle = { background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, transition: '0.2s' };

  const displayedPosts = selectedUserFilter ? posts.filter(p => p.user_id === selectedUserFilter.id) : posts;

  return (
    // 💡 LARGURA DO FEED AUMENTADA DE 900px PARA 1200px
    <div className="page-container" style={{maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px'}}>
      
      {/* HEADER */}
      <div className="card" style={{ marginBottom: 25, padding: '25px', display: "flex", justifyContent: "space-between", alignItems: 'center', flexWrap: 'wrap', gap: '15px', background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <div style={{background: '#eff6ff', color: '#2563eb', padding: '12px', borderRadius: '12px', display: 'flex'}}><Icons.Message size={24} /></div>
            <div>
                <h1 style={{margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-0.02em'}}>Comunicação Interna</h1>
                <p style={{color: '#64748b', margin: 0, fontWeight: '500', fontSize: '0.9rem'}}>Fórum de partilha de informações e discussões</p>
            </div>
        </div>
        <button className="btn-primary hover-shadow" onClick={() => setShowNewPostModal(true)} style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', padding: '12px 24px'}}>
            <Icons.Plus /> Novo Post
        </button>
      </div>

      {/* ALERTA DE FILTRO ATIVO */}
      {selectedUserFilter && (
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#eff6ff', padding: '15px 20px', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '25px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <Icons.User color="#2563eb" />
                 <span style={{ color: '#1e40af', fontWeight: 'bold', fontSize: '1.1rem' }}>A ver o perfil de: {selectedUserFilter.nome}</span>
             </div>
             <button onClick={() => setSelectedUserFilter(null)} style={{ background: 'white', border: '1px solid #bfdbfe', color: '#2563eb', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }} className="hover-shadow">
                 Ver Tudo
             </button>
         </div>
      )}

      {/* ÁREA DE CRIAR NOVO POST RÁPIDO */}
      {!selectedUserFilter && (
          <div className="card" style={{background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'}}>
              <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                  <div style={{width: '45px', height: '45px', borderRadius: '50%', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', flexShrink: 0}}>
                      {getInitials(userProfile?.nome)}
                  </div>
                  <button onClick={() => setShowNewPostModal(true)} style={{flex: 1, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '25px', padding: '15px 20px', textAlign: 'left', color: '#64748b', fontSize: '0.95rem', cursor: 'pointer', transition: '0.2s'}} className="hover-input-fake">
                      Partilha uma atualização, ficheiro ou ideia com a equipa...
                  </button>
              </div>
          </div>
      )}

      {/* --- FEED DE PUBLICAÇÕES --- */}
      <div className="forum-feed" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        {displayedPosts.length === 0 && !loading && (
            <div style={{textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1'}}>
                <div style={{display: 'flex', justifyContent: 'center', marginBottom: '15px', color: '#cbd5e1'}}><Icons.Message size={48} /></div>
                <h4 style={{color: '#1e293b', margin: '0 0 5px 0', fontSize:'1.2rem'}}>Ainda não há publicações.</h4>
                <p style={{color:'#64748b'}}>Sê o primeiro a partilhar algo!</p>
            </div>
        )}
        
        {displayedPosts.map(post => (
            <div key={post.id} className="card hover-shadow" onClick={() => handleOpenPost(post)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', background: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                
                {/* CABEÇALHO DO POST */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px'}}>
                    <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                        <div 
                            onClick={(e) => { e.stopPropagation(); setSelectedUserFilter({ id: post.user_id, nome: post.profiles?.nome }); }}
                            style={{width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', border: '1px solid #cbd5e1', cursor: 'pointer'}} 
                            className="hover-avatar"
                            title={`Ver publicações de ${post.profiles?.nome}`}
                        >
                            {getInitials(post.profiles?.nome)}
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
                    <h3 style={{margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.15rem', fontWeight: '800'}}>{post.titulo}</h3>
                    <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
                        {renderWithLinks(post.conteudo)}
                    </div>
                </div>

                {/* 💡 IMAGEM DO POST (COM ALTURA MÁXIMA CONTROLADA) */}
                {post.image_url && (
                    <div style={{marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'center', padding: '10px'}}>
                        <img src={post.image_url} alt="Anexo da publicação" style={{maxWidth: '100%', maxHeight: '350px', objectFit: 'contain', display: 'block', borderRadius: '8px'}} loading="lazy" />
                    </div>
                )}

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
                                        background: hasReacted ? '#eff6ff' : 'transparent', color: hasReacted ? '#2563eb' : '#64748b',
                                        border: hasReacted ? '1px solid #bfdbfe' : '1px solid transparent', borderRadius: '20px', padding: '6px 12px', cursor: 'pointer', transition: '0.2s',
                                        display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold'
                                    }}
                                    className="hover-bg-light"
                                >
                                    <span style={{fontSize: '1.1rem'}}>{emoji}</span> {count > 0 ? count : 'Gostar'}
                                </button>
                            );
                        })}
                    </div>
                    
                    <button onClick={() => handleOpenPost(post)} style={{background: 'transparent', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px'}} className="hover-bg-light">
                        <Icons.Message size={14} /> {post.forum_comments?.[0]?.count || 0} Comentários
                    </button>
                </div>
            </div>
        ))}
      </div>

      {/* --- MODAL NOVO POST --- */}
      {showNewPostModal && (
        <ModalPortal>
            <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999}}>
                <div style={{background:'white', width:'95%', maxWidth:'600px', borderRadius:'16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out'}}>
                    <div style={{padding:'20px 25px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h3 style={{margin:0, color:'#1e293b', fontSize:'1.25rem', fontWeight:'800', display: 'flex', alignItems: 'center', gap: '10px'}}>
                            <span style={{color: '#2563eb'}}><Icons.Edit size={22} /></span> Criar Publicação
                        </h3>
                        <button onClick={() => {setShowNewPostModal(false); setImageFile(null);}} style={{background:'transparent', border:'none', cursor:'pointer', color:'#94a3b8'}} className="hover-red-text"><Icons.Close size={20} /></button>
                    </div>
                    
                    <div style={{padding: '25px', background: 'white'}}>
                        <form onSubmit={handleCreatePost}>
                            <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px'}}>
                                <div>
                                    <label style={labelStyle}>Título Breve *</label>
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

                            <label style={labelStyle}>A tua mensagem *</label>
                            <textarea rows="5" value={newPost.conteudo} onChange={e => setNewPost({...newPost, conteudo: e.target.value})} required style={{...inputStyle, resize: 'vertical'}} className="input-focus" placeholder="No que estás a pensar? Podes colar links de sites aqui também!" />
                            
                            <div style={{background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px dashed #cbd5e1', marginBottom: '25px', transition: '0.2s'}} className="hover-border-blue">
                                <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: 0, fontWeight: '600', fontSize: '0.9rem'}}>
                                    <Icons.Image size={18} color="#3b82f6" /> 
                                    <span style={{color: '#3b82f6', textTransform: 'none'}}>{imageFile ? imageFile.name : "Adicionar Fotografia (Opcional)"}</span>
                                    <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={{display: 'none'}} />
                                </label>
                                {imageFile && <div style={{fontSize: '0.75rem', color: '#64748b', marginTop: '6px', paddingLeft: '26px'}}>Imagem carregada e pronta a enviar.</div>}
                            </div>

                            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '15px', borderTop: '1px solid #f1f5f9'}}>
                                <button type="button" onClick={() => {setShowNewPostModal(false); setImageFile(null);}} style={{padding: '12px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                                <button type="submit" disabled={isUploading} className="btn-primary hover-shadow" style={{padding: '12px 30px', borderRadius: '8px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    {isUploading ? "A carregar..." : <><Icons.Send size={16}/> Publicar</>}
                                </button>
                            </div>
                        </form>
                    </div>
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
                                {getInitials(selectedPost.profiles?.nome)}
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
                        
                        <div style={{whiteSpace: 'pre-wrap', color: '#334155', lineHeight: '1.6', overflowWrap: 'break-word', wordBreak: 'break-word', fontSize: '1.05rem', marginBottom: '25px'}}>
                            {renderWithLinks(selectedPost.conteudo)}
                        </div>

                        {selectedPost.image_url && (
                            <div style={{marginBottom: '25px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'center'}}>
                                <img src={selectedPost.image_url} alt="Anexo" style={{maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', display: 'block'}} />
                            </div>
                        )}

                        <div style={{marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display:'flex', gap:'10px', alignItems:'center', flexWrap: 'wrap'}}>
                            {['👍','❤️','💡','🚀','😂','😮','😢'].map(emoji => {
                                const count = getReactionCounts(selectedPost.forum_reactions)[emoji] || 0;
                                const hasReacted = selectedPost.forum_reactions?.find(r => r.user_id === user.id && r.reaction_type === emoji);
                                return (
                                    <button key={emoji} onClick={() => handleReact(emoji, selectedPost.id, selectedPost.forum_reactions)} style={{
                                            background: hasReacted ? '#eff6ff' : 'white', border: hasReacted ? '1px solid #bfdbfe' : '1px solid #e2e8f0', 
                                            borderRadius: '20px', padding: '8px 16px', cursor: 'pointer', fontSize:'1.2rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
                                        }} className={!hasReacted ? "hover-shadow" : ""}>
                                        {emoji} <span style={{fontSize:'0.9rem', fontWeight:'bold', color: hasReacted ? '#2563eb' : '#64748b'}}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* DIREITA: COMENTÁRIOS */}
                    <div className="post-modal-right" style={{background: '#f8fafc', display: 'flex', flexDirection: 'column'}}>
                        
                        <div style={{padding: '20px 25px', borderBottom: '1px solid #e2e8f0', background: 'white'}}>
                            <h4 style={{margin: 0, color: '#1e293b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <Icons.Message size={18} color="#2563eb" /> Comentários ({comments.length})
                            </h4>
                        </div>

                        <div style={{flex: 1, overflowY: 'auto', padding: '20px 25px', display: 'flex', flexDirection: 'column', gap: '15px'}} className="custom-scrollbar">
                            {comments.map(c => (
                                <div key={c.id} style={{background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'}}>
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem'}}>
                                            <div style={{width: '28px', height: '28px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem', border: '1px solid #bfdbfe'}}>
                                                {getInitials(c.profiles?.nome)}
                                            </div>
                                            <span style={{fontWeight: '800', color: '#1e293b', fontSize: '0.95rem'}}>{c.profiles?.nome}</span>
                                            <span style={{color: '#94a3b8', fontWeight: '500'}}>{formatDate(c.created_at)}</span>
                                        </div>
                                        
                                        {canDelete(c.user_id) && (
                                            <button onClick={() => requestDelete(c.id, 'comment')} style={actionBtnStyle} className="hover-red-btn" title="Apagar Comentário">
                                                <Icons.Trash />
                                            </button>
                                        )}
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
                            <form onSubmit={handleSendComment} style={{display:'flex', gap:'10px', alignItems: 'center'}}>
                                <input type="text" placeholder="Escreve uma resposta..." value={newCommentText} onChange={e => setNewCommentText(e.target.value)} style={{ flex: 1, padding: '15px 20px', borderRadius: '30px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', background: '#f1f5f9', transition: '0.2s' }} className="input-focus" />
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
                    <button onClick={() => setConfirmModal({ show: false, id: null, type: null })} style={{flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 'bold', color: '#475569', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Cancelar</button>
                    <button onClick={confirmDelete} style={{flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s'}} className="hover-shadow">Sim, Apagar</button>
                </div>
            </div>
            </div>
        </ModalPortal>
      )}

      <style>{`
        .hover-shadow:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .hover-red-btn:hover { background-color: #fef2f2 !important; color: #ef4444 !important; opacity: 1 !important; }
        .hover-red-text:hover { color: #ef4444 !important; }
        .hover-bg-light:hover { background-color: #f1f5f9 !important; color: #1e293b !important; }
        .hover-input-fake:hover { background-color: #e2e8f0 !important; color: #334155 !important; }
        .hover-border-blue:hover { border-color: #3b82f6 !important; background: #eff6ff !important; }
        
        .hover-avatar:hover { background: #e2e8f0 !important; border-color: #94a3b8 !important; }
        .hover-name:hover { text-decoration: underline; color: #2563eb !important; }

        .input-focus:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }

        /* Layout Split Screen do Modal */
        .post-modal-layout { display: flex; flex-direction: row; height: calc(100% - 77px); }
        .post-modal-left { flex: 1.5; border-right: 1px solid #e2e8f0; }
        .post-modal-right { flex: 1; border-left: none; }
        
        @media (max-width: 800px) {
            .post-modal-layout { flex-direction: column; overflow-y: auto; }
            .post-modal-left { flex: none; height: auto; border-right: none; }
            .post-modal-right { flex: none; height: 500px; border-top: 1px solid #e2e8f0; }
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}