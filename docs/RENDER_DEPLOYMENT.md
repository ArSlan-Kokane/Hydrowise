# Render Deployment Guide

This guide explains how to deploy the HydroWise API to Render.

## Prerequisites

- A Render account (free tier available)
- Git repository with your code
- Render CLI (optional, or use web dashboard)

## Step 1: Prepare Your Repository

1. Ensure all files are committed to git
2. The `render.yaml` file should be in the repository root
3. The `services/api/Dockerfile` should be present

## Step 2: Deploy via Render Dashboard

### Option A: Using render.yaml (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Blueprint"
3. Connect your Git repository
4. Render will read `render.yaml` and create:
   - A PostgreSQL database (free tier)
   - A web service for the API (free tier)
5. Click "Apply"

### Option B: Manual Setup

#### Create PostgreSQL Database

1. Go to "New +" → "PostgreSQL"
2. Name: `hydrowise-db`
3. Database: `hydrowise`
4. User: `hydrowise_user`
5. Region: Choose nearest to your ESP32 devices
6. Plan: Free
7. Click "Create Database"
8. Copy the **Internal Database URL** from the database page

#### Create Web Service

1. Go to "New +" → "Web Service"
2. Name: `hydrowise-api`
3. Region: Same as database
4. Branch: `main`
5. Runtime: Docker
6. Docker Context: `./services/api`
7. Dockerfile Path: `./services/api/Dockerfile`
8. Environment Variables:
   ```
   HYDROWISE_ENV=production
   DATABASE_URL=<paste your Internal Database URL from above>
   DEVICE_API_KEY=<generate a secure random key>
   CORS_ORIGINS=https://your-dashboard-domain.onrender.com,https://localhost:5173
   WEATHER_API_BASE_URL=
   WEATHER_API_KEY=
   MODEL_ARTIFACT_PATH=
   MODEL_VERSION=mock-v0.1
   ```
9. Plan: Free
10. Click "Create Web Service"

## Step 3: Update Firmware Configuration

After deployment, update your ESP32 firmware config:

```c
// In firmware/esp32/include/config.h
#define API_BASE_URL "https://hydrowise-api.onrender.com"
#define DEVICE_API_KEY "<the DEVICE_API_KEY you set in Render>"
```

## Step 4: Deploy Web Dashboard (Optional)

The React dashboard can be deployed to Vercel or Netlify:

### Vercel Deployment

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Build settings:
   - Framework: Vite
   - Root Directory: `apps/web`
   - Build Command: `pnpm build`
   - Output Directory: `dist`
5. Environment Variables:
   ```
   VITE_API_BASE_URL=https://hydrowise-api.onrender.com
   ```
6. Deploy

### Update CORS Origins

After deploying the dashboard, update the CORS origins in Render:

1. Go to your API service in Render
2. Settings → Environment Variables
3. Update `CORS_ORIGINS` to include your dashboard URL:
   ```
   https://your-dashboard-domain.vercel.app,https://localhost:5173
   ```

## Step 5: Verify Deployment

1. Check API health:
   ```bash
   curl https://hydrowise-api.onrender.com/api/health
   ```

2. Test sensor endpoint:
   ```bash
   curl -X POST https://hydrowise-api.onrender.com/api/sensors/reading \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your-device-api-key" \
     -d '{
       "device_id": "test",
       "captured_at": "2026-10-06T00:00:00Z",
       "temperature_C": 25.0,
       "humidity_%": 50.0,
       "soil_moisture_%": 50.0
     }'
   ```

3. Check the dashboard is accessible
4. Update ESP32 firmware with the new API URL and redeploy

## Important Notes

### Free Tier Limitations

- Render free tier services spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- PostgreSQL free tier has 90-day data retention
- Consider upgrading to paid tier for production use

### Environment Variables

Never commit secrets to git. Always set them in Render's environment variables:

- `DEVICE_API_KEY` - Random secret for ESP32 authentication
- `DATABASE_URL` - Render provides this automatically if using render.yaml
- `CORS_ORIGINS` - Must include your dashboard domain

### Database Persistence

- PostgreSQL on Render has persistent storage
- Data survives redeployments
- For SQLite (local development), data is lost on redeploy

### Monitoring

- Check Render logs for errors
- Use the health check endpoint: `/api/health`
- Monitor database connection in logs

## Troubleshooting

### Service won't start

- Check Render logs for build errors
- Verify Dockerfile is correct
- Ensure all dependencies are in requirements.txt

### Database connection errors

- Verify DATABASE_URL is set correctly
- Check database is in the same region as the web service
- Ensure database is running (not paused)

### CORS errors

- Verify CORS_ORIGINS includes your dashboard domain
- Check the dashboard is using the correct API URL
- Ensure X-API-Key header is being sent from ESP32

### ESP32 can't connect

- Verify API_BASE_URL is correct (https, not http)
- Check DEVICE_API_KEY matches Render setting
- Ensure your network allows outbound HTTPS
- Check Render logs for incoming requests
