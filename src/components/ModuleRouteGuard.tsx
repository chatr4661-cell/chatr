import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useModuleRegistry } from '@/services/moduleRegistry/useModuleRegistry';
import { DEFAULT_MODULE_REGISTRY } from '@/services/moduleRegistry/defaultRegistry';
import { PageLoader } from '@/components/PageLoader';
import { ShieldAlert, ArrowLeft, Wrench, Beaker } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModuleRouteGuardProps {
  moduleId: string;
  component: React.ComponentType<any>;
  [key: string]: any;
}

export const ModuleRouteGuard: React.FC<ModuleRouteGuardProps> = ({
  moduleId,
  component: Component,
  ...restProps
}) => {
  const { modules, loading, isAdmin } = useModuleRegistry();

  if (loading) {
    return <PageLoader />;
  }

  const moduleDef = modules.find((m) => m.id === moduleId)
    || DEFAULT_MODULE_REGISTRY.find((m) => m.id === moduleId);

  // If module is not in registry, treat as standard unmanaged route
  if (!moduleDef) {
    return <Component {...restProps} />;
  }

  // 1. Published: Fully accessible according to normal route specifications
  if (moduleDef.lifecycleState === 'published') {
    return <Component {...restProps} />;
  }

  // 2. Development: Accessible ONLY to verified administrator (9717845477)
  if (moduleDef.lifecycleState === 'development') {
    if (isAdmin) {
      return (
        <div className="relative min-h-screen">
          {/* Admin Dev Mode Header Ribbon */}
          <div className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span>
                [DEV MODE] Module: <span className="underline">{moduleDef.displayName}</span> — Administrator Access Only
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/admin/modules"
                className="px-2.5 py-1 rounded bg-slate-950 text-white hover:bg-slate-900 transition-colors text-[11px]"
              >
                Module Control Center
              </Link>
            </div>
          </div>
          <Component {...restProps} />
        </div>
      );
    }
    // Unauthorized visitor attempting to access in-development route
    return <Navigate to="/" replace />;
  }

  // 3. Testing: Accessible to administrator (or authorized testers)
  if (moduleDef.lifecycleState === 'testing') {
    if (isAdmin) {
      return (
        <div className="relative min-h-screen">
          <div className="sticky top-0 z-50 bg-blue-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <Beaker className="w-4 h-4" />
              <span>
                [TESTING MODE] Module: <span className="underline">{moduleDef.displayName}</span> — Quality Certification Phase
              </span>
            </div>
            <Link
              to="/admin/modules"
              className="px-2.5 py-1 rounded bg-slate-950 text-white hover:bg-slate-900 transition-colors text-[11px]"
            >
              Module Control Center
            </Link>
          </div>
          <Component {...restProps} />
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  // 4. Hidden: Inaccessible to non-admin visitors
  if (moduleDef.lifecycleState === 'hidden') {
    if (isAdmin) {
      return (
        <div className="relative min-h-screen">
          <div className="sticky top-0 z-50 bg-slate-800 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>
                [HIDDEN MODULE] {moduleDef.displayName} — Previewing as Administrator
              </span>
            </div>
            <Link
              to="/admin/modules"
              className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors text-[11px]"
            >
              Configure in Control Center
            </Link>
          </div>
          <Component {...restProps} />
        </div>
      );
    }
    // Ordinary user enters hidden route directly -> Safe redirect without leaking metadata
    return <Navigate to="/" replace />;
  }

  // 5. Disabled: Unavailable to public
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full p-8 rounded-2xl border border-border bg-card text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Feature Currently Unavailable</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This service is temporarily disabled for scheduled maintenance or upgrades. Please check back later.
        </p>
        <div className="pt-2">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/">
              <ArrowLeft className="w-4 h-4" />
              Return to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
