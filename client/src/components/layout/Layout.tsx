import { ReactNode, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Waves, LayoutDashboard, Map, Bell, Settings, ChevronLeft, ChevronRight, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & Stats' },
    { path: '/live', label: 'Live Feed', icon: Radio, description: 'Real-time Sensor' },
    { path: '/map', label: 'Live Map', icon: Map, description: 'Real-time Monitoring' },
    { path: '/alerts', label: 'Alerts', icon: Bell, description: 'Notifications', badge: 3 },
    { path: '/admin', label: 'Settings', icon: Settings, description: 'Configuration' },
  ]

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Sidebar */}
      <aside 
        className={cn(
          "relative border-r bg-card/50 backdrop-blur-xl flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out",
          collapsed ? "w-20" : "w-72"
        )}
      >
        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-md hover:bg-accent transition-colors"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        {/* Logo/Header */}
        <div className="p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg"></div>
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-cyan-400 shadow-lg">
                <Waves className="h-6 w-6 text-white" />
              </div>
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="text-xl font-bold tracking-tight">RiverWatch</h1>
                <p className="text-xs text-muted-foreground">Tupi, South Cotabato</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Status Indicator */}
        {!collapsed && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Radio className="h-4 w-4 text-emerald-500" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500"></span>
              </div>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">System Online</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 mt-2">
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "group relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "drop-shadow-sm")} />
                  {!collapsed && (
                    <>
                      <div className="flex-1 overflow-hidden">
                        <div className="truncate">{item.label}</div>
                        {!isActive && (
                          <div className="text-[10px] text-muted-foreground/70 truncate">{item.description}</div>
                        )}
                      </div>
                      {item.badge && (
                        <span className={cn(
                          "flex h-5 min-w-5 items-center justify-center rounded-full text-[10px] font-bold",
                          isActive 
                            ? "bg-white/20 text-white" 
                            : "bg-destructive text-destructive-foreground"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t bg-muted/30">
          {collapsed ? (
            <div className="flex justify-center">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status</span>
                <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Last Sync</span>
                <span className="font-mono font-medium">{currentTime.toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="border-b bg-card/50 backdrop-blur-xl px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Real-time Water Level Monitoring • {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-muted-foreground">5 nodes active</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
