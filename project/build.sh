#!/usr/bin/env bash
# 組建腳本：把 src/ 底下拆開維護的小檔案，依照固定順序 cat 回單一 HTML。
# 用法：./build.sh  → 產生 dist/tournament.html
#
# 為什麼用 cat 而不是 esbuild/webpack：這個專案本來就是純手刻的
# vanilla JS + CSS（沒有 import/export、沒有打包器語法），檔案彼此
#靠「載入順序」共用全域函式與變數，所以最簡單也最不會出錯的組建
# 方式就是照原本的順序原樣接回去——不做轉譯、不做壓縮，組出來的
# 檔案在瀏覽器裡的行為跟拆檔前完全一樣。
#
# 如果之後想換成 esbuild 之類的工具（例如想要 minify、想要用
# import/export 模組語法），可以之後再把 src/js 下的檔案逐步改寫
# 成 ES module，這份 build.sh 不會擋路。

set -euo pipefail
cd "$(dirname "$0")"

OUT="dist/tournament.html"
mkdir -p dist

JS_DIR="src/js"
# 主要 <script> 內容依檔名數字順序接回（01-, 02-, ... 33-）；
# 00- 開頭的那支是 Firebase 初始化，型別是 <script type="module">，
# 必須獨立輸出，不能跟其他程式碼混在同一個 <script> 標籤裡。
MAIN_JS_FILES=$(ls "$JS_DIR" | grep -E '^[0-9]{2}-' | grep -v '^00-' | sort)

{
  cat src/head.html
  printf '<style>\n'
  cat src/css/base.css
  printf '</style>\n<style id="gaming-aesthetics">\n'
  cat src/css/gaming-theme.css
  cat src/tail-after-gaming-css.html
  printf '<script type="module">\n'
  cat "$JS_DIR/00-cloud-sync-firebase-init.js"
  printf '</script>\n'
  cat src/body.html
  cat src/html2canvas-tag.html
  printf '<script>\n'
  for f in $MAIN_JS_FILES; do
    cat "$JS_DIR/$f"
  done
  printf '</script>\n\n</body>\n</html>\n'
} > "$OUT"

echo "已產生 $OUT（$(wc -l < "$OUT") 行）"
