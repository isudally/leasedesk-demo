import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (authentication)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Landlords table
export const landlords = pgTable("landlords", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uniqueRef: text("unique_ref").notNull().unique(), // LL001, LL002, etc.
  fullName: text("full_name").notNull(),
  gender: text("gender"), // 'Mr' | 'Mrs' | 'Miss' - for French contract grammar
  idCardNumber: text("id_card_number"),
  address: text("address"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  signatureUrl: text("signature_url"), // path to stored signature image
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLandlordSchema = createInsertSchema(landlords).omit({
  id: true,
  createdAt: true,
});

export type InsertLandlord = z.infer<typeof insertLandlordSchema>;
export type Landlord = typeof landlords.$inferSelect;

// Stores/Properties table
export const stores = pgTable("stores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uniqueRef: text("unique_ref").notNull().unique(), // ST001, ST002, etc.
  storeNumber: text("store_number").notNull(), // Shop 1, Shop 2, etc.
  floor: text("floor").notNull(), // Ground Floor, First Floor, etc.
  size: text("size"), // optional: square meters
  features: text("features"), // optional: description
  isArchived: boolean("is_archived").default(false).notNull(),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  archivedAt: true,
  createdAt: true,
});

export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof stores.$inferSelect;

// Tenants table
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  landlordId: varchar("landlord_id").notNull().references(() => landlords.id),
  storeId: varchar("store_id").references(() => stores.id),
  tenantType: text("tenant_type").default('individual'), // 'individual' | 'company'
  gender: text("gender"), // 'Mr' | 'Miss' | 'Mrs' - only for individuals
  tenantName: text("tenant_name").notNull(),
  businessName: text("business_name"),
  tenantIdCard: text("tenant_id_card"),
  tenantAddress: text("tenant_address"),
  tenantPhone: text("tenant_phone"),
  tenantEmail: text("tenant_email"),
  tradePermitNo: text("trade_permit_no"),
  tradePermitExpiry: date("trade_permit_expiry"),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  leaseStart: date("lease_start").notNull(),
  leaseEnd: date("lease_end").notNull(),
  utilitiesCharge: decimal("utilities_charge", { precision: 10, scale: 2 }).default('200'),
  deposit: decimal("deposit", { precision: 10, scale: 2 }),
  depositPaid: boolean("deposit_paid").default(false),
  premisesAddress: text("premises_address"),
  commercialPurpose: text("commercial_purpose"),
  notes: text("notes"),
  renewalDecision: text("renewal_decision"), // pending, renew, not_renew
  isActive: boolean("is_active").default(true).notNull(),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  landlord: one(landlords, {
    fields: [tenants.landlordId],
    references: [landlords.id],
  }),
  store: one(stores, {
    fields: [tenants.storeId],
    references: [stores.id],
  }),
  payments: many(payments),
  contracts: many(contracts),
  documents: many(documents),
}));

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).refine(
  (data) => {
    // Gender is required for individuals
    if (data.tenantType === "individual") {
      return !!data.gender && ['Mr', 'Miss', 'Mrs'].includes(data.gender);
    }
    return true;
  },
  {
    message: "Gender (Mr, Miss, or Mrs) is required for individual tenants",
    path: ["gender"],
  }
);

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  receivedBy: text("received_by"), // Who received the payment
  paymentDate: date("payment_date").notNull(),
  monthYear: text("month_year").notNull(), // e.g., "October 2025" for tracking which month
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }).notNull(), // What tenant owes for rent
  utilitiesAmount: decimal("utilities_amount", { precision: 10, scale: 2 }), // What tenant owes for utilities
  totalAmountDue: decimal("total_amount_due", { precision: 10, scale: 2 }).notNull(), // rent + utilities
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }).notNull(), // Actual amount received from tenant
  tdsAmount: decimal("tds_amount", { precision: 10, scale: 2 }), // Deprecated - no longer used
  landlordAmount: decimal("landlord_amount", { precision: 10, scale: 2 }).notNull(), // Same as paymentAmount (full amount to landlord)
  balance: decimal("balance", { precision: 10, scale: 2 }), // totalDue - payment (if partial payment)
  tdsPaidToMRA: boolean("tds_paid_to_mra").default(false), // Deprecated - no longer used
  landlordSigned: boolean("landlord_signed").default(false),
  tenantSigned: boolean("tenant_signed").default(false),
  receiptNumber: text("receipt_number").notNull(),
  status: text("status").default("posted").notNull(), // posted, corrected, reversal
  correctionOfPaymentId: varchar("correction_of_payment_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
}));

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Contracts table (for contract PDF storage and history)
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  landlordId: varchar("landlord_id").notNull().references(() => landlords.id),
  contractDate: date("contract_date").notNull(), // When contract was generated
  leaseStart: date("lease_start").notNull(), // Lease period start
  leaseEnd: date("lease_end").notNull(), // Lease period end
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  fileUrl: text("file_url").notNull(), // Object storage path
  fileName: text("file_name").notNull(), // Original filename
  fileSize: text("file_size"), // File size in bytes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contractsRelations = relations(contracts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [contracts.tenantId],
    references: [tenants.id],
  }),
  landlord: one(landlords, {
    fields: [contracts.landlordId],
    references: [landlords.id],
  }),
}));

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

// Documents table (for KYC documents - ID cards, trade permits, etc.)
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull().references(() => tenants.id),
  documentName: text("document_name").notNull(), // e.g., "National ID Card", "Trade Permit"
  documentType: text("document_type").notNull(), // id_card, trade_permit, proof_of_address, bank_statement, other
  fileUrl: text("file_url").notNull(), // Object storage path
  fileName: text("file_name").notNull(), // Original filename
  fileSize: text("file_size"), // File size in bytes
  mimeType: text("mime_type"),
  storageKey: text("storage_key"),
  isArchived: boolean("is_archived").default(false).notNull(),
  archivedAt: timestamp("archived_at"),
  notes: text("notes"), // Optional notes about the document
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const documentsRelations = relations(documents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [documents.tenantId],
    references: [tenants.id],
  }),
}));

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  archivedAt: true,
  uploadedAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// System settings table (for building info, etc.)
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paidBy: text("paid_by"), // Who paid the expense
  expenseDate: date("expense_date").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(), // maintenance, utilities, repairs, cleaning, other
  otherCategoryText: text("other_category_text"), // Free text when category is "other"
  expenseType: text("expense_type").notNull(), // "store-specific" or "building-wide"
  storeId: varchar("store_id").references(() => stores.id), // null if building-wide
  splitMethod: text("split_method"), // "equal", "by_rent", "n/a", null if store-specific
  isArchived: boolean("is_archived").default(false).notNull(),
  archivedAt: timestamp("archived_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  store: one(stores, {
    fields: [expenses.storeId],
    references: [stores.id],
  }),
}));

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  archivedAt: true,
  createdAt: true,
}).refine(
  (data) => {
    if (data.expenseType === "store-specific") {
      return !!data.storeId;
    }
    return true;
  },
  {
    message: "storeId is required for store-specific expenses",
    path: ["storeId"],
  }
).refine(
  (data) => {
    if (data.expenseType === "building-wide") {
      return !!data.splitMethod;
    }
    return true;
  },
  {
    message: "splitMethod is required for building-wide expenses",
    path: ["splitMethod"],
  }
);

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
