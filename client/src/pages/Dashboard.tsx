import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase, NodeWithReading } from '@/lib/supabase'
import { getNodeStatus, formatTimestamp, formatNumber } from '@/lib/utils'
import { Droplets, Gauge, AlertTriangle, TrendingUp } from 'lucide-react'
import NodeChart from '@/components/dashboard/NodeChart'

export default function Dashboard() {
  const [nodes, setNodes] = useState<NodeWithReading[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)

  useEffect(() => {
    fetchNodesWithReadings()
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('readings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'readings' }, () => {
        fetchNodesWithReadings()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchNodesWithReadings() {
    try {
      // Fetch all nodes
      const { data: nodesData, error: nodesError } = await supabase
        .from('nodes')
        .select('*')
        .order('name')

      if (nodesError) throw nodesError

      // Fetch latest reading for each node
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

      setNodes(nodesWithReadings)
    } catch (error) {
      console.error('Error fetching nodes:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    totalNodes: nodes.length,
    dangerNodes: nodes.filter((n) => n.status === 'danger').length,
    warningNodes: nodes.filter((n) => n.status === 'warning').length,
    avgWaterLevel: nodes.length > 0
      ? nodes.reduce((sum, n) => sum + (n.latest_reading?.water_level || 0), 0) / nodes.length
      : 0,
    avgFlowRate: nodes.length > 0
      ? nodes.reduce((sum, n) => sum + (n.latest_reading?.flow_rate || 0), 0) / nodes.length
      : 0,
  }

  const getStatusBadge = (status?: 'normal' | 'warning' | 'danger') => {
    switch (status) {
      case 'danger':
        return <Badge variant="destructive">Danger</Badge>
      case 'warning':
        return <Badge variant="warning">Warning</Badge>
      default:
        return <Badge variant="success">Normal</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNodes}</div>
            <p className="text-xs text-muted-foreground">Active monitoring points</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.dangerNodes}</div>
            <p className="text-xs text-muted-foreground">
              {stats.warningNodes} warnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Water Level</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.avgWaterLevel)} m</div>
            <p className="text-xs text-muted-foreground">Across all nodes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Flow Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.avgFlowRate)} m³/s</div>
            <p className="text-xs text-muted-foreground">Current average</p>
          </CardContent>
        </Card>
      </div>

      {/* Node Table */}
      <Card>
        <CardHeader>
          <CardTitle>River Nodes Status</CardTitle>
          <CardDescription>Real-time monitoring of all river monitoring points</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node Name</TableHead>
                <TableHead>Water Level (m)</TableHead>
                <TableHead>Flow Rate (m³/s)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((node) => (
                <TableRow key={node.node_id}>
                  <TableCell className="font-medium">{node.name}</TableCell>
                  <TableCell>
                    {node.latest_reading
                      ? formatNumber(node.latest_reading.water_level)
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {node.latest_reading
                      ? formatNumber(node.latest_reading.flow_rate)
                      : 'N/A'}
                  </TableCell>
                  <TableCell>{getStatusBadge(node.status)}</TableCell>
                  <TableCell>
                    {node.latest_reading
                      ? formatTimestamp(node.latest_reading.timestamp)
                      : 'No data'}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => setSelectedNodeId(node.node_id)}
                      className="text-sm text-primary hover:underline"
                    >
                      View Chart
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {nodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No nodes found. Add nodes in the Admin Panel.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Historical Chart */}
      {selectedNodeId && (
        <Card>
          <CardHeader>
            <CardTitle>Historical Data</CardTitle>
            <CardDescription>
              {nodes.find((n) => n.node_id === selectedNodeId)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NodeChart nodeId={selectedNodeId} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
