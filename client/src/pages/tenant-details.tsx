import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Tenant, Landlord, Store, Payment, Document } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Calendar, User, Phone, Mail, FileText, MapPin, CreditCard, AlertCircle, CheckCircle, Trash2, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ContractGenerator } from "@/components/contract-generator";
import { PaymentHistory } from "@/components/payment-history";
import { ReceiptGenerator } from "@/components/receipt-generator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function TenantDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [paidMonthIndexes, setPaidMonthIndexes] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const { data: tenant, isLoading: tenantLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenants", id],
    enabled: !!id,
  });

  const { data: landlord, isLoading: landlordLoading } = useQuery<Landlord>({
    queryKey: ["/api/landlords", tenant?.landlordId],
    enabled: !!tenant?.landlordId,
  });

  const { data: store } = useQuery<Store>({
    queryKey: ["/api/stores", tenant?.storeId],
    enabled: !!tenant?.storeId,
  });

  // Fetch arrears data
  interface ArrearsData {
    tenantId: string;
    tenantName: string;
    allMonths: Array<{
      monthYear: string;
      date: Date;
      rentAmount: number;
      utilitiesAmount: number;
      totalDue: number;
      isPaid: boolean;
      partiallyPaid: boolean;
      amountPaid: number;
      balance: number;
    }>;
    unpaidMonths: Array<{
      monthYear: string;
      date: Date;
      rentAmount: number;
      utilitiesAmount: number;
      totalDue: number;
      isPaid: boolean;
      partiallyPaid: boolean;
      amountPaid: number;
      balance: number;
    }>;
    totalArrears: number;
    oldestUnpaidMonth: {
      monthYear: string;
      date: Date;
      rentAmount: number;
      utilitiesAmount: number;
      totalDue: number;
      isPaid: boolean;
      partiallyPaid: boolean;
      amountPaid: number;
      balance: number;
    } | null;
  }

  const { data: arrears } = useQuery<ArrearsData>({
    queryKey: ["/api/tenants", id, "arrears"],
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents/tenant", id],
    enabled: !!id,
  });

  // Delete tenant mutation
  const deleteTenantMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/tenants/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Locataire supprimé",
        description: "Le locataire a été supprimé avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de la suppression du locataire.",
        variant: "destructive",
      });
    },
  });

  // Archive tenant mutation (set isActive to false)
  const archiveTenantMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/tenants/${id}/archive`, { isActive: false });
    },
    onSuccess: () => {
      toast({
        title: "Locataire archivé",
        description: "Le locataire a été archivé avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", id] });
      setArchiveDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Échec de l'archivage du locataire.",
        variant: "destructive",
      });
    },
  });

  const getLeaseStatus = (leaseEnd: string) => {
    const endDate = new Date(leaseEnd);
    const today = new Date();
    const daysUntilExpiry = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: "expiré", color: "hsl(0 84% 60%)" };
    } else if (daysUntilExpiry <= 120) {
      return { status: "expire bientôt", color: "hsl(45 93% 47%)" };
    } else {
      return { status: "actif", color: "hsl(142 71% 45%)" };
    }
  };

  if (tenantLoading || landlordLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Skeleton className="h-12 w-48 mb-6" />
          <div className="space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!tenant || !landlord) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Card className="p-6">
            <p className="text-lg text-muted-foreground">Locataire non trouvé</p>
          </Card>
        </div>
      </div>
    );
  }

  const { status, color } = getLeaseStatus(tenant.leaseEnd);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 h-12 text-lg"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour
          </Button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center">
                <Building2 className="w-9 h-9 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground" data-testid="tenant-name">
                  {tenant.tenantName}
                </h1>
                {tenant.businessName && (
                  <p className="text-xl text-muted-foreground" data-testid="business-name">
                    {tenant.businessName}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <Badge 
                className="text-lg px-6 py-3 capitalize"
                style={{ 
                  backgroundColor: color,
                  color: 'white'
                }}
                data-testid="lease-status"
              >
                {status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Tenant Information */}
        <Card className="bg-card rounded-lg shadow-md mb-6">
          <CardHeader className="p-6">
            <CardTitle className="text-2xl font-semibold text-foreground">Informations du Locataire</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tenant.tenantIdCard && (
                <div className="flex items-start gap-3">
                  <User className="w-6 h-6 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-lg text-muted-foreground">Carte d'Identité</p>
                    <p className="text-lg font-medium text-foreground">{tenant.tenantIdCard}</p>
                  </div>
                </div>
              )}

              {tenant.tenantPhone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-6 h-6 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-lg text-muted-foreground">Téléphone</p>
                    <p className="text-lg font-medium text-foreground">{tenant.tenantPhone}</p>
                  </div>
                </div>
              )}

              {tenant.tenantEmail && (
                <div className="flex items-start gap-3">
                  <Mail className="w-6 h-6 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-lg text-muted-foreground">Email</p>
                    <p className="text-lg font-medium text-foreground">{tenant.tenantEmail}</p>
                  </div>
                </div>
              )}

              {tenant.tenantAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-6 h-6 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-lg text-muted-foreground">Adresse</p>
                    <p className="text-lg font-medium text-foreground">{tenant.tenantAddress}</p>
                  </div>
                </div>
              )}

              {tenant.tradePermitNo && (
                <div className="flex items-start gap-3">
                  <FileText className="w-6 h-6 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-lg text-muted-foreground">Permis de Commerce</p>
                    <p className="text-lg font-medium text-foreground">{tenant.tradePermitNo}</p>
                    {tenant.tradePermitExpiry && (
                      <p className="text-lg text-muted-foreground">
                        Expire le {new Date(tenant.tradePermitExpiry).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lease Information */}
        <Card className="bg-card rounded-lg shadow-md mb-6">
          <CardHeader className="p-6">
            <CardTitle className="text-2xl font-semibold text-foreground">Détails du Bail</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Calendar className="w-6 h-6 text-muted-foreground mt-1" />
                <div>
                  <p className="text-lg text-muted-foreground">Période de Location</p>
                  <p className="text-lg font-medium text-foreground">
                    {new Date(tenant.leaseStart).toLocaleDateString('fr-FR')} - {new Date(tenant.leaseEnd).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard className="w-6 h-6 text-muted-foreground mt-1" />
                <div>
                  <p className="text-lg text-muted-foreground">Loyer Mensuel</p>
                  <p className="text-lg font-medium text-foreground">
                    Rs {parseFloat(tenant.monthlyRent.toString()).toLocaleString()}
                  </p>
                </div>
              </div>

              {tenant.utilitiesCharge && parseFloat(tenant.utilitiesCharge.toString()) > 0 && (
                <div className="flex items-start gap-3">
                  <CreditCard className="w-6 h-6 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-lg text-muted-foreground">Frais de Services</p>
                    <p className="text-lg font-medium text-foreground">
                      Rs {parseFloat(tenant.utilitiesCharge.toString()).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {tenant.deposit && parseFloat(tenant.deposit.toString()) > 0 && (
                <div className="flex items-start gap-3">
                  <CreditCard className="w-6 h-6 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-lg text-muted-foreground">Dépôt de Garantie</p>
                    <p className="text-lg font-medium text-foreground">
                      Rs {parseFloat(tenant.deposit.toString()).toLocaleString()}
                    </p>
                    <Badge variant={tenant.depositPaid ? "default" : "secondary"} className="mt-1">
                      {tenant.depositPaid ? "Payé" : "Non Payé"}
                    </Badge>
                  </div>
                </div>
              )}

              {store && (
                <div className="flex items-start gap-3">
                  <Building2 className="w-6 h-6 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-lg text-muted-foreground">Magasin</p>
                    <p className="text-lg font-medium text-foreground">
                      {store.storeNumber} - {store.floor}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <User className="w-6 h-6 text-muted-foreground mt-1" />
                <div>
                  <p className="text-lg text-muted-foreground">Propriétaire</p>
                  <p className="text-lg font-medium text-foreground">{landlord.fullName}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Arrears / Payment Status */}
        {arrears && (
          <Card className="bg-card rounded-lg shadow-md mb-6">
            <CardHeader className="p-6">
              <CardTitle className="text-2xl font-semibold text-foreground flex items-center gap-3">
                {arrears.totalArrears > 0 ? (
                  <>
                    <AlertCircle className="w-7 h-7 text-red-500" />
                    Arriérés de Paiement
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-7 h-7 text-green-500" />
                    Statut de Paiement
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {arrears.totalArrears > 0 ? (
                <div className="space-y-6">
                  {/* Total Arrears Alert */}
                  <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-6 rounded-r-lg">
                    <div className="flex items-start gap-4">
                      <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
                          Montant Total Dû
                        </p>
                        <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                          Rs {arrears.totalArrears.toLocaleString()}
                        </p>
                        <p className="text-lg text-red-600/80 dark:text-red-400/80 mt-2">
                          {arrears.unpaidMonths.length} mois impayé{arrears.unpaidMonths.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Oldest Unpaid Month */}
                  {arrears.oldestUnpaidMonth && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-6 rounded-lg">
                      <p className="text-lg font-semibold text-amber-800 dark:text-amber-400 mb-3">
                        Plus Ancien Mois Impayé
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-base text-muted-foreground">Mois</p>
                          <p className="text-lg font-medium text-foreground">
                            {arrears.oldestUnpaidMonth.monthYear}
                          </p>
                        </div>
                        <div>
                          <p className="text-base text-muted-foreground">Solde Restant</p>
                          <p className="text-lg font-medium text-amber-700 dark:text-amber-400">
                            Rs {arrears.oldestUnpaidMonth.balance.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Unpaid Months Summary - Show ALL with scrolling */}
                  <div>
                    <p className="text-lg font-semibold text-foreground mb-4">
                      Mois Impayés ({arrears.unpaidMonths.length})
                    </p>
                    <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                      {arrears.unpaidMonths.map((month, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-lg font-medium text-foreground">{month.monthYear}</p>
                            {month.partiallyPaid && (
                              <p className="text-base text-amber-600 dark:text-amber-400">
                                Partiellement payé: Rs {month.amountPaid.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                              Rs {month.balance.toLocaleString()}
                            </p>
                            <Button
                              size="sm"
                              variant={paidMonthIndexes.has(index) ? "default" : "outline"}
                              className={`h-12 px-4 min-w-24 ${paidMonthIndexes.has(index) ? 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white border-green-600' : ''}`}
                              data-testid={`button-mark-paid-${index}`}
                              disabled={paidMonthIndexes.has(index)}
                              onClick={() => {
                                // Generate unique receipt number: REC-YYYY-NNNN
                                const year = new Date().getFullYear();
                                const randomNum = Math.floor(1000 + Math.random() * 9000);
                                const receiptNumber = `REC-${year}-${randomNum}`;
                                
                                // Mark as paid shortcut - create full payment
                                const paymentData = {
                                  tenantId: tenant.id,
                                  paymentDate: new Date().toISOString().split('T')[0],
                                  monthYear: month.monthYear,
                                  rentAmount: month.rentAmount.toString(),
                                  utilitiesAmount: month.utilitiesAmount.toString(),
                                  paymentAmount: month.totalDue.toString(),
                                  receivedBy: landlord.fullName,
                                  tdsPaidToMRA: false,
                                  receiptNumber: receiptNumber,
                                };
                                
                                apiRequest("POST", "/api/payments", paymentData)
                                  .then(() => {
                                    // Mark as paid immediately
                                    setPaidMonthIndexes(prev => new Set(prev).add(index));
                                    
                                    toast({
                                      title: "Paiement enregistré",
                                      description: `${month.monthYear} marqué comme payé (${receiptNumber})`,
                                    });
                                    queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/tenants", id, "arrears"] });
                                  })
                                  .catch((error) => {
                                    toast({
                                      title: "Erreur",
                                      description: error.message || "Échec de l'enregistrement",
                                      variant: "destructive",
                                    });
                                  });
                              }}
                            >
                              {paidMonthIndexes.has(index) ? '✓ Payé' : 'Payé'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 dark:bg-green-950/20 border-l-4 border-green-500 p-6 rounded-r-lg">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-lg font-semibold text-green-700 dark:text-green-400 mb-2">
                        Tous les Paiements à Jour
                      </p>
                      <p className="text-lg text-green-600/80 dark:text-green-400/80">
                        Aucun arriéré. Le locataire est à jour dans ses paiements.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        <Card className="bg-card rounded-lg shadow-md mb-6">
          <CardHeader className="p-6">
            <CardTitle className="text-2xl font-semibold text-foreground flex items-center gap-3">
              <FileText className="w-7 h-7" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between gap-4 rounded-lg border p-4"
                    data-testid={`document-${document.id}`}
                  >
                    <div>
                      <p className="text-lg font-semibold text-foreground">{document.documentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {document.fileName} - {document.fileSize || "Demo metadata"}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {document.documentType.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-lg text-muted-foreground">
                No document metadata recorded for this demo tenant.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Contract Generator */}
        <ContractGenerator tenant={tenant} landlord={landlord} store={store} />

        {/* Payment History */}
        <PaymentHistory 
          tenantId={id!} 
          onSelectPayment={(payment) => setSelectedPayment(payment)}
        />
      </div>

      {/* Receipt Generator Dialog */}
      {selectedPayment && (
        <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Reçu de Paiement</DialogTitle>
            </DialogHeader>
            <ReceiptGenerator
              payment={{
                id: parseInt(selectedPayment.id) || 0,
                receiptNumber: selectedPayment.receiptNumber,
                paymentDate: selectedPayment.paymentDate,
                monthYear: selectedPayment.monthYear,
                rentAmount: parseFloat(selectedPayment.rentAmount || '0'),
                utilitiesAmount: parseFloat(selectedPayment.utilitiesAmount || '0'),
                totalAmountDue: parseFloat(selectedPayment.totalAmountDue || '0'),
                paymentAmount: parseFloat(selectedPayment.paymentAmount || '0'),
                landlordAmount: parseFloat(selectedPayment.landlordAmount || '0'),
                balance: parseFloat(selectedPayment.balance || '0'),
                notes: selectedPayment.notes || undefined,
              }}
              tenant={{
                name: tenant.tenantName,
                businessName: tenant.businessName || undefined,
                store: store?.storeNumber || tenant.storeId || '',
              }}
              landlord={{
                name: landlord.fullName,
                address: landlord.address || '',
                phone: landlord.phoneNumber || '',
                signatureUrl: landlord.signatureUrl || undefined,
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archiver le locataire</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir archiver {tenant.tenantName}? Le locataire sera marqué comme inactif mais toutes les données seront conservées.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setArchiveDialogOpen(false)}
              data-testid="button-cancel-archive"
            >
              Annuler
            </Button>
            <Button
              variant="default"
              onClick={() => archiveTenantMutation.mutate()}
              disabled={archiveTenantMutation.isPending}
              data-testid="button-confirm-archive"
            >
              {archiveTenantMutation.isPending ? "Archivage..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le locataire</DialogTitle>
            <DialogDescription>
              ⚠️ Attention: Cette action est irréversible. Êtes-vous sûr de vouloir supprimer définitivement {tenant.tenantName}? Toutes les données associées (paiements, contrats, etc.) seront perdues.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTenantMutation.mutate()}
              disabled={deleteTenantMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteTenantMutation.isPending ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
