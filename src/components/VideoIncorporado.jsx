// =====================================================================
// Leitor de vídeo incorporado (YouTube / Vimeo / Loom / Google Drive).
// Mostra primeiro a miniatura com um botão "play"; o leitor (iframe) só é
// criado ao carregar — assim uma conversa com muitos vídeos não fica lenta
// nem descarrega nada de fora sem ser pedido.
// O endereço vem de utils/videoIncorporado.js (só sites de confiança).
// Estilos .vid-* em styles/forum.css.
// =====================================================================
import { useState } from "react";

const Play = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.9-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" /></svg>
);

/**
 * @param {object} props
 * @param {{ fornecedor: string, embed: string, miniatura?: string, link: string, vertical?: boolean }} props.video
 * @param {boolean} [props.compacto] versão mais pequena (bolhas do chat)
 */
export default function VideoIncorporado({ video, compacto }) {
  const [aTocar, setATocar] = useState(false);
  const [semMiniatura, setSemMiniatura] = useState(!video.miniatura);

  return (
    <div
      className={`vid${compacto ? " is-compacto" : ""}${video.vertical ? " is-vertical" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      {aTocar ? (
        <iframe
          src={video.embed}
          title={`Vídeo (${video.fornecedor})`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          loading="lazy"
        />
      ) : (
        <button type="button" className="vid-capa" onClick={() => setATocar(true)} aria-label={`Ver vídeo (${video.fornecedor})`}>
          {!semMiniatura && <img src={video.miniatura} alt="" loading="lazy" onError={() => setSemMiniatura(true)} />}
          <span className="vid-play"><Play /></span>
          <span className="vid-origem">{video.fornecedor}</span>
        </button>
      )}
      <a className="vid-abrir" href={video.link} target="_blank" rel="noopener noreferrer">Abrir no {video.fornecedor} ↗</a>
    </div>
  );
}
