#!/bin/bash

VERSION="2.0"
TIMESTAMP=$(date +%s)

# ┌─────────────────────────────────────────────────────┐
# │ CHANNEL CONFIG — defaults to main (stable)          │
# │ development branch overrides this to "development"  │
# │ No changes needed when merging to main.             │
# └─────────────────────────────────────────────────────┘
BRANCH="${BRANCH:-main}"

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

echo -e "${BLUE}Channel: ${GREEN}${BRANCH}${NC}"
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
    # Auto-detect web path for legacy v2.x
    if [ -d "$XUI_ROOT/bin/web" ]; then
        BASE_PATH="$XUI_ROOT/bin/web"
    else
        BASE_PATH="$XUI_ROOT/web"
    fi
    ASSETS_PATH="$BASE_PATH/assets"
    HTML_PATH="$BASE_PATH/html"
    
    STATS_FILE="$ASSETS_PATH/css/status.json"
    mkdir -p "$ASSETS_PATH/js"
    mkdir -p "$ASSETS_PATH/css"
    mkdir -p "$HTML_PATH"
fi

if [ "$IS_V3" = true ]; then
    echo -e "${BLUE}v3.0.0+ detected. Installing pre-compiled custom binary...${NC}"

    # Build the release tag from the detected x-ui version
    # development branch → v3.0.0-dev, main branch → v3.0.0
    if [[ "$BRANCH" == "main" ]]; then
        RELEASE_TAG="v${RAW_VER}"
    else
        RELEASE_TAG="v${RAW_VER}-dev"
    fi
    echo -e "${BLUE}Channel: ${BRANCH} | Release: ${RELEASE_TAG}${NC}"
    
    ARCH=$(uname -m)
    if [[ "$ARCH" == "x86_64" ]]; then
        XUI_BIN_URL="https://github.com/xLordGrim/3X-SUB/releases/download/${RELEASE_TAG}/x-ui-linux-amd64"
    elif [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
        XUI_BIN_URL="https://github.com/xLordGrim/3X-SUB/releases/download/${RELEASE_TAG}/x-ui-linux-arm64"
    else
        echo -e "${RED}❌ Architecture $ARCH is not supported for v3.0.0+ pre-compiled binaries.${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Stopping x-ui service...${NC}"
    systemctl stop x-ui
    
    echo -e "${BLUE}Backing up original binary...${NC}"
    cp /usr/local/x-ui/x-ui /usr/local/x-ui/x-ui.bak
    OLD_SIZE=$(stat -c%s /usr/local/x-ui/x-ui 2>/dev/null || echo "0")
    echo -e "${BLUE}Current binary size: ${OLD_SIZE} bytes${NC}"
    
    echo -e "${YELLOW}Removing legacy debug mode to fix assets...${NC}"
    find /etc/systemd /lib/systemd /usr/lib/systemd -type f -name "x-ui.service" -exec sed -i '/XUI_DEBUG/d' {} + 2>/dev/null
    sed -i '/XUI_DEBUG/d' /etc/environment 2>/dev/null
    systemctl daemon-reload
    
    echo -e "${BLUE}Downloading custom binary for $ARCH from:${NC}"
    echo -e "${YELLOW}  $XUI_BIN_URL${NC}"
    
    TMPFILE="/tmp/x-ui-custom-$$"
    HTTP_STATUS=$(curl -L --progress-bar -w "%{http_code}" "$XUI_BIN_URL" -o "$TMPFILE")

    if [[ "$HTTP_STATUS" != "200" ]]; then
        echo -e "${RED}❌ Custom binary for 3x-ui v${RAW_VER} was not found on our server.${NC}"
        echo -e "${YELLOW}This usually happens if you are on a very new 3x-ui version that hasn't been compiled yet.${NC}"
        
        while true; do
            echo -e "${BLUE}What would you like to do?${NC}"
            echo -e "  1) Install the latest available stable binary (Recommended Fallback)"
            echo -e "  2) Exit installer safely (No changes made)"
            read -p "Selection [1-2]: " choice
            
            case $choice in
                1)
                    echo -e "${BLUE}Searching for latest compatible release...${NC}"
                    LATEST_TAG=$(curl -s https://api.github.com/repos/xLordGrim/3X-SUB/releases/latest | grep -oE "\"tag_name\":\s*\"[^\"]*\"" | cut -d'"' -f4)
                    [[ -z "$LATEST_TAG" ]] && LATEST_TAG="v3.0.0-dev"
                    
                    if [[ "$ARCH" == "x86_64" ]]; then
                        XUI_BIN_URL="https://github.com/xLordGrim/3X-SUB/releases/download/${LATEST_TAG}/x-ui-linux-amd64"
                    else
                        XUI_BIN_URL="https://github.com/xLordGrim/3X-SUB/releases/download/${LATEST_TAG}/x-ui-linux-arm64"
                    fi
                    
                    echo -e "${BLUE}Attempting fallback to $LATEST_TAG...${NC}"
                    HTTP_STATUS=$(curl -L --progress-bar -w "%{http_code}" "$XUI_BIN_URL" -o "$TMPFILE")
                    break
                    ;;
                2)
                    echo -e "${BLUE}Exiting safely. Restoring original binary...${NC}"
                    cp /usr/local/x-ui/x-ui.bak /usr/local/x-ui/x-ui
                    systemctl start x-ui
                    exit 0
                    ;;
                *)
                    echo -e "${RED}Invalid selection '$choice'. Please enter 1 or 2.${NC}"
                    ;;
            esac
        done
    fi
    
    echo -e "${BLUE}HTTP Status: $HTTP_STATUS${NC}"
    
    if [[ "$HTTP_STATUS" != "200" ]]; then
        echo -e "${RED}❌ Failed to download custom binary (HTTP $HTTP_STATUS).${NC}"
        echo -e "${YELLOW}Ensure the 'Build Custom 3x-ui' GitHub Action has run and published a release.${NC}"
        echo -e "${BLUE}Restoring original binary...${NC}"
        cp /usr/local/x-ui/x-ui.bak /usr/local/x-ui/x-ui
        systemctl start x-ui
        exit 1
    fi
    
    # Sanity check: make sure we got a binary (ELF), not an HTML page
    MAGIC=$(head -c 4 "$TMPFILE" | xxd -p 2>/dev/null || head -c 4 "$TMPFILE" | od -A n -t x1 | tr -d ' \n')
    NEW_SIZE=$(stat -c%s "$TMPFILE")
    echo -e "${BLUE}Downloaded file size: ${NEW_SIZE} bytes${NC}"
    echo -e "${BLUE}File magic bytes: ${MAGIC}${NC}"
    
    if [[ "$MAGIC" != "7f454c46" ]] && [[ "$MAGIC" != "7f454c46"* ]]; then
        echo -e "${RED}❌ Downloaded file is not a Linux binary (expected ELF magic 7f454c46).${NC}"
        echo -e "${RED}Got: $MAGIC — this looks like an HTML error page.${NC}"
        echo -e "${BLUE}First 200 bytes of downloaded file:${NC}"
        head -c 200 "$TMPFILE"
        rm -f "$TMPFILE"
        cp /usr/local/x-ui/x-ui.bak /usr/local/x-ui/x-ui
        systemctl start x-ui
        exit 1
    fi
    
    echo -e "${GREEN}✓ Valid ELF binary confirmed. Installing...${NC}"
    cp "$TMPFILE" /usr/local/x-ui/x-ui
    chmod +x /usr/local/x-ui/x-ui
    rm -f "$TMPFILE"
    
    # Clear ISP cache
    [[ -f "/usr/local/x-ui/isp_info.json" ]] && rm -f "/usr/local/x-ui/isp_info.json"


else
    echo -e "${BLUE}v2.x detected. Installing via legacy static file injection...${NC}"
    
    echo -e "${BLUE}Backing up existing files...${NC}"
    [[ -f "$ASSETS_PATH/js/subscription.js" ]] && cp "$ASSETS_PATH/js/subscription.js" "$ASSETS_PATH/js/subscription.js.bak" 2>/dev/null
    [[ -f "$ASSETS_PATH/css/premium.css" ]] && cp "$ASSETS_PATH/css/premium.css" "$ASSETS_PATH/css/premium.css.bak" 2>/dev/null
    [[ -f "$HTML_PATH/settings/panel/subscription/subpage.html" ]] && cp "$HTML_PATH/settings/panel/subscription/subpage.html" "$HTML_PATH/settings/panel/subscription/subpage.html.bak" 2>/dev/null
    
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

cat <<'EOF_SCRIPT' > "$STATS_SCRIPT"
#!/bin/bash
JSON_FILE="__STATS_FILE__"
ISP_CACHE="/usr/local/x-ui/isp_info.json"
INTERVAL=2
COUNTER=0

# History Buffers (Persistent Cache)
HISTORY_CACHE="/usr/local/x-ui/stats_history.cache"

save_cache() {
    declare -p H_LIVE H_H1 H_H24 H_D7 H_D30 > "$HISTORY_CACHE.tmp" 2>/dev/null
    mv "$HISTORY_CACHE.tmp" "$HISTORY_CACHE" 2>/dev/null
}

trap 'save_cache; exit 0' SIGTERM SIGINT

if [ -s "$HISTORY_CACHE" ]; then
    source "$HISTORY_CACHE"
else
    declare -a H_LIVE H_H1 H_H24 H_D7 H_D30
fi

# ISP Detection Logic
detect_infrastructure() {
    if [ ! -s "$ISP_CACHE" ]; then
        local ip_data=$(curl -s --max-time 10 http://ip-api.com/json/)
        if [[ -z "$ip_data" || "$ip_data" == *"fail"* ]]; then
            ip_data=$(curl -s --max-time 10 https://ipinfo.io/json)
            ISP=$(echo "$ip_data" | grep -oE "\"org\"\s*:\s*\"[^\"]*\"" | sed -E "s/\"org\"\s*:\s*\"//g" | sed 's/"$//g' | sed 's/^AS[0-9]* //')
            REGION=$(echo "$ip_data" | grep -oE "\"city\"\s*:\s*\"[^\"]*\"" | sed -E "s/\"city\"\s*:\s*\"//g" | sed 's/"$//g')
        else
            ISP=$(echo "$ip_data" | grep -oE "\"isp\"\s*:\s*\"[^\"]*\"" | sed -E "s/\"isp\"\s*:\s*\"//g" | sed 's/"$//g')
            REGION=$(echo "$ip_data" | grep -oE "\"city\"\s*:\s*\"[^\"]*\"" | sed -E "s/\"city\"\s*:\s*\"//g" | sed 's/"$//g')
        fi
        [[ -z "$ISP" ]] && ISP="Unknown Provider"
        [[ -z "$REGION" ]] && REGION="Unknown Region"
        echo "{\"isp\":\"$ISP\",\"region\":\"$REGION\"}" > "$ISP_CACHE"
    else
        local isp_data=$(cat "$ISP_CACHE")
        ISP=$(echo "$isp_data" | grep -oE "\"isp\":\"[^\"]*\"" | cut -d'"' -f4)
        REGION=$(echo "$isp_data" | grep -oE "\"region\":\"[^\"]*\"" | cut -d'"' -f4)
    fi
}
detect_infrastructure

get_net_interface() {
    local iface=$(ip route get 8.8.8.8 2>/dev/null | awk '{print $5; exit}')
    [[ -z "$iface" ]] && iface=$(ip -o -4 route show to default | awk '{print $5; exit}')
    echo "$iface"
}
INTERFACE=$(get_net_interface)

# Optimized Stat Helpers
get_cpu() {
    read _ u n s i io irq sirq steal _ < /proc/stat
    local total=$((u + n + s + i + io + irq + sirq + steal))
    local idle=$i
    echo "$total $idle"
}

get_mem() {
    local mem_total=0 mem_avail=0 mem_free=0 mem_buf=0 mem_cache=0
    while read name val unit; do
        case "$name" in
            MemTotal:) mem_total=$val ;;
            MemAvailable:) mem_avail=$val ;;
            MemFree:)  mem_free=$val ;;
            Buffers:)  mem_buf=$val ;;
            Cached:)   mem_cache=$val ;;
        esac
    done < /proc/meminfo
    
    if [ "$mem_avail" -gt 0 ]; then
        local used=$((mem_total - mem_avail))
    else
        local used=$((mem_total - mem_free - mem_buf - mem_cache))
    fi
    echo "$((used * 100 / mem_total))"
}

prev_cpu=($(get_cpu))
prev_net=($(grep -E "^\s*${INTERFACE}:" /proc/net/dev | sed 's/.*://' | awk '{print $1, $9}' 2>/dev/null || echo "0 0"))
prev_uptime=$(awk '{print int($1 * 1000)}' /proc/uptime 2>/dev/null || echo 0)

join_arr() {
    local IFS=","
    echo "[${*// /,}]"
}

while true; do
    # 1. CPU Usage
    curr_cpu=($(get_cpu))
    diff_total=$((curr_cpu[0] - prev_cpu[0]))
    diff_idle=$((curr_cpu[1] - prev_cpu[1]))
    if [ $diff_total -gt 0 ]; then
        cpu_usage=$((100 * (diff_total - diff_idle) / diff_total))
    else
        cpu_usage=0
    fi
    prev_cpu=("${curr_cpu[@]}")

    # 2. RAM Usage
    ram_usage=$(get_mem)

    # 3. Network Usage
    if [ -n "$INTERFACE" ]; then
        curr_net=($(grep -E "^\s*${INTERFACE}:" /proc/net/dev | sed 's/.*://' | awk '{print $1, $9}' 2>/dev/null || echo "0 0"))
        curr_uptime=$(awk '{print int($1 * 1000)}' /proc/uptime 2>/dev/null || echo 0)
        dt_ms=$((curr_uptime - prev_uptime))
        [[ $dt_ms -le 0 ]] && dt_ms=2000
        
        net_in=$(( (curr_net[0] - prev_net[0]) * 1000 / 1024 / dt_ms ))
        net_out=$(( (curr_net[1] - prev_net[1]) * 1000 / 1024 / dt_ms ))
        [[ $net_in -lt 0 ]] && net_in=0
        [[ $net_out -lt 0 ]] && net_out=0
        
        prev_net=("${curr_net[@]}")
        prev_uptime=$curr_uptime
    else
        net_in=0; net_out=0
    fi

    # 4. History Management (Shift and Prepend)
    POINT="{\"c\":$cpu_usage,\"r\":$ram_usage,\"t\":$(date +%s)}"
    
    update_buffer() {
        local -n arr=$1
        local max=$2
        arr=("$POINT" "${arr[@]:0:max-1}")
    }

    [[ $((COUNTER % 5)) -eq 0 ]] && update_buffer H_LIVE 60
    [[ $((COUNTER % 30)) -eq 0 ]] && update_buffer H_H1 60
    [[ $((COUNTER % 450)) -eq 0 ]] && update_buffer H_H24 96
    [[ $((COUNTER % 1800)) -eq 0 ]] && update_buffer H_D7 168
    [[ $((COUNTER % 10800)) -eq 0 ]] && update_buffer H_D30 120
    
    # Periodic Safety Save (Every 5 minutes = 150 loops)
    [[ $COUNTER -gt 0 && $((COUNTER % 150)) -eq 0 ]] && save_cache

    # 5. Output JSON (Efficiently)
    cat <<EOF > "$JSON_FILE.tmp"
{
  "cpu": $cpu_usage, "ram": $ram_usage, "net_in": $net_in, "net_out": $net_out,
  "isp": "$ISP", "region": "$REGION",
  "history": {
    "live": $(join_arr "${H_LIVE[@]}"),
    "h1": $(join_arr "${H_H1[@]}"),
    "h24": $(join_arr "${H_H24[@]}"),
    "d7": $(join_arr "${H_D7[@]}"),
    "d30": $(join_arr "${H_D30[@]}")
  }
}
EOF
    mv "$JSON_FILE.tmp" "$JSON_FILE"
    chmod 644 "$JSON_FILE"

    COUNTER=$((COUNTER + 1))
    sleep $INTERVAL
done
EOF_SCRIPT

sed -i "s|__STATS_FILE__|$STATS_FILE|g" "$STATS_SCRIPT"
chmod +x "$STATS_SCRIPT"

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
