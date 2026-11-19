/**
 * mcpScopes — labels e metadados dos escopos OAuth do MCP (agentes de IA),
 * compartilhado entre AuthorizeAgent, ConnectedAgents e ManageAgentPermissions.
 * Fonte da verdade da lista em si: OAuthController::ALLOWED_SCOPES (zoji-api).
 */
import { i18n } from '../i18n';

// Escopos de escrita são destacados nas telas de consentimento/gerência com
// uma cor de aviso, pra diferenciar de escopos só-leitura.
export const WRITE_SCOPES = new Set([
  'messages:send',
  'status:write',
  'groups:send',
]);

export function scopeLabel(scope: string): string {
  if (scope === 'contacts:read')
    return i18n.t('connectedAgents.scopeContactsRead');
  if (scope === 'messages:read')
    return i18n.t('connectedAgents.scopeMessagesRead');
  if (scope === 'messages:send')
    return i18n.t('connectedAgents.scopeMessagesSend');
  if (scope === 'status:write')
    return i18n.t('connectedAgents.scopeStatusWrite');
  if (scope === 'groups:send') return i18n.t('connectedAgents.scopeGroupsSend');
  if (scope === 'groups:read') return i18n.t('connectedAgents.scopeGroupsRead');
  return scope;
}

// Texto de aviso específico por escopo — nem toda escrita tem confirmação em
// 2 passos (status não tem), então o texto não pode ser genérico.
export function scopeWriteNote(scope: string): string | null {
  if (scope === 'messages:send')
    return i18n.t('authorizeAgent.sendScopeWarning');
  if (scope === 'status:write')
    return i18n.t('authorizeAgent.statusScopeWarning');
  if (scope === 'groups:send')
    return i18n.t('authorizeAgent.groupsScopeWarning');
  return null;
}
