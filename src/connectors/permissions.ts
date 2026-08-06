import type { Capability, ConnectorDefinition } from './types';

/**
 * Permission / Scope Manager — maps requested capabilities to the minimum
 * provider scopes, and explains them to users in plain language.
 */
const CAPABILITY_LABELS: Record<Capability, string> = {
  'email.read': 'Read your email',
  'email.send': 'Send email on your behalf',
  'email.labels': 'Organise labels and folders',
  'chat.read': 'Read your chats and channels',
  'chat.send': 'Post messages for you',
  'chat.threads': 'Reply in threads',
  'calendar.read': 'See your calendar',
  'calendar.write': 'Create and edit events',
  'meetings.create': 'Create meetings',
  'meetings.read': 'See your meetings',
  'files.read': 'Browse and search your files',
  'files.write': 'Upload and edit files',
  'contacts.read': 'Read your contacts',
  'contacts.write': 'Add and update contacts',
  'tasks.read': 'See your tasks',
  'tasks.write': 'Create and update tasks',
  'issues.read': 'See issues and tickets',
  'issues.write': 'Create and update issues',
  'code.repos': 'See your repositories',
  'code.reviews': 'Read and post code reviews',
  'docs.read': 'Read your documents',
  'docs.write': 'Create and edit documents',
  'crm.read': 'Read CRM records',
  'crm.write': 'Create and update CRM records',
  'payments.read': 'See payments and payouts',
  'payments.write': 'Create payments and refunds',
  'profile.read': 'Read your profile',
  'profile.write': 'Update your profile',
};

export const PermissionManager = {
  describe(capability: Capability): string {
    return CAPABILITY_LABELS[capability] ?? capability;
  },

  describeAll(capabilities: Capability[]): string[] {
    return capabilities.map((c) => this.describe(c));
  },

  /** Least-privilege scope set for the capabilities actually requested. */
  scopesFor(definition: ConnectorDefinition, capabilities?: Capability[]): string[] {
    if (!definition.scopes?.length) return [];
    if (!capabilities?.length) return definition.scopes;

    const needsWrite = capabilities.some((c) => /\.(send|write|create)$/.test(c));
    return definition.scopes.filter((scope) => {
      const isWriteScope = /(write|send|modify|manage)/i.test(scope);
      return needsWrite ? true : !isWriteScope;
    });
  },

  granted(definition: ConnectorDefinition, grantedScopes: string[]): Capability[] {
    if (!definition.scopes?.length) return definition.capabilities;
    return definition.capabilities.filter((cap) => {
      const required = this.scopesFor(definition, [cap]);
      return required.every((scope) => grantedScopes.includes(scope));
    });
  },
};
