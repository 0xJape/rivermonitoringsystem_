# 🌊 River Flow Tracking System

Real-time monitoring dashboard for water levels and flow rates across river systems.

## 📋 Features

- **Real-time Dashboard** - Monitor water levels and flow rates across multiple river nodes
- **Interactive Map** - Visualize all nodes with color-coded status indicators
- **Historical Charts** - Analyze trends with historical data visualization
- **Alert System** - Get notified when water levels exceed safe thresholds
- **Admin Panel** - Manage nodes, set thresholds, and download data

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + ShadCN UI + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Maps**: MapCN (MapLibre GL)
- **Charts**: Recharts

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in both `client` and `server` folders
   - Add your Supabase credentials

4. Set up the database:
   - Go to your Supabase project
   - Run the SQL in `database/schema.sql` in the SQL Editor

### Running the Application

Development mode (runs both client and server):
```bash
npm run dev
```

Or run individually:
```bash
npm run dev:client  # Frontend on http://localhost:5173
npm run dev:server  # Backend on http://localhost:3001
```

### Building for Production

```bash
npm run build
```

## 📁 Project Structure

```
river-flow-tracking-system/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/      # Page components
│   │   ├── lib/        # Utilities & config
│   │   └── hooks/      # Custom hooks
├── server/             # Node.js backend
│   ├── src/
│   │   ├── routes/     # API routes
│   │   ├── controllers/# Route controllers
│   │   └── config/     # Server configuration
└── database/           # Database schemas
```

## 🗄️ Database Schema

### Nodes Table
- `node_id` - Unique identifier
- `name` - Node location name
- `latitude` / `longitude` - GPS coordinates
- `threshold` - Alert threshold for water level
- `created_at` - Timestamp

### Readings Table
- `reading_id` - Unique identifier
- `node_id` - Foreign key to nodes
- `water_level` - Current water level (meters)
- `flow_rate` - Current flow rate (m³/s)
- `timestamp` - Reading timestamp

## 🔐 Environment Variables

### Client (.env)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3001
```

### Server (.env)
```
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
NODE_ENV=development
```

## 📝 License

MIT
