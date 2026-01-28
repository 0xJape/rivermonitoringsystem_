# Redis Setup for River Alert System

## Overview
Redis is used as a temporary data store for high-frequency ESP32 sensor readings, providing:
- **Fast writes** for real-time sensor data
- **Pub/Sub** for instant dashboard updates
- **Data buffering** before database persistence
- **Node status tracking** with TTL

## Architecture Flow

```
ESP32 Sensor → HTTP POST → Redis (temp) → Database (persistent)
                              ↓
                         Pub/Sub → WebSocket → Dashboard
```

## Installation

### 1. Install Redis

**Windows (using Chocolatey):**
```bash
choco install redis-64
redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Docker (recommended):**
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

### 2. Install Node.js Dependencies

```bash
cd server
npm install redis
```

### 3. Configure Environment

Add to `server/.env`:
```env
REDIS_URL=redis://localhost:6379
# Or for cloud Redis:
# REDIS_URL=redis://username:password@host:port
```

### 4. Start the Server

```bash
cd server
npm run dev
```

## API Endpoints

### ESP32 Endpoints

**POST** `/api/esp32/reading` - Send sensor reading
```json
{
  "nodeId": "NODE_001",
  "waterLevel": 2.5,
  "flowRate": 45.3,
  "temperature": 18.5,
  "batteryLevel": 87.2
}
```

**GET** `/api/esp32/latest/:nodeId` - Get latest reading from Redis

**GET** `/api/esp32/recent/:nodeId?limit=20` - Get recent readings

**GET** `/api/esp32/status/:nodeId` - Check node online status

## Redis Data Structure

```
Keys:
  node:NODE_001:latest      → Latest reading (1 hour TTL)
  node:NODE_001:recent      → List of last 100 readings
  node:NODE_001:status      → Online/offline status (5 min TTL)
  alerts:queue              → Pending alerts

Pub/Sub Channels:
  sensor:readings           → Real-time readings
  sensor:alerts             → Alert notifications
```

## Testing

### Test with curl:
```bash
curl -X POST http://localhost:3001/api/esp32/reading \
  -H "Content-Type: application/json" \
  -d '{
    "nodeId": "NODE_001",
    "waterLevel": 2.5,
    "flowRate": 45.3,
    "temperature": 18.5,
    "batteryLevel": 87.2
  }'
```

### Monitor Redis in real-time:
```bash
redis-cli MONITOR
```

### View data in Redis:
```bash
redis-cli
> KEYS node:*
> GET node:NODE_001:latest
> LRANGE node:NODE_001:recent 0 10
```

## WebSocket Real-time Updates

Connect to WebSocket for live data:
```javascript
const ws = new WebSocket('ws://localhost:3001')

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  
  if (message.type === 'reading') {
    console.log('New sensor reading:', message.data)
  } else if (message.type === 'alert') {
    console.log('⚠️ Alert:', message.data)
  }
}
```

## Production Considerations

1. **Redis Cloud**: Use managed Redis (Redis Cloud, AWS ElastiCache, Azure Cache)
2. **Authentication**: Enable Redis AUTH for security
3. **Persistence**: Configure Redis RDB/AOF for data durability
4. **Monitoring**: Use Redis INFO and monitoring tools
5. **Clustering**: Scale with Redis Cluster for high availability

## Troubleshooting

**Redis not connecting?**
- Check if Redis is running: `redis-cli ping` (should return PONG)
- Verify REDIS_URL in .env file
- Check firewall settings

**Data not persisting?**
- Redis is intentionally temporary (TTL expires data)
- Check database persistence logs in server console
- Verify Supabase connection

**High memory usage?**
- Adjust `LRANGE` limits (currently 100 readings per node)
- Implement Redis maxmemory-policy
- Use Redis TTL more aggressively
