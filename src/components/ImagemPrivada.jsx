import { useUrlAssinado } from "../utils/ficheirosPrivados";

/**
 * <img> que funciona com ficheiros de baldes privados (pede um link temporário).
 * Enquanto o link não chega mostra um <span class="bz-img-loading">.
 * Usado no Fórum/Chat (balde chat_ficheiros).
 * @param {{ src: string, alt?: string }} props restantes props passam para o <img>
 */
export default function ImagemPrivada({ src, alt = "", ...rest }) {
  const url = useUrlAssinado(src);
  if (!url) return <span className="bz-img-loading" aria-label="A carregar imagem" />;
  return <img src={url} alt={alt} {...rest} />;
}
