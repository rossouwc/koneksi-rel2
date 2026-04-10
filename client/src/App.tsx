import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { EstateProvider } from "@/lib/estate-context";
import { PortalProvider, usePortal } from "@/lib/portal-context";
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
import SupplierMarketplacePage from "@/pages/supplier-marketplace";
import MarketplacePage from "@/pages/marketplace";
import JoinEstatePage from "@/pages/join-estate";
import MaintPage from "@/pages/maint";
import PendingApprovalPage from "@/pages/pending-approval";
import PendingEstateApprovalPage from "@/pages/pending-estate-approval";
import JoinProviderPage from "@/pages/join-provider";
import NotFound from "@/pages/not-found";
import { Skeleton } from "@/components/ui/skeleton";
import { useEstate } from "@/lib/estate-context";
import type { Estate } from "@shared/schema";

function SupplierRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/supplier"); }, [setLocation]);
  return null;
}

function SupplierRoutes() {
  return (
    <SupplierLayout>
      <Switch>
        <Route path="/supplier" component={SupplierPortalPage} />
        <Route path="/supplier/profile" component={SupplierProfilePage} />
        <Route path="/supplier/calendar" component={SupplierCalendarPage} />
        <Route path="/supplier/bookings" component={SupplierBookingsPage} />
        <Route path="/supplier/marketplace" component={SupplierMarketplacePage} />
        <Route path="/supplier/analytics" component={SupplierAnalyticsPage} />
        <Route path="/supplier/billing" component={SupplierBillingPage} />
        <Route component={SupplierRedirect} />
      </Switch>
    </SupplierLayout>
  );
}

function EstateRoutes() {
  const { user } = useAuth();
  const { estates, approvedEstates, isLoading: estatesLoading } = useEstate();

  if (estatesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl gradient-teal animate-pulse" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  const hasApprovedEstate = estates.some((e) => e.approvalStatus === "approved" && e.memberApprovalStatus === "approved");

  if (user?.role === "estate_admin" && !hasApprovedEstate) {
    return <PendingEstateApprovalPage estates={estates} />;
  }

  return (
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
        <Route path="/maint" component={MaintPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function DualRoleApp() {
  const { portalMode } = usePortal();

  if (portalMode === "supplier") {
    return <SupplierRoutes />;
  }

  return <EstateRoutes />;
}

function DualRoleWrapper() {
  const { data: userEstates = [], isLoading } = useQuery<Estate[]>({
    queryKey: ["/api/estates"],
  });

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

  const hasEstates = userEstates.length > 0;
  const initialPath = window.location.pathname;
  const defaultMode = initialPath.startsWith("/supplier") || !hasEstates ? "supplier" as const : "estate" as const;

  if (!hasEstates) {
    return (
      <PortalProvider isDualRole={false} defaultMode="supplier">
        <SupplierRoutes />
      </PortalProvider>
    );
  }

  return (
    <PortalProvider isDualRole={true} defaultMode={defaultMode}>
      <EstateProvider>
        <DualRoleApp />
      </EstateProvider>
    </PortalProvider>
  );
}

function ResidentApp() {
  return (
    <PortalProvider isDualRole={false} defaultMode="estate">
      <EstateProvider>
        <EstateRoutes />
      </EstateProvider>
    </PortalProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (location.startsWith("/join-provider")) {
    return <JoinProviderPage />;
  }

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
    return <DualRoleWrapper />;
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
