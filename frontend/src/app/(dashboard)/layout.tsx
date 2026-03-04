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
    <div className="min-h-screen bg-[#f5f4f0] font-sans">
      {/* Header — matches /test page */}
      <header className="sticky top-0 z-50 flex items-center gap-4 border-b border-black/10 bg-white/80 px-6 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-4">
          <div className="h-2 w-2 rounded-full bg-black" />
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-black/50">
            HeyPoco
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/query"
            className="flex items-center gap-1.5 text-xs text-black/40 transition-colors hover:text-black/70"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Search
          </Link>
          <button
            onClick={handleLogout}
            className="text-black/40 transition-colors hover:text-black/70"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
    </div>
  )
}
