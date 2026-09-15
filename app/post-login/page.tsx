import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth/authorize";

/**
 * Role-aware post-login landing — Phase 6.
 *
 * The single shared /login page (Auth.js's Credentials provider covers
 * both employer and admin accounts) can't know which portal to send a
 * just-authenticated user to without a role — and role is deliberately
 * NOT put in the client-visible session/JWT (see auth.ts's own comment:
 * "no role/status cached for authorization decisions"). So this is a
 * tiny server-side hop: requireActiveUser() does a fresh DB read (same
 * as every other protected route) and redirects to /admin or /dashboard
 * based on the real, current role — never a client-side guess.
 */
export default async function PostLoginPage() {
  const user = await requireActiveUser();
  redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
}
