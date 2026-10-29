// Four small sounds, synthesised with the Web Audio API (no audio files).
// Every number you might want to tweak is in `defaults` below, or use the
// "sound lab" panel on the page to tune by ear and then copy the numbers here.

const Sound = (() => {
  const defaults = {
    master: 0.15,                                   // overall volume (keep low)
    zwoop:  { f0: 300,  f1: 900,  dur: 1 }   ,      // camera zoom: pitch sweep in Hz, seconds
    tindin: { hi: 1570, lo: 1175, gap: 0.15, decay: 0.65 }, // attention chime: G6 then D6
    pop:    { f: 600, dur: 0.09 },                  // something appears / tapped
    page:   { f0: 800, f1: 2600, dur: 0.35 }        // page turn: filtered-noise sweep
  };
  const params = JSON.parse(JSON.stringify(defaults));

  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let muted = false;
  try { muted = sessionStorage.getItem("muted") === "1"; } catch (e) {}

  // Browsers block audio until the user interacts, so this is called from a click.
  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : params.master;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
  }

  function applyVolume() {
    if (master) master.gain.value = muted ? 0 : params.master;
  }

  function setMuted(value) {
    muted = value;
    try { sessionStorage.setItem("muted", value ? "1" : "0"); } catch (e) {}
    applyVolume();
  }

  const isMuted = () => muted;
  const canPlay = () => ctx && !muted;

  // A gain node that rises to `peak` quickly, then fades to silence.
  function envelope(t, attack, peak, total) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + total);
    g.connect(master);
    return g;
  }

  function tone(type, f0, f1, t, dur, peak, attack) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    osc.connect(envelope(t, attack, peak, dur));
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // Camera zoom. Zooming out plays the sweep backwards (falling pitch).
  function zwoop(opts = {}) {
    if (!canPlay()) return;
    const p = params.zwoop;
    const dur = opts.dur || p.dur;
    const [a, b] = opts.reverse ? [p.f1, p.f0] : [p.f0, p.f1];
    tone("sine", a, b, ctx.currentTime, dur, 0.9, Math.min(0.03, dur / 4));
  }

  // Two soft chimes: high note, then lower note.
  function tindin() {
    if (!canPlay()) return;
    const p = params.tindin;
    const t = ctx.currentTime;
    tone("triangle", p.hi, p.hi, t, p.decay, 0.7, 0.01);
    tone("triangle", p.lo, p.lo, t + p.gap, p.decay, 0.7, 0.01);
  }

  // Tiny blip.
  function pop() {
    if (!canPlay()) return;
    const p = params.pop;
    tone("sine", p.f, p.f * 0.5, ctx.currentTime, p.dur, 0.9, 0.005);
  }

  // Paper-like whoosh: noise through a band-pass filter that sweeps upward.
  function page() {
    if (!canPlay()) return;
    const p = params.page;
    const t = ctx.currentTime;
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(p.f0, t);
    filter.frequency.exponentialRampToValueAtTime(p.f1, t + p.dur);
    src.connect(filter);
    filter.connect(envelope(t, p.dur * 0.3, 0.8, p.dur));
    src.start(t);
    src.stop(t + p.dur + 0.05);
  }

  // The easter egg's cinematic: a low rumble that swells for `dur` seconds, then a boom. Both go through one
  // bus so hush() can cut them off the moment the intro is skipped.
  let bus = null;
  function fxBus() {
    if (!bus) { bus = ctx.createGain(); bus.connect(master); }
    return bus;
  }
  function rumble(delay, dur) {
    if (!canPlay()) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator(), low = ctx.createBiquadFilter(), g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(34, t);
    osc.frequency.exponentialRampToValueAtTime(72, t + dur);
    low.type = "lowpass";
    low.frequency.setValueAtTime(90, t);
    low.frequency.exponentialRampToValueAtTime(420, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + dur);
    osc.connect(low); low.connect(g); g.connect(fxBus());
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function boom(delay) {
    if (!canPlay()) return;
    const t = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(26, t + 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    osc.connect(g); g.connect(fxBus());
    osc.start(t); osc.stop(t + 1.15);
    tone("square", 180, 60, t, 0.25, 0.25, 0.005);
  }
  function hush() {
    if (!bus) return;
    bus.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    bus = null;
  }

  return { params, defaults, unlock, applyVolume, setMuted, isMuted, zwoop, tindin, pop, page, rumble, boom, hush };
})();
