import { GlobalStoreProvider } from "@/components/global-store-provider";
import React, { Suspense, lazy, useEffect } from "react";
import RouteSeo from "@/components/route-seo";
import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-context";
import { MotionConfig } from "framer-motion";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#050507",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "16px",
            fontFamily: "monospace",
            color: "rgba(255,255,255,0.6)",
            padding: "32px",
            textAlign: "center",
          }}
        >
          
          <div style={{ fontSize: "20px", fontWeight: 900, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Something went wrong
          </div>
          <div style={{ fontSize: "12px", maxWidth: "480px", lineHeight: 1.6, color: "rgba(255,255,255,0.4)" }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              marginTop: "8px",
              padding: "10px 28px",
              background: "#b79cff",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 900,
              fontSize: "12px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { Layout } from "@/components/layout";
import { MobileLayout } from "@/components/mobile-layout";
import { useMobile } from "@/lib/use-mobile";
import { useSettings } from "@/lib/use-settings";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useVisitorTracking } from "@/lib/use-visitor-tracking";
import { useTrafficTracker } from "@/lib/use-traffic-tracker";
import { LaunchSequence } from "@/components/launch-sequence";
import { CustomerNotificationPrompt } from "@/components/customer-notification-prompt";
import { ScrollProgressBar } from "@/components/smooth-scroll";
import { LoadingScreen } from "@/components/loading-screen";
import { EmergencyShutdownOverlay } from "@/components/emergency-shutdown-overlay";
import { CartFlyProvider } from "@/components/cart-fly-context";
// AccountProvider kept eager — it's a root context provider
import { AccountProvider } from "@/pages/account/index";
import AccountPage from "@/pages/account/index";

// ── Core customer pages (eagerly loaded — always needed) ──
import Home from "@/pages/home";
const Shop = lazy(() => import("@/pages/shop"));
const ProductDetail = lazy(() => import("@/pages/product-detail"));
const Cart = lazy(() => import("@/pages/cart"));
const Checkout = lazy(() => import("@/pages/checkout"));
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
const Basics = lazy(() => import("@/pages/basics"));

// ── Secondary customer pages (lazy — only loaded when visited) ──
const SupportPage = lazy(() => import("@/pages/support"));
const OrderConfirmation = lazy(() => import("@/pages/order"));
const OrderTracking = lazy(() => import("@/pages/order-tracking"));
const Terms = lazy(() => import("@/pages/terms"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Shipping = lazy(() => import("@/pages/shipping"));
const AccountLogin = lazy(() => import("@/pages/account/login"));
const AccountRegister = lazy(() => import("@/pages/account/register"));
const Returns = lazy(() => import("@/pages/returns"));
const RequestProduct = lazy(() => import("@/pages/request-product"));
const Games = lazy(() => import("@/pages/games"));
const GameDetail = lazy(() => import("@/pages/game-detail"));
const Receipt = lazy(() => import("@/pages/receipt"));
const WishlistPage = lazy(() => import("@/pages/wishlist"));
const MaintenancePage = lazy(() => import("@/pages/maintenance"));
const AboutPage = lazy(() => import("@/pages/about"));
const ManagedContent = lazy(() => import("@/pages/managed-content"));
const ContentManagement = lazy(() => import("@/pages/admin/content-management"));

// ── Admin pages (lazy — customers never load these) ──
const AdminInvite = lazy(() => import("@/pages/admin-invite"));
const AdminMovieSetup = lazy(() => import("@/pages/admin/movie-setup"));
const AdminLayout = lazy(() => import("@/components/admin-layout"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminProducts = lazy(() => import("@/pages/admin/products"));
const AdminBasics = lazy(() => import("@/pages/admin/basics"));
const AdminOrders = lazy(() => import("@/pages/admin/orders"));
const AdminTerms = lazy(() => import("@/pages/admin/terms"));
const AdminCategories = lazy(() => import("@/pages/admin/categories"));
const AdminSiteSettings = lazy(() => import("@/pages/admin/site-settings"));
const AdminReviews = lazy(() => import("@/pages/admin/reviews"));
const AdminTiktok = lazy(() => import("@/pages/admin/tiktok"));
const AdminEvents = lazy(() => import("@/pages/admin/events"));
const AdminGames = lazy(() => import("@/pages/admin/games"));
const AdminRefundRequests = lazy(() => import("@/pages/admin/refund-requests"));
const AdminProductRequests = lazy(() => import("@/pages/admin/product-requests"));
const AdminVisitors = lazy(() => import("@/pages/admin/visitors"));
const AdminNotificationSettings = lazy(() => import("@/pages/admin/notification-settings"));
const AdminAbandonedCarts = lazy(() => import("@/pages/admin/abandoned-carts"));
const AdminStockAlerts = lazy(() => import("@/pages/admin/stock-alerts"));
const AdminSalesReports = lazy(() => import("@/pages/admin/sales-reports"));
const AdminChat = lazy(() => import("@/pages/admin/chat"));
const AdminActivityLog = lazy(() => import("@/pages/admin/activity-log"));
const AdminGlobalSwitch = lazy(() => import("@/pages/admin/global-store").then((m) => ({ default: m.GlobalSwitchPage })));
const AdminPaymentMethods = lazy(() => import("@/pages/admin/global-store").then((m) => ({ default: m.PaymentMethodsPage })));
const InstallGuide = lazy(() => import("@/pages/install-guide"));
const AdminLiveTraffic = lazy(() => import("@/pages/admin/live-traffic"));
const AdminCustomerNotifications = lazy(() => import("@/pages/admin/customer-notifications"));
const AdminCoupons = lazy(() => import("@/pages/admin/coupons"));

// ── Suspense fallback ──
function PageSkeleton() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-3 px-6" aria-label="Loading"><div className="glass-skeleton h-4 w-2/3 rounded" /><div className="glass-skeleton h-4 w-full rounded" /><div className="glass-skeleton h-4 w-1/2 rounded" /></div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 3 * 60_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

function AdminRouter() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/movie-setup" component={AdminMovieSetup} />
        <Route path="/admin/products" component={AdminProducts} />
        <Route path="/admin/basics" component={AdminBasics} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/categories" component={AdminCategories} />
        <Route path="/admin/site-settings" component={AdminSiteSettings} />
        <Route path="/admin/reviews" component={AdminReviews} />
        <Route path="/admin/tiktok" component={AdminTiktok} />
        <Route path="/admin/terms" component={AdminTerms} />
        <Route path="/admin/events" component={AdminEvents} />
        <Route path="/admin/games" component={AdminGames} />
        <Route path="/admin/refund-requests" component={AdminRefundRequests} />
        <Route path="/admin/product-requests" component={AdminProductRequests} />
        <Route path="/admin/visitors" component={AdminVisitors} />
        <Route path="/admin/global-switch" component={AdminGlobalSwitch} />
        <Route path="/admin/payment-methods" component={AdminPaymentMethods} />
        <Route path="/admin/live-traffic" component={AdminLiveTraffic} />
        <Route path="/admin/customer-notifications" component={AdminCustomerNotifications} />
        <Route path="/admin/notifications" component={AdminNotificationSettings} />
        <Route path="/admin/abandoned-carts" component={AdminAbandonedCarts} />
        <Route path="/admin/stock-alerts" component={AdminStockAlerts} />
        <Route path="/admin/sales-reports" component={AdminSalesReports} />
        <Route path="/admin/activity" component={AdminActivityLog} />
        <Route path="/admin/chat" component={AdminChat} />
        <Route path="/admin/coupons" component={AdminCoupons} />
        <Route path="/admin/discount-codes" component={AdminCoupons} />
        <Route path="/admin/manage/countries"><Redirect to="/admin/global-switch" /></Route>
        <Route path="/admin/manage/:kind" component={ContentManagement} />

        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function CustomerLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useMobile();
  useVisitorTracking();
  useTrafficTracker();
  const settings = useSettings();
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 60_000 } });
  const [location, navigate] = useLocation();

  // Maintenance gate — auto-redirect non-admin visitors when maintenance mode is on
  useEffect(() => {
    if (
      settings.maintenance_mode === "true" &&
      !user?.isAdmin &&
      location !== "/maintenance"
    ) {
      navigate("/maintenance");
    }
  }, [settings.maintenance_mode, user?.isAdmin, location]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>
    {location!=="/maintenance"&&settings.maintenance_mode!=="true"&&<LaunchSequence />}
    {isMobile ? <MobileLayout>{children}</MobileLayout> : <Layout>{children}</Layout>}
  </>;
}

function MainRouter() {
  return (
    <Switch>
      <Route path="/admin/join" component={AdminInvite} />
      <Route path="/admin/*?" component={AdminRouter} />
      <Route path="/login" component={Login} />
      <Route>
        <CustomerLayout>
          <CustomerNotificationPrompt />
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/shop" component={Shop} />
            <Route path="/product/:id" component={ProductDetail} />
            <Route path="/cart" component={Cart} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/order/:id" component={OrderConfirmation} />
            <Route path="/order-tracking" component={OrderTracking} />
            <Route path="/terms" component={Terms} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/shipping" component={Shipping} />
            <Route path="/about" component={AboutPage} />
            <Route path="/account" component={AccountPage} />
            <Route path="/account/login" component={AccountLogin} />
            <Route path="/account/register" component={AccountRegister} />
            <Route path="/returns" component={Returns} />
            <Route path="/basics" component={Basics} />
            <Route path="/request-product" component={RequestProduct} />
            <Route path="/games" component={Games} />
            <Route path="/games/:id" component={GameDetail} />
            <Route path="/receipt/:id" component={Receipt} />
            <Route path="/support" component={SupportPage} />
            <Route path="/news" component={ManagedContent} />
            <Route path="/news/:slug" component={ManagedContent} />
            <Route path="/wishlist" component={WishlistPage} />
            <Route path="/install" component={InstallGuide} />
            <Route path="/maintenance" component={MaintenancePage} />
            <Route path="/:slug" component={ManagedContent} />

            <Route component={NotFound} />
          </Switch>
        </CustomerLayout>
      </Route>
    </Switch>
  );
}

function InitialRouteReadySignal() {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      (window as Window & { __firstpickRouteReady?: boolean }).__firstpickRouteReady = true;
      window.dispatchEvent(new Event("firstpick:route-ready"));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return null;
}

/** Lightweight native scroll progress, rendered once at the app root. */
function SiteEffects() {
  return <ScrollProgressBar />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <MotionConfig reducedMotion="user">
          <TooltipProvider>
            <GlobalStoreProvider><AccountProvider>
              <CartFlyProvider>
                <SiteEffects />
                <LoadingScreen />
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <RouteSeo />
                  <EmergencyShutdownOverlay />
                  <ErrorBoundary>
                    <Suspense fallback={<PageSkeleton />}>
                      <MainRouter />
                      <InitialRouteReadySignal />
                    </Suspense>
                  </ErrorBoundary>
                </WouterRouter>
                <Toaster />
              </CartFlyProvider>
            </AccountProvider></GlobalStoreProvider>
          </TooltipProvider>
          </MotionConfig>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
