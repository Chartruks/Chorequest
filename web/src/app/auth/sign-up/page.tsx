'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'parent' | 'child'>('parent');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('profiles').update({ username, role }).eq('id', data.user.id);
    }
    setLoading(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#05050f' }}>
        <div className="text-center max-w-md">
          <span className="text-6xl">📡</span>
          <h2 className="text-2xl font-bold mt-4 mb-2" style={{ color: '#00e5ff' }}>Transmission Sent</h2>
          <p style={{ color: '#8e8ea0' }}>We sent a confirmation link to <strong className="text-white">{email}</strong>. Confirm to activate your agent profile.</p>
          <Link href="/auth/sign-in" className="inline-block mt-6 px-6 py-3 rounded-xl font-bold" style={{ backgroundColor: '#00e5ff', color: '#05050f' }}>
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#05050f' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-6xl">🚀</span>
          <h1 className="text-4xl font-black mt-2" style={{ color: '#00e5ff' }}>Enlist in ChoreQuest</h1>
          <p className="mt-1" style={{ color: '#6b6b8a' }}>Create your agent profile</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl p-8 space-y-4 border" style={{ background: '#0d0d1f', borderColor: '#1e1e3f' }}>
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#ff453a22', color: '#ff6961', border: '1px solid #ff453a44' }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#8e8ea0' }}>Call sign</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400"
              style={{ background: '#05050f', border: '1px solid #1e1e3f' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#8e8ea0' }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400"
              style={{ background: '#05050f', border: '1px solid #1e1e3f' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#8e8ea0' }}>Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400"
              style={{ background: '#05050f', border: '1px solid #1e1e3f' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#8e8ea0' }}>My rank is…</label>
            <div className="grid grid-cols-2 gap-3">
              {(['parent', 'child'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className="rounded-xl p-4 text-center border-2 transition-all"
                  style={{
                    background: role === r ? '#001a1f' : '#05050f',
                    borderColor: role === r ? '#00e5ff' : '#1e1e3f',
                  }}
                >
                  <div className="text-3xl mb-1">{r === 'parent' ? '👩‍✈️' : '🤖'}</div>
                  <div className="font-semibold" style={{ color: role === r ? '#00e5ff' : '#8e8ea0' }}>
                    {r === 'parent' ? 'Commander' : 'Cadet'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-lg transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#00e5ff', color: '#05050f' }}
          >
            {loading ? 'Enlisting…' : 'Begin Mission'}
          </button>

          <p className="text-center text-sm" style={{ color: '#6b6b8a' }}>
            Already enlisted?{' '}
            <Link href="/auth/sign-in" className="font-semibold" style={{ color: '#00e5ff' }}>
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
