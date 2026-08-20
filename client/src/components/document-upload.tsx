import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, Trash2, Eye, Download } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Document {
  id: string;
  name: string;
  type: "contract" | "trade_permit" | "id_card" | "other";
  uploadDate: Date;
  size: string;
  url?: string;
}

interface DocumentUploadProps {
  documents: Document[];
  onUpload: (file: File, type: string) => void;
  onDelete: (documentId: string) => void;
  onView: (document: Document) => void;
}

export function DocumentUpload({
  documents,
  onUpload,
  onDelete,
  onView,
}: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("contract");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile, documentType);
      setSelectedFile(null);
      const input = document.getElementById("file-upload") as HTMLInputElement;
      if (input) input.value = "";
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      contract: "Lease Contract",
      trade_permit: "Trade Permit",
      id_card: "ID Document",
      other: "Other",
    };
    return labels[type] || type;
  };

  const getDocumentTypeBadgeVariant = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      contract: "default",
      trade_permit: "secondary",
      id_card: "outline",
      other: "outline",
    };
    return variants[type] || "outline";
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Upload Documents</h3>
        
        <Alert className="mb-4">
          <AlertDescription className="text-sm">
            Upload scanned copies of contracts, trade permits, ID cards, and other important documents. Supported formats: PDF, JPG, PNG (Max 10MB)
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Document Type</label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger data-testid="select-document-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Lease Contract</SelectItem>
                <SelectItem value="trade_permit">Trade Permit</SelectItem>
                <SelectItem value="id_card">ID Document</SelectItem>
                <SelectItem value="other">Other Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Select File</label>
            <div className="flex gap-2">
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="flex-1"
                data-testid="input-file-upload"
              />
              <Button
                onClick={handleUpload}
                disabled={!selectedFile}
                data-testid="button-upload-document"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        </div>
      </Card>

      {documents.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Uploaded Documents</h3>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                data-testid={`document-${doc.id}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-2 rounded-md bg-muted">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{doc.name}</h4>
                      <Badge variant={getDocumentTypeBadgeVariant(doc.type)}>
                        {getDocumentTypeLabel(doc.type)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {format(doc.uploadDate, "dd MMM yyyy")} • {doc.size}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onView(doc)}
                    data-testid={`button-view-${doc.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(doc.id)}
                    data-testid={`button-delete-${doc.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {documents.length === 0 && (
        <Card className="p-12 text-center border-dashed">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h4 className="text-sm font-medium mb-1">No documents uploaded yet</h4>
          <p className="text-xs text-muted-foreground">
            Upload your first document using the form above
          </p>
        </Card>
      )}
    </div>
  );
}
