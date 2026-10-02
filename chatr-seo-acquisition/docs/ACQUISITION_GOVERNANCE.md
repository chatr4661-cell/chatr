# Chatr Autonomous SEO Acquisition Architecture & Governance

## 1. The Core Architectural Invariant

**CHATR Core = Immutable Product. SEO Acquisition Layer = Independent Growth System.**

The existing Chatr application is production-frozen:
* ❌ No modifications to `/auth`, login, OTP, or signup flows
* ❌ No modifications to chat or messaging logic
* ❌ No modifications to voice or video calling (WebRTC)
* ❌ No modifications to SI conversational intelligence
* ❌ No modifications to Supabase database, schemas, or migrations
* ❌ No modifications to pricing or core business logic
* ❌ No modifications to existing application routes, navigation, or UI/UX

All SEO acquisition candidate pages exist strictly outside the application bundle in `chatr-seo-acquisition/` and emit pure, pre-rendered static HTML to `dist-seo/`. Visitor handoff occurs exclusively via public deep links (`/auth?ref=seo_[engine]_[slug]`).

### Cryptographic Core Freeze CI Gate
The core freeze is enforced by a cryptographic trust anchor in `chatr-seo-acquisition/contracts/core-freeze.ts`:
* Scans all 1,412 files across the 12 frozen directories (`src/auth`, `src/components`, `src/contexts`, `src/hooks`, `src/integrations`, `src/layouts`, `src/pages`, `src/routes`, `supabase/migrations`, `supabase/functions`, `android`, `ios`).
* Verifies file checksums against `core-freeze-baseline.json` pinned to baseline commit `17e461cb`.
* Verifies the SHA-256 hash of the baseline manifest itself against `EXPECTED_BASELINE_MANIFEST_SHA256` to prevent tampering.
* Baseline regeneration is blocked behind a break-glass flag (`ALLOW_BASELINE_MUTATION=1`).

---

## 2. Telemetry Machine vs. Acquisition Machine

Google Search Console (GSC) is **not** an acquisition engine; it is a **telemetry and measurement feedback loop**:

```
                  GOOGLE SEARCH
                        │
             millions of search queries
                        │
                        ▼
       ┌──────────────────────────────────┐
       │   CHATR SEO ACQUISITION LAYER    │
       │                                  │
       │  /business/   /jobs/    /guides/ │
       │  /translate/  /compare/ /city/   │
       └────────────────┬─────────────────┘
                        │
              organic visitor click
                        │
                        ▼
       ┌──────────────────────────────────┐
       │       FROZEN CHATR CORE          │
       │                                  │
       │   /auth?ref=seo_[engine]_[slug]  │
       │   Verified Signup & Retention    │
       └──────────────────────────────────┘
                        │
       ═════════════════╪══════════════════════
       TELEMETRY LOOP   │ (Read-Only Search Analytics)
                        ▼
       ┌──────────────────────────────────┐
       │     GSC TELEMETRY INGESTION      │
       │                                  │
       │   Live API (OAuth2 RS256 JWT)    │
       │   Snapshot Persistence (Exports) │
       └────────────────┬─────────────────┘
                        │
                        ▼
       ┌──────────────────────────────────┐
       │    AUTONOMOUS OPPORTUNITY ENGINE │
       │                                  │
       │   Striking Distance Boost (P4-20)│
       │   Snippet CTR Rewriting          │
       │   Cannibalization Consolidation  │
       └──────────────────────────────────┘
```

* **Acquisition Machine**: Google Search ──► Search Landing Pages ──► Organic Clicks ──► Existing Chatr Auth ──► User Signups.
* **Telemetry Machine**: GSC Search Analytics API ──► Opportunity Engine ──► Optimization Directives ──► Template & Quality Refinements.

---

## 3. Anti-Scaled-Content Governance (Cluster Velocity Protocol)

In accordance with Google's Search Essentials on **Scaled Content Abuse**, the acquisition system **must never jump from 18 pages to 10,000 or 50,000 pages blindly**. High-volume algorithmic page generation without verified user demand is explicitly penalized by search algorithms.

### 5-Stage Growth Governance

```
Stage 1: Seed Cluster (18 Pages)
   │
   ▼
Stage 2: Measure Telemetry (GSC Search Analytics Impressions & Positions)
   │
   ▼
Stage 3: Opportunity Optimization (Striking Distance P4–P20 & CTR Rewrites)
   │
   ▼
Stage 4: Controlled Expansion (Only expand clusters showing proven impressions)
   │
   ▼
Stage 5: Conversion Tracking (Monitor /auth?ref=seo_* signup completions)
```

### Invariants for Generating Any New Page:
1. **Demand Evidence Invariant**:
   `Demand Evidence = GSC impressions OR verified external demand signal OR validated user-intent evidence`.
   Pages must demonstrate active search interest via first-party GSC telemetry, third-party search volume, or validated conversational user intent (evaluated with confidence scoring, rather than an arbitrary third-party volume cutoff).
2. **Factual Evidence Invariant**: Every claim, salary range, or entity must be sourced from approved public data with a deterministic cryptographic hash.
3. **Structured Data Invariant**:
   - Role screening guides **must** emit `TechArticle` / `WebPage` + `FAQPage` (Google explicitly bans `JobPosting` on generic role guides).
   - Only verifiable, live job requisitions with active employers may emit `JobPosting`.
4. **Uniqueness Invariant**: Minimum 80% distinct content ratio against sibling pages in the cluster. No placeholder or spun text.
5. **Freeze Invariant**: 0 changes to any file in the frozen core application.

---

## 4. Cryptographic Integrity Verification of Approved Records

Evidence hashes in `chatr-seo-acquisition/data/approved-public-data/index.ts` represent **cryptographic integrity verification of approved-source records**:

```
Authoritative Source (e.g. Government/Census/Bhashini)
                     │
                     ▼
          Controlled Ingestion
                     │
                     ▼
        Approved Dataset Attributes
                     │
                     ▼
       Deterministic JCS Canonicalizer (RFC 8785 subset)
                     │
                     ▼
            SHA-256 Checksum
                     │
                     ▼
      Build-Time Cryptographic Verification Gate
```

* **Scope**: Guarantees that no internal developer edit, AI build script, or template generator has modified or corrupted factual claims since their controlled ingestion.
* **Deterministic Rules (JCS / RFC 8785 subset)**:
  1. **Key Sorting**: Keys sorted lexicographically by UTF-16 code units.
  2. **Whitespace**: Zero extraneous whitespace between tokens.
  3. **IEEE 754 Normalization**: `-0` normalized to `0`; finite number enforcement.
  4. **Undefined Omission**: Undefined object properties strictly omitted; array elements normalized to `null`.
  5. **Hash Computation**: `SHA-256(UTF8_BYTES(JCS(dataPoints)))`.
  6. **Test Suite**: Verified across 31 RFC 8785 test vectors (`npm run seo:jcs:test`).

### Cryptographically Signed Telemetry Snapshots
To prevent the Opportunity Engine from optimizing against altered or stale data, every telemetry snapshot written to `data/gsc-exports/` includes:
```json
{
  "metadata": {
    "retrievedAt": "2026-10-02T...",
    "source": "gsc_live_api",
    "siteUrl": "sc-domain:chatr.chat",
    "rowCount": 5000,
    "schemaVersion": 1,
    "sha256": "43d07d7207e1b9d1c6cec1ab61c9d8a0..."
  },
  "rows": [...]
}
```
Upon ingestion, `ingestGscTelemetry()` recomputes `SHA-256(JCS(rows))` against `metadata.sha256`. Only cryptographically matching files are labeled `verified_export_snapshot`.

---

## 5. Operational GSC Verification Guide

To connect the live telemetry pipeline:

1. **Google Cloud Service Account**:
   - Create a Service Account in your Google Cloud Project.
   - Generate and download an RS256 JSON key.
2. **Search Console Permission**:
   - Open [Google Search Console](https://search.google.com/search-console).
   - Navigate to Domain property `sc-domain:chatr.chat` (or URL-prefix `https://chatr.chat/`).
   - Settings ──► Users and permissions ──► Add User ──► Enter Service Account email ──► Permission: `Restricted` (or `Full`).
3. **Credential Configuration**:
   - Option A: Set `GSC_CLIENT_EMAIL` and `GSC_PRIVATE_KEY` environment variables.
   - Option B: Drop the downloaded JSON file to `chatr-seo-acquisition/config/gsc-service-account.json` (strictly gitignored).
   - Optional: Set `GSC_ROW_LIMIT` (defaults to 25,000 rows with automatic batch pagination).
4. **Run Live Verification**:
   ```bash
   npm run seo:gsc:verify
   ```
   Expected operational output:
   ```
   🔌 Authenticating with Google Search Console API...
   🔑 OAuth2 token successfully acquired.
   📡 Querying Search Analytics API [property: sc-domain:chatr.chat, target: 25000 rows]...
   ✅ LIVE TELEMETRY VERIFIED: Retrieved X real query records from Google Search Console.
   💾 Persisted production telemetry snapshot (SHA-256: ...) to: data/gsc-exports/telemetry-[date].json
   ```
