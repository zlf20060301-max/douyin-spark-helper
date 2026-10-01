# 启动已构建的应用
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$env:ELECTRON_RUN_AS_NODE = $null
if (!(Test-Path "out/main/index.js")) { npx electron-vite build }
npx electron .
