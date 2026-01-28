import { useEffect, useState, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Map, MapMarker, MarkerContent, MarkerPopup } from '@/components/ui/map'
import { supabase, NodeWithReading } from '@/lib/supabase'
import { getNodeStatus, formatTimestamp, formatNumber } from '@/lib/utils'
import { Droplet, AlertTriangle, MapPin, Waves, Clock, ChevronRight, Radio, Zap, ArrowUp, ArrowDown, Minus, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LiveReading {
  nodeId: string
  waterLevel: number
  timestamp: string
}

export default function MapView() {
  const [nodes, setNodes] = useState<NodeWithReading[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [liveData, setLiveData] = useState<LiveReading | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const [recentUpdates, setRecentUpdates] = useState<Array<{
    nodeName: string
    change: number
    waterLevel: number
    timestamp: Date
  }>>([])

  useEffect(() => {
    fetchNodesWithReadings()

    // Connect to WebSocket for live updates
    const ws = new WebSocket('ws://localhost:3001')
    wsRef.current = ws

    ws.onopen = () => {
      console.log('🔌 Map connected to live feed')
      setWsConnected(true)
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'live_reading') {
        const reading = message.data as LiveReading
        setLiveData(reading)
        setLastUpdate(new Date())
        
        // Update the node's water level in real-time
        setNodes(prevNodes => prevNodes.map(node => {
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
        }))
      }
    }

    ws.onerror = () => setWsConnected(false)
    ws.onclose = () => setWsConnected(false)

    // Also listen for database updates
    const channel = supabase
      .channel('readings-map')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'readings' 
      }, (payload) => {
        console.log('📡 New reading saved to DB:', payload)
        fetchNodesWithReadings()
      })
      .subscribe()

    return () => {
      ws.close()
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchNodesWithReadings() {
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
            .limit(2)

          const latestReading = readings?.[0]
          const previousReading = readings?.[1]
          
          const status = latestReading
            ? getNodeStatus(latestReading.water_level, node.threshold)
            : 'normal'

          // Calculate change from previous reading
          let change = 0
          if (latestReading && previousReading) {
            change = latestReading.water_level - previousReading.water_level
          }

          return {
            ...node,
            latest_reading: latestReading,
            status,
            change,
          } as NodeWithReading & { change: number }
        })
      )

      // Track recent significant changes
      const updates = nodesWithReadings
        .filter(n => n.latest_reading && Math.abs(n.change || 0) > 0.05)
        .map(n => ({
          nodeName: n.name,
          change: n.change || 0,
          waterLevel: n.latest_reading!.water_level,
          timestamp: new Date(n.latest_reading!.timestamp)
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5)

      setRecentUpdates(updates)
      setNodes(nodesWithReadings as any)
    } catch (error) {
      console.error('Error fetching nodes:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status?: 'normal' | 'warning' | 'danger') => {
    switch (status) {
      case 'danger':
        return { 
          color: '#ef4444', 
          bgColor: 'bg-red-500/10', 
          borderColor: 'border-red-500/30',
          textColor: 'text-red-500',
          label: 'Critical',
          gradient: 'from-red-500 to-orange-500'
        }
      case 'warning':
        return { 
          color: '#f59e0b', 
          bgColor: 'bg-amber-500/10', 
          borderColor: 'border-amber-500/30',
          textColor: 'text-amber-500',
          label: 'Warning',
          gradient: 'from-amber-500 to-yellow-500'
        }
      default:
        return { 
          color: '#22c55e', 
          bgColor: 'bg-emerald-500/10', 
          borderColor: 'border-emerald-500/30',
          textColor: 'text-emerald-500',
          label: 'Normal',
          gradient: 'from-emerald-500 to-cyan-500'
        }
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-background to-primary/5">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="relative h-16 w-16 mx-auto mb-6">
              <Waves className="h-16 w-16 text-primary animate-bounce" />
            </div>
          </div>
          <p className="text-lg font-medium">Loading river data...</p>
          <p className="text-sm text-muted-foreground mt-1">Connecting to monitoring stations</p>
        </div>
      </div>
    )
  }

  const stats = {
    total: nodes.length,
    normal: nodes.filter(n => n.status === 'normal').length,
    warning: nodes.filter(n => n.status === 'warning').length,
    danger: nodes.filter(n => n.status === 'danger').length,
  }

  return (
    <div className="h-full flex">
      {/* Sidebar Panel */}
      <div className="w-96 border-r bg-card/30 backdrop-blur-sm flex flex-col flex-shrink-0">
        {/* Live Status Banner */}
        <div className={cn(
          "px-5 py-3 border-b",
          wsConnected 
            ? "bg-gradient-to-r from-emerald-500/10 to-cyan-500/10" 
            : "bg-gradient-to-r from-red-500/10 to-orange-500/10"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Radio className={cn("h-4 w-4", wsConnected ? "text-emerald-500" : "text-red-500")} />
                {wsConnected && (
                  <>
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500"></span>
                  </>
                )}
              </div>
              <span className={cn(
                "text-sm font-semibold",
                wsConnected ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}>
                {wsConnected ? 'LIVE DATA' : 'DISCONNECTED'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              <span>Updated {formatTimestamp(lastUpdate.toISOString())}</span>
            </div>
          </div>
          {liveData && wsConnected && (
            <div className="mt-2 text-sm font-medium">
              📊 {liveData.nodeId}: <span className="text-primary">{liveData.waterLevel.toFixed(2)}m</span>
            </div>
          )}
        </div>

        {/* Stats Header */}
        <div className="p-5 border-b bg-gradient-to-r from-primary/5 to-cyan-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Monitoring Stations</h3>
              <p className="text-xs text-muted-foreground">{stats.total} active sensors</p>
            </div>
          </div>
          
          {/* Mini Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
              <div className="text-lg font-bold text-emerald-600">{stats.normal}</div>
              <div className="text-[10px] text-muted-foreground">Normal</div>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-center">
              <div className="text-lg font-bold text-amber-600">{stats.warning}</div>
              <div className="text-[10px] text-muted-foreground">Warning</div>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-center">
              <div className="text-lg font-bold text-red-600">{stats.danger}</div>
              <div className="text-[10px] text-muted-foreground">Critical</div>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        {recentUpdates.length > 0 && (
          <div className="px-5 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">Recent Activity</span>
            </div>
            <div className="space-y-1.5">
              {recentUpdates.slice(0, 3).map((update, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full",
                    update.change > 0.1 ? "bg-red-500/10" : update.change < -0.1 ? "bg-blue-500/10" : "bg-muted"
                  )}>
                    {update.change > 0.1 ? (
                      <ArrowUp className="h-3 w-3 text-red-500" />
                    ) : update.change < -0.1 ? (
                      <ArrowDown className="h-3 w-3 text-blue-500" />
                    ) : (
                      <Minus className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <span className="flex-1 truncate text-muted-foreground">
                    {update.nodeName.replace('Tupi River - ', '')}
                  </span>
                  <span className="font-mono font-medium">{formatNumber(update.waterLevel)}m</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Node List */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {nodes.map((node) => {
            const config = getStatusConfig(node.status)
            const percentage = node.latest_reading 
              ? (node.latest_reading.water_level / node.threshold) * 100 
              : 0
            const isSelected = selectedNode === node.node_id.toString()
            const change = (node as any).change || 0

            return (
              <div
                key={node.node_id}
                onClick={() => setSelectedNode(isSelected ? null : node.node_id.toString())}
                className={cn(
                  "group relative rounded-xl border p-4 cursor-pointer transition-all duration-300",
                  "hover:shadow-lg hover:-translate-y-0.5",
                  isSelected 
                    ? `${config.bgColor} ${config.borderColor} shadow-lg` 
                    : "bg-card/50 border-border/50 hover:bg-card hover:border-border"
                )}
              >
                {/* Status indicator line */}
                <div 
                  className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-full transition-all", isSelected ? "opacity-100" : "opacity-60")}
                  style={{ backgroundColor: config.color }}
                />

                <div className="pl-3">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm truncate">{node.name}</h4>
                        {node.status === 'danger' && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {node.latest_reading ? formatTimestamp(node.latest_reading.timestamp) : 'No data'}
                        </span>
                        {/* Change indicator */}
                        {change !== 0 && (
                          <div className="flex items-center gap-0.5">
                            {change > 0 ? (
                              <ArrowUp className="h-3 w-3 text-red-500" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-blue-500" />
                            )}
                            <span className={cn(
                              "text-[10px] font-medium",
                              change > 0 ? "text-red-500" : "text-blue-500"
                            )}>
                              {Math.abs(change).toFixed(2)}m
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("text-[10px] px-2", config.bgColor, config.borderColor, config.textColor)}
                    >
                      {config.label}
                    </Badge>
                  </div>

                  {node.latest_reading && (
                    <>
                      {/* Main Stats */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1.5 rounded-lg", config.bgColor)}>
                            <Droplet className={cn("h-3.5 w-3.5", config.textColor)} />
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">Water Level</div>
                            <div className="font-semibold text-sm">{formatNumber(node.latest_reading.water_level)}m</div>
                          </div>
                        </div>
                      </div>

                      {/* Capacity Progress */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-muted-foreground">Threshold Capacity</span>
                          <span className={cn("font-semibold", config.textColor)}>{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500 bg-gradient-to-r", config.gradient)}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Expand indicator */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="p-4 border-t bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] text-muted-foreground">&lt;70%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500"></div>
                <span className="text-[10px] text-muted-foreground">70-90%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
                <span className="text-[10px] text-muted-foreground">&gt;90%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 min-h-0 relative">
        <Map
          center={[124.95, 6.3333]}
          zoom={13}
        >
          {nodes.map((node) => {
            const config = getStatusConfig(node.status)
            const percentage = node.latest_reading 
              ? (node.latest_reading.water_level / node.threshold) * 100 
              : 0
            
            return (
              <MapMarker
                key={node.node_id}
                longitude={node.longitude}
                latitude={node.latitude}
              >
                <MarkerContent>
                  <div className="relative group cursor-pointer">
                    {/* Pulse effect for danger */}
                    {node.status === 'danger' && (
                      <div 
                        className="absolute inset-0 rounded-full animate-ping opacity-75"
                        style={{ backgroundColor: config.color }}
                      />
                    )}
                    {/* Outer ring */}
                    <div
                      className="relative flex items-center justify-center h-10 w-10 rounded-full border-3 shadow-lg transition-transform group-hover:scale-110"
                      style={{
                        backgroundColor: config.color,
                        borderColor: 'white',
                        boxShadow: `0 4px 14px ${config.color}50`,
                      }}
                    >
                      <Droplet className="h-5 w-5 text-white drop-shadow" />
                    </div>
                    {/* Status dot */}
                    <div 
                      className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
                      style={{ backgroundColor: config.color }}
                    />
                  </div>
                </MarkerContent>
                <MarkerPopup>
                  <div className="bg-card rounded-xl border shadow-2xl overflow-hidden min-w-[280px]">
                    {/* Popup Header */}
                    <div 
                      className="p-4 text-white"
                      style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}dd)` }}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-base">{node.name}</h3>
                        <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-white/80 text-xs mt-1">Monitoring Station</p>
                    </div>
                    
                    {/* Popup Content */}
                    <div className="p-4 space-y-4">
                      {node.latest_reading ? (
                        <>
                          <div className="rounded-lg bg-muted/50 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Droplet className="h-4 w-4 text-primary" />
                              <span className="text-xs text-muted-foreground">Water Level</span>
                            </div>
                            <div className="text-2xl font-bold">{formatNumber(node.latest_reading.water_level)}m</div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-xs mb-2">
                              <span className="text-muted-foreground">Capacity</span>
                              <span className="font-semibold">{percentage.toFixed(1)}% of {node.threshold}m</span>
                            </div>
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full bg-gradient-to-r", config.gradient)}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Updated {formatTimestamp(node.latest_reading.timestamp)}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-muted-foreground py-4">
                          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </MarkerPopup>
              </MapMarker>
            )
          })}
        </Map>
        
        {/* Map overlay info */}
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg border shadow-lg px-4 py-2">
          <div className="flex items-center gap-2 text-xs">
            <Waves className="h-4 w-4 text-primary" />
            <span className="font-medium">Tupi River Basin</span>
            <span className="text-muted-foreground">• South Cotabato, Philippines</span>
          </div>
        </div>
      </div>
    </div>
  )
}
