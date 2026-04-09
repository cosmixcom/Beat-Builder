import { useListBeats } from "@workspace/api-client-react";
import { BeatCard } from "@/components/beat-card";
import { motion } from "framer-motion";
import { Compass, Music } from "lucide-react";

export default function Discover() {
  const { data: beats, isLoading } = useListBeats();

  return (
    <div className="flex flex-col h-full p-4 md:p-6 gap-4 overflow-y-auto">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center">
          <Compass size={18} className="text-secondary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Discover</h2>
          <p className="text-sm text-muted-foreground font-mono">
            {beats ? `${beats.length} beats from the community` : "Loading beats..."}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 bg-card/40 rounded-xl animate-pulse border border-border/40" />
          ))}
        </div>
      )}

      {!isLoading && beats && beats.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Music size={28} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No beats yet</h3>
          <p className="text-sm text-muted-foreground">Head to the Studio and create the first beat.</p>
        </div>
      )}

      {!isLoading && beats && beats.length > 0 && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
        >
          {beats.map((beat) => (
            <BeatCard key={beat.id} beat={beat} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
