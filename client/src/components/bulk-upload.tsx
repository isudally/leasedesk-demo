import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import * as XLSX from "xlsx";

export function BulkUpload({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{
    success: number;
    errors: string[];
  } | null>(null);

  const downloadTemplate = (type: "landlords" | "stores" | "tenants") => {
    let data: any[] = [];
    let filename = "";

    if (type === "landlords") {
      data = [
        {
          "Unique Ref": "LL001",
          "Full Name": "John Doe",
          "ID Card Number": "M1234567890",
          "Address": "123 Main St, Port Louis",
          "Phone Number": "+230 5123 4567",
          "Email": "john@example.com",
          "Signature URL": "https://example.com/signature.png (optional)"
        }
      ];
      filename = "landlords_template.xlsx";
    } else if (type === "stores") {
      data = [
        {
          "Unique Ref": "ST001",
          "Store Number": "Shop 1",
          "Floor": "Ground Floor",
          "Size": "50 sqm (optional)",
          "Features": "Air conditioned, 2 entrances (optional)"
        }
      ];
      filename = "stores_template.xlsx";
    } else if (type === "tenants") {
      data = [
        {
          "Landlord Ref": "LL001",
          "Store Ref": "ST001 (optional)",
          "Tenant Type": "individual",
          "Gender": "Mr",
          "Tenant Name": "Pierre Martin",
          "Business Name": "Martin Shop (optional for individuals)",
          "ID Card Number": "M9876543210",
          "Address": "456 Rose Hill",
          "Phone": "+230 5987 6543",
          "Email": "pierre@example.com",
          "Trade Permit No": "TP123456 (required for companies)",
          "Trade Permit Expiry": "2026-12-31 (YYYY-MM-DD, optional)",
          "Monthly Rent": "15000",
          "Lease Start": "2025-01-01 (YYYY-MM-DD)",
          "Lease End": "2025-12-31 (YYYY-MM-DD)",
          "Utilities Charge": "200",
          "Deposit": "15000 (optional)",
          "Deposit Paid": "false",
          "Premises Address": "Riverton Market Plaza",
          "Commercial Purpose": "Retail clothing store",
          "Notes": "Any additional notes (optional)"
        }
      ];
      filename = "tenants_template.xlsx";
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type);
    XLSX.writeFile(wb, filename);

    toast({
      title: "Template Downloaded",
      description: `${filename} has been downloaded. Fill it with your data and upload.`,
    });
  };

  const handleFileUpload = async (
    file: File,
    type: "landlords" | "stores" | "tenants"
  ) => {
    setUploading(true);
    setResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast({
          title: "Error",
          description: "The Excel file is empty. Please add data and try again.",
          variant: "destructive",
        });
        return;
      }

      const response = await apiRequest("POST", `/api/bulk-upload/${type}`, { data: jsonData });
      const result = await response.json();

      setResults(result);

      if (result.errors.length === 0) {
        toast({
          title: "Success!",
          description: `${result.success} ${type} uploaded successfully.`,
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: [`/api/${type}`] });
        onSuccess?.();
      } else {
        toast({
          title: "Partial Success",
          description: `${result.success} uploaded, ${result.errors.length} errors.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="landlords" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="landlords" data-testid="tab-landlords">
            Landlords
          </TabsTrigger>
          <TabsTrigger value="stores" data-testid="tab-stores">
            Stores
          </TabsTrigger>
          <TabsTrigger value="tenants" data-testid="tab-tenants">
            Tenants
          </TabsTrigger>
        </TabsList>

        <TabsContent value="landlords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Upload Landlords</CardTitle>
              <CardDescription className="text-base">
                Download the template, fill it with your landlord data, and upload it back.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => downloadTemplate("landlords")}
                variant="outline"
                className="w-full h-12 text-base"
                data-testid="button-download-landlords"
              >
                <Download className="mr-2 h-5 w-5" />
                Download Template
              </Button>

              <div className="space-y-2">
                <Label htmlFor="landlords-file" className="text-base">
                  Upload Landlords File
                </Label>
                <Input
                  id="landlords-file"
                  type="file"
                  accept=".xlsx,.xls"
                  className="h-12 text-base bg-white"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "landlords");
                  }}
                  disabled={uploading}
                  data-testid="input-upload-landlords"
                />
              </div>

              {uploading && (
                <p className="text-base text-muted-foreground">
                  Uploading... Please wait.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Upload Stores</CardTitle>
              <CardDescription className="text-base">
                Download the template, fill it with your store data, and upload it back.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => downloadTemplate("stores")}
                variant="outline"
                className="w-full h-12 text-base"
                data-testid="button-download-stores"
              >
                <Download className="mr-2 h-5 w-5" />
                Download Template
              </Button>

              <div className="space-y-2">
                <Label htmlFor="stores-file" className="text-base">
                  Upload Stores File
                </Label>
                <Input
                  id="stores-file"
                  type="file"
                  accept=".xlsx,.xls"
                  className="h-12 text-base bg-white"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "stores");
                  }}
                  disabled={uploading}
                  data-testid="input-upload-stores"
                />
              </div>

              {uploading && (
                <p className="text-base text-muted-foreground">
                  Uploading... Please wait.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Upload Tenants</CardTitle>
              <CardDescription className="text-base">
                Download the template, fill it with your tenant data, and upload it back.
                Make sure landlord and store references match existing records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => downloadTemplate("tenants")}
                variant="outline"
                className="w-full h-12 text-base"
                data-testid="button-download-tenants"
              >
                <Download className="mr-2 h-5 w-5" />
                Download Template
              </Button>

              <div className="space-y-2">
                <Label htmlFor="tenants-file" className="text-base">
                  Upload Tenants File
                </Label>
                <Input
                  id="tenants-file"
                  type="file"
                  accept=".xlsx,.xls"
                  className="h-12 text-base bg-white"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, "tenants");
                  }}
                  disabled={uploading}
                  data-testid="input-upload-tenants"
                />
              </div>

              {uploading && (
                <p className="text-base text-muted-foreground">
                  Uploading... Please wait.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              {results.errors.length === 0 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Upload Successful
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Upload Results
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-base">
                <strong>{results.success}</strong> records uploaded successfully
              </p>

              {results.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-base font-semibold text-destructive">
                    {results.errors.length} errors:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-base">
                    {results.errors.slice(0, 10).map((error, index) => (
                      <li key={index} className="text-destructive">
                        {error}
                      </li>
                    ))}
                    {results.errors.length > 10 && (
                      <li className="text-muted-foreground">
                        ... and {results.errors.length - 10} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
