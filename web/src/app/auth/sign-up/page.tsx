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
  const [isLeader, setIsLeader] = useState(true);
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
      await supabase.from('profiles').update({ username, is_leader: isLeader }).eq('id', data.user.id);
    }
    setLoading(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#100d0a' }}>
        <div className="text-center max-w-md">
          <span className="text-6xl">📬</span>
          <h2 className="text-2xl font-bold mt-4 mb-2" style={{ color: '#d4791c' }}>Check Your Email</h2>
          <p style={{ color: '#8a7a6a' }}>We sent a confirmation link to <strong style={{ color: '#e8d5b8' }}>{email}</strong>. Confirm to activate your survivor profile.</p>
          <Link href="/auth/sign-in" className="inline-block mt-6 px-6 py-3 rounded-xl font-bold" style={{ backgroundColor: '#d4791c', color: '#100d0a' }}>
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#100d0a' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-6xl">🏚️</span>
          <h1 className="text-4xl font-black mt-2" style={{ color: '#d4791c' }}>Join Ashen Keep</h1>
          <p className="mt-1" style={{ color: '#8a7a6a' }}>Create your survivor profile</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl p-8 space-y-4 border" style={{ background: '#1a1208', borderColor: '#2a1f14' }}>
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#ff453a22', color: '#ff6961', border: '1px solid #ff453a44' }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#8a7a6a' }}>Survivor name</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Asha, Rex, Nora"
              className="w-full rounded-xl px-4 py-3 outline-none"
              style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }}
            />
          </div>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 outline-none"
              style={{ background: '#100d0a', border: '1px solid #2a1f14', color: '#e8d5b8' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#8a7a6a' }}>Your role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsLeader(true)}
                className="rounded-xl p-4 text-center border-2 transition-all"
                style={{ background: isLeader ? '#d4791c11' : '#100d0a', borderColor: isLeader ? '#d4791c' : '#2a1f14' }}
              >
                <div className="text-3xl mb-1">🏛️</div>
                <div className="font-semibold" style={{ color: isLeader ? '#d4791c' : '#8a7a6a' }}>Leader</div>
                <div className="text-xs mt-1" style={{ color: '#5a4a3a' }}>Found & manage the settlement</div>
              </button>
              <button
                type="button"
                onClick={() => setIsLeader(false)}
                className="rounded-xl p-4 text-center border-2 transition-all"
                style={{ background: !isLeader ? '#c4a73e11' : '#100d0a', borderColor: !isLeader ? '#c4a73e' : '#2a1f14' }}
              >
                <div className="text-3xl mb-1">🧍</div>
                <div className="font-semibold" style={{ color: !isLeader ? '#c4a73e' : '#8a7a6a' }}>Survivor</div>
                <div className="text-xs mt-1" style={{ color: '#5a4a3a' }}>Complete tasks &amp; earn credits</div>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-lg transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#d4791c', color: '#100d0a' }}
          >
            {loading ? 'Registering…' : 'Join the Keep'}
          </button>

          <p className="text-center text-sm" style={{ color: '#8a7a6a' }}>
            Already a survivor?{' '}
            <Link href="/auth/sign-in" className="font-semibold" style={{ color: '#d4791c' }}>
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
