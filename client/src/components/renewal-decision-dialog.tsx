import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Tenant } from "./tenant-card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RenewalDecisionDialogProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenew: (tenantId: string) => void;
  onNotRenew: (tenantId: string) => void;
}

export function RenewalDecisionDialog({
  tenant,
  open,
  onOpenChange,
  onRenew,
  onNotRenew,
}: RenewalDecisionDialogProps) {
  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl" data-testid="renewal-decision-title">
            Contract Expiring - Decision Required
          </DialogTitle>
          <DialogDescription>
            The lease for {tenant.tenantName} is expiring soon. Please choose whether to renew or not renew this contract.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Current lease ends on {format(tenant.leaseEnd, "dd MMMM yyyy")}
          </AlertDescription>
        </Alert>

        <Card className="p-6 bg-muted/50">
          <h3 className="font-semibold mb-4 text-lg">Current Lease Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Tenant Name:</span>
              <div className="font-medium">{tenant.tenantName}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Business:</span>
              <div className="font-medium">{tenant.businessName || "N/A"}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Landlord:</span>
              <div className="font-medium">{tenant.landlordName}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Monthly Rent:</span>
              <div className="font-medium">MUR {tenant.monthlyRent.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Lease Start:</span>
              <div className="font-medium">{format(tenant.leaseStart, "dd MMM yyyy")}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Lease End:</span>
              <div className="font-medium">{format(tenant.leaseEnd, "dd MMM yyyy")}</div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">What would you like to do?</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 border-2 border-chart-2 hover-elevate">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-chart-2 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-base mb-1">Renew Lease</h4>
                  <p className="text-sm text-muted-foreground">
                    Continue the tenancy with a new lease agreement. You'll be able to update the dates and rent amount.
                  </p>
                </div>
              </div>
              <Button
                className="w-full bg-chart-2 hover:bg-chart-2/90 text-white"
                size="lg"
                onClick={() => {
                  onRenew(tenant.id);
                  onOpenChange(false);
                }}
                data-testid="button-decision-renew"
              >
                Yes, Renew Lease
              </Button>
            </Card>

            <Card className="p-6 border-2 border-destructive hover-elevate">
              <div className="flex items-start gap-3 mb-4">
                <XCircle className="h-6 w-6 text-destructive flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-base mb-1">Do Not Renew</h4>
                  <p className="text-sm text-muted-foreground">
                    End the tenancy. The tenant will need to vacate the property when the lease expires.
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                className="w-full"
                size="lg"
                onClick={() => {
                  onNotRenew(tenant.id);
                  onOpenChange(false);
                }}
                data-testid="button-decision-not-renew"
              >
                No, Do Not Renew
              </Button>
            </Card>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-decision"
          >
            I'll Decide Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
