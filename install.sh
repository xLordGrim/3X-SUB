VERSION="2.0"
TIMESTAMP=$(date +%s)

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
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
    # Try to detect from the URL used to download this script
    # Default to 'main' for stability
    BRANCH="main"
    
    # Check if script was sourced from development branch
    if curl -s --head "https://raw.githubusercontent.com/xLordGrim/3X-SUB/development/install.sh" | grep -q "200 OK"; then
        # If user explicitly downloaded from development, detect it
        if [ -f "/tmp/xui_installer_dev" ]; then
            BRANCH="development"
        fi
    fi
fi

echo -e "${BLUE}Using branch: ${GREEN}${BRANCH}${NC}"
REPO_URL="https://raw.githubusercontent.com/xLordGrim/3X-SUB/${BRANCH}"

mkdir -p "$ASSETS_PATH/js"
mkdir -p "$ASSETS_PATH/css"
mkdir -p "$HTML_PATH"

echo -e "${BLUE}Backing up existing files...${NC}"
[[ -f "$ASSETS_PATH/js/subscription.js" ]] && cp "$ASSETS_PATH/js/subscription.js" "$ASSETS_PATH/js/subscription.js.bak" 2>/dev/null
[[ -f "$ASSETS_PATH/css/premium.css" ]] && cp "$ASSETS_PATH/css/premium.css" "$ASSETS_PATH/css/premium.css.bak" 2>/dev/null

# Templates & Full Asset Sync (Crucial for Persistence/Debug Mode)
echo -e "${BLUE}Syncing official web assets for full compatibility...${NC}"
if ! command -v unzip &> /dev/null; then
    echo -e "${BLUE}🔧 Installing unzip...${NC}"
    apt-get install unzip -y >/dev/null 2>&1 || yum install unzip -y >/dev/null 2>&1
fi

TEMP_ZIP="/tmp/3x-ui-main.zip"
curl -Ls "https://github.com/MHSanaei/3x-ui/archive/refs/heads/main.zip" -o "$TEMP_ZIP"
mkdir -p "/tmp/3x-ui-extract"
unzip -qo "$TEMP_ZIP" -d "/tmp/3x-ui-extract"

# Copy official web folder to local x-ui root
cp -rf /tmp/3x-ui-extract/3x-ui-main/web/* "$BASE_PATH/"
rm -rf "$TEMP_ZIP" "/tmp/3x-ui-extract"

echo -e "${BLUE}Fetching assets...${NC}"
#  Assets (Overwriting official ones where needed)
# Use TIMESTAMP to bust GitHub CDN cache
curl -Ls "$REPO_URL/web/assets/js/subscription.js?v=$TIMESTAMP" -o "$ASSETS_PATH/js/subscription.js"
curl -Ls "$REPO_URL/web/assets/css/premium.css?v=$TIMESTAMP" -o "$ASSETS_PATH/css/premium.css"

# Templates (Crucial for Persistence/Debug Mode)
echo -e "${BLUE}Fetching assets...${NC}"

# Templates (Crucial for Persistence/Debug Mode)
SUBPAGE_PATH="$HTML_PATH/settings/panel/subscription/subpage.html"
mkdir -p $(dirname "$SUBPAGE_PATH")
# Download subpage.html from repo
curl -Ls "$REPO_URL/web/html/settings/panel/subscription/subpage.html?v=$VERSION" -o "$SUBPAGE_PATH"

# CACHE BUSTING: Inject installation timestamp to force browser update
# Regex ensures it replaces ANY existing query string or template tag
sed -i -E "s|assets/css/premium.css(\?[^\"']*)?|assets/css/premium.css?v=$TIMESTAMP|g" "$SUBPAGE_PATH"
sed -i -E "s|assets/js/subscription.js(\?[^\"']*)?|assets/js/subscription.js?v=$TIMESTAMP|g" "$SUBPAGE_PATH"

# Internal JS Cache Busting (Inject into the file itself)
sed -i "s|__VERSION__|$TIMESTAMP|g" "$ASSETS_PATH/js/subscription.js"

# Clear stale ISP cache to force fresh detection on install/update
[[ -f "/usr/local/x-ui/isp_info.json" ]] && rm -f "/usr/local/x-ui/isp_info.json"

chmod -R 755 "$BASE_PATH"

echo -e "${BLUE}Injecting Persistence (Update Survival)...${NC}"
SERVICE_FILE="/etc/systemd/system/x-ui.service"
if [[ -f "$SERVICE_FILE" ]]; then
    if ! grep -q "XUI_DEBUG=true" "$SERVICE_FILE"; then
        sed -i '/\[Service\]/a Environment="XUI_DEBUG=true"' "$SERVICE_FILE"
        echo -e "${GREEN}Persistence injected successfully!${NC}"
    else
        echo -e "${BLUE}Persistence already enabled.${NC}"
    fi
fi

# --- STATS SERVICE DEPLOYMENT ---
echo -e "${BLUE}Deploying System Stats Monitor Service...${NC}"

STATS_SCRIPT="$XUI_ROOT/server_stats.sh"
STATS_SERVICE="/etc/systemd/system/x-ui-stats.service"
STATS_FILE="$XUI_ROOT/web/assets/css/status.json"

# Create stats collector script
cat <<"EOF" > "$STATS_SCRIPT"
#!/bin/bash
# System Stats Collector for 3x-ui Premium Theme (Enhanced)
JSON_FILE="__STATS_FILE__"
ISP_CACHE="/usr/local/x-ui/isp_info.json"
INTERVAL=2

INTERFACE=$(ip route get 8.8.8.8 2>/dev/null | awk '{print $5; exit}')
[[ -z "$INTERFACE" ]] && INTERFACE=$(ip -o -4 route show to default | awk '{print $5; exit}')

prev_total=0
prev_idle=0
prev_rx=0
prev_tx=0

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
        if [ "$prev_rx" -gt 0 ]; then
            net_in=$(( (rx - prev_rx) / 1024 / INTERVAL ))
            net_out=$(( (tx - prev_tx) / 1024 / INTERVAL ))
        else
            net_in=0
            net_out=0
        fi
        prev_rx=$rx
        prev_tx=$tx
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

# Replace placeholder with actual path
sed -i "s|__STATS_FILE__|$STATS_FILE|g" "$STATS_SCRIPT"
chmod +x "$STATS_SCRIPT"

# Create systemd service
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

# Enable and start service
systemctl daemon-reload
systemctl enable x-ui-stats.service >/dev/null 2>&1
systemctl restart x-ui-stats.service

# Verify service started
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

