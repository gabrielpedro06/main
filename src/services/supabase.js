// Cliente Supabase único do browser (chave anónima: tudo o que lê/escreve passa pelas
// políticas RLS e exige sessão com 2FA — nível aal2, migração 071). Importar sempre daqui.
// As variáveis VITE_* são embutidas no bundle no momento do build.
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
