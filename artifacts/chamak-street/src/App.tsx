import React, { Suspense, lazy, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-context";

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
            background: "#0a0a0a",
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
          <div style={{ fontSize: "48px" }}>⚠</div>
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
              background: "#ff6600",
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
import { useSmoothScroll, ScrollProgressBar } from "@/components/smooth-scroll";
import { LoadingScreen } from "@/components/loading-screen";
import { CartFlyProvider } from "@/components/cart-fly-context";
import { WelcomePopup } from "@/components/welcome-popup";
// AccountProvider kept eager — it's a root context provider
import { AccountProvider } from "@/pages/account/index";
import AccountPage from "@/pages/account/index";

// ── Core customer pages (eagerly loaded — always needed) ──
import Home from "@/pages/home";
import Shop from "@/pages/shop";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import Basics from "@/pages/basics";

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
const BackToSchool = lazy(() => import("@/pages/back-to-school"));
const CustomStorePage = lazy(() => import("@/pages/custom-store-page"));

// ── Admin pages (lazy — customers never load these) ──
import AdminLayout from "@/components/admin-layout";
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
const AdminCoupons = lazy(() => import("@/pages/admin/coupons"));
const AdminOwnerStudio = lazy(() => import("@/pages/admin/owner-studio"));
const StudioAdminPage = lazy(() => import("@/pages/admin/studio-admin-page"));

// ── Suspense fallback ──
function PageSkeleton() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin opacity-50" />
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
        <Route path="/admin/notifications" component={AdminNotificationSettings} />
        <Route path="/admin/abandoned-carts" component={AdminAbandonedCarts} />
        <Route path="/admin/stock-alerts" component={AdminStockAlerts} />
        <Route path="/admin/sales-reports" component={AdminSalesReports} />
        <Route path="/admin/activity" component={AdminActivityLog} />
        <Route path="/admin/chat" component={AdminChat} />
        <Route path="/admin/coupons" component={AdminCoupons} />
        <Route path="/admin/owner-studio" component={AdminOwnerStudio} />
        <Route path="/admin/studio/:slug" component={StudioAdminPage} />

        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function CustomerLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useMobile();
  useVisitorTracking();
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

  // Dynamic SEO title from site settings
  useEffect(() => {
    if (settings.site_title) document.title = settings.site_title;
  }, [settings.site_title]);

  return isMobile ? <MobileLayout>{children}</MobileLayout> : <Layout>{children}</Layout>;
}

function MainRouter() {
  return (
    <Switch>
      <Route path="/admin/*?" component={AdminRouter} />
      <Route path="/login" component={Login} />
      <Route>
        <CustomerLayout>
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
            <Route path="/account" component={AccountPage} />
            <Route path="/account/login" component={AccountLogin} />
            <Route path="/account/register" component={AccountRegister} />
            <Route path="/returns" component={Returns} />
            <Route path="/basics" component={Basics} />
            <Route path="/back-to-school" component={BackToSchool} />
            <Route path="/request-product" component={RequestProduct} />
            <Route path="/games" component={Games} />
            <Route path="/games/:id" component={GameDetail} />
            <Route path="/receipt/:id" component={Receipt} />
            <Route path="/support" component={SupportPage} />
            <Route path="/wishlist" component={WishlistPage} />
            <Route path="/maintenance" component={MaintenancePage} />
            <Route path="/:slug" component={CustomStorePage} />

            <Route component={NotFound} />
          </Switch>
        </CustomerLayout>
      </Route>
    </Switch>
  );
}

/** Boots Lenis + scroll progress bar — rendered once at app root */
function SiteEffects() {
  useSmoothScroll();
  return <ScrollProgressBar />;
}

function CustomerOverlays() {
  const path = window.location.pathname;
  const isAdmin = path.startsWith(import.meta.env.BASE_URL + "admin") || path.startsWith("/admin");
  const isLogin = path.includes("/login");
  if (isAdmin || isLogin) return null;
  return <WelcomePopup />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AccountProvider>
              <CartFlyProvider>
                <SiteEffects />
                <CustomerOverlays />
                <LoadingScreen />
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <ErrorBoundary>
                    <Suspense fallback={<PageSkeleton />}>
                      <MainRouter />
                    </Suspense>
                  </ErrorBoundary>
                </WouterRouter>
                <Toaster />
              </CartFlyProvider>
            </AccountProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
