# Setup Guide - River Flow Tracking System

## Prerequisites

- Node.js 18+ installed
- npm installed
- Supabase account (free tier works)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all workspace dependencies
npm run install:all
```

### 2. Set Up Supabase

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Copy and run the SQL from `database/schema.sql`
4. Get your credentials from Project Settings → API:
   - Project URL
   - `anon` public key (for client)
   - `service_role` key (for server)

### 3. Configure Environment Variables

**Client Configuration (`client/.env`):**
```bash
cp client/.env.example client/.env
```

Edit `client/.env`:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3001
```

**Server Configuration (`server/.env`):**
```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
```env
PORT=3001
NODE_ENV=development
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

### 4. Run the Application

**Development mode (both client and server):**
```bash
npm run dev
```

**Or run individually:**

Client (Frontend):
```bash
npm run dev:client
# Opens at http://localhost:5173
```

Server (Backend):
```bash
npm run dev:server
# Runs at http://localhost:3001
```

### 5. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Health Check: http://localhost:3001/health

## Using the Application

### Admin Panel

1. Go to the Admin Panel tab
2. Click "Add Node" to create monitoring points
3. Fill in:
   - Name (e.g., "River Point A")
   - Latitude (e.g., 40.7128)
   - Longitude (e.g., -74.0060)
   - Threshold (alert level in meters, e.g., 5.0)

### Simulating Sensor Data

Use the backend API to simulate sensor readings:

```bash
curl -X POST http://localhost:3001/api/readings \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": 1,
    "water_level": 3.5,
    "flow_rate": 1.8
  }'
```

### Dashboard Features

- **Dashboard Tab**: View summary cards and node status table
- **Map Tab**: See all nodes on an interactive map with color-coded markers
- **Alerts Tab**: Monitor nodes exceeding safe thresholds
- **Admin Panel**: Manage nodes and export data

## API Endpoints

### Nodes
- `GET /api/nodes` - Get all nodes
- `GET /api/nodes/:id` - Get specific node
- `POST /api/nodes` - Create node
- `PUT /api/nodes/:id` - Update node
- `DELETE /api/nodes/:id` - Delete node

### Readings
- `GET /api/readings` - Get all readings
- `GET /api/readings/node/:nodeId` - Get readings for a node
- `GET /api/readings/node/:nodeId/latest` - Get latest reading
- `POST /api/readings` - Create reading (for IoT sensors)
- `GET /api/readings/stats/:nodeId` - Get statistics

## IoT Integration

To integrate real IoT sensors, configure them to POST data to:
```
POST http://your-server-url/api/readings
Content-Type: application/json

{
  "node_id": 1,
  "water_level": 3.5,
  "flow_rate": 1.8
}
```

## Production Deployment

### Build for Production

```bash
npm run build
```

### Deploy Frontend
- Vercel, Netlify, or Cloudflare Pages
- Build command: `npm run build --workspace=client`
- Output directory: `client/dist`

### Deploy Backend
- Railway, Render, or Heroku
- Start command: `npm start --workspace=server`
- Set environment variables

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3001 (Windows)
npx kill-port 3001

# Kill process on port 5173
npx kill-port 5173
```

### Database Connection Issues
- Verify Supabase credentials in `.env` files
- Check if tables exist in Supabase dashboard
- Ensure RLS policies are set correctly

### Module Resolution Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules client/node_modules server/node_modules
npm run install:all
```

## Next Steps

1. Customize the threshold values for your river system
2. Add more nodes to monitor different points
3. Configure email/SMS notifications (integrate Twilio or SendGrid)
4. Set up automated data backups
5. Deploy to production

For questions or issues, check the documentation or create an issue.
