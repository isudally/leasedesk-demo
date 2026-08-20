import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Expense, Store as StoreType } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Filter, Receipt, DollarSign, X, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

export default function AllExpenses() {
  const [, navigate] = useLocation();
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: expenses, isLoading: isLoadingExpenses } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: stores } = useQuery<StoreType[]>({
    queryKey: ["/api/stores"],
  });

  // Generate unique months, years, and categories from expense data
  const filtersData = expenses?.reduce((acc, expense) => {
    const date = new Date(expense.expenseDate);
    const month = format(date, "MMMM");
    const year = format(date, "yyyy");
    const category = expense.category;
    
    if (!acc.months.includes(month)) {
      acc.months.push(month);
    }
    if (!acc.years.includes(year)) {
      acc.years.push(year);
    }
    if (!acc.categories.includes(category)) {
      acc.categories.push(category);
    }
    return acc;
  }, { months: [] as string[], years: [] as string[], categories: [] as string[] }) || 
    { months: [], years: [], categories: [] };

  // Sort years in descending order
  const sortedYears = filtersData.years.sort((a, b) => parseInt(b) - parseInt(a));

  // Filter expenses by selected month, year, and category
  const filteredExpenses = expenses?.filter(expense => {
    const date = new Date(expense.expenseDate);
    const month = format(date, "MMMM");
    const year = format(date, "yyyy");

    const matchesMonth = selectedMonth === "all" || month === selectedMonth;
    const matchesYear = selectedYear === "all" || year === selectedYear;
    const matchesCategory = selectedCategory === "all" || expense.category === selectedCategory;

    return matchesMonth && matchesYear && matchesCategory;
  }) || [];

  // Calculate totals for filtered expenses
  const totalExpensesAmount = filteredExpenses.reduce((sum, e) => 
    sum + parseFloat(e.amount.toString()), 0
  );

  const getStoreName = (storeId: string | null) => {
    if (!storeId) return "Building-wide";
    const store = stores?.find(s => s.id === storeId);
    return store?.storeNumber || "Unknown Store";
  };

  const getCategoryLabel = (category: string, otherText?: string | null) => {
    if (category === "other" && otherText) {
      return otherText;
    }
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      maintenance: "#3B82F6", // blue
      utilities: "#10B981", // green
      repairs: "#EF4444", // red
      cleaning: "#8B5CF6", // purple
      other: "#6B7280", // gray
    };
    return colors[category] || "#6B7280";
  };

  const clearFilters = () => {
    setSelectedMonth("all");
    setSelectedYear("all");
    setSelectedCategory("all");
  };

  const hasActiveFilters = selectedMonth !== "all" || selectedYear !== "all" || selectedCategory !== "all";

  if (isLoadingExpenses) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 -ml-3"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">
                All Expenses
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                View and filter expense history
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="w-5 h-5" />
                Filter Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Month
                  </label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="h-12 text-base" data-testid="select-month">
                      <SelectValue placeholder="All months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All months</SelectItem>
                      {["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"].map(month => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Year
                  </label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="h-12 text-base" data-testid="select-year">
                      <SelectValue placeholder="All years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All years</SelectItem>
                      {sortedYears.map(year => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Category
                  </label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-12 text-base" data-testid="select-category">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {filtersData.categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {getCategoryLabel(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasActiveFilters && (
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="h-12 w-full"
                      data-testid="button-clear-filters"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>

              {/* Filter Summary */}
              {hasActiveFilters && (
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Showing:</span>
                  {selectedMonth !== "all" && (
                    <Badge variant="secondary" className="text-base">
                      {selectedMonth}
                    </Badge>
                  )}
                  {selectedYear !== "all" && (
                    <Badge variant="secondary" className="text-base">
                      {selectedYear}
                    </Badge>
                  )}
                  {selectedCategory !== "all" && (
                    <Badge variant="secondary" className="text-base">
                      {getCategoryLabel(selectedCategory)}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="mb-6" style={{ backgroundColor: '#FEF3C7' }}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base text-muted-foreground mb-1">
                    {hasActiveFilters ? 'Filtered' : 'Total'} Expenses
                  </p>
                  <p className="text-3xl font-bold" style={{ color: '#D97706' }}>
                    Rs {totalExpensesAmount.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base text-muted-foreground mb-1">
                    Expense Count
                  </p>
                  <p className="text-3xl font-bold" style={{ color: '#D97706' }}>
                    {filteredExpenses.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expenses List */}
        <div className="space-y-4">
          {filteredExpenses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Receipt className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl text-muted-foreground">
                  {hasActiveFilters ? 'No expenses found for the selected filters' : 'No expenses recorded yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredExpenses
              .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
              .map((expense) => {
                const expenseDate = new Date(expense.expenseDate);

                return (
                  <Card 
                    key={expense.id} 
                    className="hover-elevate"
                    data-testid={`expense-card-${expense.id}`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Receipt className="w-5 h-5 text-muted-foreground" />
                            <h3 className="text-lg font-semibold text-foreground">
                              {expense.description}
                            </h3>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground ml-8">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {format(expenseDate, "MMMM d, yyyy")}
                            </div>
                            <Badge 
                              variant="outline" 
                              className="text-sm"
                              style={{ 
                                borderColor: getCategoryColor(expense.category),
                                color: getCategoryColor(expense.category)
                              }}
                            >
                              {getCategoryLabel(expense.category, expense.otherCategoryText)}
                            </Badge>
                            <Badge 
                              variant={expense.expenseType === "building-wide" ? "secondary" : "outline"}
                              className="text-sm"
                            >
                              {expense.expenseType === "building-wide" ? "Building-wide" : "Store-specific"}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground mb-1">Amount</p>
                            <p className="text-2xl font-bold" style={{ color: '#EF4444' }}>
                              Rs {parseFloat(expense.amount.toString()).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        {expense.paidBy && (
                          <div>
                            <p className="text-muted-foreground">Paid By</p>
                            <p className="font-semibold">{expense.paidBy}</p>
                          </div>
                        )}
                        {expense.storeId && (
                          <div>
                            <p className="text-muted-foreground">Store</p>
                            <p className="font-semibold flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {getStoreName(expense.storeId)}
                            </p>
                          </div>
                        )}
                        {expense.splitMethod && expense.expenseType === "building-wide" && (
                          <div>
                            <p className="text-muted-foreground">Split Method</p>
                            <p className="font-semibold">
                              {expense.splitMethod === "equal" ? "Equal Split" : 
                               expense.splitMethod === "by_rent" ? "By Rent Ratio" : "N/A"}
                            </p>
                          </div>
                        )}
                      </div>

                      {expense.notes && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Notes:</span> {expense.notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}
