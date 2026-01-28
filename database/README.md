# Database Setup

## Supabase Configuration

This folder contains the database schema for the River Flow Tracking System.

### Setup Instructions

1. **Create a Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the project to be ready

2. **Run the Schema**
   - Open the Supabase dashboard
   - Go to the SQL Editor
   - Copy the contents of `schema.sql`
   - Paste and run the SQL

3. **Get Your Credentials**
   - Go to Project Settings → API
   - Copy your `Project URL` and `anon/public` key for the client
   - Copy your `Project URL` and `service_role` key for the server

4. **Update Environment Variables**
   - Update `client/.env` with the client credentials
   - Update `server/.env` with the server credentials

### Schema Overview

**nodes table:**
- `node_id` - Primary key
- `name` - Node location name
- `latitude` - GPS latitude
- `longitude` - GPS longitude
- `threshold` - Alert threshold in meters
- `created_at` - Creation timestamp

**readings table:**
- `reading_id` - Primary key
- `node_id` - Foreign key to nodes
- `water_level` - Water level in meters
- `flow_rate` - Flow rate in m³/s
- `timestamp` - Reading timestamp

### Sample Data

The schema includes optional sample data for 3 nodes with recent readings. You can remove or modify this as needed.

### Real-time Subscriptions

The frontend automatically subscribes to real-time updates on the readings table. Any new readings will trigger automatic updates in the dashboard.

### API Keys

- **anon key** - Use in client (browser) for public access
- **service_role key** - Use in server for admin operations (keep secret!)
