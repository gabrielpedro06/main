/**
 * Textos/chaves partilhados entre o AuthContext e o ecrã de Login para o caso
 * de contas desativadas (profiles.ativo = false nos RH).
 */

// Colaboradores desativados nos RH não podem usar o Bizin.
export const CONTA_DESATIVADA = "Esta conta está desativada. Se acha que é um engano, fale com os Recursos Humanos."

// Mensagem que o AuthContext deixa para o ecrã de login mostrar depois de terminar a sessão
export const AVISO_LOGIN_KEY = "bz-login-aviso"
