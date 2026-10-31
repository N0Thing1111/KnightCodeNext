import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
const cookieName = "kc_password_recovery";
const sign = (value: string) => createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update("password-recovery:" + value).digest("hex");
export async function startPasswordRecovery(userId: string) {
  const value = userId + "." + (Date.now() + 15 * 60 * 1000);
  (await cookies()).set(cookieName, value + "." + sign(value), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 900 });
}
export async function hasPasswordRecovery(userId: string) {
  const token = (await cookies()).get(cookieName)?.value || "";
  const [id, expires, signature] = token.split(".");
  if (id !== userId || !Number.isFinite(Number(expires)) || Number(expires) <= Date.now() || !/^[a-f0-9]{64}$/.test(signature || "")) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(sign(id + "." + expires)));
}
export async function clearPasswordRecovery() { (await cookies()).delete(cookieName); }
