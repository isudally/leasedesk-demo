import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import HomePage from "@/pages/home";
import LandlordsPage from "@/pages/landlords";
import StoresPage from "@/pages/stores";
import TenantDetails from "@/pages/tenant-details";
import AllPayments from "@/pages/all-payments";
import AllExpenses from "@/pages/all-expenses";
import NotFound from "@/pages/not-found";
import { Home, Users, Store, Upload } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BulkUpload } from "@/components/bulk-upload";

function BottomNav() {
  const [location] = useLocation();
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  
  const navItems = [
    { path: "/", icon: Home, label: "Home", testId: "nav-home" },
    { path: "/landlords", icon: Users, label: "Landlords", testId: "nav-landlords" },
    { path: "/stores", icon: Store, label: "Stores", testId: "nav-stores" },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50 pb-safe">
        <div className="pt-2 pb-1 text-center border-b border-border/50">
          <p className="text-xs text-muted-foreground">
            LeaseDesk validation demo - fictional data only
          </p>
        </div>
        <div className="grid grid-cols-4 h-20">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <button
                  data-testid={item.testId}
                  className={`flex flex-col items-center justify-center h-full gap-2 transition-colors ${
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-8 w-8" />
                  <span className="text-sm font-semibold">{item.label}</span>
                </button>
              </Link>
            );
          })}
          <button
            data-testid="nav-bulk-upload"
            onClick={() => setBulkUploadDialogOpen(true)}
            className="flex flex-col items-center justify-center h-full gap-2 transition-colors text-muted-foreground hover:text-foreground"
          >
            <Upload className="h-8 w-8" />
            <span className="text-sm font-semibold">Upload</span>
          </button>
        </div>
      </nav>

      <Dialog open={bulkUploadDialogOpen} onOpenChange={setBulkUploadDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Bulk Upload - Import Data from Excel</DialogTitle>
          </DialogHeader>
          <BulkUpload onSuccess={() => setBulkUploadDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Router() {
  return (
    <div className="min-h-screen pb-20 bg-background">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-md">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white/20 rounded flex items-center justify-center text-xl font-bold">
              LD
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold leading-tight">LeaseDesk</span>
              <span className="text-sm opacity-90 leading-tight">Commercial Lease Management</span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>
      
      <main className="pb-4">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/landlords" component={LandlordsPage} />
          <Route path="/stores" component={StoresPage} />
          <Route path="/payments" component={AllPayments} />
          <Route path="/expenses" component={AllExpenses} />
          <Route path="/tenants/:id" component={TenantDetails} />
          <Route component={NotFound} />
        </Switch>
      </main>
      
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
