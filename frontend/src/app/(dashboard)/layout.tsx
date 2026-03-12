'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 font-sans">
      <div
        className="relative flex w-full max-w-md flex-col overflow-hidden bg-zinc-950 shadow-2xl"
        style={{ height: '100dvh', maxHeight: '100dvh' }}
      >
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 px-6 py-4 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <h1 className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-lg font-bold text-transparent">
                HeyPoco
              </h1>
            </Link>

            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/query"
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 transition-colors hover:text-violet-400"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Ask
              </Link>
              <button
                onClick={handleLogout}
                className="text-zinc-600 transition-colors hover:text-zinc-400"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="scrollbar-hide flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  )
}
