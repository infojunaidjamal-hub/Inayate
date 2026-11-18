# Maison Bags: safai script (kuch DELETE nahi hota, sab "_cleanup-removed-..." folder mein chala jata hai)
# Kaise chalayein: maison-bags folder ke andar PowerShell kholein, phir:   .\cleanup.ps1
# Sab theek chale to baad mein wo "_cleanup-removed-..." folder khud delete kar dein. Gadbad lage to usme se wapas rakh dein.
$ErrorActionPreference = "Stop"
if (-not (Test-Path ".\package.json") -or -not (Test-Path ".\src")) { Write-Host "Ye script maison-bags folder ke andar chalayein (jahan package.json hai)."; exit 1 }

$items = @(
  "backup-accountarea", "backup-adminlogin", "backup-blog-carousel", "backup-checkout", "backup-galleryfix", "backup-productpage", "backup-shopredesign",
  "shopredesign", "PEHLE-PADHO.txt", ".env.backup",
  "public\next.svg", "public\window.svg", "public\globe.svg", "public\vercel.svg", "public\file.svg",
  "public\home\mk-amazon.png.png", "public\home\mk-flipkart.png.png", "public\home\mk-meesho.png.png", "public\home\mk-myntra.png.png",
  "src\components\Gallery.js", "src\app\seller\register\RegisterForm.js", "src\app\seller\register\actions.js",
  ".next"   # build ka cache, npm run dev / build par apne aap wapas ban jata hai
)
# add-razorpay-columns.mjs tabhi hatao jab src\lib\db.js khud ye columns bana raha ho (cleaned zip wali db.js)
if (Select-String -Path ".\src\lib\db.js" -Pattern "razorpay_payment_id" -Quiet) { $items += "add-razorpay-columns.mjs" }
else { Write-Host "NOTE: add-razorpay-columns.mjs rakh raha hu, kyunki aapki src\lib\db.js mein razorpay columns wala badlav nahi hai." }

$dest = "_cleanup-removed-" + (Get-Date -Format "yyyyMMdd-HHmm")
New-Item -ItemType Directory $dest | Out-Null
foreach ($i in $items) {
  if (Test-Path $i) {
    $t = Join-Path $dest $i
    New-Item -ItemType Directory -Force (Split-Path $t) | Out-Null
    Move-Item $i $t
    Write-Host "hataya: $i"
  } else { Write-Host "(pehle se nahi hai) $i" }
}
Write-Host ""
Write-Host "Ho gaya. Ab 'npm run dev' chalakar check karein. Sab theek ho to $dest folder delete kar dein."
