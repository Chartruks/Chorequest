import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SignOutButton from './SignOutButton';

const NAV = [
  { href: '/dashboard/quests', emoji: '🚀', label: 'Missions' },
  { href: '/dashboard/station', emoji: '🏗️', label: 'Station' },
  { href: '/dashboard/galaxy', emoji: '🌌', label: 'Galaxy' },
  { href: '/dashboard/story', emoji: '📖', label: 'Chronicle' },
  { href: '/dashboard/leaderboard', emoji: '🏆', label: 'Ranks' },
  { href: '/dashboard/rewards', emoji: '🎁', label: 'Rewards' },
  { href: '/dashboard/profile', emoji: '🧑‍🚀', label: 'Agent' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/sign-in');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#05050f' }}>
      {/* Top nav */}
      <header className="border-b px-6 py-3 flex items-center justify-between" style={{ backgroundColor: '#0d0d1f', borderColor: '#1e1e3f' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚀</span>
          <span className="font-black text-xl" style={{ color: '#00e5ff' }}>ChoreQuest</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold" style={{ color: '#00e5ff' }}>
            ⭐ {profile?.points ?? 0} · Lv.{profile?.level ?? 1}
          </span>
          <span className="text-sm" style={{ color: '#6b6b8a' }}>
            {profile?.role === 'parent' ? '👩‍✈️' : '🤖'} {profile?.username ?? 'Agent'}
          </span>
          <SignOutButton />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 hidden md:flex flex-col border-r py-6 gap-1 px-3" style={{ backgroundColor: '#0d0d1f', borderColor: '#1e1e3f' }}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors hover:bg-white/5"
              style={{ color: '#8e8ea0' }}
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
      <nav className="md:hidden flex border-t" style={{ backgroundColor: '#0d0d1f', borderColor: '#1e1e3f' }}>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center py-3 gap-1 text-xs font-semibold transition-colors"
            style={{ color: '#6b6b8a' }}
          >
            <span className="text-xl">{item.emoji}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
