import { useUrlAssinado } from "../utils/ficheirosPrivados";

/** <img> que funciona com ficheiros de baldes privados (pede um link temporário). */
export default function ImagemPrivada({ src, alt = "", ...rest }) {
  const url = useUrlAssinado(src);
  if (!url) return <span className="bz-img-loading" aria-label="A carregar imagem" />;
  return <img src={url} alt={alt} {...rest} />;
}
