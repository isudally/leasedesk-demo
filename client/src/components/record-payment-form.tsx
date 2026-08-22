import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { format, parse } from "date-fns";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tenant } from "@shared/schema";
import { CalendarIcon, AlertCircle, CheckCircle2 } from "lucide-react";

const paymentSchema = z.object({
  tenantId: z.string().min(1, "Veuillez sélectionner un locataire"),
  receivedBy: z.string().min(1, "Veuillez sélectionner qui a reçu le paiement"),
  paymentDate: z.string().min(1, "Date requise"),
  monthYear: z.string().min(1, "Mois/Année requis"),
  rentAmount: z.string().min(1, "Montant requis"),
  utilitiesAmount: z.string(),
  paymentAmount: z.string().min(1, "Montant payé requis"),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface RecordPaymentFormProps {
  preselectedTenantId?: string;
  onSuccess?: () => void;
  onPaymentRecorded?: (paymentId: string) => void;
}

export function RecordPaymentForm({ preselectedTenantId, onSuccess, onPaymentRecorded }: RecordPaymentFormProps) {
  const { toast } = useToast();

  const { data: tenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  // Arrears data type
  interface ArrearsData {
    tenantId: string;
    tenantName: string;
    unpaidMonths: Array<{
      monthYear: string;
      balance: number;
      totalDue: number;
      amountPaid: number;
      partiallyPaid: boolean;
    }>;
    totalArrears: number;
    oldestUnpaidMonth: {
      monthYear: string;
      balance: number;
      totalDue: number;
    } | null;
  }

  const [selectedTenantId, setSelectedTenantId] = useState(preselectedTenantId || "");

  // Fetch arrears for selected tenant
  const { data: arrears } = useQuery<ArrearsData>({
    queryKey: ["/api/tenants", selectedTenantId, "arrears"],
    enabled: !!selectedTenantId,
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      tenantId: preselectedTenantId || "",
      receivedBy: "",
      paymentDate: new Date().toISOString().split('T')[0],
      monthYear: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      rentAmount: "",
      utilitiesAmount: "200",
      paymentAmount: "",
      notes: "",
    },
  });

  const selectedTenant = tenants?.find(t => t.id === selectedTenantId);

  // Auto-fill amounts when tenant is selected AND auto-select oldest unpaid month
  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    form.setValue("tenantId", tenantId);
    
    const tenant = tenants?.find(t => t.id === tenantId);
    if (tenant) {
      const rentAmount = parseFloat(tenant.monthlyRent.toString());
      const utilitiesAmount = parseFloat(tenant.utilitiesCharge?.toString() || "200");
      const totalDue = rentAmount + utilitiesAmount;
      
      form.setValue("rentAmount", rentAmount.toString());
      form.setValue("utilitiesAmount", utilitiesAmount.toString());
      // Auto-fill payment amount with total due (user can edit if partial payment)
      form.setValue("paymentAmount", totalDue.toString());
    }
  };

  // Auto-select oldest unpaid month when arrears data loads
  useEffect(() => {
    if (arrears?.oldestUnpaidMonth) {
      form.setValue("monthYear", arrears.oldestUnpaidMonth.monthYear);
    }
  }, [arrears, form]);

  const recordPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const rentAmount = parseFloat(data.rentAmount);
      const utilitiesAmount = parseFloat(data.utilitiesAmount || "0");
      const totalAmountDue = rentAmount + utilitiesAmount;
      const paymentAmount = parseFloat(data.paymentAmount);
      
      // Landlord receives full payment
      const landlordAmount = paymentAmount;
      
      // Balance if partial payment
      const balance = totalAmountDue - paymentAmount;
      
      // Generate unique receipt number
      const receiptNumber = `REC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      
      const paymentData = {
        tenantId: data.tenantId,
        receivedBy: data.receivedBy,
        paymentDate: data.paymentDate,
        monthYear: data.monthYear,
        rentAmount: rentAmount.toString(),
        utilitiesAmount: utilitiesAmount.toString(),
        totalAmountDue: totalAmountDue.toString(),
        paymentAmount: paymentAmount.toString(),
        landlordAmount: landlordAmount.toString(),
        balance: balance.toString(),
        landlordSigned: false,
        tenantSigned: false,
        receiptNumber: receiptNumber,
        notes: data.notes || "",
      };

      return await apiRequest("POST", "/api/payments", paymentData);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      if (selectedTenantId) {
        queryClient.invalidateQueries({ queryKey: ["/api/payments", selectedTenantId] });
        // Invalidate arrears to refresh unpaid months and totals
        queryClient.invalidateQueries({ queryKey: ["/api/tenants", selectedTenantId, "arrears"] });
      }
      toast({
        title: "Payment recorded",
        description: "The payment was recorded successfully.",
      });
      
      // Trigger receipt generation
      if (data?.id && onPaymentRecorded) {
        onPaymentRecorded(data.id);
      }
      
      form.reset();
      setSelectedTenantId("");
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Could not record the payment.",
        variant: "destructive",
      });
      console.error("Payment error:", error);
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    recordPaymentMutation.mutate(data);
  };

  // Calculate summary
  const rentAmount = parseFloat(form.watch("rentAmount") || "0");
  const utilitiesAmount = parseFloat(form.watch("utilitiesAmount") || "0");
  const paymentAmount = parseFloat(form.watch("paymentAmount") || "0");
  const totalAmountDue = rentAmount + utilitiesAmount;
  
  // Landlord receives full payment
  const landlordAmount = paymentAmount;
  const balance = totalAmountDue - paymentAmount;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="tenantId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Tenant *</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  handleTenantChange(value);
                }}
                value={field.value}
                disabled={!!preselectedTenantId}
              >
                <FormControl>
                  <SelectTrigger className="h-12 text-lg" data-testid="select-tenant" id="tenantId">
                    <SelectValue placeholder="Select a tenant" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tenants?.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.businessName || tenant.tenantName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="receivedBy"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Received by *</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="h-12 text-lg" data-testid="select-received-by">
                    <SelectValue placeholder="Select who received the payment" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Demo Manager">Demo Manager</SelectItem>
                  <SelectItem value="Property Owner">Property Owner</SelectItem>
                  <SelectItem value="Bookkeeper">Bookkeeper</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Arrears Display */}
        {selectedTenantId && arrears && arrears.totalArrears > 0 && (
          <Card className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <AlertCircle className="w-7 h-7 text-red-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
                    Payment Arrears
                  </p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
                    Rs {arrears.totalArrears.toLocaleString()}
                  </p>
                  <p className="text-base text-red-600/80 dark:text-red-400/80">
                    {arrears.unpaidMonths.length} unpaid month{arrears.unpaidMonths.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Unpaid Months List */}
              <div className="space-y-2">
                <p className="text-base font-medium text-red-700 dark:text-red-400 mb-3">
                  Unpaid Months:
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {arrears.unpaidMonths.map((month, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 0
                          ? 'bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700'
                          : 'bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-base font-medium text-foreground">
                          {month.monthYear}
                          {index === 0 && (
                            <span className="ml-2 text-sm text-amber-700 dark:text-amber-400">
                              (Auto-selected)
                            </span>
                          )}
                        </p>
                        {month.partiallyPaid && (
                          <p className="text-sm text-muted-foreground">
                            Already paid: Rs {month.amountPaid.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold text-red-600 dark:text-red-400">
                          Rs {month.balance.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          due
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Paid Status */}
        {selectedTenantId && arrears && arrears.totalArrears === 0 && (
          <Card className="bg-green-50 dark:bg-green-950/20 border-l-4 border-green-500">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-7 h-7 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-lg font-semibold text-green-700 dark:text-green-400 mb-1">
                    All Payments Up To Date
                  </p>
                  <p className="text-base text-green-600/80 dark:text-green-400/80">
                    No arrears for this tenant.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="paymentDate"
            render={({ field }) => {
              // Convert string to Date for display using timezone-safe parse
              const dateValue = field.value ? parse(field.value, "yyyy-MM-dd", new Date()) : undefined;
              
              return (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-lg">Payment Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="h-12 text-lg justify-start"
                          data-testid="button-payment-date"
                        >
                          <CalendarIcon className="mr-2 h-5 w-5" />
                          {dateValue ? format(dateValue, "PPP") : <span>Select a date</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateValue}
                        onSelect={(date) => {
                          // Convert Date to ISO string for form storage, or clear if null
                          if (date) {
                            field.onChange(format(date, "yyyy-MM-dd"));
                          } else {
                            field.onChange("");
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="monthYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Month/Year *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-12 text-lg"
                    placeholder="October 2025"
                    id="monthYear"
                    data-testid="input-month-year"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Amounts Due</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="rentAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Rent (Rs) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      className="h-12 text-lg"
                      placeholder="10000.00"
                      data-testid="input-rent-amount"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="utilitiesAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Utilities (Rs)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      className="h-12 text-lg"
                      placeholder="200.00"
                      data-testid="input-utilities-amount"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="bg-accent/10 p-4 rounded-lg">
            <p className="text-lg text-muted-foreground">
              Total Due: <span className="font-bold text-foreground">Rs {totalAmountDue.toFixed(2)}</span>
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="paymentAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Amount Paid (Rs) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  className="h-12 text-lg"
                  placeholder="10200.00"
                  data-testid="input-payment-amount"
                />
              </FormControl>
              <p className="text-lg text-muted-foreground">
                Amount actually received from the tenant
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  className="text-lg resize-none"
                  placeholder="Optional notes"
                  rows={3}
                  data-testid="textarea-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Card className="bg-accent/10 rounded-lg">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Payment Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-lg">
                <span className="text-muted-foreground">Total Due:</span>
                <span className="font-semibold text-foreground">Rs {totalAmountDue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="text-muted-foreground">Amount Received:</span>
                <span className="font-semibold text-primary">Rs {paymentAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg mt-2 pt-2 border-t">
                <span className="text-muted-foreground">Amount to Landlord:</span>
                <span className="font-bold text-green-600">Rs {landlordAmount.toFixed(2)}</span>
              </div>
              {balance !== 0 && (
                <div className="flex justify-between items-center text-lg pt-2 border-t">
                  <span className="text-muted-foreground">Balance {balance > 0 ? "Due" : "Credit"}:</span>
                  <span className={`font-bold ${balance > 0 ? "text-destructive" : "text-green-600"}`}>
                    Rs {Math.abs(balance).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full h-14 text-lg"
          disabled={recordPaymentMutation.isPending}
          data-testid="button-submit-payment"
        >
          {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
        </Button>
      </form>
    </Form>
  );
}
