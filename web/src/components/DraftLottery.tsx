"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── DATA ──────────────────────────────────────────────────────────────────
type Team = { name: string; odds: number; color: string };

// Odds order preserved; colors re-picked to sit in the Steak Frites palette
// (greens / golds / oxblood) rather than the original neon set.
const TEAMS: Team[] = [
  { name: "Schiff", odds: 25.0, color: "#c8962d" },
  { name: "Adam", odds: 17.5, color: "#2f6f4e" },
  { name: "Goldstein", odds: 14.5, color: "#7d1d1d" },
  { name: "Katz", odds: 11.0, color: "#8a6a22" },
  { name: "Wolby", odds: 9.0, color: "#123d35" },
  { name: "Jules", odds: 7.0, color: "#a2602d" },
  { name: "Stefan", odds: 5.5, color: "#4a7c59" },
  { name: "Vader", odds: 4.5, color: "#b6893a" },
  { name: "Fishtoots", odds: 3.5, color: "#3f5e54" },
  { name: "Coop", odds: 2.5, color: "#5b7a6a" },
];
const NUM_TEAMS = TEAMS.length;
const MAX_ODDS = Math.max(...TEAMS.map((t) => t.odds));

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function lighten(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + Math.round(255 * amt));
  const g = Math.min(255, ((n >> 8) & 0xff) + Math.round(255 * amt));
  const b = Math.min(255, (n & 0xff) + Math.round(255 * amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
function darken(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - Math.round(255 * amt));
  const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * amt));
  const b = Math.max(0, (n & 0xff) - Math.round(255 * amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// ─── MUSIC ENGINE — procedural suspense tracks via Web Audio ────────────────
class MusicEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  nodes: AudioScheduledSourceNode[] = [];
  onLabel: (s: string) => void;

  constructor(onLabel: (s: string) => void) {
    this.onLabel = onLabel;
  }

  _init() {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.52;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  _reg(...ns: AudioScheduledSourceNode[]) {
    ns.forEach((n) => this.nodes.push(n));
  }

  stop() {
    this.nodes.forEach((n) => {
      try {
        n.stop(0);
      } catch {
        /* already stopped */
      }
    });
    this.nodes = [];
  }

  fadeOut(dur = 0.35) {
    if (!this.masterGain || !this.ctx) return Promise.resolve();
    const g = this.masterGain.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + dur);
    return new Promise<void>((r) =>
      setTimeout(() => {
        this.stop();
        g.value = 0.52;
        r();
      }, (dur + 0.05) * 1000),
    );
  }

  _kick(t: number, freq = 80, dur = 0.25, vol = 1.2) {
    const c = this.ctx!;
    const o = c.createOscillator(),
      g = c.createGain();
    o.connect(g);
    g.connect(this.masterGain!);
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(18, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.04);
    this._reg(o);
  }

  _snare(t: number, vol = 0.5, dur = 0.09) {
    const c = this.ctx!;
    const size = Math.ceil(c.sampleRate * (dur + 0.04));
    const buf = c.createBuffer(1, size, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource();
    s.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 2800;
    f.Q.value = 1;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.masterGain!);
    s.start(t);
    this._reg(s);
  }

  _pad(freq: number, t: number, dur: number, vol = 0.07, type: OscillatorType = "sawtooth") {
    const c = this.ctx!;
    const o = c.createOscillator(),
      lp = c.createBiquadFilter(),
      g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    lp.type = "lowpass";
    lp.frequency.value = 700;
    lp.Q.value = 1.5;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.6, dur * 0.25));
    g.gain.setValueAtTime(vol, t + dur - 0.4);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(lp);
    lp.connect(g);
    g.connect(this.masterGain!);
    o.start(t);
    o.stop(t + dur + 0.04);
    this._reg(o);
  }

  _tone(freq: number, t: number, dur: number, vol: number, type: OscillatorType = "triangle") {
    const c = this.ctx!;
    const o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.masterGain!);
    o.start(t);
    o.stop(t + dur + 0.04);
    this._reg(o);
  }

  _noiseSweep(t: number, dur: number, f0: number, f1: number, vol = 0.32) {
    const c = this.ctx!;
    const size = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, size, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource();
    s.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 3;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.linearRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.25);
    g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.masterGain!);
    s.start(t);
    this._reg(s);
  }

  _track1(dur: number) {
    const c = this.ctx!;
    const now = c.currentTime,
      end = now + dur;
    this.onLabel("♩ Heartbeat");
    this._pad(41.2, now, dur, 0.065, "sine");
    this._pad(55, now, dur, 0.045, "sawtooth");
    let t = now + 0.25,
      interval = 1.05;
    while (t < end - 0.5) {
      this._kick(t, 88, 0.2, 1.3);
      this._kick(t + 0.14, 70, 0.13, 0.85);
      t += interval;
      interval = Math.max(0.26, interval * 0.875);
    }
    this._noiseSweep(end - 2.2, 2.0, 130, 3800, 0.35);
    this._kick(end - 0.06, 115, 0.5, 2.3);
  }

  _track2(dur: number) {
    const c = this.ctx!;
    const now = c.currentTime,
      end = now + dur;
    this.onLabel("🎻 Tension Strings");
    this._pad(55, now, dur, 0.09, "sawtooth");
    this._pad(82.5, now, dur, 0.075, "sawtooth");
    this._pad(110, now, dur, 0.055, "sawtooth");
    const voices = [110, 138.6, 165, 220];
    voices.forEach((freq, vi) => {
      const o = c.createOscillator(),
        g = c.createGain();
      o.type = "sawtooth";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(this.masterGain!);
      const baseVol = 0.065 - vi * 0.01;
      let sched = now + 0.05;
      let cycleLen = 0.13;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(baseVol * 0.5, now + 1.0);
      while (sched < end - 0.1) {
        const progress = (sched - now) / dur;
        const vol = baseVol * (0.5 + progress * 0.5);
        cycleLen = Math.max(0.045, 0.13 - progress * 0.07);
        g.gain.setValueAtTime(vol, sched);
        g.gain.setValueAtTime(vol * 0.15, sched + cycleLen * 0.5);
        sched += cycleLen;
      }
      g.gain.linearRampToValueAtTime(0, end);
      o.start(now);
      o.stop(end + 0.04);
      this._reg(o);
    });
    const nHits = 8;
    for (let i = 0; i < nHits; i++) {
      const frac = i / (nHits - 1);
      this._kick(now + 0.3 + frac * (dur * 0.78), 62 + i * 2, 0.22, 0.65 + i * 0.09);
    }
    const shimSteps = [1320, 1568, 1760, 2093, 2349, 2794];
    shimSteps.forEach((f, i) => {
      const t = now + dur * 0.45 + (i / shimSteps.length) * dur * 0.45;
      this._tone(f, t, 1.2, 0.025 + i * 0.004, "sine");
    });
    this._noiseSweep(end - 1.8, 1.6, 220, 4500, 0.3);
    this._kick(end - 0.06, 100, 0.45, 2.1);
  }

  _track3(dur: number) {
    const c = this.ctx!;
    const now = c.currentTime,
      end = now + dur;
    this.onLabel("🎺 Countdown");
    this._pad(55, now, dur, 0.07, "sawtooth");
    this._pad(82.5, now, dur, 0.05, "sawtooth");
    const semitones = [0, 2, 3, 5, 7, 8, 10, 12];
    const stepDur = dur / semitones.length;
    semitones.forEach((st, i) => {
      const freq = 110 * Math.pow(2, st / 12);
      const t = now + i * stepDur;
      const vol = 0.16 + i * 0.028;
      this._tone(freq, t, stepDur * 0.62, vol, "triangle");
      this._tone(freq / 2, t, stepDur * 0.5, vol * 0.45, "sine");
      this._kick(t, 68 + i * 4, 0.22 + i * 0.01, 0.85 + i * 0.12);
      if (i >= 4) {
        const rolls = (i - 3) * 2;
        for (let r = 0; r < rolls; r++) {
          this._snare(t + (r / rolls) * stepDur * 0.82, 0.28 + r * 0.06, 0.065);
        }
      }
    });
    this._noiseSweep(end - 1.6, 1.4, 180, 5500, 0.33);
    this._kick(end - 0.06, 125, 0.55, 2.6);
    this._snare(end - 0.06, 0.75, 0.16);
  }

  play(trackIndex: number, duration: number) {
    this._init();
    this.stop();
    const tracks = [this._track1, this._track2, this._track3];
    tracks[trackIndex % 3].call(this, duration);
  }
}

type Ball = {
  el: HTMLDivElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  active: boolean;
};
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotVel: number;
  shape: "rect" | "circle";
};
type Reveal = { pickNum: number; teamIndex: number; isFirst: boolean; show: boolean };

export default function DraftLottery() {
  const [mode, setMode] = useState<"full" | "speed">("full");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState<React.ReactNode>("Awaiting lottery");
  const [statusActive, setStatusActive] = useState(false);
  const [trackLabel, setTrackLabel] = useState("");
  const [machineText, setMachineText] = useState("Press start to begin");
  const [revealed, setRevealed] = useState<Record<number, number>>({}); // pickNum -> teamIndex
  const [eliminated, setEliminated] = useState<Set<number>>(new Set());
  const [flash, setFlash] = useState<number | null>(null);
  const [popPick, setPopPick] = useState<number | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  const machineRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const ballRafRef = useRef<number | null>(null);
  const confettiRafRef = useRef<number | null>(null);
  const confettiParticlesRef = useRef<Particle[]>([]);
  const musicRef = useRef<MusicEngine | null>(null);
  const resultsRef = useRef<number[]>([]);
  const modeRef = useRef<"full" | "speed">("full");
  const runIdRef = useRef(0);

  const selectMode = (m: "full" | "speed") => {
    if (running) return;
    modeRef.current = m;
    setMode(m);
  };

  // ── Balls ──
  const animateBalls = useCallback(() => {
    if (ballRafRef.current) cancelAnimationFrame(ballRafRef.current);
    const frame = () => {
      ballsRef.current.forEach((b) => {
        if (!b.active) return;
        b.x += b.vx;
        b.y += b.vy;
        const maxX = 100 - b.size / 3.4,
          maxY = 100 - b.size / 1.6;
        if (b.x < 0) {
          b.x = 0;
          b.vx *= -1;
        }
        if (b.x > maxX) {
          b.x = maxX;
          b.vx *= -1;
        }
        if (b.y < 0) {
          b.y = 0;
          b.vy *= -1;
        }
        if (b.y > maxY) {
          b.y = maxY;
          b.vy *= -1;
        }
        b.vx += (Math.random() - 0.5) * 0.15;
        b.vy += (Math.random() - 0.5) * 0.15;
        const spd = Math.hypot(b.vx, b.vy);
        if (spd > 3.5) {
          b.vx = (b.vx / spd) * 3.5;
          b.vy = (b.vy / spd) * 3.5;
        }
        if (spd < 0.5) {
          b.vx += (Math.random() - 0.5) * 1;
          b.vy += (Math.random() - 0.5) * 1;
        }
        b.el.style.left = b.x + "%";
        b.el.style.top = b.y + "%";
      });
      ballRafRef.current = requestAnimationFrame(frame);
    };
    ballRafRef.current = requestAnimationFrame(frame);
  }, []);

  const spawnBalls = useCallback(() => {
    const container = machineRef.current;
    if (!container) return;
    container.innerHTML = "";
    setMachineText("");
    const balls: Ball[] = [];
    TEAMS.forEach((t) => {
      const size = 38 + Math.random() * 10;
      const el = document.createElement("div");
      el.className = "dl-ball";
      el.style.cssText = `width:${size}px;height:${size}px;background:radial-gradient(circle at 35% 35%,${lighten(
        t.color,
        0.4,
      )},${t.color} 60%,${darken(t.color, 0.3)});font-size:${size * 0.22}px;left:${
        Math.random() * 80 + 5
      }%;top:${Math.random() * 70 + 10}%;`;
      el.textContent = t.name.slice(0, 4).toUpperCase();
      container.appendChild(el);
      balls.push({
        el,
        x: parseFloat(el.style.left),
        y: parseFloat(el.style.top),
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        size,
        active: true,
      });
    });
    ballsRef.current = balls;
    animateBalls();
  }, [animateBalls]);

  const stopBallAnimations = useCallback(() => {
    if (ballRafRef.current) cancelAnimationFrame(ballRafRef.current);
    ballRafRef.current = null;
  }, []);

  const eliminateBall = useCallback((i: number) => {
    const b = ballsRef.current[i];
    if (!b) return;
    b.active = false;
    b.el.style.opacity = "0";
    setTimeout(() => b.el.remove(), 400);
  }, []);

  // ── Confetti ──
  const launchConfetti = useCallback(() => {
    const canvas = confettiRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const colors = ["#c8962d", "#f1dfaa", "#123d35", "#2f6f4e", "#7d1d1d", "#8a6a22", "#e8d59f"];
    confettiParticlesRef.current = Array.from({ length: 240 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      rotVel: (Math.random() - 0.5) * 8,
      shape: Math.random() < 0.5 ? "rect" : "circle",
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiParticlesRef.current.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.rotation += p.rotVel;
      });
      confettiParticlesRef.current = confettiParticlesRef.current.filter((p) => p.y < canvas.height + 40);
      if (confettiParticlesRef.current.length > 0) confettiRafRef.current = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    if (confettiRafRef.current) cancelAnimationFrame(confettiRafRef.current);
    confettiRafRef.current = requestAnimationFrame(draw);
  }, []);

  const stopConfetti = useCallback(() => {
    if (confettiRafRef.current) cancelAnimationFrame(confettiRafRef.current);
    confettiRafRef.current = null;
    const canvas = confettiRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    confettiParticlesRef.current = [];
  }, []);

  // ── Weighted draw ──
  const runLotteryDraw = useCallback(() => {
    let pool = TEAMS.map((t, i) => ({ teamIndex: i, weight: t.odds }));
    const results: number[] = [];
    for (let pick = 1; pick <= NUM_TEAMS; pick++) {
      const total = pool.reduce((s, p) => s + p.weight, 0);
      let r = Math.random() * total;
      let winner = pool[pool.length - 1].teamIndex;
      for (const p of pool) {
        r -= p.weight;
        if (r <= 0) {
          winner = p.teamIndex;
          break;
        }
      }
      results.push(winner);
      pool = pool.filter((p) => p.teamIndex !== winner);
    }
    resultsRef.current = results;
  }, []);

  // ── Reveal card ──
  const showRevealCard = useCallback(
    (pickNum: number, teamIndex: number, isFirst: boolean, holdMs: number) =>
      new Promise<void>((resolve) => {
        setReveal({ pickNum, teamIndex, isFirst, show: false });
        setTimeout(() => {
          setReveal({ pickNum, teamIndex, isFirst, show: true });
          setTimeout(() => {
            setReveal((r) => (r ? { ...r, show: false } : r));
            setTimeout(() => {
              setReveal(null);
              resolve();
            }, 500);
          }, holdMs);
        }, 120);
      }),
    [],
  );

  // ── Reveal sequence ──
  const revealSequence = useCallback(
    async (myRun: number) => {
      const aborted = () => runIdRef.current !== myRun;
      const music = musicRef.current!;
      for (let revealPick = NUM_TEAMS; revealPick >= 1; revealPick--) {
        if (aborted()) return;
        const teamIndex = resultsRef.current[revealPick - 1];
        const isFirstPick = revealPick === 1;
        const trackIdx = (NUM_TEAMS - revealPick) % 3;
        const speed = modeRef.current === "speed";

        setStatusActive(true);
        setStatus(
          isFirstPick ? (
            <span className="text-[#c8962d]">🏆 The #1 overall pick is…</span>
          ) : (
            `Pick ${revealPick} — who will it be?`
          ),
        );

        const buildupMs = speed ? (isFirstPick ? 2800 : 2000) : isFirstPick ? 9200 : 6700;
        music.play(trackIdx, (buildupMs + (speed ? 300 : 600)) / 1000);
        await sleep(buildupMs);
        if (aborted()) return;

        await music.fadeOut(speed ? 0.15 : 0.35);
        await sleep(speed ? 60 : 180);
        if (aborted()) return;

        setFlash(teamIndex);
        setTimeout(() => setFlash((f) => (f === teamIndex ? null : f)), 700);

        const holdMs = speed
          ? isFirstPick
            ? 1200
            : 700
          : isFirstPick
            ? 3800
            : revealPick <= 3
              ? 2900
              : 2300;
        await showRevealCard(revealPick, teamIndex, isFirstPick, holdMs);
        if (aborted()) return;

        setRevealed((prev) => ({ ...prev, [revealPick]: teamIndex }));
        setPopPick(revealPick);
        setTimeout(() => setPopPick((p) => (p === revealPick ? null : p)), 600);
        setEliminated((prev) => new Set(prev).add(teamIndex));
        eliminateBall(teamIndex);
        setTrackLabel("");

        if (isFirstPick) launchConfetti();

        await sleep(speed ? 150 : 400);
      }
      if (aborted()) return;
      setStatus(`🏆 Lottery complete — ${TEAMS[resultsRef.current[0]].name} picks first!`);
      setTrackLabel("");
      stopBallAnimations();
      setRunning(false);
      setDone(true);
    },
    [showRevealCard, eliminateBall, launchConfetti, stopBallAnimations],
  );

  // ── Start / Reset ──
  const startLottery = useCallback(async () => {
    if (runIdRef.current && running) return;
    runIdRef.current += 1;
    const myRun = runIdRef.current;
    setRunning(true);
    setDone(false);
    setRevealed({});
    setEliminated(new Set());
    setReveal(null);
    stopConfetti();

    if (!musicRef.current) musicRef.current = new MusicEngine(setTrackLabel);

    spawnBalls();
    setStatusActive(true);
    setStatus(
      <>
        Drawing
        <span className="dl-dot" />
        <span className="dl-dot" />
        <span className="dl-dot" />
      </>,
    );

    const speed = modeRef.current === "speed";
    await sleep(speed ? 800 : 2800);
    if (runIdRef.current !== myRun) return;
    runLotteryDraw();

    ballsRef.current.forEach((b) => {
      b.vx *= 0.3;
      b.vy *= 0.3;
    });
    setStatus("Results incoming…");
    await sleep(speed ? 300 : 800);
    if (runIdRef.current !== myRun) return;

    await revealSequence(myRun);
  }, [running, spawnBalls, runLotteryDraw, revealSequence, stopConfetti]);

  const resetLottery = useCallback(() => {
    runIdRef.current += 1; // invalidate any in-flight sequence
    stopBallAnimations();
    stopConfetti();
    musicRef.current?.stop();
    resultsRef.current = [];
    if (machineRef.current) machineRef.current.innerHTML = "";
    ballsRef.current = [];
    setRunning(false);
    setDone(false);
    setStatusActive(false);
    setStatus("Awaiting lottery");
    setMachineText("Press start to begin");
    setTrackLabel("");
    setRevealed({});
    setEliminated(new Set());
    setFlash(null);
    setReveal(null);
  }, [stopBallAnimations, stopConfetti]);

  // Cleanup on unmount + keep confetti canvas sized to the window.
  useEffect(() => {
    const onResize = () => {
      const canvas = confettiRef.current;
      if (canvas && confettiRafRef.current) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      runIdRef.current += 1;
      if (ballRafRef.current) cancelAnimationFrame(ballRafRef.current);
      if (confettiRafRef.current) cancelAnimationFrame(confettiRafRef.current);
      musicRef.current?.stop();
    };
  }, []);

  return (
    <div className="space-y-8">
      <canvas ref={confettiRef} className="pointer-events-none fixed inset-0 z-[60]" />

      {/* Header */}
      <header className="club-panel overflow-hidden rounded-xl">
        <div className="flex flex-col gap-1 border-b border-white/10 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] sm:flex-row sm:items-center sm:justify-between md:px-8">
          <span className="text-[#f7d77d]">Draft Lottery · 2026</span>
          <span className="text-[#f7edda]/65">Weighted by reverse standings</span>
        </div>
        <div className="px-6 py-8 md:px-10 md:py-10">
          <div className="text-3xl leading-none">🎱</div>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Draft Lottery</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium text-[#f7edda]/75">
            Who drafts first? Every slot is drawn without replacement, weighted by each team&apos;s
            lottery odds. Hit run and let fate sort the board.
          </p>
        </div>
      </header>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-[1.05fr_1.05fr_0.9fr]">
        {/* Machine */}
        <div className="premium-panel rounded-lg p-5">
          <div className="mb-4 text-sm font-black uppercase tracking-[0.14em] text-[#8a6a22]">
            🎱 Lottery Machine
          </div>
          <div className="dl-machine">
            <div ref={machineRef} className="absolute inset-0" />
            {machineText && <div className="dl-machine-text">{machineText}</div>}
          </div>
          <div className={`dl-statusbar ${statusActive ? "active" : ""}`}>{status}</div>
          <div className="dl-track">{trackLabel}</div>

          <div className="mt-3 flex justify-center gap-2">
            {(["full", "speed"] as const).map((m) => (
              <button
                key={m}
                onClick={() => selectMode(m)}
                disabled={running}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.08em] transition disabled:cursor-not-allowed ${
                  mode === m
                    ? "bg-[#123d35] text-[#f7d77d]"
                    : "border border-black/10 bg-[#fffaf0] text-[#5c5549] hover:bg-[#123d35]/10"
                }`}
              >
                {m === "full" ? "🎭 Full Drama" : "⚡ Speed"}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-col items-center gap-3">
            {!done ? (
              <button
                onClick={startLottery}
                disabled={running}
                className="w-full rounded-full bg-[#123d35] px-6 py-4 text-lg font-black uppercase tracking-[0.1em] text-[#f7d77d] shadow-sm transition hover:bg-[#0b2a25] disabled:cursor-not-allowed disabled:opacity-50"
              >
                🏈 Run Lottery
              </button>
            ) : (
              <button
                onClick={resetLottery}
                className="w-full rounded-full bg-[#123d35] px-6 py-4 text-lg font-black uppercase tracking-[0.1em] text-[#f7d77d] shadow-sm transition hover:bg-[#0b2a25]"
              >
                ↺ Run Again
              </button>
            )}
            {(running || done) && (
              <button
                onClick={resetLottery}
                className="rounded-full border border-black/10 bg-[#fffaf0] px-5 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#5c5549] transition hover:bg-[#123d35]/10"
              >
                ↺ Reset
              </button>
            )}
          </div>
        </div>

        {/* Results board */}
        <div className="premium-panel rounded-lg p-5">
          <div className="mb-4 text-sm font-black uppercase tracking-[0.14em] text-[#8a6a22]">
            📋 Draft Order
          </div>
          <div className="space-y-2">
            {Array.from({ length: NUM_TEAMS }, (_, idx) => {
              const pickNum = idx + 1;
              const teamIndex = revealed[pickNum];
              const team = teamIndex != null ? TEAMS[teamIndex] : null;
              const isRevealed = teamIndex != null;
              return (
                <div
                  key={pickNum}
                  className={`dl-pick flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                    pickNum === 1 && isRevealed
                      ? "first"
                      : isRevealed
                        ? "revealed border-black/5"
                        : "border-black/5 bg-[#fffdf7]"
                  } ${popPick === pickNum ? "pop" : ""}`}
                >
                  <span
                    className={`w-7 text-center text-2xl font-black tabular-nums ${
                      pickNum === 1 && isRevealed ? "text-[#c8962d]" : "text-[#c9beac]"
                    }`}
                  >
                    {pickNum}
                  </span>
                  <span className="h-6 w-px bg-black/10" />
                  <span
                    className={`flex-1 font-black ${
                      isRevealed ? "text-[#17140f]" : "text-[#c9beac]"
                    } ${pickNum === 1 && isRevealed ? "text-lg" : ""}`}
                  >
                    {team ? team.name : "—"}
                  </span>
                  {team && (
                    <span className="text-[0.65rem] font-bold uppercase tracking-wide text-[#8a8173]">
                      {team.odds}% odds
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Odds */}
        <div className="premium-panel rounded-lg p-5">
          <div className="mb-4 text-sm font-black uppercase tracking-[0.14em] text-[#8a6a22]">
            ⚖️ Lottery Odds
          </div>
          <div className="space-y-1.5">
            {TEAMS.map((t, i) => (
              <div
                key={t.name}
                className={`dl-odds-row flex items-center gap-2.5 rounded-md px-2.5 py-2 ${
                  eliminated.has(i) ? "eliminated" : ""
                } ${flash === i ? "flash" : ""}`}
              >
                <span className="w-5 text-center text-xs font-black tabular-nums text-[#9a907f]">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-bold text-[#17140f]">{t.name}</span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-black/[0.08]">
                  <div className="dl-bar" style={{ width: `${(t.odds / MAX_ODDS) * 100}%` }} />
                </div>
                <span className="w-10 text-right text-xs font-bold tabular-nums text-[#5c5549]">
                  {t.odds}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reveal modal */}
      {reveal && (
        <div className={`dl-reveal-backdrop ${reveal.show ? "show" : ""}`}>
          <div className="dl-reveal-card">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-[#8a6a22]">Pick</div>
            <div
              className={`font-black leading-none tabular-nums ${
                reveal.isFirst ? "text-[6rem] text-[#c8962d]" : "text-[4.5rem] text-[#123d35]"
              }`}
            >
              {reveal.pickNum}
            </div>
            <div
              className={`font-black tracking-tight ${
                reveal.isFirst ? "text-4xl text-[#123d35] md:text-5xl" : "text-2xl text-[#17140f]"
              }`}
            >
              {TEAMS[reveal.teamIndex].name}
            </div>
            <div className="mt-2 text-xs font-semibold text-[#8a8173]">
              {TEAMS[reveal.teamIndex].odds}% original odds
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
