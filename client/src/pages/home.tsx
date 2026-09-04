import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Tenant } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, CreditCard, DollarSign, Receipt, RefreshCw, Store as StoreIcon, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddTenantForm } from "@/components/add-tenant-form";
import { RecordPaymentForm } from "@/components/record-payment-form";
import { AddExpenseForm } from "@/components/add-expense-form";
import { ReceiptGenerator } from "@/components/receipt-generator";
import type { Payment, Landlord, Store as StoreType, Expense } from "@shared/schema";

export default function Home() {
  const [addTenantDialogOpen, setAddTenantDialogOpen] = useState(false);
  const [recordPaymentDialogOpen, setRecordPaymentDialogOpen] = useState(false);
  const [addExpenseDialogOpen, setAddExpenseDialogOpen] = useState(false);
  const [renewContractDialogOpen, setRenewContractDialogOpen] = useState(false);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const [tenantFilter, setTenantFilter] = useState<"active" | "inactive" | "expiring" | "unpaid" | "all">("active");
  const [, navigate] = useLocation();
  const { data: tenants, isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const { data: arrearsData } = useQuery<Array<{ tenantId: string; totalArrears: number }>>({
    queryKey: ["/api/tenants/arrears"],
  });

  // Fetch all payments for total calculation
  const { data: allPayments, isLoading: isLoadingPayments } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  // Fetch all expenses for total calculation
  const { data: allExpenses, isLoading: isLoadingExpenses } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  // Fetch payment data for receipt generation
  const { data: receiptPayment } = useQuery<Payment>({
    queryKey: ["/api/payments", receiptPaymentId],
    enabled: !!receiptPaymentId,
  });

  // Fetch landlord and store data for receipt
  const receiptTenant = receiptPayment ? tenants?.find(t => t.id === receiptPayment.tenantId) : null;
  
  const { data: receiptLandlord } = useQuery<Landlord>({
    queryKey: ["/api/landlords", receiptTenant?.landlordId],
    enabled: !!receiptTenant?.landlordId,
  });

  const { data: receiptStore } = useQuery<StoreType>({
    queryKey: ["/api/stores", receiptTenant?.storeId],
    enabled: !!receiptTenant?.storeId,
  });

  const getLeaseStatus = (leaseEnd: string) => {
    const endDate = new Date(leaseEnd);
    const today = new Date();
    const daysUntilExpiry = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: "expired", color: "hsl(0 84% 60%)" };
    } else if (daysUntilExpiry <= 120) {
      return { status: "expiring", color: "hsl(45 93% 47%)" };
    } else {
      return { status: "active", color: "hsl(142 71% 45%)" };
    }
  };

  const activeTenants = tenants?.filter(t => {
    if (!t.isActive) return false;
    const { status } = getLeaseStatus(t.leaseEnd);
    return status === "active" || status === "expiring";
  }).length || 0;

  const expiringSoon = tenants?.filter(t => {
    if (!t.isActive) return false;
    const { status } = getLeaseStatus(t.leaseEnd);
    return status === "expiring";
  }).length || 0;

  const monthlyRevenue = tenants?.reduce((sum, t) => {
    if (!t.isActive) return sum;
    const { status } = getLeaseStatus(t.leaseEnd);
    if (status === "active" || status === "expiring") {
      return sum + parseFloat(t.monthlyRent.toString());
    }
    return sum;
  }, 0) || 0;

  const totalUnpaidRent = arrearsData?.reduce((sum, a) => sum + a.totalArrears, 0) || 0;
  const tenantsWithArrears = arrearsData?.filter(a => a.totalArrears > 0).length || 0;

  // Calculate total payments received
  const totalPayments = allPayments
    ?.filter((p) => p.status !== "corrected" && p.status !== "reversal")
    .reduce((sum, p) => sum + parseFloat(p.paymentAmount.toString()), 0) || 0;

  // Calculate total expenses incurred
  const totalExpenses = allExpenses?.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0) || 0;

  const filteredTenants = tenants?.filter(t => {
    if (tenantFilter === "active") return t.isActive;
    if (tenantFilter === "inactive") return !t.isActive;
    if (tenantFilter === "expiring") {
      if (!t.isActive) return false;
      const { status } = getLeaseStatus(t.leaseEnd);
      return status === "expiring";
    }
    if (tenantFilter === "unpaid") {
      const arrears = arrearsData?.find(a => a.tenantId === t.id);
      return arrears && arrears.totalArrears > 0;
    }
    return true;
  }) || [];

  const recentTenants = filteredTenants.slice().sort((a, b) => {
    // Sort by lease end date: closest to expiry first
    return new Date(a.leaseEnd).getTime() - new Date(b.leaseEnd).getTime();
  }).slice(0, 10) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-8">
            <Skeleton className="h-12 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Commercial property operations
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground md:text-4xl" data-testid="app-title">
              LeaseDesk
            </h1>
            <p className="mt-2 max-w-2xl text-base text-muted-foreground">
              Track leases, rent status, arrears and tenant documents from one working view.
            </p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Conceptualised by TAKAVEN
          </p>
        </div>

        <section className="mb-8" aria-labelledby="attention-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 id="attention-heading" className="text-xl font-semibold text-foreground">
                Operational attention
              </h2>
              <p className="text-sm text-muted-foreground">
                Arrears, rent movement and lease dates first.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <div 
              role="button"
              tabIndex={0}
              className="rounded-lg border border-red-200 bg-white p-5 shadow-sm transition-colors hover:bg-red-50 sm:col-span-2 xl:col-span-2"
              data-testid="card-unpaid-rent"
              onClick={() => setTenantFilter("unpaid")}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setTenantFilter("unpaid");
                }
              }}
            >
              <div className="mb-4 flex items-center gap-3 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-bold uppercase tracking-[0.12em]">Overdue rent</span>
              </div>
              <div className="text-3xl font-semibold text-foreground" data-testid="metric-unpaid-rent">
                Rs {totalUnpaidRent.toLocaleString()}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{tenantsWithArrears} tenant{tenantsWithArrears === 1 ? "" : "s"} need follow-up</p>
            </div>

            <div 
              role="button"
              tabIndex={0}
              className="rounded-lg border bg-white p-5 shadow-sm transition-colors hover:bg-muted"
              data-testid="card-total-payments"
              onClick={() => navigate("/payments")}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate("/payments");
                }
              }}
            >
              <CreditCard className="mb-3 h-5 w-5 text-chart-2" />
              {isLoadingPayments ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <div className="text-xl font-semibold text-foreground" data-testid="metric-total-payments">
                  Rs {totalPayments.toLocaleString()}
                </div>
              )}
              <span className="text-sm text-muted-foreground">Payments received</span>
            </div>

            <div 
              role="button"
              tabIndex={0}
              className="rounded-lg border bg-white p-5 shadow-sm transition-colors hover:bg-muted"
              data-testid="card-expiring-soon"
              onClick={() => setTenantFilter("expiring")}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setTenantFilter("expiring");
                }
              }}
            >
              <Calendar className="mb-3 h-5 w-5 text-amber-600" />
              <div className="text-xl font-semibold text-foreground" data-testid="metric-expiring-soon">
                {expiringSoon}
              </div>
              <span className="text-sm text-muted-foreground">Expiring leases</span>
            </div>

            <div 
              role="button"
              tabIndex={0}
              className="rounded-lg border bg-white p-5 shadow-sm transition-colors hover:bg-muted"
              data-testid="card-active-tenants"
              onClick={() => setTenantFilter("active")}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setTenantFilter("active");
                }
              }}
            >
              <Users className="mb-3 h-5 w-5 text-primary" />
              <div className="text-xl font-semibold text-foreground" data-testid="metric-active-tenants">
                {activeTenants}
              </div>
              <span className="text-sm text-muted-foreground">Active tenants</span>
            </div>

            <div 
              role="button"
              tabIndex={0}
              className="rounded-lg border bg-white p-5 shadow-sm transition-colors hover:bg-muted"
              data-testid="card-monthly-revenue"
              onClick={() => setTenantFilter("active")}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setTenantFilter("active");
                }
              }}
            >
              <DollarSign className="mb-3 h-5 w-5 text-primary" />
              <div className="text-xl font-semibold text-foreground" data-testid="metric-monthly-revenue">
                Rs {monthlyRevenue.toLocaleString()}
              </div>
              <span className="text-sm text-muted-foreground">Monthly rent roll</span>
            </div>
          </div>
        </section>

        <section className="mb-8" aria-labelledby="actions-heading">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id="actions-heading" className="text-lg font-semibold text-foreground">Actions</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div 
              role="button"
              tabIndex={0}
              className="flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-4 shadow-sm transition-colors hover:bg-muted"
              data-testid="button-add-tenant"
              onClick={() => setAddTenantDialogOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setAddTenantDialogOpen(true);
                }
              }}
            >
              <UserPlus className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Add Tenant
              </span>
            </div>

            <div 
              role="button"
              tabIndex={0}
              className="flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-4 shadow-sm transition-colors hover:bg-muted"
              data-testid="button-renew-contract"
              onClick={() => setRenewContractDialogOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setRenewContractDialogOpen(true);
                }
              }}
            >
              <RefreshCw className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Renew Lease
              </span>
            </div>

            <div 
              role="button"
              tabIndex={0}
              className="flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-4 shadow-sm transition-colors hover:bg-muted"
              data-testid="button-record-payment"
              onClick={() => setRecordPaymentDialogOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setRecordPaymentDialogOpen(true);
                }
              }}
            >
              <CreditCard className="h-5 w-5 text-chart-2" />
              <span className="text-sm font-semibold text-foreground">
                Record Payment
              </span>
            </div>

            <div 
              role="button"
              tabIndex={0}
              className="flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-4 shadow-sm transition-colors hover:bg-muted"
              data-testid="button-record-expense"
              onClick={() => setAddExpenseDialogOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setAddExpenseDialogOpen(true);
                }
              }}
            >
              <Receipt className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-semibold text-foreground">
                Record Expense
              </span>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Tenant and lease work</h2>
              <p className="text-sm text-muted-foreground">Sorted by lease date so expiring and overdue work stays visible.</p>
            </div>
          </div>
          
          <Tabs value={tenantFilter} onValueChange={(v) => setTenantFilter(v as "active" | "inactive" | "expiring" | "unpaid" | "all")} className="mb-4">
            <TabsList className="flex h-auto w-full justify-start gap-2 overflow-x-auto bg-transparent p-0">
              <TabsTrigger 
                value="active" 
                className="whitespace-nowrap rounded-md border bg-white px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-white" 
                data-testid="tab-active"
              >
                Active ({tenants?.filter(t => t.isActive).length || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="expiring" 
                className="whitespace-nowrap rounded-md border bg-white px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-white" 
                data-testid="tab-expiring"
              >
                Expiring ({expiringSoon})
              </TabsTrigger>
              <TabsTrigger 
                value="unpaid" 
                className="whitespace-nowrap rounded-md border bg-white px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-white" 
                data-testid="tab-unpaid"
              >
                Unpaid ({tenantsWithArrears})
              </TabsTrigger>
              <TabsTrigger 
                value="inactive" 
                className="whitespace-nowrap rounded-md border bg-white px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-white" 
                data-testid="tab-expired"
              >
                Expired ({tenants?.filter(t => !t.isActive).length || 0})
              </TabsTrigger>
              <TabsTrigger 
                value="all" 
                className="whitespace-nowrap rounded-md border bg-white px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-white" 
                data-testid="tab-all"
              >
                All ({tenants?.length || 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-4">
            {recentTenants.length === 0 ? (
              <Card className="bg-card rounded-lg border shadow-sm p-6">
                <p className="text-lg text-muted-foreground text-center">No tenants yet. Add your first tenant to get started!</p>
              </Card>
            ) : (
              recentTenants.map((tenant) => {
                const { status, color } = getLeaseStatus(tenant.leaseEnd);
                return (
                  <Card 
                    key={tenant.id} 
                    className="bg-card rounded-lg border shadow-sm hover-elevate cursor-pointer"
                    data-testid={`tenant-card-${tenant.id}`}
                    onClick={() => navigate(`/tenants/${tenant.id}`)}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              <StoreIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-foreground truncate" data-testid={`tenant-name-${tenant.id}`}>
                                {tenant.tenantName}
                              </h3>
                              {tenant.businessName && (
                                <p className="text-sm text-muted-foreground truncate" data-testid={`business-name-${tenant.id}`}>
                                  {tenant.businessName}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap mt-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Monthly Rent</p>
                              <p className="text-sm font-semibold text-foreground" data-testid={`rent-${tenant.id}`}>
                                Rs {parseFloat(tenant.monthlyRent.toString()).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Lease Ends</p>
                              <p className="text-sm font-semibold text-foreground" data-testid={`lease-end-${tenant.id}`}>
                                {new Date(tenant.leaseEnd).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Badge 
                          className="px-3 py-1 text-sm flex-shrink-0 capitalize"
                          style={{ 
                            backgroundColor: color,
                            color: 'white'
                          }}
                          data-testid={`status-${tenant.id}`}
                        >
                          {status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </section>
      </div>

      <Dialog open={addTenantDialogOpen} onOpenChange={setAddTenantDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add New Tenant</DialogTitle>
          </DialogHeader>
          <AddTenantForm onSuccess={() => setAddTenantDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={recordPaymentDialogOpen} onOpenChange={setRecordPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Record Payment</DialogTitle>
          </DialogHeader>
          <RecordPaymentForm 
            onSuccess={() => setRecordPaymentDialogOpen(false)} 
            onPaymentRecorded={(paymentId) => {
              setRecordPaymentDialogOpen(false);
              setReceiptPaymentId(paymentId);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addExpenseDialogOpen} onOpenChange={setAddExpenseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add Expense</DialogTitle>
          </DialogHeader>
          <AddExpenseForm onSuccess={() => setAddExpenseDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={renewContractDialogOpen} onOpenChange={setRenewContractDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Renew Lease</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-lg text-muted-foreground">
              Select a tenant to renew their contract. Tenants are sorted by lease expiry date.
            </p>
            {tenants
              ?.slice()
              .sort((a, b) => new Date(a.leaseEnd).getTime() - new Date(b.leaseEnd).getTime())
              .map((tenant) => {
                const { status, color } = getLeaseStatus(tenant.leaseEnd);
                return (
                  <Card
                    key={tenant.id}
                    className="hover-elevate cursor-pointer"
                    data-testid={`card-tenant-renew-${tenant.id}`}
                    onClick={() => {
                      setRenewContractDialogOpen(false);
                      navigate(`/tenants/${tenant.id}`);
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-semibold text-foreground mb-2" data-testid={`name-${tenant.id}`}>
                            {tenant.tenantName}
                          </h3>
                          <div className="flex items-center gap-4 flex-wrap">
                            <div>
                              <p className="text-lg text-muted-foreground">Lease Ends</p>
                              <p className="text-lg font-semibold text-foreground" data-testid={`lease-end-${tenant.id}`}>
                                {new Date(tenant.leaseEnd).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-lg text-muted-foreground">Monthly Rent</p>
                              <p className="text-lg font-semibold text-foreground" data-testid={`rent-${tenant.id}`}>
                                Rs {parseFloat(tenant.monthlyRent.toString()).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Badge 
                          className="text-lg px-4 py-2 flex-shrink-0 capitalize"
                          style={{ 
                            backgroundColor: color,
                            color: 'white'
                          }}
                          data-testid={`status-${tenant.id}`}
                        >
                          {status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            }
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog - Auto-shown after payment */}
      {receiptPayment && receiptTenant && receiptLandlord && receiptStore && (
        <Dialog open={!!receiptPaymentId} onOpenChange={(open) => !open && setReceiptPaymentId(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Payment Receipt</DialogTitle>
            </DialogHeader>
            <ReceiptGenerator
              payment={{
                id: parseInt(receiptPayment.id) || 0,
                receiptNumber: receiptPayment.receiptNumber,
                paymentDate: receiptPayment.paymentDate,
                monthYear: receiptPayment.monthYear,
                rentAmount: parseFloat(receiptPayment.rentAmount || '0'),
                utilitiesAmount: parseFloat(receiptPayment.utilitiesAmount || '0'),
                totalAmountDue: parseFloat(receiptPayment.totalAmountDue || '0'),
                paymentAmount: parseFloat(receiptPayment.paymentAmount || '0'),
                landlordAmount: parseFloat(receiptPayment.landlordAmount || '0'),
                balance: parseFloat(receiptPayment.balance || '0'),
                notes: receiptPayment.notes || undefined,
              }}
              tenant={{
                name: receiptTenant.tenantName,
                businessName: receiptTenant.businessName || undefined,
                store: receiptStore?.storeNumber || receiptTenant.storeId || '',
              }}
              landlord={{
                name: receiptLandlord.fullName,
                address: receiptLandlord.address || '',
                phone: receiptLandlord.phoneNumber || '',
                signatureUrl: receiptLandlord.signatureUrl || undefined,
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
