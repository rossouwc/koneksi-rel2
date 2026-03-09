import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { EstateProvider } from "@/lib/estate-context";
import Layout from "@/components/layout";
import AuthPage from "@/pages/auth";
import ProfileSetupPage from "@/pages/profile-setup";
import Dashboard from "@/pages/dashboard";
import BillsPage from "@/pages/bills";
import OutagesPage from "@/pages/outages";
import ProvidersPage from "@/pages/providers";
import AdminPage from "@/pages/admin";
import AlertsPage from "@/pages/alerts";
import BillAnalyzerPage from "@/pages/bill-analyzer";
import JoinEstatePage from "@/pages/join-estate";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl gradient-teal animate-pulse" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (!user.profileComplete) {
    return <ProfileSetupPage />;
  }

  return (
    <EstateProvider>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/bills" component={BillsPage} />
          <Route path="/outages" component={OutagesPage} />
          <Route path="/providers" component={ProvidersPage} />
          <Route path="/alerts" component={AlertsPage} />
          <Route path="/bill-analyzer" component={BillAnalyzerPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/join-estate" component={JoinEstatePage} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </EstateProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
