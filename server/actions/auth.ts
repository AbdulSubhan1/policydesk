"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOCALE_COOKIE } from "@/constants/i18n";
import { isLocale } from "@/lib/i18n";
import type { ActionResult } from "@/schemas/action-result";
import { loginSchema, type LoginInput } from "@/schemas/login";
import { createSession, destroySession } from "@/server/auth";
import { db, schema } from "@/server/db";
import { ipFrom, isBlocked, noteBlocked, noteFailure, noteSuccess } from "@/server/login-guard";

export async function login(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  // A guessing address is refused before the database or bcrypt is touched
  const ip = ipFrom(await headers());
  if (isBlocked(ip)) {
    noteBlocked(ip);
    return { ok: false, error: "errors.tooManyAttempts" };
  }

  const email = parsed.data.email.toLowerCase();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  const reason = !user
    ? "unknown_account"
    : !user.active
      ? "inactive"
      : !(await bcrypt.compare(parsed.data.password, user.passwordHash))
        ? "wrong_password"
        : null;
  if (reason) {
    // The visitor sees one message for all three, so the form doesn't tell which emails exist
    noteFailure(ip, email, reason);
    return { ok: false, error: "errors.invalidLogin" };
  }
  noteSuccess(ip, email);
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function setLocale(formData: FormData) {
  const locale = formData.get("locale");
  if (isLocale(locale)) {
    (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
}
