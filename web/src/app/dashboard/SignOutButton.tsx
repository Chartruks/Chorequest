'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }
  return (
    <button
      onClick={handleSignOut}
      className="text-sm px-3 py-1 rounded-lg border transition-colors hover:border-red-500 hover:text-red-400"
      style={{ borderColor: '#1e1e3f', color: '#555570' }}
    >
      Disconnect
    </button>
  );
}
