import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Payment, Tenant } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Filter, User, DollarSign, Receipt, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parse } from "date-fns";

export default function AllPayments() {
  const [, navigate] = useLocation();
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const { data: payments, isLoading: isLoadingPayments } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  // Generate unique months and years from payment data
  const monthsYears = payments?.reduce((acc, payment) => {
    const date = new Date(payment.paymentDate);
    const month = format(date, "MMMM");
    const year = format(date, "yyyy");
    
    if (!acc.months.includes(month)) {
      acc.months.push(month);
    }
    if (!acc.years.includes(year)) {
      acc.years.push(year);
    }
    return acc;
  }, { months: [] as string[], years: [] as string[] }) || { months: [], years: [] };

  // Sort years in descending order
  const sortedYears = monthsYears.years.sort((a, b) => parseInt(b) - parseInt(a));

  // Filter payments by selected month and year
  const filteredPayments = payments?.filter(payment => {
    const date = new Date(payment.paymentDate);
    const month = format(date, "MMMM");
    const year = format(date, "yyyy");

    const matchesMonth = selectedMonth === "all" || month === selectedMonth;
    const matchesYear = selectedYear === "all" || year === selectedYear;

    return matchesMonth && matchesYear;
  }) || [];

  // Calculate totals for filtered payments
  const totalPaymentsAmount = filteredPayments.reduce((sum, p) => 
    sum + parseFloat(p.paymentAmount.toString()), 0
  );

  const getTenantName = (tenantId: string) => {
    const tenant = tenants?.find(t => t.id === tenantId);
    return tenant?.businessName || tenant?.tenantName || "Unknown";
  };

  const clearFilters = () => {
    setSelectedMonth("all");
    setSelectedYear("all");
  };

  const hasActiveFilters = selectedMonth !== "all" || selectedYear !== "all";

  if (isLoadingPayments) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 -ml-3"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
                All Payments
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                View and filter payment history
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="w-5 h-5" />
                Filter Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Month
                  </label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="h-12 text-base" data-testid="select-month">
                      <SelectValue placeholder="All months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All months</SelectItem>
                      {["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"].map(month => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Year
                  </label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="h-12 text-base" data-testid="select-year">
                      <SelectValue placeholder="All years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All years</SelectItem>
                      {sortedYears.map(year => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="h-12 w-full"
                      data-testid="button-clear-filters"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>

              {/* Filter Summary */}
              {hasActiveFilters && (
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Showing:</span>
                  {selectedMonth !== "all" && (
                    <Badge variant="secondary" className="text-base">
                      {selectedMonth}
                    </Badge>
                  )}
                  {selectedYear !== "all" && (
                    <Badge variant="secondary" className="text-base">
                      {selectedYear}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="mb-6" style={{ backgroundColor: '#E6F1EC' }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base text-muted-foreground mb-1">
                    {hasActiveFilters ? 'Filtered' : 'Total'} Payments
                  </p>
                  <p className="text-3xl font-bold" style={{ color: '#325A89' }}>
                    Rs {totalPaymentsAmount.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base text-muted-foreground mb-1">
                    Payment Count
                  </p>
                  <p className="text-3xl font-bold" style={{ color: '#325A89' }}>
                    {filteredPayments.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments List */}
        <div className="space-y-4">
          {filteredPayments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl text-muted-foreground">
                  {hasActiveFilters ? 'No payments found for the selected period' : 'No payments recorded yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredPayments
              .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
              .map((payment) => {
                const paymentDate = new Date(payment.paymentDate);
                const tenant = tenants?.find(t => t.id === payment.tenantId);

                return (
                  <Card 
                    key={payment.id} 
                    className="hover-elevate cursor-pointer"
                    onClick={() => navigate(`/tenants/${payment.tenantId}`)}
                    data-testid={`payment-card-${payment.id}`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <User className="w-5 h-5 text-muted-foreground" />
                            <h3 className="text-lg font-semibold text-foreground">
                              {getTenantName(payment.tenantId)}
                            </h3>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground ml-8">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {format(paymentDate, "MMMM d, yyyy")}
                            </div>
                            <div className="flex items-center gap-2">
                              <Receipt className="w-4 h-4" />
                              {payment.receiptNumber}
                            </div>
                            {payment.monthYear && (
                              <Badge variant="outline" className="text-sm">
                                For: {payment.monthYear}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground mb-1">Amount Paid</p>
                            <p className="text-2xl font-bold" style={{ color: '#10B981' }}>
                              Rs {parseFloat(payment.paymentAmount.toString()).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Rent</p>
                          <p className="font-semibold">Rs {parseFloat(payment.rentAmount.toString()).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Utilities</p>
                          <p className="font-semibold">Rs {parseFloat(payment.utilitiesAmount?.toString() || "0").toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Due</p>
                          <p className="font-semibold">Rs {parseFloat(payment.totalAmountDue.toString()).toLocaleString()}</p>
                        </div>
                        {payment.balance && parseFloat(payment.balance.toString()) > 0 && (
                          <div>
                            <p className="text-muted-foreground">Balance</p>
                            <p className="font-semibold text-amber-600">
                              Rs {parseFloat(payment.balance.toString()).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {payment.notes && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Notes:</span> {payment.notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}
