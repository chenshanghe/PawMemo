import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Sentry, sentryEnabled } from "@/lib/sentry";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect, Link } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageSkeleton } from "@/components/page-skeleton";
import LegalBottomSheet from "@/components/LegalBottomSheet";
import { Onboarding } from "@/components/onboarding";

const NotFound         = lazy(() => import("@/pages/not-found"));
const Landing          = lazy(() => import("@/pages/landing"));
const Home             = lazy(() => import("@/pages/home"));
const Entries          = lazy(() => import("@/pages/entries"));
const EntryDetail      = lazy(() => import("@/pages/entry-detail"));
const EntryForm        = lazy(() => import("@/pages/entry-form"));
const ShareView        = lazy(() => import("@/pages/share-view"));
const Square           = lazy(() => import("@/pages/square"));
const PublicEntry      = lazy(() => import("@/pages/public-entry"));
const MyFavorites      = lazy(() => import("@/pages/my-favorites"));
const MyFeed           = lazy(() => import("@/pages/my-feed"));
const Me               = lazy(() => import("@/pages/me"));
const UserProfile      = lazy(() => import("@/pages/user-profile"));
const ComposeNarrative = lazy(() => import("@/pages/compose-narrative"));
const Pricing          = lazy(() => import("@/pages/pricing"));
const MapPage          = lazy(() => import("@/pages/map"));
const Photos           = lazy(() => import("@/pages/photos"));
const PlanPage         = lazy(() => import("@/pages/plan"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));
const AchievementsPage = lazy(() => import("@/pages/achievements"));
const OrdersPage       = lazy(() => import("@/pages/orders"));
const PlanListPage     = lazy(() => import("@/pages/plan-list"));
const PrivacyPage      = lazy(() => import("@/pages/privacy"));
const TermsPage        = lazy(() => import("@/pages/terms"));
const DownloadsPage    = lazy(() => import("@/pages/downloads"));
const EntryPrintPage   = lazy(() => import("@/pages/entry-print").then(m => ({ default: m.EntryPrintPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.png`,
  },
  variables: {
    colorPrimary: "hsl(11,67%,55%)",
    colorForeground: "hsl(30,20%,25%)",
    colorMutedForeground: "hsl(38,15%,49%)",
    colorDanger: "hsl(0,84%,60%)",
    colorBackground: "hsl(40,40%,98%)",
    colorInput: "hsl(38,32%,86%)",
    colorInputForeground: "hsl(30,20%,25%)",
    colorNeutral: "hsl(38,32%,86%)",
    fontFamily: "'Noto Serif SC', serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-serif",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary hover:text-primary/80",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-green-600",
    alertText: "text-foreground",
    logoBox: "flex justify-center mb-2",
    logoImage: "w-12 h-12",
    socialButtonsBlockButton: "border border-border/60 hover:bg-muted/40",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm",
    formFieldInput: "border-border bg-background text-foreground",
    footerAction: "bg-muted/20",
    dividerLine: "bg-border",
    alert: "border border-border/60",
    otpCodeFieldInput: "border-border",
    formFieldRow: "",
    main: "",
  },
};

// ── API health banner ──────────────────────────────────────────────────────
// Shows a top bar when the API server is unreachable (e.g. during a redeploy).
// Checks every 30 s and on tab-focus; auto-hides when service recovers.
function ApiStatusBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${basePath}/api/healthz`, {
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        setOffline(!res.ok);
      } catch {
        setOffline(true);
      }
    };

    const interval = setInterval(check, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[300] flex items-center justify-center gap-2 bg-amber-500 text-white text-sm py-2 px-4 shadow-md">
      <svg className="w-4 h-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
      </svg>
      <span>网站正在更新升级，功能暂时不可用</span>
      <button
        onClick={() => window.location.reload()}
        className="ml-1 underline underline-offset-2 font-semibold whitespace-nowrap hover:opacity-80 transition-opacity"
      >
        刷新重试
      </button>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;

      // Sync profile to server on sign-in so others can see name/avatar.
      // Best-effort — we don't block on failure.
      if (user) {
        const name =
          user.fullName ||
          user.username ||
          user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
          "旅行者";
        fetch(`${basePath}/api/me/profile`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            avatar: user.imageUrl ?? null,
            email: user.primaryEmailAddress?.emailAddress ?? null,
          }),
        }).catch(() => {});
      }
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component, ...props }: { component: React.ComponentType<any>; [k: string]: any }) {
  return (
    <>
      <Show when="signed-in">
        <Component {...props} />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function LegalLinks({ prefix }: { prefix: string }) {
  const [legalDoc, setLegalDoc] = useState<"terms" | "privacy" | null>(null);
  return (
    <>
      <p className="text-xs text-muted-foreground text-center max-w-xs pb-4">
        {prefix}即表示你已阅读并同意{" "}
        <button
          type="button"
          onClick={() => setLegalDoc("terms")}
          className="text-primary hover:underline"
        >
          《用户服务协议》
        </button>
        {" "}和{" "}
        <button
          type="button"
          onClick={() => setLegalDoc("privacy")}
          className="text-primary hover:underline"
        >
          《隐私政策》
        </button>
      </p>
      <LegalBottomSheet
        open={legalDoc !== null}
        doc={legalDoc}
        onClose={() => setLegalDoc(null)}
      />
    </>
  );
}

function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 gap-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      <LegalLinks prefix="登录" />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-4 gap-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      <LegalLinks prefix="注册" />
    </div>
  );
}

function AppRouter() {
  return (
    <Suspense fallback={<PageSkeleton />}>
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/dashboard">{() => <ProtectedRoute component={Home} />}</Route>
      <Route path="/entries">{() => <ProtectedRoute component={Entries} />}</Route>
      <Route path="/entries/new">{() => <ProtectedRoute component={EntryForm} />}</Route>
      <Route path="/entries/compose">{() => <ProtectedRoute component={ComposeNarrative} />}</Route>
      <Route path="/entries/:id/edit">
        {(params) => <ProtectedRoute component={EntryForm} entryId={Number(params.id)} />}
      </Route>
      <Route path="/entries/:id">
        {(params) => <ProtectedRoute component={EntryDetail} params={params as { id: string }} />}
      </Route>
      <Route path="/share/:token">
        {(params) => <ShareView params={params as { token: string }} />}
      </Route>
      <Route path="/square">{() => <Square />}</Route>
      <Route path="/favorites">{() => <ProtectedRoute component={MyFavorites} />}</Route>
      <Route path="/feed">{() => <ProtectedRoute component={MyFeed} />}</Route>
      <Route path="/me">{() => <ProtectedRoute component={Me} />}</Route>
      <Route path="/users/:userId">
        {(params) => <UserProfile params={params as { userId: string }} />}
      </Route>
      <Route path="/public/:id">
        {(params) => <PublicEntry params={params as { id: string }} />}
      </Route>
      <Route path="/pricing">{() => <ProtectedRoute component={Pricing} />}</Route>
      <Route path="/map">{() => <ProtectedRoute component={MapPage} />}</Route>
      <Route path="/photos">{() => <ProtectedRoute component={Photos} />}</Route>
      <Route path="/plan">{() => <ProtectedRoute component={PlanPage} />}</Route>
      <Route path="/plan/list">{() => <ProtectedRoute component={PlanListPage} />}</Route>
      <Route path="/notifications">{() => <ProtectedRoute component={NotificationsPage} />}</Route>
      <Route path="/achievements">{() => <ProtectedRoute component={AchievementsPage} />}</Route>
      <Route path="/orders">{() => <ProtectedRoute component={OrdersPage} />}</Route>
      <Route path="/entries/:id/print">
        {(params) => <ProtectedRoute component={EntryPrintPage} params={params as { id: string }} />}
      </Route>
      <Route path="/privacy">{() => <PrivacyPage />}</Route>
      <Route path="/terms">{() => <TermsPage />}</Route>
      <Route path="/downloads">{() => <DownloadsPage />}</Route>
      <Route component={NotFound} />
    </Switch>
    </Suspense>
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
      afterSignOutUrl={window.location.origin + (basePath || "/")}
      localization={{
        signIn: {
          start: {
            title: "欢迎回来",
            subtitle: "登录你的旅行日记",
          },
        },
        signUp: {
          start: {
            title: "创建账号",
            subtitle: "开始记录你的旅行故事",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ApiStatusBanner />
          <ClerkQueryClientCacheInvalidator />
          <AppRouter />
          <Onboarding />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function AppInner() {
  return (
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
      </ThemeProvider>
    </HelmetProvider>
  );
}

function App() {
  if (sentryEnabled) {
    return (
      <Sentry.ErrorBoundary fallback={
        <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-4xl">😵</div>
          <p className="text-base font-semibold text-foreground">页面遇到了问题</p>
          <p className="text-sm text-muted-foreground">错误已自动上报，请刷新页面重试</p>
          <button onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            刷新页面
          </button>
        </div>
      }>
        <AppInner />
      </Sentry.ErrorBoundary>
    );
  }
  return <AppInner />;
}

export default App;
