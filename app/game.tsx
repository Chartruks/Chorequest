import { Canvas, Circle, Fill, Group, Path, Rect } from '@shopify/react-native-skia';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// ─── Constants ───────────────────────────────────────────────────────────────

const { width: W, height: H } = Dimensions.get('window');
const SHIP_X = W * 0.2;
const SHIP_R = 16;
const GRAVITY = 0.38;
const THRUST_V = -9.5;
const SPEED_INITIAL = 2.8;
const SPEED_MAX = 9;
const SPEED_ACCEL = 0.0015;
const MAX_ASTEROIDS = 7;
const MAX_COLLECTIBLES = 4;
const STAR_COUNT_SLOW = 22;
const STAR_COUNT_FAST = 14;

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'playing' | 'dead';
type CollectibleType = 'energy' | 'research' | 'materials';

interface Asteroid { x: number; y: number; r: number; active: boolean; shade: number }
interface Collectible { x: number; y: number; type: CollectibleType; active: boolean }
interface Star { bx: number; y: number; r: number; op: number }

interface GS {
  phase: Phase;
  shipY: number;
  shipVy: number;
  shields: number;
  invincible: number;
  score: number;
  speed: number;
  frame: number;
  spawnCooldown: number;
  collectCooldown: number;
  asteroids: Asteroid[];
  collectibles: Collectible[];
  starOff1: number;
  starOff2: number;
  energy: number;
  research: number;
  materials: number;
}

// ─── Static star layers ───────────────────────────────────────────────────────

const STARS_SLOW: Star[] = Array.from({ length: STAR_COUNT_SLOW }, (_, i) => ({
  bx: (i / STAR_COUNT_SLOW) * W,
  y: ((Math.sin(i * 1.91 + 0.5) + 1) / 2) * (H - 40) + 20,
  r: 0.5 + (i % 3) * 0.5,
  op: 0.2 + (i % 5) * 0.08,
}));

const STARS_FAST: Star[] = Array.from({ length: STAR_COUNT_FAST }, (_, i) => ({
  bx: (i / STAR_COUNT_FAST) * W,
  y: ((Math.sin(i * 2.7 + 1.3) + 1) / 2) * (H - 40) + 20,
  r: 1 + (i % 3),
  op: 0.5 + (i % 3) * 0.15,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rng(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function wrapStar(bx: number, offset: number): number {
  return ((bx - offset % W) % W + W) % W;
}

function mkAsteroid(): Asteroid {
  return {
    x: W + 60,
    y: rng(60, H - 60),
    r: rng(20, 42),
    active: true,
    shade: Math.floor(rng(0, 4)),
  };
}

function mkCollectible(): Collectible {
  const types: CollectibleType[] = ['energy', 'research', 'materials'];
  return {
    x: W + 30,
    y: rng(60, H - 60),
    type: types[Math.floor(rng(0, 3))],
    active: true,
  };
}

const COLLECT_COLORS: Record<CollectibleType, string> = {
  energy: '#00e5ff',
  research: '#bf5af2',
  materials: '#ff9500',
};

const COLLECT_LABEL: Record<CollectibleType, string> = {
  energy: '⚡', research: '🔬', materials: '🪨',
};

const ASTEROID_SHADES = ['#3a3a4a', '#4a3a3a', '#3a4a3a', '#3a3a5a'];

// ─── Ship path builder ────────────────────────────────────────────────────────

function shipPath(y: number, alpha: number) {
  const path = `M ${SHIP_X + 22} ${y} L ${SHIP_X - 8} ${y - 15} L ${SHIP_X + 4} ${y} L ${SHIP_X - 8} ${y + 15} Z`;
  return { path, alpha };
}

// ─── Initial state ────────────────────────────────────────────────────────────

function initialState(): GS {
  return {
    phase: 'idle',
    shipY: H / 2,
    shipVy: 0,
    shields: 3,
    invincible: 0,
    score: 0,
    speed: SPEED_INITIAL,
    frame: 0,
    spawnCooldown: 60,
    collectCooldown: 90,
    asteroids: [],
    collectibles: [],
    starOff1: 0,
    starOff2: 0,
    energy: 0,
    research: 0,
    materials: 0,
  };
}

// ─── Frame update ─────────────────────────────────────────────────────────────

function nextFrame(s: GS): GS {
  if (s.phase !== 'playing') return s;

  let { shipY, shipVy, shields, invincible, score, speed, frame,
        spawnCooldown, collectCooldown, asteroids, collectibles,
        starOff1, starOff2, energy, research, materials } = s;

  frame++;
  speed = Math.min(SPEED_INITIAL + frame * SPEED_ACCEL, SPEED_MAX);
  score++;

  // Ship physics
  shipVy += GRAVITY;
  shipY += shipVy;

  // Stars
  starOff1 += speed * 0.35;
  starOff2 += speed * 0.9;

  // Spawn asteroids
  spawnCooldown--;
  if (spawnCooldown <= 0) {
    const active = asteroids.filter(a => a.active);
    if (active.length < MAX_ASTEROIDS) {
      asteroids = [...asteroids, mkAsteroid()];
    }
    spawnCooldown = Math.floor(rng(45, 80));
  }

  // Spawn collectibles
  collectCooldown--;
  if (collectCooldown <= 0) {
    const active = collectibles.filter(c => c.active);
    if (active.length < MAX_COLLECTIBLES) {
      collectibles = [...collectibles, mkCollectible()];
    }
    collectCooldown = Math.floor(rng(80, 130));
  }

  // Move asteroids
  asteroids = asteroids
    .map(a => ({ ...a, x: a.x - speed }))
    .filter(a => a.x > -70);

  // Move collectibles
  collectibles = collectibles
    .map(c => ({ ...c, x: c.x - speed * 0.75 }))
    .filter(c => c.x > -40);

  // Collision: asteroids
  if (invincible <= 0) {
    for (const a of asteroids) {
      if (!a.active) continue;
      if (dist(SHIP_X, shipY, a.x, a.y) < SHIP_R + a.r - 4) {
        shields--;
        invincible = 70;
        if (shields <= 0) {
          return { ...s, phase: 'dead', shipY, shipVy, score, asteroids, collectibles, starOff1, starOff2, energy, research, materials };
        }
        break;
      }
    }
  } else {
    invincible--;
  }

  // Collision: collectibles
  collectibles = collectibles.map(c => {
    if (!c.active) return c;
    if (dist(SHIP_X, shipY, c.x, c.y) < SHIP_R + 16) {
      score += 10;
      if (c.type === 'energy')   energy   = Math.min(energy   + 8, 60);
      if (c.type === 'research') research = Math.min(research + 8, 60);
      if (c.type === 'materials') materials = Math.min(materials + 8, 60);
      return { ...c, active: false };
    }
    return c;
  });

  // Floor / ceiling
  let phase: Phase = 'playing';
  if (shipY > H - 40 || shipY < 30) {
    shields--;
    shipVy = shipY > H / 2 ? -6 : 6;
    shipY = shipY > H / 2 ? H - 45 : 35;
    invincible = 50;
    if (shields <= 0) phase = 'dead';
  }

  return { ...s, phase, shipY, shipVy, shields, invincible, score, speed, frame,
    spawnCooldown, collectCooldown, asteroids, collectibles, starOff1, starOff2, energy, research, materials };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameScreen() {
  const { profile, gameState, refreshGameState } = useAuth();
  const stateRef = useRef<GS>(initialState());
  const [gs, setGs] = useState<GS>(initialState());
  const rafRef = useRef<number>(0);
  const [claiming, setClaiming] = useState(false);

  const loop = useCallback(() => {
    const next = nextFrame(stateRef.current);
    stateRef.current = next;
    setGs({ ...next });
    if (next.phase === 'playing') {
      rafRef.current = requestAnimationFrame(loop);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function startGame() {
    const fresh = { ...initialState(), phase: 'playing' as Phase };
    stateRef.current = fresh;
    setGs(fresh);
    rafRef.current = requestAnimationFrame(loop);
  }

  function handleTap() {
    if (gs.phase === 'idle') { startGame(); return; }
    if (gs.phase === 'dead') return;
    // Thrust
    stateRef.current = { ...stateRef.current, shipVy: THRUST_V };
  }

  async function claimResources() {
    if (!profile?.household_id || !gameState || claiming) return;
    setClaiming(true);
    await supabase.from('game_state').update({
      energy:    gameState.energy    + gs.energy,
      research:  gameState.research  + gs.research,
      materials: gameState.materials + gs.materials,
    }).eq('household_id', profile.household_id);
    await refreshGameState();
    setClaiming(false);
    stateRef.current = initialState();
    setGs(initialState());
  }

  function tryAgain() {
    startGame();
  }

  // ── Ship path ──
  const shipAlpha = gs.invincible > 0 && gs.invincible % 8 < 4 ? 0.25 : 1;
  const shipSvg = `M ${SHIP_X + 22} ${gs.shipY} L ${SHIP_X - 8} ${gs.shipY - 15} L ${SHIP_X + 4} ${gs.shipY} L ${SHIP_X - 8} ${gs.shipY + 15} Z`;
  const flameSvg = `M ${SHIP_X - 8} ${gs.shipY - 8} L ${SHIP_X - 28} ${gs.shipY} L ${SHIP_X - 8} ${gs.shipY + 8} Z`;

  return (
    <View style={styles.container}>
      {/* ── Canvas ── */}
      <TouchableWithoutFeedback onPress={handleTap}>
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Space background */}
          <Fill color="#030310" />

          {/* Slow star layer */}
          <Group>
            {STARS_SLOW.map((star, i) => (
              <Circle
                key={`s1-${i}`}
                cx={wrapStar(star.bx, gs.starOff1)}
                cy={star.y}
                r={star.r}
                color={`rgba(180,210,255,${star.op})`}
              />
            ))}
          </Group>

          {/* Fast star layer */}
          <Group>
            {STARS_FAST.map((star, i) => (
              <Circle
                key={`s2-${i}`}
                cx={wrapStar(star.bx, gs.starOff2)}
                cy={star.y}
                r={star.r}
                color={`rgba(220,240,255,${star.op})`}
              />
            ))}
          </Group>

          {/* Collectibles */}
          {gs.collectibles.filter(c => c.active).map((c, i) => (
            <Group key={`col-${i}`}>
              <Circle cx={c.x} cy={c.y} r={14} color={`${COLLECT_COLORS[c.type]}33`} />
              <Circle cx={c.x} cy={c.y} r={8} color={COLLECT_COLORS[c.type]} />
            </Group>
          ))}

          {/* Asteroids */}
          {gs.asteroids.filter(a => a.active).map((a, i) => (
            <Group key={`ast-${i}`}>
              <Circle cx={a.x} cy={a.y} r={a.r} color={ASTEROID_SHADES[a.shade]} />
              <Circle cx={a.x - a.r * 0.2} cy={a.y - a.r * 0.25} r={a.r * 0.3} color={`${ASTEROID_SHADES[a.shade]}88`} />
            </Group>
          ))}

          {/* Thrust flame */}
          {gs.phase === 'playing' && gs.shipVy < -2 && (
            <Path
              path={flameSvg}
              color="#ff6b00"
              opacity={0.8}
            />
          )}

          {/* Ship */}
          {gs.phase !== 'idle' && (
            <Path
              path={shipSvg}
              color="#00e5ff"
              opacity={shipAlpha}
            />
          )}

          {/* Shield bar (bottom of screen) */}
          {gs.phase === 'playing' && (
            <>
              <Rect x={0} y={H - 4} width={W} height={4} color="#1e1e3f" />
              <Rect x={0} y={H - 4} width={W * (gs.shields / 3)} height={4}
                color={gs.shields === 3 ? '#30d158' : gs.shields === 2 ? '#ff9500' : '#ff453a'} />
            </>
          )}
        </Canvas>
      </TouchableWithoutFeedback>

      {/* ── HUD (overlaid, non-interactive) ── */}
      {gs.phase === 'playing' && (
        <View style={styles.hud} pointerEvents="none">
          <View style={styles.hudLeft}>
            <Text style={styles.hudShields}>
              {'❤️'.repeat(gs.shields)}{'🖤'.repeat(Math.max(0, 3 - gs.shields))}
            </Text>
          </View>
          <View style={styles.hudRight}>
            <Text style={styles.hudScore}>{gs.score.toLocaleString()}</Text>
          </View>
          <View style={styles.hudResources}>
            {gs.energy > 0    && <Text style={[styles.hudRes, { color: '#00e5ff' }]}>⚡{gs.energy}</Text>}
            {gs.research > 0  && <Text style={[styles.hudRes, { color: '#bf5af2' }]}>🔬{gs.research}</Text>}
            {gs.materials > 0 && <Text style={[styles.hudRes, { color: '#ff9500' }]}>🪨{gs.materials}</Text>}
          </View>
        </View>
      )}

      {/* ── Idle overlay ── */}
      {gs.phase === 'idle' && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.gameTitle}>🚀 PATROL RUN</Text>
          <Text style={styles.gameSub}>Dodge asteroids. Collect resources.</Text>
          <Text style={styles.tapPrompt}>TAP TO LAUNCH</Text>
        </View>
      )}

      {/* ── Dead overlay ── */}
      {gs.phase === 'dead' && (
        <SafeAreaView style={styles.overlay}>
          <Text style={styles.deadTitle}>MISSION FAILED</Text>
          <Text style={styles.deadScore}>Distance: {gs.score.toLocaleString()}</Text>

          <View style={styles.rewardBox}>
            <Text style={styles.rewardTitle}>Resources Recovered</Text>
            <Text style={styles.rewardRow}>⚡ {gs.energy} Energy</Text>
            <Text style={styles.rewardRow}>🔬 {gs.research} Research</Text>
            <Text style={styles.rewardRow}>🪨 {gs.materials} Materials</Text>
          </View>

          <View style={styles.deadButtons}>
            <Pressable
              style={[styles.btn, styles.btnClaim, claiming && styles.btnDisabled]}
              onPress={claimResources}
              disabled={claiming || (gs.energy === 0 && gs.research === 0 && gs.materials === 0)}
            >
              <Text style={styles.btnText}>{claiming ? 'Claiming…' : '📥 Claim Resources'}</Text>
            </Pressable>

            <Pressable style={[styles.btn, styles.btnRetry]} onPress={tryAgain}>
              <Text style={[styles.btnText, { color: '#00e5ff' }]}>🔄 Try Again</Text>
            </Pressable>

            <Pressable style={styles.btnBack} onPress={() => router.back()}>
              <Text style={styles.btnBackText}>← Back to Station</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      )}

      {/* Back button (idle state) */}
      {gs.phase === 'idle' && (
        <SafeAreaView style={styles.backCorner} pointerEvents="box-none">
          <Pressable onPress={() => router.back()}>
            <Text style={styles.btnBackText}>← Back</Text>
          </Pressable>
        </SafeAreaView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030310' },

  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 52,
    paddingHorizontal: 16,
  },
  hudLeft:  {},
  hudRight: {},
  hudShields: { fontSize: 18 },
  hudScore: { color: '#00e5ff', fontWeight: '800', fontSize: 20 },
  hudResources: {
    position: 'absolute',
    bottom: -28,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  hudRes: { fontWeight: '700', fontSize: 13 },

  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(3,3,16,0.75)',
    gap: 12,
  },
  gameTitle: { color: '#00e5ff', fontWeight: '900', fontSize: 32, letterSpacing: 2 },
  gameSub: { color: '#6b6b8a', fontSize: 15, marginBottom: 8 },
  tapPrompt: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 3,
    opacity: 0.9,
  },

  deadTitle: { color: '#ff453a', fontWeight: '900', fontSize: 28, letterSpacing: 1 },
  deadScore: { color: '#6b6b8a', fontSize: 16 },

  rewardBox: {
    backgroundColor: '#0d0d1f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e3f',
    padding: 20,
    alignItems: 'center',
    width: '80%',
    gap: 6,
    marginVertical: 8,
  },
  rewardTitle: { color: '#8e8ea0', fontWeight: '700', fontSize: 13, marginBottom: 6 },
  rewardRow: { color: '#fff', fontWeight: '600', fontSize: 16 },

  deadButtons: { width: '80%', gap: 10, marginTop: 8 },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnClaim: { backgroundColor: '#00e5ff' },
  btnRetry: { backgroundColor: '#0d0d1f', borderWidth: 1, borderColor: '#00e5ff' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#05050f', fontWeight: '800', fontSize: 15 },

  btnBack: { alignItems: 'center', marginTop: 4 },
  btnBackText: { color: '#555570', fontWeight: '600', fontSize: 14 },
  backCorner: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 20,
    paddingTop: 52,
  },
});
