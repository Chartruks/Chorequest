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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#100d0a' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-6xl">🏚️</span>
          <h1 className="text-4xl font-black mt-2" style={{ color: '#d4791c' }}>Ashen Keep</h1>
          <p className="mt-1" style={{ color: '#8a7a6a' }}>Sign in to return to the settlement</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl p-8 space-y-4 border" style={{ background: '#1a1208', borderColor: '#2a1f14' }}>
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#ff453a22', color: '#ff6961', border: '1px solid #ff453a44' }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#8a7a6a' }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3 outline-none"
              style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#8a7a6a' }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 outline-none"
              style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-lg transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#d4791c', color: '#100d0a' }}
          >
            {loading ? 'Entering…' : 'Enter Keep'}
          </button>

          <p className="text-center text-sm" style={{ color: '#8a7a6a' }}>
            No account?{' '}
            <Link href="/auth/sign-up" className="font-semibold" style={{ color: '#d4791c' }}>
              Found a Settlement
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
