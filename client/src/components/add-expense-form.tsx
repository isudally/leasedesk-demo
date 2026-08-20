import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarIcon, FileText, DollarSign, Tag, LayoutList, Store as StoreIcon, Percent, StickyNote, Wrench, Zap, Hammer, Shield, Sparkles, ShieldCheck, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import type { Store } from "@shared/schema";

const expenseFormSchema = z.object({
  paidBy: z.string().min(1, "Please select who paid for this expense"),
  expenseDate: z.date({ required_error: "Date is required" }),
  description: z.string().min(3, "Description must be at least 3 characters"),
  amount: z.string().min(1, "Amount is required"),
  category: z.string().min(1, "Category is required"),
  otherCategoryText: z.string().optional(),
  expenseType: z.enum(["store-specific", "building-wide"]),
  storeId: z.string().optional(),
  splitMethod: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.expenseType === "store-specific") {
      return !!data.storeId;
    }
    return true;
  },
  {
    message: "Store is required for store-specific expenses",
    path: ["storeId"],
  }
).refine(
  (data) => {
    if (data.expenseType === "building-wide") {
      return !!data.splitMethod;
    }
    return true;
  },
  {
    message: "Split method is required for building-wide expenses",
    path: ["splitMethod"],
  }
).refine(
  (data) => {
    if (data.category === "other") {
      return !!data.otherCategoryText && data.otherCategoryText.trim().length > 0;
    }
    return true;
  },
  {
    message: "Please specify the category when selecting 'Other'",
    path: ["otherCategoryText"],
  }
);

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface AddExpenseFormProps {
  onSuccess?: () => void;
}

export function AddExpenseForm({ onSuccess }: AddExpenseFormProps) {
  const { toast } = useToast();

  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ["/api/stores"],
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      paidBy: "",
      expenseDate: new Date(),
      description: "",
      amount: "",
      category: "",
      otherCategoryText: "",
      expenseType: "building-wide",
      splitMethod: "equal",
      notes: "",
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          expenseDate: format(data.expenseDate, "yyyy-MM-dd"),
          storeId: data.expenseType === "store-specific" ? data.storeId : null,
          splitMethod: data.expenseType === "building-wide" ? data.splitMethod : null,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to record expense");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Success",
        description: "Expense recorded successfully",
      });
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    addExpenseMutation.mutate(data);
  };

  // Watch expenseType and category to show/hide conditional fields
  const expenseType = form.watch("expenseType");
  const category = form.watch("category");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Expense Date */}
        <FormField
          control={form.control}
          name="expenseDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Date de dépense / Expense Date
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className="h-12 text-lg justify-start"
                      data-testid="button-expense-date"
                    >
                      <CalendarIcon className="mr-2 h-5 w-5" />
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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

        {/* Paid By */}
        <FormField
          control={form.control}
          name="paidBy"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Payé par / Paid by *</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="h-12 text-lg" data-testid="select-paid-by">
                    <SelectValue placeholder="Sélectionner qui a payé" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Demo Manager">Demo Manager</SelectItem>
                  <SelectItem value="Property Owner">Property Owner</SelectItem>
                  <SelectItem value="Bookkeeper">Bookkeeper</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Description
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Ex: Réparation plomberie / Plumbing repair"
                  className="h-12 text-lg"
                  data-testid="input-expense-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Montant (Rs) / Amount (Rs)
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="h-12 text-lg"
                  data-testid="input-expense-amount"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Catégorie / Category
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-12 text-lg" data-testid="select-expense-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="maintenance">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      <span>Maintenance / Entretien</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="utilities">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      <span>Utilities / Services</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="repairs">
                    <div className="flex items-center gap-2">
                      <Hammer className="h-4 w-4" />
                      <span>Repairs / Réparations</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cleaning">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>Cleaning / Nettoyage</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2">
                      <MoreHorizontal className="h-4 w-4" />
                      <span>Other / Autre</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Other Category Text - shows only when category is "other" */}
        {category === "other" && (
          <FormField
            control={form.control}
            name="otherCategoryText"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Spécifier la catégorie / Specify Category *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ex: Taxes, Legal fees, etc."
                    className="h-12 text-lg"
                    data-testid="input-other-category-text"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Expense Type */}
        <FormField
          control={form.control}
          name="expenseType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg flex items-center gap-2">
                <LayoutList className="h-5 w-5" />
                Type de dépense / Expense Type *
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="h-12 text-lg" data-testid="select-expense-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="building-wide" data-testid="option-building-wide">Building-Wide / Tout l'immeuble</SelectItem>
                  <SelectItem value="store-specific" data-testid="option-store-specific">Store-Specific / Magasin spécifique</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Store Selection (only for store-specific) */}
        {expenseType === "store-specific" && (
          <FormField
            control={form.control}
            name="storeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg flex items-center gap-2">
                  <StoreIcon className="h-5 w-5" />
                  Magasin / Store *
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 text-lg" data-testid="select-store">
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id} data-testid={`option-store-${store.id}`}>
                        {store.storeNumber} - {store.floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Split Method (only for building-wide) */}
        {expenseType === "building-wide" && (
          <FormField
            control={form.control}
            name="splitMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Méthode de répartition / Split Method *
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 text-lg" data-testid="select-split-method">
                      <SelectValue placeholder="Select split method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="equal" data-testid="option-equal">Equal / Égal</SelectItem>
                    <SelectItem value="by_rent" data-testid="option-by-rent">By Rent / Selon loyer</SelectItem>
                    <SelectItem value="n/a" data-testid="option-na">N/A</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Notes (optional)
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Additional notes..."
                  className="text-lg min-h-[100px]"
                  data-testid="input-expense-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full h-14 text-lg"
          disabled={addExpenseMutation.isPending}
          data-testid="button-submit-expense"
        >
          {addExpenseMutation.isPending ? "Enregistrement..." : "Enregistrer la dépense / Record Expense"}
        </Button>
      </form>
    </Form>
  );
}
