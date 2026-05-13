#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}💎 Starting 3x-ui Subscription Theme Uninstallation...${NC}"

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (sudo bash uninstall.sh)${NC}"
  exit 1
fi

XUI_ROOT="/usr/local/x-ui"
# Detect current 3x-ui version
RAW_VER=$( (/usr/local/x-ui/x-ui -v 2>&1 || /usr/local/x-ui/x-ui --version 2>&1 || /usr/local/x-ui/x-ui version 2>&1) | grep -iEo '[0-9]+\.[0-9]+\.[0-9]+' | head -n 1)
if [[ -n "$RAW_VER" ]]; then
    VERSION_ARG="v$RAW_VER"
else
    VERSION_ARG="master"
fi

echo -e "${YELLOW}⚠️  Stopping and removing Stats Monitor Service...${NC}"
systemctl stop x-ui-stats.service 2>/dev/null
systemctl disable x-ui-stats.service 2>/dev/null
rm -f /etc/systemd/system/x-ui-stats.service
rm -f "$XUI_ROOT/server_stats.sh"
rm -f "$XUI_ROOT/stats_history.cache"
rm -f "$XUI_ROOT/isp_info.json"
echo -e "${GREEN}✅ Stats monitor removed.${NC}"

echo -e "${YELLOW}🔄 Restoring original binary...${NC}"
if [[ -f "$XUI_ROOT/x-ui.bak" ]]; then
    # Stop service before moving binary
    systemctl stop x-ui 2>/dev/null
    mv "$XUI_ROOT/x-ui.bak" "$XUI_ROOT/x-ui"
    chmod +x "$XUI_ROOT/x-ui"
    echo -e "${GREEN}✅ Binary restored from backup.${NC}"
else
    echo -e "${BLUE}No binary backup found. Skipping binary restoration.${NC}"
fi

echo -e "${YELLOW}🧹 Cleaning up web assets...${NC}"
# Auto-detect web path similar to install.sh
if [ -d "$XUI_ROOT/bin/web" ]; then
    BASE_PATH="$XUI_ROOT/bin/web"
else
    BASE_PATH="$XUI_ROOT/web"
fi
ASSETS_PATH="$BASE_PATH/assets"

# Restore legacy backups
if [[ -f "$ASSETS_PATH/js/subscription.js.bak" ]]; then
    mv "$ASSETS_PATH/js/subscription.js.bak" "$ASSETS_PATH/js/subscription.js"
    echo -e "${GREEN}✅ Legacy Javascript restored.${NC}"
fi
if [[ -f "$HTML_PATH/settings/panel/subscription/subpage.html.bak" ]]; then
    mv "$HTML_PATH/settings/panel/subscription/subpage.html.bak" "$HTML_PATH/settings/panel/subscription/subpage.html"
    echo -e "${GREEN}✅ Legacy Subscription page restored.${NC}"
fi

# Remove our custom files
rm -f "$ASSETS_PATH/css/premium.css"
rm -f "$ASSETS_PATH/css/status.json"
rm -f "$BASE_PATH/dist/assets/css/status.json"
echo -e "${GREEN}✅ Premium assets removed.${NC}"

echo -e "${BLUE}Disabling debugging environment...${NC}"
SERVICE_FILES=("/etc/systemd/system/x-ui.service" "/lib/systemd/system/x-ui.service")
for FILE in "${SERVICE_FILES[@]}"; do
    if [[ -f "$FILE" ]]; then
        sed -i '/XUI_DEBUG/d' "$FILE"
        echo -e "${GREEN}Cleaned service file: $FILE${NC}"
    fi
done

echo -e "${BLUE}Refreshing systemd & Restarting x-ui...${NC}"
systemctl daemon-reload
if command -v x-ui &> /dev/null; then
    x-ui restart
else
    systemctl restart x-ui
fi

echo -e "${BLUE}🚀 Re-installing official 3x-ui ${VERSION_ARG} (Clean Restoration)...${NC}"
echo -e "${YELLOW}Please stay connected, the official installer will now take over.${NC}"
sleep 2

bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh) "$VERSION_ARG"

if [[ $? -eq 0 ]]; then
    echo -e "\n${GREEN}✅ Uninstallation and official restoration completed Successfully${NC}"
else
    echo -e "\n${RED}❌ Official restoration encountered an issue. Please check the logs above.${NC}"
fi

echo -e "${BLUE}Note: Please clear your browser cache to ensure the stock UI loads correctly.${NC}"
