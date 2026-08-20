import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Calendar, CreditCard, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { Payment } from "@shared/schema";

interface PaymentHistoryProps {
  tenantId: string;
  onSelectPayment?: (payment: Payment) => void;
}

interface ArrearsData {
  tenantId: string;
  tenantName: string;
  allMonths: Array<{
    monthYear: string;
    date: Date;
    rentAmount: number;
    utilitiesAmount: number;
    totalDue: number;
    isPaid: boolean;
    partiallyPaid: boolean;
    amountPaid: number;
    balance: number;
  }>;
  unpaidMonths: Array<{
    monthYear: string;
    balance: number;
  }>;
  totalArrears: number;
}

export function PaymentHistory({ tenantId, onSelectPayment }: PaymentHistoryProps) {
  // Fetch arrears data for month-by-month breakdown
  const { data: arrears, isLoading: arrearsLoading } = useQuery<ArrearsData>({
    queryKey: ["/api/tenants", tenantId, "arrears"],
    enabled: !!tenantId,
  });

  // Fetch payment records
  const { data: payments, isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments", tenantId],
    queryFn: async () => {
      const response = await fetch(`/api/payments?tenantId=${tenantId}`);
      if (!response.ok) throw new Error("Failed to fetch payments");
      return response.json();
    },
  });

  if (arrearsLoading || paymentsLoading) {
    return (
      <Card className="bg-card rounded-lg shadow-md">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-2xl font-semibold">Historique des Paiements</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!arrears || arrears.allMonths.length === 0) {
    return (
      <Card className="bg-card rounded-lg shadow-md">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-2xl font-semibold">Historique des Paiements</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-center py-8">
            <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg text-muted-foreground">Aucun historique disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalPaid = arrears.allMonths.reduce((sum, m) => sum + m.amountPaid, 0);
  const totalDue = arrears.allMonths.reduce((sum, m) => sum + m.totalDue, 0);
  const paidMonthsCount = arrears.allMonths.filter(m => m.isPaid).length;

  // Reverse to show oldest first
  const monthsOldestFirst = [...arrears.allMonths].reverse();

  return (
    <Card className="bg-card rounded-lg shadow-md">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-2xl font-semibold mb-2">
              Historique des Paiements
            </CardTitle>
            <p className="text-lg text-muted-foreground">
              {paidMonthsCount} / {arrears.allMonths.length} mois payés
            </p>
          </div>
          <div className="flex flex-col gap-3 text-right">
            <div>
              <p className="text-base text-muted-foreground">Total payé</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                Rs {totalPaid.toLocaleString()}
              </p>
            </div>
            {arrears.totalArrears > 0 && (
              <div>
                <p className="text-base text-muted-foreground">Arriérés</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  Rs {arrears.totalArrears.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="space-y-3">
          {/* Month-by-month breakdown */}
          {monthsOldestFirst.map((month, index) => {
            const monthPayments = payments?.filter(p => p.monthYear === month.monthYear) || [];
            const statusColor = month.isPaid 
              ? "hsl(142 71% 45%)" // green
              : month.partiallyPaid 
              ? "hsl(45 93% 47%)" // amber
              : "hsl(0 84% 60%)"; // red

            return (
              <Card
                key={index}
                className="bg-accent/10 rounded-lg hover-elevate"
                style={{
                  borderLeft: `4px solid ${statusColor}`,
                }}
                data-testid={`month-card-${month.monthYear}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${statusColor}20` }}
                      >
                        {month.isPaid ? (
                          <CheckCircle className="w-7 h-7" style={{ color: statusColor }} />
                        ) : month.partiallyPaid ? (
                          <AlertCircle className="w-7 h-7" style={{ color: statusColor }} />
                        ) : (
                          <XCircle className="w-7 h-7" style={{ color: statusColor }} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-foreground">
                            {month.monthYear}
                          </h3>
                          <Badge 
                            className="text-base"
                            style={{ 
                              backgroundColor: statusColor,
                              color: 'white'
                            }}
                          >
                            {month.isPaid ? 'Payé' : month.partiallyPaid ? 'Partiel' : 'Impayé'}
                          </Badge>
                        </div>

                        {/* Payment details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-base">
                          <div>
                            <p className="text-muted-foreground">Dû</p>
                            <p className="font-medium text-foreground">
                              Rs {month.totalDue.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Payé</p>
                            <p className="font-medium text-green-600 dark:text-green-400">
                              Rs {month.amountPaid.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Solde</p>
                            <p 
                              className="font-semibold"
                              style={{ color: month.balance > 0 ? statusColor : 'inherit' }}
                            >
                              Rs {month.balance.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Show payment receipts if any */}
                  {monthPayments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                      <p className="text-base font-medium text-muted-foreground mb-2">
                        Reçus ({monthPayments.length}):
                      </p>
                      {monthPayments.map((payment) => (
                        <button
                          key={payment.id}
                          onClick={() => onSelectPayment?.(payment)}
                          className="w-full text-left p-3 rounded-lg bg-muted/50 hover-elevate active-elevate-2 transition-all"
                          data-testid={`payment-receipt-${payment.id}`}
                        >
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 flex-1">
                              <Receipt className="w-5 h-5 text-primary" />
                              <span className="text-base font-medium text-foreground">
                                {payment.receiptNumber}
                              </span>
                              <span className="text-base text-muted-foreground">
                                • {new Date(payment.paymentDate).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            <span className="text-base font-semibold text-green-600 dark:text-green-400">
                              Rs {parseFloat(payment.paymentAmount || "0").toLocaleString()}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
