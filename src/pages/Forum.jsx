import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./../styles/dashboard.css";

export default function Forum() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null); 

  // Dados para Novo Post
  const [newPost, setNewPost] = useState({ titulo: "", conteudo: "", categoria: "geral" });
  
  // Dados do Post Aberto
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState([]); // Nova lista de reações
  const [newCommentText, setNewCommentText] = useState("");

  useEffect(() => {
    fetchPosts();
    // Atualizar timestamp da ultima visita para limpar notificações da sidebar
    localStorage.setItem('lastForumVisit', new Date().toISOString());
    window.dispatchEvent(new Event('storage')); // Forçar atualização da sidebar
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
    
    // Buscar Comentários
    const { data: cData } = await supabase
      .from("forum_comments")
      .select(`*, profiles ( nome )`)
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    setComments(cData || []);

    // Buscar Reações em tempo real para este post
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
        // Não precisamos de fetchPosts aqui, poupa recursos
    }
  }

  // --- NOVA FUNÇÃO DE REAÇÕES ---
  async function handleReact(type) {
      if(!selectedPost) return;

      // Verificar se já tenho esta reação para remover (toggle)
      const myExistingReaction = reactions.find(r => r.user_id === user.id);
      
      if (myExistingReaction && myExistingReaction.reaction_type === type) {
          // Remover reação (se clicar na mesma)
          const { error } = await supabase.from("forum_reactions").delete().eq("id", myExistingReaction.id);
          if(!error) setReactions(reactions.filter(r => r.id !== myExistingReaction.id));
      } else {
          // Adicionar ou Atualizar reação (Upsert)
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
              // Remove a antiga da lista local e adiciona a nova
              const otherReactions = reactions.filter(r => r.user_id !== user.id);
              setReactions([...otherReactions, data]);
          }
      }
      fetchPosts(); // Atualizar a lista geral para mostrar contagens
  }

  // Agrupar reações para mostrar contagens (ex: 2 ❤️, 1 👍)
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

      <div className="forum-grid" style={{display: 'grid', gap: '15px'}}>
        {posts.length === 0 && !loading && <p style={{color: '#666'}}>Ainda não há publicações. Sê o primeiro!</p>}
        
        {posts.map(post => (
            <div key={post.id} className="card" onClick={() => handleOpenPost(post)} style={{cursor: 'pointer'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <h3 style={{margin: '0 0 5px 0', color: '#16a34a'}}>{post.titulo}</h3>
                    {getCategoryBadge(post.categoria)}
                </div>
                
                <p style={{fontSize: '0.9rem', color: '#475569', margin: '10px 0', maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    {post.conteudo}
                </p>

                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '10px'}}>
                    <div>👤 <b>{post.profiles?.nome}</b></div>
                    <div style={{display:'flex', gap:'10px'}}>
                        <span>💬 {post.forum_comments?.[0]?.count || 0}</span>
                        <span>
                            {post.forum_reactions?.length > 0 ? `❤️👍 ${post.forum_reactions.length}` : '🤍 0'}
                        </span>
                    </div>
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
          {/* AQUI ESTÁ A CORREÇÃO DO LAYOUT: Flex Column e Altura Fixa */}
          <div className="modal-content large-modal" style={{height: '90vh', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden'}}>
            
            {/* 1. HEADER (Fixo) */}
            <div className="modal-header" style={{padding: '20px', borderBottom: '1px solid #eee'}}>
               <h3 style={{margin:0}}>{selectedPost.titulo}</h3>
               <button onClick={() => setSelectedPost(null)} className="close-btn">✖</button>
            </div>

            {/* 2. BODY (Scroll apenas aqui) */}
            <div className="modal-body" style={{flex: 1, overflowY: 'auto', padding: '20px', display:'flex', flexDirection:'column'}}>
                
                {/* Conteúdo do Post */}
                <div style={{background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
                    <div style={{fontSize: '0.8rem', color: '#64748b', marginBottom: '10px'}}>
                        Por <b>{selectedPost.profiles?.nome}</b> em {formatDate(selectedPost.created_at)}
                    </div>
                    <div style={{whiteSpace: 'pre-wrap', color: '#334151'}}>{selectedPost.conteudo}</div>
                    
                    {/* ÁREA DE REAÇÕES */}
                    <div style={{marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display:'flex', gap:'5px', alignItems:'center'}}>
                        {['👍','❤️','😂','😮','😢'].map(emoji => (
                            <button 
                                key={emoji} 
                                onClick={() => handleReact(emoji)}
                                style={{
                                    background: reactions.find(r => r.user_id === user.id && r.reaction_type === emoji) ? '#dcfce7' : 'white',
                                    border: '1px solid #cbd5e1', borderRadius: '20px', padding: '5px 10px', cursor: 'pointer', fontSize:'1.2rem', transition: '0.2s'
                                }}
                            >
                                {emoji} <span style={{fontSize:'0.8rem', fontWeight:'bold'}}>{getReactionCounts(reactions)[emoji] || 0}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <h4 style={{borderBottom: '1px solid #eee', paddingBottom: '5px'}}>Comentários ({comments.length})</h4>

                {/* Lista de Comentários */}
                <div style={{flex: 1}}>
                    {comments.map(c => (
                        <div key={c.id} style={{marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px'}}>
                            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem'}}>
                                <span style={{fontWeight: 'bold', color: '#16a34a'}}>{c.profiles?.nome}</span>
                                <span style={{color: '#94a3b8'}}>{formatDate(c.created_at)}</span>
                            </div>
                            <div style={{fontSize: '0.9rem', marginTop: '5px'}}>{c.conteudo}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. FOOTER / INPUT (Fixo em baixo) */}
            <div style={{padding: '20px', borderTop: '1px solid #eee', background: 'white'}}>
                <form onSubmit={handleSendComment} className="forum-reply-area" style={{display:'flex', gap:'10px'}}>
                    <input 
                        type="text" 
                        placeholder="Escreve um comentário..." 
                        value={newCommentText}
                        onChange={e => setNewCommentText(e.target.value)}
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc' }} 
                    />
                    <button type="submit" className="btn-primary" style={{padding: '0 20px'}}>Enviar ➤</button>
                </form>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}