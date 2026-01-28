import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase, NodeWithReading } from '@/lib/supabase'
import { getNodeStatus, formatTimestamp, formatNumber } from '@/lib/utils'
import { AlertTriangle, Bell, Radio, Zap, Droplet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LiveReading {
  nodeId: string
  waterLevel: number
  timestamp: string
}

export default function Alerts() {
  const [alertNodes, setAlertNodes] = useState<NodeWithReading[]>([])
  const [loading, setLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    fetchAlertNodes()

    // Connect to WebSocket for live updates
    const ws = new WebSocket('ws://localhost:3001')
    wsRef.current = ws

    ws.onopen = () => {
      console.log('🔌 Alerts page connected to live feed')
      setWsConnected(true)
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'live_reading') {
        const reading = message.data as LiveReading
        setLastUpdate(new Date())
        
        // Update alert nodes in real-time
        setAlertNodes(prevNodes => {
          return prevNodes.map(node => {
            if (node.name === reading.nodeId) {
              const status = getNodeStatus(reading.waterLevel, node.threshold)
              return {
                ...node,
                latest_reading: {
                  ...node.latest_reading,
                  water_level: reading.waterLevel,
                  timestamp: reading.timestamp
                } as any,
                status
              }
            }
            return node
          }).filter(n => n.status === 'warning' || n.status === 'danger')
        })
        
        // Also refresh to check if new nodes need to be added
        fetchAlertNodes()
      }
    }

    ws.onerror = () => setWsConnected(false)
    ws.onclose = () => setWsConnected(false)

    // Also listen for database updates
    const channel = supabase
      .channel('alerts-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'readings' }, () => {
        fetchAlertNodes()
      })
      .subscribe()

    return () => {
      ws.close()
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchAlertNodes() {
    try {
      const { data: nodesData, error: nodesError } = await supabase
        .from('nodes')
        .select('*')

      if (nodesError) throw nodesError

      const nodesWithReadings = await Promise.all(
        (nodesData || []).map(async (node) => {
          const { data: readings } = await supabase
            .from('readings')
            .select('*')
            .eq('node_id', node.node_id)
            .eq('confirmed_alert', true)  // Only confirmed alerts (5+ seconds)
            .order('timestamp', { ascending: false })
            .limit(1)

          const latestReading = readings?.[0]
          const status = latestReading
            ? getNodeStatus(latestReading.water_level, node.threshold)
            : 'normal'

          return {
            ...node,
            latest_reading: latestReading,
            status,
          } as NodeWithReading
        })
      )

      // Filter only nodes with confirmed warnings or danger alerts
      const filtered = nodesWithReadings.filter(
        (node) => node.latest_reading && (node.status === 'warning' || node.status === 'danger')
      )

      setAlertNodes(filtered)
    } catch (error) {
      console.error('Error fetching alert nodes:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading alerts...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-3xl font-bold">Alerts & Notifications</h2>
            <p className="text-muted-foreground">Monitor nodes exceeding safe thresholds</p>
          </div>
        </div>
        
        {/* Live Status */}
        <div className={cn(
          "px-4 py-2 rounded-lg border flex items-center gap-2",
          wsConnected 
            ? "bg-emerald-500/10 border-emerald-500/30" 
            : "bg-red-500/10 border-red-500/30"
        )}>
          <div className="relative">
            <Radio className={cn("h-4 w-4", wsConnected ? "text-emerald-500" : "text-red-500")} />
            {wsConnected && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            )}
          </div>
          <div>
            <span className={cn(
              "text-xs font-semibold",
              wsConnected ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}>
              {wsConnected ? 'LIVE' : 'OFFLINE'}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Zap className="h-2.5 w-2.5" />
              <span>{formatTimestamp(lastUpdate.toISOString())}</span>
            </div>
          </div>
        </div>
      </div>

      {alertNodes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-green-100 p-4">
                <Bell className="h-12 w-12 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No Active Alerts</h3>
                <p className="text-muted-foreground">All river nodes are within safe thresholds</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {alertNodes.length > 0 && (
        <div className="space-y-4">
          {alertNodes.map((node) => {
            const isDanger = node.status === 'danger'
            const percentage = node.latest_reading
              ? ((node.latest_reading.water_level / node.threshold) * 100).toFixed(1)
              : '0'

            return (
              <Card key={node.node_id} className={isDanger ? 'border-destructive' : 'border-yellow-500'}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${isDanger ? 'text-destructive' : 'text-yellow-600'}`}>
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{node.name}</CardTitle>
                        <CardDescription>
                          Location: {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={isDanger ? 'destructive' : 'warning'}>
                      {isDanger ? 'DANGER' : 'WARNING'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Droplet className="h-4 w-4" />
                        Water Level
                      </div>
                      <div className="text-2xl font-bold">
                        {node.latest_reading
                          ? formatNumber(node.latest_reading.water_level)
                          : 'N/A'}{' '}m
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Threshold</div>
                      <div className="text-2xl font-bold">{formatNumber(node.threshold)} m</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Capacity</div>
                      <div className={`text-2xl font-bold ${isDanger ? 'text-destructive' : 'text-yellow-600'}`}>
                        {percentage}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground">
                    Last updated: {node.latest_reading ? formatTimestamp(node.latest_reading.timestamp) : 'N/A'}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
