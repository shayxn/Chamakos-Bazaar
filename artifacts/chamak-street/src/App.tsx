import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import Shop from "@/pages/shop";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import OrderConfirmation from "@/pages/order";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products";
import AdminOrders from "@/pages/admin/orders";
import AdminLayout from "@/components/admin-layout";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// REQUIRED — copy verbatim per clerk-auth skill
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — empty in dev (intentional), auto-set in prod
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#ff6600",
    colorForeground: "#f5f5f5",
    colorMutedForeground: "#888888",
    colorDanger: "#ef4444",
    colorBackground: "#111111",
    colorInput: "#1a1a1a",
    colorInputForeground: "#f5f5f5",
    colorNeutral: "#333333",
    fontFamily: "'Inter', 'system-ui', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#111111] rounded-xl w-[440px] max-w-full overflow-hidden border border-[#2a2a2a] shadow-[0_0_60px_rgba(255,102,0,0.12)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white font-black uppercase tracking-wide",
    headerSubtitle: "text-[#888] text-sm",
    socialButtonsBlockButtonText: "text-[#f5f5f5] font-semibold",
    socialButtonsBlockButton: "!bg-[#1a1a1a] !border-[#2a2a2a] hover:!bg-[#222] transition-colors",
    formFieldLabel: "text-[#aaa] text-xs uppercase tracking-widest font-bold",
    formFieldInput: "!bg-[#1a1a1a] !border-[#333] !text-white focus:!border-[#ff6600] focus:!ring-[#ff6600]",
    formButtonPrimary: "!bg-gradient-to-r !from-[#ff6600] !to-[#ffcc00] !border-0 !text-black font-black uppercase tracking-widest hover:!opacity-90 transition-opacity",
    footerActionLink: "!text-[#ff6600] hover:!text-[#ffcc00] font-bold",
    footerActionText: "!text-[#888]",
    footerAction: "!bg-transparent",
    dividerText: "!text-[#555]",
    dividerLine: "!bg-[#2a2a2a]",
    logoBox: "flex justify-center py-2",
    logoImage: "h-12 object-contain",
    identityPreviewEditButton: "!text-[#ff6600]",
    formFieldSuccessText: "!text-green-400",
    alertText: "!text-[#f5f5f5]",
    alert: "!bg-[#1a1a1a] !border-[#333]",
    otpCodeFieldInput: "!bg-[#1a1a1a] !border-[#333] !text-white",
    formFieldRow: "gap-3",
    main: "gap-5",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(255,102,0,0.06), transparent 65%)" }} />
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(255,102,0,0.06), transparent 65%)" }} />
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

// Invalidate react-query cache on Clerk user change
function ClerkQueryCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prevId.current !== undefined && prevId.current !== id) {
        qc.clear();
      }
      prevId.current = id;
    });
  }, [addListener, qc]);

  return null;
}

function AdminRouter() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/products" component={AdminProducts} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function MainRouter() {
  return (
    <>
      <ClerkQueryCacheInvalidator />
      <Switch>
        <Route path="/admin/*?" component={AdminRouter} />
        <Route path="/login" component={Login} />
        {/* REQUIRED — /*? wildcard matches OAuth sub-paths */}
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route>
          <Layout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/shop" component={Shop} />
              <Route path="/product/:id" component={ProductDetail} />
              <Route path="/cart" component={Cart} />
              <Route path="/checkout" component={Checkout} />
              <Route path="/order/:id" component={OrderConfirmation} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Route>
      </Switch>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={`${basePath}/`}
      signUpFallbackRedirectUrl={`${basePath}/`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to your Chamak Street account",
            actionText: "No account?",
            actionLink: "Sign up",
          },
        },
        signUp: {
          start: {
            title: "Join the Drop",
            subtitle: "Create your Chamak Street account",
            actionText: "Already a member?",
            actionLink: "Sign in",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MainRouter />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
