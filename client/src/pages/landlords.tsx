import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, User, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const landlordFormSchema = z.object({
  uniqueRef: z.string().min(1, "Reference is required"),
  fullName: z.string().min(1, "Full name is required"),
  idCardNumber: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  signatureUrl: z.string().optional(),
});

type LandlordFormData = z.infer<typeof landlordFormSchema>;

export default function LandlordsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLandlord, setEditingLandlord] = useState<any>(null);

  const { data: landlords = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/landlords"],
  });

  const form = useForm<LandlordFormData>({
    resolver: zodResolver(landlordFormSchema),
    defaultValues: {
      uniqueRef: "",
      fullName: "",
      idCardNumber: "",
      address: "",
      phoneNumber: "",
      email: "",
      signatureUrl: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: LandlordFormData) => apiRequest("POST", "/api/landlords", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landlords"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Landlord added successfully",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LandlordFormData> }) =>
      apiRequest("PATCH", `/api/landlords/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landlords"] });
      setDialogOpen(false);
      setEditingLandlord(null);
      form.reset();
      toast({
        title: "Success",
        description: "Landlord updated successfully",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/landlords/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landlords"] });
      toast({
        title: "Success",
        description: "Landlord deleted successfully",
      });
    },
  });

  const handleSubmit = (data: LandlordFormData) => {
    if (editingLandlord) {
      updateMutation.mutate({ id: editingLandlord.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (landlord: any) => {
    setEditingLandlord(landlord);
    form.reset({
      uniqueRef: landlord.uniqueRef,
      fullName: landlord.fullName,
      idCardNumber: landlord.idCardNumber || "",
      address: landlord.address || "",
      phoneNumber: landlord.phoneNumber || "",
      email: landlord.email || "",
      signatureUrl: landlord.signatureUrl || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this landlord?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddNew = () => {
    setEditingLandlord(null);
    form.reset();
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading landlords...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Landlord Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all landlords and their information
          </p>
        </div>
        <Button size="lg" onClick={handleAddNew} data-testid="button-add-landlord">
          <Plus className="h-5 w-5 mr-2" />
          Add Landlord
        </Button>
      </div>

      {landlords.length === 0 ? (
        <Card className="p-12 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Landlords Yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by adding the property owner or landlord entity
          </p>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Landlord
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {landlords.map((landlord) => (
            <Card key={landlord.id} className="p-6 hover-elevate">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {landlord.uniqueRef}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold" data-testid={`landlord-name-${landlord.id}`}>
                    {landlord.fullName}
                  </h3>
                </div>
              </div>

              <div className="space-y-2 text-lg">
                {landlord.idCardNumber && (
                  <div>
                    <span className="text-muted-foreground">ID: </span>
                    {landlord.idCardNumber}
                  </div>
                )}
                {landlord.phoneNumber && (
                  <div>
                    <span className="text-muted-foreground">Phone: </span>
                    {landlord.phoneNumber}
                  </div>
                )}
                {landlord.email && (
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    {landlord.email}
                  </div>
                )}
                {landlord.address && (
                  <div>
                    <span className="text-muted-foreground">Address: </span>
                    {landlord.address}
                  </div>
                )}
                {landlord.signatureUrl && (
                  <div className="pt-2">
                    <span className="text-xs text-muted-foreground">✓ Signature on file</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(landlord)}
                  data-testid={`button-edit-landlord-${landlord.id}`}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLandlord ? "Edit Landlord" : "Add New Landlord"}
            </DialogTitle>
            <DialogDescription>
              {editingLandlord
                ? "Update landlord information"
                : "Add a new property owner or landlord entity"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="uniqueRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unique Reference *</FormLabel>
                    <FormControl>
                      <Input placeholder="LL001" {...field} data-testid="input-unique-ref" />
                    </FormControl>
                    <FormDescription>
                      e.g., LL001, LL002, etc. Must be unique
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Northbridge Property Holdings Ltd" {...field} data-testid="input-full-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="idCardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Card Number</FormLabel>
                    <FormControl>
                      <Input placeholder="A1234567890" {...field} data-testid="input-id-card" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+230 5123 4567" {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="landlord@example.com"
                        {...field}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123 Main Street, Moka"
                        {...field}
                        data-testid="input-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="signatureUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signature (Optional)</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Signature file path"
                          {...field}
                          data-testid="input-signature"
                        />
                        <Button type="button" variant="outline" size="icon">
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload a signature image for contract generation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-save">
                  {editingLandlord ? "Update" : "Add"} Landlord
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
