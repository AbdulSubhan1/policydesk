import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { AddOnKind, QuoteAddOn } from "@/constants/add-ons";
import type { Localized } from "@/constants/i18n";
import type { DepartmentKey, Product } from "@/constants/products";
import type {
  KycStatus,
  LeadStage,
  LeadType,
  OpportunityStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PolicyStatus,
  QuoteStatus,
  RiskRating,
  SourceOfFunds,
} from "@/constants/statuses";

// Labels come from messages ("departments.<key>")
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  key: text("key").$type<DepartmentKey>().notNull().unique(),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  // System roles (Admin) cannot be edited, so nobody can lock themselves out
  isSystem: boolean("is_system").notNull().default(false),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permission: text("permission").notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permission] })],
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  roleId: integer("role_id")
    .notNull()
    .references(() => roles.id),
  departmentId: integer("department_id").references(() => departments.id),
  // E.164; shown to website visitors on the coordinator card
  phone: text("phone").notNull().default(""),
  active: boolean("active").notNull().default(true),
  // Off = skipped by automatic assignment (leave, full queue) while still able to sign in
  available: boolean("available").notNull().default(true),
  // Breaks ties in automatic assignment: whoever waited longest gets the next one
  lastAssignedAt: timestamp("last_assigned_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  // The website only ever sees this id, never the serial one
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  product: text("product").$type<Product>().notNull(),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  status: text("status").$type<OpportunityStatus>().notNull().default("new"),
  source: text("source").notNull().default("website"),
  notes: text("notes").notNull().default(""),
  // Product-specific answers from the website form, validated by schemas/website.ts
  details: jsonb("details").$type<Record<string, string | number | boolean>>().notNull().default({}),
  // The coordinator responsible for qualifying it
  coordinatorId: integer("coordinator_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  // Links use the UUID so they can't be guessed; people quote the reference, e.g. CAR-J2M3HX7
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  reference: text("reference").notNull().unique(),
  // One opportunity can produce several leads: the first sale and each yearly renewal
  opportunityId: integer("opportunity_id")
    .notNull()
    .references(() => opportunities.id, { onDelete: "cascade" }),
  type: text("type").$type<LeadType>().notNull().default("new_business"),
  previousPolicyId: integer("previous_policy_id"),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  advisorId: integer("advisor_id").references(() => users.id),
  stage: text("stage").$type<LeadStage>().notNull().default("needs_analysis"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insurers = pgTable("insurers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  contactEmail: text("contact_email").notNull().default(""),
  active: boolean("active").notNull().default(true),
});

/** Plans we sell, loaded from each insurer. Quotes are created from these. */
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  insurerId: integer("insurer_id")
    .notNull()
    .references(() => insurers.id, { onDelete: "cascade" }),
  product: text("product").$type<Product>().notNull(),
  name: jsonb("name").$type<Localized>().notNull(),
  // A key from PRODUCT_COVERS, labelled through messages ("covers.<key>")
  cover: text("cover").notNull(),
  basePremium: integer("base_premium").notNull(),
  excess: integer("excess").notNull().default(0),
  benefits: text("benefits").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Extras the customer can add to a plan. The plan's price plus the chosen ones is the quote's premium. */
export const planAddOns = pgTable(
  "plan_add_ons",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    // Stable per plan, so the setup step can tell which add-ons a plan already has
    key: text("key").notNull(),
    name: jsonb("name").$type<Localized>().notNull(),
    kind: text("kind").$type<AddOnKind>().notNull(),
    price: integer("price").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (t) => [unique().on(t.planId, t.key)],
);

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  // The lead's reference and the quote's number on that lead, e.g. CAR-J2M3HX7-Q2
  reference: text("reference").notNull().unique(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  // Insurer, plan name and cover are copied from the plan so old quotes stay correct if the plan changes later
  planId: integer("plan_id").references(() => plans.id),
  insurer: text("insurer").notNull(),
  planName: jsonb("plan_name").$type<Localized>().notNull(),
  cover: text("cover").notNull(),
  premium: integer("premium").notNull(),
  // Snapshot of the add-ons in the premium, like the plan name above
  addOns: jsonb("add_ons").$type<QuoteAddOn[]>().notNull().default([]),
  status: text("status").$type<QuoteStatus>().notNull().default("sent"),
  // null = made by the website
  createdBy: integer("created_by").references(() => users.id),
  // The customer's online choice, paid on the website: picked there or by their coordinator for a pay link
  online: boolean("online").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const kycRecords = pgTable("kyc_records", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .unique()
    .references(() => leads.id, { onDelete: "cascade" }),
  status: text("status").$type<KycStatus>().notNull().default("pending"),
  idNumber: text("id_number"),
  nationality: text("nationality"),
  dateOfBirth: date("date_of_birth"),
  idExpiry: date("id_expiry"),
  occupation: text("occupation"),
  sourceOfFunds: text("source_of_funds").$type<SourceOfFunds>(),
  isPep: boolean("is_pep").notNull().default(false),
  // Result of the (simulated) sanctions and watchlist screening
  watchlistMatch: boolean("watchlist_match").notNull().default(false),
  riskRating: text("risk_rating").$type<RiskRating>(),
  riskReasons: text("risk_reasons").array().notNull().default([]),
  eddRequired: boolean("edd_required").notNull().default(false),
  submittedBy: integer("submitted_by").references(() => users.id),
  submittedAt: timestamp("submitted_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
});

export const policies = pgTable("policies", {
  id: serial("id").primaryKey(),
  policyNumber: text("policy_number").notNull().unique(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  quoteId: integer("quote_id")
    .notNull()
    .unique()
    .references(() => quotes.id),
  premium: integer("premium").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").$type<PolicyStatus>().notNull().default("booked"),
  paymentStatus: text("payment_status").$type<PaymentStatus>().notNull().default("pending"),
  paymentMethod: text("payment_method").$type<PaymentMethod>(),
  paymentReference: text("payment_reference"),
  paidAt: timestamp("paid_at"),
  renewedByLeadId: integer("renewed_by_lead_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Central list of document types, managed by admins under Document settings. */
export const documentTypes = pgTable("document_types", {
  id: serial("id").primaryKey(),
  // Admin-entered text, stored per language
  name: jsonb("name").$type<Localized>().notNull(),
  description: jsonb("description").$type<Localized>().notNull().default({ en: "" }),
  active: boolean("active").notNull().default(true),
});

/** Which documents each product asks for. Required ones must be uploaded before a policy can be issued. */
export const productDocuments = pgTable(
  "product_documents",
  {
    product: text("product").$type<Product>().notNull(),
    documentTypeId: integer("document_type_id")
      .notNull()
      .references(() => documentTypes.id, { onDelete: "cascade" }),
    required: boolean("required").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.product, t.documentTypeId] })],
);

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  documentTypeId: integer("document_type_id")
    .notNull()
    .references(() => documentTypes.id),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  // Base64 in Postgres keeps the demo free of extra storage services; files are capped at 2 MB
  data: text("data").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** A website payment for a lead's quote: one row per PaySandbox checkout session. Amounts are whole dollars. */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  quoteId: integer("quote_id")
    .notNull()
    .references(() => quotes.id),
  status: text("status").$type<OrderStatus>().notNull().default("pending"),
  amount: integer("amount").notNull(),
  // What the customer was charged for, as sent to PaySandbox (in dollars here)
  lineItems: jsonb("line_items").$type<OrderLine[]>().notNull(),
  // PaySandbox has no metadata field, so webhooks are matched to the order by this id
  checkoutSessionId: text("checkout_session_id").unique(),
  checkoutUrl: text("checkout_url"),
  // When PaySandbox closes the session (24 h); a pending order is reused only before then
  expiresAt: timestamp("expires_at"),
  paymentId: text("payment_id"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type OrderLine = { name: string; quantity: 1; amount: number };

/** A private link a coordinator sends so the customer can pay on the website. Only the token's hash is kept. */
export const paymentLinks = pgTable("payment_links", {
  id: serial("id").primaryKey(),
  // sha256 hex of the token; the token itself is shown once and never stored
  tokenHash: text("token_hash").notNull().unique(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  openedAt: timestamp("opened_at"),
  revokedAt: timestamp("revoked_at"),
});

/** PaySandbox webhook ids already handled, so a retried or replayed delivery changes nothing. */
export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  // Links quote, KYC, document, payment and policy events to their lead for its timeline
  leadId: integer("lead_id"),
  details: text("details").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Website API calls per visitor IP and endpoint group in each UTC hour (key = `${group}:${ip}`). */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);
