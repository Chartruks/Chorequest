import { createClient } from '@/lib/supabase/server';

export default async function StorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();

  const [{ data: items }, { data: owned }] = await Promise.all([
    supabase.from('store_items').select('*').order('sort_order'),
    supabase.from('player_items').select('id, item_id, equipped').eq('profile_id', user!.id),
  ]);

  const ownedMap = Object.fromEntries((owned ?? []).map((o: any) => [o.item_id, o]));

  const groups: Record<string, any[]> = {
    character: [], weapon: [], armor: [], consumable: [],
  };
  for (const item of (items ?? [])) {
    if (groups[item.item_type]) groups[item.item_type].push(item);
  }

  const groupLabels: Record<string, string> = {
    character: '🧑 Characters',
    weapon:    '⚔️ Weapons',
    armor:     '🛡️ Armor',
    consumable:'💊 Consumables',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black" style={{ color: '#d4791c' }}>🛒 Store</h1>
          <p className="text-sm mt-1" style={{ color: '#8a7a6a' }}>Buy on mobile — browse here.</p>
        </div>
        <div className="rounded-xl px-4 py-2 font-bold" style={{ background: '#2a1f14', color: '#c4a73e' }}>
          💰 {profile?.points ?? 0}
        </div>
      </div>

      {Object.entries(groups).map(([type, typeItems]) => (
        <div key={type} className="mb-8">
          <h2 className="text-lg font-bold mb-3" style={{ color: '#e8d5b8' }}>{groupLabels[type]}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {typeItems.map((item: any) => {
              const ownedEntry = ownedMap[item.id];
              const isEquipped = ownedEntry?.equipped;
              const isOwned    = !!ownedEntry;
              const canAfford  = (profile?.points ?? 0) >= item.cost;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl p-4 border flex gap-3 items-center"
                  style={{ background: '#1a1208', borderColor: isEquipped ? '#d4791c' : '#2a1f14' }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: '#100d0a', border: '1px solid #2a1f14' }}
                  >
                    {item.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: '#e8d5b8' }}>{item.name}</div>
                    <div className="text-xs mb-1" style={{ color: '#8a7a6a' }}>{item.description}</div>
                    <div className="flex gap-2">
                      {item.damage_bonus > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: '#2a1f14', color: '#c4a73e' }}>+{item.damage_bonus} ⚔️</span>
                      )}
                      {item.hp_bonus > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: '#2a1f14', color: '#c4a73e' }}>+{item.hp_bonus} 🛡️</span>
                      )}
                      {item.heal_amount > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: '#2a1f14', color: '#c4a73e' }}>+{item.heal_amount > 900 ? 'full' : item.heal_amount} ❤️</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isEquipped ? (
                      <span className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: '#4a8a5e33', color: '#6b9a4a' }}>Equipped</span>
                    ) : isOwned && item.item_type !== 'consumable' ? (
                      <span className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: '#2a1f14', color: '#8a7a6a' }}>Owned</span>
                    ) : (
                      <span
                        className="text-xs font-bold px-3 py-1.5 rounded-lg"
                        style={{
                          background: canAfford ? '#d4791c' : '#2a1f14',
                          color: canAfford ? '#100d0a' : '#5a4a3a',
                        }}
                      >
                        {item.cost === 0 ? 'Free' : `💰${item.cost}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
