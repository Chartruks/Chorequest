import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <span className="text-8xl mb-6">⚔️</span>
      <h1 className="text-5xl font-black mb-3" style={{ color: '#FFD700' }}>ChoreQuest</h1>
      <p className="text-lg mb-2" style={{ color: '#aaa' }}>
        Turn household chores into epic quests.
      </p>
      <p className="text-sm mb-10" style={{ color: '#666' }}>
        Earn points, level up, unlock rewards — for the whole family.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/auth/sign-up"
          className="px-8 py-4 rounded-xl font-bold text-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#FFD700', color: '#1a1a2e' }}
        >
          Start Your Quest
        </Link>
        <Link
          href="/auth/sign-in"
          className="px-8 py-4 rounded-xl font-bold text-lg border transition-colors hover:border-yellow-400"
          style={{ borderColor: '#2a2a5a', color: '#fff' }}
        >
          Sign In
        </Link>
      </div>

      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full text-left">
        {[
          { emoji: '📜', title: 'Assign Quests', desc: 'Parents create chores as quests with point rewards.' },
          { emoji: '⭐', title: 'Earn Points', desc: 'Kids complete quests and rack up XP to level up.' },
          { emoji: '🎁', title: 'Redeem Rewards', desc: 'Spend points on rewards set by parents.' },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl p-5 border" style={{ background: '#16213e', borderColor: '#2a2a5a' }}>
            <span className="text-3xl">{f.emoji}</span>
            <h3 className="font-bold mt-2 mb-1" style={{ color: '#FFD700' }}>{f.title}</h3>
            <p className="text-sm" style={{ color: '#888' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
