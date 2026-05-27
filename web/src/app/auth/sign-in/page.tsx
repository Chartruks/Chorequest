'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#05050f' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-6xl">🚀</span>
          <h1 className="text-4xl font-black mt-2" style={{ color: '#00e5ff' }}>ChoreQuest</h1>
          <p className="mt-1" style={{ color: '#6b6b8a' }}>Sign in to resume your mission</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl p-8 space-y-4 border" style={{ background: '#0d0d1f', borderColor: '#1e1e3f' }}>
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#ff453a22', color: '#ff6961', border: '1px solid #ff453a44' }}>
              {error}
            </div>
          )}

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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400"
              style={{ background: '#05050f', border: '1px solid #1e1e3f' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-lg transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#00e5ff', color: '#05050f' }}
          >
            {loading ? 'Connecting…' : 'Sign In'}
          </button>

          <p className="text-center text-sm" style={{ color: '#6b6b8a' }}>
            No account?{' '}
            <Link href="/auth/sign-up" className="font-semibold" style={{ color: '#00e5ff' }}>
              Enlist Now
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
