import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { supabase, Node } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Edit, Trash2, Download } from 'lucide-react'

export default function AdminPanel() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingNode, setEditingNode] = useState<Node | null>(null)
  const [deletingNodeId, setDeletingNodeId] = useState<number | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    threshold: '',
  })

  useEffect(() => {
    fetchNodes()
  }, [])

  async function fetchNodes() {
    try {
      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .order('name')

      if (error) throw error
      setNodes(data || [])
    } catch (error) {
      console.error('Error fetching nodes:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch nodes',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const nodeData = {
      name: formData.name,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      threshold: parseFloat(formData.threshold),
    }

    try {
      if (editingNode) {
        const { error } = await supabase
          .from('nodes')
          .update(nodeData)
          .eq('node_id', editingNode.node_id)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Node updated successfully',
        })
      } else {
        const { error } = await supabase
          .from('nodes')
          .insert([nodeData])

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Node created successfully',
        })
      }

      setDialogOpen(false)
      resetForm()
      fetchNodes()
    } catch (error) {
      console.error('Error saving node:', error)
      toast({
        title: 'Error',
        description: 'Failed to save node',
        variant: 'destructive',
      })
    }
  }

  async function handleDelete() {
    if (!deletingNodeId) return

    try {
      // Delete associated readings first
      await supabase
        .from('readings')
        .delete()
        .eq('node_id', deletingNodeId)

      // Delete the node
      const { error } = await supabase
        .from('nodes')
        .delete()
        .eq('node_id', deletingNodeId)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Node deleted successfully',
      })

      setDeleteDialogOpen(false)
      setDeletingNodeId(null)
      fetchNodes()
    } catch (error) {
      console.error('Error deleting node:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete node',
        variant: 'destructive',
      })
    }
  }

  function openEditDialog(node: Node) {
    setEditingNode(node)
    setFormData({
      name: node.name,
      latitude: node.latitude.toString(),
      longitude: node.longitude.toString(),
      threshold: node.threshold.toString(),
    })
    setDialogOpen(true)
  }

  function openCreateDialog() {
    setEditingNode(null)
    resetForm()
    setDialogOpen(true)
  }

  function openDeleteDialog(nodeId: number) {
    setDeletingNodeId(nodeId)
    setDeleteDialogOpen(true)
  }

  function resetForm() {
    setFormData({
      name: '',
      latitude: '',
      longitude: '',
      threshold: '',
    })
    setEditingNode(null)
  }

  async function handleExportData() {
    try {
      const { data, error } = await supabase
        .from('readings')
        .select('*, nodes(name)')
        .order('timestamp', { ascending: false })

      if (error) throw error

      // Convert to CSV
      const csvContent = [
        ['Node', 'Water Level', 'Flow Rate', 'Timestamp'].join(','),
        ...(data || []).map((r: any) =>
          [
            r.nodes?.name || 'Unknown',
            r.water_level,
            r.flow_rate,
            r.timestamp,
          ].join(',')
        ),
      ].join('\n')

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `river-data-${new Date().toISOString()}.csv`
      a.click()

      toast({
        title: 'Success',
        description: 'Data exported successfully',
      })
    } catch (error) {
      console.error('Error exporting data:', error)
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Admin Panel</h2>
          <p className="text-muted-foreground">Manage river monitoring nodes and settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportData}>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Node
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingNode ? 'Edit Node' : 'Create New Node'}</DialogTitle>
                  <DialogDescription>
                    {editingNode ? 'Update the node information' : 'Add a new monitoring node to the system'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Node Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., River Point A"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="e.g., 40.7128"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="e.g., -74.0060"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="threshold">Alert Threshold (meters)</Label>
                    <Input
                      id="threshold"
                      type="number"
                      step="any"
                      value={formData.threshold}
                      onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
                      placeholder="e.g., 5.0"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingNode ? 'Update' : 'Create'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monitoring Nodes</CardTitle>
          <CardDescription>Manage all river monitoring points</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Latitude</TableHead>
                <TableHead>Longitude</TableHead>
                <TableHead>Threshold (m)</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((node) => (
                <TableRow key={node.node_id}>
                  <TableCell className="font-medium">{node.name}</TableCell>
                  <TableCell>{node.latitude.toFixed(4)}</TableCell>
                  <TableCell>{node.longitude.toFixed(4)}</TableCell>
                  <TableCell>{node.threshold}</TableCell>
                  <TableCell>{new Date(node.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(node)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDeleteDialog(node.node_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {nodes.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No nodes found. Create your first node to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the node and all its associated readings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
