import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Entries from "@/pages/entries";
import EntryDetail from "@/pages/entry-detail";
import EntryForm from "@/pages/entry-form";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/entries" component={Entries} />
      <Route path="/entries/new">
        {() => <EntryForm />}
      </Route>
      <Route path="/entries/:id/edit">
        {(params) => <EntryForm entryId={Number(params.id)} />}
      </Route>
      <Route path="/entries/:id">
        {(params) => <EntryDetail params={params as { id: string }} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
