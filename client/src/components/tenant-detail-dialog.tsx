import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Edit } from "lucide-react";
import { Tenant } from "./tenant-card";
import { Separator } from "@/components/ui/separator";
import { DocumentUpload } from "./document-upload";
import { useToast } from "@/hooks/use-toast";

interface TenantDetailDialogProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (id: string) => void;
  onGeneratePDF?: (id: string) => void;
}

export function TenantDetailDialog({
  tenant,
  open,
  onOpenChange,
  onEdit,
  onGeneratePDF,
}: TenantDetailDialogProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);

  if (!tenant) return null;

  const handleDocumentUpload = (file: File, type: string) => {
    const newDoc = {
      id: `doc-${Date.now()}`,
      name: file.name,
      type,
      uploadDate: new Date(),
      size: `${(file.size / 1024).toFixed(1)} KB`,
    };
    setDocuments([...documents, newDoc]);
    toast({
      title: "Document Uploaded",
      description: `${file.name} has been uploaded successfully.`,
    });
  };

  const handleDocumentDelete = (docId: string) => {
    setDocuments(documents.filter((d) => d.id !== docId));
    toast({
      title: "Document Deleted",
      description: "Document has been removed.",
    });
  };

  const handleDocumentView = (doc: any) => {
    toast({
      title: "View Document",
      description: "Document viewing will be implemented with backend integration.",
    });
  };

  const DetailRow = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <div className="grid grid-cols-3 gap-4 py-3">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm col-span-2">{value || "—"}</dd>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span data-testid="detail-tenant-name">{tenant.tenantName}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Tenant Details</h3>
              <dl className="divide-y divide-border">
                <DetailRow label="Full Name" value={tenant.tenantName} />
                <DetailRow label="Business Name" value={tenant.businessName} />
                {tenant.storeLocation && (
                  <DetailRow label="Store Location" value={tenant.storeLocation} />
                )}
              </dl>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3">Landlord Information</h3>
              <dl className="divide-y divide-border">
                <DetailRow label="Landlord Name" value={tenant.landlordName} />
              </dl>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-3">Lease Information</h3>
              <dl className="divide-y divide-border">
                <DetailRow
                  label="Lease Start"
                  value={format(tenant.leaseStart, "dd MMMM yyyy")}
                />
                <DetailRow
                  label="Lease End"
                  value={format(tenant.leaseEnd, "dd MMMM yyyy")}
                />
                <DetailRow
                  label="Monthly Rent"
                  value={`MUR ${tenant.monthlyRent.toLocaleString()}`}
                />
                {tenant.deposit && (
                  <DetailRow
                    label="Security Deposit"
                    value={`MUR ${tenant.deposit.toLocaleString()}`}
                  />
                )}
                {tenant.cleaningCharge && (
                  <DetailRow
                    label="Cleaning Charge"
                    value={`MUR ${tenant.cleaningCharge.toLocaleString()}/month`}
                  />
                )}
                {tenant.waterCharge && (
                  <DetailRow
                    label="Water Charge"
                    value={`MUR ${tenant.waterCharge.toLocaleString()}/month`}
                  />
                )}
              </dl>
            </div>

            {tenant.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3">Additional Notes</h3>
                  <p className="text-sm text-muted-foreground">{tenant.notes}</p>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  onEdit?.(tenant.id);
                  onOpenChange(false);
                }}
                data-testid="button-edit-detail"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={() => {
                  onGeneratePDF?.(tenant.id);
                }}
                data-testid="button-generate-pdf-detail"
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Contract PDF
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <DocumentUpload
              documents={documents}
              onUpload={handleDocumentUpload}
              onDelete={handleDocumentDelete}
              onView={handleDocumentView}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
