import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Droplets, Wifi, WifiOff, MapPin, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LiveReading {
  nodeId: string
  waterLevel: number
  timestamp: string
}

interface NodeData {
  nodeId: string
  latestReading: LiveReading
  history: number[]
  readingCount: number
  lastSeen: Date
}

export default function LiveFeed() {
  const [nodes, setNodes] = useState<Map<string, NodeData>>(new Map())
  const [connected, setConnected] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket('ws://localhost:3001')
    wsRef.current = ws

    ws.onopen = () => {
      console.log('🔌 Connected to live feed')
      setConnected(true)
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      if (message.type === 'live_reading') {
        const newReading = message.data as LiveReading
        
        setNodes(prev => {
          const updated = new Map(prev)
          const existing = updated.get(newReading.nodeId)
          
          if (existing) {
            // Update existing node
            const newHistory = [...existing.history, newReading.waterLevel].slice(-30)
            updated.set(newReading.nodeId, {
              nodeId: newReading.nodeId,
              latestReading: newReading,
              history: newHistory,
              readingCount: existing.readingCount + 1,
              lastSeen: new Date()
            })
          } else {
            // New node detected
            updated.set(newReading.nodeId, {
              nodeId: newReading.nodeId,
              latestReading: newReading,
              history: [newReading.waterLevel],
              readingCount: 1,
              lastSeen: new Date()
            })
            // Auto-select first node
            if (!selectedNode) {
              setSelectedNode(newReading.nodeId)
            }
          }
          
          return updated
        })
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setConnected(false)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [])

  const getWaterLevelColor = (level: number) => {
    if (level > 5) return 'text-red-600'
    if (level > 3) return 'text-yellow-600'
    return 'text-green-600'
  }

  const nodeArray = Array.from(nodes.values())
  const activeNode = selectedNode ? nodes.get(selectedNode) : nodeArray[0]
  
  const max = activeNode ? Math.max(...activeNode.history, 1) : 1
  const min = activeNode ? Math.min(...activeNode.history, 0) : 0
  const range = max - min || 1

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Sensor Feed</h1>
          <p className="text-muted-foreground">Real-time water level monitoring from all nodes</p>
        </div>
        <Badge variant={connected ? 'success' : 'destructive'} className="gap-2">
          {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {connected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>

      {/* Node Selector */}
      {nodeArray.length > 0 && (
        <div className="flex gap-2">
          {nodeArray.map((node) => (
            <button
              key={node.nodeId}
              onClick={() => setSelectedNode(node.nodeId)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all",
                selectedNode === node.nodeId
                  ? "border-primary bg-primary/10 font-semibold"
                  : "border-border hover:border-primary/50"
              )}
            >
              <MapPin className="h-4 w-4" />
              <span>{node.nodeId}</span>
              <Badge variant="outline" className="ml-1">
                {node.readingCount}
              </Badge>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Current Reading */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              Current Water Level
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              {activeNode ? (
                <span className="font-semibold text-primary">{activeNode.nodeId}</span>
              ) : (
                'Waiting for sensor data...'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeNode ? (
              <div className="space-y-4">
                <div className={`text-6xl font-bold ${getWaterLevelColor(activeNode.latestReading.waterLevel)}`}>
                  {activeNode.latestReading.waterLevel.toFixed(2)}
                  <span className="text-2xl ml-2">m</span>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Activity className="h-3 w-3" />
                    Last update: {new Date(activeNode.latestReading.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total readings: {activeNode.readingCount}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-4xl font-bold text-muted-foreground">
                Waiting for data...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mini Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Trend (Last 30 seconds)</CardTitle>
            <CardDescription>
              {activeNode ? `${activeNode.nodeId} water level changes` : 'Water level changes over time'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-end gap-1">
              {activeNode && activeNode.history.length > 0 ? (
                activeNode.history.map((level, i) => {
                  const height = ((level - min) / range) * 100
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500 rounded-t transition-all duration-300"
                      style={{ height: `${Math.max(height, 5)}%` }}
                      title={`${level.toFixed(2)}m`}
                    />
                  )
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No data yet
                </div>
              )}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{min.toFixed(2)}m</span>
              <span>{max.toFixed(2)}m</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Session Statistics</CardTitle>
          <CardDescription>
            {activeNode ? `Data from ${activeNode.nodeId}` : 'Select a node to view statistics'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeNode ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{activeNode.readingCount}</div>
                <div className="text-sm text-muted-foreground">Readings</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{max.toFixed(2)}m</div>
                <div className="text-sm text-muted-foreground">Max Level</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{min.toFixed(2)}m</div>
                <div className="text-sm text-muted-foreground">Min Level</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              No data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
