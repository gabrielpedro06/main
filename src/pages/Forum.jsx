import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

export default function Forum() {
  const { user, userProfile } = useAuth(); 
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modais de Conteúdo
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null); 

  // --- NOVOS ESTADOS PARA INTERFACE ---
  const [notification, setNotification] = useState(null); // { message, type }
  const [confirmModal, setConfirmModal] = useState({ show: false, id: null, type: null }); // type: 'post' ou 'comment'

  // Dados
  const [newPost, setNewPost] = useState({ titulo: "", conteudo: "", categoria: "geral" });
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");

  useEffect(() => {
    fetchPosts();
    localStorage.setItem('lastForumVisit', new Date().toISOString());
    window.dispatchEvent(new Event('storage')); 
  }, []);

  // --- FUNÇÃO AUXILIAR PARA MOSTRAR NOTIFICAÇÕES ---
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000); // Desaparece após 3 segundos
  };

  async function fetchPosts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("forum_posts")
      .select(`
        *,
        profiles ( nome, empresa_interna ),
        forum_comments ( count ),
        forum_reactions ( reaction_type, user_id )
      `)
      .order("created_at", { ascending: false });

    if (!error) setPosts(data || []);
    setLoading(false);
  }

  async function handleCreatePost(e) {
    e.preventDefault();
    const { error } = await supabase.from("forum_posts").insert([{
      ...newPost, user_id: user.id
    }]);

    if (!error) {
      setShowNewPostModal(false);
      setNewPost({ titulo: "", conteudo: "", categoria: "geral" });
      fetchPosts();
      showToast("Post criado com sucesso! 🎉", "success");
    } else {
      showToast("Erro ao criar post: " + error.message, "error");
    }
  }

  // --- PREPARAR APAGAR (Abre o Modal) ---
  function requestDelete(id, type) {
      setConfirmModal({ show: true, id, type });
  }

  // --- EXECUTAR APAGAR (Confirmado no Modal) ---
  async function confirmDelete() {
      const { id, type } = confirmModal;
      
      try {
          if (type === 'post') {
              const { error } = await supabase.from("forum_posts").delete().eq("id", id);
              if (error) throw error;
              setPosts(posts.filter(p => p.id !== id));
              showToast("Post apagado.", "success");
          } 
          else if (type === 'comment') {
              const { error } = await supabase.from("forum_comments").delete().eq("id", id);
              if (error) throw error;
              setComments(comments.filter(c => c.id !== id));
              showToast("Comentário removido.", "success");
          }
      } catch (err) {
          showToast("Erro ao apagar: " + err.message, "error");
      } finally {
          setConfirmModal({ show: false, id: null, type: null }); // Fechar modal
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

    const { data: rData } = await supabase
        .from("forum_reactions")
        .select("*")
        .eq("post_id", post.id);
    setReactions(rData || []);
  }

  async function handleSendComment(e) {
    e.preventDefault();
    if(!newCommentText.trim()) return;

    const { data, error } = await supabase
        .from("forum_comments")
        .insert([{
            post_id: selectedPost.id,
            user_id: user.id,
            conteudo: newCommentText
        }])
        .select(`*, profiles ( nome )`)
        .single();

    if (!error && data) {
        setComments([...comments, data]); 
        setNewCommentText("");
        showToast("Comentário enviado!", "success");
    } else {
        showToast("Erro ao comentar.", "error");
    }
  }

  const canDelete = (authorId) => {
      const myRole = userProfile?.role || '';
      return user.id === authorId || ['admin', 'gestor'].includes(myRole);
  };

  async function handleReact(type) {
      if(!selectedPost) return;

      const myExistingReaction = reactions.find(r => r.user_id === user.id);
      
      if (myExistingReaction && myExistingReaction.reaction_type === type) {
          const { error } = await supabase.from("forum_reactions").delete().eq("id", myExistingReaction.id);
          if(!error) setReactions(reactions.filter(r => r.id !== myExistingReaction.id));
      } else {
          const { data, error } = await supabase
            .from("forum_reactions")
            .upsert({ 
                post_id: selectedPost.id, 
                user_id: user.id, 
                reaction_type: type 
            }, { onConflict: 'post_id, user_id' })
            .select()
            .single();
            
          if(!error && data) {
              const otherReactions = reactions.filter(r => r.user_id !== user.id);
              setReactions([...otherReactions, data]);
          }
      }
      fetchPosts(); 
  }

  const getReactionCounts = (currentReactions) => {
      const counts = {};
      currentReactions.forEach(r => {
          counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
      });
      return counts;
  };

  const getCategoryBadge = (cat) => {
      const colors = { aviso: '#fee2e2', duvida: '#fef3c7', ideia: '#dcfce7', geral: '#f1f5f9' };
      const textColors = { aviso: '#991b1b', duvida: '#92400e', ideia: '#166534', geral: '#475569' };
      return (
          <span style={{
              backgroundColor: colors[cat] || colors.geral,
              color: textColors[cat] || textColors.geral,
              padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase'
          }}>
              {cat}
          </span>
      );
  };

  const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // --- FUNÇÃO MAGICA PARA TRANSFORMAR LINKS EM TEXTO PARA ÂNCORAS CLICÁVEIS ---
  const renderWithLinks = (text) => {
      if (!text) return text;
      
      // Expressão Regular para detetar links que começam com http ou https
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      
      // Divide o texto onde encontrar o link e cria um array
      const parts = text.split(urlRegex);

      return parts.map((part, i) => {
          // Se esta parte for um link, devolve um elemento <a>
          if (part.match(urlRegex)) {
              return (
                  <a 
                      key={i} 
                      href={part} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }}
                      onClick={(e) => e.stopPropagation()} // Previne que o click no link abra também o modal do post
                  >
                      {part}
                  </a>
              );
          }
          // Se for texto normal, devolve apenas o texto
          return part;
      });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>💬 Comunicação Interna </h1>
        <button className="btn-primary" onClick={() => setShowNewPostModal(true)}>+ Novo Post</button>
      </div>

      {/* --- MODO LISTA (FEED) --- */}
      <div className="forum-feed" style={{
          display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px', margin: '0 auto'
      }}>
        {posts.length === 0 && !loading && <p style={{color: '#666', textAlign: 'center'}}>Ainda não há publicações. Sê o primeiro!</p>}
        
        {posts.map(post => (
            <div key={post.id} className="card" onClick={() => handleOpenPost(post)} style={{
                cursor: 'pointer', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', width: '100%', boxSizing: 'border-box'
            }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px'}}>
                    <div>
                        <h3 style={{margin: '0 0 5px 0', color: '#16a34a', fontSize: '1.2rem'}}>{post.titulo}</h3>
                        <div style={{fontSize: '0.8rem', color: '#94a3b8'}}>Por <b>{post.profiles?.nome}</b> • {formatDate(post.created_at)}</div>
                    </div>
                    
                    <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                        {getCategoryBadge(post.categoria)}
                        {/* Botão Apagar chama o Modal agora */}
                        {canDelete(post.user_id) && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); requestDelete(post.id, 'post'); }}
                                style={{background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.6, padding: '5px'}}
                                title="Apagar Post"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                </div>
                
                <div style={{
                    fontSize: '0.95rem', color: '#334155', marginBottom: '15px', lineHeight: '1.6',
                    whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word'
                }}>
                    {/* AQUI APLICAMOS A FUNÇÃO AOS POSTS DO FEED */}
                    {renderWithLinks(post.conteudo)}
                </div>

                <div style={{display: 'flex', gap:'20px', fontSize: '0.9rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '15px'}}>
                    <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>💬 {post.forum_comments?.[0]?.count || 0} Comentários</span>
                    <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                        {post.forum_reactions?.length > 0 ? `❤️ ${post.forum_reactions.length} Reações` : '🤍 0 Reações'}
                    </span>
                </div>
            </div>
        ))}
      </div>

      {/* --- MODAL NOVO POST --- */}
      {showNewPostModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
               <h3>Novo Tópico</h3>
               <button onClick={() => setShowNewPostModal(false)} className="close-btn">✖</button>
            </div>
            <div className="modal-body">
                <form onSubmit={handleCreatePost} className="modal-form">
                    <label>Título</label>
                    <input type="text" value={newPost.titulo} onChange={e => setNewPost({...newPost, titulo: e.target.value})} required />
                    <label>Categoria</label>
                    <select value={newPost.categoria} onChange={e => setNewPost({...newPost, categoria: e.target.value})}>
                        <option value="geral">Geral</option>
                        <option value="aviso">⚠️ Aviso</option>
                        <option value="duvida">❓ Dúvida</option>
                        <option value="ideia">💡 Ideia</option>
                    </select>
                    <label>Conteúdo (Pode colar links aqui)</label>
                    <textarea rows="5" value={newPost.conteudo} onChange={e => setNewPost({...newPost, conteudo: e.target.value})} required />
                    <button type="submit" className="btn-primary" style={{marginTop: '15px', width: '100%'}}>Publicar</button>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DETALHE DO POST --- */}
      {selectedPost && (
        <div className="modal-overlay">
          <div className="modal-content large-modal" style={{height: '90vh', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden'}}>
            
            <div className="modal-header" style={{padding: '20px', borderBottom: '1px solid #eee'}}>
               <h3 style={{margin:0}}>{selectedPost.titulo}</h3>
               <button onClick={() => setSelectedPost(null)} className="close-btn">✖</button>
            </div>

            <div className="modal-body" style={{flex: 1, overflowY: 'auto', padding: '20px', display:'flex', flexDirection:'column'}}>
                
                <div style={{background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
                    <div style={{fontSize: '0.85rem', color: '#64748b', marginBottom: '10px'}}>
                        Por <b>{selectedPost.profiles?.nome}</b> em {formatDate(selectedPost.created_at)}
                    </div>
                    
                    <div style={{whiteSpace: 'pre-wrap', color: '#334151', lineHeight: '1.6', overflowWrap: 'break-word', wordBreak: 'break-word'}}>
                        {/* AQUI APLICAMOS A FUNÇÃO AO CONTEÚDO DO POST ABERTO */}
                        {renderWithLinks(selectedPost.conteudo)}
                    </div>
                    
                    <div style={{marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e2e8f0', display:'flex', gap:'8px', alignItems:'center'}}>
                        {['👍','❤️','😂','😮','😢'].map(emoji => (
                            <button key={emoji} onClick={() => handleReact(emoji)} style={{
                                    background: reactions.find(r => r.user_id === user.id && r.reaction_type === emoji) ? '#dcfce7' : 'white',
                                    border: '1px solid #cbd5e1', borderRadius: '20px', padding: '6px 12px', cursor: 'pointer', fontSize:'1.2rem', transition: '0.2s'
                                }}>
                                {emoji} <span style={{fontSize:'0.85rem', fontWeight:'bold', marginLeft: '5px'}}>{getReactionCounts(reactions)[emoji] || 0}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <h4 style={{borderBottom: '1px solid #eee', paddingBottom: '10px', color: '#475569'}}>Comentários ({comments.length})</h4>

                <div style={{flex: 1}}>
                    {comments.map(c => (
                        <div key={c.id} style={{marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px'}}>
                                <div>
                                    <span style={{fontWeight: 'bold', color: '#16a34a'}}>{c.profiles?.nome}</span>
                                    <span style={{color: '#94a3b8', marginLeft: '10px'}}>{formatDate(c.created_at)}</span>
                                </div>
                                
                                {canDelete(c.user_id) && (
                                    <button 
                                        onClick={() => requestDelete(c.id, 'comment')}
                                        style={{background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: '0.9rem'}}
                                        title="Apagar Comentário"
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                            <div style={{fontSize: '0.95rem', color: '#334155', overflowWrap: 'break-word', whiteSpace: 'pre-wrap'}}>
                                {/* AQUI APLICAMOS A FUNÇÃO AOS COMENTÁRIOS */}
                                {renderWithLinks(c.conteudo)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{padding: '20px', borderTop: '1px solid #eee', background: 'white'}}>
                <form onSubmit={handleSendComment} className="forum-reply-area" style={{display:'flex', gap:'10px'}}>
                    <input type="text" placeholder="Escreve um comentário ou cola um link..." value={newCommentText} onChange={e => setNewCommentText(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} />
                    <button type="submit" className="btn-primary" style={{padding: '0 25px'}}>Enviar ➤</button>
                </form>
            </div>

          </div>
        </div>
      )}

      {/* --- NOVO COMPONENTE: NOTIFICAÇÃO TOAST --- */}
      {notification && (
        <div className={`toast-notification ${notification.type}`}>
            {notification.type === 'success' ? '✅' : '⚠️'} {notification.message}
        </div>
      )}

      {/* --- NOVO COMPONENTE: MODAL DE CONFIRMAÇÃO --- */}
      {confirmModal.show && (
        <div className="modal-overlay" style={{zIndex: 9999}}>
          <div className="confirm-modal-box">
             <div style={{fontSize: '2rem', marginBottom: '10px'}}>🗑️</div>
             <h3 style={{margin: '0 0 10px 0'}}>Tem a certeza?</h3>
             <p style={{color: '#64748b', marginBottom: '20px'}}>
                {confirmModal.type === 'post' 
                    ? 'Quer mesmo apagar este post e todos os comentários?' 
                    : 'Quer apagar este comentário?'}
                <br/>Esta ação não pode ser desfeita.
             </p>
             <div className="confirm-actions">
                 <button onClick={() => setConfirmModal({ show: false, id: null, type: null })} className="btn-cancel">Cancelar</button>
                 <button onClick={confirmDelete} className="btn-confirm-delete">Sim, Apagar</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}