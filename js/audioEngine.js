/**
 * VYBE Music App - Web Audio Engine & Audio Visualizer Bridge
 * Generates dynamic harmonious audio playback for mock tracks and drives real-time audio visualization.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;
    this.isPlaying = false;
    this.currentTrack = null;
    this.currentTime = 0;
    this.duration = 180;
    this.volume = 0.75;
    this.timer = null;
    this.noteInterval = null;
    this.noteStep = 0;
    this.onTimeUpdate = null;
    this.onEnded = null;
    this.onStateChange = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.85;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTrack(track, startFrom = 0) {
    this.ensureContext();
    this.stopPlayback(false);

    this.currentTrack = track;
    this.currentTime = startFrom;
    this.duration = track.durationSec || 180;
    this.isPlaying = true;

    if (this.onStateChange) this.onStateChange(true, track);

    // Schedule rhythmic notes
    this.startSynthLoop(track);

    // Elapsed time ticker
    this.timer = setInterval(() => {
      this.currentTime += 0.5;
      if (this.currentTime >= this.duration) {
        this.stopPlayback(false);
        if (this.onEnded) this.onEnded();
      } else {
        if (this.onTimeUpdate) this.onTimeUpdate(this.currentTime, this.duration);
      }
    }, 500);
  }

  startSynthLoop(track) {
    if (!this.ctx) return;

    const bpm = track.bpm || 110;
    const intervalMs = (60 / bpm) * 500; // 8th note rhythm
    const scale = track.synthScale || [261.63, 329.63, 392.00, 523.25];
    const isHeavy = track.moods.includes('workout') || track.moods.includes('energetic');
    const isGentle = track.moods.includes('chill') || track.moods.includes('sad');

    this.noteStep = 0;

    this.noteInterval = setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;

      const freq = scale[this.noteStep % scale.length];
      const now = this.ctx.currentTime;

      // Primary melodic synth
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = isGentle ? 'sine' : isHeavy ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isHeavy ? 2800 : 1400, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.35);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(isGentle ? 0.08 : 0.14, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.4);

      // Bass punch on beat 0 and 4
      if (this.noteStep % 4 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(scale[0] / 2, now);
        bassOsc.frequency.exponentialRampToValueAtTime(scale[0] / 4, now + 0.2);

        bassGain.gain.setValueAtTime(0.18, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGain);

        bassOsc.start(now);
        bassOsc.stop(now + 0.3);
      }

      this.noteStep++;
    }, intervalMs);
  }

  togglePlayPause() {
    if (!this.currentTrack) return false;
    if (this.isPlaying) {
      this.pause();
      return false;
    } else {
      this.resume();
      return true;
    }
  }

  pause() {
    this.isPlaying = false;
    if (this.noteInterval) {
      clearInterval(this.noteInterval);
      this.noteInterval = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.onStateChange) this.onStateChange(false, this.currentTrack);
  }

  resume() {
    if (!this.currentTrack) return;
    this.ensureContext();
    this.isPlaying = true;
    if (this.onStateChange) this.onStateChange(true, this.currentTrack);

    this.startSynthLoop(this.currentTrack);

    this.timer = setInterval(() => {
      this.currentTime += 0.5;
      if (this.currentTime >= this.duration) {
        this.stopPlayback(false);
        if (this.onEnded) this.onEnded();
      } else {
        if (this.onTimeUpdate) this.onTimeUpdate(this.currentTime, this.duration);
      }
    }, 500);
  }

  seek(percent) {
    if (!this.currentTrack) return;
    this.currentTime = Math.min(this.duration, Math.max(0, percent * this.duration));
    if (this.onTimeUpdate) this.onTimeUpdate(this.currentTime, this.duration);
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  stopPlayback(clearTrack = true) {
    this.isPlaying = false;
    if (this.noteInterval) {
      clearInterval(this.noteInterval);
      this.noteInterval = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (clearTrack) {
      this.currentTrack = null;
      this.currentTime = 0;
    }
    if (this.onStateChange) this.onStateChange(false, this.currentTrack);
  }

  getFrequencyData(array) {
    if (this.analyser && this.isPlaying) {
      this.analyser.getByteFrequencyData(array);
    } else {
      for (let i = 0; i < array.length; i++) array[i] = 0;
    }
  }
}

window.audioEngine = new AudioEngine();
