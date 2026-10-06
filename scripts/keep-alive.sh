#!/bin/bash
# HydroWise Render Keep-Alive Script (Bash version)
# Pings the Render API server periodically to prevent it from spinning down

# Configuration
URL="${1:-http://localhost:8000/api/health}"
INTERVAL="${2:-300}"  # 5 minutes in seconds

echo "============================================================"
echo "[*] HydroWise Render Keep-Alive Script"
echo "Target URL : $URL"
echo "Interval   : ${INTERVAL}s ($(($INTERVAL / 60)) minutes)"
echo "============================================================"
echo ""

count=0
trap 'echo -e "\n\nKeep-alive script stopped by user."; echo "Total pings: $count"; exit 0' INT

while true; do
    count=$((count + 1))
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    if curl -s -f -o /dev/null -w "HTTP %{http_code}" --max-time 10 "$URL"; then
        echo "[$timestamp] #$count ✓ Success"
    else
        echo "[$timestamp] #$count ✗ Failed"
    fi

    sleep "$INTERVAL"
done
