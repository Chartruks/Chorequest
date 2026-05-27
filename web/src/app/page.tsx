import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'linear-gradient(135deg, #05050f 0%, #0d0d1f 50%, #0a001f 100%)' }}>
      <span className="text-8xl mb-6">🚀</span>
      <h1 className="text-5xl font-black mb-3" style={{ color: '#00e5ff' }}>ChoreQuest</h1>
      <p className="text-lg mb-2" style={{ color: '#8e8ea0' }}>
        Turn household chores into galactic missions.
      </p>
      <p className="text-sm mb-10" style={{ color: '#555570' }}>
        Earn credits, level up, unlock rewards — for the whole crew.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/auth/sign-up"
          className="px-8 py-4 rounded-xl font-bold text-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#00e5ff', color: '#05050f' }}
        >
          Begin Mission
        </Link>
        <Link
          href="/auth/sign-in"
          className="px-8 py-4 rounded-xl font-bold text-lg border transition-colors hover:border-cyan-400"
          style={{ borderColor: '#1e1e3f', color: '#fff' }}
        >
          Sign In
        </Link>
      </div>

      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full text-left">
        {[
          { emoji: '📡', title: 'Assign Missions', desc: 'Commanders create chores as missions with credit rewards.' },
          { emoji: '⭐', title: 'Earn Credits', desc: 'Cadets complete missions and rack up XP to level up.' },
          { emoji: '🎁', title: 'Redeem Rewards', desc: 'Spend credits on rewards set by the Commander.' },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl p-5 border" style={{ background: '#0d0d1f', borderColor: '#1e1e3f' }}>
            <span className="text-3xl">{f.emoji}</span>
            <h3 className="font-bold mt-2 mb-1" style={{ color: '#00e5ff' }}>{f.title}</h3>
            <p className="text-sm" style={{ color: '#6b6b8a' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
