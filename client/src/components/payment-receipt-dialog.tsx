import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Download, Printer, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface PaymentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: {
    tenantName: string;
    businessName?: string;
    landlordName: string;
    monthlyRent: number;
    cleaningCharge?: number;
    waterCharge?: number;
    month: string;
    paymentDate: Date;
    receiptNumber: string;
  };
}

export function PaymentReceiptDialog({
  open,
  onOpenChange,
  payment,
}: PaymentReceiptDialogProps) {
  const [landlordSigned, setLandlordSigned] = useState(false);
  const [tenantSigned, setTenantSigned] = useState(false);

  const totalAmount = 
    payment.monthlyRent + 
    (payment.cleaningCharge || 0) + 
    (payment.waterCharge || 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    alert("PDF download will be implemented with backend integration");
  };

  const handleConfirmBothSigned = () => {
    if (landlordSigned && tenantSigned) {
      alert("Receipt confirmed and saved to records");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="receipt-dialog-title">Payment Receipt</DialogTitle>
          <DialogDescription>
            Generate and sign payment receipt for record keeping
          </DialogDescription>
        </DialogHeader>

        <Card className="p-8 print:shadow-none" data-testid="receipt-card">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">PAYMENT RECEIPT</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Commercial Property Lease Payment
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-muted-foreground">Receipt No.</p>
              <p className="font-semibold">{payment.receiptNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Date</p>
              <p className="font-semibold">{format(payment.paymentDate, "dd MMMM yyyy")}</p>
            </div>
          </div>

          <Separator className="mb-6" />

          <div className="space-y-4 mb-6">
            <div>
              <h3 className="font-semibold mb-2">Received From:</h3>
              <p className="text-sm">
                <strong>Tenant:</strong> {payment.tenantName}
              </p>
              {payment.businessName && (
                <p className="text-sm">
                  <strong>Business:</strong> {payment.businessName}
                </p>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Received By:</h3>
              <p className="text-sm">
                <strong>Landlord:</strong> {payment.landlordName}
              </p>
            </div>
          </div>

          <Separator className="mb-6" />

          <div className="mb-6">
            <h3 className="font-semibold mb-3">Payment Details for {payment.month}</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Monthly Rent</span>
                <span className="font-medium">MUR {payment.monthlyRent.toLocaleString()}</span>
              </div>
              {payment.cleaningCharge && payment.cleaningCharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Cleaning Charge</span>
                  <span className="font-medium">MUR {payment.cleaningCharge.toLocaleString()}</span>
                </div>
              )}
              {payment.waterCharge && payment.waterCharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Water Charge</span>
                  <span className="font-medium">MUR {payment.waterCharge.toLocaleString()}</span>
                </div>
              )}
              <Separator className="my-3" />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total Amount Paid</span>
                <span className="text-chart-2">MUR {totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <Separator className="mb-6" />

          <div className="grid grid-cols-2 gap-8 mb-6">
            <div className="border-t-2 border-dashed pt-16 text-center">
              <p className="text-sm font-semibold">Landlord Signature</p>
              <p className="text-xs text-muted-foreground mt-1">{payment.landlordName}</p>
            </div>
            <div className="border-t-2 border-dashed pt-16 text-center">
              <p className="text-sm font-semibold">Tenant Signature</p>
              <p className="text-xs text-muted-foreground mt-1">{payment.tenantName}</p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>This is a computer-generated receipt for rent payment tracking.</p>
            <p>Both parties should keep a signed copy for their records.</p>
          </div>
        </Card>

        <div className="space-y-4 print:hidden">
          <Card className="p-4 bg-muted/30">
            <h4 className="font-semibold mb-3 text-sm">Confirm Signatures (Digital Tracking)</h4>
            <p className="text-xs text-muted-foreground mb-3">
              After both parties sign the printed receipt, check these boxes to record the payment.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="landlord-signed"
                  checked={landlordSigned}
                  onCheckedChange={(checked) => setLandlordSigned(checked as boolean)}
                  data-testid="checkbox-landlord-signed"
                />
                <label
                  htmlFor="landlord-signed"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Landlord has signed the receipt
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tenant-signed"
                  checked={tenantSigned}
                  onCheckedChange={(checked) => setTenantSigned(checked as boolean)}
                  data-testid="checkbox-tenant-signed"
                />
                <label
                  htmlFor="tenant-signed"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Tenant has signed the receipt
                </label>
              </div>
            </div>
          </Card>

          <div className="flex gap-3 justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrint}
                data-testid="button-print-receipt"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                data-testid="button-download-receipt"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
            <Button
              onClick={handleConfirmBothSigned}
              disabled={!landlordSigned || !tenantSigned}
              data-testid="button-confirm-payment"
            >
              <Check className="h-4 w-4 mr-2" />
              Confirm Payment Recorded
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
