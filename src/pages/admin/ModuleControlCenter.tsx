import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useModuleRegistry } from '@/services/moduleRegistry/useModuleRegistry';
import { useUserRole } from '@/hooks/useUserRole';
import { PageLoader } from '@/components/PageLoader';
import {
  Boxes,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  Wrench,
  Beaker,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Search,
  Filter,
  History,
  Edit3,
  Clock,
  ArrowRight,
  RefreshCw,
  Info,
  Check,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { ModuleDefinition, ModuleLifecycleState, PreflightCheck } from '@/services/moduleRegistry/types';

export default function ModuleControlCenter() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const {
    modules,
    auditLogs,
    loading: registryLoading,
    updateLifecycle,
    runPreflight,
    refresh
  } = useModuleRegistry();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | ModuleLifecycleState>('ALL');
  const [activeTab, setActiveTab] = useState<'modules' | 'audit'>('modules');

  // Modal states
  const [publishModalModule, setPublishModalModule] = useState<ModuleDefinition | null>(null);
  const [preflightResults, setPreflightResults] = useState<PreflightCheck[]>([]);
  const [publishing, setPublishing] = useState(false);

  const [notesModalModule, setNotesModalModule] = useState<ModuleDefinition | null>(null);
  const [editNotesText, setEditNotesText] = useState('');
  const [updatingNotes, setUpdatingNotes] = useState(false);

  // Security guard: If authenticated user is not an administrator, deny access
  React.useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error('Access denied: Administrator privileges required');
      navigate('/');
    }
  }, [isAdmin, roleLoading, navigate]);

  // Overview Counts
  const counts = useMemo(() => {
    const total = modules.length;
    const hidden = modules.filter(m => m.lifecycleState === 'hidden').length;
    const development = modules.filter(m => m.lifecycleState === 'development').length;
    const testing = modules.filter(m => m.lifecycleState === 'testing').length;
    const published = modules.filter(m => m.lifecycleState === 'published').length;
    const disabled = modules.filter(m => m.lifecycleState === 'disabled').length;
    return { total, hidden, development, testing, published, disabled };
  }, [modules]);

  // Filtered modules
  const filteredModules = useMemo(() => {
    return modules.filter(m => {
      const matchesSearch =
        m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = selectedFilter === 'ALL' || m.lifecycleState === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [modules, searchQuery, selectedFilter]);

  if (roleLoading || registryLoading) {
    return <PageLoader />;
  }

  if (!isAdmin) {
    return null;
  }

  // Open Publish Modal & Run Pre-flight Checks
  const handleOpenPublishModal = (module: ModuleDefinition) => {
    const result = runPreflight(module);
    setPreflightResults(result.checks);
    setPublishModalModule(module);
  };

  // Confirm Publication
  const handleConfirmPublish = async () => {
    if (!publishModalModule) return;
    setPublishing(true);
    try {
      const res = await updateLifecycle(
        publishModalModule.id,
        'published',
        'Authorized public release via Module Control Center'
      );
      if (res.success) {
        toast.success(`Module "${publishModalModule.displayName}" is now PUBLISHED and visible to users.`);
        setPublishModalModule(null);
      } else {
        toast.error(res.error || 'Failed to publish module.');
      }
    } finally {
      setPublishing(false);
    }
  };

  // State Transition Action Handler
  const handleStateChange = async (
    module: ModuleDefinition,
    targetState: ModuleLifecycleState,
    reasonNote?: string
  ) => {
    if (targetState === 'published') {
      handleOpenPublishModal(module);
      return;
    }

    const res = await updateLifecycle(
      module.id,
      targetState,
      reasonNote || `Admin moved state from ${module.lifecycleState} to ${targetState}`
    );

    if (res.success) {
      toast.success(`"${module.displayName}" transitioned to ${targetState.toUpperCase()}`);
    } else {
      toast.error(res.error || `Failed to transition ${module.displayName}`);
    }
  };

  // Save Administrative Notes
  const handleSaveNotes = async () => {
    if (!notesModalModule) return;
    setUpdatingNotes(true);
    try {
      const res = await updateLifecycle(
        notesModalModule.id,
        notesModalModule.lifecycleState,
        editNotesText
      );
      if (res.success) {
        toast.success('Notes updated successfully');
        setNotesModalModule(null);
      } else {
        toast.error('Failed to update notes');
      }
    } finally {
      setUpdatingNotes(false);
    }
  };

  // Status Badge Component
  const renderStateBadge = (state: ModuleLifecycleState) => {
    switch (state) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Published
          </span>
        );
      case 'development':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Wrench className="w-3.5 h-3.5" />
            Development
          </span>
        );
      case 'testing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <Beaker className="w-3.5 h-3.5" />
            Testing
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            Disabled
          </span>
        );
      case 'hidden':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            <EyeOff className="w-3.5 h-3.5" />
            Hidden
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Boxes className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Module Control Center
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Independent lifecycle management, progressive rollout &amp; production security
              </p>
            </div>
          </div>
        </div>

        {/* Admin Verification Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white border border-slate-800 text-xs shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">Designated Admin:</span>
            <span className="font-mono font-bold text-emerald-400">9717845477</span>
          </div>

          <Button
            onClick={() => refresh()}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {/* A. Overview KPI Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card
          onClick={() => setSelectedFilter('ALL')}
          className={`cursor-pointer transition-all hover:border-primary/50 ${
            selectedFilter === 'ALL' ? 'ring-2 ring-primary border-primary' : ''
          }`}
        >
          <CardContent className="p-4 text-center space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Modules
            </div>
            <div className="text-2xl font-extrabold text-foreground">{counts.total}</div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedFilter('hidden')}
          className={`cursor-pointer transition-all hover:border-slate-500/50 ${
            selectedFilter === 'hidden' ? 'ring-2 ring-slate-500 border-slate-500' : ''
          }`}
        >
          <CardContent className="p-4 text-center space-y-1">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Hidden
            </div>
            <div className="text-2xl font-extrabold text-slate-600 dark:text-slate-400">{counts.hidden}</div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedFilter('development')}
          className={`cursor-pointer transition-all hover:border-amber-500/50 ${
            selectedFilter === 'development' ? 'ring-2 ring-amber-500 border-amber-500' : ''
          }`}
        >
          <CardContent className="p-4 text-center space-y-1">
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              In Dev
            </div>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{counts.development}</div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedFilter('testing')}
          className={`cursor-pointer transition-all hover:border-blue-500/50 ${
            selectedFilter === 'testing' ? 'ring-2 ring-blue-500 border-blue-500' : ''
          }`}
        >
          <CardContent className="p-4 text-center space-y-1">
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Testing
            </div>
            <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{counts.testing}</div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedFilter('published')}
          className={`cursor-pointer transition-all hover:border-emerald-500/50 ${
            selectedFilter === 'published' ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
          }`}
        >
          <CardContent className="p-4 text-center space-y-1">
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Published
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{counts.published}</div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setSelectedFilter('disabled')}
          className={`cursor-pointer transition-all hover:border-rose-500/50 ${
            selectedFilter === 'disabled' ? 'ring-2 ring-rose-500 border-rose-500' : ''
          }`}
        >
          <CardContent className="p-4 text-center space-y-1">
            <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Disabled
            </div>
            <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{counts.disabled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Modules vs Audit History */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('modules')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'modules'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <Boxes className="w-4 h-4" />
            Module Catalog ({filteredModules.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Lifecycle Audit Trail ({auditLogs.length})
          </span>
        </button>
      </div>

      {activeTab === 'modules' ? (
        <>
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, route, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              {(['ALL', 'hidden', 'development', 'testing', 'published', 'disabled'] as const).map(
                (filterKey) => (
                  <button
                    key={filterKey}
                    onClick={() => setSelectedFilter(filterKey)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedFilter === filterKey
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {filterKey.toUpperCase()}
                  </button>
                )
              )}
            </div>
          </div>

          {/* B & C. Modules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredModules.map((module) => (
              <Card
                key={module.id}
                className="flex flex-col justify-between border-border/80 hover:shadow-md hover:border-primary/40 transition-all duration-200"
              >
                <CardHeader className="p-4 sm:p-5 pb-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-bold text-foreground">
                          {module.displayName}
                        </CardTitle>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {module.category}
                        </span>
                      </div>
                      <CardDescription className="text-xs font-mono text-muted-foreground mt-0.5">
                        ID: {module.id} • {module.route}
                      </CardDescription>
                    </div>

                    {renderStateBadge(module.lifecycleState)}
                  </div>

                  {module.adminNotes && (
                    <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/40 p-2 rounded-lg border border-border/40">
                      {module.adminNotes}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between border-t border-border/40 pt-2.5">
                    <span>Visibility: {module.isPublic ? 'Publicly Visible' : 'Admin Only'}</span>
                    <span className="font-mono">{new Date(module.updatedAt).toLocaleDateString()}</span>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {/* Direct Link to Route */}
                      <Link
                        to={module.route}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
                        title="Open module route"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>

                      {/* Edit Notes */}
                      <button
                        type="button"
                        onClick={() => {
                          setNotesModalModule(module);
                          setEditNotesText(module.adminNotes || '');
                        }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Edit admin notes"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Lifecycle Transitions */}
                    <div className="flex items-center gap-1.5">
                      {module.lifecycleState !== 'development' && (
                        <Button
                          onClick={() => handleStateChange(module, 'development')}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 px-2"
                        >
                          Dev
                        </Button>
                      )}

                      {module.lifecycleState !== 'testing' && (
                        <Button
                          onClick={() => handleStateChange(module, 'testing')}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 px-2"
                        >
                          Test
                        </Button>
                      )}

                      {module.lifecycleState !== 'published' ? (
                        <Button
                          onClick={() => handleOpenPublishModal(module)}
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5"
                        >
                          Publish
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleStateChange(module, 'hidden', 'Unpublished by administrator')}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-slate-500/30 text-slate-600 dark:text-slate-400 hover:bg-slate-500/10 px-2"
                        >
                          Hide
                        </Button>
                      )}

                      {module.lifecycleState !== 'disabled' && (
                        <Button
                          onClick={() => handleStateChange(module, 'disabled', 'Disabled by administrator')}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 px-1.5"
                          title="Disable module"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        /* E. Audit Log Table */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Module Lifecycle Audit History
            </CardTitle>
            <CardDescription className="text-xs">
              Append-only audit trail recording every state change and administrator authorization
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Module ID</th>
                  <th className="p-3">State Transition</th>
                  <th className="p-3">Admin Identifier</th>
                  <th className="p-3">Result</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground font-sans text-xs">
                      No lifecycle audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 font-bold text-foreground">{log.moduleId}</td>
                      <td className="p-3">
                        <span className="text-slate-400">{log.previousState}</span>
                        <ArrowRight className="w-3 h-3 inline mx-1.5 text-muted-foreground" />
                        <span className="font-bold text-primary">{log.newState}</span>
                      </td>
                      <td className="p-3 text-muted-foreground">{log.adminIdentifier}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600">
                          {log.actionResult}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground font-sans max-w-xs truncate">
                        {log.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* D. Safe Publishing Modal with Pre-Flight Checks */}
      <Dialog
        open={Boolean(publishModalModule)}
        onOpenChange={(open) => !open && setPublishModalModule(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
              <DialogTitle className="text-xl font-bold">
                Authorize &amp; Publish: {publishModalModule?.displayName}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Publishing will make this module immediately visible to regular users across public navigation, search, and dashboard surfaces.
            </DialogDescription>
          </DialogHeader>

          {/* Pre-flight Checks List */}
          <div className="space-y-3 my-4">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Required Pre-flight Verifications</span>
              <span className="text-[11px] font-mono text-emerald-600 font-bold">
                {preflightResults.filter(c => c.passed).length}/{preflightResults.length} PASSED
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {preflightResults.map((check) => (
                <div
                  key={check.id}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    check.passed
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-950 dark:text-emerald-100'
                      : 'bg-rose-500/5 border-rose-500/20 text-rose-950 dark:text-rose-100'
                  }`}
                >
                  {check.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{check.name}</span>
                      {check.critical && (
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                          Critical
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {check.details}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPublishModalModule(null)}
              disabled={publishing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPublish}
              disabled={publishing || preflightResults.some(c => c.critical && !c.passed)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {publishing ? 'Publishing...' : 'Approve & Release to Public'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Administrative Notes Modal */}
      <Dialog
        open={Boolean(notesModalModule)}
        onOpenChange={(open) => !open && setNotesModalModule(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Edit Administrative Notes
            </DialogTitle>
            <DialogDescription className="text-xs">
              Module: <span className="font-bold text-foreground">{notesModalModule?.displayName}</span> ({notesModalModule?.id})
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Internal Implementation Notes (Admin Only)
            </label>
            <Textarea
              rows={4}
              value={editNotesText}
              onChange={(e) => setEditNotesText(e.target.value)}
              placeholder="e.g. In active development for food ordering cart, backend API pending..."
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNotesModalModule(null)}
              disabled={updatingNotes}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNotes}
              disabled={updatingNotes}
            >
              {updatingNotes ? 'Saving...' : 'Save Notes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
