/**
 * Error reporting hook - currently disabled to resolve React instance conflicts
 * Will be re-enabled after React import standardization
 */

export const useErrorReporting = () => {
  // Temporarily disabled - returning empty object
  return { reportError: () => {} };
};
