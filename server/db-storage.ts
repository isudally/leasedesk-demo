import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import type { IStorage } from "./storage";
import {
  documents,
  auditEvents,
  expenses,
  landlords,
  payments,
  settings,
  stores,
  tenants,
  users,
  type InsertDocument,
  type InsertExpense,
  type InsertLandlord,
  type InsertPayment,
  type InsertSetting,
  type InsertStore,
  type InsertTenant,
  type InsertUser,
  type InsertAuditEvent,
} from "@shared/schema";

export class DatabaseStorage implements IStorage {
  private get db() {
    return getDb();
  }

  async getUser(id: string) {
    return (await this.db.select().from(users).where(eq(users.id, id)).limit(1))[0];
  }

  async getUserByUsername(username: string) {
    return (await this.db.select().from(users).where(eq(users.username, username)).limit(1))[0];
  }

  async createUser(user: InsertUser) {
    return (await this.db.insert(users).values(user).returning())[0];
  }

  async getLandlords() {
    return this.db.select().from(landlords).orderBy(asc(landlords.uniqueRef));
  }

  async getLandlord(id: string) {
    return (await this.db.select().from(landlords).where(eq(landlords.id, id)).limit(1))[0];
  }

  async getLandlordByRef(uniqueRef: string) {
    return (await this.db.select().from(landlords).where(eq(landlords.uniqueRef, uniqueRef)).limit(1))[0];
  }

  async createLandlord(landlord: InsertLandlord) {
    return (await this.db.insert(landlords).values(landlord).returning())[0];
  }

  async updateLandlord(id: string, landlord: Partial<InsertLandlord>) {
    return this.updateOne(this.db.update(landlords).set(landlord).where(eq(landlords.id, id)).returning());
  }

  async deleteLandlord() {
    throw new Error("Permanent deletes are not enabled.");
  }

  async getStores() {
    return this.db.select().from(stores).orderBy(asc(stores.uniqueRef));
  }

  async getStore(id: string) {
    return (await this.db.select().from(stores).where(eq(stores.id, id)).limit(1))[0];
  }

  async getStoreByRef(uniqueRef: string) {
    return (await this.db.select().from(stores).where(eq(stores.uniqueRef, uniqueRef)).limit(1))[0];
  }

  async createStore(store: InsertStore) {
    return (await this.db.insert(stores).values(store).returning())[0];
  }

  async updateStore(id: string, store: Partial<InsertStore>) {
    return this.updateOne(this.db.update(stores).set(store).where(eq(stores.id, id)).returning());
  }

  async deleteStore() {
    throw new Error("Permanent deletes are not enabled.");
  }

  async archiveStore(id: string) {
    return this.updateOne(
      this.db.update(stores).set({ isArchived: true, archivedAt: new Date() }).where(eq(stores.id, id)).returning(),
    );
  }

  async getTenants() {
    return this.db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async getTenant(id: string) {
    return (await this.db.select().from(tenants).where(eq(tenants.id, id)).limit(1))[0];
  }

  async createTenant(tenant: InsertTenant) {
    return (await this.db.insert(tenants).values(tenant).returning())[0];
  }

  async updateTenant(id: string, tenant: Partial<InsertTenant>) {
    return this.updateOne(
      this.db.update(tenants).set({ ...tenant, updatedAt: new Date() }).where(eq(tenants.id, id)).returning(),
    );
  }

  async deleteTenant() {
    throw new Error("Permanent deletes are not enabled.");
  }

  async archiveTenant(id: string) {
    return this.updateOne(
      this.db
        .update(tenants)
        .set({ isActive: false, archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(tenants.id, id))
        .returning(),
    );
  }

  async getExpiringTenants(months: number) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + months);

    const allTenants = await this.getTenants();
    return allTenants
      .filter((tenant) => new Date(tenant.leaseEnd) >= today && new Date(tenant.leaseEnd) <= futureDate)
      .sort((a, b) => new Date(a.leaseEnd).getTime() - new Date(b.leaseEnd).getTime());
  }

  async getPayments(tenantId?: string) {
    const query = this.db.select().from(payments);
    if (tenantId) {
      return query.where(eq(payments.tenantId, tenantId)).orderBy(desc(payments.paymentDate));
    }
    return query.orderBy(desc(payments.paymentDate));
  }

  async getPayment(id: string) {
    return (await this.db.select().from(payments).where(eq(payments.id, id)).limit(1))[0];
  }

  async createPayment(payment: InsertPayment) {
    return (await this.db.insert(payments).values(payment).returning())[0];
  }

  async updatePayment(id: string, payment: Partial<InsertPayment>) {
    return this.updateOne(this.db.update(payments).set(payment).where(eq(payments.id, id)).returning());
  }

  async correctPayment(id: string, payment: InsertPayment) {
    const original = await this.updateOne(
      this.db.update(payments).set({ status: "corrected" }).where(eq(payments.id, id)).returning(),
    );
    const correction = await this.createPayment({
      ...payment,
      status: "posted",
      correctionOfPaymentId: id,
    });
    return { original, correction };
  }

  async getPaymentsByMonth(monthYear: string) {
    return this.db.select().from(payments).where(eq(payments.monthYear, monthYear));
  }

  async getUnpaidTDS() {
    return this.db.select().from(payments).where(eq(payments.tdsPaidToMRA, false));
  }

  async getDocuments(tenantId: string) {
    return this.db.select().from(documents).where(eq(documents.tenantId, tenantId)).orderBy(desc(documents.uploadedAt));
  }

  async getDocument(id: string) {
    return (await this.db.select().from(documents).where(eq(documents.id, id)).limit(1))[0];
  }

  async createDocument(document: InsertDocument) {
    return (await this.db.insert(documents).values(document).returning())[0];
  }

  async deleteDocument() {
    throw new Error("Permanent deletes are not enabled.");
  }

  async archiveDocument(id: string) {
    return this.updateOne(
      this.db.update(documents).set({ isArchived: true, archivedAt: new Date() }).where(eq(documents.id, id)).returning(),
    );
  }

  async getSetting(key: string) {
    return (await this.db.select().from(settings).where(eq(settings.key, key)).limit(1))[0];
  }

  async setSetting(setting: InsertSetting) {
    const existing = await this.getSetting(setting.key);
    if (existing) {
      return this.updateOne(
        this.db.update(settings).set({ value: setting.value, updatedAt: new Date() }).where(eq(settings.key, setting.key)).returning(),
      );
    }

    return (await this.db.insert(settings).values(setting).returning())[0];
  }

  async getExpenses() {
    return this.db.select().from(expenses).orderBy(desc(expenses.expenseDate));
  }

  async getExpense(id: string) {
    return (await this.db.select().from(expenses).where(eq(expenses.id, id)).limit(1))[0];
  }

  async createExpense(expense: InsertExpense) {
    return (await this.db.insert(expenses).values(expense).returning())[0];
  }

  async updateExpense(id: string, expense: Partial<InsertExpense>) {
    return this.updateOne(this.db.update(expenses).set(expense).where(eq(expenses.id, id)).returning());
  }

  async deleteExpense() {
    throw new Error("Permanent deletes are not enabled.");
  }

  async archiveExpense(id: string) {
    return this.updateOne(
      this.db.update(expenses).set({ isArchived: true, archivedAt: new Date() }).where(eq(expenses.id, id)).returning(),
    );
  }

  async createAuditEvent(event: InsertAuditEvent) {
    return (await this.db.insert(auditEvents).values(event).returning())[0];
  }

  async getAuditEvents(entityType?: string, entityId?: string) {
    const query = this.db.select().from(auditEvents);
    if (entityType && entityId) {
      return query
        .where(and(eq(auditEvents.entityType, entityType), eq(auditEvents.entityId, entityId)))
        .orderBy(desc(auditEvents.createdAt));
    }
    if (entityType) {
      return query.where(eq(auditEvents.entityType, entityType)).orderBy(desc(auditEvents.createdAt));
    }
    return query.orderBy(desc(auditEvents.createdAt));
  }

  private async updateOne<T>(query: Promise<T[]>) {
    const [updated] = await query;
    if (!updated) {
      throw new Error("Record not found");
    }
    return updated;
  }
}
