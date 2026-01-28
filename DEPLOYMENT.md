# Deployment Guide - River Alert System

## Deploy to Vercel

### Prerequisites
- GitHub repository with your code pushed
- Vercel account (free tier works)
- Supabase project with database setup

### Step 1: Update API URLs for Production

The frontend needs to call your deployed API instead of localhost. Update the fetch URLs:

In these files, replace `http://localhost:3001` with your Vercel deployment URL:
- `client/src/pages/LiveFeed.tsx`
- `client/src/pages/MapView.tsx`
- `client/src/pages/Alerts.tsx`

Or better, use environment variables:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
// Then use: `${API_URL}/api/esp32/live`
```

### Step 2: Deploy to Vercel

1. **Go to [vercel.com](https://vercel.com) and sign in with GitHub**

2. **Click "Add New Project"**

3. **Import your GitHub repository:**
   - Select: `rivermonitoringsystem_`
   - Click "Import"

4. **Configure Project:**
   - Framework Preset: **Vite**
   - Root Directory: **client**
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. **Add Environment Variables:**
   Click "Environment Variables" and add:
   
   **For Client (Frontend):**
   ```
   VITE_SUPABASE_URL = your_supabase_project_url
   VITE_SUPABASE_ANON_KEY = your_supabase_anon_key
   VITE_API_URL = (leave empty for now, will add after server deployment)
   ```

6. **Click "Deploy"**

### Step 3: Deploy Server as Separate Project

1. **In Vercel, click "Add New Project" again**

2. **Import the same repository**

3. **Configure Server:**
   - Framework Preset: **Other**
   - Root Directory: **server**
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Add Environment Variables:**
   ```
   SUPABASE_URL = your_supabase_project_url
   SUPABASE_SERVICE_KEY = your_supabase_service_role_key
   NODE_ENV = production
   ```

5. **Click "Deploy"**

6. **Copy the server deployment URL** (e.g., `https://your-server.vercel.app`)

### Step 4: Update Client with Server URL

1. Go back to your **client project** in Vercel
2. Go to **Settings > Environment Variables**
3. Add or update:
   ```
   VITE_API_URL = https://your-server.vercel.app
   ```
4. Go to **Deployments** tab
5. Click "Redeploy" on the latest deployment

### Step 5: Update ESP32 Code

Update the server URL in your ESP32 code:
```cpp
const char* serverUrl = "https://your-server.vercel.app/api/esp32/reading";
```

Upload to both ESP32 boards.

### Step 6: Test

1. Open your client URL: `https://your-app.vercel.app`
2. Check all pages:
   - Dashboard
   - Live Feed
   - Map View
   - Alerts
3. Verify real-time updates are working (1-second polling)

## Important Notes

- **JSON File Storage**: The system uses `live-data.json` which is stored in-memory on Vercel (serverless)
- **Cold Starts**: First request might be slow (serverless function wake-up)
- **File Persistence**: JSON file resets on each cold start, but database keeps permanent records
- **Free Tier Limits**: 
  - Vercel: 100GB bandwidth/month
  - Supabase: 500MB database, 2GB bandwidth

## Troubleshooting

**Problem: Client can't fetch live data**
- Check VITE_API_URL is set correctly
- Check CORS is enabled in server (already configured)
- Check server is deployed and running

**Problem: ESP32 can't send data**
- Verify server URL in ESP32 code
- Check WiFi connection
- Test with: `curl https://your-server.vercel.app/health`

**Problem: No real-time updates**
- Check browser console for errors
- Verify API_URL in fetch calls
- Check Supabase credentials

## Environment Variables Summary

### Client (.env)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=https://your-server.vercel.app
```

### Server (.env)
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
NODE_ENV=production
```

## Post-Deployment

1. ✅ Test all pages load correctly
2. ✅ Test ESP32 can send data
3. ✅ Test real-time updates appear within 1 second
4. ✅ Test map markers update correctly
5. ✅ Test alerts page shows warnings/dangers
6. ✅ Test SMS alerts are sent at thresholds
