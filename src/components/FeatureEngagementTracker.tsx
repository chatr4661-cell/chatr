import { useFeatureEngagementTracking } from "@/hooks/useFeatureEngagementTracking";

/**
 * Mounts the feature engagement tracker. Must live inside <BrowserRouter>.
 * Records per-user visits to feature routes so the Smart Push Engine can
 * recommend features the user hasn't tried yet.
 */
export function FeatureEngagementTracker() {
  useFeatureEngagementTracking();
  return null;
}
