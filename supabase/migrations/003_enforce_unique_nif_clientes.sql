-- Enforce unique NIF for clientes and keep data normalized.
-- This migration intentionally aborts if duplicate NIFs already exist.

DO $$
DECLARE
	duplicate_count integer;
BEGIN
	SELECT COUNT(*) INTO duplicate_count
	FROM (
		SELECT regexp_replace(coalesce(nif, ''), '\\D', '', 'g') AS nif_normalizado
		FROM public.clientes
		WHERE nullif(regexp_replace(coalesce(nif, ''), '\\D', '', 'g'), '') IS NOT NULL
		GROUP BY 1
		HAVING COUNT(*) > 1
	) duplicados;

	IF duplicate_count > 0 THEN
		RAISE EXCEPTION
			'Existem NIFs duplicados em public.clientes. Resolva os duplicados antes de aplicar esta migration.';
	END IF;
END $$;

UPDATE public.clientes
SET nif = nullif(regexp_replace(coalesce(nif, ''), '\\D', '', 'g'), '')
WHERE nif IS NOT NULL;

ALTER TABLE public.clientes
	DROP CONSTRAINT IF EXISTS clientes_nif_format_chk;

ALTER TABLE public.clientes
	ADD CONSTRAINT clientes_nif_format_chk
	CHECK (nif IS NULL OR nif ~ '^[0-9]{9}$');

CREATE UNIQUE INDEX IF NOT EXISTS clientes_nif_unique_idx
	ON public.clientes (nif)
	WHERE nif IS NOT NULL;
