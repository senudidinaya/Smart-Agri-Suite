$ErrorActionPreference = "SilentlyContinue"

# 1. Ensure target directories exist
New-Item -ItemType Directory -Force frontend
New-Item -ItemType Directory -Force backend

# 2. Files and folders belonging to frontend
$frontendItems = @(
    "app",
    "assets",
    "components",
    "constants",
    "context",
    "data",
    "hooks",
    "lib",
    "scripts",
    "services",
    "app.json",
    "babel.config.js",
    "eslint.config.js",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "expo-env.d.ts",
    ".expo",
    "android",
    ".vscode"
)

foreach ($item in $frontendItems) {
    if (Test-Path $item) {
        Move-Item -Path $item -Destination "frontend\$item" -Force
    }
}

# 3. Files and folders belonging to backend
# There's already a "backend" folder, we will move "smart-agri-backend" contents into it
$backendItems = Get-ChildItem -Path "smart-agri-backend"
foreach ($item in $backendItems) {
    Move-Item -Path $item.FullName -Destination "backend\$($item.Name)" -Force
}
if (Test-Path "smart-agri-backend") {
    Remove-Item "smart-agri-backend" -Recurse -Force
}

# Move ML directory and pricing dataset
if (Test-Path "ml") {
    Move-Item "ml" "backend\" -Force
}
if (Test-Path "pricing_dataset.csv") {
    Move-Item "pricing_dataset.csv" "backend\" -Force
}

# Remove log files to clean up
Remove-Item "push_log.txt" -Force
Remove-Item "push_log_utf8.txt" -Force

# Add everything to git
git add -A
