# 🌊 River Flow Tracking System - API Documentation

Base URL: `http://localhost:3001` (development)

## Authentication

Currently, the API uses Supabase's built-in authentication. For production, implement proper API keys or JWT tokens.

---

## Nodes Endpoints

### GET /api/nodes
Get all monitoring nodes.

**Response:**
```json
[
  {
    "node_id": 1,
    "name": "River Point North",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "threshold": 5.0,
    "created_at": "2026-01-20T10:00:00Z"
  }
]
```

### GET /api/nodes/:id
Get a specific node by ID.

**Parameters:**
- `id` (path) - Node ID

**Response:**
```json
{
  "node_id": 1,
  "name": "River Point North",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "threshold": 5.0,
  "created_at": "2026-01-20T10:00:00Z"
}
```

### POST /api/nodes
Create a new monitoring node.

**Request Body:**
```json
{
  "name": "River Point East",
  "latitude": 40.7589,
  "longitude": -73.9851,
  "threshold": 4.5
}
```

**Response:**
```json
{
  "node_id": 2,
  "name": "River Point East",
  "latitude": 40.7589,
  "longitude": -73.9851,
  "threshold": 4.5,
  "created_at": "2026-01-20T11:00:00Z"
}
```

### PUT /api/nodes/:id
Update an existing node.

**Parameters:**
- `id` (path) - Node ID

**Request Body:**
```json
{
  "name": "Updated Name",
  "threshold": 5.5
}
```

### DELETE /api/nodes/:id
Delete a node and all its readings.

**Parameters:**
- `id` (path) - Node ID

---

## Readings Endpoints

### GET /api/readings/node/:nodeId
Get all readings for a specific node.

**Parameters:**
- `nodeId` (path) - Node ID
- `limit` (query) - Maximum number of readings (default: 100)

**Response:**
```json
[
  {
    "reading_id": 1,
    "node_id": 1,
    "water_level": 3.5,
    "flow_rate": 1.8,
    "timestamp": "2026-01-20T12:00:00Z"
  }
]
```

### GET /api/readings/node/:nodeId/latest
Get the most recent reading for a node.

**Parameters:**
- `nodeId` (path) - Node ID

**Response:**
```json
{
  "reading_id": 1,
  "node_id": 1,
  "water_level": 3.5,
  "flow_rate": 1.8,
  "timestamp": "2026-01-20T12:00:00Z"
}
```

### GET /api/readings
Get all readings with optional filters.

**Query Parameters:**
- `startDate` (ISO 8601) - Filter from this date
- `endDate` (ISO 8601) - Filter to this date
- `limit` - Maximum results (default: 100)

**Response:**
```json
[
  {
    "reading_id": 1,
    "node_id": 1,
    "water_level": 3.5,
    "flow_rate": 1.8,
    "timestamp": "2026-01-20T12:00:00Z",
    "nodes": {
      "name": "River Point North"
    }
  }
]
```

### POST /api/readings
Create a new reading (for IoT sensors).

**Request Body:**
```json
{
  "node_id": 1,
  "water_level": 3.5,
  "flow_rate": 1.8,
  "timestamp": "2026-01-20T12:00:00Z"  // optional
}
```

**Response:**
```json
{
  "reading_id": 1,
  "node_id": 1,
  "water_level": 3.5,
  "flow_rate": 1.8,
  "timestamp": "2026-01-20T12:00:00Z",
  "alert_status": "warning"  // normal, warning, or danger
}
```

### DELETE /api/readings/:id
Delete a specific reading.

**Parameters:**
- `id` (path) - Reading ID

### GET /api/readings/stats/:nodeId
Get statistical summary for a node.

**Parameters:**
- `nodeId` (path) - Node ID
- `startDate` (query) - Start date filter
- `endDate` (query) - End date filter

**Response:**
```json
{
  "count": 50,
  "water_level": {
    "avg": 3.2,
    "min": 2.1,
    "max": 4.8
  },
  "flow_rate": {
    "avg": 1.5,
    "min": 0.8,
    "max": 2.3
  }
}
```

---

## IoT Sensor Integration

### Example: Arduino/ESP32

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* serverUrl = "http://your-server/api/readings";

void sendReading(int nodeId, float waterLevel, float flowRate) {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  String jsonData = "{\"node_id\":" + String(nodeId) + 
                    ",\"water_level\":" + String(waterLevel) + 
                    ",\"flow_rate\":" + String(flowRate) + "}";
  
  int httpCode = http.POST(jsonData);
  http.end();
}
```

### Example: Python

```python
import requests
import time

def send_reading(node_id, water_level, flow_rate):
    url = "http://your-server/api/readings"
    data = {
        "node_id": node_id,
        "water_level": water_level,
        "flow_rate": flow_rate
    }
    response = requests.post(url, json=data)
    return response.json()

# Send reading every 5 minutes
while True:
    send_reading(1, 3.5, 1.8)
    time.sleep(300)
```

---

## Real-time Updates

The frontend uses Supabase real-time subscriptions to automatically update when new readings are added. No polling required!

---

## Error Responses

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Server Error

Error format:
```json
{
  "error": "Error message description",
  "errors": [...]  // validation errors if applicable
}
```
