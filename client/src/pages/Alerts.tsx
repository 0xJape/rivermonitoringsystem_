import { useEffect, useState } from 'react'
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
  alertStatus: string
  confirmedAlert: boolean
}

interface LiveData {
  [nodeId: string]: {
    current: LiveReading
    history: LiveReading[]
    lastUpdate: string
  }
}

export default function Alerts() {
  const [alertNodes, setAlertNodes] = useState<NodeWithReading[]>([])
  const [loading, setLoading] = useState(true)
  const [liveConnected, setLiveConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => {
    fetchAlertNodes()

    // Poll for live data every 1 second for real-time updates
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/esp32/live')
        if (response.ok) {
          const liveData: LiveData = await response.json()
          setLiveConnected(true)
          setLastUpdate(new Date())
          
          // Update alert nodes with live data
          setAlertNodes(prevNodes => {
            return prevNodes.map(node => {
              const nodeData = liveData[node.name]
              if (nodeData) {
                const reading = nodeData.current
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
        } else {
          setLiveConnected(false)
        }
      } catch (error) {
        console.error('Error polling live data:', error)
        setLiveConnected(false)
      }
    }, 1000) // Poll every 1 second

    // Initial fetch
    fetch('http://localhost:3001/api/esp32/live')
      .then(res => res.json())
      .then(() => setLiveConnected(true))
      .catch(() => setLiveConnected(false))

    // Also listen for database updates
    const channel = supabase
      .channel('alerts-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'readings' }, () => {
        fetchAlertNodes()
      })
      .subscribe()

    return () => {
      clearInterval(pollInterval)
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

      // Filter only nodes with warnings or danger alerts (show immediately, not just confirmed)
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
          liveConnected 
            ? "bg-emerald-500/10 border-emerald-500/30" 
            : "bg-red-500/10 border-red-500/30"
        )}>
          <div className="relative">
            <Radio className={cn("h-4 w-4", liveConnected ? "text-emerald-500" : "text-red-500")} />
            {liveConnected && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            )}
          </div>
          <div>
            <span className={cn(
              "text-xs font-semibold",
              liveConnected ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}>
              {liveConnected ? 'REAL-TIME (1s)' : 'OFFLINE'}
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
