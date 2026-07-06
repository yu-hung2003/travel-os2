# Travel OS

Offline-first Travel Operating System（PWA · Mobile First）

第一個旅程：2026 京阪夏日 7 天 6 夜。

## 本機開發

```bash
npm install     # 第一次執行,安裝套件
npm run dev     # 開發模式,瀏覽器開 http://localhost:5173
npm run build   # 產出正式版到 dist/
npm run preview # 在本機預覽正式版(含 PWA Service Worker)
```

> PWA / 離線功能只在 `build + preview` 或正式部署後生效,`npm run dev` 不會註冊 Service Worker,這是正常的。

## 技術棧

React 18 · TypeScript (strict) · Vite · Tailwind CSS · Zustand · Dexie (IndexedDB) · vite-plugin-pwa

## 專案結構

```
src/
├─ app/          路由、App Shell、Bottom Navigation
├─ features/     功能垂直切分（dashboard / timeline / trips / expense / map / more）
├─ data/         Dexie schema 與 Repository（UI 不直接碰資料庫）
├─ domain/       純型別與商業邏輯,零依賴
├─ shared/       共用元件與 hooks
└─ styles/       主題 tokens（Light / Dark / Auto）
```

## Roadmap

- [x] Phase 1 骨架:路由、主題、Bottom Nav、Dexie schema
- [x] Phase 2 Trip 資料模型 + 京阪行程匯入
- [x] Phase 3 Timeline(狀態機、拖曳、備註)
- [x] Phase 4 Dashboard 今日視圖
- [x] Phase 5 Expense
- [x] Phase 6 PWA 離線化 + iOS 安裝優化
- [x] Phase 7 成員制記帳 + Packing 行李清單(Journal 依需求跳過)
- [x] Phase 7.5 機場接送 / 交通編輯與導航深連結 / 餐廳口袋名單
- [x] Phase 8 Weather(OpenWeather)+ Leaflet 地圖整合
- [x] Phase 9 智慧提醒(本地規則引擎:延誤偵測、截止提醒、高溫/降雨計畫)
- [x] Phase 10 停留時間制排程引擎 + 每日行程版本 + 打烊警示
- [x] Phase 11 交通欄位擴充 + JPY/TWD 匯率(多頁面試算工具)+ 口袋名單個人評分
- [x] Phase 12 景點/餐廳結構化資訊 + Google 評論深連結
- [x] Phase 13 Firebase 家庭同步(同步碼房間制、離線合併、LWW)
