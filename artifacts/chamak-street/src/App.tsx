import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Layout } from "@/components/layout";
import { LoadingScreen } from "@/components/loading-screen";
import { EventPopup } from "@/components/event-popup";
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
import AdminGames from "@/pages/admin/games";
import AdminEvents from "@/pages/admin/events";
import AdminStockAlerts from "@/pages/admin/stock-alerts";
import AdminSalesReports from "@/pages/admin/sales-reports";
import AdminProductRequests from "@/pages/admin/product-requests";
import AdminRefundRequests from "@/pages/admin/refund-requests";
import AdminAbandonedCarts from "@/pages/admin/abandoned-carts";
import AdminLayout from "@/components/admin-layout";
import NotFound from "@/pages/not-found";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Shipping from "@/pages/shipping";
import GamesPage from "@/pages/games";
import GameDetail from "@/pages/game-detail";
import RequestProduct from "@/pages/request-product";
import Returns from "@/pages/returns";
import AccountPage from "@/pages/account/index";
import AccountLogin from "@/pages/account/login";
import AccountRegister from "@/pages/account/register";

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
        <Route path="/admin/games" component={AdminGames} />
        <Route path="/admin/events" component={AdminEvents} />
        <Route path="/admin/stock-alerts" component={AdminStockAlerts} />
        <Route path="/admin/sales-reports" component={AdminSalesReports} />
        <Route path="/admin/product-requests" component={AdminProductRequests} />
        <Route path="/admin/refund-requests" component={AdminRefundRequests} />
        <Route path="/admin/abandoned-carts" component={AdminAbandonedCarts} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function MainRouter() {
  return (
    <Switch>
      <Route path="/admin/*?" component={AdminRouter} />
      <Route path="/login" component={Login} />
      <Route>
        <Layout>
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
            <Route path="/games" component={GamesPage} />
            <Route path="/games/:id" component={GameDetail} />
            <Route path="/request-product" component={RequestProduct} />
            <Route path="/returns" component={Returns} />
            <Route path="/account" component={AccountPage} />
            <Route path="/account/login" component={AccountLogin} />
            <Route path="/account/register" component={AccountRegister} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function CustomerOverlays() {
  const isAdmin = window.location.pathname.startsWith(import.meta.env.BASE_URL + "admin") ||
    window.location.pathname.startsWith("/admin");
  if (isAdmin) return null;
  return (
    <>
      <EventPopup />
      <WelcomePopup />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AccountProvider>
          <CartFlyProvider>
            <CustomerOverlays />
            <LoadingScreen />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <MainRouter />
            </WouterRouter>
            <Toaster />
          </CartFlyProvider>
        </AccountProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
