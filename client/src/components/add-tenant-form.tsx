import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Building2, CalendarIcon, ChevronRight, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Landlord } from "@shared/schema";

type TenantType = "individual" | "company" | null;

const tenantFormSchema = z.object({
  tenantType: z.enum(["individual", "company"]),
  gender: z.enum(["Mr", "Miss", "Mrs"]).optional(),
  
  // Individual fields
  tenantName: z.string().min(1, "Name is required"),
  dateOfBirth: z.date().optional(),
  tenantAddress: z.string().optional(),
  tenantIdCard: z.string().optional(),
  
  // Company fields
  businessName: z.string().optional(),
  businessRegistrationNumber: z.string().optional(),
  representativeName: z.string().optional(),
  tradePermitNo: z.string().optional(),
  
  // Common fields
  landlordId: z.string().min(1, "Landlord is required"),
  propertyLocation: z.string(),
  commercialPurpose: z.string().min(1, "Business activity is required"),
  monthlyRent: z.string().min(1, "Monthly rent is required"),
  utilitiesCharge: z.string(),
  deposit: z.string().optional(),
  leaseStart: z.date({ required_error: "Lease start date is required" }),
  leaseEnd: z.date({ required_error: "Lease end date is required" }),
}).refine(
  (data) => {
    // Gender is required for individuals
    if (data.tenantType === "individual") {
      return !!data.gender;
    }
    return true;
  },
  {
    message: "Gender is required for individual tenants",
    path: ["gender"],
  }
);

type TenantFormData = z.infer<typeof tenantFormSchema>;

interface AddTenantFormProps {
  onSuccess?: () => void;
}

export function AddTenantForm({ onSuccess }: AddTenantFormProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [tenantType, setTenantType] = useState<TenantType>(null);
  const { toast } = useToast();

  // Fetch landlords for dropdown
  const { data: landlords = [] } = useQuery<Landlord[]>({
    queryKey: ["/api/landlords"],
  });

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      tenantType: "individual",
      gender: undefined,
      tenantName: "",
      dateOfBirth: undefined,
      tenantAddress: "",
      tenantIdCard: "",
      businessName: "",
      businessRegistrationNumber: "",
      representativeName: "",
      tradePermitNo: "",
      landlordId: "",
      propertyLocation: "Moka lieu dit Saint Pierre, suivant titre Vol.4055 No.80",
      commercialPurpose: "",
      monthlyRent: "",
      utilitiesCharge: "200",
      deposit: "",
      leaseStart: undefined,
      leaseEnd: undefined,
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      const payload = {
        tenantType: data.tenantType,
        gender: data.tenantType === "individual" ? data.gender : null,
        landlordId: data.landlordId,
        storeId: null,
        tenantName: data.tenantType === "individual" ? data.tenantName : data.representativeName || data.tenantName,
        businessName: data.tenantType === "company" ? (data.businessName || data.tenantName) : undefined,
        tenantIdCard: data.tenantIdCard,
        tenantAddress: data.tenantAddress,
        tradePermitNo: data.tradePermitNo,
        monthlyRent: data.monthlyRent,
        leaseStart: format(data.leaseStart, "yyyy-MM-dd"),
        leaseEnd: format(data.leaseEnd, "yyyy-MM-dd"),
        utilitiesCharge: data.utilitiesCharge,
        deposit: data.deposit || "0",
        commercialPurpose: data.commercialPurpose,
        premisesAddress: data.propertyLocation,
        isActive: true,
      };

      return await apiRequest("POST", "/api/tenants", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({
        title: "Success!",
        description: "Tenant has been added successfully.",
      });
      form.reset();
      setStep(1);
      setTenantType(null);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add tenant. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTypeSelection = (type: TenantType) => {
    setTenantType(type);
    form.setValue("tenantType", type as "individual" | "company");
    setStep(2);
  };

  const handleNext = async () => {
    let isValid = false;
    
    if (step === 2) {
      // Validate basic info fields
      const fields = tenantType === "individual" 
        ? ["tenantName", "gender", "tenantIdCard", "tenantAddress"] as const
        : ["businessName", "tradePermitNo", "tenantAddress"] as const;
      
      isValid = await form.trigger(fields);
    } else if (step === 3) {
      // Validate lease details
      isValid = await form.trigger(["landlordId", "commercialPurpose"]);
    }
    
    if (isValid) {
      setStep((prev) => Math.min(prev + 1, 4) as 1 | 2 | 3 | 4);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setTenantType(null);
    } else {
      setStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleSubmit = (data: TenantFormData) => {
    createTenantMutation.mutate(data);
  };

  // Step 1: Tenant Type Selection
  if (step === 1) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold" style={{ color: '#555555' }}>
            Add New Tenant
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose tenant type
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div
            className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-[#E6F1EC] active-elevate-2 transition-all duration-200 min-h-32"
            onClick={() => handleTypeSelection("individual")}
            data-testid="card-select-individual"
          >
            <User className="w-16 h-16" style={{ color: '#325A89' }} />
            <div className="text-center">
              <h3 className="text-xl font-semibold" style={{ color: '#555555' }}>
                Individual
              </h3>
              <p className="text-lg text-muted-foreground mt-1">
                Single person tenant
              </p>
            </div>
          </div>

          <div
            className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-[#E6F1EC] active-elevate-2 transition-all duration-200 min-h-32"
            onClick={() => handleTypeSelection("company")}
            data-testid="card-select-company"
          >
            <Building2 className="w-16 h-16" style={{ color: '#325A89' }} />
            <div className="text-center">
              <h3 className="text-xl font-semibold" style={{ color: '#555555' }}>
                Company
              </h3>
              <p className="text-lg text-muted-foreground mt-1">
                Business or corporation
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Steps 2-4: Form with step indicators
  return (
    <div className="p-6">
      {/* Step Indicators */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          {[2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-lg transition-colors ${
                  step >= s
                    ? 'bg-[#325A89] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s - 1}
              </div>
              {s < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 transition-colors ${
                    step > s ? 'bg-[#325A89]' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <h2 className="text-2xl font-semibold" style={{ color: '#555555' }}>
          {step === 2 && 'Basic Information'}
          {step === 3 && 'Lease Details'}
          {step === 4 && 'Financial Terms'}
        </h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Step 2: Basic Information */}
          {step === 2 && (
            <div className="space-y-6">
              {tenantType === "individual" ? (
                <>
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-lg" data-testid="select-gender">
                              <SelectValue placeholder="Select title" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Mr">Mr. (Monsieur)</SelectItem>
                            <SelectItem value="Miss">Miss (Mademoiselle)</SelectItem>
                            <SelectItem value="Mrs">Mrs. (Madame)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tenantName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter full name"
                            className="h-12 text-lg"
                            data-testid="input-tenant-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tenantIdCard"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Card Number *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter ID card number"
                            className="h-12 text-lg"
                            data-testid="input-id-card"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tenantAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter address"
                            className="h-12 text-lg"
                            data-testid="input-tenant-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter company name"
                            className="h-12 text-lg"
                            data-testid="input-company-name"
                            onChange={(e) => {
                              field.onChange(e);
                              form.setValue("tenantName", e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tradePermitNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trade Permit Number *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter trade permit number"
                            className="h-12 text-lg"
                            data-testid="input-trade-permit"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="representativeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Representative Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter representative name"
                            className="h-12 text-lg"
                            data-testid="input-representative-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tenantAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Address *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter company address"
                            className="h-12 text-lg"
                            data-testid="input-company-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>
          )}

          {/* Step 3: Lease Details */}
          {step === 3 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="landlordId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Landlord *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-12 text-lg" data-testid="select-landlord">
                          <SelectValue placeholder="Select landlord" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {landlords.map((landlord) => (
                          <SelectItem key={landlord.id} value={landlord.id}>
                            {landlord.fullName} ({landlord.uniqueRef})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="propertyLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Location</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        readOnly
                        className="h-12 text-lg"
                        data-testid="input-property-location"
                      />
                    </FormControl>
                    <FormDescription>
                      Property location
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="commercialPurpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Activity *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Salon, Spa, Bijouterie"
                        className="h-12 text-lg"
                        data-testid="input-business-activity"
                      />
                    </FormControl>
                    <FormDescription>
                      Type of business (e.g., Salon, Spa, Restaurant)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Step 4: Financial Terms */}
          {step === 4 && (
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="monthlyRent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Rent (Rs) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        placeholder="0"
                        className="h-12 text-lg"
                        data-testid="input-monthly-rent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="utilitiesCharge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Utilities Charge (Rs)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        placeholder="200"
                        className="h-12 text-lg"
                        data-testid="input-utilities-charge"
                      />
                    </FormControl>
                    <FormDescription>Default: Rs 200</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deposit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security Deposit (Rs)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        placeholder="0"
                        className="h-12 text-lg"
                        data-testid="input-deposit"
                      />
                    </FormControl>
                    <FormDescription>Non-refundable first year</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="leaseStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lease Start Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full h-12 justify-start text-left font-normal text-lg"
                              data-testid="button-lease-start"
                            >
                              <CalendarIcon className="mr-2 h-5 w-5" />
                              {field.value ? format(field.value, "dd MMM yyyy") : "Select date"}
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
                      <FormLabel>Lease End Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full h-12 justify-start text-left font-normal text-lg"
                              data-testid="button-lease-end"
                            >
                              <CalendarIcon className="mr-2 h-5 w-5" />
                              {field.value ? format(field.value, "dd MMM yyyy") : "Select date"}
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
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="flex-1 h-14 text-lg"
              data-testid="button-back"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
            
            {step < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex-1 h-14 text-lg font-semibold"
                style={{ backgroundColor: '#325A89' }}
                data-testid="button-next"
              >
                Next
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex-1 h-14 text-lg font-semibold"
                style={{ backgroundColor: '#325A89' }}
                disabled={createTenantMutation.isPending}
                data-testid="button-submit"
              >
                {createTenantMutation.isPending ? "Adding..." : "Create Tenant"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
