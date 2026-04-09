import { Link, useLocation } from "wouter";
import { ReactNode } from "react";
import { Music, Trophy, Compass, Activity } from "lucide-react";
import { useGetStats } from "@workspace/api-client-react";

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: stats } = useGetStats();

  const navItems = [
    { href: "/", label: "Studio", icon: Music },
    { href: "/discover", label: "Discover", icon: Compass },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Sidebar / Topbar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)]">
              <Activity className="text-primary-foreground" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight neon-text">Beat Builder</h1>
              <p className="text-xs text-muted-foreground font-mono">v1.0</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      isActive
                        ? "bg-primary/20 text-primary border border-primary/30 shadow-[inset_0_0_10px_rgba(168,85,247,0.2)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon size={20} className={isActive ? "text-primary drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]" : ""} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Global Stats */}
        {stats && (
          <div className="hidden md:block mt-auto pt-6 border-t border-border">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-4 font-mono">Global Stats</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Beats</span>
                <span className="font-mono text-foreground">{stats.totalBeats.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Fans</span>
                <span className="font-mono text-primary drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">
                  {stats.totalFans.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Launches</span>
                <span className="font-mono text-secondary drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">
                  {stats.totalLaunches.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}