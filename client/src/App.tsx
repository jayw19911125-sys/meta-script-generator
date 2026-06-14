import { Toaster } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/useMobile";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import MatrixPage from "./pages/MatrixPage";
import HistoryPage from "./pages/HistoryPage";
import AdminPage from "@/pages/AdminPage";
import SettingsPage from "@/pages/Settings";
import NotFound from "./pages/NotFound";
import PWAInstallBanner from "./components/PWAInstallBanner";

export default function App() {
  const isMobile = useIsMobile();
  return (
    <>
      <DashboardLayout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/matrix" component={MatrixPage} />
          <Route path="/history" component={HistoryPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
      <Toaster richColors position={isMobile ? "bottom-center" : "top-right"} />
      {isMobile && <PWAInstallBanner />}
    </>
  );
}
