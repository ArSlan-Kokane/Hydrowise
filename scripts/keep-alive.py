#!/usr/bin/env python3
"""
HydroWise Render Keep-Alive Script
==================================
Pings the Render API server periodically to prevent it from spinning down
on the free tier (15-minute inactivity limit).

Usage:
    python scripts/keep-alive.py
    python scripts/keep-alive.py --interval 300
    python scripts/keep-alive.py --url https://hydrowise-api.onrender.com
"""

from __future__ import annotations

import argparse
import time
import urllib.request
import urllib.error
from datetime import datetime

# Default configuration
DEFAULT_URL = "http://localhost:8000/api/health"
DEFAULT_INTERVAL = 300  # 5 minutes


def ping_server(url: str) -> tuple[bool, str]:
    """Ping the server health endpoint."""
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            status_code = response.getcode()
            if status_code == 200:
                return True, f"HTTP {status_code} OK"
            else:
                return False, f"HTTP {status_code}"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code} - {e.reason}"
    except urllib.error.URLError as e:
        return False, f"URL Error - {e.reason}"
    except Exception as e:
        return False, f"Error - {str(e)}"


def main():
    parser = argparse.ArgumentParser(description="Keep Render API server awake")
    parser.add_argument(
        "--url",
        type=str,
        default=DEFAULT_URL,
        help=f"API health endpoint URL (default: {DEFAULT_URL})",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=DEFAULT_INTERVAL,
        help=f"Ping interval in seconds (default: {DEFAULT_INTERVAL})",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Ping once and exit (for testing)",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("[*] HydroWise Render Keep-Alive Script")
    print(f"Target URL : {args.url}")
    print(f"Interval   : {args.interval}s ({args.interval // 60} minutes)")
    print("=" * 60)
    print()

    if args.once:
        success, message = ping_server(args.url)
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if success:
            print(f"[{timestamp}] ✓ {message}")
        else:
            print(f"[{timestamp}] ✗ {message}")
        return

    count = 0
    try:
        while True:
            count += 1
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            success, message = ping_server(args.url)

            if success:
                print(f"[{timestamp}] #{count:03d} ✓ {message}")
            else:
                print(f"[{timestamp}] #{count:03d} ✗ {message}")

            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\n\nKeep-alive script stopped by user.")
        print(f"Total pings: {count}")


if __name__ == "__main__":
    main()
