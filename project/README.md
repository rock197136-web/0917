# BEYBLADE X 對戰系統 — 拆檔開發版

## 結構
```
src/
  head.html                    <head> 內的 meta 標籤區塊
  css/
    base.css                   主要視覺系統（header／tabs／card／按鈕／裁判台…）
    gaming-theme.css           橙金電競主題覆蓋層（CSS 變數 + 局部樣式）
  tail-after-gaming-css.html   </style></head><body> 與雲端同步說明註解
  js/
    00-cloud-sync-firebase-init.js   Firebase 初始化（type="module"，獨立於主程式）
    01-constants.js ... 33-helpers.js  依原檔的區塊註解切出的 33 個模組，
                                        檔名數字＝原本的載入順序，不可打亂
  body.html                    <body> 內的可見畫面結構（header/tabs/卡片/彈窗markup）
  html2canvas-tag.html         外部 CDN <script> 標籤（產生賽後戰報圖用）
build.sh                       組建腳本
dist/tournament.html           組建後的單檔成品（部署用這個）
```

## 開發流程
1. 平常改哪個功能，就開對應的小檔案（例如要改裁判計分邏輯 → `src/js/16-match-scoring.js`，
   要改對戰樹視覺 → `src/js/21-render-bracket-tree.js`）。
2. 改完執行 `./build.sh`，會在 `dist/tournament.html` 產生組好的單一檔案。
3. 把 `dist/tournament.html` 部署到 GitHub Pages（跟你現在的部署方式完全一樣，
   使用者拿到的還是一個檔案，行為不會有任何差異）。

## 重要限制（因為是純 cat 串接，不是真的模組系統）
- `js/` 底下的檔案彼此用「全域函式／變數」互相呼叫，**沒有** import/export，
  所以 `build.sh` 裡的串接順序（檔名數字前綴）必須維持原本的順序，
  不能因為看起來像獨立模組就任意搬動或砍掉某個檔案的載入。
- 如果之後想升級成真的 ES module（可以互相 `import`、可以 tree-shaking、
  可以用 esbuild 打包壓縮），需要把每個檔案內的函式改成 `export function ...`，
  並把呼叫端改成 `import`，這是後續可以逐步做的重構，目前這版本先解決
  「單檔案太大不好維護」這個最痛的問題，行為保證跟原檔一模一樣
  （已用 diff 驗證 byte-for-byte 相同，並在瀏覽器實測無 JS 錯誤）。

## 驗證方式
```
diff dist/tournament.html <原始檔案.html>   # 應該完全沒有差異
```
