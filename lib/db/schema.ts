import { boolean, date, integer, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";

export const PRODUCTS = ["motor", "health", "travel", "home", "life"] as const;
export const LEAD_STATUSES = ["new", "contacted", "quoted", "won", "lost"] as const;
export const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected"] as const;
export const POLICY_STATUSES = ["active", "cancelled"] as const;

export type Product = (typeof PRODUCTS)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

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
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  product: text("product").$type<Product>().notNull(),
  status: text("status").$type<LeadStatus>().notNull().default("new"),
  source: text("source").notNull().default("website"),
  notes: text("notes").notNull().default(""),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  insurer: text("insurer").notNull(),
  premium: integer("premium").notNull(),
  coverage: text("coverage").notNull(),
  status: text("status").$type<QuoteStatus>().notNull().default("sent"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const policies = pgTable("policies", {
  id: serial("id").primaryKey(),
  policyNumber: text("policy_number").notNull().unique(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  quoteId: integer("quote_id")
    .notNull()
    .references(() => quotes.id),
  premium: integer("premium").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").$type<PolicyStatus>().notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  details: text("details").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
