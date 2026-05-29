'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type StoryEvent = Database['public']['Tables']['story_events']['Row'];
type GameState = Database['public']['Tables']['game_state']['Row'];

const CHAPTER_TITLES: Record<number, string> = {
  1: 'First Days',
  2: 'Signals in the Noise',
  3: 'The Fracture',
  4: 'The Bunker',
  5: 'Homeward',
};

const CHAPTER_COLORS: Record<number, string> = {
  1: '#d4791c',
  2: '#c4a73e',
  3: '#8a5a2a',
  4: '#c04a2a',
  5: '#6b9a4a',
};

interface Props {
  profile: Profile | null;
  gameState: GameState | null;
  initialEvents: StoryEvent[];
}

export default function StoryClient({ profile, gameState, initialEvents }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [selected, setSelected] = useState<StoryEvent | null>(null);
  const supabase = createClient();

  const currentChapter = gameState?.current_chapter ?? 1;

  async function markRead(event: StoryEvent) {
    if (!profile?.id) return;
    if (event.read_by.includes(profile.id)) return;
    const newReadBy = [...event.read_by, profile.id];
    await supabase.from('story_events').update({ read_by: newReadBy }).eq('id', event.id);
    setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, read_by: newReadBy } : e));
  }

  function openEvent(event: StoryEvent) {
    setSelected(event);
    markRead(event);
  }

  if (!profile?.household_id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-6xl mb-4">📖</span>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#e8d5b8' }}>No Settlement Yet</h2>
        <p style={{ color: '#8a7a6a' }}>Create or join a settlement to unlock the story.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black mb-1" style={{ color: '#d4791c' }}>📖 Chronicle</h1>
        <p className="text-sm" style={{ color: '#8a7a6a' }}>Your settlement&apos;s story — chapter by chapter.</p>
      </div>

      {/* Chapter Progress */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((ch) => {
          const unlocked = ch <= currentChapter;
          const color = CHAPTER_COLORS[ch];
          const chEvents = events.filter((e) => e.chapter === ch);
          return (
            <div
              key={ch}
              className="flex-shrink-0 rounded-2xl p-4 border min-w-[130px]"
              style={{ background: '#1a1208', borderColor: unlocked ? color + '66' : '#2a1f14', opacity: unlocked ? 1 : 0.4 }}
            >
              <div className="text-xs font-semibold mb-1" style={{ color: unlocked ? color : '#8a7a6a' }}>Chapter {ch}</div>
              <div className="font-bold text-sm" style={{ color: '#e8d5b8' }}>{CHAPTER_TITLES[ch]}</div>
              {unlocked && chEvents.length > 0 && (
                <div className="text-xs mt-1" style={{ color: '#8a7a6a' }}>{chEvents.length} event{chEvents.length !== 1 ? 's' : ''}</div>
              )}
              {!unlocked && <div className="text-xs mt-1" style={{ color: '#8a7a6a' }}>Locked</div>}
            </div>
          );
        })}
      </div>

      {/* Event Log */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <span className="text-6xl mb-4">🏚️</span>
          <p className="text-xl font-bold mb-2" style={{ color: '#e8d5b8' }}>No events yet</p>
          <p style={{ color: '#8a7a6a' }}>Complete chores and scout the wasteland to unlock the story.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...events].reverse().map((event) => {
            const isUnread = profile?.id ? !event.read_by.includes(profile.id) : false;
            const color = CHAPTER_COLORS[event.chapter] ?? '#d4791c';
            return (
              <button
                key={event.id}
                onClick={() => openEvent(event)}
                className="w-full text-left rounded-2xl p-5 border transition-opacity hover:opacity-80"
                style={{ background: '#1a1208', borderColor: isUnread ? color : '#2a1f14' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{(event as any).emoji ?? '📜'}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color }}>Ch.{event.chapter} · {CHAPTER_TITLES[event.chapter]}</span>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                      )}
                    </div>
                    <div className="font-bold" style={{ color: '#e8d5b8' }}>{(event as any).title ?? event.event_key}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#8a7a6a' }}>
                      {new Date(event.triggered_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span style={{ color: '#8a7a6a' }}>›</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Event Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(16,13,10,0.92)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl p-8 border"
            style={{ background: '#1a1208', borderColor: CHAPTER_COLORS[selected.chapter] + '66' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">{(selected as any).emoji ?? '📜'}</div>
              <div className="text-xs font-semibold mb-1" style={{ color: CHAPTER_COLORS[selected.chapter] }}>
                Chapter {selected.chapter} · {CHAPTER_TITLES[selected.chapter]}
              </div>
              <h2 className="text-2xl font-black" style={{ color: '#e8d5b8' }}>{(selected as any).title ?? selected.event_key}</h2>
            </div>
            <div className="text-sm leading-relaxed mb-6 max-h-64 overflow-y-auto" style={{ color: '#c0b090' }}>
              {((selected as any).narrative ?? selected.event_key).split('\n\n').map((para: string, i: number) => (
                <p key={i} className={i > 0 ? 'mt-3' : ''}>{para}</p>
              ))}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-full py-3 rounded-2xl font-bold"
              style={{ backgroundColor: CHAPTER_COLORS[selected.chapter], color: '#100d0a' }}
            >
              Acknowledged ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
