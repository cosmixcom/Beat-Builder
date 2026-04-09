import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, Rocket, Save, RotateCcw, Users, Flame, Heart, Trophy } from "lucide-react";
import { useCreateBeat, useLaunchBeat, useGetStats, getListBeatsQueryKey, getGetLeaderboardQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { TRACKS, GENRES, playSound, initializeAudio } from "@/lib/audio";

const STEPS = 16;
const DEFAULT_BPM = 120;

type SequenceState = Record<string, boolean[]>;

const emptySequence = (): SequenceState =>
  Object.fromEntries(TRACKS.map((t) => [t.id, Array(STEPS).fill(false)]));

const TRACK_ACTIVE_COLORS: Record<string, string> = {
  kick: "bg-primary shadow-[0_0_12px_rgba(168,85,247,0.8)]",
  snare: "bg-secondary shadow-[0_0_12px_rgba(0,255,255,0.8)]",
  hihat: "bg-accent shadow-[0_0_12px_rgba(255,0,128,0.8)]",
  bass: "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]",
  synth: "bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.8)]",
  melody: "bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.8)]",
};

const LAUNCH_MESSAGES_POOL = [
  "just saved your beat!",
  "left a comment: 'this slaps!!'",
  "shared this with 12 friends",
  "added this to their playlist",
  "said: 'need this on repeat'",
  "is playing this on loop",
  "sent this to their group chat",
  "started following you",
  "said: 'absolute fire bro'",
  "featured this in their DJ set",
];

const FAN_NAMES_POOL = ["TravisB", "SoundGirl", "RodWave84", "DJNightOwl", "BeatKing99", "MellowVibes", "NeonDrums", "LowKeyFan", "TrapQueen7", "SynthWave"];
const EMOJIS_POOL = ["🔥", "💜", "⚡", "🎧", "🎵", "💥", "🌊", "✨", "🎤", "🎹"];

function getRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export default function Studio() {
  const [sequence, setSequence] = useState<SequenceState>(emptySequence());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingStep, setPlayingStep] = useState(-1);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [beatName, setBeatName] = useState("My Beat");
  const [genre, setGenre] = useState(GENRES[0]);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [launchData, setLaunchData] = useState<{ fans: number; messages: string[]; milestone: string | null } | null>(null);
  const [savedBeatId, setSavedBeatId] = useState<number | null>(null);
  const [counterVal, setCounterVal] = useState(0);
  const [particles, setParticles] = useState<{ id: number; emoji: string; x: number; y: number }[]>([]);

  const schedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentStepRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const sequenceRef = useRef(sequence);
  const bpmRef = useRef(bpm);
  const isPlayingRef = useRef(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createBeat = useCreateBeat();
  const launchBeat = useLaunchBeat();
  const { data: stats } = useGetStats();

  useEffect(() => { sequenceRef.current = sequence; }, [sequence]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  const stopScheduler = useCallback(() => {
    isPlayingRef.current = false;
    if (schedulerRef.current) clearTimeout(schedulerRef.current);
    setIsPlaying(false);
    setPlayingStep(-1);
    currentStepRef.current = 0;
  }, []);

  const schedule = useCallback(() => {
    if (!isPlayingRef.current) return;
    const ctx = initializeAudio();
    const stepDuration = 60 / bpmRef.current / 4;

    while (nextNoteTimeRef.current < ctx.currentTime + 0.1) {
      const step = currentStepRef.current;
      const seq = sequenceRef.current;

      Object.entries(seq).forEach(([trackId, steps]) => {
        if (steps[step]) playSound(trackId, nextNoteTimeRef.current, step);
      });

      setPlayingStep(step);
      currentStepRef.current = (step + 1) % STEPS;
      nextNoteTimeRef.current += stepDuration;
    }

    schedulerRef.current = setTimeout(schedule, 25);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopScheduler();
    } else {
      const ctx = initializeAudio();
      nextNoteTimeRef.current = ctx.currentTime;
      currentStepRef.current = 0;
      isPlayingRef.current = true;
      setIsPlaying(true);
      schedule();
    }
  }, [isPlaying, stopScheduler, schedule]);

  useEffect(() => () => stopScheduler(), [stopScheduler]);

  const toggleStep = (trackId: string, step: number) => {
    setSequence((prev) => {
      const next = { ...prev, [trackId]: [...prev[trackId]] };
      const wasActive = next[trackId][step];
      next[trackId][step] = !wasActive;
      if (!wasActive) {
        const ctx = initializeAudio();
        playSound(trackId, ctx.currentTime, step);
      }
      return next;
    });
  };

  const resetSequence = () => {
    stopScheduler();
    setSequence(emptySequence());
    setSavedBeatId(null);
  };

  const handleSave = () => {
    const seq = JSON.stringify(Object.fromEntries(
      Object.entries(sequence).map(([k, v]) => [k, v.map(b => b ? 1 : 0)])
    ));
    createBeat.mutate(
      { data: { name: beatName, genre, bpm, sequence: seq } },
      {
        onSuccess: (beat) => {
          setSavedBeatId(beat.id);
          queryClient.invalidateQueries({ queryKey: getListBeatsQueryKey() });
          toast({ title: "Beat saved!", description: `"${beat.name}" is ready to launch.` });
        },
      }
    );
  };

  const handleLaunch = () => {
    if (!savedBeatId) {
      toast({ title: "Save your beat first", description: "Hit Save before launching.", variant: "destructive" });
      return;
    }
    launchBeat.mutate(
      { id: savedBeatId },
      {
        onSuccess: (result) => {
          setLaunchData({ fans: result.newFans, messages: result.messages ?? [], milestone: result.milestone ?? null });
          setShowLaunchModal(true);
          setCounterVal(0);
          queryClient.invalidateQueries({ queryKey: getListBeatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });

          // Particle burst
          const newParticles = Array.from({ length: 20 }, (_, i) => ({
            id: Date.now() + i,
            emoji: getRandom(["🔥", "💜", "⚡", "✨", "🎵", "💥"]),
            x: Math.random() * 100,
            y: Math.random() * 100,
          }));
          setParticles(newParticles);
          setTimeout(() => setParticles([]), 3000);

          // Animate fan counter
          let count = 0;
          const target = result.newFans;
          const increment = Math.ceil(target / 60);
          const interval = setInterval(() => {
            count = Math.min(count + increment, target);
            setCounterVal(count);
            if (count >= target) clearInterval(interval);
          }, 16);
        },
      }
    );
  };

  const activeStepCount = Object.values(sequence).flat().filter(Boolean).length;

  return (
    <div className="flex flex-col h-full p-4 md:p-6 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Beat Studio</h2>
          <p className="text-sm text-muted-foreground font-mono">{activeStepCount} active steps</p>
        </div>
        {stats && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users size={14} className="text-primary" />
            <span className="font-mono">{stats.totalFans.toLocaleString()} total fans</span>
          </div>
        )}
      </div>

      {/* Beat Name / Genre / BPM Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1 block">Beat Name</label>
          <input
            type="text"
            value={beatName}
            onChange={(e) => setBeatName(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground font-medium text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
            data-testid="input-beat-name"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1 block">Genre</label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground font-medium text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
            data-testid="select-genre"
          >
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1 block">BPM: {bpm}</label>
          <input
            type="range"
            min={60}
            max={180}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
            data-testid="slider-bpm"
          />
        </div>
      </div>

      {/* Sequencer Grid */}
      <div className="bg-card/40 border border-border/60 rounded-xl p-4 flex flex-col gap-2">
        {/* Step numbers */}
        <div className="flex gap-1 pl-20 sm:pl-28 mb-1">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div key={i} className={`flex-1 text-center text-[9px] font-mono ${(i % 4 === 0) ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
              {i % 4 === 0 ? i + 1 : "·"}
            </div>
          ))}
        </div>

        {TRACKS.map((track) => (
          <div key={track.id} className="flex items-center gap-1">
            <div className="w-20 sm:w-28 shrink-0">
              <span className="text-xs font-medium text-muted-foreground truncate">{track.name}</span>
            </div>
            {Array.from({ length: STEPS }).map((_, step) => {
              const active = sequence[track.id][step];
              const isCurrent = isPlaying && step === playingStep;
              return (
                <motion.button
                  key={step}
                  onClick={() => toggleStep(track.id, step)}
                  whileTap={{ scale: 0.85 }}
                  className={`flex-1 h-7 sm:h-8 rounded-sm transition-all duration-75 border border-transparent
                    ${isCurrent ? "ring-2 ring-white/60 scale-105" : ""}
                    ${active
                      ? TRACK_ACTIVE_COLORS[track.id]
                      : isCurrent
                        ? "bg-white/20 border-white/20"
                        : "bg-white/5 hover:bg-white/10 border-white/5"
                    }`}
                  data-testid={`step-${track.id}-${step}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Playback Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={togglePlay}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            isPlaying
              ? "bg-destructive/20 border border-destructive/40 text-destructive hover:bg-destructive/30"
              : "bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
          }`}
          data-testid="btn-play"
        >
          {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          {isPlaying ? "Stop" : "Play"}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={resetSequence}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
          data-testid="btn-reset"
        >
          <RotateCcw size={16} />
          Reset
        </motion.button>

        <div className="flex-1" />

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          disabled={createBeat.isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-secondary/20 border border-secondary/40 text-secondary hover:bg-secondary/30 transition-all disabled:opacity-50"
          data-testid="btn-save"
        >
          <Save size={16} />
          {createBeat.isPending ? "Saving..." : savedBeatId ? "Saved" : "Save Beat"}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleLaunch}
          disabled={launchBeat.isPending || !savedBeatId}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-primary to-accent border-0 text-white hover:opacity-90 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
          data-testid="btn-launch"
        >
          <Rocket size={18} />
          {launchBeat.isPending ? "Launching..." : "Launch Beat"}
        </motion.button>
      </div>

      {/* Particles */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="fixed pointer-events-none z-50 text-2xl"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            initial={{ opacity: 1, scale: 0, y: 0 }}
            animate={{ opacity: 0, scale: 2, y: -100 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
          >
            {p.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Launch Modal */}
      <AnimatePresence>
        {showLaunchModal && launchData && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLaunchModal(false)}
          >
            <motion.div
              className="bg-card border border-primary/40 rounded-2xl p-8 max-w-md w-full text-center shadow-[0_0_80px_rgba(168,85,247,0.3)]"
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 50 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                className="text-6xl mb-4"
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                🚀
              </motion.div>
              <h2 className="text-3xl font-black text-foreground mb-1">Beat Launched!</h2>
              {launchData.milestone && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm font-bold text-secondary bg-secondary/10 border border-secondary/30 rounded-full px-3 py-1 inline-block mb-3"
                >
                  {launchData.milestone}
                </motion.div>
              )}

              <div className="my-6">
                <div className="text-sm text-muted-foreground font-mono uppercase tracking-wider mb-1">New Fans</div>
                <motion.div
                  className="text-6xl font-black text-primary font-mono drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]"
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  +{counterVal.toLocaleString()}
                </motion.div>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto text-left">
                {launchData.messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="text-sm text-muted-foreground bg-white/5 rounded-lg px-3 py-2 font-mono"
                  >
                    {msg}
                  </motion.div>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <div className="flex-1 flex items-center gap-2 justify-center text-primary bg-primary/10 border border-primary/20 rounded-lg py-2">
                  <Users size={16} />
                  <span className="font-bold font-mono">{launchData.fans.toLocaleString()} new fans</span>
                </div>
                <button
                  onClick={() => setShowLaunchModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm font-medium transition-colors"
                  data-testid="btn-close-launch"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
