/** What every form server action returns: ok, or a message key for the form. */
export type ActionResult = { ok: true } | { ok: false; error: string };
