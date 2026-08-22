import {
  type User,
  type InsertUser,
  type Landlord,
  type InsertLandlord,
  type Store,
  type InsertStore,
  type Tenant,
  type InsertTenant,
  type Payment,
  type InsertPayment,
  type Document,
  type InsertDocument,
  type Setting,
  type InsertSetting,
  type Expense,
  type InsertExpense,
} from "@shared/schema";
import { getRuntimeConfig } from "./config";
import { DatabaseStorage } from "./db-storage";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getLandlords(): Promise<Landlord[]>;
  getLandlord(id: string): Promise<Landlord | undefined>;
  getLandlordByRef(uniqueRef: string): Promise<Landlord | undefined>;
  createLandlord(landlord: InsertLandlord): Promise<Landlord>;
  updateLandlord(id: string, landlord: Partial<InsertLandlord>): Promise<Landlord>;
  deleteLandlord(id: string): Promise<void>;
  getStores(): Promise<Store[]>;
  getStore(id: string): Promise<Store | undefined>;
  getStoreByRef(uniqueRef: string): Promise<Store | undefined>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: string, store: Partial<InsertStore>): Promise<Store>;
  deleteStore(id: string): Promise<void>;
  archiveStore(id: string): Promise<Store>;
  getTenants(): Promise<Tenant[]>;
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant>;
  deleteTenant(id: string): Promise<void>;
  archiveTenant(id: string): Promise<Tenant>;
  getExpiringTenants(months: number): Promise<Tenant[]>;
  getPayments(tenantId?: string): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment>;
  correctPayment(id: string, payment: InsertPayment): Promise<{ original: Payment; correction: Payment }>;
  getPaymentsByMonth(monthYear: string): Promise<Payment[]>;
  getUnpaidTDS(): Promise<Payment[]>;
  getDocuments(tenantId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  archiveDocument(id: string): Promise<Document>;
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(setting: InsertSetting): Promise<Setting>;
  getExpenses(): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
  archiveExpense(id: string): Promise<Expense>;
}

const now = () => new Date("2026-08-20T08:00:00.000Z");
const makeId = (prefix: string, index: number) => `${prefix}-${String(index).padStart(3, "0")}`;
const toMonthYear = (date: Date) => date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
const toMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const demoLandlords: Landlord[] = [
  {
    id: "ll-001",
    uniqueRef: "LL001",
    fullName: "Northbridge Property Holdings Ltd",
    gender: null,
    idCardNumber: null,
    address: "18 Market Lane, Riverton",
    phoneNumber: "+230 5000 0101",
    email: "ops@northbridge.example",
    signatureUrl: null,
    createdAt: now(),
  },
  {
    id: "ll-002",
    uniqueRef: "LL002",
    fullName: "Riverside Commercial Partners",
    gender: null,
    idCardNumber: null,
    address: "4 Riverside Avenue, Riverton",
    phoneNumber: "+230 5000 0102",
    email: "admin@riverside.example",
    signatureUrl: null,
    createdAt: now(),
  },
];

const demoStores: Store[] = [
  ["ST001", "Unit 01", "Ground Floor", "42 sqm", "Street-facing retail"],
  ["ST002", "Unit 02", "Ground Floor", "36 sqm", "Corner unit"],
  ["ST003", "Unit 03", "Ground Floor", "30 sqm", "Food-ready utilities"],
  ["ST004", "Unit 04", "Ground Floor", "28 sqm", "Compact service unit"],
  ["ST005", "Unit 05", "Ground Floor", "34 sqm", "Retail shell"],
  ["ST006", "Unit 06", "Ground Floor", "40 sqm", "Rear loading access"],
  ["ST007", "Unit 07", "First Floor", "55 sqm", "Studio/office layout"],
  ["ST008", "Unit 08", "First Floor", "48 sqm", "Office suite"],
  ["ST009", "Unit 09", "First Floor", "32 sqm", "Salon-ready unit"],
  ["ST010", "Unit 10", "First Floor", "38 sqm", "Service unit"],
  ["ST011", "Unit 11", "Second Floor", "60 sqm", "Open office"],
  ["ST012", "Unit 12", "Second Floor", "44 sqm", "Storage/office"],
  ["ST013", "Unit 13", "Second Floor", "26 sqm", "Vacant small unit"],
  ["ST014", "Unit 14", "Ground Floor", "31 sqm", "Vacant retail kiosk"],
  ["ST015", "Unit 15", "First Floor", "45 sqm", "Vacant office"],
  ["ST016", "Unit 16", "Second Floor", "39 sqm", "Vacant service unit"],
].map(([uniqueRef, storeNumber, floor, size, features], index) => ({
  id: makeId("st", index + 1),
  uniqueRef,
  storeNumber,
  floor,
  size,
  features,
  isArchived: false,
  archivedAt: null,
  createdAt: now(),
}));

const tenantSeed = [
  ["tn-001", "ll-001", "st-001", "Bloom Coffee Ltd", "Bloom Coffee", "2026-02-01", "2027-01-31", "12500", "1200", "2026-08", "Cafe"],
  ["tn-002", "ll-001", "st-002", "Corner Health Pharmacy Ltd", "Corner Pharmacy", "2026-01-01", "2026-11-30", "16800", "1400", "2026-08", "Pharmacy"],
  ["tn-003", "ll-002", "st-003", "Atlas Fitness Studio Ltd", "Atlas Fitness", "2025-09-01", "2026-09-30", "21000", "1800", "2026-08", "Fitness studio"],
  ["tn-004", "ll-001", "st-004", "Byte Repair Co Ltd", "Byte Repair", "2026-03-01", "2027-02-28", "9800", "1000", "2026-06", "Electronics repair"],
  ["tn-005", "ll-002", "st-005", "Golden Thread Tailors Ltd", "Golden Thread", "2026-01-01", "2026-12-31", "11200", "1100", "2026-08", "Tailoring"],
  ["tn-006", "ll-001", "st-006", "Urban Eats Ltd", "Urban Eats", "2025-07-01", "2026-10-31", "18500", "1800", "2026-07", "Takeaway food"],
  ["tn-007", "ll-002", "st-007", "Paper Trail Stationers Ltd", "Paper Trail", "2026-06-01", "2027-05-31", "9200", "900", "2026-08", "Stationery"],
  ["tn-008", "ll-001", "st-008", "Green Basket Market Ltd", "Green Basket", "2026-05-01", "2027-04-30", "14500", "1300", "2026-08", "Fresh produce"],
  ["tn-009", "ll-002", "st-009", "Nova Salon Ltd", "Nova Salon", "2025-12-01", "2027-01-15", "13200", "1000", "2026-08", "Hair salon"],
  ["tn-010", "ll-001", "st-010", "Swift Laundry Ltd", "Swift Laundry", "2026-04-01", "2027-03-31", "11800", "1600", "2026-07", "Laundry"],
  ["tn-011", "ll-002", "st-011", "Harbor Books Ltd", "Harbor Books", "2026-07-01", "2027-06-30", "10500", "900", "2026-08", "Bookshop"],
  ["tn-012", "ll-001", "st-012", "Studio Nine Design Ltd", "Studio Nine", "2025-08-01", "2026-08-31", "15400", "1200", "2026-07", "Design studio"],
] as const;

const demoTenants: Tenant[] = tenantSeed.map(([
  tenantId,
  landlordId,
  storeId,
  tenantName,
  businessName,
  leaseStart,
  leaseEnd,
  monthlyRent,
  utilitiesCharge,
  _paidThrough,
  commercialPurpose,
]) => ({
  id: tenantId,
  landlordId,
  storeId,
  tenantType: "company",
  gender: null,
  tenantName,
  businessName,
  tenantIdCard: null,
  tenantAddress: `${businessName} Office, Riverton`,
  tenantPhone: `+230 5000 ${tenantId.slice(-3)}`,
  tenantEmail: `${businessName.toLowerCase().replaceAll(" ", ".")}@example.com`,
  tradePermitNo: `DEMO-PERMIT-${tenantId.slice(-3)}`,
  tradePermitExpiry: "2027-12-31",
  monthlyRent,
  leaseStart,
  leaseEnd,
  utilitiesCharge,
  deposit: (parseFloat(monthlyRent) * 2).toString(),
  depositPaid: true,
  premisesAddress: "Riverton Market Plaza",
  commercialPurpose,
  notes: "Fictional validation-demo record.",
  renewalDecision: "pending",
  isActive: true,
  archivedAt: null,
  createdAt: now(),
  updatedAt: now(),
}));

const partialPayments: Record<string, Record<string, number>> = {
  "tn-006": { "2026-08": 8000 },
  "tn-012": { "2026-08": 5000 },
};

const demoPayments: Payment[] = [];

for (const tenant of demoTenants) {
  const paidThrough = tenantSeed.find((seed) => seed[0] === tenant.id)?.[9] ?? "2026-08";
  const cursor = new Date(`${tenant.leaseStart}T00:00:00.000Z`);
  cursor.setUTCDate(1);
  const end = new Date("2026-08-01T00:00:00.000Z");

  while (cursor <= end) {
    const key = toMonthKey(cursor);
    const rentAmount = parseFloat(tenant.monthlyRent.toString());
    const utilitiesAmount = parseFloat(tenant.utilitiesCharge?.toString() || "0");
    const fullDue = rentAmount + utilitiesAmount;
    const partial = partialPayments[tenant.id]?.[key];
    const shouldCreate = key <= paidThrough || partial !== undefined;

    if (shouldCreate) {
      const paymentAmount = partial ?? fullDue;
      demoPayments.push({
        id: makeId("pay", demoPayments.length + 1),
        tenantId: tenant.id,
        receivedBy: "Demo Manager",
        paymentDate: `${key}-05`,
        monthYear: toMonthYear(cursor),
        rentAmount: tenant.monthlyRent,
        utilitiesAmount: tenant.utilitiesCharge,
        totalAmountDue: fullDue.toString(),
        paymentAmount: paymentAmount.toString(),
        tdsAmount: "0",
        landlordAmount: paymentAmount.toString(),
        balance: Math.max(0, fullDue - paymentAmount).toString(),
        tdsPaidToMRA: false,
        landlordSigned: true,
        tenantSigned: true,
        receiptNumber: `LD-${key.replace("-", "")}-${String(demoPayments.length + 1).padStart(3, "0")}`,
        status: "posted",
        correctionOfPaymentId: null,
        notes: partial ? "Partial demo payment." : "Demo payment received.",
        createdAt: now(),
      });
    }

    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
}

const demoDocuments: Document[] = [
  ["doc-001", "tn-001", "Signed lease agreement", "contract", "demo-bloom-lease.pdf", "182 KB"],
  ["doc-002", "tn-002", "Trade permit copy", "trade_permit", "demo-corner-permit.pdf", "94 KB"],
  ["doc-003", "tn-004", "Insurance certificate", "other", "demo-byte-insurance.pdf", "128 KB"],
  ["doc-004", "tn-006", "Food operator licence", "trade_permit", "demo-urban-licence.pdf", "104 KB"],
  ["doc-005", "tn-009", "Signed lease agreement", "contract", "demo-nova-lease.pdf", "176 KB"],
  ["doc-006", "tn-012", "Renewal discussion notes", "other", "demo-studio-renewal.pdf", "72 KB"],
].map(([documentId, tenantId, documentName, documentType, fileName, fileSize]) => ({
  id: documentId,
  tenantId,
  documentName,
  documentType,
  fileUrl: "#demo-document-placeholder",
  fileName,
  fileSize,
  mimeType: "application/pdf",
  storageKey: null,
  isArchived: false,
  archivedAt: null,
  notes: "Fictional demo metadata only. No real file is attached.",
  uploadedAt: now(),
}));

const expenseSeed: Array<[string, string, string, string, string, string, string | null, string | null]> = [
  ["exp-001", "2026-08-02", "Common-area cleaning", "2600", "cleaning", "building-wide", null, "equal"],
  ["exp-002", "2026-08-06", "Lift service visit", "7400", "maintenance", "building-wide", null, "by_rent"],
  ["exp-003", "2026-08-09", "Plumbing repair near Unit 03", "1850", "repairs", "store-specific", "st-003", null],
  ["exp-004", "2026-07-21", "Exterior lighting replacement", "3200", "repairs", "building-wide", null, "equal"],
  ["exp-005", "2026-07-12", "Water bill allocation", "6100", "utilities", "building-wide", null, "by_rent"],
  ["exp-006", "2026-06-28", "Door lock replacement Unit 10", "950", "repairs", "store-specific", "st-010", null],
];

const demoExpenses: Expense[] = expenseSeed.map(([expenseId, expenseDate, description, amount, category, expenseType, storeId, splitMethod]) => ({
  id: expenseId,
  paidBy: "Demo Manager",
  expenseDate,
  description,
  amount,
  category,
  otherCategoryText: null,
  expenseType,
  storeId,
  splitMethod,
  isArchived: false,
  archivedAt: null,
  notes: "Fictional validation-demo expense.",
  createdAt: now(),
}));

const demoSettings: Setting[] = [
  {
    id: "set-001",
    key: "building_name",
    value: "Riverton Market Plaza",
    updatedAt: now(),
  },
];

class DemoStorage implements IStorage {
  private users: User[] = [{ id: "user-demo", username: "demo", password: "demo-only" }];
  private landlords = demoLandlords;
  private stores = demoStores;
  private tenants = demoTenants;
  private payments = demoPayments;
  private documents = demoDocuments;
  private settings = demoSettings;
  private expenses = demoExpenses;

  async getUser(userId: string) { return this.users.find((user) => user.id === userId); }
  async getUserByUsername(username: string) { return this.users.find((user) => user.username === username); }
  async createUser(user: InsertUser) {
    const created = { id: makeId("user", this.users.length + 1), ...user };
    this.users.push(created);
    return created;
  }

  async getLandlords() { return [...this.landlords].sort((a, b) => a.uniqueRef.localeCompare(b.uniqueRef)); }
  async getLandlord(landlordId: string) { return this.landlords.find((landlord) => landlord.id === landlordId); }
  async getLandlordByRef(uniqueRef: string) { return this.landlords.find((landlord) => landlord.uniqueRef === uniqueRef); }
  async createLandlord(landlord: InsertLandlord) {
    const created: Landlord = {
      id: makeId("ll", this.landlords.length + 1),
      uniqueRef: landlord.uniqueRef,
      fullName: landlord.fullName,
      gender: landlord.gender ?? null,
      idCardNumber: landlord.idCardNumber ?? null,
      address: landlord.address ?? null,
      phoneNumber: landlord.phoneNumber ?? null,
      email: landlord.email ?? null,
      signatureUrl: landlord.signatureUrl ?? null,
      createdAt: now(),
    };
    this.landlords.push(created);
    return created;
  }
  async updateLandlord(landlordId: string, landlord: Partial<InsertLandlord>) {
    return this.updateById<Landlord>(this.landlords, landlordId, landlord);
  }
  async deleteLandlord() { throw new Error("Deletes are disabled in the LeaseDesk demo."); }

  async getStores() { return [...this.stores].sort((a, b) => a.uniqueRef.localeCompare(b.uniqueRef)); }
  async getStore(storeId: string) { return this.stores.find((store) => store.id === storeId); }
  async getStoreByRef(uniqueRef: string) { return this.stores.find((store) => store.uniqueRef === uniqueRef); }
  async createStore(store: InsertStore) {
    const created: Store = {
      id: makeId("st", this.stores.length + 1),
      uniqueRef: store.uniqueRef,
      storeNumber: store.storeNumber,
      floor: store.floor,
      size: store.size ?? null,
      features: store.features ?? null,
      isArchived: store.isArchived ?? false,
      archivedAt: null,
      createdAt: now(),
    };
    this.stores.push(created);
    return created;
  }
  async updateStore(storeId: string, store: Partial<InsertStore>) {
    return this.updateById<Store>(this.stores, storeId, store);
  }
  async deleteStore() { throw new Error("Deletes are disabled in the LeaseDesk demo."); }
  async archiveStore(storeId: string) {
    return this.updateById<Store>(this.stores, storeId, { isArchived: true, archivedAt: now() } as Partial<Store>);
  }

  async getTenants() {
    return [...this.tenants].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getTenant(tenantId: string) { return this.tenants.find((tenant) => tenant.id === tenantId); }
  async createTenant(tenant: InsertTenant) {
    const created: Tenant = {
      id: makeId("tn", this.tenants.length + 1),
      landlordId: tenant.landlordId,
      storeId: tenant.storeId ?? null,
      tenantType: tenant.tenantType ?? null,
      gender: tenant.gender ?? null,
      tenantName: tenant.tenantName,
      businessName: tenant.businessName ?? null,
      tenantIdCard: tenant.tenantIdCard ?? null,
      tenantAddress: tenant.tenantAddress ?? null,
      tenantPhone: tenant.tenantPhone ?? null,
      tenantEmail: tenant.tenantEmail ?? null,
      tradePermitNo: tenant.tradePermitNo ?? null,
      tradePermitExpiry: tenant.tradePermitExpiry ?? null,
      monthlyRent: tenant.monthlyRent,
      leaseStart: tenant.leaseStart,
      leaseEnd: tenant.leaseEnd,
      utilitiesCharge: tenant.utilitiesCharge ?? null,
      deposit: tenant.deposit ?? null,
      depositPaid: tenant.depositPaid ?? null,
      premisesAddress: tenant.premisesAddress ?? null,
      commercialPurpose: tenant.commercialPurpose ?? null,
      notes: tenant.notes ?? null,
      renewalDecision: tenant.renewalDecision ?? null,
      isActive: tenant.isActive ?? true,
      archivedAt: null,
      createdAt: now(),
      updatedAt: now(),
    };
    this.tenants.push(created);
    return created;
  }
  async updateTenant(tenantId: string, tenant: Partial<InsertTenant>) {
    return this.updateById<Tenant>(this.tenants, tenantId, { ...tenant, updatedAt: now() });
  }
  async deleteTenant() { throw new Error("Deletes are disabled in the LeaseDesk demo."); }
  async archiveTenant(tenantId: string) {
    return this.updateById<Tenant>(this.tenants, tenantId, { isActive: false, archivedAt: now(), updatedAt: now() } as Partial<Tenant>);
  }
  async getExpiringTenants(months: number) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + months);
    return this.tenants
      .filter((tenant) => new Date(tenant.leaseEnd) >= today && new Date(tenant.leaseEnd) <= futureDate)
      .sort((a, b) => new Date(a.leaseEnd).getTime() - new Date(b.leaseEnd).getTime());
  }

  async getPayments(tenantId?: string) {
    return this.payments
      .filter((payment) => !tenantId || payment.tenantId === tenantId)
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }
  async getPayment(paymentId: string) { return this.payments.find((payment) => payment.id === paymentId); }
  async createPayment(payment: InsertPayment) {
    const created: Payment = {
      id: makeId("pay", this.payments.length + 1),
      tenantId: payment.tenantId,
      receivedBy: payment.receivedBy ?? null,
      paymentDate: payment.paymentDate,
      monthYear: payment.monthYear,
      rentAmount: payment.rentAmount,
      utilitiesAmount: payment.utilitiesAmount ?? null,
      totalAmountDue: payment.totalAmountDue,
      paymentAmount: payment.paymentAmount,
      tdsAmount: payment.tdsAmount ?? null,
      landlordAmount: payment.landlordAmount,
      balance: payment.balance ?? null,
      tdsPaidToMRA: payment.tdsPaidToMRA ?? null,
      landlordSigned: payment.landlordSigned ?? null,
      tenantSigned: payment.tenantSigned ?? null,
      receiptNumber: payment.receiptNumber,
      status: payment.status ?? "posted",
      correctionOfPaymentId: payment.correctionOfPaymentId ?? null,
      notes: payment.notes ?? null,
      createdAt: now(),
    };
    this.payments.push(created);
    return created;
  }
  async updatePayment(paymentId: string, payment: Partial<InsertPayment>) {
    return this.updateById<Payment>(this.payments, paymentId, payment);
  }
  async correctPayment(paymentId: string, payment: InsertPayment) {
    const original = await this.updateById<Payment>(this.payments, paymentId, { status: "corrected" } as Partial<Payment>);
    const correction = await this.createPayment({
      ...payment,
      status: "posted",
      correctionOfPaymentId: paymentId,
    });
    return { original, correction };
  }
  async getPaymentsByMonth(paymentMonthYear: string) {
    return this.payments.filter((payment) => payment.monthYear === paymentMonthYear);
  }
  async getUnpaidTDS() { return []; }

  async getDocuments(tenantId: string) {
    return this.documents.filter((document) => document.tenantId === tenantId);
  }
  async getDocument(documentId: string) { return this.documents.find((document) => document.id === documentId); }
  async createDocument(document: InsertDocument) {
    const created: Document = {
      id: makeId("doc", this.documents.length + 1),
      tenantId: document.tenantId,
      documentName: document.documentName,
      documentType: document.documentType,
      fileUrl: document.fileUrl,
      fileName: document.fileName,
      fileSize: document.fileSize ?? null,
      mimeType: document.mimeType ?? null,
      storageKey: document.storageKey ?? null,
      isArchived: document.isArchived ?? false,
      archivedAt: null,
      notes: document.notes ?? null,
      uploadedAt: now(),
    };
    this.documents.push(created);
    return created;
  }
  async deleteDocument() { throw new Error("Deletes are disabled in the LeaseDesk demo."); }
  async archiveDocument(documentId: string) {
    return this.updateById<Document>(this.documents, documentId, { isArchived: true, archivedAt: now() } as Partial<Document>);
  }

  async getSetting(key: string) { return this.settings.find((setting) => setting.key === key); }
  async setSetting(setting: InsertSetting) {
    const existing = this.settings.find((item) => item.key === setting.key);
    if (existing) {
      Object.assign(existing, setting, { updatedAt: now() });
      return existing;
    }
    const created = { id: makeId("set", this.settings.length + 1), ...setting, updatedAt: now() };
    this.settings.push(created);
    return created;
  }

  async getExpenses() {
    return [...this.expenses].sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  }
  async getExpense(expenseId: string) { return this.expenses.find((expense) => expense.id === expenseId); }
  async createExpense(expense: InsertExpense) {
    const created: Expense = {
      id: makeId("exp", this.expenses.length + 1),
      paidBy: expense.paidBy ?? null,
      expenseDate: expense.expenseDate,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      otherCategoryText: expense.otherCategoryText ?? null,
      expenseType: expense.expenseType,
      storeId: expense.storeId ?? null,
      splitMethod: expense.splitMethod ?? null,
      isArchived: expense.isArchived ?? false,
      archivedAt: null,
      notes: expense.notes ?? null,
      createdAt: now(),
    };
    this.expenses.push(created);
    return created;
  }
  async updateExpense(expenseId: string, expense: Partial<InsertExpense>) {
    return this.updateById<Expense>(this.expenses, expenseId, expense);
  }
  async deleteExpense() { throw new Error("Deletes are disabled in the LeaseDesk demo."); }
  async archiveExpense(expenseId: string) {
    return this.updateById<Expense>(this.expenses, expenseId, { isArchived: true, archivedAt: now() } as Partial<Expense>);
  }

  private updateById<T extends { id: string }>(items: T[], itemId: string, update: Partial<Omit<T, "id">>) {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) {
      throw new Error("Record not found");
    }
    Object.assign(item, update);
    return item;
  }
}

export function createStorage(): IStorage {
  return getRuntimeConfig().isProductionMode ? new DatabaseStorage() : new DemoStorage();
}

export const storage = createStorage();
