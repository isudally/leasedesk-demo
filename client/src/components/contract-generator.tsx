import { useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tenant, Landlord, Store } from "@shared/schema";

interface ContractGeneratorProps {
  tenant: Tenant;
  landlord: Landlord;
  store?: Store;
}

export function ContractGenerator({ tenant, landlord, store }: ContractGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Get French title based on gender (LANDLORD)
  const getLandlordTitle = (): string => {
    const titleMap: { [key: string]: string } = {
      'Mr': 'Monsieur',
      'Miss': 'Mademoiselle',
      'Mrs': 'Madame'
    };
    return titleMap[landlord.gender || 'Mr'] || 'Monsieur';
  };

  // Get gender-appropriate adjective for landlord (soussigné/soussignée)
  const getLandlordAdjective = (): string => {
    // For landlords: masculine for Mr, feminine for Miss/Mrs
    return (landlord.gender === 'Mr') ? 'soussigné' : 'soussignée';
  };

  // Get landlord reference with proper French grammar
  const getLandlordReference = (options: { capitalize?: boolean; preposition?: 'a' | 'de' | null; article?: boolean } = {}): string => {
    const { capitalize = false, preposition = null, article = true } = options;
    const adjective = getLandlordAdjective();
    const isMasculine = (adjective === 'soussigné');
    
    let result = '';
    
    if (preposition === 'a') {
      result = isMasculine ? `au ${adjective}` : `à la ${adjective}`;
    } else if (preposition === 'de') {
      result = isMasculine ? `du ${adjective}` : `de la ${adjective}`;
    } else {
      if (article) {
        const articleWord = isMasculine ? 'le' : 'la';
        result = `${articleWord} ${adjective}`;
      } else {
        result = adjective;
      }
    }
    
    if (capitalize) {
      return result.charAt(0).toUpperCase() + result.slice(1);
    }
    return result;
  };

  // Get French title based on gender (TENANT)
  const getTenantTitle = (): string => {
    if (tenant.tenantType === 'company') {
      return 'La société';
    }
    
    // For individuals, use gender-specific titles
    const titleMap: { [key: string]: string } = {
      'Mr': 'Monsieur',
      'Miss': 'Mademoiselle',
      'Mrs': 'Madame'
    };
    return titleMap[tenant.gender || 'Mr'] || 'Monsieur';
  };

  // Get gender-appropriate adjective (soussigné/soussignée)
  const getTenantAdjective = (): string => {
    if (tenant.tenantType === 'company') {
      return 'soussignée'; // Companies are feminine in French (la société)
    }
    
    // For individuals, masculine for Mr, feminine for Miss/Mrs
    return (tenant.gender === 'Mr') ? 'soussigné' : 'soussignée';
  };

  // Get tenant reference with proper French grammar (handles contractions)
  // preposition: 'a' (à), 'de' (de), or null (no preposition)
  const getTenantReference = (options: { capitalize?: boolean; preposition?: 'a' | 'de' | null } = {}): string => {
    const { capitalize = false, preposition = null } = options;
    const adjective = getTenantAdjective();
    const isMasculine = (adjective === 'soussigné');
    
    let result = '';
    
    if (preposition === 'a') {
      // à + le = au, à + la = à la
      result = isMasculine ? `au ${adjective}` : `à la ${adjective}`;
    } else if (preposition === 'de') {
      // de + le = du, de + la = de la
      result = isMasculine ? `du ${adjective}` : `de la ${adjective}`;
    } else {
      // No preposition, use article
      const article = isMasculine ? 'le' : 'la';
      result = `${article} ${adjective}`;
    }
    
    if (capitalize) {
      return result.charAt(0).toUpperCase() + result.slice(1);
    }
    return result;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Convert date to traditional French legal format (words in uppercase)
  const formatDateLegal = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    const dayWords: { [key: number]: string } = {
      1: 'PREMIER', 2: 'DEUX', 3: 'TROIS', 4: 'QUATRE', 5: 'CINQ',
      6: 'SIX', 7: 'SEPT', 8: 'HUIT', 9: 'NEUF', 10: 'DIX',
      11: 'ONZE', 12: 'DOUZE', 13: 'TREIZE', 14: 'QUATORZE', 15: 'QUINZE',
      16: 'SEIZE', 17: 'DIX-SEPT', 18: 'DIX-HUIT', 19: 'DIX-NEUF', 20: 'VINGT',
      21: 'VINGT ET UN', 22: 'VINGT-DEUX', 23: 'VINGT-TROIS', 24: 'VINGT-QUATRE', 25: 'VINGT-CINQ',
      26: 'VINGT-SIX', 27: 'VINGT-SEPT', 28: 'VINGT-HUIT', 29: 'VINGT-NEUF', 30: 'TRENTE',
      31: 'TRENTE ET UN'
    };

    const monthWords = [
      'JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
      'JUILLET', 'AOUT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE'
    ];

    const yearWords = (year: number): string => {
      const numberWords: { [key: number]: string } = {
        0: 'ZERO', 1: 'UN', 2: 'DEUX', 3: 'TROIS', 4: 'QUATRE', 5: 'CINQ',
        6: 'SIX', 7: 'SEPT', 8: 'HUIT', 9: 'NEUF', 10: 'DIX',
        11: 'ONZE', 12: 'DOUZE', 13: 'TREIZE', 14: 'QUATORZE', 15: 'QUINZE',
        16: 'SEIZE', 17: 'DIX-SEPT', 18: 'DIX-HUIT', 19: 'DIX-NEUF',
        20: 'VINGT', 30: 'TRENTE', 40: 'QUARANTE', 50: 'CINQUANTE',
        60: 'SOIXANTE', 70: 'SOIXANTE-DIX', 80: 'QUATRE-VINGTS', 90: 'QUATRE-VINGT-DIX'
      };
      
      const thousands = Math.floor(year / 1000);
      const hundreds = Math.floor((year % 1000) / 100);
      const lastTwoDigits = year % 100;
      
      let result = thousands === 2 ? 'DEUX MILLE' : 'MILLE';
      
      if (hundreds > 0) {
        if (hundreds === 1) {
          result += ' CENT';
        } else {
          result += ' ' + numberWords[hundreds] + ' CENT';
        }
      }
      
      if (lastTwoDigits > 0) {
        if (lastTwoDigits <= 20) {
          result += ' ' + numberWords[lastTwoDigits];
        } else {
          const tens = Math.floor(lastTwoDigits / 10) * 10;
          const ones = lastTwoDigits % 10;
          
          if (tens === 70 || tens === 90) {
            const base = tens === 70 ? 60 : 80;
            const addition = lastTwoDigits - base;
            if (addition <= 20) {
              const baseName = base === 80 && ones > 0 ? 'QUATRE-VINGT' : numberWords[base];
              result += ' ' + baseName + '-' + numberWords[addition];
            } else {
              result += ' ' + numberWords[base] + '-DIX';
            }
          } else if (tens === 80 && ones === 0) {
            result += ' QUATRE-VINGTS';
          } else if (tens === 80 && ones > 0) {
            result += ' QUATRE-VINGT-' + numberWords[ones];
          } else if (ones === 0) {
            result += ' ' + numberWords[tens];
          } else if (ones === 1 && tens !== 80 && tens !== 90) {
            result += ' ' + numberWords[tens] + ' ET UN';
          } else {
            result += ' ' + numberWords[tens] + '-' + numberWords[ones];
          }
        }
      }
      
      return result;
    };

    return `${dayWords[day]} ${monthWords[month]} DE L'AN ${yearWords(year)}`;
  };

  // Shared PDF generation logic - creates complete contract with all 17 clauses (traditional Mauritian format)
  const buildContractPDF = async (): Promise<jsPDF> => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);
    let yPosition = 20;
    
    // Load landlord signature if available
    let landlordSignatureData: string | null = null;
    if (landlord.signatureUrl) {
      try {
        const response = await fetch(landlord.signatureUrl);
        const blob = await response.blob();
        landlordSignatureData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.warn('Failed to load landlord signature:', error);
      }
    }

    // Helper to add text with word wrap
    const addText = (text: string, size: number = 11, isBold: boolean = false, align: 'left' | 'center' = 'left') => {
      doc.setFontSize(size);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      
      if (align === 'center') {
        const lines = doc.splitTextToSize(text, contentWidth);
        lines.forEach((line: string) => {
          const textWidth = doc.getTextWidth(line);
          doc.text(line, (pageWidth - textWidth) / 2, yPosition);
          yPosition += size * 0.5;
        });
      } else {
        const lines = doc.splitTextToSize(text, contentWidth);
        lines.forEach((line: string) => {
          doc.text(line, margin, yPosition);
          yPosition += size * 0.5;
        });
      }
      yPosition += 2;
    };

    const addSpace = (space: number = 5) => {
      yPosition += space;
    };

    // Header (Traditional Mauritian format)
    addText('ENTRE LES SOUSSIGNES:-', 12, true);
    addSpace(8);

    // Landlord (Bailleur) - "soussignée d'une part" style
    const landlordTitle = getLandlordTitle();
    const landlordAdjectiveUpper = getLandlordAdjective().toUpperCase();
    addText(`     ${landlordTitle} ${landlord.fullName.toUpperCase()}, majeur, demeurant a ${landlord.address || 'Grande Retraite Bon Accueil'}, detenteur d'une carte d'identite Nationale portant le No. ${landlord.idCardNumber || 'XXX'}.-`);
    addSpace(8);
    addText(`${landlordAdjectiveUpper} D'UNE PART`, 12, true, 'center');
    addSpace(8);

    // Tenant (Preneur) - "soussigné d'autre part" style
    const tenantTitle = getTenantTitle();
    const tenantAdjective = getTenantAdjective();
    const tenantAddressUpper = tenant.tenantAddress ? tenant.tenantAddress.toUpperCase() : 'XXX';
    
    if (tenant.tenantType === 'company') {
      // Company format
      const companyName = (tenant.businessName || tenant.tenantName).toUpperCase();
      const permitNo = tenant.tradePermitNo || 'XXX';
      const representative = tenant.tenantName ? `, representée par ${tenant.tenantName.toUpperCase()}` : '';
      
      addText(`     ${tenantTitle} ${companyName}${representative}, titulaire du permis de commerce No. ${permitNo}, située à ${tenantAddressUpper}.-`);
    } else {
      // Individual format
      const tenantIdUpper = tenant.tenantIdCard || 'XXX';
      addText(`     ${tenantTitle} ${tenant.tenantName.toUpperCase()}, majeur ${tenant.tenantIdCard ? `detenteur d'une carte d'identite Nationale portant le No. ${tenantIdUpper}` : ''}, demeurant a ${tenantAddressUpper}.-`);
    }
    
    addSpace(8);
    addText(`${tenantAdjective.toUpperCase()} D'AUTRE PART`, 12, true, 'center');
    addSpace(8);

    // Contract opening
    addText('    IL A ETE DIT ARRETE ET CONVENU CE QUI SUIT:-', 11);
    addSpace(5);

    const rentAmount = parseFloat(tenant.monthlyRent.toString()).toLocaleString();
    const utilitiesAmount = tenant.utilitiesCharge ? parseFloat(tenant.utilitiesCharge.toString()).toLocaleString() : '200';
    const depositAmount = tenant.deposit ? parseFloat(tenant.deposit.toString()).toLocaleString() : '0';
    const purpose = tenant.commercialPurpose || 'USAGE COMMERCIAL';
    const storeNumber = store ? store.storeNumber : 'le dit magasin';

    // Clause 1: Propriété du bâtiment
    addText(`    1.    ${getLandlordReference({ capitalize: true })} d\'une part est proprietaire d\'un batiment commerciales de onze complexes, situe a Moka lieu dit Saint Pierre, suivant titre enregistre et transcrit au Vol.4055 No.80.-`);
    addSpace(5);

    // Clause 2: Objet de la location
    addText(`    2.    ${getLandlordReference({ capitalize: true })} d\'une part loue a bail par ces presentes ${getTenantReference({ preposition: 'a' })} d\'autre part qui l\'accepte le dite magasin qui sera utiliser par ${getTenantReference()} d\'autre part comme un ${purpose.toUpperCase()} seulement.`);
    addSpace(5);

    // Clause 3: Description du local
    addText('    3.    Le dite magasin est en blocs de ciment sous dalles et toilette en commun, et les installations pour l\'eau et l\'electricite y existent.');
    addSpace(5);

    // Clause 4: Durée
    const startDate = formatDateLegal(tenant.leaseStart);
    const endDate = formatDateLegal(tenant.leaseEnd);
    addText(`     4.   Le present bail est fait pour une periode d\'un an a commencer du ${startDate} pour prendre fin le ${endDate}.`);
    addSpace(5);

    // Clause 5: Factures et frais de nettoyage
    addText(`    5. ${getTenantReference({ capitalize: true })} d\'autre part s\'engage et s\'oblige a payer le facture d\'eau et d\'electricite regulierement, et ${utilitiesAmount} roupies pour chaque fin du mois pour le nettoyage du batiment commerciale, couloirs et des toilettes. ${getTenantReference({ capitalize: true })} sera aussi responsable de l\'evacuation des eaux usees.`);
    addSpace(5);

    // Clause 6: Loyer mensuel avec pénalité
    addText(`     6. Le present bail est fait et moyennant un loyer mensuel de ${rentAmount.toUpperCase()} ROUPIES, payable au plus tard le 1 de chaque mois courant. Si ${getTenantReference()} ne rembourse pas un loyer mensuel a la date convenue, des interets penaux de 10% seront applicable sur le montant dû.`);
    addSpace(5);

    // Clause 7: Entretien
    addText(`     7.   ${getTenantReference({ capitalize: true })}   d\'autre  part   s\'engage  a bien entretenir le dit batiment commerciale et magasin a la satisfaction ${getLandlordReference({ preposition: 'de' })} d\'une part qui pourra le visiter ou le faire visiter quand bon lui semblera.`);
    addSpace(5);

    // Check if we need a new page
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    // Clause 8: Risques
    addText(`     8.   ${getTenantReference({ capitalize: true })} d\'autre part prendra charge tous les risques telles que incendies, vol cas fortuity ou force majeur etc.`);
    addSpace(5);

    // Clause 9: Renouvellement
    addText('     9.   Le present bail pourra etre renouveler      a   son expiration par le consentement mutuel des parties.');
    addSpace(5);

    // Clause 10: Sous-location interdite
    addText(`     10. ${getTenantReference({ capitalize: true })} d\'autre part n\'as pas le droit de sous louer ou de ceder le dite emplacement commerciale a des tierces personnes sans le consentement expres et ce par ecrit ${getLandlordReference({ preposition: 'de', article: false })} d\'une part.`);
    addSpace(5);

    // Clause 11: Evacuation sans formalité
    addText(`     11. A l\'expiration du dit bail en cas de non renouvellement ${getTenantReference()} d\'autre part s\'engage a evacuer les lieux et ce sans aucune formalite judiciare ou extra judiciare.`);
    addSpace(5);

    // Clause 12: Résiliation pour défaut
    addText(`     12. Qu\'a defaut par ${getTenantReference()} d\'autre part d\'executer fidelement l\'une quelconque des conditions ce dessus stipules ou de payer regulierement a ses acheances ci dessus fixee le loyer moyennant lequel le present bail est consenti et ce huit jours après le service d\'une simple "Mise en Demeure" d\'executer ou de payer selon le casle present bail sera resilie de plein droit sans qu\'il soit necessaire   de   recourir  a   l\'accomplissement   d\'autres formalites judiciares ou extra judiciares a cet effet.`);
    addSpace(5);

    // Clause 13: Vente de la propriété
    addText('     13. Si la propriete est vendue le locataire doive evacuer dans le delai de trois mois, sans aucune actions judiciares.');
    addSpace(5);

    // Check if we need a new page
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    // Clause 14: Procédure d'éviction
    addText(`     14. A l\'expiration du dit bail en cas de non renouvellement ${getTenantReference()} d\'autre part s\'engage a evacuer les lieux et ce sans aucune formalite judiciare ou extra judiciare a defaut de quoi ${getLandlordReference()} d\'une part pourra faire une demande au Juge en Chambre pour obtenir un "Write Habere Facias Possessionem" ordonnant ${getTenantReference({ preposition: 'a' })} d\'autre part d\'evacuer les lieux immediatement et ceci aux frais ${getTenantReference({ preposition: 'de' })} d\'autre part.`);
    addSpace(5);

    // Clause 15: Délai de trois mois
    addText(`     15. ${getTenantReference({ capitalize: true })} d\'autre part doit donner un delai de trois mois payant en cas de depart.`);
    addSpace(5);

    // Clause 16: Avaloir (dépôt non remboursable)
    if (depositAmount !== '0') {
      addText(`     16. La somme de ${depositAmount.toUpperCase()} ROUPIES a ete payee comme avaloir et celle ci est non renboursable en cas de   rupture  de   contrat   pendant   la  première  année. Alternativement, cette somme sera deductible en lieu du trois mois de préavis exigé en cas de depart.`);
    } else {
      addText('     16. Aucun depot n\'est exige pour ce bail.');
    }
    addSpace(5);

    // Clause 17: Local tax handling excluded from validation demo
    addText('    17.   Les taxes locales applicables sont traitees separement du loyer mensuel.');
    addSpace(8);

    // Closing and signatures
    const today = new Date();
    const todayFormatted = formatDateLegal(today.toISOString()).replace('DE L\'AN', 'DE L\'AN');
    
    addText(`Faite en double et en bonne foi. Ce ${todayFormatted}.`);
    addSpace(10);

    // Check if we need a new page for signatures
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    // Signature lines
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const sigLeftX = margin + 20;
    const sigRightX = pageWidth - margin - 80;
    
    doc.text('……………………………….', sigLeftX, yPosition);
    doc.text('…………………………………', sigRightX, yPosition);
    yPosition += 5;
    
    doc.text(`${landlordAdjectiveUpper} D'UNE PART`, sigLeftX, yPosition);
    doc.text(`${tenantAdjective.toUpperCase()} D'AUTRE PART`, sigRightX, yPosition);
    
    yPosition += 10;
    
    // Add landlord signature if available
    if (landlordSignatureData) {
      try {
        doc.addImage(landlordSignatureData, 'PNG', sigLeftX, yPosition, 50, 15);
      } catch (error) {
        console.warn('Failed to add signature image:', error);
      }
    }

    // Add demo footer at bottom of last page
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    const footerText = 'Document generated via LeaseDesk validation demo | Fictional data';
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 10);
    doc.setTextColor(0, 0, 0);

    return doc;
  };

  const generateContractPDF = async () => {
    setIsGenerating(true);
    
    try {
      const doc = await buildContractPDF();
      
      // Save PDF
      const fileName = `Contrat_${tenant.businessName || tenant.tenantName}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "Contrat généré",
        description: "Le contrat PDF a été téléchargé avec succès.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le contrat PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const shareViaWhatsApp = async () => {
    setIsGenerating(true);
    
    try {
      // Generate complete PDF using shared logic
      const doc = await buildContractPDF();
      const pdfBlob = doc.output('blob');
      const fileName = `Contrat_${tenant.businessName || tenant.tenantName}_${new Date().toISOString().split('T')[0]}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      const rentAmount = parseFloat(tenant.monthlyRent.toString()).toLocaleString();
      const text = `Commercial lease demo - ${tenant.businessName || tenant.tenantName}\nRent: Rs ${rentAmount}/month\nPeriod: ${formatDate(tenant.leaseStart)} - ${formatDate(tenant.leaseEnd)}\nValidation-demo document`;
      
      // Check if Web Share API is supported with file sharing
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Contrat de Location',
            text: text,
            files: [file],
          });
          
          toast({
            title: "Partagé avec succès",
            description: "Le contrat a été partagé via WhatsApp.",
          });
        } catch (shareError: any) {
          // User cancelled or share failed
          if (shareError.name !== 'AbortError') {
            console.error('Share failed:', shareError);
            toast({
              title: "Erreur de partage",
              description: "Impossible de partager le fichier. Utilisez le bouton de téléchargement.",
              variant: "destructive",
            });
          }
        }
      } else {
        // Fallback: Open WhatsApp Web with text only
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
        
        toast({
          title: "WhatsApp ouvert",
          description: "Veuillez télécharger le PDF séparément et le joindre dans WhatsApp.",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Erreur",
        description: "Impossible de partager le contrat.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="bg-card rounded-lg shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">Contrat de Location</h3>
            <p className="text-lg text-muted-foreground">Générer le contrat en PDF</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Button
            onClick={generateContractPDF}
            disabled={isGenerating}
            className="h-14 text-lg"
            data-testid="button-generate-contract"
          >
            <Download className="w-6 h-6 mr-2" />
            {isGenerating ? "Génération..." : "Télécharger le Contrat"}
          </Button>

          <Button
            onClick={shareViaWhatsApp}
            disabled={isGenerating}
            variant="outline"
            className="h-14 text-lg"
            data-testid="button-share-contract"
          >
            <Share2 className="w-6 h-6 mr-2" />
            {isGenerating ? "Partage..." : "Partager via WhatsApp"}
          </Button>
        </div>

        <div className="mt-6 p-4 bg-accent/10 rounded-lg">
          <p className="text-lg text-muted-foreground">
            Le contrat inclut toutes les 17 clauses requises par la législation mauricienne 
            (format juridique traditionnel) avec les signatures du bailleur et du preneur.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
