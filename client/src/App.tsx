import { Toaster } from "@/components/ui/sonner";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import MatrixPage from "./pages/MatrixPage";
import HistoryPage from "./pages/HistoryPage";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <>
      <DashboardLayout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/matrix" component={MatrixPage} />
          <Route path="/history" component={HistoryPage} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
      <Toaster richColors position="top-right" />
    </>
  );
}
