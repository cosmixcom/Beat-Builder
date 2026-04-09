import { useState } from "react";
import { Beat } from "@workspace/api-client-react";
import { useReactToBeat, getListBeatsQueryKey, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, Flame, Play, Square, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { playSound, initializeAudio } from "@/lib/audio";

interface BeatCardProps {
  beat: Beat;
  rank?: number;
}

export function BeatCard({ beat, rank }: BeatCardProps) {
  const queryClient = useQueryClient();
  const reactToBeat = useReactToBeat();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingStep, setPlayingStep] = useState(-1);

  const handleReact = (reaction: "like" | "fire") => {
    reactToBeat.mutate(
      { id: beat.id, data: { reaction } },
      {
        onSuccess: (updatedBeat) => {
          // Optimistically update caches
          queryClient.setQueryData(getListBeatsQueryKey(), (old: Beat[] | undefined) => {
            if (!old) return old;
            return old.map(b => b.id === updatedBeat.id ? updatedBeat : b);
          });
          queryClient.setQueryData(getGetLeaderboardQueryKey(), (old: any) => {
            if (!old) return old;
            return old.map((b: any) => b.id === updatedBeat.id ? { ...b, likes: updatedBeat.likes, fires: updatedBeat.fires } : b);
          });
        }
      }
    );
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      setPlayingStep(-1);
      return;
    }

    const ctx = initializeAudio();
    setIsPlaying(true);
    let currentStep = 0;
    let nextNoteTime = ctx.currentTime;
    
    // Parse sequence
    const seq = JSON.parse(beat.sequence);
    const stepDuration = 60 / beat.bpm / 4; // 16th notes

    const playLoop = () => {
      if (!isPlaying) return;
      
      while (nextNoteTime < ctx.currentTime + 0.1) {
        // Schedule sounds for current step
        Object.entries(seq).forEach(([trackId, trackSteps]: [string, any]) => {
          if (trackSteps[currentStep]) {
            playSound(trackId, nextNoteTime, currentStep);
          }
        });

        // Update UI
        setPlayingStep(currentStep);

        // Advance step
        currentStep = (currentStep + 1) % 16;
        nextNoteTime += stepDuration;
      }
      
      if (isPlaying) {
        requestAnimationFrame(playLoop);
      }
    };

    playLoop();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-5 bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-colors group relative overflow-hidden">
        {rank !== undefined && (
          <div className="absolute -left-6 -top-6 w-16 h-16 bg-primary/20 rotate-45 flex items-end justify-center pb-2 z-0">
            <span className="font-mono text-primary font-bold drop-shadow-[0_0_5px_rgba(168,85,247,0.8)] -rotate-45">#{rank}</span>
          </div>
        )}
        
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex gap-4">
            <button
              onClick={togglePlay}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isPlaying 
                  ? "bg-secondary text-secondary-foreground shadow-[0_0_15px_rgba(6,182,212,0.5)]" 
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
              data-testid={`btn-play-${beat.id}`}
            >
              {isPlaying ? <Square fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} className="ml-1" />}
            </button>
            <div>
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{beat.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-white/10">{beat.genre}</Badge>
                <span className="text-xs text-muted-foreground font-mono">{beat.bpm} BPM</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
              <Users size={14} />
              <span className="font-bold text-sm font-mono">{beat.fans.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Visualizer simplified */}
        <div className="mt-5 flex gap-1 h-8 items-end opacity-50">
          {Array.from({ length: 16 }).map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 rounded-sm transition-all duration-75 ${
                i === playingStep 
                  ? "bg-secondary h-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                  : "bg-white/10 h-2"
              }`} 
            />
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-border flex gap-3">
          <button
            onClick={() => handleReact("fire")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition-colors"
            data-testid={`btn-react-fire-${beat.id}`}
          >
            <Flame size={16} className="text-accent" />
            <span className="font-mono">{beat.fires}</span>
          </button>
          <button
            onClick={() => handleReact("like")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-pink-500 transition-colors"
            data-testid={`btn-react-like-${beat.id}`}
          >
            <Heart size={16} className="text-pink-500" />
            <span className="font-mono">{beat.likes}</span>
          </button>
        </div>
      </Card>
    </motion.div>
  );
}