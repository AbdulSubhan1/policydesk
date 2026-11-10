import { boolean, date, integer, jsonb, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";
import type { Localized } from "@/constants/i18n";
import type { DepartmentKey, Product } from "@/constants/products";
import type {
  KycStatus,
  LeadStage,
  LeadType,
  OpportunityStatus,
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
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
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
  // The coordinator responsible for qualifying it
  coordinatorId: integer("coordinator_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
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

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  // Insurer, plan name and cover are copied from the plan so old quotes stay correct if the plan changes later
  planId: integer("plan_id").references(() => plans.id),
  insurer: text("insurer").notNull(),
  planName: jsonb("plan_name").$type<Localized>().notNull(),
  cover: text("cover").notNull(),
  premium: integer("premium").notNull(),
  status: text("status").$type<QuoteStatus>().notNull().default("sent"),
  createdBy: integer("created_by").references(() => users.id),
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
