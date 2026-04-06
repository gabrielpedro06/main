-- Remove CAE duplicates per client and enforce uniqueness.
DO $$
BEGIN
  IF to_regclass('public.caes_cliente') IS NULL THEN
    RETURN;
  END IF;

  -- Normalize stored code to avoid duplicates that differ only by whitespace.
  UPDATE public.caes_cliente
  SET codigo = btrim(codigo)
  WHERE codigo IS NOT NULL;

  -- Keep one row per (cliente_id, codigo), preferring principal=true when duplicated.
  DELETE FROM public.caes_cliente a
  USING public.caes_cliente b
  WHERE a.ctid < b.ctid
    AND a.cliente_id = b.cliente_id
    AND btrim(coalesce(a.codigo, '')) = btrim(coalesce(b.codigo, ''));

  CREATE UNIQUE INDEX IF NOT EXISTS caes_cliente_cliente_codigo_unique_idx
    ON public.caes_cliente (cliente_id, codigo);
END $$;
