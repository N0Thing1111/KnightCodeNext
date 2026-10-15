"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { historyCategories, type HistoryCleanupResponse, type HistoryFilters, type HistoryPreview } from "@/lib/run-history-contract";

const filtersSchema = z.object({
  kind: z.enum(historyCategories.map(c => c.value)),
  before: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  student: z.union([z.literal(""), z.uuid()]),
  section: z.union([z.literal(""), z.string().regex(/^[1-9]\d{0,14}$/)]),
});
function parseFilters(form: FormData): HistoryFilters {
  const parsed = filtersSchema.safeParse(Object.fromEntries(["kind", "before", "student", "section"].map(key => [key, form.get(key) ?? ""])));
  if (!parsed.success) throw Error("Choose a valid category, cutoff, section, and student.");
  const f = parsed.data;
  const date = new Date(f.before + "T00:00:00Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== f.before)
    throw Error("Choose a valid cutoff date.");
  if (new Date(f.before + "T00:00:00+08:00").getTime() > Date.now() - 86400000)
    throw Error("Choose a cutoff at least 24 hours ago. Recent activity is protected.");
  return f;
}
function signature(payload: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw Error("Cleanup is not configured.");
  return createHmac("sha256", key).update("run-history-preview:" + payload).digest("hex");
}
function issueProof(admin: string, filters: HistoryFilters, fingerprint: string) {
  const payload = Buffer.from(JSON.stringify({ admin, filters, fingerprint, expires: Date.now() + 15 * 60 * 1000 })).toString("base64url");
  return payload + "." + signature(payload);
}
function readProof(proof: string, admin: string, filters: HistoryFilters): string {
  const [payload, mac, extra] = proof.split(".");
  if (!payload || !mac || extra || proof.length > 4000 || !/^[a-f0-9]{64}$/.test(mac)) throw Error("Preview this selection before clearing it.");
  if (!timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(signature(payload), "hex"))) throw Error("Preview this selection again.");
  const saved = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  if (saved.admin !== admin || saved.expires < Date.now() || JSON.stringify(saved.filters) !== JSON.stringify(filters))
    throw Error("The preview expired or the filters changed. Preview again.");
  return saved.fingerprint;
}
function rpcParameters(admin: string, f: HistoryFilters) {
  return { p_admin: admin, p_kind: f.kind, p_before: f.before + "T00:00:00+08:00", p_student: f.student || null, p_class: f.section ? Number(f.section) : null };
}
function databaseError(error: { code?: string; message: string }) {
  if (["PGRST202", "42883", "42703"].includes(error.code || ""))
    return "History cleanup needs database migration 202610150001_run_history_cleanup.sql. No history was cleared.";
  return error.message;
}
export async function previewRunHistory(form: FormData): Promise<HistoryCleanupResponse> {
  const admin = await requireAdmin();
  try {
    const filters = parseFilters(form);
    const { data, error } = await createAdminClient().rpc("manage_run_history", { ...rpcParameters(admin.id, filters), p_execute: false });
    if (error) throw Error(databaseError(error));
    const preview = data as HistoryPreview;
    return { preview, proof: issueProof(admin.id, filters, preview.fingerprint) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not preview history. Nothing was cleared." };
  }
}
export async function clearRunHistory(form: FormData): Promise<HistoryCleanupResponse> {
  const admin = await requireAdmin();
  try {
    const filters = parseFilters(form);
    const fingerprint = readProof(String(form.get("proof") || ""), admin.id, filters);
    if (form.get("confirmation") !== "CLEAR RUN HISTORY") throw Error("Type CLEAR RUN HISTORY to confirm.");
    const password = String(form.get("admin_password") || "");
    if (!password || password.length > 1024) throw Error("Enter your administrator password.");
    // An isolated, non-persisting client verifies the password without changing browser cookies.
    // Never reuse this client for privileged operations after signing it in.
    const check = await createAdminClient().auth.signInWithPassword({ email: admin.email, password });
    if (check.error || check.data.user?.id !== admin.id) throw Error("Administrator password is incorrect.");
    const { data, error } = await createAdminClient().rpc("manage_run_history", {
      ...rpcParameters(admin.id, filters), p_execute: true, p_expected: fingerprint,
    });
    if (error) throw Error(databaseError(error) + " If the connection was interrupted, check Audit history before retrying.");
    revalidatePath("/", "layout");
    return { notice: filters.kind === "python_submitted"
      ? `Cleared code/output for ${data.affected} submitted Runs. Submissions, reviews, and assignment completion were kept.`
      : `Removed ${data.affected} ${filters.kind.startsWith("game_") ? "game sessions and their command history" : "unsubmitted Python Runs"}. Progress, XP, achievements, submissions, and reviews were kept. Preview again if more old history remains.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Cleanup was not confirmed. Check Audit history before retrying." };
  }
}
