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

echo -e "\n${BLUE}Would you like to run the official 3x-ui installer to ensure a 100% clean state?${NC}"
while true; do
    echo -e "  1) Yes, run official installer (Recommended if UI still looks modified)"
    echo -e "  2) No, I'm done"
    read -p "Selection [1-2]: " choice
    case $choice in
        1)
            echo -e "${YELLOW}🚀 Launching official installer...${NC}"
            bash <(curl -Ls https://raw.githubusercontent.com/mhsanaei/3x-ui/master/install.sh)
            break
            ;;
        2)
            break
            ;;
        *)
            echo -e "${RED}Invalid selection '$choice'. Please enter 1 or 2.${NC}"
            ;;
    esac
done

echo -e "\n${GREEN}✅ Uninstallation completed Successfully${NC}"
echo -e "${BLUE}Note: Please clear your browser cache to ensure the stock UI loads correctly.${NC}"
