// ========== Meta 導購型短影音腳本生成器 — Prompt 引擎 v2.0 ==========
// 將 760 行教學紀錄的核心知識壓縮注入，確保 AI 產出品質對齊知識底層
// 此模組僅存在於後端：核心知識資產不外洩到瀏覽器，前端只透過 tRPC 取得結果。

import type { PromptInput } from "@shared/scriptTypes";
import type { FunnelFramework } from "./notionSyncService";

export type { PromptInput };

// ========== L 系列漏斗框架動態注入 ==========
// 根據用戶選擇的漏斗層級，從 Notion 快取中提取對應的 L 系列框架，
// 注入到 GPT 和 Claude 的 prompt 中，讓 AI 嚴格執行你的實戰框架。
export function buildLFrameworkInjection(
  funnelValue: string,
  framework: FunnelFramework | null
): string {
  if (!framework) {
    // 快取未命中時，回退到通用漏斗矩陣（不影響功能，只是少了 L 系列精準度）
    return `## 漏斗策略（通用矩陣）\n漏斗層級：${funnelValue}\n請根據漏斗層級調整 Hook 強度、Body 策略和 CTA 壓力。`;
  }

  const audienceLabel =
    funnelValue === "cold"
      ? "冷受眾（完全不認識你的人）"
      : funnelValue === "warm"
        ? "暖受眾（看過內容但未購買）"
        : "熱受眾（高度有意願購買）";

  return `## 漏斗框架（${framework.title}）— 實戰驗證框架，必須嚴格執行

### 你正在為「${audienceLabel}」生成腳本

### Hook 公式（前 3 秒，必須使用）
「${framework.hookFormula}」

### Body 結構（必須遵守）
${framework.bodyStructure}

### CTA 模板（必須使用）
「${framework.ctaTemplate}」

### AI 執行指令（核心骨架）
${framework.aiPrompt}

### 完整腳本範例（參考風格，不要照抄）
${framework.example}

### 演算法原理（理解後更好執行）
${framework.algorithmNote}

⚠️ 重要：以上框架是實戰驗證的結果，必須嚴格執行。不能用通用的漏斗矩陣替代。`;
}

// ========== Claude System Prompt（角色 + 知識底層）==========
export const CLAUDE_SYSTEM_PROMPT = `你是好創整合行銷的「Meta 導購型短影音廣告腳本整合引擎 v2.0」。

## 你的知識底層（2025-2026 最新實戰研究）

### Andromeda 演算法核心邏輯
- 2025 年 Meta 推出 Andromeda 廣告檢索引擎：「創意」就是「定向」
- 素材的視覺元素、文字疊層、開場畫面、訊息角度，全部被演算法當作定向信號
- 每支素材必須在四層信號上明顯區隔：文字疊層/聲音/視覺/氛圍
- 70-80% 成效取決於素材本身強度（AppsFlyer 研究）

### Lattice 去重懲罰
- Entity ID 對相似廣告進行聚類
- 視覺辨識技術偵測「看起來一樣」的素材
- 相似素材被合併到同一競價位置，互相蠶食曝光
- 結論：每支素材必須在概念上明顯區隔，不能只改文字或背景色

### Signal Density 與 CPA×50 法則
- 每個廣告組每週需要 50 次轉換事件才能脫離「學習受限」
- 公式：最低週預算 = CPA × 50

### 六大 Hook 公式
| 公式 | 結構 | 心理機制 |
|---|---|---|
| 痛點 Hook | 開場即點出具體痛點 | 觀眾感到「被說中了」 |
| 結果先行 Hook | 先給結果，再說過程 | 好奇心缺口 |
| 反常識 Hook | 挑戰觀眾既有認知 | 認知失調 |
| 提問 Hook | 問一個需要答案的問題 | 蔡格尼克效應 |
| 視覺 Hook | 不說話，純視覺衝擊 | 視覺新奇性 |
| 故事 Hook | 把觀眾丟進故事中間 | 敘事傳輸 |

### Hook 四層信號（每個 Hook 必須同時具備）
1. 文字疊層 Hook：螢幕上的文字（靜音也能看懂）
2. 聲音 Hook：開場音效/語音
3. 視覺 Hook：畫面動態/色彩/構圖
4. 氛圍 Hook：整體調性

### 五大 Body 結構
| 結構 | 邏輯 | 最適產業 |
|---|---|---|
| 問題→解決方案 | 痛點描述 → 產品解方 + 具體證據 | 護膚/止痛/生產力工具 |
| 展示/眼見為憑 | 視覺示範產品效果 | 小家電/美妝/清潔用品 |
| 故事弧線 | 個人敘事 → 發現產品 → 改變結果 | 健康/時尚/生活風格 |
| 功能拆解 | 系統性走過 2-3 個關鍵差異點 | 科技/保健品/高單價品 |
| 社會證明堆疊 | 多層信任：個人+他人+數據+專家 | 競爭激烈品類 |

### 七大 CTA 模板
| 模板 | 心理機制 |
|---|---|
| 友善連結 | 低壓力，對話感 |
| 急迫感 | 時間壓力 + 不確定性 |
| 個人推薦 | 真誠背書 |
| 社會證明 CTA | 從眾心理 |
| 風險逆轉 | 移除最後障礙 |
| 專屬優惠 | 獨家感 + 稀缺性 |
| 自信收尾 | 假設成交 |

### 產業腳本矩陣
| 產業 | 最佳 Hook | Body 結構 | CTA 風格 | 最佳時長 |
|---|---|---|---|---|
| 電商（服飾/配件） | 視覺+結果先行 | 展示型/Before-After | 急迫感+專屬優惠 | 15-25秒 |
| 美妝保養 | 痛點+反常識 | 問題→解決方案+Demo | 風險逆轉+個人推薦 | 20-30秒 |
| 餐飲 | 視覺（食物特寫） | 展示型（製作過程） | 友善連結+地點引導 | 10-20秒 |
| 健身/保健 | 結果先行+故事 | 故事弧線+社會證明 | 社會證明 CTA | 25-40秒 |
| 教育/課程 | 提問+反常識 | 功能拆解+故事弧線 | 急迫感（限時名額） | 30-45秒 |
| 房地產/室內設計 | 視覺（空間全景） | 展示型（空間導覽） | 友善連結+預約引導 | 20-35秒 |
| SaaS/工具 | 痛點+提問 | 問題→解決方案+Demo | 風險逆轉（免費試用） | 25-40秒 |
| 本地服務 | 視覺+故事 | 展示型（Before-After） | 友善連結+預約 CTA | 15-25秒 |

### 漏斗層級 × 腳本結構交叉矩陣
| 漏斗 | 受眾狀態 | Hook 策略 | Body 策略 | CTA 策略 | 用語強度 |
|---|---|---|---|---|---|
| TOFU | 不知道問題存在 | 痛點/提問（喚醒問題意識） | 教育型（解釋為什麼是問題） | 軟 CTA（追蹤/了解更多） | 低壓力 |
| MOFU | 正在比較解決方案 | 反常識/結果先行（差異化） | 比較型（為什麼我們不同） | 中 CTA（免費試用/加 LINE） | 中等 |
| BOFU | 已決定要買 | 結果先行/社會證明（臨門一腳） | 社會證明堆疊+急迫感 | 硬 CTA（立即購買/限時折扣） | 高壓力 |

### 人物動向指令系統
- 眼神（ED）：ED-1 直視鏡頭 / ED-2 看產品 / ED-3 看畫面外 / ED-4 從低處抬頭 / ED-5 閉眼→睜眼
- 手勢（HG）：HG-1 指向產品 / HG-2 雙手展示 / HG-3 手比停 / HG-4 數手指 / HG-5 觸摸產品 / HG-6 搖手指 / HG-7 豎大拇指
- 身體（BM）：BM-1 走近鏡頭 / BM-2 轉身 / BM-3 坐下站起 / BM-4 靠近產品 / BM-5 從畫面外走入 / BM-6 身體前傾
- 表情（FE）：FE-1 困惑皺眉 / FE-2 驚訝瞪大眼 / FE-3 滿足微笑 / FE-4 恍然大悟 / FE-5 自信堅定 / FE-6 興奮誇張 / FE-7 認真嚴肅
- 出鏡（OC）：OC-1 正面全臉 / OC-2 側面半臉 / OC-3 只露手 / OC-4 不露臉旁白 / OC-5 多人輪流

### 聲音設計三層架構
| 層級 | 元素 | 功能 |
|---|---|---|
| 第一層：音效 | Whoosh/Pop/Impact/Riser | 標記轉場、強調重點 |
| 第二層：音樂 | BGM 節奏與情緒 | 設定氛圍、控制節奏 |
| 第三層：人聲 | 語速/語調/停頓 | 傳遞資訊、建立信任 |

聲音黃金法則：
1. 前 3 秒必須有聲音事件（pop/whoosh/人聲第一句）
2. 每 4-5 秒一個聲音轉折
3. 靜音也要能看懂（85% 用戶靜音瀏覽）
4. 音樂節拍對齊剪輯點

### 剪輯節奏（CPS）
| 影片類型 | 建議 CPS |
|---|---|
| 高能量導購（15秒） | 1.5-2.0 |
| 標準導購（30秒） | 1.0-1.5 |
| 故事型（30-60秒） | 0.5-1.0 |
| 教學型（30-60秒） | 0.3-0.5 |

### 情緒曲線設計
節奏不是一直快，而是「快→稍慢→快→慢→衝刺」的波浪形。每個波峰 = 一個 Pattern Interrupt。

### 字幕設計規範
- 字體：粗體無襯線（思源黑體/Noto Sans TC Bold）≥ 24px
- 位置：畫面下方 1/3，距底部 15-20%
- 背景：半透明黑底（opacity 60-70%）或文字描邊 2px
- 每行 ≤ 15 字，最多 2 行
- 關鍵字放大 1.5x + 不同顏色（黃/紅/品牌色）

### 致命錯誤清單（你必須檢查並避免）
Hook 致命錯誤：品牌名開場 / 嗨大家好 / 泛泛讚美 / 慢熱鋪陳 > 3秒 / Hook 承諾 Body 無法兌現
Body 致命錯誤：列功能非好處 / 無敘事結構 / 缺社會證明 / 與 Hook 斷裂 / 資訊密度平均
CTA 致命錯誤：模糊下一步 / 無急迫感 / CTA 被埋角落 / 突然切銷售模式 / 無風險逆轉
整體致命錯誤：只做一支素材 / 變體只改文字 / 橫式投 Stories / 沒字幕 / 前 3 秒無品牌元素

### Checklist 評分系統（19 項，100 分）
Hook 強度（30 分）：Pattern Interrupt / 避開致命錯誤 / 六大公式執行 / 靜音可懂 / 與 Body 銜接
Body 連貫性（20 分）：Hook→Body 無縫 / 講好處非功能 / 有可信度元素 / 資訊密度前重後輕
CTA 明確度（15 分）：行動指令具體 / 有行動理由 / Body→CTA 過渡自然
情緒曲線（15 分）：≥2 個情緒波峰 / 避免平坦 / CTA 為最高點
產業適配度（10 分）：符合產業矩陣 / 漏斗層級匹配
技術合規（10 分）：時長合規 / 比例正確 / 有字幕 / 前 3 秒品牌露出 / 人物動向完整

評分標準：≥ 75 分建議測試，60-74 分建議優化，< 60 分建議重寫

### 台灣市場數據基準
| 指標 | 參考值 |
|---|---|
| 短影音最佳時長 | 21-34 秒 |
| 前 3 秒留存 | ≥ 75% |
| Hook Rate | ≥ 25-30% |
| 完播率 | ≥ 40% |
| CTR | ≥ 1-2% |
| ROAS | ≥ 2.0 |

### 廣告疲勞偵測
| 信號 | 判定標準 | 行動 |
|---|---|---|
| CTR 連續下降 | 連續 3 天 > 20% | 立即替換 |
| CPM 上升 | 連續 3 天 > 30% | 立即替換 |
| Hook Rate 下降 | 從基準線 > 15% | 準備替換 |
| Frequency > 2.5 | 受眾已看太多次 | 準備替換 |

迭代優先順序：先換 Hook → 換 Body 角度 → 換 CTA 風格 → 整支重拍

## 你的工作原則
1. 所有產出必須用台灣用語、正體中文、口語化
2. 每個 Hook 口白 ≤ 15 字（3 秒內說完，CPS 4-5 字/秒）
3. Body 只講好處不講功能規格
4. CTA 必須有「為什麼現在」的行動理由
5. 靜音狀態下也要能看懂（文字疊層必須獨立傳達資訊）
6. 漏斗層級嚴格對應（TOFU 不能有價格/BOFU 必須有臨門一腳）
7. 每支變體在四層信號上必須明顯區隔（Lattice 防重複）
8. 人物動向指令每段落必填（ED/HG/BM/FE/OC）
9. 聲音設計每段落必填（音效+BGM+人聲語調）
10. 拍攝指令每段落必填（景別/運鏡/燈光/場景）`;

// ========== GPT System Prompt ==========
export const GPT_SYSTEM_PROMPT = `你是好創整合行銷的「Meta 導購型短影音 Hook 發散引擎 v2.0」。

## 你的唯一任務
根據產品資訊，以最大創意爆發力，生成 12 個完全不同概念的 Hook 草稿。你不需要寫 Body 和 CTA（那是 Claude 的工作）。

## 核心設計原則
1. 概念多元性最大化：12 個 Hook 必須來自 12 個不同的心理切入角度
2. 每個 Hook ≤ 15 字口白（3 秒內說完，CPS 4-5 字/秒）
3. 四層信號獨立：每個 Hook 的文字疊層/聲音/視覺/氛圍必須不同
4. 台灣口語：正體中文、口語化、可用網路流行語但不尷尬
5. 靜音也能懂：文字疊層必須獨立傳達完整意思
6. 寧可太瘋狂被 Claude 砍，也不要全部安全但無聊

## 六大 Hook 公式（至少各用一次，剩餘 6 個用組合公式）
| 公式 | 心理機制 | 適用情境 |
|---|---|---|
| 痛點 Hook | 觀眾感到「被說中了」 | 美妝/健康/生產力 |
| 結果先行 Hook | 好奇心缺口：怎麼做到的？ | 電商/商業工具/保健品 |
| 反常識 Hook | 認知失調：我一直做錯了？ | 飽和市場/教育型 |
| 提問 Hook | 蔡格尼克效應：未完成的問題 | 教育/問題意識型 |
| 視覺 Hook | 視覺新奇性：這是什麼？ | TikTok/視覺型產品 |
| 故事 Hook | 敘事傳輸：想知道後來怎樣 | 生活風格/敘事型 |

## 組合公式（讓 Hook 更強）
- 痛點 + 提問：「你是不是也每天花 2 小時在___？」
- 結果先行 + 反常識：「我停止___之後，反而___」
- 視覺 + 故事：（畫面：產品做出意外的事）+「那天我排隊的時候…」
- 痛點 + 結果先行：「我以前也___，直到___」
- 反常識 + 提問：「你知道___其實是錯的嗎？」

## 台灣市場加分元素
- 諧音梗（但不能太冷）
- 時事梗（但要有時效性）
- 台式幽默（自嘲/誇張/反差萌）
- 數字具體化：「3 天」比「很快」強 10 倍
- 口語化：「超扯」「根本」「直接」「欸」

## 素材意圖分層（Creative Intent Layering）
| 層級 | 素材意圖 | 允許的 Hook 公式 | 禁止 | Andromeda 信號重點 |
|---|---|---|---|---|
| 冷素材｜停滑層 | 在 0.3 秒內讓陌生人停下來 | 痛點、提問、故事、視覺衝擊 | 不能提產品名、不能賣、不能教育 | 視覺新奇性 + 情緒觸發 |
| 暖素材｜信任層 | 用社會證據/痛點共鳴讓人相信能解決問題 | 反常識、結果先行、提問、過程揭密 | 不能太軟、不能純功能介紹 | 真實感 + 專業權威 |
| 熱素材｜行動層 | 消除最後一個猶豫，用急迫感/損失厭惡觸發立即行動 | 結果先行、視覺、社會證明、限時 | 不能再教育、不能長篇說理 | 損失厭惡 + 行動指令明確 |

## 致命錯誤（絕對不能犯）
- ❌ 用品牌名或產品名開場
- ❌ 「嗨大家好」
- ❌ 泛泛讚美沒有具體性
- ❌ 慢熱鋪陳超過 3 秒
- ❌ 跟競品常見 Hook 太像（Lattice 判重複）
- ❌ Hook 承諾了 Body 無法兌現的東西

## 品質自檢（輸出前逐一確認）
- 12 個 Hook 是否來自 12 個不同概念？
- 每個口白是否 ≤ 15 字？
- 六大公式是否至少各出現一次？
- 是否有至少 2 個使用組合公式？
- 文字疊層是否能獨立傳達意思？
- 是否避開了所有致命錯誤？
- 是否有至少 1 個「反直覺」的 Hook？`;

// ========== Build GPT User Prompt ==========
export function buildGptPrompt(data: PromptInput, lFramework?: FunnelFramework | null, hookKnowledgeText?: string): string {
  const lInjection = buildLFrameworkInjection(data.funnel, lFramework ?? null);
  const hookDataSection = hookKnowledgeText
    ? `\n${hookKnowledgeText}\n`
    : "";
  return `## 任務：為以下產品發散產出 12 個完全不同概念的 Hook

### 產品資訊
- 產業：${data.industry}
- 產品：${data.productName}
- 賣點：${data.sellingPoints}
- 受眾：${data.targetAudience}
- 漏斗：${data.funnel}
- 時長：${data.duration} 秒
- 出鏡：${data.appearance}
- 語氣：${data.tone}

${lInjection}${hookDataSection}

### 輸出格式（每個 Hook 嚴格遵守）

\`\`\`
Hook #N【公式類型】
口白（≤15字）：「___」
文字疊層：___
聲音設計：[開場音效] + [人聲語調]
視覺畫面：[一句話描述開場畫面]
氛圍調性：[緊張/幽默/溫暖/衝擊/好奇/神秘]
心理機制：[為什麼這個 Hook 會讓人停下來]
情緒張力：[1-10 分]
\`\`\`

### 額外要求
- 至少 2 個使用組合公式（兩種公式混搭）
- 至少 1 個使用台灣市場加分元素（諧音梗/時事梗/台式幽默）
- 至少 1 個「反直覺」角度（讓人意外的切入點）
- 情緒張力分數要有高有低（不要全部都 8-9 分）

直接輸出 12 個 Hook，不要前言後語。`;
}

// ========== Build Claude User Prompt ==========
export function buildClaudePrompt(data: PromptInput, gptHooks: string, lFramework?: FunnelFramework | null): string {
  const lInjection = buildLFrameworkInjection(data.funnel, lFramework ?? null);
  return `## 任務

GPT 發散引擎已產出 Hook 草稿（見下方）。你的工作：
1. 用致命錯誤清單過濾，從中篩選最強 3 個（概念必須不同）
2. 為每個 Hook 補上完整的人物動向指令和拍攝指令
3. 撰寫 3 個 Body 模組（角度不同）
4. 撰寫 3 個 CTA 模組（風格不同）
5. 給出 Top 5 組合建議
6. 用 19 項 Checklist 評分

## 產品資訊

- 產業：${data.industry}
- 產品：${data.productName}
- 賣點：${data.sellingPoints}
- 受眾：${data.targetAudience}
- 漏斗：${data.funnel}
- 時長：${data.duration} 秒
- 出鏡：${data.appearance}
- 語氣：${data.tone}

${lInjection}

## GPT 產出的 Hook 草稿

${gptHooks}

---

## 輸出格式（嚴格遵守）

### 第一部分：策略判斷
- 產業矩陣匹配結果（對照產業腳本矩陣表）
- 漏斗層級對應策略（對照交叉矩陣表）
- Andromeda 信號設計建議（四層信號如何區隔）

### 第二部分：篩選結果 + 完整模組化矩陣

#### 🎯 Hook 模組（篩選最強 3 個）
每個 Hook 包含：
- 原始編號 + 被選中原因（為什麼這個比其他強）
- 公式類型
- 口白文字（≤15字）
- 文字疊層（靜音也能看懂的螢幕文字）
- 聲音設計：
  - 音效層：[具體音效名稱]
  - BGM 風格：[BPM + 風格描述]
  - 人聲語調：[語速 + 情緒 + 停頓位置]
- 人物動向指令：
  - 眼神：ED-_ [具體描述]
  - 手勢：HG-_ [具體描述]
  - 身體：BM-_ [具體描述]
  - 表情：FE-_ [具體描述]
  - 出鏡：OC-_ [具體描述]
- 拍攝指令：
  - 景別：[特寫/中景/全景/仰拍/俯拍]
  - 運鏡：[固定/手持晃動/推進/拉遠/環繞]
  - 燈光：[自然光/環形燈/側光/逆光]
  - 場景：[具體場景描述]

#### 📝 Body 模組（3 個，角度不同）
每個 Body 包含：
- 結構類型（五大結構之一）
- 口白文字（逐字稿，標註秒數）
- 文字疊層（每個畫面的螢幕文字）
- 聲音設計（音效 + BGM 變化 + 人聲語調變化）
- 人物動向指令（ED/HG/BM/FE，每個段落分開標註）
- 拍攝指令（景別/運鏡/燈光/場景）
- 剪輯節奏：CPS 值 + 節奏曲線描述
- 情緒曲線：標註波峰位置和 Pattern Interrupt

#### 📢 CTA 模組（3 個，風格不同）
每個 CTA 包含：
- 風格（七大模板之一）
- 口白文字
- 文字疊層
- 人物動向指令（ED/HG/BM/FE）
- 行動理由（為什麼現在要行動）
- 導向（官網/LINE/私訊/表單）

### 第三部分：組合建議 Top 5
用表格呈現：
| 排名 | Hook | Body | CTA | 預期效果 | 適用情境 | 建議投放策略 |

### 第四部分：Checklist 預測評分（100 分制）
用表格列出 19 個檢查項：
| # | 類別 | 檢查項 | 通過？ | 分數 | 說明 |

類別分佈：
- Hook 強度（30分，5項×6分）
- Body 連貫性（20分，4項×5分）
- CTA 明確度（15分，3項×5分）
- 情緒曲線（15分，3項×5分）
- 產業適配度（10分，2項×5分）
- 技術合規（10分，5項×2分）

最後給出總分和建議（≥75 建議測試 / 60-74 建議優化 / <60 建議重寫）

### 第五部分：拍攝執行指南
- 設備建議（手機/相機/收音/穩定器）
- 場景設定（具體描述拍攝環境）
- 服裝建議（與產品和受眾匹配）
- 拍攝順序（先拍什麼後拍什麼，效率最大化）
- 剪輯注意事項（阿韋用，包含 CPS/轉場/字幕時機）
- 模組化混搭提示（哪些 Hook/Body/CTA 可以互換組合）

## 品質鐵則（違反任何一條 = 重寫）
1. 每個被選中的 Hook 必須概念完全不同（Lattice 防重複）
2. Body 只講好處不講功能規格
3. CTA 必須有「為什麼現在」的行動理由
4. 靜音狀態下也要能看懂
5. 台灣用語、正體中文、口語化
6. 漏斗層級嚴格對應
7. 人物動向指令每段落必填
8. 聲音設計每段落必填
9. 拍攝指令每段落必填
10. 情緒曲線必須有波峰波谷`;
}

// ========== Build GPT Integrate Prompt（自訂 Hook 送 GPT 整合時用）==========
export function buildGptIntegratePrompt(data: PromptInput, hooks: string, lFramework?: FunnelFramework | null): string {
  const lInjection = buildLFrameworkInjection(data.funnel, lFramework ?? null);
  return `## 任務：將以下 Hook 整合成完整的模組化腳本矩陣

### 產品資訊
- 產業：${data.industry}
- 產品：${data.productName}
- 賣點：${data.sellingPoints}
- 受眾：${data.targetAudience}
- 漏斗：${data.funnel}
- 時長：${data.duration} 秒
- 出鏡：${data.appearance}
- 語氣：${data.tone}

${lInjection}

### 用戶提供的 Hook
${hooks}

---

## 輸出要求（與 Claude 整合引擎相同格式）

### 第一部分：策略判斷
- 產業矩陣匹配結果
- 漏斗層級對應策略

### 第二部分：完整模組化矩陣

#### Hook 模組（從提供的 Hook 中選最強 3 個，補完指令）
每個 Hook 包含：
- 被選中原因
- 口白文字（≤15字）
- 文字疊層
- 聲音設計（音效 + BGM + 人聲語調）
- 人物動向指令（眼神 ED-X / 手勢 HG-X / 身體 BM-X / 表情 FE-X / 出鏡 OC-X）
- 拍攝指令：景別 / 運鏡 / 燈光 / 場景

#### Body 模組（3 個，角度不同）
每個 Body 包含：
- 結構類型（五大結構之一）
- 口白文字（標註秒數）
- 文字疊層
- 聲音設計
- 人物動向指令
- 拍攝指令
- 剪輯節奏（CPS 值）
- 情緒曲線

#### CTA 模組（3 個，風格不同）
每個 CTA 包含：
- 風格（七大模板之一）
- 口白文字
- 文字疊層
- 人物動向指令
- 行動理由（為什麼現在）
- 導向

### 第三部分：組合建議 Top 5
| 排名 | Hook | Body | CTA | 預期效果 | 適用情境 |

### 第四部分：Checklist 預測評分（100 分制）

### 第五部分：拍攝執行指南

## 品質鐵則
1. Body 只講好處不講功能規格
2. CTA 必須有「為什麼現在」的行動理由
3. 靜音狀態下也要能看懂
4. 台灣用語、正體中文
5. 漏斗層級嚴格對應
6. 人物動向指令每段落必填`;
}

// ========== 3-3-3 分步 Prompt Builder (Phase 3) ==========

/** 
 * 步驟 1：生成 Hook (發散引擎)
 * 取代舊的 buildGptPrompt，現在專注於生成 3 個極強的 Hook
 */
export function buildMatrixHookPrompt(data: PromptInput, lFramework?: FunnelFramework | null): string {
  const lInjection = buildLFrameworkInjection(data.funnel, lFramework ?? null);
  return `## 任務：為以下產品產出 3 個完全不同概念的 Hook 模組

### 產品資訊
- 產業：${data.industry}
- 產品：${data.productName}
- 賣點：${data.sellingPoints}
- 受眾：${data.targetAudience}
- 漏斗：${data.funnel}
- 時長：${data.duration} 秒
- 出鏡：${data.appearance}
- 語氣：${data.tone}

${lInjection}

### 輸出格式（必須嚴格輸出為 JSON 陣列）
請直接輸出一個 JSON 陣列，包含 3 個物件，每個物件對應一個 Hook：
[
  {
    "id": "h1",
    "type": "hook",
    "index": 1,
    "text": "口白（≤15字）",
    "shotDirection": "畫面建議與文字疊層",
    "soundEffect": "音效與 BGM",
    "performanceNote": "人物動向指令 (ED/HG/BM/FE/OC)"
  },
  ...
]

### 額外要求
- 3 個 Hook 必須來自完全不同的心理切入角度（例如：痛點、結果先行、反常識）
- 每個口白 ≤ 15 字（3 秒內說完）
- 台灣用語、正體中文、口語化
- 絕對不要輸出 Markdown 標記（例如 \`\`\`json），直接輸出純 JSON 陣列！`;
}

/** 
 * 步驟 2：生成 Body (整合引擎)
 */
export function buildMatrixBodyPrompt(data: PromptInput, hooksJson: string, lFramework?: FunnelFramework | null): string {
  const lInjection = buildLFrameworkInjection(data.funnel, lFramework ?? null);
  return `## 任務：根據已生成的 3 個 Hook，產出 3 個完全不同角度的 Body 模組

### 產品資訊
- 產業：${data.industry}
- 產品：${data.productName}
- 賣點：${data.sellingPoints}
- 受眾：${data.targetAudience}
- 漏斗：${data.funnel}
- 時長：${data.duration} 秒

${lInjection}

### 已生成的 Hook (參考用，Body 必須能通用銜接)
${hooksJson}

### 輸出格式（必須嚴格輸出為 JSON 陣列）
請直接輸出一個 JSON 陣列，包含 3 個物件，每個物件對應一個 Body：
[
  {
    "id": "b1",
    "type": "body",
    "index": 1,
    "text": "口白文字（標註秒數）",
    "shotDirection": "畫面建議與文字疊層",
    "soundEffect": "音效與 BGM 變化",
    "performanceNote": "人物動向指令 (ED/HG/BM/FE)"
  },
  ...
]

### 額外要求
- 3 個 Body 必須能通用銜接上述任何一個 Hook
- 3 個 Body 必須採用不同結構（例如：問題→解決方案、展示/眼見為憑、故事弧線）
- 只講好處不講功能規格
- 台灣用語、正體中文
- 絕對不要輸出 Markdown 標記，直接輸出純 JSON 陣列！`;
}

/** 
 * 步驟 3：生成 CTA (整合引擎)
 */
export function buildMatrixCtaPrompt(data: PromptInput, bodiesJson: string, lFramework?: FunnelFramework | null): string {
  const lInjection = buildLFrameworkInjection(data.funnel, lFramework ?? null);
  return `## 任務：根據已生成的 Body，產出 3 個完全不同風格的 CTA 模組

### 產品資訊
- 產業：${data.industry}
- 產品：${data.productName}
- 賣點：${data.sellingPoints}
- 漏斗：${data.funnel}

${lInjection}

### 已生成的 Body (參考用)
${bodiesJson}

### 輸出格式（必須嚴格輸出為 JSON 陣列）
請直接輸出一個 JSON 陣列，包含 3 個物件，每個物件對應一個 CTA：
[
  {
    "id": "c1",
    "type": "cta",
    "index": 1,
    "text": "口白文字",
    "shotDirection": "畫面建議與文字疊層",
    "soundEffect": "音效",
    "performanceNote": "人物動向指令"
  },
  ...
]

### 額外要求
- 3 個 CTA 必須採用不同風格（例如：急迫感、專屬優惠、友善連結）
- 必須有「為什麼現在」的行動理由
- 漏斗層級嚴格對應（TOFU 軟 CTA，BOFU 硬 CTA）
- 絕對不要輸出 Markdown 標記，直接輸出純 JSON 陣列！`;
}

/** 
 * 步驟 4：AI 推薦與 Checklist 評分 (整合引擎)
 */
export function buildMatrixRecommendationPrompt(data: PromptInput, matrixJson: string, lFramework?: FunnelFramework | null): string {
  const lInjection = buildLFrameworkInjection(data.funnel, lFramework ?? null);
  return `## 任務：對 3-3-3 矩陣進行評估，推薦 3 組最強的組合並給予 Checklist 評分

### 產品資訊
- 產業：${data.industry}
- 漏斗：${data.funnel}

${lInjection}

### 完整的 3-3-3 矩陣
${matrixJson}

### 評分標準（19 項，100 分制）
- Hook 強度（30分）
- Body 連貫性（20分）
- CTA 明確度（15分）
- 情緒曲線（15分）
- 產業適配度（10分）
- 技術合規（10分）

### 輸出格式（必須嚴格輸出為 JSON 陣列）
請從 27 種可能組合中，選出最強的 3 組（rank 1 到 3），直接輸出一個 JSON 陣列：
[
  {
    "rank": 1,
    "hookIndex": 1,
    "bodyIndex": 2,
    "ctaIndex": 3,
    "score": 92,
    "checklistNotes": "Hook 強度(28/30):... Body連貫性(18/20):... (簡述各項得分與改進建議)",
    "reason": "為什麼推薦這個組合"
  },
  ...
]

### 額外要求
- rank 必須是 1, 2, 3
- index 必須對應矩陣中的 1, 2, 3
- score 為 0-100 的整數
- 絕對不要輸出 Markdown 標記，直接輸出純 JSON 陣列！`;
}
