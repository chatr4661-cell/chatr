import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Global, reusable skeletons that match the real layouts so the
 * app feels instantly responsive while data hydrates.
 *
 * All skeletons use semantic tokens via the shadcn Skeleton primitive.
 */

/* -------------------- Chat -------------------- */

export const ChatScreenSkeleton = memo(() => (
  <div className="flex h-full flex-col bg-background">
    {/* Top bar */}
    <div className="flex items-center gap-3 border-b p-3">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>

    {/* Message stream */}
    <div className="flex-1 space-y-4 overflow-hidden p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
        >
          <div className="flex max-w-[75%] gap-2">
            {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full" />}
            <div className="space-y-2">
              <Skeleton
                className={`h-14 rounded-2xl ${i % 2 === 0 ? 'w-44' : 'w-60'}`}
              />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Composer */}
    <div className="flex items-center gap-2 border-t p-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-10 flex-1 rounded-full" />
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
  </div>
));
ChatScreenSkeleton.displayName = 'ChatScreenSkeleton';

/* -------------------- Dashboard -------------------- */

export const DashboardSkeleton = memo(() => (
  <div className="space-y-6 p-4">
    {/* Greeting */}
    <div className="space-y-2">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-4 w-40" />
    </div>

    {/* Stat cards */}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>

    {/* Quick actions grid */}
    <div className="space-y-3">
      <Skeleton className="h-5 w-32" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2 text-center">
            <Skeleton className="mx-auto h-14 w-14 rounded-2xl" />
            <Skeleton className="mx-auto h-3 w-12" />
          </div>
        ))}
      </div>
    </div>

    {/* Activity feed */}
    <div className="space-y-3">
      <Skeleton className="h-5 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  </div>
));
DashboardSkeleton.displayName = 'DashboardSkeleton';

/* -------------------- Healthcare booking flow -------------------- */

export const HealthcareBookingSkeleton = memo(() => (
  <div className="space-y-6 p-4">
    {/* Provider hero card */}
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-4">
        <Skeleton className="h-20 w-20 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>

    {/* Service selector */}
    <div className="space-y-3">
      <Skeleton className="h-5 w-32" />
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-14" />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Date picker row */}
    <div className="space-y-3">
      <Skeleton className="h-5 w-28" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex w-16 flex-col items-center gap-2 rounded-lg border p-3"
          >
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>

    {/* Time slots */}
    <div className="space-y-3">
      <Skeleton className="h-5 w-32" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-md" />
        ))}
      </div>
    </div>

    {/* Confirm CTA */}
    <Skeleton className="h-12 w-full rounded-xl" />
  </div>
));
HealthcareBookingSkeleton.displayName = 'HealthcareBookingSkeleton';
