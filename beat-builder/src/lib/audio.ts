export const TRACKS = [
  { id: "kick", name: "Kick Drum", color: "bg-primary" },
  { id: "snare", name: "Snare", color: "bg-secondary" },
  { id: "hihat", name: "Hi-Hat", color: "bg-accent" },
  { id: "bass", name: "Bass", color: "bg-blue-500" },
  { id: "synth", name: "Synth Pad", color: "bg-purple-500" },
  { id: "melody", name: "Melody", color: "bg-pink-500" },
];

export const GENRES = ["Trap", "Lo-Fi", "House", "R&B", "Pop", "Techno"];

let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

// Synth functions
const playKick = (time: number) => {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(0.001, time + 0.5);
  
  gain.gain.setValueAtTime(1, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
  
  osc.start(time);
  osc.stop(time + 0.5);
};

const playSnare = (time: number) => {
  const ctx = getAudioContext();
  
  // Noise
  const noiseSize = ctx.sampleRate * 0.5; // 0.5 seconds
  const buffer = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < noiseSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1000;
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(1, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  
  // Oscillator (body)
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const oscGain = ctx.createGain();
  
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  
  osc.frequency.setValueAtTime(250, time);
  oscGain.gain.setValueAtTime(0.5, time);
  oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
  
  noise.start(time);
  osc.start(time);
  noise.stop(time + 0.2);
  osc.stop(time + 0.2);
};

const playHiHat = (time: number) => {
  const ctx = getAudioContext();
  const ratio = 1.2;
  
  // Create a mix of high-frequency oscillators
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  const osc4 = ctx.createOscillator();
  
  osc1.type = 'square';
  osc2.type = 'square';
  osc3.type = 'square';
  osc4.type = 'square';
  
  osc1.frequency.value = 200 * ratio;
  osc2.frequency.value = 300 * ratio;
  osc3.frequency.value = 400 * ratio;
  osc4.frequency.value = 800 * ratio;
  
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 10000;
  
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 7000;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(1, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
  
  osc1.connect(bandpass);
  osc2.connect(bandpass);
  osc3.connect(bandpass);
  osc4.connect(bandpass);
  
  bandpass.connect(highpass);
  highpass.connect(gain);
  gain.connect(ctx.destination);
  
  osc1.start(time);
  osc2.start(time);
  osc3.start(time);
  osc4.start(time);
  
  osc1.stop(time + 0.05);
  osc2.stop(time + 0.05);
  osc3.stop(time + 0.05);
  osc4.stop(time + 0.05);
};

const playBass = (time: number) => {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.value = 55; // A1
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.8, time + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
  
  osc.start(time);
  osc.stop(time + 0.4);
};

const playSynth = (time: number) => {
  const ctx = getAudioContext();
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc1.type = 'sine';
  osc2.type = 'triangle';
  osc1.frequency.value = 440; // A4
  osc2.frequency.value = 444; // slight detune
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, time);
  filter.frequency.exponentialRampToValueAtTime(400, time + 0.4);
  
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.3, time + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
  
  osc1.start(time);
  osc2.start(time);
  osc1.stop(time + 0.6);
  osc2.stop(time + 0.6);
};

const melodyNotes = [440, 493.88, 523.25, 587.33, 659.25, 783.99, 880]; // A minor pentatonic approx
const playMelody = (time: number, step: number) => {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'square';
  // Pick a note based on step to make it sound arpeggiated
  osc.frequency.value = melodyNotes[step % melodyNotes.length]; 
  
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1500;
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.2, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
  
  osc.start(time);
  osc.stop(time + 0.3);
};

export const playSound = (trackId: string, time: number, step: number) => {
  if (getAudioContext().state === 'suspended') {
    getAudioContext().resume();
  }
  
  switch (trackId) {
    case 'kick': playKick(time); break;
    case 'snare': playSnare(time); break;
    case 'hihat': playHiHat(time); break;
    case 'bass': playBass(time); break;
    case 'synth': playSynth(time); break;
    case 'melody': playMelody(time, step); break;
  }
};

export const initializeAudio = () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
};
