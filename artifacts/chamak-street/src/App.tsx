import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
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
import { useVisitorTracking } from "@/lib/use-visitor-tracking";
import { LoadingScreen } from "@/components/loading-screen";
import { CartFlyProvider } from "@/components/cart-fly-context";
import { WelcomePopup } from "@/components/welcome-popup";
import { AccountProvider } from "@/pages/account/index";
import Home from "@/pages/home";
import Shop from "@/pages/shop";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import OrderConfirmation from "@/pages/order";
import OrderTracking from "@/pages/order-tracking";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products";
import AdminOrders from "@/pages/admin/orders";
import AdminTerms from "@/pages/admin/terms";
import AdminCategories from "@/pages/admin/categories";
import AdminSiteSettings from "@/pages/admin/site-settings";
import AdminReviews from "@/pages/admin/reviews";
import AdminTiktok from "@/pages/admin/tiktok";
import AdminImport from "@/pages/admin/import";
import AdminStockAlerts from "@/pages/admin/stock-alerts";
import AdminSalesReports from "@/pages/admin/sales-reports";
import AdminEvents from "@/pages/admin/events";
import AdminGames from "@/pages/admin/games";
import AdminAbandonedCarts from "@/pages/admin/abandoned-carts";
import AdminRefundRequests from "@/pages/admin/refund-requests";
import AdminProductRequests from "@/pages/admin/product-requests";
import AdminVisitors from "@/pages/admin/visitors";
import AdminLayout from "@/components/admin-layout";
import NotFound from "@/pages/not-found";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Shipping from "@/pages/shipping";
import AccountPage from "@/pages/account/index";
import AccountLogin from "@/pages/account/login";
import AccountRegister from "@/pages/account/register";
import Returns from "@/pages/returns";
import RequestProduct from "@/pages/request-product";
import Games from "@/pages/games";
import GameDetail from "@/pages/game-detail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
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
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/categories" component={AdminCategories} />
        <Route path="/admin/site-settings" component={AdminSiteSettings} />
        <Route path="/admin/reviews" component={AdminReviews} />
        <Route path="/admin/tiktok" component={AdminTiktok} />
        <Route path="/admin/terms" component={AdminTerms} />
        <Route path="/admin/import" component={AdminImport} />
        <Route path="/admin/stock-alerts" component={AdminStockAlerts} />
        <Route path="/admin/sales-reports" component={AdminSalesReports} />
        <Route path="/admin/events" component={AdminEvents} />
        <Route path="/admin/games" component={AdminGames} />
        <Route path="/admin/abandoned-carts" component={AdminAbandonedCarts} />
        <Route path="/admin/refund-requests" component={AdminRefundRequests} />
        <Route path="/admin/product-requests" component={AdminProductRequests} />
        <Route path="/admin/visitors" component={AdminVisitors} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function CustomerLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useMobile();
  useVisitorTracking();
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
            <Route path="/request-product" component={RequestProduct} />
            <Route path="/games" component={Games} />
            <Route path="/games/:id" component={GameDetail} />

            <Route component={NotFound} />
          </Switch>
        </CustomerLayout>
      </Route>
    </Switch>
  );
}

function CustomerOverlays() {
  const isAdmin = window.location.pathname.startsWith(import.meta.env.BASE_URL + "admin") ||
    window.location.pathname.startsWith("/admin");
  if (isAdmin) return null;
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
                <CustomerOverlays />
                <LoadingScreen />
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <ErrorBoundary>
                    <MainRouter />
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
