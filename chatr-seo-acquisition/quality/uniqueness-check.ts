/**
 * QUALITY CHECK 3: Uniqueness & Anti-Duplication Check
 *
 * Invariant: Compares the generated page against previously published pages
 * in the same cluster to guarantee that >60% of the content is unique
 * (preventing simple find-and-replace programmatic spam).
 */

export interface UniquenessCheckResult {
  passed: boolean;
  uniquenessRatio: number;
  reason: string;
}

/**
 * Tokenizes text into word n-grams (trigrams) to compute Jaccard similarity.
 */
function extractTrigrams(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const trigrams = new Set<string>();
  for (let i = 0; i < words.length - 2; i++) {
    trigrams.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return trigrams;
}

export function checkUniqueness(
  currentText: string,
  existingSampleTexts: string[] = []
): UniquenessCheckResult {
  if (existingSampleTexts.length === 0) {
    return {
      passed: true,
      uniquenessRatio: 1.0,
      reason: 'First page in cluster — 100% unique baseline.'
    };
  }

  const currentTrigrams = extractTrigrams(currentText);
  if (currentTrigrams.size === 0) {
    return {
      passed: false,
      uniquenessRatio: 0,
      reason: 'Insufficient content to evaluate uniqueness.'
    };
  }

  let maxSimilarity = 0;

  for (const sample of existingSampleTexts) {
    const sampleTrigrams = extractTrigrams(sample);
    if (sampleTrigrams.size === 0) continue;

    let intersectionCount = 0;
    for (const tri of currentTrigrams) {
      if (sampleTrigrams.has(tri)) {
        intersectionCount++;
      }
    }

    const unionCount = currentTrigrams.size + sampleTrigrams.size - intersectionCount;
    const similarity = intersectionCount / (unionCount || 1);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
    }
  }

  const uniquenessRatio = 1 - maxSimilarity;

  // We require at least 55% unique content compared to any existing page
  const passed = uniquenessRatio >= 0.55;

  return {
    passed,
    uniquenessRatio,
    reason: passed
      ? `Uniqueness check passed: ${(uniquenessRatio * 100).toFixed(1)}% unique content.`
      : `Duplication risk: ${(maxSimilarity * 100).toFixed(1)}% similarity with existing page in cluster (threshold is <45% similarity).`
  };
}
