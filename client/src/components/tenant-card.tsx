import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Edit, MoreVertical, RefreshCw } from "lucide-react";
import { format, differenceInMonths, isPast, isFuture } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Tenant {
  id: string;
  tenantName: string;
  businessName?: string;
  landlordName: string;
  storeLocation?: string;
  monthlyRent: number;
  leaseStart: Date;
  leaseEnd: Date;
  cleaningCharge?: number;
  waterCharge?: number;
  deposit?: number;
  depositPaid?: boolean;
  notes?: string;
  tdsStatus?: "paid" | "pending" | "not_applicable";
  tradePermitExpiry?: Date;
  renewalDecision?: "pending" | "renew" | "not_renew";
}

interface TenantCardProps {
  tenant: Tenant;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onGeneratePDF?: (id: string) => void;
  onRenew?: (id: string) => void;
}

export function TenantCard({ tenant, onView, onEdit, onGeneratePDF, onRenew }: TenantCardProps) {
  const getLeaseStatus = () => {
    const today = new Date();
    const monthsUntilExpiry = differenceInMonths(tenant.leaseEnd, today);
    
    if (isPast(tenant.leaseEnd)) {
      return { label: "Expired", variant: "destructive" as const, color: "border-l-destructive" };
    } else if (monthsUntilExpiry <= 3 && isFuture(tenant.leaseEnd)) {
      return { label: "Expiring Soon", variant: "default" as const, color: "border-l-chart-3" };
    } else {
      return { label: "Active", variant: "secondary" as const, color: "border-l-chart-2" };
    }
  };

  const status = getLeaseStatus();

  return (
    <Card className={`p-6 border-l-4 ${status.color} hover-elevate`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold" data-testid={`tenant-name-${tenant.id}`}>
              {tenant.tenantName}
            </h3>
            <Badge variant={status.variant} data-testid={`status-${tenant.id}`}>
              {status.label}
            </Badge>
          </div>
          
          {tenant.businessName && (
            <p className="text-sm text-muted-foreground mb-3">
              {tenant.businessName}
            </p>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Landlord:</span>{" "}
              <span className="font-medium">{tenant.landlordName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Monthly Rent:</span>{" "}
              <span className="font-medium" data-testid={`rent-${tenant.id}`}>
                MUR {tenant.monthlyRent.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Lease Start:</span>{" "}
              <span className="font-medium">{format(tenant.leaseStart, "dd MMM yyyy")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Lease End:</span>{" "}
              <span className="font-medium" data-testid={`lease-end-${tenant.id}`}>
                {format(tenant.leaseEnd, "dd MMM yyyy")}
              </span>
            </div>
          </div>

          {tenant.notes && (
            <p className="text-sm text-muted-foreground mt-3 italic">
              {tenant.notes}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`menu-${tenant.id}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView?.(tenant.id)} data-testid={`button-view-${tenant.id}`}>
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit?.(tenant.id)} data-testid={`button-edit-${tenant.id}`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onGeneratePDF?.(tenant.id)} data-testid={`button-pdf-${tenant.id}`}>
              <FileText className="h-4 w-4 mr-2" />
              Generate PDF
            </DropdownMenuItem>
            {status.label === "Expiring Soon" || status.label === "Expired" ? (
              <DropdownMenuItem onClick={() => onRenew?.(tenant.id)} data-testid={`button-renew-${tenant.id}`}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Renew Lease
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex gap-2 mt-4 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onView?.(tenant.id)}
          data-testid={`button-view-details-${tenant.id}`}
        >
          View Details
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => onGeneratePDF?.(tenant.id)}
          data-testid={`button-generate-contract-${tenant.id}`}
        >
          <FileText className="h-4 w-4 mr-2" />
          Generate Contract
        </Button>
        {(status.label === "Expiring Soon" || status.label === "Expired") && (
          <Button
            variant="outline"
            size="sm"
            className="border-chart-3 text-chart-3 hover:bg-chart-3/10"
            onClick={() => onRenew?.(tenant.id)}
            data-testid={`button-renew-quick-${tenant.id}`}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Renew Lease
          </Button>
        )}
      </div>
    </Card>
  );
}
