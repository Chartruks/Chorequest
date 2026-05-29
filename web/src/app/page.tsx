import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'linear-gradient(135deg, #100d0a 0%, #1a1208 50%, #0d0800 100%)' }}>
      <span className="text-8xl mb-6">🏚️</span>
      <h1 className="text-5xl font-black mb-3" style={{ color: '#d4791c' }}>Ashen Keep</h1>
      <p className="text-lg mb-2" style={{ color: '#8a7a6a' }}>
        Turn household chores into survival missions.
      </p>
      <p className="text-sm mb-10" style={{ color: '#5a4a3a' }}>
        Earn credits, build your settlement, scout the wasteland — together.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/auth/sign-up"
          className="px-8 py-4 rounded-xl font-bold text-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#d4791c', color: '#100d0a' }}
        >
          Found Settlement
        </Link>
        <Link
          href="/auth/sign-in"
          className="px-8 py-4 rounded-xl font-bold text-lg border transition-colors"
          style={{ borderColor: '#2a1f14', color: '#e8d5b8' }}
        >
          Sign In
        </Link>
      </div>

      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full text-left">
        {[
          { emoji: '⚡', title: 'Assign Chores', desc: 'Leaders create tasks with credit rewards for their survivors.' },
          { emoji: '⭐', title: 'Earn Credits', desc: 'Complete chores, level up, and contribute resources to the settlement.' },
          { emoji: '🗺️', title: 'Scout the Wasteland', desc: 'Send scouts to explore zones and unlock new chapters of the story.' },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl p-5 border" style={{ background: '#1a1208', borderColor: '#2a1f14' }}>
            <span className="text-3xl">{f.emoji}</span>
            <h3 className="font-bold mt-2 mb-1" style={{ color: '#d4791c' }}>{f.title}</h3>
            <p className="text-sm" style={{ color: '#8a7a6a' }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
