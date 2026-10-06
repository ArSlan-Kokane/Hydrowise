# Keep Render Server Awake

This guide explains how to keep your Render API server awake to prevent spin-down delays.

## Problem

Render's free tier spins down web services after 15 minutes of inactivity. The first request after spin-down takes 30-60 seconds, which is problematic for real-time sensor data from ESP32 devices.

## Solution

Use the keep-alive script to ping the server every 5 minutes (well under the 15-minute limit).

## Quick Start

### 1. After Render Deployment

Once your API is deployed, run the keep-alive script pointing to your Render URL:

```bash
python3 scripts/keep-alive.py --url https://hydrowise-api.onrender.com/api/health
```

Keep this running in a terminal on your always-on computer.

### 2. For Production (Recommended Options)

#### Option A: Use a Free Monitoring Service (Easiest)

1. Sign up for [UptimeRobot](https://uptimerobot.com) (free)
2. Add a new monitor:
   - Type: HTTP
   - URL: `https://hydrowise-api.onrender.com/api/health`
   - Interval: 5 minutes
3. UptimeRobot will ping your server automatically 24/7

#### Option B: Cron Job on a VPS

If you have a VPS or always-on server:

```bash
# Edit crontab
crontab -e

# Add this line (pings every 5 minutes)
*/5 * * * * curl -f https://hydrowise-api.onrender.com/api/health > /dev/null 2>&1
```

#### Option C: GitHub Actions (Free)

Create `.github/workflows/keep-alive.yml`:

```yaml
name: Keep Render Alive

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:      # Manual trigger

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Render API
        run: curl -f https://hydrowise-api.onrender.com/api/health
```

## Script Usage

### Python Script

```bash
# Run with default settings (localhost)
npm run keep-alive

# Run with Render URL
python3 scripts/keep-alive.py --url https://hydrowise-api.onrender.com/api/health

# Custom interval (3 minutes)
python3 scripts/keep-alive.py --url https://hydrowise-api.onrender.com/api/health --interval 180

# Test once
python3 scripts/keep-alive.py --url https://hydrowise-api.onrender.com/api/health --once
```

### Bash Script

```bash
# Make executable (first time only)
chmod +x scripts/keep-alive.sh

# Run
./scripts/keep-alive.sh https://hydrowise-api.onrender.com/api/health
```

## Important Notes

- **Interval**: 5 minutes is safe (under the 15-minute spin-down limit)
- **Endpoint**: Uses `/api/health` (lightweight, no database load)
- **Cost**: All options above are free
- **Production**: For serious production use, consider upgrading to Render's paid tier ($7/month) which doesn't spin down

## Troubleshooting

### Script shows "Failed"

- Check your Render URL is correct
- Verify the API is deployed and running
- Check Render logs for errors

### Render still spins down

- Ensure the cron job/monitor is actually running
- Check the interval is less than 15 minutes
- Verify the URL is accessible from the monitoring service

## Long-Term Solution

For production deployment, consider:

1. **Upgrade to Render paid tier** ($7/month) - no spin-down
2. **Use a paid monitoring service** with better reliability
3. **Deploy to a platform without spin-down** (e.g., Railway, Fly.io paid tier)
