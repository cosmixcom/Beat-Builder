import { useGetLeaderboard, useGetStats } from "@workspace/api-client-react";
import { BeatCard } from "@/components/beat-card";
import { motion } from "framer-motion";
import { Trophy, Users, Zap, Music } from "lucide-react";

export default function Leaderboard() {
  const { data: entries, isLoading } = useGetLeaderboard();
  const { data: stats } = useGetStats();

  return (
    <div className="flex flex-col h-full p-4 md:p-6 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center">
          <Trophy size={18} className="text-accent" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Leaderboard</h2>
          <p className="text-sm text-muted-foreground font-mono">Top beats by fan count</p>
        </div>
      </div>

      {/* Global stats strip */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Beats", value: stats.totalBeats.toLocaleString(), icon: <Music size={14} />, color: "text-secondary" },
            { label: "Total Fans", value: stats.totalFans.toLocaleString(), icon: <Users size={14} />, color: "text-primary" },
            { label: "Launches", value: stats.totalLaunches.toLocaleString(), icon: <Zap size={14} />, color: "text-accent" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card/40 border border-border/50 rounded-xl px-3 py-3 text-center">
              <div className={`flex items-center justify-center gap-1 ${stat.color} mb-1`}>
                {stat.icon}
                <span className="text-[10px] font-mono uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className={`font-black text-lg font-mono ${stat.color}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Top genre badge */}
      {stats && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground font-mono">Hottest genre right now:</span>
          <span className="text-accent font-bold bg-accent/10 border border-accent/30 rounded-full px-3 py-0.5 text-xs font-mono">
            {stats.topGenre}
          </span>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-36 bg-card/40 rounded-xl animate-pulse border border-border/40" />
          ))}
        </div>
      )}

      {!isLoading && entries && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Trophy size={28} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No launched beats yet</h3>
          <p className="text-sm text-muted-foreground">Make a beat in the Studio and launch it to get fans!</p>
        </div>
      )}

      {!isLoading && entries && entries.length > 0 && (
        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <BeatCard
                beat={{
                  ...entry,
                  sequence: "{}",
                  launched: true,
                  createdAt: new Date().toISOString(),
                  launchedAt: null,
                }}
                rank={index + 1}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
