import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm mx-4 border-border bg-card">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-5">
            <div className="w-10 h-10 rounded border border-destructive/30 bg-destructive/8 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
          </div>

          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">404 not found</p>
          <h1 className="text-base font-semibold text-foreground mb-2">找不到此頁面</h1>
          <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
            此頁面不存在或已被移除。
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoHome}
              size="sm"
              className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/80"
            >
              <Home className="w-3.5 h-3.5 mr-1.5" />
              返回首頁
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
