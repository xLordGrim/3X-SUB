#!/bin/bash

VERSION="2.0"
TIMESTAMP=$(date +%s)

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}💎 Starting 3x-ui Subscription Theme Installation...${NC}"
echo -e "${RED}⚠️  NOTICE: This project is for EDUCATIONAL PURPOSES ONLY.${NC}"
echo -e "${RED}⚠️  The user is solely responsible for any consequences or damages.${NC}"
echo -e "${RED}⚠️  USE AT YOUR OWN RISK.${NC}"
sleep 2

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (sudo bash install.sh)${NC}"
  exit
fi

XUI_ROOT="/usr/local/x-ui"
BASE_PATH="$XUI_ROOT/web"
ASSETS_PATH="$BASE_PATH/assets"
HTML_PATH="$BASE_PATH/html"

if [ -z "$BRANCH" ]; then
    BRANCH="main"
    if curl -s --head "https://raw.githubusercontent.com/xLordGrim/3X-SUB/development/install.sh" | grep -q "200 OK"; then
        if [ -f "/tmp/xui_installer_dev" ]; then
            BRANCH="development"
        fi
    fi
fi

echo -e "${BLUE}Using branch: ${GREEN}${BRANCH}${NC}"
REPO_URL="https://raw.githubusercontent.com/xLordGrim/3X-SUB/${BRANCH}"

# Detect 3x-ui version
RAW_VER=$( (/usr/local/x-ui/x-ui -v 2>&1 || /usr/local/x-ui/x-ui --version 2>&1 || /usr/local/x-ui/x-ui version 2>&1) | grep -iEo '[0-9]+\.[0-9]+\.[0-9]+' | head -n 1)

if [[ -z "$RAW_VER" ]]; then
    echo -e "${RED}Could not detect 3x-ui version. Assuming unsupported or broken installation.${NC}"
    exit 1
fi

echo -e "${BLUE}Detected local 3x-ui version: ${GREEN}v${RAW_VER}${NC}"

# Check if version is < 2.8.4
if [ "$(printf '%s\n' "2.8.4" "$RAW_VER" | sort -V | head -n1)" = "$RAW_VER" ] && [ "$RAW_VER" != "2.8.4" ]; then
    echo -e "${RED}❌ Version v$RAW_VER is not supported. Please upgrade to at least v2.8.4.${NC}"
    exit 1
fi

# Determine if we are on v3.0.0+
IS_V3=false
if [ "$(printf '%s\n' "3.0.0" "$RAW_VER" | sort -V | head -n1)" = "3.0.0" ]; then
    IS_V3=true
fi

# Set Stats file path depending on version
if [ "$IS_V3" = true ]; then
    STATS_FILE="$XUI_ROOT/web/dist/assets/css/status.json"
    mkdir -p "$XUI_ROOT/web/dist/assets/css"
else
    STATS_FILE="$XUI_ROOT/web/assets/css/status.json"
    mkdir -p "$ASSETS_PATH/js"
    mkdir -p "$ASSETS_PATH/css"
    mkdir -p "$HTML_PATH"
fi

if [ "$IS_V3" = true ]; then
    echo -e "${BLUE}v3.0.0+ detected. Installing pre-compiled custom binary...${NC}"
    
    ARCH=$(uname -m)
    if [[ "$ARCH" == "x86_64" ]]; then
        XUI_BIN_URL="https://github.com/xLordGrim/3X-SUB/releases/latest/download/x-ui-linux-amd64"
    elif [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
        XUI_BIN_URL="https://github.com/xLordGrim/3X-SUB/releases/latest/download/x-ui-linux-arm64"
    else
        echo -e "${RED}❌ Architecture $ARCH is not supported for v3.0.0+ pre-compiled binaries.${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Stopping x-ui service...${NC}"
    systemctl stop x-ui
    
    echo -e "${BLUE}Backing up original binary...${NC}"
    cp /usr/local/x-ui/x-ui /usr/local/x-ui/x-ui.bak
    
    echo -e "${YELLOW}Removing legacy debug mode to fix assets...${NC}"
    find /etc/systemd /lib/systemd /usr/lib/systemd -type f -name "x-ui.service" -exec sed -i '/XUI_DEBUG/d' {} + 2>/dev/null
    sed -i '/XUI_DEBUG/d' /etc/environment 2>/dev/null
    systemctl daemon-reload
    
    echo -e "${BLUE}Downloading custom binary for $ARCH...${NC}"
    HTTP_STATUS=$(curl -sL -w "%{http_code}" "$XUI_BIN_URL" -o /usr/local/x-ui/x-ui.new)
    if [[ "$HTTP_STATUS" != "200" ]]; then
        echo -e "${RED}❌ Failed to download custom binary (HTTP $HTTP_STATUS).${NC}"
        echo -e "${YELLOW}Ensure the 'Build Custom 3x-ui' GitHub Action has run successfully and published a release!${NC}"
        echo -e "${BLUE}Restoring original binary...${NC}"
        cp /usr/local/x-ui/x-ui.bak /usr/local/x-ui/x-ui
        systemctl start x-ui
        exit 1
    fi
    
    mv /usr/local/x-ui/x-ui.new /usr/local/x-ui/x-ui
    chmod +x /usr/local/x-ui/x-ui
    
    # Internal JS Cache Busting (Since we download a pre-compiled binary, we rely on the action to inject it)
    # But we can clear ISP cache
    [[ -f "/usr/local/x-ui/isp_info.json" ]] && rm -f "/usr/local/x-ui/isp_info.json"

else
    echo -e "${BLUE}v2.x detected. Installing via legacy static file injection...${NC}"
    
    echo -e "${BLUE}Backing up existing files...${NC}"
    [[ -f "$ASSETS_PATH/js/subscription.js" ]] && cp "$ASSETS_PATH/js/subscription.js" "$ASSETS_PATH/js/subscription.js.bak" 2>/dev/null
    [[ -f "$ASSETS_PATH/css/premium.css" ]] && cp "$ASSETS_PATH/css/premium.css" "$ASSETS_PATH/css/premium.css.bak" 2>/dev/null

    echo -e "${BLUE}Syncing official web assets for full compatibility...${NC}"
    if ! command -v unzip &> /dev/null; then
        echo -e "${BLUE}🔧 Installing unzip...${NC}"
        apt-get install unzip -y >/dev/null 2>&1 || yum install unzip -y >/dev/null 2>&1
    fi

    LOCAL_VER="v${RAW_VER}"
    ARCHIVE_URL="https://github.com/MHSanaei/3x-ui/archive/refs/tags/${LOCAL_VER}.zip"
    EXTRACT_FOLDER="3x-ui-${RAW_VER}"
    
    if curl -s --head "$ARCHIVE_URL" | head -n 1 | grep -E "200|301|302" >/dev/null; then
        echo -e "${GREEN}Downloading version-matched assets to ensure compatibility.${NC}"
    else
        echo -e "${RED}Version tag not found on GitHub. Falling back to latest main branch.${NC}"
        ARCHIVE_URL="https://github.com/MHSanaei/3x-ui/archive/refs/heads/main.zip"
        EXTRACT_FOLDER="3x-ui-main"
    fi

    TEMP_ZIP="/tmp/3x-ui-assets.zip"
    curl -Ls "$ARCHIVE_URL" -o "$TEMP_ZIP"
    mkdir -p "/tmp/3x-ui-extract"
    unzip -qo "$TEMP_ZIP" -d "/tmp/3x-ui-extract"

    cp -rf "/tmp/3x-ui-extract/${EXTRACT_FOLDER}/web/"* "$BASE_PATH/"
    rm -rf "$TEMP_ZIP" "/tmp/3x-ui-extract"

    echo -e "${BLUE}Fetching custom theme assets...${NC}"
    curl -Ls "$REPO_URL/web/assets/js/subscription.js?v=$TIMESTAMP" -o "$ASSETS_PATH/js/subscription.js"
    curl -Ls "$REPO_URL/web/assets/css/premium.css?v=$TIMESTAMP" -o "$ASSETS_PATH/css/premium.css"

    SUBPAGE_PATH="$HTML_PATH/settings/panel/subscription/subpage.html"
    mkdir -p $(dirname "$SUBPAGE_PATH")
    curl -Ls "$REPO_URL/web/html/settings/panel/subscription/subpage.html?v=$VERSION" -o "$SUBPAGE_PATH"

    sed -i "s|assets/css/premium.css?{{ .cur_ver }}|assets/css/premium.css?v=$TIMESTAMP|g" "$SUBPAGE_PATH"
    sed -i "s|assets/js/subscription.js?{{ .cur_ver }}|assets/js/subscription.js?v=$TIMESTAMP|g" "$SUBPAGE_PATH"
    sed -i "s|__VERSION__|$TIMESTAMP|g" "$ASSETS_PATH/js/subscription.js"

    [[ -f "/usr/local/x-ui/isp_info.json" ]] && rm -f "/usr/local/x-ui/isp_info.json"
    chmod -R 755 "$BASE_PATH"

    SERVICE_FILE="/etc/systemd/system/x-ui.service"
    if [[ -f "$SERVICE_FILE" ]]; then
        if ! grep -q "XUI_DEBUG=true" "$SERVICE_FILE"; then
            sed -i '/\[Service\]/a Environment="XUI_DEBUG=true"' "$SERVICE_FILE"
            echo -e "${GREEN}Persistence injected successfully!${NC}"
        fi
    fi
fi

# --- STATS SERVICE DEPLOYMENT ---
echo -e "${BLUE}Deploying System Stats Monitor Service...${NC}"

STATS_SCRIPT="$XUI_ROOT/server_stats.sh"
STATS_SERVICE="/etc/systemd/system/x-ui-stats.service"

cat <<"EOF" > "$STATS_SCRIPT"
#!/bin/bash
JSON_FILE="__STATS_FILE__"
ISP_CACHE="/usr/local/x-ui/isp_info.json"
INTERVAL=2

INTERFACE=$(ip route get 8.8.8.8 2>/dev/null | awk '{print $5; exit}')
[[ -z "$INTERFACE" ]] && INTERFACE=$(ip -o -4 route show to default | awk '{print $5; exit}')

prev_total=0
prev_idle=0
prev_rx=0
prev_tx=0
prev_uptime=$(cat /proc/uptime | awk '{print $1}')

detect_infrastructure() {
    if [ ! -s "$ISP_CACHE" ]; then
        IP_DATA=$(curl -s --max-time 10 http://ip-api.com/json/)
        if [[ -z "$IP_DATA" || "$IP_DATA" == *"fail"* ]]; then
            IP_DATA=$(curl -s --max-time 10 https://ipinfo.io/json)
            ISP=$(echo "$IP_DATA" | grep -oE "\"org\"\s*:\s*\"[^\"]*\"" | sed -E "s/\"org\"\s*:\s*\"//g" | sed 's/"$//g' | sed 's/^AS[0-9]* //')
            REGION=$(echo "$IP_DATA" | grep -oE "\"city\"\s*:\s*\"[^\"]*\"" | sed -E "s/\"city\"\s*:\s*\"//g" | sed 's/"$//g')
        else
            ISP=$(echo "$IP_DATA" | grep -oE "\"isp\"\s*:\s*\"[^\"]*\"" | sed -E "s/\"isp\"\s*:\s*\"//g" | sed 's/"$//g')
            REGION=$(echo "$IP_DATA" | grep -oE "\"city\"\s*:\s*\"[^\"]*\"" | sed -E "s/\"city\"\s*:\s*\"//g" | sed 's/"$//g')
        fi
        [[ -z "$ISP" ]] && ISP="Unknown Provider"
        [[ -z "$REGION" ]] && REGION="Unknown Region"
        echo "{\"isp\":\"$ISP\",\"region\":\"$REGION\"}" > "$ISP_CACHE"
    fi
}

detect_infrastructure

while true; do
    if [ -f "$ISP_CACHE" ]; then
        ISP_DATA=$(cat "$ISP_CACHE")
        ISP=$(echo "$ISP_DATA" | grep -oE "\"isp\":\"[^\"]*\"" | cut -d'"' -f4)
        REGION=$(echo "$ISP_DATA" | grep -oE "\"region\":\"[^\"]*\"" | cut -d'"' -f4)
    else
        ISP="Detecting..."
        REGION="..."
    fi

    read cpu a b c idle rest < /proc/stat
    total=$((a+b+c+idle))
    
    if [ "$prev_total" -gt 0 ]; then
        diff_total=$((total-prev_total))
        diff_idle=$((idle-prev_idle))
        if [ "$diff_total" -gt 0 ]; then
            cpu_usage=$((100*(diff_total-diff_idle)/diff_total))
        else
            cpu_usage=0
        fi
    else
        cpu_usage=0
    fi
    
    prev_total=$total
    prev_idle=$idle
    
    mem_info=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2}')
    ram_usage=${mem_info%.*}

    if [ -n "$INTERFACE" ]; then
        read rx tx < <(grep "$INTERFACE" /proc/net/dev | awk '{print $2, $10}')
        curr_uptime=$(cat /proc/uptime | awk '{print $1}')
        if [ "$prev_rx" -gt 0 ]; then
            read net_in net_out < <(awk -v rx="$rx" -v prx="$prev_rx" -v tx="$tx" -v ptx="$prev_tx" -v curr="$curr_uptime" -v prev="$prev_uptime" 'BEGIN {
                dt = curr - prev;
                if (dt <= 0) dt = 1;
                printf "%d %d\n", (rx - prx) / 1024 / dt, (tx - ptx) / 1024 / dt
            }')
        else
            net_in=0
            net_out=0
        fi
        prev_rx=$rx
        prev_tx=$tx
        prev_uptime=$curr_uptime
    else
        net_in=0
        net_out=0
    fi
    
    echo "{\"cpu\":$cpu_usage,\"ram\":$ram_usage,\"net_in\":$net_in,\"net_out\":$net_out,\"isp\":\"$ISP\",\"region\":\"$REGION\"}" > "$JSON_FILE.tmp"
    mv "$JSON_FILE.tmp" "$JSON_FILE"
    chmod 644 "$JSON_FILE"
    
    sleep $INTERVAL
done
EOF

sed -i "s|__STATS_FILE__|$STATS_FILE|g" "$STATS_SCRIPT"
chmod +x "$STATS_SCRIPT"

cat <<"EOF" > "$STATS_SERVICE"
[Unit]
Description=3x-ui System Stats Monitor
After=network.target

[Service]
Type=simple
User=root
ExecStart=/bin/bash __STATS_SCRIPT__
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sed -i "s|__STATS_SCRIPT__|$STATS_SCRIPT|g" "$STATS_SERVICE"

systemctl daemon-reload
systemctl enable x-ui-stats.service >/dev/null 2>&1
systemctl restart x-ui-stats.service

if systemctl is-active --quiet x-ui-stats.service; then
    echo -e "${GREEN}✅ Stats monitor deployed and running${NC}"
else
    echo -e "${YELLOW}⚠️  Stats service deployed but failed to start (stats grid will show 0%)${NC}"
fi

echo -e "${BLUE}Refreshing systemd & Restarting x-ui...${NC}"
systemctl daemon-reload
if command -v x-ui &> /dev/null; then
    x-ui restart
else
    systemctl restart x-ui
fi

echo -e "${GREEN}✅ 3X-UI Subscription Theme installed Successfully${NC}"
echo -e "${GREEN}🔧 Turn on the Inbuilt Subscription System (If not enabled)${NC}"
