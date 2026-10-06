# Render Keep-Alive Scripts

These scripts help keep your Render API server awake by pinging it periodically. This is useful for the free tier, which spins down services after 15 minutes of inactivity.

## Why You Need This

Render's free tier automatically spins down web services after 15 minutes of inactivity. The first request after spin-down can take 30-60 seconds. These scripts prevent this by sending periodic health check requests.

## Python Script (Recommended)

### Usage

```bash
# Ping localhost every 5 minutes (default)
npm run keep-alive

# Ping your Render server every 5 minutes
python3 scripts/keep-alive.py --url https://hydrowise-api.onrender.com/api/health

# Custom interval (e.g., every 3 minutes)
python3 scripts/keep-alive.py --interval 180

# Test once
python3 scripts/keep-alive.py --once
```

### Options

- `--url`: API health endpoint URL (default: `http://localhost:8000/api/health`)
- `--interval`: Ping interval in seconds (default: 300 = 5 minutes)
- `--once`: Ping once and exit (for testing)

## Bash Script

### Usage

```bash
# Ping localhost every 5 minutes
./scripts/keep-alive.sh

# Ping your Render server
./scripts/keep-alive.sh https://hydrowise-api.onrender.com/api/health

# Custom interval (e.g., every 3 minutes)
./scripts/keep-alive.sh https://hydrowise-api.onrender.com/api/health 180
```

## Recommended Setup

### Option 1: Run on Your Local Machine

Run the script in a terminal on your always-on computer (desktop, Raspberry Pi, etc.):

```bash
python3 scripts/keep-alive.py --url https://hydrowise-api.onrender.com/api/health
```

### Option 2: Run on a Cloud Server

Deploy to a cheap VPS or use a free cron service:

```bash
# Add to crontab (runs every 5 minutes)
*/5 * * * * curl -f https://hydrowise-api.onrender.com/api/health
```

### Option 3: Use a Free Monitoring Service

Services like UptimeRobot, Pingdom, or Better Uptime can ping your server for free:
- Set up a monitor for `https://hydrowise-api.onrender.com/api/health`
- Set check interval to 5 minutes
- These services will keep your server awake automatically

## Notes

- The script pings the `/api/health` endpoint (lightweight, no database queries)
- Interval of 5 minutes is safe (well under the 15-minute spin-down limit)
- Press Ctrl+C to stop the script
- For production, consider upgrading to Render's paid tier or using a proper monitoring service

## Example Output

```
============================================================
[*] HydroWise Render Keep-Alive Script
Target URL : https://hydrowise-api.onrender.com/api/health
Interval   : 300s (5 minutes)
============================================================

[2026-10-06 14:45:00] #001 ✓ HTTP 200 OK
[2026-10-06 14:50:00] #002 ✓ HTTP 200 OK
[2026-10-06 14:55:00] #003 ✓ HTTP 200 OK
...
```
