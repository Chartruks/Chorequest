import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/**
 * Sound-effects engine.
 *
 * Drop .wav/.mp3 files in assets/sfx/ and register them in SOURCES below.
 * Everything no-ops gracefully until a key is registered, so calls are safe now.
 *
 * Keys:
 *   tap            — generic button press
 *   menu           — open/close a screen or modal
 *   enemyAttack    — monster hits the player
 *   attack_<type>  — player attack, per character_type (e.g. attack_1)
 *   attack_default — fallback player attack
 *   levelup, defeat, unlock — event stingers
 */
const SOURCES: Record<string, number> = {
  // tap:           require('../assets/sfx/tap.wav'),
  // menu:          require('../assets/sfx/menu.wav'),
  // enemyAttack:   require('../assets/sfx/enemy_attack.wav'),
  // attack_default:require('../assets/sfx/attack.wav'),
  // attack_1:      require('../assets/sfx/attack_warrior.wav'),
  // levelup:       require('../assets/sfx/levelup.wav'),
  // defeat:        require('../assets/sfx/defeat.wav'),
  // unlock:        require('../assets/sfx/unlock.wav'),
};

const players: Record<string, ReturnType<typeof createAudioPlayer>> = {};
let initialized = false;

function ensureInit() {
  if (initialized) return;
  initialized = true;
  // SFX should play alongside music and ignore the silent switch.
  setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
}

/** Play a registered sound effect by key. Safe to call for unregistered keys. */
export function playSfx(key: string) {
  const src = SOURCES[key];
  if (src == null) return;          // not configured yet — no-op
  ensureInit();
  try {
    let p = players[key];
    if (!p) { p = createAudioPlayer(src); players[key] = p; }
    p.seekTo(0);
    p.play();
  } catch { /* ignore audio errors */ }
}

/** Player attack sound, specific to the active character (falls back to default). */
export function playAttackSfx(characterType?: string | null) {
  const key = characterType ? `attack_${characterType}` : 'attack_default';
  if (SOURCES[key] != null) playSfx(key);
  else playSfx('attack_default');
}
