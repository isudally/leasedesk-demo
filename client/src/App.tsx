import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { CreditCard, Home, Receipt, Store, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

interface AuthUser {
  user: {
    id: string;
    username: string;
  };
}

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      setError("");
      await apiRequest("POST", "/api/auth/login", { username, password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: () => {
      setError("Invalid username or password.");
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <img
            src="/brand/leasedesk-endorsed-light.svg"
            alt="LeaseDesk by TAKAVEN"
            className="h-auto w-44"
          />
          <CardTitle className="sr-only">LeaseDesk</CardTitle>
          <CardDescription>Sign in to manage commercial lease operations.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              loginMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home", testId: "nav-home" },
    { path: "/landlords", icon: Users, label: "Landlords", testId: "nav-landlords" },
    { path: "/stores", icon: Store, label: "Units", testId: "nav-stores" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-3 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Link key={item.path} href={item.path}>
              <button
                data-testid={item.testId}
                className={`flex h-full w-full flex-col items-center justify-center gap-1 transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-semibold">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function TopNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Overview", testId: "nav-overview" },
    { path: "/landlords", icon: Users, label: "Landlords", testId: "nav-landlords-desktop" },
    { path: "/stores", icon: Store, label: "Units", testId: "nav-stores-desktop" },
    { path: "/payments", icon: CreditCard, label: "Payments", testId: "nav-payments-desktop" },
    { path: "/expenses", icon: Receipt, label: "Expenses", testId: "nav-expenses-desktop" },
  ];

  return (
    <nav className="hidden md:flex items-center gap-1" aria-label="Primary navigation">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.path;

        return (
          <Link key={item.path} href={item.path}>
            <button
              data-testid={item.testId}
              className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-white text-primary"
                  : "text-primary-foreground/78 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          </Link>
        );
      })}
    </nav>
  );
}

function Router() {
  const { data: auth, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/brand/leasedesk-endorsed-light.svg"
            alt="LeaseDesk by TAKAVEN"
            className="h-auto w-44"
          />
          <p className="text-sm text-muted-foreground">Loading LeaseDesk...</p>
        </div>
      </div>
    );
  }

  if (!auth) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-background">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-sm">
        <div className="flex items-center justify-between gap-4 min-h-16 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/brand/leasedesk-endorsed-dark.svg"
              alt="LeaseDesk by TAKAVEN"
              className="h-auto w-36 shrink-0 sm:w-44"
            />
            <span className="hidden border-l border-white/20 pl-3 text-xs opacity-75 leading-tight lg:inline">
              Commercial property operations
            </span>
          </div>
          <TopNav />
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm opacity-90">{auth.user.username}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              Logout
            </Button>
            <ThemeToggle />
          </div>
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
