/**
 * Helper functions for user role management
 *
 * `isCompanyRole` respondia a duas perguntas diferentes com a mesma lista:
 * "trabalha no restaurante?" (navegação de staff) e "administra o
 * restaurante?" (telas de administração). Como a segunda é mais estreita,
 * toda role de staff nova herdava acesso a tela de administração e era
 * mandada pra /company-profile, que o middleware nega - foi o que
 * aconteceria com `financial`. As duas perguntas agora têm listas próprias.
 */

/**
 * Quem trabalha no restaurante, em oposição a cliente. Responde
 * "trabalha no restaurante?".
 */
export const COMPANY_ROLES = [
  'admin',
  'owner',
  'manager',
  'financial',
  'cook',
  'delivery',
] as const

/**
 * Subconjunto que administra os dados cadastrais da empresa. Responde
 * "administra o restaurante?" e espelha quem /company-profile realmente
 * aceita (ver ROUTE_PERMISSIONS e o middleware): só owner e admin. Role de
 * staff que não edita cadastro - manager, financial, cook, delivery - fica
 * de fora de propósito.
 */
export const COMPANY_ADMIN_ROLES = ['admin', 'owner'] as const

/**
 * Gerência do restaurante: quem pode alterar a forma de pagamento de um
 * pedido e cancelar entrega. Responde "decide pelo restaurante na hora?".
 * `financial` fica de fora de propósito: acessa Finanças, mas não altera
 * pagamento. O entregador também: ele só pode pedir à gerência.
 */
export const MANAGEMENT_ROLES = ['owner', 'admin', 'manager'] as const

export const CLIENT_ROLES = ['client', 'customer', 'user'] as const

export type CompanyRole = typeof COMPANY_ROLES[number]
export type CompanyAdminRole = typeof COMPANY_ADMIN_ROLES[number]
export type ManagementRole = typeof MANAGEMENT_ROLES[number]
export type ClientRole = typeof CLIENT_ROLES[number]
export type UserRole = CompanyRole | ClientRole

/**
 * Trabalha no restaurante (staff de qualquer área). Use para navegação de
 * staff - NÃO use para liberar tela de administração.
 */
export function isCompanyStaffRole(role?: string): boolean {
  if (!role) return false
  return COMPANY_ROLES.includes(role as CompanyRole)
}

/**
 * Administra os dados cadastrais da empresa. Use para decidir por
 * /company-profile e afins.
 */
export function isCompanyAdminRole(role?: string): boolean {
  if (!role) return false
  return COMPANY_ADMIN_ROLES.includes(role as CompanyAdminRole)
}

/**
 * Gerência (owner, admin, manager). Esconder um botão por aqui não impede a
 * chamada direta à API - a restrição de verdade é do backend.
 */
export function isManagementRole(role?: string): boolean {
  if (!role) return false
  return MANAGEMENT_ROLES.includes(role as ManagementRole)
}

/**
 * Check if a role belongs to a client/customer
 */
export function isClientRole(role?: string): boolean {
  if (!role) return false
  return CLIENT_ROLES.includes(role as ClientRole)
}

/**
 * Rota de perfil da role. Só quem administra o cadastro da empresa vai pra
 * /company-profile; o resto - inclusive staff como financial e manager - vai
 * pro perfil pessoal, que é o que essas contas precisam editar.
 */
export function getProfileRoute(role?: string): string {
  return isCompanyAdminRole(role) ? '/company-profile' : '/profile'
}
