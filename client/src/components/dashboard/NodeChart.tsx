import { useEffect, useState } from 'react'
import { supabase, Reading } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatTimestamp } from '@/lib/utils'

interface NodeChartProps {
  nodeId: number
}

export default function NodeChart({ nodeId }: NodeChartProps) {
  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReadings()
  }, [nodeId])

  async function fetchReadings() {
    try {
      const { data, error } = await supabase
        .from('readings')
        .select('*')
        .eq('node_id', nodeId)
        .order('timestamp', { ascending: true })
        .limit(50)

      if (error) throw error
      setReadings(data || [])
    } catch (error) {
      console.error('Error fetching readings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading chart...</div>
  }

  if (readings.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No historical data available for this node
      </div>
    )
  }

  const chartData = readings.map((reading) => ({
    time: new Date(reading.timestamp).toLocaleTimeString(),
    'Water Level': reading.water_level,
    'Flow Rate': reading.flow_rate,
  }))

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="Water Level" stroke="#3b82f6" strokeWidth={2} />
        <Line type="monotone" dataKey="Flow Rate" stroke="#10b981" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
