// REDLINE audio · everything is synthesized with WebAudio (no files, no licensing).
// Created lazily on the first user gesture (browsers block audio before that).

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

// A short original synth loop in A minor: bass on 8ths, a sparse arp on 16ths.
const BPM = 112;
const BASS = [45, 45, 57, 45, 43, 43, 55, 43, 41, 41, 53, 41, 43, 43, 55, 47];
const ARP = [69, 72, 76, 72, 67, 71, 74, 71, 65, 69, 72, 69, 67, 71, 74, 79];

export function createAudio() {
  let ac = null;
  let master, sfxBus, musicBus, engineGain, engOsc1, engOsc2, engFilter, noiseBuf;
  let cfg = { sound: true, music: true, volume: 0.7 };
  let musicOn = false, nextNote = 0, step = 0, timer = 0;

  function init() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain();
    master.connect(ac.destination);
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(master);
    sfxBus = ac.createGain();
    sfxBus.connect(comp);
    musicBus = ac.createGain();
    musicBus.gain.value = 0.32;
    musicBus.connect(comp);

    // engine: two detuned oscillators through a lowpass whose cutoff follows revs
    engFilter = ac.createBiquadFilter();
    engFilter.type = 'lowpass';
    engFilter.frequency.value = 400;
    engFilter.Q.value = 6;
    engineGain = ac.createGain();
    engineGain.gain.value = 0;
    engFilter.connect(engineGain);
    engineGain.connect(sfxBus);
    engOsc1 = ac.createOscillator();
    engOsc1.type = 'sawtooth';
    engOsc2 = ac.createOscillator();
    engOsc2.type = 'square';
    engOsc2.detune.value = 9;
    engOsc1.connect(engFilter);
    engOsc2.connect(engFilter);
    engOsc1.start();
    engOsc2.start();

    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    apply();
    return true;
  }

  function apply() {
    if (!ac) return;
    master.gain.setTargetAtTime(cfg.sound ? cfg.volume : 0, ac.currentTime, 0.05);
    musicBus.gain.setTargetAtTime(cfg.music ? 0.32 : 0, ac.currentTime, 0.1);
  }

  function env(g, t, a, peak, dcy) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy);
  }

  function tone(type, f0, f1, dur, peak = 0.25, when = 0, bus = sfxBus) {
    const t = ac.currentTime + when;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, 0.005, peak, dur);
    o.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur, peak, f0, f1, type = 'bandpass', when = 0) {
    const t = ac.currentTime + when;
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    f.Q.value = 1.2;
    const g = ac.createGain();
    env(g, t, 0.01, peak, dur);
    s.connect(f);
    f.connect(g);
    g.connect(sfxBus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }

  // ---- music scheduler (lookahead) ----
  function schedule() {
    if (!musicOn || !ac) return;
    const spb = 60 / BPM / 4; // 16th note
    while (nextNote < ac.currentTime + 0.15) {
      const i = step % 16;
      const bar = Math.floor(step / 16) % 4;
      if (i % 2 === 0) {
        const n = BASS[(bar * 4 + i / 2) % 16];
        const o = ac.createOscillator();
        const f = ac.createBiquadFilter();
        const g = ac.createGain();
        o.type = 'sawtooth';
        o.frequency.value = NOTE(n - 12);
        f.type = 'lowpass';
        f.frequency.setValueAtTime(900, nextNote);
        f.frequency.exponentialRampToValueAtTime(160, nextNote + spb * 1.8);
        env(g, nextNote, 0.005, 0.35, spb * 1.8);
        o.connect(f); f.connect(g); g.connect(musicBus);
        o.start(nextNote); o.stop(nextNote + spb * 2);
      }
      if (i % 4 === 0) {
        // kick
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.frequency.setValueAtTime(140, nextNote);
        o.frequency.exponentialRampToValueAtTime(42, nextNote + 0.12);
        env(g, nextNote, 0.002, 0.6, 0.16);
        o.connect(g); g.connect(musicBus);
        o.start(nextNote); o.stop(nextNote + 0.2);
      }
      if (i === 4 || i === 12) {
        // snare: noise burst
        const s = ac.createBufferSource();
        s.buffer = noiseBuf;
        const f = ac.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 1800;
        const g = ac.createGain();
        env(g, nextNote, 0.002, 0.22, 0.12);
        s.connect(f); f.connect(g); g.connect(musicBus);
        s.start(nextNote, Math.random() * 0.5); s.stop(nextNote + 0.15);
      }
      if (bar >= 2 || i % 2 === 1) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = 'square';
        o.frequency.value = NOTE(ARP[(i + bar * 3) % 16]);
        env(g, nextNote, 0.003, 0.05, spb * 0.9);
        o.connect(g); g.connect(musicBus);
        o.start(nextNote); o.stop(nextNote + spb);
      }
      nextNote += spb;
      step++;
    }
  }

  return {
    unlock() {
      if (!init()) return;
      if (ac.state === 'suspended') ac.resume();
    },
    configure(c) {
      cfg = { ...cfg, ...c };
      apply();
    },
    musicStart() {
      if (!ac || musicOn) return;
      musicOn = true;
      nextNote = ac.currentTime + 0.05;
      step = 0;
      timer = setInterval(schedule, 40);
    },
    musicStop() {
      musicOn = false;
      clearInterval(timer);
    },
    engine(on, speedPct, overclock) {
      if (!ac) return;
      const t = ac.currentTime;
      const f = 38 + speedPct * 120 + (overclock ? 28 : 0);
      engOsc1.frequency.setTargetAtTime(f, t, 0.05);
      engOsc2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
      engFilter.frequency.setTargetAtTime(260 + speedPct * 1500 + (overclock ? 900 : 0), t, 0.06);
      engineGain.gain.setTargetAtTime(on ? 0.05 + speedPct * 0.05 : 0, t, 0.08);
    },
    sfx(name, p = 0) {
      if (!ac || !cfg.sound) return;
      switch (name) {
        case 'shard': {
          const base = 660 * Math.pow(2, Math.min(p, 12) / 12);
          tone('triangle', base, base, 0.09, 0.18);
          tone('triangle', base * 1.5, base * 1.5, 0.12, 0.14, 0.05);
          break;
        }
        case 'file':
          [0, 4, 7, 12].forEach((s, i) => tone('square', 523 * Math.pow(2, s / 12), 523 * Math.pow(2, s / 12), 0.14, 0.09, i * 0.07));
          break;
        case 'nearmiss':
          noise(0.35, 0.3, 300, 3200, 'bandpass');
          break;
        case 'slip':
          tone('sawtooth', 220, 880, 0.5, 0.08);
          noise(0.5, 0.15, 800, 5000, 'highpass');
          break;
        case 'hit':
          tone('sine', 140, 38, 0.35, 0.6);
          noise(0.3, 0.45, 2400, 200, 'lowpass');
          break;
        case 'scrape':
          noise(0.12, 0.12, 3500, 2500, 'bandpass');
          break;
        case 'glitch':
          for (let i = 0; i < 6; i++) tone('square', 200 + Math.random() * 1600, 80 + Math.random() * 400, 0.06, 0.08, i * 0.05);
          break;
        case 'count':
          tone('square', 440, 440, 0.12, 0.12);
          break;
        case 'go':
          tone('square', 880, 880, 0.3, 0.14);
          break;
        case 'over':
          tone('sawtooth', 330, 55, 1.1, 0.2);
          break;
        case 'ui':
          tone('triangle', 1200, 1200, 0.04, 0.06);
          break;
        default:
      }
    },
    suspend() {
      if (ac && ac.state === 'running') ac.suspend();
    },
    resume() {
      if (ac && ac.state === 'suspended') ac.resume();
    },
    destroy() {
      musicOn = false;
      clearInterval(timer);
      if (ac) ac.close();
      ac = null;
    },
  };
}
