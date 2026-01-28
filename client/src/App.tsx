import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import MapView from '@/pages/MapView'
import Alerts from '@/pages/Alerts'
import AdminPanel from '@/pages/AdminPanel'
import LiveFeed from '@/pages/LiveFeed'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/live" element={<LiveFeed />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </Layout>
      <Toaster />
    </Router>
  )
}

export default App
