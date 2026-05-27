import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SignOutButton from './SignOutButton';

const NAV = [
  { href: '/dashboard/quests', emoji: '⚔️', label: 'Quests' },
  { href: '/dashboard/leaderboard', emoji: '🏆', label: 'Ranks' },
  { href: '/dashboard/rewards', emoji: '🎁', label: 'Rewards' },
  { href: '/dashboard/profile', emoji: '🧙', label: 'Hero' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/sign-in');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1a1a2e' }}>
      {/* Top nav */}
      <header className="border-b px-6 py-3 flex items-center justify-between" style={{ backgroundColor: '#16213e', borderColor: '#2a2a5a' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚔️</span>
          <span className="font-black text-xl" style={{ color: '#FFD700' }}>ChoreQuest</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold" style={{ color: '#FFD700' }}>
            ⭐ {profile?.points ?? 0} pts · Lv.{profile?.level ?? 1}
          </span>
          <span className="text-sm" style={{ color: '#888' }}>
            {profile?.role === 'parent' ? '👑' : '⚡'} {profile?.username ?? 'Hero'}
          </span>
          <SignOutButton />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 hidden md:flex flex-col border-r py-6 gap-1 px-3" style={{ backgroundColor: '#16213e', borderColor: '#2a2a5a' }}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors hover:bg-white/5"
              style={{ color: '#aaa' }}
            >
              <span className="text-xl">{item.emoji}</span>
              {item.label}
            </Link>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden flex border-t" style={{ backgroundColor: '#16213e', borderColor: '#2a2a5a' }}>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center py-3 gap-1 text-xs font-semibold transition-colors"
            style={{ color: '#888' }}
          >
            <span className="text-xl">{item.emoji}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
