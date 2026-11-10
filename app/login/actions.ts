"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Invalid email or password" };
  }

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
