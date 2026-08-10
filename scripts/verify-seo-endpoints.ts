/**
 * CI/build verification for production SEO endpoints.
 *
 * Verifies that GET /sitemap.xml and GET /robots.txt return:
 *  - HTTP 200
 *  - the expected content-type family (XML / plain text)
 *  - valid, non-empty body content (well-formed XML urlset/sitemapindex, or
 *    plain-text robots directives that are not HTML/JS)
 *
 * Usage:
 *   tsx scripts/verify-seo-endpoints.ts                 # checks https://chatr.chat
 *   tsx scripts/verify-seo-endpoints.ts --base=<url>    # checks another origin
 *   SEO_VERIFY_BASE_URL=<url> tsx scripts/verify-seo-endpoints.ts
 *
 * Exit code 0 = all checks passed, 1 = at least one failure.
 * Set SEO_VERIFY_SOFT_FAIL=1 to report problems without failing the build
 * (useful for pre-deploy pipelines where production is not yet updated).
 */

const DEFAULT_BASE_URL = "https://chatr.chat";
const TIMEOUT_MS = Number(process.env.SEO_VERIFY_TIMEOUT_MS ?? 15000);
const SOFT_FAIL = process.env.SEO_VERIFY_SOFT_FAIL === "1";

const baseArg = process.argv.find((a) => a.startsWith("--base="))?.slice("--base=".length);
const BASE_URL = (baseArg || process.env.SEO_VERIFY_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");

type Result = { name: string; ok: boolean; details: string[] };

const HTML_MARKERS = ["<!doctype html", "<html", "<script", "<div"];

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "chatr-seo-ci/1.0", accept: "*/*" },
    });
  } finally {
    clearTimeout(timer);
  }
}

function checkStatus(res: Response, details: string[]): boolean {
  if (res.status !== 200) {
    details.push(`FAIL status: expected 200, received ${res.status}`);
    return false;
  }
  details.push("OK status: 200");
  return true;
}

function checkContentType(res: Response, allowed: string[], details: string[]): boolean {
  const raw = (res.headers.get("content-type") || "").toLowerCase();
  const type = raw.split(";")[0].trim();
  if (!allowed.includes(type)) {
    details.push(`FAIL content-type: expected one of ${allowed.join(", ")}, received "${raw || "(none)"}"`);
    return false;
  }
  details.push(`OK content-type: ${raw}`);
  return true;
}

function checkNotHtml(body: string, details: string[]): boolean {
  const lower = body.slice(0, 2000).toLowerCase();
  const marker = HTML_MARKERS.find((m) => lower.includes(m));
  if (marker) {
    details.push(`FAIL body: HTML/JS payload detected ("${marker}") — SPA fallback is being served`);
    return false;
  }
  return true;
}

function checkSitemapXml(body: string, details: string[]): boolean {
  let ok = true;

  if (!body.trimStart().startsWith("<?xml")) {
    details.push('FAIL xml: body does not start with "<?xml"');
    ok = false;
  }

  const isUrlset = /<urlset[\s>]/.test(body);
  const isIndex = /<sitemapindex[\s>]/.test(body);
  if (!isUrlset && !isIndex) {
    details.push("FAIL xml: no <urlset> or <sitemapindex> root element found");
    ok = false;
  }

  const closing = isIndex ? "</sitemapindex>" : "</urlset>";
  if ((isUrlset || isIndex) && !body.includes(closing)) {
    details.push(`FAIL xml: missing closing ${closing} (truncated response)`);
    ok = false;
  }

  // Well-formedness: tag balance + entity safety.
  const tagNames = [...body.matchAll(/<\/?([a-zA-Z][\w:-]*)[^>]*?(\/?)>/g)];
  const stack: string[] = [];
  for (const m of tagNames) {
    const [full, name, selfClose] = m;
    if (full.startsWith("<?") || full.startsWith("<!")) continue;
    if (selfClose === "/") continue;
    if (full.startsWith("</")) {
      const open = stack.pop();
      if (open !== name) {
        details.push(`FAIL xml: mismatched tag </${name}> (expected </${open ?? "none"}>)`);
        ok = false;
        break;
      }
    } else {
      stack.push(name);
    }
  }
  if (ok && stack.length > 0) {
    details.push(`FAIL xml: unclosed tag(s): ${stack.join(", ")}`);
    ok = false;
  }

  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/.test(body)) {
    details.push("FAIL xml: unescaped ampersand found in document");
    ok = false;
  }

  const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (locs.length === 0) {
    details.push("FAIL xml: no <loc> entries found");
    ok = false;
  } else {
    details.push(`OK xml: well-formed with ${locs.length} <loc> entr${locs.length === 1 ? "y" : "ies"}`);
    const bad = locs.filter((l) => !/^https:\/\//.test(l));
    if (bad.length > 0) {
      details.push(`FAIL xml: ${bad.length} non-https <loc> value(s), e.g. ${bad[0]}`);
      ok = false;
    }
  }

  return ok;
}

function checkRobotsText(body: string, details: string[]): boolean {
  let ok = true;

  if (body.trim().length === 0) {
    details.push("FAIL robots: body is empty");
    return false;
  }

  if (!/^\s*user-agent\s*:/im.test(body)) {
    details.push("FAIL robots: no `User-agent:` directive found");
    ok = false;
  }

  if (!/^\s*(allow|disallow)\s*:/im.test(body)) {
    details.push("FAIL robots: no `Allow:`/`Disallow:` directive found");
    ok = false;
  }

  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith("#"));
  const invalid = lines.filter((l) => !/^[a-zA-Z-]+\s*:/.test(l));
  if (invalid.length > 0) {
    details.push(`FAIL robots: ${invalid.length} malformed line(s), e.g. "${invalid[0].slice(0, 80)}"`);
    ok = false;
  }

  if (ok) details.push(`OK robots: ${lines.length} valid directive line(s)`);
  return ok;
}

async function verifySitemap(): Promise<Result> {
  const name = `${BASE_URL}/sitemap.xml`;
  const details: string[] = [];
  try {
    const res = await fetchWithTimeout(name);
    const body = await res.text();
    const ok =
      checkStatus(res, details) &&
      checkContentType(res, ["application/xml", "text/xml"], details) &&
      checkNotHtml(body, details) &&
      checkSitemapXml(body, details);
    return { name, ok, details };
  } catch (error) {
    details.push(`FAIL request: ${(error as Error).message}`);
    return { name, ok: false, details };
  }
}

async function verifyRobots(): Promise<Result> {
  const name = `${BASE_URL}/robots.txt`;
  const details: string[] = [];
  try {
    const res = await fetchWithTimeout(name);
    const body = await res.text();
    const ok =
      checkStatus(res, details) &&
      checkContentType(res, ["text/plain"], details) &&
      checkNotHtml(body, details) &&
      checkRobotsText(body, details);
    return { name, ok, details };
  } catch (error) {
    details.push(`FAIL request: ${(error as Error).message}`);
    return { name, ok: false, details };
  }
}

async function main() {
  console.log(`\nSEO endpoint verification — base: ${BASE_URL}\n`);

  const results = [await verifySitemap(), await verifyRobots()];

  for (const result of results) {
    console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.name}`);
    for (const line of result.details) console.log(`      ${line}`);
    console.log("");
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) {
    console.log("All SEO endpoint checks passed.\n");
    return;
  }

  console.error(`${failed.length} of ${results.length} SEO endpoint check(s) failed.\n`);
  if (SOFT_FAIL) {
    console.error("SEO_VERIFY_SOFT_FAIL=1 — not failing the build.\n");
    return;
  }
  process.exit(1);
}

main().catch((error) => {
  console.error("SEO endpoint verification crashed:", error);
  process.exit(1);
});
