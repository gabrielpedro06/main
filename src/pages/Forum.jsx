import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

export default function Forum() {
  const { user, userProfile } = useAuth(); 
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null); 

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
    } else {
      alert("Erro ao criar post: " + error.message);
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
    }
  }

  // --- APAGAR COMENTÁRIO ---
  async function handleDeleteComment(commentId) {
      if (!window.confirm("⚠️ Tem a certeza que quer apagar este comentário?")) return;

      try {
          const { error } = await supabase
              .from("forum_comments")
              .delete()
              .eq("id", commentId);

          if (error) throw error;
          setComments(comments.filter(c => c.id !== commentId));
      } catch (err) {
          alert("Erro ao apagar: " + err.message);
      }
  }

  const canDelete = (commentUserId) => {
      const myRole = userProfile?.role || '';
      return user.id === commentUserId || ['admin', 'gestor'].includes(myRole);
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

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>💬 Fórum & Avisos</h1>
        <button className="btn-primary" onClick={() => setShowNewPostModal(true)}>+ Novo Post</button>
      </div>

      {/* --- MODO LISTA (FEED) --- */}
      <div className="forum-feed" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxWidth: '900px', // Limita a largura para ficar elegante
          margin: '0 auto'   // Centra a lista na página
      }}>
        {posts.length === 0 && !loading && <p style={{color: '#666', textAlign: 'center'}}>Ainda não há publicações. Sê o primeiro!</p>}
        
        {posts.map(post => (
            <div key={post.id} className="card" onClick={() => handleOpenPost(post)} style={{
                cursor: 'pointer',
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s',
                width: '100%',
                boxSizing: 'border-box' // Garante que padding não aumenta largura total
            }}>
                {/* Cabeçalho do Card */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px'}}>
                    <div>
                        <h3 style={{margin: '0 0 5px 0', color: '#16a34a', fontSize: '1.2rem'}}>{post.titulo}</h3>
                        <div style={{fontSize: '0.8rem', color: '#94a3b8'}}>
                            Por <b>{post.profiles?.nome}</b> • {formatDate(post.created_at)}
                        </div>
                    </div>
                    {getCategoryBadge(post.categoria)}
                </div>
                
                {/* Corpo do Texto - BLINDADO PARA NÃO PASSAR DA BORDA */}
                <div style={{
                    fontSize: '0.95rem', 
                    color: '#334155', 
                    marginBottom: '15px', 
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',       // Respeita parágrafos
                    overflowWrap: 'break-word',   // Parte palavras longas se necessário
                    wordBreak: 'break-word'       // Reforço para browsers antigos
                }}>
                    {post.conteudo}
                </div>

                {/* Rodapé do Card */}
                <div style={{display: 'flex', gap:'20px', fontSize: '0.9rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '15px'}}>
                    <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                        💬 {post.forum_comments?.[0]?.count || 0} Comentários
                    </span>
                    <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                        {post.forum_reactions?.length > 0 ? `❤️ ${post.forum_reactions.length} Reações` : '🤍 0 Reações'}
                    </span>
                </div>
            </div>
        ))}
      </div>

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
                    <label>Conteúdo</label>
                    <textarea rows="5" value={newPost.conteudo} onChange={e => setNewPost({...newPost, conteudo: e.target.value})} required />
                    <button type="submit" className="btn-primary" style={{marginTop: '15px', width: '100%'}}>Publicar</button>
                </form>
            </div>
          </div>
        </div>
      )}

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
                    
                    {/* TEXTO NO MODAL TAMBÉM BLINDADO */}
                    <div style={{
                        whiteSpace: 'pre-wrap', 
                        color: '#334151', 
                        lineHeight: '1.6',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word'
                    }}>
                        {selectedPost.conteudo}
                    </div>
                    
                    <div style={{marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e2e8f0', display:'flex', gap:'8px', alignItems:'center'}}>
                        {['👍','❤️','😂','😮','😢'].map(emoji => (
                            <button 
                                key={emoji} 
                                onClick={() => handleReact(emoji)}
                                style={{
                                    background: reactions.find(r => r.user_id === user.id && r.reaction_type === emoji) ? '#dcfce7' : 'white',
                                    border: '1px solid #cbd5e1', borderRadius: '20px', padding: '6px 12px', cursor: 'pointer', fontSize:'1.2rem', transition: '0.2s'
                                }}
                            >
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
                                        onClick={() => handleDeleteComment(c.id)}
                                        style={{background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: '0.9rem'}}
                                        title="Apagar Comentário"
                                        onMouseOver={(e) => e.target.style.opacity = 1}
                                        onMouseOut={(e) => e.target.style.opacity = 0.5}
                                    >
                                        🗑️
                                    </button>
                                )}
                            </div>
                            <div style={{fontSize: '0.95rem', color: '#334155', overflowWrap: 'break-word'}}>{c.conteudo}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{padding: '20px', borderTop: '1px solid #eee', background: 'white'}}>
                <form onSubmit={handleSendComment} className="forum-reply-area" style={{display:'flex', gap:'10px'}}>
                    <input 
                        type="text" 
                        placeholder="Escreve um comentário..." 
                        value={newCommentText}
                        onChange={e => setNewCommentText(e.target.value)}
                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} 
                    />
                    <button type="submit" className="btn-primary" style={{padding: '0 25px'}}>Enviar ➤</button>
                </form>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}