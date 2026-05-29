import { Database } from '../types/database';

type GameState = Database['public']['Tables']['game_state']['Row'];
type DiscoveredSector = Database['public']['Tables']['discovered_sectors']['Row'];
type StoryEvent = Database['public']['Tables']['story_events']['Row'];

export interface StoryEventDef {
  key: string;
  chapter: number;
  title: string;
  narrative: string;
  emoji: string;
}

export const STORY_EVENTS: StoryEventDef[] = [
  // Chapter 1 — First Days
  {
    key: 'ch1_crew_assembled',
    chapter: 1,
    emoji: '🏚️',
    title: 'Settlement Founded',
    narrative:
      'The dust settles. What was rubble is becoming walls. What was open sky is becoming shelter.\n\nYour group stands in the ruin of what used to be a suburb, eyes scanning the perimeter. A child asks how long you\'re staying.\n\n"As long as it takes," you say.\n\nSomewhere out in the wasteland, other survivors are asking the same question. You intend to have the answer before they do.',
  },
  {
    key: 'ch1_first_mission',
    chapter: 1,
    emoji: '✅',
    title: 'First Task Ratified',
    narrative:
      'Small victories matter. The first task completed and logged. Supplies allocated. The group moves with purpose now — cautious, but together.\n\nA young member catches your eye. "I didn\'t think it would feel like this," they say.\n\n"Like what?"\n\n"Like something actually matters again."\n\nIt does. All of it.',
  },
  {
    key: 'ch1_first_exploration',
    chapter: 1,
    emoji: '🗺️',
    title: 'Into the Wasteland',
    narrative:
      'Your first scouting team returns at dusk, backpacks heavy with what the old world left behind.\n\nThe wasteland is bigger than your maps show. Quieter in the wrong ways. But it isn\'t empty.\n\nZones are being catalogued. Risks assessed. The settlement grows larger every day, not in walls, but in knowledge of what lies beyond them.\n\nYou give the order. The scouts go again tomorrow.',
  },

  // Chapter 2 — Signals in the Noise
  {
    key: 'ch2_unlock',
    chapter: 2,
    emoji: '📡',
    title: 'Signals in the Noise',
    narrative:
      'The radio crackles with something that isn\'t static. Not random. Too structured.\n\nPatterns. Repeating patterns on a frequency nobody was supposed to be broadcasting on.\n\nYour most technically-minded member runs the analysis twice before speaking. "This is intentional. Someone out there is transmitting."\n\nThe source is deep in zones you haven\'t scouted yet. You\'ll need more resources. Better tools. A crew that\'s ready.\n\nChapter Two begins.',
  },
  {
    key: 'ch2_first_contact',
    chapter: 2,
    emoji: '👥',
    title: 'First Contact',
    narrative:
      'Your scouts find the source of the signal.\n\nNot a transmitter. A person. Someone who has been alive out there in the ruins, broadcasting every day, waiting for anyone to listen.\n\nThey are wary. You are cautious. But they have skills you need, and you have shelter they don\'t.\n\n"How long have you been alone?" you ask.\n\nThey count silently before answering. "Long enough."\n\nYour settlement just grew.',
  },

  // Chapter 3 — The Fracture
  {
    key: 'ch3_unlock',
    chapter: 3,
    emoji: '⚔️',
    title: 'The Fracture',
    narrative:
      'Intelligence gathered from a dozen scouted zones has started to form a picture you didn\'t want to see.\n\nTwo other groups. Organised. Both moving through territory that overlaps with yours.\n\nOne sent a scout with a warning. The other sent nothing — which means they\'re either not concerned, or they\'re already inside your perimeter.\n\nThe Community Hall is the only reason you\'re coordinating clearly. Without it, the tension would already have broken you.\n\nChoose your path carefully from here.',
  },
  {
    key: 'ch3_saboteur',
    chapter: 3,
    emoji: '🔒',
    title: 'Internal Threat',
    narrative:
      'Someone has been moving supplies without authorisation. Small amounts. Enough to go unnoticed — until now.\n\nYou don\'t have a name yet. What you have is evidence — and a group that\'s about to start looking at each other differently.\n\nWhoever it is isn\'t trying to destroy the settlement. They\'re trying to delay something. The question is: delay what?\n\nComplete your most critical tasks. Keep Morale high. The truth will surface.',
  },

  // Chapter 4 — The Bunker
  {
    key: 'ch4_unlock',
    chapter: 4,
    emoji: '🔦',
    title: 'The Bunker',
    narrative:
      'Your scouts come back pale. They found something.\n\nA bunker. Pre-collapse. Sealed from the inside.\n\nWhatever is in there, whoever built it, they did not leave. The technology inside is decades ahead of anything you\'ve seen in the wasteland.\n\nAnd it\'s still running.\n\nThe decisions made here will define what your settlement becomes. Choose wisely.',
  },
  {
    key: 'ch4_choice',
    chapter: 4,
    emoji: '⚖️',
    title: 'The Weight of Choice',
    narrative:
      'The bunker\'s central system has two modes. Your people have spent days debating which to activate.\n\nOne will broadcast its stored knowledge — medical records, pre-collapse engineering, crop data — to every working receiver in the region. Survival for all. Risk: including those who would use it against you.\n\nThe other will give you exclusive access. Power, concentrated here.\n\nYour settlement is divided. You must decide.\n\nThere is no right answer. There is only the one you can live with.',
  },

  // Chapter 5 — Homeward
  {
    key: 'ch5_unlock',
    chapter: 5,
    emoji: '🌅',
    title: 'Homeward',
    narrative:
      'You\'ve mapped more of the wasteland than anyone thought survivable. Your settlement stands. Your people are fed, trained, armed with knowledge.\n\nAnd now something is coming.\n\nLong-range scouts reported it three days ago. Other groups know. The bunker data predicted it.\n\nThis is what all of it was for. Every task completed. Every resource stored. Every hard choice made.\n\nPrepare the settlement. The final chapter begins.',
  },
  {
    key: 'ch5_final_battle',
    chapter: 5,
    emoji: '🏆',
    title: 'The Reckoning',
    narrative:
      'It is over.\n\nThe threat passed — not through force alone, but through the network of alliances your settlement built across months of hardship. Every zone scouted, every contact made, every decision honoured — it all converged here.\n\nYour walls hold. Your people survived. The wasteland remembers you differently now.\n\nThere is still work to do. There always will be. But today, take a moment.\n\nYou built something real here.\n\nWell done.',
  },
];

export const CHAPTER_TITLES: Record<number, string> = {
  1: 'First Days',
  2: 'Signals in the Noise',
  3: 'The Fracture',
  4: 'The Bunker',
  5: 'Homeward',
};

interface TriggerContext {
  gameState: GameState;
  discoveredSectors: DiscoveredSector[];
  hasModuleBridge: boolean;
  hasAllModules: boolean;
  maxProfileLevel: number;
  approvedChoresTotal: number;
  existingEventKeys: string[];
}

export function getNewStoryEvents(ctx: TriggerContext): StoryEventDef[] {
  const { gameState, discoveredSectors, existingEventKeys } = ctx;
  const pending: StoryEventDef[] = [];
  const totalResources = gameState.energy + gameState.knowledge + gameState.money + gameState.food;
  const zonesVisited = discoveredSectors.filter(d => d.status === 'discovered').length;

  const add = (key: string) => {
    if (!existingEventKeys.includes(key)) {
      const def = STORY_EVENTS.find(e => e.key === key);
      if (def) pending.push(def);
    }
  };

  // Ch1 triggers
  if (ctx.approvedChoresTotal === 0) add('ch1_crew_assembled');
  if (ctx.approvedChoresTotal >= 1) add('ch1_first_mission');
  if (zonesVisited >= 1) add('ch1_first_exploration');

  // Ch2 triggers
  if (totalResources >= 500 && zonesVisited >= 3) {
    add('ch2_unlock');
    if (zonesVisited >= 6) add('ch2_first_contact');
  }

  // Ch3 triggers
  if (totalResources >= 1500 && ctx.hasModuleBridge) {
    add('ch3_unlock');
    if (zonesVisited >= 10) add('ch3_saboteur');
  }

  // Ch4 triggers
  if (totalResources >= 4000 && zonesVisited >= 10 && ctx.maxProfileLevel >= 5) {
    add('ch4_unlock');
    if (zonesVisited >= 15) add('ch4_choice');
  }

  // Ch5 triggers
  if (ctx.hasAllModules && zonesVisited >= 25) {
    add('ch5_unlock');
    if (zonesVisited >= 20 && totalResources >= 8000) add('ch5_final_battle');
  }

  return pending;
}

export function getChapterForEventKey(key: string): number {
  return STORY_EVENTS.find(e => e.key === key)?.chapter ?? 1;
}

export function isEventUnread(event: StoryEvent, profileId: string): boolean {
  return !event.read_by.includes(profileId);
}
