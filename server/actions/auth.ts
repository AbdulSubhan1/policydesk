"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCALE_COOKIE } from "@/constants/i18n";
import { isLocale } from "@/lib/i18n";
import type { ActionResult } from "@/schemas/action-result";
import { loginSchema, type LoginInput } from "@/schemas/login";
import { createSession, destroySession } from "@/server/auth";
import { db, schema } from "@/server/db";

export async function login(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, parsed.data.email.toLowerCase()));
  if (!user || !user.active || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { ok: false, error: "errors.invalidLogin" };
  }
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
