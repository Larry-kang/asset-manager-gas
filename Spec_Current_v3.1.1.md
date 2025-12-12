# Spec_Current_v3.1.1.md

## 蝟餌絞閬?賂?鞈蝞∪振 (Asset Manager) v3.1.1

?祆?隞嗉底蝝啗????桀?蝟餌絞?瑽??Ｘ見撘???頛航?鈭?瘚???
?舐??AI 頛??頂蝯勗儔?颯?

---

### 1. 蝟餌絞?嗆? (System Architecture)
- **撟喳**: Google Apps Script (GAS) Web App
- **?垢**: HTML5, CSS3 (Flex/Grid), Vanilla JS (ES6+)
- **敺垢**: GAS (.gs), Google Sheets (Database)
- **憭摨?*: Chart.js (CDN)

### 2. 隞閮剛? (UI Design)

#### 2.1 ?脣蔗蝟餌絞 (Color System) - CSS Variables
**Light Theme (Default)**
- `--primary`: `#2c3e50` (瘛梯???
- `--bg`: `#f4f7f6` (瘛箇?)
- `--card-bg`: `#ffffff` (?賢??
- `--text-main`: `#333333`
- `--text-sub`: `#666666`
- `--border`: `#eeeeee`
- `--metric-bg`: `#f8f9fa`
- `--green`: `#27ae60`
- `--red`: `#e74c3c`
- `--blue`: `#3498db`
- `--yellow`: `#f1c40f`

**Dark Theme**
- `--primary`: `#34495e`
- `--bg`: `#121212`
- `--card-bg`: `#1e1e1e`
- `--text-main`: `#e0e0e0`

#### 2.2 雿?蝯? (Layout)
- **Container**: `max-width: 800px`, centered.
- **Navigation**: ?璈怠??脣??詨 (鞈?, 鈭斗??駁?, 鞎蝞∠?).
- **Views**: ?桅?? (SPA) ??嚗??憿舐內 `<div class="view">`.
- **Cards**: ?? 16px, ?啣蔣, padding 20px.
- **Grid**: 2甈?撅 (`grid-template-columns: 1fr 1fr`).

### 3. ?璅∠? (Modules)

#### 3.1 鞈? (Dashboard) - `#dash`
- **Header**: 撘瑕?湔??, 撟??? (TWD/USD).
- **Metrics**: 瘛刻??? 蝮質???(憭批?擃＊蝷?.
- **Charts**: ????(Pie), ????(Line) - 雿輻 Chart.js.
- **Holdings**: ??蝝啣?銵?(隞??, ?賊?, ?曉, ??).
  - ??憿: TWD璅∪?(蝝撞蝬?), USD璅∪?(蝬撞蝝?).

#### 3.2 鈭斗??駁? (Transaction) - `#tx`
- **Form**: ?交?, ??(鞎瑕/鞈?/?), 憿(?∠巨/??/?暸?), 隞??, ?賊?, ?桀, 撟?.
- **Input**: 隞??甈??舀 Datalist (`tickerList`) ?芸?摰?.
- **Recent List**: 憿舐內?餈?10 蝑漱???舀?耨?嫘???扎?

#### 3.3 鞎蝞∠? (Loan Manager) - `#loan`
- **Form**: 撱箇??硫?? (?∠巨鞈芣/???硫/靽∟硫).
- **Collateral**: ?菜???(`<select>`) ?芸?撣嗅摨怠??賊?.
- **Contract List**: 憿舐內???∠?嚗??怎雁??/LTV 閮?.
- **Actions**: 鋆像靽??? 韐?/?狡 (敶 Modal).

#### 3.4 鈭?閬? (Modals)
- **Action Modal**: ?????? (??, ?賊?).
- **Message Modal**: 憿舐內 ??/憭望? 閮 (Icon + Title + Body).
- **Confirm Modal**: ?梢??蝣箄? (憒??.

### 4. 鞈??摩 (Data Logic)

#### 4.1 ?垢???(Store)
- `currency`: 'TWD' | 'USD'
- `fx`: ?舐? (?身 32.5)
- `inventory`: `{ Ticker: Qty }` 撠銵?
- `theme`: 'light' | 'dark'

#### 4.2 ??賢? (Key Functions)
- `render(payload)`: ?交敺垢鞈?銝行?唳???UI.
- `updateInventorySelects(type)`: ?寞?摨怠????Ｙ? `<select>` ?賊? (?蕪???=0).
- `formatMoney(val)`: ?寞? Store.currency ?澆???憿?

#### 4.3 敺垢鞈?蝯? (Backend)
- **Sheet: 鈭斗?蝝??*: Date, Type, Ticker, Qty, Price, Currency...
- **Sheet: MarketData**: ?脣??勗敹怎.
- **API**: `getDashboardData(force)` ?摰 JSON.

### 5. ?寞??? (Special Handling)
- **Mobile Support**: 雿輻 Native `<select>` ?誨 `<input list>` 隞亙??璈?撽?
- **Error Handling**: `try-catch` ?ㄨ皜脫??摩嚗隤斗?憿舐內 Modal + Console Log.
- **Logging**: ?垢? Console (`#devConsole`) 憿舐內蝟餌絞?亥?.
