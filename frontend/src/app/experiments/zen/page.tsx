'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  Send,
  Pause,
  Sparkles,
  CreditCard,
  CheckCircle2,
  HeartPulse,
  Briefcase,
  Clock,
  FileText,
  Plane,
  LogOut,
} from 'lucide-react'
import { ingestEntry, queryEntries, transcribeAudio } from '@/lib/api-client'
import { createClient } from '@/lib/supabase/client'
import type { IngestResponse, QueryResponse } from '@/types'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface RichData {
  type: 'expense' | 'summary' | 'schedule' | 'travel' | 'health' | 'note' | 'journal'
  // expense
  amount?: string
  merchant?: string
  splitWith?: string
  splitAmount?: string
  // summary
  totalAmount?: string
  count?: number
  stats?: Array<{ label: string; value: string; color?: string }>
  // schedule
  items?: Array<{ label: string; time: string }>
  // travel
  from?: string
  to?: string
  travelTime?: string
  airline?: string
  flightNumber?: string
  // health
  steps?: string
  sleep?: string
  mood?: string
  // note / journal
  body?: string
  tags?: string[]
  person?: string
}

interface ChatMessage {
  id: string
  text: string
  sender: 'user' | 'poco'
  category?: string
  timestamp: Date
  richData?: RichData
  error?: boolean
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatTime(raw: string): string {
  // Try parsing as ISO datetime; fall back to returning as-is
  try {
    const d = new Date(raw)
    if (!isNaN(d.getTime())) {
      return d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    }
  } catch {
    // ignore
  }
  return raw
}

function isQuery(text: string): boolean {
  const lower = text.toLowerCase().trim()
  const startsWithQuery = [
    'how much',
    'how many',
    'what',
    'when',
    'who',
    'where',
    'why',
    'show me',
    'list',
    'find',
    'search',
    'tell me',
    'give me',
  ]
  const containsQuery = ['did i', 'have i', 'do i', 'summary', 'total', 'any']
  return (
    startsWithQuery.some((w) => lower.startsWith(w)) ||
    (containsQuery.some((w) => lower.includes(w)) && lower.endsWith('?')) ||
    lower.endsWith('?')
  )
}

const _TRAVEL_WORDS = [
  'travel',
  'traveling',
  'travelling',
  'flight',
  'fly',
  'flying',
  'trip',
  'drive',
  'driving',
  'train',
  'bus',
  'heading to',
  'going to',
]

function _isTravelEntry(raw: string, f: Record<string, unknown>): boolean {
  const lower = raw.toLowerCase()
  return (
    _TRAVEL_WORDS.some((w) => lower.includes(w)) ||
    !!(f.title as string)?.toLowerCase().match(/travel|flight|trip|fly/)
  )
}

// Extract "City A to City B" from text like "traveling from Phoenix to India"
function _extractRoute(
  raw: string,
  f: Record<string, unknown>
): { from: string; to: string } | null {
  // Try extracted title first
  const title = (f.title as string) || ''
  const fromToMatch = (title + ' ' + raw).match(
    /from\s+([A-Z][a-zA-Z\s]+?)\s+to\s+([A-Z][a-zA-Z\s]+?)(?:\s+(?:tomorrow|today|on|at|and|\.|$))/i
  )
  if (fromToMatch) return { from: fromToMatch[1].trim(), to: fromToMatch[2].trim() }
  // "X to Y" pattern
  const simpleMatch = raw.match(/([A-Z][a-zA-Z]+)\s+to\s+([A-Z][a-zA-Z]+)/)
  if (simpleMatch) return { from: simpleMatch[1], to: simpleMatch[2] }
  return null
}

function ingestToRichData(response: IngestResponse): RichData | undefined {
  const f = response.extracted_fields as Record<string, unknown>

  if (response.type === 'finance') {
    const rawAmount = f.amount != null ? Number(f.amount) : null
    const amount = rawAmount != null ? `$${rawAmount.toFixed(2)}` : ''
    const merchant = (f.merchant as string) || (f.category as string) || 'Purchase'
    // Detect split: person mentioned + "split" in raw_text
    const raw = response.raw_text.toLowerCase()
    const person = (f.person as string) || undefined
    const hasSplit = raw.includes('split') || raw.includes('shared') || raw.includes('between')
    const splitWith = hasSplit && person ? person : undefined
    const splitAmount =
      splitWith && rawAmount != null ? `$${(rawAmount / 2).toFixed(2)}` : undefined
    return { type: 'expense', amount, merchant, splitWith, splitAmount }
  }

  if (response.type === 'task' || response.type === 'event') {
    // Detect travel entries and show TravelCard
    if (_isTravelEntry(response.raw_text, f)) {
      const route = _extractRoute(response.raw_text, f)
      const label = (f.title as string) || response.raw_text.slice(0, 60)
      const rawTime = (f.scheduled_at as string) || (f.deadline as string) || ''
      return {
        type: 'travel',
        from: route?.from,
        to: route?.to,
        travelTime: rawTime ? formatTime(rawTime) : undefined,
        body: label,
        tags: Array.isArray(response.tags) ? response.tags : [],
      }
    }
    const label = (f.action as string) || (f.title as string) || response.raw_text.slice(0, 60)
    const rawTime = (f.scheduled_at as string) || (f.deadline as string) || ''
    const time = rawTime ? formatTime(rawTime) : 'Scheduled'
    return { type: 'schedule', items: [{ label, time }] }
  }

  if (response.type === 'health') {
    // Backend has no steps/sleep fields — parse them from raw_text
    const raw = response.raw_text.toLowerCase()
    const stepsMatch = raw.match(/(\d[\d,]*)\s*steps?/)
    const sleepMatch =
      raw.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?(?:\s+(?:of\s+)?sleep)?/) ||
      raw.match(/slept\s+(\d+(?:\.\d+)?)\s*h/)
    return {
      type: 'health',
      steps: stepsMatch ? stepsMatch[1].replace(/,/g, '') : undefined,
      sleep: sleepMatch ? `${sleepMatch[1]}h` : undefined,
      mood: (f.mood as string) || undefined,
      body: (f.notes as string) || (f.symptom as string) || undefined,
    }
  }

  if (response.type === 'journal') {
    const tags = Array.isArray(response.tags) ? response.tags : []
    // Prefer structured highlights; fall back to notes/topic; never dump raw_text
    const highlights =
      Array.isArray(f.highlights) && f.highlights.length > 0
        ? (f.highlights as string[]).join(' · ')
        : undefined
    const body = highlights || (f.notes as string) || (f.topic as string) || undefined
    return {
      type: 'journal',
      body,
      mood: (f.mood as string) || undefined,
      tags,
    }
  }

  if (response.type === 'note' || response.type === 'general') {
    const tags = Array.isArray(response.tags) ? response.tags : []
    return {
      type: 'note',
      body: response.raw_text.slice(0, 120),
      person: (f.person as string) || undefined,
      tags,
    }
  }

  return undefined
}

function ingestToCategory(response: IngestResponse): string {
  const f = response.extracted_fields as Record<string, unknown>
  if (
    (response.type === 'task' || response.type === 'event') &&
    _isTravelEntry(response.raw_text, f)
  ) {
    return 'TRAVEL'
  }
  const map: Record<string, string> = {
    finance: 'EXPENSE',
    task: 'TASK',
    event: 'EVENT',
    journal: 'JOURNAL',
    health: 'HEALTH',
    note: 'NOTE',
    general: 'NOTE',
  }
  return map[response.type] || 'NOTE'
}

function ingestToReply(response: IngestResponse): string {
  const f = response.extracted_fields as Record<string, unknown>
  if (response.type === 'finance') {
    const amount = f.amount != null ? `$${Number(f.amount).toFixed(2)}` : ''
    return `Got it. ${amount} tracked.`
  }
  if (response.type === 'task') return 'Task noted.'
  if (response.type === 'event') return 'Event logged.'
  if (response.type === 'journal') return 'Journal entry saved.'
  if (response.type === 'health') return 'Health note saved.'
  return 'Noted.'
}

function queryToRichData(response: QueryResponse): RichData | undefined {
  // Finance summary card
  if (response.finance_total != null && response.finance_total > 0) {
    const stats = response.sources
      .filter((s) => (s.extracted_fields as Record<string, unknown>)?.amount != null)
      .slice(0, 5)
      .map((s) => {
        const ef = s.extracted_fields as Record<string, unknown>
        return {
          label: (ef.merchant as string) || (ef.category as string) || 'Purchase',
          value: `$${Number(ef.amount).toFixed(2)}`,
        }
      })
    return {
      type: 'summary',
      totalAmount: `$${response.finance_total.toFixed(2)}`,
      count: response.sources.length,
      stats,
    }
  }

  // List query — show all sources as schedule items (events/tasks) or notes
  if (response.sources.length > 0) {
    const firstType = response.sources[0]?.type as string

    if (firstType === 'event' || firstType === 'task') {
      const items = response.sources.slice(0, 8).map((s) => {
        const ef = s.extracted_fields as Record<string, unknown>
        const label = (ef.title as string) || (ef.action as string) || s.raw_text.slice(0, 60)
        const rawTime =
          (ef.scheduled_at as string) || (ef.deadline as string) || (s.entry_date as string) || ''
        return { label, time: rawTime ? formatTime(rawTime) : 'Scheduled' }
      })
      return { type: 'schedule', items }
    }

    if (firstType === 'journal') {
      const s = response.sources[0]
      const ef = s.extracted_fields as Record<string, unknown>
      const highlights =
        Array.isArray(ef.highlights) && ef.highlights.length > 0
          ? (ef.highlights as string[]).join(' · ')
          : undefined
      return {
        type: 'journal',
        body: highlights || (ef.notes as string) || undefined,
        mood: (ef.mood as string) || undefined,
        tags: Array.isArray(s.tags) ? s.tags : [],
      }
    }

    // Generic list → note card with bullet list
    const body = response.sources
      .slice(0, 5)
      .map((s) => `• ${s.raw_text.slice(0, 80)}`)
      .join('\n')
    const tags = response.sources.flatMap((s) => s.tags ?? []).slice(0, 4)
    return { type: 'note', body, tags }
  }

  return undefined
}

const CATEGORY_COLORS: Record<string, string> = {
  EXPENSE: '#ff6b6b',
  TASK: '#4ecdc4',
  EVENT: '#a66cff',
  TRAVEL: '#ec4899',
  JOURNAL: '#f59e0b',
  HEALTH: '#10b981',
  NOTE: '#95a5a6',
  QUERY: '#3b82f6',
}

/* ─── Rich Components ────────────────────────────────────────────────────── */

function ExpenseCard({ data }: { data: RichData }) {
  return (
    <div className="w-full space-y-3 rounded-3xl border border-[#e5e5e5]/50 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="rounded-xl bg-[#faf9f6] p-2 text-[#ff6b6b]">
          <CreditCard size={16} />
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/40">
            Finance
          </span>
          {data.merchant && (
            <p className="text-[14px] font-medium leading-tight text-[#1a1a1a]">{data.merchant}</p>
          )}
        </div>
      </div>
      {data.splitWith && (
        <p className="text-[12px] text-[#737373]">With {data.splitWith} · Split bill tracked</p>
      )}
      <div className="flex items-end justify-between rounded-2xl bg-[#1a1a1a] p-4 text-white">
        <div>
          <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.2em] opacity-40">
            You Paid
          </span>
          <span className="text-3xl font-light tracking-tight">{data.amount}</span>
        </div>
        {data.splitWith && data.splitAmount && (
          <div className="text-right">
            <span className="mb-0.5 block text-[10px] opacity-50">{data.splitWith} owes you</span>
            <span className="text-base font-semibold text-[#4ade80]">{data.splitAmount}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ data }: { data: RichData }) {
  return (
    <div className="w-full space-y-4 rounded-3xl bg-[#1a1a1a] p-5 text-white shadow-xl">
      <div className="flex items-center gap-2">
        <div className="rounded-xl bg-white/10 p-2">
          <CreditCard size={16} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
          Finance
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            Total Spent
          </span>
          <span className="text-3xl font-light">{data.totalAmount}</span>
        </div>
        <span className="mb-1 text-[10px] font-medium text-white/40">{data.count} entries</span>
      </div>
      {data.stats && data.stats.length > 0 && (
        <div className="space-y-2.5 border-t border-white/10 pt-2">
          {data.stats.map((stat, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[11px] font-medium">
                <span className="text-white/50">{stat.label}</span>
                <span className="text-white/80">{stat.value}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '65%' }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: stat.color || '#3b82f6' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ScheduleCard({ data }: { data: RichData }) {
  return (
    <div className="w-full space-y-4 rounded-3xl border border-[#e5e5e5]/50 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="rounded-xl bg-[#faf9f6] p-2 text-[#4ecdc4]">
          <CheckCircle2 size={16} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/40">
          Commitment
        </span>
      </div>
      <div className="space-y-3">
        {data.items?.map((item, i) => (
          <div key={i} className="rounded-2xl border border-[#4ecdc4]/10 bg-[#4ecdc4]/5 p-3">
            <span className="mb-1 block text-[10px] font-bold uppercase text-[#4ecdc4]">
              Scheduled
            </span>
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-[#4ecdc4]" />
              <span className="text-[13px] font-medium text-[#1a1a1a]">{item.label}</span>
            </div>
            <span className="mt-1 block pl-5 text-[11px] text-[#737373]/60">{item.time}</span>
          </div>
        ))}
        {!data.items?.length && (
          <div className="py-3 text-center text-[12px] italic text-[#737373]/40">
            Nothing scheduled
          </div>
        )}
      </div>
    </div>
  )
}

function TravelCard({ data }: { data: RichData }) {
  return (
    <div className="w-full space-y-4 rounded-3xl border border-[#e5e5e5]/50 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="rounded-xl bg-[#faf9f6] p-2 text-[#ec4899]">
          <Plane size={16} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/40">
          Travel
        </span>
      </div>
      {data.from && data.to ? (
        <div className="rounded-2xl border border-[#e5e5e5]/50 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-2xl font-medium text-[#1a1a1a]">{data.from}</span>
            </div>
            <div className="flex flex-1 flex-col items-center gap-1 px-4">
              <div className="relative h-[1px] w-full bg-[#e5e5e5]">
                <Plane size={10} className="absolute inset-0 m-auto text-[#ec4899]" />
              </div>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-2xl font-medium text-[#1a1a1a]">{data.to}</span>
            </div>
          </div>
          {data.travelTime && (
            <div className="flex items-center gap-2 border-t border-[#e5e5e5]/30 pt-3">
              <Clock size={11} className="text-[#737373]/50" />
              <span className="text-[11px] text-[#737373]/60">{data.travelTime}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#ec4899]/10 bg-[#ec4899]/5 p-3">
          <span className="text-[13px] text-[#1a1a1a]">{data.body || 'Travel logged.'}</span>
          {data.travelTime && (
            <span className="mt-1 block text-[11px] text-[#737373]/60">{data.travelTime}</span>
          )}
        </div>
      )}
      {data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-[#e5e5e5]/30 pt-1">
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[#e5e5e5] bg-[#faf9f6] px-2.5 py-1 text-[10px] font-medium text-[#737373]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function HealthCard({ data }: { data: RichData }) {
  return (
    <div className="w-full space-y-4 rounded-3xl border border-[#e5e5e5]/50 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="rounded-xl bg-[#faf9f6] p-2 text-[#ff6b6b]">
          <HeartPulse size={16} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/40">
          Wellness
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {data.steps && (
          <div className="rounded-2xl border border-[#e5e5e5]/50 bg-[#faf9f6]/50 p-3">
            <span className="mb-1 block text-[10px] font-bold uppercase text-[#737373]/50">
              Steps
            </span>
            <span className="text-xl font-medium text-[#1a1a1a]">{data.steps}</span>
          </div>
        )}
        {data.sleep && (
          <div className="rounded-2xl border border-[#e5e5e5]/50 bg-[#faf9f6]/50 p-3">
            <span className="mb-1 block text-[10px] font-bold uppercase text-[#737373]/50">
              Sleep
            </span>
            <span className="text-xl font-medium text-[#1a1a1a]">{data.sleep}</span>
          </div>
        )}
      </div>
      {data.mood && (
        <div className="flex items-center justify-between rounded-2xl border border-[#ff6b6b]/10 bg-[#ff6b6b]/5 p-3">
          <span className="text-[12px] font-medium text-[#1a1a1a]">Feeling</span>
          <span className="text-[12px] font-bold capitalize text-[#ff6b6b]">{data.mood}</span>
        </div>
      )}
      {!data.steps && !data.sleep && !data.mood && (
        <div className="rounded-2xl border border-[#ff6b6b]/10 bg-[#ff6b6b]/5 p-3">
          <span className="text-[12px] text-[#737373]">Health note saved.</span>
        </div>
      )}
    </div>
  )
}

function NoteCard({ data }: { data: RichData }) {
  return (
    <div className="w-full space-y-4 rounded-3xl border border-[#e5e5e5]/50 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="rounded-xl bg-[#faf9f6] p-2 text-[#737373]">
          <FileText size={16} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/40">
          Notes
        </span>
      </div>
      {data.person && (
        <div className="flex items-center gap-2">
          <Briefcase size={12} className="text-[#a66cff]" />
          <span className="text-[12px] font-medium text-[#a66cff]">{data.person}</span>
        </div>
      )}
      {data.body && (
        <p className="line-clamp-3 text-[13px] leading-relaxed text-[#1a1a1a]">{data.body}</p>
      )}
      {data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-[#e5e5e5]/30 pt-1">
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[#e5e5e5] bg-[#faf9f6] px-2.5 py-1 text-[10px] font-medium text-[#737373]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const MOOD_EMOJI: Record<string, string> = {
  positive: '😊',
  negative: '😔',
  neutral: '😐',
}

function JournalCard({ data }: { data: RichData }) {
  return (
    <div className="w-full space-y-4 rounded-3xl border border-[#e5e5e5]/50 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-[#faf9f6] p-2 text-[#a66cff]">
            <Sparkles size={16} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/40">
            Journal
          </span>
        </div>
        {data.mood && (
          <span className="text-xl" title={data.mood}>
            {MOOD_EMOJI[data.mood] ?? '📝'}
          </span>
        )}
      </div>

      {data.body ? (
        <div className="rounded-2xl border-l-4 border-l-[#a66cff] bg-[#faf9f6] p-4">
          <p className="text-[13px] italic leading-relaxed text-[#1a1a1a]/80">{data.body}</p>
        </div>
      ) : (
        <p className="px-1 text-[13px] italic text-[#737373]">Saved to journal.</p>
      )}

      {data.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-[#e5e5e5]/30 pt-1">
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#a66cff]/10 px-2.5 py-1 text-[10px] font-medium text-[#a66cff]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Profile Avatar ─────────────────────────────────────────────────────── */

const THUMBS_SEEDS = [
  'Felix',
  'Aneka',
  'Zephyr',
  'Kira',
  'Nova',
  'Orion',
  'Pico',
  'Sage',
  'Taro',
  'Lumi',
  'Blaze',
  'Cleo',
  'Drift',
  'Echo',
  'Frost',
]

function dicebearUrl(seed: string) {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`
}

function pickSeed(email: string): string {
  // Hash the email to a stable index across the seed list
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0
  return THUMBS_SEEDS[hash % THUMBS_SEEDS.length]
}

function ProfileAvatar() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const avatarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    // Hard redirect so middleware re-evaluates with cleared cookies
    window.location.href = '/login'
  }

  const avatarSrc = dicebearUrl(pickSeed(email ?? 'poco'))

  return (
    <div ref={avatarRef} className="absolute right-4 top-4 z-30">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-12 w-12 overflow-hidden rounded-full border border-[#e5e5e5] bg-white shadow-sm transition-all hover:scale-105 active:scale-95"
        title={email ?? 'Profile'}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarSrc} alt="avatar" className="h-full w-full object-cover" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-xl"
          >
            <div className="flex items-center gap-3 border-b border-[#e5e5e5]/60 px-4 py-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#e5e5e5] bg-[#f4f4f5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarSrc} alt="avatar" className="h-full w-full object-cover" />
              </div>
              {email && (
                <div className="min-w-0">
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#737373]/40">
                    Signed in as
                  </p>
                  <p className="truncate text-[12px] font-medium text-[#1a1a1a]">{email}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-[13px] text-[#737373] transition-colors hover:bg-[#faf9f6] hover:text-[#1a1a1a]"
            >
              <LogOut size={14} strokeWidth={2} />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const SILENCE_THRESHOLD = 0.01 // RMS below this = silence
const SILENCE_TIMEOUT_MS = 2500 // auto-stop after 2.5s of silence
const BAR_COUNT = 8

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function ZenModePage() {
  // ── All state ────────────────────────────────────────────────────────────
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [processing, setProcessing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [barHeights, setBarHeights] = useState<number[]>(Array(BAR_COUNT).fill(4))

  // ── All refs ─────────────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)

  /* ── Auth guard ─────────────────────────────────────────────────────── */
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!data.user) window.location.href = '/login'
        else setAuthed(true)
      })
  }, [])

  /* ── Auto-scroll ────────────────────────────────────────────────────── */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isListening, processing])

  /* ── Cleanup on unmount ─────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      audioCtxRef.current?.close()
    }
  }, [])

  /* ── Add poco message ───────────────────────────────────────────────── */
  const addPocoMessage = useCallback(
    (text: string, category?: string, richData?: RichData, error?: boolean) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text,
          sender: 'poco',
          category,
          richData,
          timestamp: new Date(),
          error,
        },
      ])
    },
    []
  )

  /* ── Route text to ingest or query ──────────────────────────────────── */
  const processText = useCallback(
    async (text: string) => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      setProcessing(true)
      try {
        if (isQuery(text)) {
          const result = await queryEntries({ question: text, user_timezone: timezone })
          addPocoMessage(result.answer, 'QUERY', queryToRichData(result))
        } else {
          const result = await ingestEntry({ rawText: text, timezone })
          addPocoMessage(ingestToReply(result), ingestToCategory(result), ingestToRichData(result))
        }
      } catch (err) {
        addPocoMessage(
          err instanceof Error ? err.message : 'Something went wrong.',
          undefined,
          undefined,
          true
        )
      } finally {
        setProcessing(false)
      }
    },
    [addPocoMessage]
  )

  /* ── Stop recording, transcribe, route ──────────────────────────────── */
  const stopAndProcess = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null

    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state !== 'recording') return

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      mediaRecorderRef.current = null
      chunksRef.current = []

      setIsListening(false)
      setBarHeights(Array(BAR_COUNT).fill(4))
      setProcessing(true)

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      try {
        const { transcript } = await transcribeAudio(blob)
        // Show transcribed text immediately as user bubble
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), text: transcript, sender: 'user', timestamp: new Date() },
        ])
        // Route the transcript
        if (isQuery(transcript)) {
          const result = await queryEntries({ question: transcript, user_timezone: timezone })
          addPocoMessage(result.answer, 'QUERY', queryToRichData(result))
        } else {
          const result = await ingestEntry({ rawText: transcript, timezone })
          addPocoMessage(ingestToReply(result), ingestToCategory(result), ingestToRichData(result))
        }
      } catch (err) {
        addPocoMessage(
          err instanceof Error ? err.message : 'Voice processing failed.',
          undefined,
          undefined,
          true
        )
      } finally {
        setProcessing(false)
      }
    }

    recorder.stop()
  }, [addPocoMessage])

  /* ── Start recording + silence detector ─────────────────────────────── */
  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start(100)
      setIsListening(true)

      // AudioContext for volume analysis + silence detection
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 512
      audioCtx.createMediaStreamSource(stream).connect(analyser)
      const data = new Float32Array(analyser.fftSize)

      const tick = () => {
        analyser.getFloatTimeDomainData(data)
        const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length)

        // Drive bar heights from volume (4px quiet → 24px loud)
        setBarHeights(
          Array.from({ length: BAR_COUNT }, () =>
            Math.max(4, Math.min(24, 4 + rms * 800 * (0.5 + Math.random() * 0.5)))
          )
        )

        // Silence detection
        if (rms < SILENCE_THRESHOLD) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(stopAndProcess, SILENCE_TIMEOUT_MS)
          }
        } else {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }
        }

        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      addPocoMessage('Microphone access denied.', undefined, undefined, true)
    }
  }, [stopAndProcess, addPocoMessage])

  const toggleListening = useCallback(async () => {
    if (processing) return
    if (isListening) stopAndProcess()
    else await startListening()
  }, [isListening, processing, startListening, stopAndProcess])

  /* ── Text send ──────────────────────────────────────────────────────── */
  const handleSendText = useCallback(
    async (text: string) => {
      if (!text.trim() || processing) return
      setInputText('')
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), text, sender: 'user', timestamp: new Date() },
      ])
      await processText(text)
    },
    [processing, processText]
  )

  /* ── Render ─────────────────────────────────────────────────────────── */
  if (authed === null) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100">
      <div
        className="relative flex w-full max-w-md flex-col overflow-hidden bg-[#faf9f6] font-sans shadow-2xl"
        style={{ height: '100dvh', maxHeight: '100dvh' }}
      >
        {/* Background tint while listening */}
        <div
          className={`pointer-events-none absolute inset-0 transition-colors duration-1000 ${isListening ? 'bg-[#2d2d2d]/5' : 'bg-transparent'}`}
        />

        {/* Profile avatar */}
        <ProfileAvatar />

        {/* ── Chat Area ───────────────────────────────────────────── */}
        <div
          className="no-scrollbar relative z-0 flex-1 space-y-6 overflow-y-auto scroll-smooth px-6 pb-4 pt-20"
          ref={scrollRef}
        >
          {messages.length === 0 && !isListening && (
            <div className="flex h-full flex-col items-center justify-center space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f4f5]/50">
                <Sparkles size={24} className="opacity-20" />
              </div>
              <p className="max-w-[200px] text-center text-lg font-light tracking-tight text-[#737373]/50">
                Speak naturally. <br /> I&apos;ll handle the rest.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              {msg.sender === 'poco' && (
                <span className="mb-1.5 ml-1 text-[9px] font-bold uppercase tracking-[0.15em] text-[#737373]/50">
                  Poco
                </span>
              )}

              {msg.richData ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="w-full max-w-[90%]"
                >
                  {msg.richData.type === 'expense' && <ExpenseCard data={msg.richData} />}
                  {msg.richData.type === 'summary' && <SummaryCard data={msg.richData} />}
                  {msg.richData.type === 'schedule' && <ScheduleCard data={msg.richData} />}
                  {msg.richData.type === 'travel' && <TravelCard data={msg.richData} />}
                  {msg.richData.type === 'health' && <HealthCard data={msg.richData} />}
                  {msg.richData.type === 'note' && <NoteCard data={msg.richData} />}
                  {msg.richData.type === 'journal' && <JournalCard data={msg.richData} />}
                </motion.div>
              ) : (
                <div
                  className={`max-w-[85%] px-5 py-3.5 text-[15px] font-light leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'rounded-2xl rounded-br-sm bg-[#2d2d2d] text-white'
                      : msg.error
                        ? 'rounded-2xl rounded-bl-sm border border-[#ff6b6b]/20 bg-[#ff6b6b]/10 text-[#ff6b6b]'
                        : 'rounded-2xl rounded-bl-sm border border-[#e5e5e5]/50 bg-white text-[#1a1a1a]'
                  }`}
                >
                  {msg.text}
                </div>
              )}

              {msg.category && (
                <div className="ml-1 mt-1.5 flex items-center gap-1.5">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: CATEGORY_COLORS[msg.category] || CATEGORY_COLORS.NOTE,
                    }}
                  />
                  <span
                    className="text-[9px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: CATEGORY_COLORS[msg.category] || CATEGORY_COLORS.NOTE }}
                  >
                    {msg.category}
                  </span>
                </div>
              )}
            </motion.div>
          ))}

          {/* Poco typing dots */}
          {processing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-start"
            >
              <span className="mb-1.5 ml-1 text-[9px] font-bold uppercase tracking-[0.15em] text-[#737373]/50">
                Poco
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-[#e5e5e5]/50 bg-white px-6 py-4 shadow-sm">
                {[0, 0.2, 0.4].map((delay) => (
                  <motion.div
                    key={delay}
                    className="h-1.5 w-1.5 rounded-full bg-[#1a1a1a]/30"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1, delay }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Input Area ──────────────────────────────────────────── */}
        <div className="relative z-20 border-t border-[#e5e5e5]/20 bg-[#faf9f6]/80 px-6 pb-8 pt-4 backdrop-blur-lg">
          <div className="pointer-events-none absolute left-0 right-0 top-0 h-16 -translate-y-full bg-gradient-to-t from-[#faf9f6] to-transparent" />

          <div className="flex flex-col items-center gap-5">
            {/* Live volume bars — visible while listening */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mb-2 flex flex-col items-center space-y-3"
                >
                  <div className="flex h-6 items-end gap-1">
                    {barHeights.map((h, i) => (
                      <motion.div
                        key={i}
                        className="w-1 rounded-full bg-[#2d2d2d]"
                        animate={{ height: h }}
                        transition={{ duration: 0.1, ease: 'easeOut' }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#737373]/60">
                    Listening...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mic button */}
            <div className="relative">
              <div
                className={`absolute inset-0 rounded-full bg-[#2d2d2d]/10 blur-xl transition-all duration-1000 ${isListening ? 'scale-150 opacity-100' : 'scale-75 opacity-0'}`}
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={toggleListening}
                disabled={processing}
                className={`relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-full shadow-2xl transition-all duration-500 ${
                  isListening
                    ? 'scale-110 bg-[#ef4444] text-white'
                    : processing
                      ? 'cursor-not-allowed bg-[#e5e5e5] text-[#737373]'
                      : 'bg-[#1a1a1a] text-white hover:scale-105'
                }`}
              >
                <AnimatePresence mode="wait">
                  {isListening ? (
                    <motion.div
                      key="stop"
                      initial={{ opacity: 0, rotate: -90 }}
                      animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0, rotate: 90 }}
                    >
                      <Pause size={28} fill="currentColor" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="mic"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Mic size={28} strokeWidth={1.5} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            {/* Text input */}
            <div
              className={`w-full transition-all duration-500 ${isListening ? 'pointer-events-none translate-y-10 opacity-0' : 'translate-y-0 opacity-100'}`}
            >
              <div className="relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText(inputText)}
                  placeholder="Or type here..."
                  disabled={isListening || processing}
                  className="w-full rounded-2xl border border-transparent bg-[#f4f4f5]/50 py-4 pl-5 pr-12 text-base font-light text-[#1a1a1a] shadow-inner transition-all placeholder:text-[#737373]/60 focus:border-[#e5e5e5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2d2d2d]/20"
                />
                <button
                  onClick={() => handleSendText(inputText)}
                  disabled={!inputText.trim() || processing}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#737373] transition-colors hover:text-[#2d2d2d] disabled:opacity-30"
                >
                  <Send size={18} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
