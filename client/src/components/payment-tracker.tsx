import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { Tenant } from "./tenant-card";

interface PaymentRecord {
  tenantId: string;
  month: string;
  paid: boolean;
  paidDate?: Date;
  amount: number;
}

interface PaymentTrackerProps {
  tenants: Tenant[];
  payments: PaymentRecord[];
  currentMonth: Date;
  onMarkPaid: (tenantId: string, month: string) => void;
  onMarkUnpaid: (tenantId: string, month: string) => void;
}

export function PaymentTracker({
  tenants,
  payments,
  currentMonth,
  onMarkPaid,
  onMarkUnpaid,
}: PaymentTrackerProps) {
  const monthKey = format(currentMonth, "yyyy-MM");
  
  const getPaymentStatus = (tenantId: string) => {
    return payments.find(
      (p) => p.tenantId === tenantId && p.month === monthKey
    );
  };

  const getMonthlyTotal = (tenant: Tenant) => {
    return tenant.monthlyRent + (tenant.cleaningCharge || 0) + (tenant.waterCharge || 0);
  };

  const totalExpected = tenants.reduce((sum, t) => sum + getMonthlyTotal(t), 0);
  const totalCollected = payments
    .filter((p) => p.month === monthKey && p.paid)
    .reduce((sum, p) => sum + p.amount, 0);
  const paidCount = payments.filter((p) => p.month === monthKey && p.paid).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Expected This Month
          </div>
          <div className="text-3xl font-semibold">
            MUR {totalExpected.toLocaleString()}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Collected
          </div>
          <div className="text-3xl font-semibold text-chart-2">
            MUR {totalCollected.toLocaleString()}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Payment Status
          </div>
          <div className="text-3xl font-semibold">
            {paidCount} / {tenants.length}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">
          {format(currentMonth, "MMMM yyyy")} - Rent Payments
        </h3>
        <div className="space-y-3">
          {tenants.map((tenant) => {
            const payment = getPaymentStatus(tenant.id);
            const isPaid = payment?.paid || false;

            return (
              <div
                key={tenant.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                  isPaid
                    ? "border-chart-2 bg-chart-2/5"
                    : "border-chart-4 bg-chart-4/5"
                }`}
                data-testid={`payment-row-${tenant.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold" data-testid={`payment-tenant-${tenant.id}`}>
                      {tenant.tenantName}
                    </h4>
                    {isPaid ? (
                      <Badge className="bg-chart-2 text-white">
                        <Check className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <X className="h-3 w-3 mr-1" />
                        Not Paid
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {tenant.businessName && (
                      <div className="text-sm text-muted-foreground">{tenant.businessName}</div>
                    )}
                    <div className="text-sm">
                      <span className="text-muted-foreground">Monthly Rent: </span>
                      <span className="font-medium">MUR {tenant.monthlyRent.toLocaleString()}</span>
                    </div>
                    {(tenant.cleaningCharge || tenant.waterCharge) && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Monthly Expenses: </span>
                        {tenant.cleaningCharge && (
                          <span className="font-medium">Cleaning MUR {tenant.cleaningCharge.toLocaleString()}</span>
                        )}
                        {tenant.cleaningCharge && tenant.waterCharge && <span> + </span>}
                        {tenant.waterCharge && (
                          <span className="font-medium">Water MUR {tenant.waterCharge.toLocaleString()}</span>
                        )}
                      </div>
                    )}
                    <div className="text-sm font-semibold">
                      <span className="text-muted-foreground">Total Monthly: </span>
                      <span>MUR {getMonthlyTotal(tenant).toLocaleString()}</span>
                    </div>
                    {isPaid && payment?.paidDate && (
                      <div className="text-sm text-chart-2">
                        Paid on {format(payment.paidDate, "dd MMM yyyy")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {isPaid ? (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => onMarkUnpaid(tenant.id, monthKey)}
                      data-testid={`button-mark-unpaid-${tenant.id}`}
                    >
                      Mark as Unpaid
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="bg-chart-2 hover:bg-chart-2/90 text-white"
                      onClick={() => onMarkPaid(tenant.id, monthKey)}
                      data-testid={`button-mark-paid-${tenant.id}`}
                    >
                      <Check className="h-5 w-5 mr-2" />
                      Mark as Paid
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {tenants.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No tenants to track
          </div>
        )}
      </Card>
    </div>
  );
}
