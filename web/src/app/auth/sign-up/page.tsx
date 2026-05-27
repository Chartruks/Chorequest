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
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="text-center max-w-md">
          <span className="text-6xl">📬</span>
          <h2 className="text-2xl font-bold mt-4 mb-2" style={{ color: '#FFD700' }}>Check your email</h2>
          <p style={{ color: '#aaa' }}>We sent a confirmation link to <strong className="text-white">{email}</strong>. Click it to activate your account.</p>
          <Link href="/auth/sign-in" className="inline-block mt-6 px-6 py-3 rounded-xl font-bold" style={{ backgroundColor: '#FFD700', color: '#1a1a2e' }}>
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#1a1a2e' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-6xl">⚔️</span>
          <h1 className="text-4xl font-black mt-2" style={{ color: '#FFD700' }}>Join ChoreQuest</h1>
          <p className="mt-1" style={{ color: '#888' }}>Create your hero account</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl p-8 space-y-4 border" style={{ background: '#16213e', borderColor: '#2a2a5a' }}>
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#ff444422', color: '#ff6666', border: '1px solid #ff444444' }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#aaa' }}>Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-yellow-400"
              style={{ background: '#1a1a2e', border: '1px solid #2a2a5a' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#aaa' }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-yellow-400"
              style={{ background: '#1a1a2e', border: '1px solid #2a2a5a' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#aaa' }}>Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-yellow-400"
              style={{ background: '#1a1a2e', border: '1px solid #2a2a5a' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#aaa' }}>I am a…</label>
            <div className="grid grid-cols-2 gap-3">
              {(['parent', 'child'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className="rounded-xl p-4 text-center border-2 transition-all"
                  style={{
                    background: role === r ? '#2a2410' : '#1a1a2e',
                    borderColor: role === r ? '#FFD700' : '#2a2a5a',
                  }}
                >
                  <div className="text-3xl mb-1">{r === 'parent' ? '👑' : '⚡'}</div>
                  <div className="font-semibold" style={{ color: role === r ? '#FFD700' : '#aaa' }}>
                    {r === 'parent' ? 'Parent' : 'Child'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-lg transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#FFD700', color: '#1a1a2e' }}
          >
            {loading ? 'Creating account…' : 'Start Quest'}
          </button>

          <p className="text-center text-sm" style={{ color: '#888' }}>
            Already have an account?{' '}
            <Link href="/auth/sign-in" className="font-semibold" style={{ color: '#FFD700' }}>
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
