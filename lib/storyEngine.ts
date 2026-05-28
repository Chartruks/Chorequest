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
  // Chapter 1 — First Light
  {
    key: 'ch1_crew_assembled',
    chapter: 1,
    emoji: '🛸',
    title: 'Crew Assembled',
    narrative:
      'The station hums to life. Systems come online one by one. Your crew stands at their stations, eyes forward. The galaxy stretches beyond the viewport — vast, indifferent, waiting.\n\n"Commander, all systems nominal," your navigator reports. "Where do we begin?"\n\nYou feel the weight of it. Everything out there is unknown. Everything in here is yours to build.\n\n"We begin with the mission at hand," you say. "Then the stars."',
  },
  {
    key: 'ch1_first_mission',
    chapter: 1,
    emoji: '✅',
    title: 'First Mission Complete',
    narrative:
      'Small victories matter. The first mission logged. Resources allocated. The crew moves with purpose now — tentative, but purposeful.\n\nA cadet catches your eye. "I didn\'t think it would feel like this," they say.\n\n"Like what?"\n\n"Like it\'s actually real."\n\nIt is. All of it.',
  },
  {
    key: 'ch1_first_exploration',
    chapter: 1,
    emoji: '🌌',
    title: 'Into the Unknown',
    narrative:
      'Your ship clears the station\'s docking range and accelerates into open space. The crew grows quiet. Even the veterans.\n\nDeep space has a way of reminding you how small you are — and how much territory that leaves to explore.\n\nThe sector designation appears on the nav screen. Uncharted. Unnamed until now.\n\nYou give the order. The ship goes.',
  },

  // Chapter 2 — Strange Signals
  {
    key: 'ch2_unlock',
    chapter: 2,
    emoji: '📡',
    title: 'Strange Signals',
    narrative:
      'The long-range array picks up something it can\'t classify. Not background radiation. Not stellar interference.\n\nPatterns. Repeating patterns.\n\nYour science officer runs the analysis three times before reporting. "Commander, this is structured. Someone — something — is transmitting."\n\nThe signal source is deep in sectors you haven\'t reached yet. You\'ll need more resources. Better equipment. A crew that\'s ready for what might be out there.\n\nChapter Two begins.',
  },
  {
    key: 'ch2_first_contact',
    chapter: 2,
    emoji: '👽',
    title: 'First Contact',
    narrative:
      'Your vessel drops out of transit and finds it waiting.\n\nNot a ship. Not a probe. Something in between — a structure with no recognisable origin, broadcasting on the same frequency as the signal.\n\nIt scans you. You can feel it.\n\nThen, a message. Not in any known language. But the meaning — somehow — is clear:\n\n"You are late. We expected you sooner."\n\nThe channel closes. The structure goes dark. Your crew stares at each other in silence.\n\nThe galaxy just got a great deal more complicated.',
  },

  // Chapter 3 — The Fracture
  {
    key: 'ch3_unlock',
    chapter: 3,
    emoji: '⚔️',
    title: 'The Fracture',
    narrative:
      'Intelligence gathered from a dozen sectors has started to form a picture you didn\'t want to see.\n\nTwo factions. Ancient. Both claiming ownership of the space you\'ve been exploring. Both aware of your presence.\n\nOne sent a warning. The other sent nothing — which your tactical officer says is worse.\n\nThe Command Bridge is the only reason you\'re seeing this clearly. Without it, you\'d be flying blind into a war.\n\nChoose your path carefully from here.',
  },
  {
    key: 'ch3_saboteur',
    chapter: 3,
    emoji: '🔒',
    title: 'Internal Threat',
    narrative:
      'Station diagnostics flag an anomaly: someone has been rerouting sensor logs. Hiding something.\n\nYou don\'t have a name yet. What you have is evidence — and a crew that\'s about to start looking at each other differently.\n\nThe saboteur isn\'t trying to destroy you. They\'re trying to delay you. The question is: delay you from what?\n\nComplete your most critical missions. Maintain crew Morale. The answer will surface.',
  },

  // Chapter 4 — Dark Matter
  {
    key: 'ch4_unlock',
    chapter: 4,
    emoji: '🏛️',
    title: 'Ancient Ruins',
    narrative:
      'The sector map shows it as an anomaly — a gravitational signature with no visible source. When your ship arrives, you understand why.\n\nRuins. Impossibly old. A civilisation that predates every known spacefaring culture by ten thousand years at least.\n\nThey built something here. Something still active.\n\nYour science team estimates it will take months to understand what you\'ve found. You have weeks.\n\nDecisions made here will define what ChoreQuest becomes. Choose wisely.',
  },
  {
    key: 'ch4_choice',
    chapter: 4,
    emoji: '⚖️',
    title: 'The Weight of Choice',
    narrative:
      'The ancient device has two modes. Your team has spent days arguing about which to activate.\n\nOne will share the ruins\' knowledge with every faction in the galaxy. Peace through transparency. Risk: some of them may not handle it well.\n\nThe other will let you keep it. A private archive. Power, concentrated.\n\nYour crew is split. Your Commander must decide.\n\nThere is no right answer. There is only the one you can live with.',
  },

  // Chapter 5 — Homebound
  {
    key: 'ch5_unlock',
    chapter: 5,
    emoji: '🌟',
    title: 'Homebound',
    narrative:
      'The galaxy\'s edge. You\'ve mapped more space than any crew before you. The station is fully operational. The crew is tested, experienced, and ready.\n\nAnd now something is coming.\n\nLong-range sensors picked it up three days ago. The factions know. The ancient device predicted it.\n\nThis is what everything was for. Every mission. Every resource stockpiled. Every hard choice made.\n\nPrepare the crew. The final chapter begins.',
  },
  {
    key: 'ch5_final_battle',
    chapter: 5,
    emoji: '🏆',
    title: 'The Reckoning',
    narrative:
      'It is over.\n\nThe threat has passed — not through force alone, but through the network of alliances your crew built across years of exploration. Every sector charted, every contact made, every moral choice honoured — it all converged here.\n\nYour station holds. Your crew survives. The galaxy remembers you.\n\nThere is still work to be done. There always will be. But today, take a moment.\n\nYou built something real out here.\n\nWell done, Commander.',
  },
];

export const CHAPTER_TITLES: Record<number, string> = {
  1: 'First Light',
  2: 'Strange Signals',
  3: 'The Fracture',
  4: 'Dark Matter',
  5: 'Homebound',
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
  const totalResources = gameState.energy + gameState.research + gameState.materials;
  const sectorsVisited = discoveredSectors.filter(d => d.status === 'discovered').length;

  const add = (key: string) => {
    if (!existingEventKeys.includes(key)) {
      const def = STORY_EVENTS.find(e => e.key === key);
      if (def) pending.push(def);
    }
  };

  // Ch1 triggers
  if (ctx.approvedChoresTotal === 0) add('ch1_crew_assembled');
  if (ctx.approvedChoresTotal >= 1) add('ch1_first_mission');
  if (sectorsVisited >= 1) add('ch1_first_exploration');

  // Ch2 triggers
  if (totalResources >= 500 && sectorsVisited >= 3) {
    add('ch2_unlock');
    if (sectorsVisited >= 6) add('ch2_first_contact');
  }

  // Ch3 triggers
  if (totalResources >= 1500 && ctx.hasModuleBridge) {
    add('ch3_unlock');
    if (sectorsVisited >= 10) add('ch3_saboteur');
  }

  // Ch4 triggers
  if (totalResources >= 4000 && sectorsVisited >= 10 && ctx.maxProfileLevel >= 5) {
    add('ch4_unlock');
    if (sectorsVisited >= 15) add('ch4_choice');
  }

  // Ch5 triggers
  if (ctx.hasAllModules && sectorsVisited >= 25) {
    add('ch5_unlock');
    if (sectorsVisited >= 20 && totalResources >= 8000) add('ch5_final_battle');
  }

  return pending;
}

export function getChapterForEventKey(key: string): number {
  return STORY_EVENTS.find(e => e.key === key)?.chapter ?? 1;
}

export function isEventUnread(event: StoryEvent, profileId: string): boolean {
  return !event.read_by.includes(profileId);
}
