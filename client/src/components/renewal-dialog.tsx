import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { format, addYears } from "date-fns";
import { Tenant } from "./tenant-card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const renewalSchema = z.object({
  leaseStart: z.date({required_error: "Start date is required"}),
  leaseEnd: z.date({required_error: "End date is required"}),
  monthlyRent: z.coerce.number().min(0, "Rent must be positive"),
  deposit: z.coerce.number().min(0).optional(),
  cleaningCharge: z.coerce.number().min(0).optional(),
  waterCharge: z.coerce.number().min(0).optional(),
});

type RenewalFormData = z.infer<typeof renewalSchema>;

interface RenewalDialogProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenew: (tenantId: string, data: RenewalFormData) => void;
}

export function RenewalDialog({
  tenant,
  open,
  onOpenChange,
  onRenew,
}: RenewalDialogProps) {
  const suggestedStartDate = tenant ? addYears(tenant.leaseEnd, 0) : new Date();
  const suggestedEndDate = tenant ? addYears(suggestedStartDate, 1) : addYears(new Date(), 1);
  
  const form = useForm<RenewalFormData>({
    resolver: zodResolver(renewalSchema),
    defaultValues: tenant ? {
      leaseStart: suggestedStartDate,
      leaseEnd: suggestedEndDate,
      monthlyRent: tenant.monthlyRent,
      deposit: tenant.deposit,
      cleaningCharge: tenant.cleaningCharge,
      waterCharge: tenant.waterCharge,
    } : undefined,
  });

  const handleSubmit = (data: RenewalFormData) => {
    if (tenant) {
      onRenew(tenant.id, data);
      form.reset();
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl" data-testid="renewal-dialog-title">
            Renew Lease - {tenant.tenantName}
          </DialogTitle>
          <DialogDescription>
            Update the lease terms for renewal. Current lease ends on{" "}
            {format(tenant.leaseEnd, "dd MMMM yyyy")}.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            All tenant and landlord information will be copied from the existing contract.
            You only need to update the dates and rent amount.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="leaseStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">New Lease Start Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal h-12 text-base"
                            data-testid="button-renewal-start"
                          >
                            <CalendarIcon className="mr-2 h-5 w-5" />
                            {field.value ? format(field.value, "dd MMM yyyy") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="leaseEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">New Lease End Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal h-12 text-base"
                            data-testid="button-renewal-end"
                          >
                            <CalendarIcon className="mr-2 h-5 w-5" />
                            {field.value ? format(field.value, "dd MMM yyyy") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="monthlyRent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">
                    New Monthly Rent (MUR) *
                    {tenant.monthlyRent !== field.value && (
                      <span className="text-muted-foreground ml-2">
                        (Previous: MUR {tenant.monthlyRent.toLocaleString()})
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      className="h-12 text-base"
                      placeholder="15000"
                      {...field}
                      data-testid="input-renewal-rent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="deposit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Security Deposit (MUR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="h-12 text-base"
                        placeholder="0"
                        {...field}
                        data-testid="input-renewal-deposit"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cleaningCharge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Cleaning (MUR/month)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="h-12 text-base"
                        placeholder="0"
                        {...field}
                        data-testid="input-renewal-cleaning"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="waterCharge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Water (MUR/month)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        className="h-12 text-base"
                        placeholder="0"
                        {...field}
                        data-testid="input-renewal-water"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-renewal"
              >
                Cancel
              </Button>
              <Button type="submit" size="lg" data-testid="button-submit-renewal">
                Renew Lease & Generate Contract
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
