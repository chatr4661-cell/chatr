import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  assertRateLimit,
  errorResponse,
  handleCors,
  jsonResponse,
  parseJsonBody,
  requireMethod,
  requireUser,
} from "../_shared/security.ts";
import { parsePhoneNumberWithError } from "npm:libphonenumber-js@1.10.49";

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    requireMethod(req, ["POST"]);
    const { user, serviceClient } = await requireUser(req);
    
    // Strict rate limiting: allow 1 sync per day per user (burst up to 3 batches if chunked)
    assertRateLimit(`sync-contacts:${user.id}`, 3, 86400_000);

    const body = await parseJsonBody(req);
    if (!Array.isArray(body.contacts)) {
      return jsonResponse(req, { error: "Expected 'contacts' array" }, 400);
    }

    const UPLOADER_SALT = Deno.env.get("DPDP_UPLOADER_SALT") || "fallback-salt-do-not-use-in-prod";
    
    const validVotes = [];
    const normalizedLogs = []; // for explicit cross-format testing/auditing if needed

    for (const contact of body.contacts) {
      if (!contact.phone || !contact.label) continue;

      try {
        // E.164 normalization enforced server-side
        const phoneNumber = parsePhoneNumberWithError(contact.phone, "IN"); // Default country IN
        const e164 = phoneNumber.format("E.164");

        const normalizedLabel = contact.label
          .replace(/[\u1000-\uFFFF]+/g, "") // Strip emojis
          .toLowerCase()
          .trim()
          .substring(0, 50);

        if (!normalizedLabel) continue;

        const hashedNumber = await sha256(e164);
        const hashedUploader = await sha256(`${hashedNumber}:${user.id}:${UPLOADER_SALT}`);

        validVotes.push({
          hashed_number: hashedNumber,
          normalized_label: normalizedLabel,
          hashed_uploader: hashedUploader,
        });

        // Debug log for the explicit cross-format test case requested by user
        if (contact.phone === "09717845477" || contact.phone === "+919717845477") {
          normalizedLogs.push({ input: contact.phone, e164, hashedNumber });
        }
      } catch (e) {
        // Skip invalid phone numbers quietly
        continue;
      }
    }

    if (validVotes.length > 0) {
      const { error: upsertError } = await serviceClient
        .from("contact_label_votes")
        .upsert(validVotes, { 
          onConflict: 'hashed_number, normalized_label, hashed_uploader', 
          ignoreDuplicates: true 
        });

      if (upsertError) {
        console.error("Batch insert failed:", upsertError);
        return errorResponse(req, new Error("Database insertion failed"));
      }
    }

    return jsonResponse(req, { 
      success: true, 
      processed: validVotes.length,
      test_case_logs: normalizedLogs 
    });

  } catch (error) {
    console.error("Sync contacts error:", error);
    return errorResponse(req, error);
  }
});