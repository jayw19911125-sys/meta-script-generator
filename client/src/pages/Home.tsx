import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Target, Film, Sparkles, Copy, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import ScriptOutput from "@/components/ScriptOutput";

const INDUSTRIES = [
  { value: "ecommerce", label: "電商（服飾/配件）" },
  { value: "beauty", label: "美妝保養" },
  { value: "food", label: "餐飲" },
  { value: "fitness", label: "健身/保健" },
  { value: "education", label: "教育/課程" },
  { value: "realestate", label: "房地產/室內設計" },
  { value: "saas", label: "SaaS/工具" },
  { value: "local", label: "本地服務" },
];

const FUNNELS = [
  { value: "tofu", label: "TOFU（冷受眾 - 喚醒問題）" },
  { value: "mofu", label: "MOFU（溫受眾 - 差異化）" },
  { value: "bofu", label: "BOFU（熱受眾 - 臨門一腳）" },
];

const DURATIONS = [
  { value: "15", label: "15 秒" },
  { value: "20", label: "20 秒" },
  { value: "25", label: "25 秒" },
  { value: "30", label: "30 秒" },
  { value: "45", label: "45 秒" },
];

const APPEARANCES = [
  { value: "person", label: "真人出鏡" },
  { value: "hands", label: "只露手" },
  { value: "voiceover", label: "不露臉旁白" },
  { value: "multi", label: "多人" },
];

const TONES = [
  { value: "professional", label: "專業" },
  { value: "friendly", label: "親切" },
  { value: "humorous", label: "幽默" },
  { value: "urgent", label: "急迫" },
  { value: "storytelling", label: "故事感" },
];

interface FormData {
  industry: string;
  productName: string;
  sellingPoints: string;
  targetAudience: string;
  funnel: string;
  duration: string;
  appearance: string;
  tone: string;
  apiKey: string;
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    industry: "",
    productName: "",
    sellingPoints: "",
    targetAudience: "",
    funnel: "",
    duration: "",
    appearance: "",
    tone: "",
    apiKey: "",
  });

  const updateForm = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const isStep1Valid = formData.industry && formData.productName && formData.sellingPoints;
  const isStep2Valid = formData.targetAudience && formData.funnel && formData.duration;
  const isStep3Valid = formData.appearance && formData.tone;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedScript(null);

    const prompt = buildPrompt(formData);

    try {
      const apiKey = formData.apiKey || localStorage.getItem("meta_script_api_key") || "";
      if (apiKey) {
        localStorage.setItem("meta_script_api_key", apiKey);
      }

      if (!apiKey) {
        setGeneratedScript("⚠️ 請在設定中輸入 API Key 後再生成。");
        setIsGenerating(false);
        return;
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        setGeneratedScript(`❌ API 錯誤：${response.status}\n${err}`);
        setIsGenerating(false);
        return;
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || "無回應內容";
      setGeneratedScript(text);
    } catch (error: any) {
      setGeneratedScript(`❌ 請求失敗：${error.message}`);
    }

    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar - Steps */}
      <aside className="w-64 border-r border-border bg-sidebar p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-bold text-primary glow-text">
            META 腳本生成器
          </h1>
          <p className="text-xs text-muted-foreground mt-1">好創整合行銷 | 內部測試 v1.0</p>
        </div>

        <nav className="flex-1 space-y-2">
          <StepItem num={1} label="產品資訊" active={step === 1} done={!!isStep1Valid} onClick={() => setStep(1)} />
          <StepItem num={2} label="受眾與漏斗" active={step === 2} done={!!isStep2Valid} onClick={() => setStep(2)} />
          <StepItem num={3} label="風格設定" active={step === 3} done={!!isStep3Valid} onClick={() => setStep(3)} />
          <StepItem num={4} label="生成腳本" active={step === 4} done={!!generatedScript} onClick={() => setStep(4)} />
        </nav>

        <div className="mt-auto pt-6 border-t border-border">
          <Label className="text-xs text-muted-foreground mb-2 block">Anthropic API Key</Label>
          <Input
            type="password"
            placeholder="sk-ant-..."
            value={formData.apiKey || localStorage.getItem("meta_script_api_key") || ""}
            onChange={(e) => updateForm("apiKey", e.target.value)}
            className="text-xs bg-input"
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-14 border-b border-border flex items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-primary border-primary/30">
              <span className="pulse-dot w-2 h-2 rounded-full bg-primary inline-block mr-2" />
              雙引擎 AI
            </Badge>
            <span className="text-sm text-muted-foreground">
              GPT → Hook 發散 | Claude → 整合審核
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">模組化 3×3×3</Badge>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <StepPanel
              title="Step 1：產品資訊"
              subtitle="告訴我你要賣什麼"
              icon={<Target className="w-5 h-5" />}
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>產業類別 *</Label>
                  <Select value={formData.industry} onValueChange={(v) => updateForm("industry", v)}>
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="選擇產業" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((i) => (
                        <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>產品名稱 *</Label>
                  <Input
                    placeholder="例：好創短影音代操方案"
                    value={formData.productName}
                    onChange={(e) => updateForm("productName", e.target.value)}
                    className="bg-input"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>核心賣點（1-3 個）*</Label>
                  <Textarea
                    placeholder="例：30 天內產出 27 支變體素材、模組化拍攝一次搞定、專業投手即時優化"
                    value={formData.sellingPoints}
                    onChange={(e) => updateForm("sellingPoints", e.target.value)}
                    className="bg-input min-h-[100px]"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <Button onClick={() => setStep(2)} disabled={!isStep1Valid}>
                  下一步 <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </StepPanel>
          )}

          {step === 2 && (
            <StepPanel
              title="Step 2：受眾與漏斗"
              subtitle="你要打誰、打哪個階段"
              icon={<Film className="w-5 h-5" />}
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-2">
                  <Label>目標受眾描述 *</Label>
                  <Textarea
                    placeholder="例：25-40 歲女性，有保養習慣但對現有產品不滿意，痛點是花了錢卻看不到效果"
                    value={formData.targetAudience}
                    onChange={(e) => updateForm("targetAudience", e.target.value)}
                    className="bg-input min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>漏斗層級 *</Label>
                  <Select value={formData.funnel} onValueChange={(v) => updateForm("funnel", v)}>
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="選擇漏斗層級" />
                    </SelectTrigger>
                    <SelectContent>
                      {FUNNELS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>影片時長 *</Label>
                  <Select value={formData.duration} onValueChange={(v) => updateForm("duration", v)}>
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="選擇時長" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={() => setStep(1)}>上一步</Button>
                <Button onClick={() => setStep(3)} disabled={!isStep2Valid}>
                  下一步 <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </StepPanel>
          )}

          {step === 3 && (
            <StepPanel
              title="Step 3：風格設定"
              subtitle="決定腳本的語氣和出鏡方式"
              icon={<Sparkles className="w-5 h-5" />}
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>出鏡方式 *</Label>
                  <Select value={formData.appearance} onValueChange={(v) => updateForm("appearance", v)}>
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="選擇出鏡方式" />
                    </SelectTrigger>
                    <SelectContent>
                      {APPEARANCES.map((a) => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>語氣風格 *</Label>
                  <Select value={formData.tone} onValueChange={(v) => updateForm("tone", v)}>
                    <SelectTrigger className="bg-input">
                      <SelectValue placeholder="選擇語氣" />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={() => setStep(2)}>上一步</Button>
                <Button onClick={() => setStep(4)} disabled={!isStep3Valid}>
                  前往生成 <Zap className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </StepPanel>
          )}

          {step === 4 && (
            <StepPanel
              title="Step 4：生成腳本"
              subtitle="確認資訊後點擊生成"
              icon={<Zap className="w-5 h-5" />}
            >
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <SummaryCard label="產業" value={INDUSTRIES.find(i => i.value === formData.industry)?.label || "-"} />
                <SummaryCard label="產品" value={formData.productName || "-"} />
                <SummaryCard label="漏斗" value={FUNNELS.find(f => f.value === formData.funnel)?.label?.split("（")[0] || "-"} />
                <SummaryCard label="時長" value={formData.duration ? `${formData.duration} 秒` : "-"} />
                <SummaryCard label="出鏡" value={APPEARANCES.find(a => a.value === formData.appearance)?.label || "-"} />
                <SummaryCard label="語氣" value={TONES.find(t => t.value === formData.tone)?.label || "-"} />
              </div>

              <div className="flex items-center gap-4 mb-6">
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isGenerating || !formData.apiKey && !localStorage.getItem("meta_script_api_key")}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 glow-border"
                >
                  {isGenerating ? (
                    <>
                      <span className="animate-spin mr-2">⚡</span> 生成中...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" /> 啟動雙引擎生成
                    </>
                  )}
                </Button>
                {isGenerating && (
                  <div className="flex-1">
                    <Progress value={undefined} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">Claude 正在整合模組化矩陣...</p>
                  </div>
                )}
              </div>

              {/* Output */}
              {generatedScript && <ScriptOutput content={generatedScript} />}
            </StepPanel>
          )}
        </div>
      </main>
    </div>
  );
}

function StepItem({ num, label, active, done, onClick }: { num: number; label: string; active: boolean; done: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all duration-150 ${
        active
          ? "bg-primary/10 border border-primary/30 text-primary"
          : done
          ? "text-foreground hover:bg-secondary"
          : "text-muted-foreground hover:bg-secondary"
      }`}
    >
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          active
            ? "bg-primary text-primary-foreground"
            : done
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {done && !active ? <CheckCircle2 className="w-3.5 h-3.5" /> : num}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function StepPanel({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}

function buildPrompt(data: FormData): string {
  const industryLabel = INDUSTRIES.find(i => i.value === data.industry)?.label || data.industry;
  const funnelLabel = FUNNELS.find(f => f.value === data.funnel)?.label || data.funnel;
  const appearanceLabel = APPEARANCES.find(a => a.value === data.appearance)?.label || data.appearance;
  const toneLabel = TONES.find(t => t.value === data.tone)?.label || data.tone;

  return `你是好創整合行銷的「Meta 導購型短影音廣告腳本生成器」。根據以下輸入，產出符合 2026 年 Meta Andromeda 演算法邏輯的高轉換導購腳本。

## 輸入資訊

產業：${industryLabel}
產品名稱：${data.productName}
產品核心賣點：${data.sellingPoints}
目標受眾：${data.targetAudience}
漏斗層級：${funnelLabel}
影片時長：${data.duration} 秒
出鏡方式：${appearanceLabel}
語氣風格：${toneLabel}

## 輸出要求

請依照以下格式輸出完整模組化矩陣：

### 第一部分：策略判斷
- 產業矩陣匹配
- 漏斗層級判斷
- Andromeda 信號設計

### 第二部分：模組化矩陣（3×3×3）

#### Hook 模組（3 個，每個概念必須不同）
每個 Hook 包含：
- 公式類型（痛點/結果先行/反常識/提問/視覺/故事）
- 口白文字（≤15字）
- 文字疊層
- 聲音設計
- 人物動向指令（ED-X/HG-X/BM-X/FE-X）
- 拍攝指令（景別/鏡頭/燈光）

#### Body 模組（3 個，角度不同）
每個 Body 包含：
- 結構類型
- 口白文字
- 文字疊層
- 聲音設計（BGM+音效）
- 人物動向指令
- 拍攝指令
- 剪輯節奏（CPS 值）

#### CTA 模組（3 個，風格不同）
每個 CTA 包含：
- 風格類型
- 口白文字
- 文字疊層
- 人物動向指令
- 行動理由

### 第三部分：組合建議 Top 5

### 第四部分：Checklist 預測評分（100 分制）
用表格列出 19 個檢查項的通過狀態和分數。

### 第五部分：拍攝執行指南
- 設備建議
- 場景設定
- 服裝建議
- 拍攝順序
- 剪輯注意事項

## 品質規則（必須遵守）
1. 每個 Hook 必須概念不同（不能只改措辭）
2. Hook 不超過 3 秒口白量（最多 15 字）
3. Body 講好處不講功能
4. CTA 必須有行動理由
5. 靜音也要能看懂
6. 台灣用語、正體中文
7. 漏斗層級嚴格對應
8. 人物動向指令必填
9. 不得使用致命錯誤清單中的模式（品牌名開場/嗨大家好/泛泛讚美/慢熱鋪陳/模糊CTA）`;
}
