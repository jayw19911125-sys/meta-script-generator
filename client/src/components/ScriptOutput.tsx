import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, CheckCircle2 } from "lucide-react";
import { Streamdown } from "streamdown";

interface ScriptOutputProps {
  content: string;
}

export default function ScriptOutput({ content }: ScriptOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary pulse-dot" />
          <span className="text-sm font-medium font-[family-name:var(--font-display)]">
            模組化矩陣輸出
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs">
          {copied ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-primary" /> 已複製
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1" /> 複製全部
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[600px] overflow-y-auto bg-background">
        <div className="prose prose-invert prose-sm max-w-none
          prose-headings:font-[family-name:var(--font-display)]
          prose-headings:text-foreground
          prose-h2:text-primary prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-4
          prose-h3:text-accent prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3
          prose-h4:text-foreground prose-h4:text-sm prose-h4:mt-4 prose-h4:mb-2
          prose-p:text-foreground/90 prose-p:leading-relaxed
          prose-li:text-foreground/90
          prose-strong:text-primary
          prose-code:text-accent prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-table:border-border
          prose-th:text-primary prose-th:border-border prose-th:bg-muted
          prose-td:border-border
        ">
          <Streamdown>{content}</Streamdown>
        </div>
      </div>
    </div>
  );
}
