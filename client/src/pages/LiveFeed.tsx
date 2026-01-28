import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Droplets, TrendingUp } from 'lucide-react'
import NodeChart from '@/components/dashboard/NodeChart'

interface LiveReading {
  nodeId: string
  waterLevel: number
  timestamp: string
  alertStatus: string
  confirmedAlert: boolean
}

interface NodeData {
  current: LiveReading
  history: LiveReading[]
  lastUpdate: string
}

interface LiveData {
  [nodeId: string]: NodeData
}

export default function LiveFeed() {
  const [liveData, setLiveData] = useState<LiveData>({})
  const [selectedNode, setSelectedNode] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Poll the server every 1 second for real-time updates
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/esp32/live')
        if (response.ok) {
          const data = await response.json()
          setLiveData(data)
          setIsConnected(true)
          
          // Auto-select first node if none selected
          if (!selectedNode && Object.keys(data).length > 0) {
            setSelectedNode(Object.keys(data)[0])
          }
        } else {
          setIsConnected(false)
        }
      } catch (error) {
        console.error('Error fetching live data:', error)
        setIsConnected(false)
      }
    }, 1000) // Poll every 1 second

    // Initial fetch
    fetch('http://localhost:3001/api/esp32/live')
      .then(res => res.json())
      .then(data => {
        setLiveData(data)
        setIsConnected(true)
        if (!selectedNode && Object.keys(data).length > 0) {
          setSelectedNode(Object.keys(data)[0])
        }
      })
      .catch(() => setIsConnected(false))

    return () => clearInterval(pollInterval)
  }, [selectedNode])

  const nodeIds = Object.keys(liveData)
  const currentNodeData = selectedNode ? liveData[selectedNode] : null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'danger': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      default: return 'bg-green-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'danger': return 'DANGER'
      case 'warning': return 'WARNING'
      default: return 'NORMAL'
    }
  }

  return (
    <div className="space-y-6">
      {/* Live Status Banner */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Feed Status
            </CardTitle>
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? '🟢 Real-time (1s)' : '🔴 Disconnected'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Node Selector */}
      {nodeIds.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {nodeIds.map(nodeId => (
            <button
              key={nodeId}
              onClick={() => setSelectedNode(nodeId)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedNode === nodeId
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {nodeId}
            </button>
          ))}
        </div>
      )}

      {/* Current Reading */}
      {currentNodeData && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Water Level</CardTitle>
                <Droplets className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentNodeData.current.waterLevel.toFixed(2)} m</div>
                <p className="text-xs text-muted-foreground">
                  Last update: {new Date(currentNodeData.current.timestamp).toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alert Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${getStatusColor(currentNodeData.current.alertStatus)}`} />
                  <div className="text-2xl font-bold">{getStatusText(currentNodeData.current.alertStatus)}</div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentNodeData.current.confirmedAlert ? 'Confirmed (5s+)' : 'Monitoring'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Average</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(currentNodeData.history.reduce((sum, r) => sum + r.waterLevel, 0) / currentNodeData.history.length).toFixed(2)} m
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentNodeData.history.length} readings | Max: {Math.max(...currentNodeData.history.map(r => r.waterLevel)).toFixed(2)} m
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Water Level History (Last 10 Minutes)</CardTitle>
            </CardHeader>
            <CardContent>
              <NodeChart data={currentNodeData.history.slice(0, 20).reverse()} />
            </CardContent>
          </Card>

          {/* Recent Readings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Readings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currentNodeData.history.slice(0, 10).map((reading, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{new Date(reading.timestamp).toLocaleTimeString()}</span>
                    <span className="font-mono font-bold">{reading.waterLevel.toFixed(2)} m</span>
                    <Badge variant={
                      reading.alertStatus === 'danger' ? 'destructive' :
                      reading.alertStatus === 'warning' ? 'default' : 'secondary'
                    }>
                      {reading.alertStatus.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* No Data State */}
      {nodeIds.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No live data available. Waiting for ESP32 readings...</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
