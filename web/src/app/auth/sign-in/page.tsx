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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#1a1a2e' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-6xl">⚔️</span>
          <h1 className="text-4xl font-black mt-2" style={{ color: '#FFD700' }}>ChoreQuest</h1>
          <p className="mt-1" style={{ color: '#888' }}>Sign in to continue your quest</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl p-8 space-y-4 border" style={{ background: '#16213e', borderColor: '#2a2a5a' }}>
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#ff444422', color: '#ff6666', border: '1px solid #ff444444' }}>
              {error}
            </div>
          )}

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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-yellow-400"
              style={{ background: '#1a1a2e', border: '1px solid #2a2a5a' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-lg transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#FFD700', color: '#1a1a2e' }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <p className="text-center text-sm" style={{ color: '#888' }}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/sign-up" className="font-semibold" style={{ color: '#FFD700' }}>
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
