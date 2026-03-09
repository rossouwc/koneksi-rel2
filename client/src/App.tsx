import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { EstateProvider } from "@/lib/estate-context";
import { OfflineBanner } from "@/components/offline-banner";
import Layout from "@/components/layout";
import SupplierLayout from "@/components/supplier-layout";
import AuthPage from "@/pages/auth";
import ProfileSetupPage from "@/pages/profile-setup";
import Dashboard from "@/pages/dashboard";
import BillsPage from "@/pages/bills";
import OutagesPage from "@/pages/outages";
import ProvidersPage from "@/pages/providers";
import AdminPage from "@/pages/admin";
import AlertsPage from "@/pages/alerts";
import BillAnalyzerPage from "@/pages/bill-analyzer";
import SupplierPortalPage from "@/pages/supplier-portal";
import SupplierProfilePage from "@/pages/supplier-profile";
import SupplierCalendarPage from "@/pages/supplier-calendar";
import SupplierBookingsPage from "@/pages/supplier-bookings";
import SupplierAnalyticsPage from "@/pages/supplier-analytics";
import SupplierBillingPage from "@/pages/supplier-billing";
import MarketplacePage from "@/pages/marketplace";
import JoinEstatePage from "@/pages/join-estate";
import PendingApprovalPage from "@/pages/pending-approval";
import ResidentOnlyPage from "@/pages/resident-only";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";

function SupplierApp() {
  return (
    <SupplierLayout>
      <Switch>
        <Route path="/supplier" component={SupplierPortalPage} />
        <Route path="/supplier/profile" component={SupplierProfilePage} />
        <Route path="/supplier/calendar" component={SupplierCalendarPage} />
        <Route path="/supplier/bookings" component={SupplierBookingsPage} />
        <Route path="/supplier/analytics" component={SupplierAnalyticsPage} />
        <Route path="/supplier/billing" component={SupplierBillingPage} />
        <Route component={ResidentOnlyPage} />
      </Switch>
    </SupplierLayout>
  );
}

function ResidentApp() {
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
          <Route path="/marketplace" component={MarketplacePage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/join-estate" component={JoinEstatePage} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </EstateProvider>
  );
}

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

  if (user.role === "supplier" && user.approvalStatus === "pending") {
    return <PendingApprovalPage />;
  }

  if (!user.profileComplete) {
    return <ProfileSetupPage />;
  }

  if (user.role === "supplier") {
    return <SupplierApp />;
  }

  return <ResidentApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <OfflineBanner />
            <AppContent />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
