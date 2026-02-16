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
  
  // Dados para Comentários
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    const { data, error } = await supabase
      .from("forum_posts")
      .select(`
        *,
        profiles ( nome, empresa_interna ),
        forum_comments ( count )
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
    const { data } = await supabase
      .from("forum_comments")
      .select(`*, profiles ( nome )`)
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });
    
    setComments(data || []);
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
        fetchPosts(); 
    }
  }

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
                    <div>📅 {formatDate(post.created_at)} • 💬 {post.forum_comments?.[0]?.count || 0}</div>
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
          <div className="modal-content large-modal" style={{maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
            <div className="modal-header">
               <h3 style={{margin:0}}>{selectedPost.titulo}</h3>
               <button onClick={() => setSelectedPost(null)} className="close-btn">✖</button>
            </div>

            <div className="modal-body" style={{flex: 1, overflowY: 'auto', display:'flex', flexDirection:'column'}}>
                <div style={{background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px'}}>
                    <div style={{fontSize: '0.8rem', color: '#64748b', marginBottom: '10px'}}>
                        Por <b>{selectedPost.profiles?.nome}</b> em {formatDate(selectedPost.created_at)}
                    </div>
                    <div style={{whiteSpace: 'pre-wrap', color: '#334151'}}>{selectedPost.conteudo}</div>
                </div>

                <h4 style={{borderBottom: '1px solid #eee', paddingBottom: '5px'}}>Comentários ({comments.length})</h4>

                <div style={{flex: 1, overflowY: 'auto', marginBottom: '15px'}}>
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

                {/* CORREÇÃO AQUI: forum-reply-area e estilos inline para forçar o input */}
                <form onSubmit={handleSendComment} className="forum-reply-area">
                    <input 
                        type="text" 
                        placeholder="Escreve um comentário..." 
                        value={newCommentText}
                        onChange={e => setNewCommentText(e.target.value)}
                        style={{ width: 'auto' }} 
                    />
                    <button type="submit">Enviar ➤</button>
                </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}