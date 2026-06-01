import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Entries from "@/pages/entries";
import EntryDetail from "@/pages/entry-detail";
import EntryForm from "@/pages/entry-form";
import ShareView from "@/pages/share-view";
import Square from "@/pages/square";
import PublicEntry from "@/pages/public-entry";
import MyFavorites from "@/pages/my-favorites";
import MyFeed from "@/pages/my-feed";
import Me from "@/pages/me";
import UserProfile from "@/pages/user-profile";
import ComposeNarrative from "@/pages/compose-narrative";
import Pricing from "@/pages/pricing";
import MapPage from "@/pages/map";
import { EntryPrintPage } from "@/pages/entry-print";
import Photos from "@/pages/photos";
import PlanPage from "@/pages/plan";

const queryClient = new QueryClient();

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
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
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
        fetch("/api/me/profile", {
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

function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function AppRouter() {
  return (
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
      <Route path="/entries/:id/print">
        {(params) => <ProtectedRoute component={EntryPrintPage} params={params as { id: string }} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
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
          <ClerkQueryClientCacheInvalidator />
          <AppRouter />
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
