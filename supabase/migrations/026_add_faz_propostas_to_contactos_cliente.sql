-- Add faz_propostas flag to contactos_cliente
ALTER TABLE public.contactos_cliente
ADD COLUMN faz_propostas BOOLEAN DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN public.contactos_cliente.faz_propostas IS 'Indica se este contacto pode receber e estar envolvido em propostas comerciais';
