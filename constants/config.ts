// App-wide constants. Import from here; never repeat these values elsewhere.

export const SESSION_COOKIE = "pd_session";
export const SESSION_DAYS = 7;

/** Password of every seeded demo user. */
export const DEMO_PASSWORD = "demo1234";

export const CURRENCY = "USD";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const UPLOAD_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

/** Policies ending within this many days show up as due for renewal. */
export const RENEWAL_WINDOW_DAYS = 45;
