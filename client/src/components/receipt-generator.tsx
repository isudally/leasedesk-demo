import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Share2 } from "lucide-react";
import jsPDF from "jspdf";

interface ReceiptGeneratorProps {
  payment: {
    id: number;
    receiptNumber: string;
    paymentDate: string;
    monthYear: string;
    rentAmount: number;
    utilitiesAmount: number;
    totalAmountDue: number;
    paymentAmount: number;
    landlordAmount: number;
    balance: number;
    notes?: string;
  };
  tenant: {
    name: string;
    businessName?: string;
    store: string;
  };
  landlord: {
    name: string;
    address: string;
    phone: string;
    signatureUrl?: string;
  };
}

export function ReceiptGenerator({ payment, tenant, landlord }: ReceiptGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const buildReceiptPDF = async (): Promise<jsPDF> => {
    const pdf = new jsPDF();
    let y = 20;

    // Convert string amounts to numbers
    const rentAmount = Number(payment.rentAmount);
    const utilitiesAmount = Number(payment.utilitiesAmount);
    const totalAmountDue = Number(payment.totalAmountDue);
    const paymentAmount = Number(payment.paymentAmount);
    const landlordAmount = Number(payment.landlordAmount);
    const balance = Number(payment.balance);

    // Header
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("LEASEDESK", 105, y, { align: "center" });
    y += 8;

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.text("Commercial property operations", 105, y, { align: "center" });
    y += 15;

    // Receipt Title
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("PAYMENT RECEIPT", 105, y, { align: "center" });
    y += 15;

    // Receipt Number and Date
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Receipt number: ${payment.receiptNumber}`, 20, y);
    pdf.text(`Date: ${new Date(payment.paymentDate).toLocaleDateString("fr-FR")}`, 150, y);
    y += 10;
    pdf.text(`Mois concerné: ${payment.monthYear}`, 20, y);
    y += 15;

    // Landlord Details (Bailleur)
    pdf.setFont("helvetica", "bold");
    pdf.text("BAILLEUR / LANDLORD:", 20, y);
    y += 7;
    pdf.setFont("helvetica", "normal");
    pdf.text(landlord.name, 20, y);
    y += 6;
    pdf.text(landlord.address, 20, y);
    y += 6;
    pdf.text(`Tél: ${landlord.phone}`, 20, y);
    y += 15;

    // Tenant details
    pdf.setFont("helvetica", "bold");
    pdf.text("LOCATAIRE / TENANT:", 20, y);
    y += 7;
    pdf.setFont("helvetica", "normal");
    pdf.text(tenant.businessName || tenant.name, 20, y);
    y += 6;
    pdf.text(`Magasin / Store: ${tenant.store}`, 20, y);
    y += 15;

    // Payment Details (Détails du paiement)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("DÉTAILS DU PAIEMENT / PAYMENT DETAILS:", 20, y);
    y += 10;

    // Table header
    pdf.setFillColor(50, 90, 137);
    pdf.rect(20, y - 5, 170, 8, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.text("Description", 25, y);
    pdf.text("Montant / Amount", 140, y);
    y += 10;

    // Table rows
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "normal");

    // Rent
    pdf.text("Loyer mensuel / Monthly Rent", 25, y);
    pdf.text(`Rs ${rentAmount.toFixed(2)}`, 140, y);
    y += 7;

    // Utilities (includes water, cleaning, etc.)
    if (utilitiesAmount > 0) {
      pdf.text("Charges (eau, nettoyage) / Utilities (water, cleaning)", 25, y);
      pdf.text(`Rs ${utilitiesAmount.toFixed(2)}`, 140, y);
      y += 7;
    }

    y += 3;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, y, 190, y);
    y += 7;

    // Total Due
    pdf.setFont("helvetica", "bold");
    pdf.text("TOTAL DÛ / TOTAL DUE:", 25, y);
    pdf.text(`Rs ${totalAmountDue.toFixed(2)}`, 140, y);
    y += 10;

    // Payment Received
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("PAIEMENT REÇU / PAYMENT RECEIVED:", 25, y);
    pdf.text(`Rs ${paymentAmount.toFixed(2)}`, 140, y);
    y += 10;

    // Balance (if partial payment)
    if (Math.abs(balance) > 0.01) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      if (balance > 0) {
        pdf.text(`Solde dû / Balance Due: Rs ${balance.toFixed(2)}`, 25, y);
      } else {
        pdf.text(`Crédit / Credit: Rs ${Math.abs(balance).toFixed(2)}`, 25, y);
      }
      y += 10;
    }
    y += 5;

    // Calculate excess payment
    const excessPayment = Math.max(0, paymentAmount - totalAmountDue);

    // Show excess payment if applicable
    if (excessPayment > 0.01) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(10);
      pdf.text(`Note: Excédent de paiement / Excess Payment: Rs ${excessPayment.toFixed(2)}`, 25, y);
      pdf.setFont("helvetica", "normal");
      y += 8;
    }

    // Notes
    if (payment.notes) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text("Notes:", 20, y);
      y += 6;
      const splitNotes = pdf.splitTextToSize(payment.notes, 170);
      pdf.text(splitNotes, 20, y);
      y += (splitNotes.length * 6) + 10;
    }

    // Signature Section
    y = Math.max(y, 220); // Ensure signatures are near bottom
    pdf.setFont("helvetica", "bold");
    pdf.text("Signature du bailleur:", 25, y);
    pdf.text("Signature du locataire:", 120, y);
    y += 5;

    // Landlord signature if available
    if (landlord.signatureUrl) {
      try {
        const signatureImg = await loadImage(landlord.signatureUrl);
        pdf.addImage(signatureImg, "PNG", 25, y, 40, 20);
      } catch (error) {
        console.warn("Could not load landlord signature:", error);
      }
    }

    y += 25;
    pdf.line(25, y, 85, y);
    pdf.line(120, y, 180, y);
    y += 5;

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "italic");
    pdf.text("Landlord Signature", 25, y);
    pdf.text("Tenant Signature", 120, y);

    // Add footer at bottom of page
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(128, 128, 128);
    const footerText = 'Document generated via LeaseDesk';
    const footerWidth = pdf.getTextWidth(footerText);
    pdf.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 10);
    pdf.setTextColor(0, 0, 0);

    return pdf;
  };

  const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } else {
          reject(new Error("Failed to get canvas context"));
        }
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGenerating(true);
      const pdf = await buildReceiptPDF();
      const filename = `receipt_${payment.receiptNumber}_${tenant.businessName || tenant.name}.pdf`;
      pdf.save(filename);

      toast({
        title: "Receipt downloaded",
        description: `Receipt ${payment.receiptNumber} was downloaded successfully.`,
      });
    } catch (error) {
      console.error("Error generating receipt PDF:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Could not generate the receipt PDF. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      setIsGenerating(true);
      const pdf = await buildReceiptPDF();
      const pdfBlob = pdf.output("blob");
      const filename = `receipt_${payment.receiptNumber}_${tenant.businessName || tenant.name}.pdf`;

      // Check if Web Share API is supported and can share files
      if (navigator.share && navigator.canShare) {
        const file = new File([pdfBlob], filename, { type: "application/pdf" });
        const shareData = {
          files: [file],
          title: `Receipt ${payment.receiptNumber}`,
          text: `Payment receipt for ${tenant.businessName || tenant.name} - ${payment.monthYear}\nAmount received: Rs ${Number(payment.paymentAmount).toFixed(2)}`,
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          toast({
            title: "Receipt shared",
            description: "The receipt was shared successfully.",
          });
          return;
        }
      }

      // Fallback: Download PDF and provide instructions
      pdf.save(filename);
      toast({
        title: "Téléchargement du reçu",
        description: "Le PDF a été téléchargé. Veuillez le partager manuellement via WhatsApp en ouvrant l'application et en sélectionnant le fichier téléchargé.",
        duration: 8000,
      });
    } catch (error) {
      console.error("Error sharing receipt:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de partager le reçu. Veuillez réessayer.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="bg-card rounded-lg shadow-md">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Payment Receipt
            </h3>
            <p className="text-lg text-muted-foreground">
              Generate and share receipt {payment.receiptNumber}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="h-14 text-lg flex-1"
              data-testid="button-download-receipt"
            >
              <Download className="w-5 h-5 mr-2" />
              Télécharger PDF
            </Button>

            <Button
              onClick={handleShareWhatsApp}
              disabled={isGenerating}
              variant="outline"
              className="h-14 text-lg flex-1"
              data-testid="button-share-receipt-whatsapp"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Partager via WhatsApp
            </Button>
          </div>

          {isGenerating && (
            <p className="text-lg text-muted-foreground text-center">
              Génération du reçu en cours...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
