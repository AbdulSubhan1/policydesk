// Every status and stage in the app. The database schema, schemas/ and the UI all import from here.

/** An opportunity is the raw inquiry. A coordinator qualifies it and converts it into a lead for an advisor. */
export const OPPORTUNITY_STATUSES = ["new", "contacted", "qualified", "disqualified", "converted"] as const;
/** Statuses a user may set by hand; "converted" is set by the convert action. */
export const EDITABLE_OPPORTUNITY_STATUSES = ["new", "contacted", "qualified", "disqualified"] as const;
/** Still waiting on the coordinator; counts towards their workload in automatic assignment. */
export const OPEN_OPPORTUNITY_STATUSES = ["new", "contacted", "qualified"] as const;
export const OPPORTUNITY_SOURCES = ["website", "referral", "phone", "partner", "social"] as const;

export const LEAD_TYPES = ["new_business", "renewal"] as const;
export const LEAD_STAGES = ["needs_analysis", "quoted", "kyc", "won", "lost"] as const;
export const CLOSED_LEAD_STAGES = ["won", "lost"] as const;
/** Stages a user may set by hand; "won" is set when a policy is booked. */
export const EDITABLE_LEAD_STAGES = ["needs_analysis", "quoted", "kyc", "lost"] as const;

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected"] as const;
export const QUOTE_DECISIONS = ["accepted", "rejected"] as const;

export const KYC_STATUSES = ["pending", "submitted", "approved", "rejected"] as const;
export const KYC_DECISIONS = ["approved", "rejected"] as const;
export const RISK_RATINGS = ["low", "medium", "high"] as const;
export const SOURCES_OF_FUNDS = ["salary", "business", "savings", "investments", "cash"] as const;

/** booked = issued but unpaid; it becomes active once the payment is recorded. */
export const POLICY_STATUSES = ["booked", "active", "cancelled"] as const;
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;
/** online = paid on the website through PaySandbox; the others are recorded by finance. */
export const PAYMENT_METHODS = ["card", "bank_transfer", "cheque", "cash", "online"] as const;
/** A website order: pending until PaySandbox confirms; expired when the visitor changed their plan before paying. */
export const ORDER_STATUSES = ["pending", "paid", "expired"] as const;
export const POLICY_FILTERS = ["booked", "active", "cancelled", "unpaid", "renewal_due"] as const;

export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];
export type LeadType = (typeof LEAD_TYPES)[number];
export type LeadStage = (typeof LEAD_STAGES)[number];
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];
export type KycStatus = (typeof KYC_STATUSES)[number];
export type RiskRating = (typeof RISK_RATINGS)[number];
export type SourceOfFunds = (typeof SOURCES_OF_FUNDS)[number];
export type PolicyStatus = (typeof POLICY_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
