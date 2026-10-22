/**
 * CHATR OS — Module Control Center Types
 */

export type ModuleLifecycleState = 'hidden' | 'development' | 'testing' | 'published' | 'disabled';

export interface ModuleDefinition {
  id: string;
  displayName: string;
  route: string;
  lifecycleState: ModuleLifecycleState;
  isPublic: boolean;
  requiredPermissions: string[];
  adminNotes: string;
  iconName?: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  lastUpdatedBy?: string;
  lastUpdatedByPhone?: string;
}

export interface ModuleAuditEntry {
  id: string;
  moduleId: string;
  previousState: ModuleLifecycleState;
  newState: ModuleLifecycleState;
  adminUserId?: string;
  adminIdentifier: string;
  actionResult: string;
  notes: string;
  createdAt: string;
}

export interface PreflightCheck {
  id: string;
  name: string;
  passed: boolean;
  critical: boolean;
  details: string;
}

export interface PublishPreflightResult {
  passed: boolean;
  canPublish: boolean;
  checks: PreflightCheck[];
  timestamp: string;
}
