# Meta 導購型短影音腳本生成器 - 設計構思

## 目標
好創內部測試工具。團隊填入產業/產品/漏斗層級等資訊，系統產出模組化腳本矩陣。
不需要登入、不需要資料庫。純前端工具，API Key 由前端直接呼叫。

---

<response>
<text>
## 方案 A：戰情室風格（War Room Aesthetic）

**Design Movement**: 軍事指揮中心 + 數據儀表板
**Core Principles**:
1. 深色背景搭配高對比螢光色文字，營造「作戰指揮」氛圍
2. 資訊密度高但層級分明，用色塊和邊框區隔功能區
3. 固定左側導航，右側為主要工作區，底部為狀態列

**Color Philosophy**: 深灰底（#0F1419）+ 螢光綠主色（#00FF88）+ 琥珀警告色（#FFB800）+ 冷白文字（#E8ECEF）。營造「專業投手控制台」的緊張感。

**Layout Paradigm**: 三欄式固定佈局。左側：步驟導航。中間：輸入/輸出主區。右側：即時預覽/評分面板。

**Signature Elements**:
1. 步驟進度條用脈衝動畫（像心跳監視器）
2. 評分儀表板用環形進度條
3. 輸出區用打字機效果逐字顯示

**Interaction Philosophy**: 每個動作都有即時回饋，像操作精密儀器。

**Animation**: 元素進場用 slide-in + fade，評分變化用數字跳動動畫。

**Typography System**: Space Grotesk（標題/數字）+ Inter（正文）。標題 28px bold，正文 14px regular。
</text>
<probability>0.08</probability>
</response>

<response>
<text>
## 方案 B：極簡工具風格（Brutalist Tool Aesthetic）

**Design Movement**: 瑞士平面設計 + Brutalist Web Design
**Core Principles**:
1. 無裝飾、無圓角、無漸層，純粹的功能導向
2. 大量留白搭配粗黑標題，資訊層級用字重和大小區分
3. 單欄流式佈局，從上到下填完就出結果

**Color Philosophy**: 純白底（#FFFFFF）+ 純黑文字（#000000）+ 單一強調色紅（#FF3B30）。紅色只用在 CTA 和關鍵數字。極度克制。

**Layout Paradigm**: 單欄垂直流。每個步驟是一個全寬區塊，填完自動展開下一步。像填問卷。

**Signature Elements**:
1. 粗黑邊框分隔區塊（4px solid black）
2. 等寬字體顯示腳本輸出（像終端機）
3. 紅色圓點標記必填項

**Interaction Philosophy**: 零學習成本。看到就知道怎麼用。沒有隱藏功能。

**Animation**: 幾乎沒有動畫。唯一動畫是區塊展開時的高度過渡（200ms）。

**Typography System**: DM Sans（標題，800 weight）+ JetBrains Mono（腳本輸出）+ DM Sans（正文，400）。標題 48px，正文 16px。
</text>
<probability>0.06</probability>
</response>

<response>
<text>
## 方案 C：創意工坊風格（Creative Workshop Aesthetic）

**Design Movement**: 數位手工藝 + 模組化設計系統
**Core Principles**:
1. 每個模組（Hook/Body/CTA）是獨立的「卡片積木」，可視覺化拖拉組合
2. 暖色調搭配手寫感元素，營造「創意工作坊」而非冰冷工具
3. 漸進式揭露：先簡單，點開才看到細節

**Color Philosophy**: 暖灰底（#F5F0EB）+ 深棕文字（#2C1810）+ 珊瑚橘強調（#FF6B4A）+ 薄荷綠成功色（#4ECDC4）。像手工咖啡店的菜單板。

**Layout Paradigm**: 卡片式模組佈局。輸入區在上方（水平步驟），輸出區在下方用網格展示 3×3 矩陣，每張卡片可展開。

**Signature Elements**:
1. Hook/Body/CTA 用不同色塊標記（橘/綠/紫）
2. 模組組合時有磁吸動畫效果
3. 評分用星星而非數字

**Interaction Philosophy**: 像玩樂高積木。看到模組就想組合。

**Animation**: 卡片 hover 微微抬起（translateY -4px + shadow），展開用 spring 彈性動畫。

**Typography System**: Playfair Display（大標題，營造手工感）+ Work Sans（正文/UI）。標題 36px，正文 15px。
</text>
<probability>0.07</probability>
</response>

---

## 選擇：方案 A - 戰情室風格

理由：
1. 這是投廣告的工具，用戶心態是「作戰」不是「創作」
2. 深色主題減少視覺疲勞（投手長時間盯螢幕）
3. 高資訊密度符合專業工具定位
4. 與好創的「商業結果導向」定位一致
