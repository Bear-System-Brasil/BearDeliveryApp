/**
 * Ainda não existe rota de troca de senha no backend (LDMF-299). As telas de
 * perfil mostram este aviso em vez de fingir que trocaram a senha. Quando a
 * rota existir, a chamada entra no lugar do aviso.
 */
export const PASSWORD_CHANGE_UNAVAILABLE =
  "A troca de senha ainda não está disponível. Sua senha não foi alterada.";

/**
 * O envio do código de recuperação saiu junto com o Twilio, então o
 * "Esqueci minha senha" prometia um código que nunca chegava (LDMF-299).
 * A tela mostra este aviso no lugar do formulário até o backend voltar a
 * enviar o código.
 */
export const PASSWORD_RECOVERY_UNAVAILABLE =
  "A recuperação de senha ainda não está disponível. Em breve você poderá redefinir sua senha por aqui.";
