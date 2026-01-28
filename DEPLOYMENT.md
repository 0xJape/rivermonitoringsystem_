# Deployment Guide

## Frontend Deployment (Vercel)

### Quick Deploy
1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repository: `https://github.com/0xJape/rivermonitoringsystem_`
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Environment Variables (Vercel)
Add these in Vercel Dashboard → Settings → Environment Variables:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=your_backend_url (e.g., https://your-app.railway.app)
```

---

## Backend Deployment (Railway/Render)

⚠️ **Important**: Vercel doesn't support WebSocket connections well. Deploy the backend to Railway or Render instead.

### Option 1: Railway (Recommended for WebSocket)

1. Go to [Railway](https://railway.app)
2. Create New Project → Deploy from GitHub
3. Select `rivermonitoringsystem_` repository
4. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Port**: `3001`

5. Add Environment Variables:
```
PORT=3001
NODE_ENV=production
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

6. Copy the Railway URL (e.g., `https://your-app.railway.app`)
7. Update `VITE_API_URL` in Vercel with this URL

### Option 2: Render

1. Go to [Render](https://render.com)
2. New → Web Service
3. Connect GitHub repository
4. Configure:
   - **Name**: river-alert-backend
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

5. Add Environment Variables (same as Railway)

---

## WebSocket Configuration

After deploying the backend, update the WebSocket URLs in your frontend:

1. **MapView.tsx** (line 34):
```typescript
const ws = new WebSocket('wss://your-backend-url')  // Change from ws://localhost:3001
```

2. **LiveFeed.tsx** (line 29):
```typescript
const ws = new WebSocket('wss://your-backend-url')
```

3. **Alerts.tsx** (line 30):
```typescript
const ws = new WebSocket('wss://your-backend-url')
```

Push changes to GitHub, and Vercel will auto-deploy.

---

## ESP32 Configuration

Update the server URL in your ESP32 code:

```cpp
const char* serverUrl = "https://your-backend-url/api/esp32/reading";
```

---

## Post-Deployment Checklist

- [ ] Frontend deployed on Vercel
- [ ] Backend deployed on Railway/Render
- [ ] Environment variables configured
- [ ] WebSocket URLs updated
- [ ] ESP32 server URL updated
- [ ] Database migrations run in Supabase
- [ ] Test WebSocket connections
- [ ] Verify ESP32 can send data

---

## Quick Test

1. Visit your Vercel URL
2. Check Live Feed page - should show "LIVE" status
3. Send test data from ESP32
4. Verify data appears on Dashboard, Map, and Live Feed
