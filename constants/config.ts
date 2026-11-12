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

/** Rows per page in every DataTable. */
export const PAGE_SIZE = 15;

/** Automatic assignment picks people by role name, not permission, so extra grants never make someone eligible. */
export const COORDINATOR_ROLE = "Coordinator";
/** Picked for a website lead once its online payment succeeds. */
export const ADVISOR_ROLE = "Advisor";

/** How long a coordinator's payment link works. */
export const PAY_LINK_HOURS = 72;

/** Website API calls allowed per visitor IP per hour, by endpoint group. Each has an env override (server/website/rate-limit.ts). */
export const RATE_LIMITS_PER_HOUR = { lead: 5, select: 30, pay: 20, link: 20, read: 600 } as const;
/** The visitor's IP, sent by the website with each API call. */
export const CLIENT_IP_HEADER = "x-brokwise-client-ip";
