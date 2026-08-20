import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const storeFormSchema = z.object({
  uniqueRef: z.string().min(1, "Reference is required"),
  storeNumber: z.string().min(1, "Store number is required"),
  floor: z.string().min(1, "Floor is required"),
  size: z.string().optional(),
  features: z.string().optional(),
});

type StoreFormData = z.infer<typeof storeFormSchema>;

export default function StoresPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);

  const { data: stores = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/stores"],
  });

  const form = useForm<StoreFormData>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      uniqueRef: "",
      storeNumber: "",
      floor: "",
      size: "",
      features: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: StoreFormData) => apiRequest("POST", "/api/stores", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Store added successfully",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StoreFormData> }) =>
      apiRequest("PATCH", `/api/stores/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      setDialogOpen(false);
      setEditingStore(null);
      form.reset();
      toast({
        title: "Success",
        description: "Store updated successfully",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/stores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      toast({
        title: "Success",
        description: "Store deleted successfully",
      });
    },
  });

  const handleSubmit = (data: StoreFormData) => {
    if (editingStore) {
      updateMutation.mutate({ id: editingStore.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (store: any) => {
    setEditingStore(store);
    form.reset({
      uniqueRef: store.uniqueRef,
      storeNumber: store.storeNumber,
      floor: store.floor,
      size: store.size || "",
      features: store.features || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this store?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddNew = () => {
    setEditingStore(null);
    form.reset();
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading stores...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Store Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all stores and their details
          </p>
        </div>
        <Button size="lg" onClick={handleAddNew} data-testid="button-add-store">
          <Plus className="h-5 w-5 mr-2" />
          Add Store
        </Button>
      </div>

      {stores.length === 0 ? (
        <Card className="p-12 text-center">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Stores Yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by adding your commercial stores/units
          </p>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Store
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <Card key={store.id} className="p-6 hover-elevate">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {store.uniqueRef}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold" data-testid={`store-name-${store.id}`}>
                    {store.storeNumber}
                  </h3>
                  <p className="text-lg text-muted-foreground">{store.floor}</p>
                </div>
              </div>

              <div className="space-y-2 text-lg">
                {store.size && (
                  <div>
                    <span className="text-muted-foreground">Size: </span>
                    {store.size}
                  </div>
                )}
                {store.features && (
                  <div>
                    <span className="text-muted-foreground">Features: </span>
                    {store.features}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(store)}
                  data-testid={`button-edit-store-${store.id}`}
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
              {editingStore ? "Edit Store" : "Add New Store"}
            </DialogTitle>
            <DialogDescription>
              {editingStore
                ? "Update store information"
                : "Add a new commercial store/unit"}
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
                      <Input placeholder="ST001" {...field} data-testid="input-unique-ref" />
                    </FormControl>
                    <FormDescription>
                      e.g., ST001, ST002, etc. Must be unique
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storeNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store/Unit Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="Shop 1" {...field} data-testid="input-store-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-floor">
                          <SelectValue placeholder="Select floor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Ground Floor">Ground Floor</SelectItem>
                        <SelectItem value="First Floor">First Floor</SelectItem>
                        <SelectItem value="Second Floor">Second Floor</SelectItem>
                        <SelectItem value="Third Floor">Third Floor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="50 sqm" {...field} data-testid="input-size" />
                    </FormControl>
                    <FormDescription>
                      Store size in square meters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="features"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Features (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Corner unit, street facing, parking space..."
                        {...field}
                        data-testid="input-features"
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      Additional details or features of the store
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
                  {editingStore ? "Update" : "Add"} Store
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
