'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate, formatRelative, scoreLabel, cn } from '@/lib/utils'
import { STAGE_LABELS, STAGE_COLORS } from '@/types'
import {
  Mail, MessageCircle, Globe, Linkedin, Facebook, Phone,
  Sparkles, Send, ChevronDown, Loader2, ArrowLeft, Edit2, ExternalLink
} from 'lucide-react'
import Link from 'next/link'

type Lead = {
  id: string
  companyName: string
  contactName: string | null
  country: string
  city: string | null
  website: string | null
  email: string | null
  whatsapp: string | null
  phone: string | null
  facebookPage: string | null
  linkedinPage: string | null
  vehicleSpecialty: string[]
  estimatedSize: string | null
  stage: string
  score: number
  tags: string[]
  notes: string | null
  source: string
  lastContactedAt: Date | null
  nextFollowUpAt: Date | null
  createdAt: Date
  updatedAt: Date
  activities: Array<{ id: string; type: string; note: string | null; createdAt: Date }>
  outreachLogs: Array<{ id: string; channel: string; subject: string | null; body: string; status: string; sentAt: Date | null; createdAt: Date }>
  enquiries: Array<{ id: string; message: string; createdAt: Date; status: string }>
}

const ACTIVITY_ICONS: Record<string, string> = {
  NOTE: '📝', EMAIL_SENT: '📧', EMAIL_OPENED: '👁', EMAIL_REPLIED: '↩️',
  WHATSAPP_SENT: '💬', WHATSAPP_REPLIED: '↩️', LINKEDIN_CONNECTED: '🔗',
  CALL: '📞', MEETING: '🤝', STAGE_CHANGED: '🔄', SCORE_UPDATED: '⭐',
}

export function LeadDetail({ lead }: { lead: Lead }) {
  const router = useRouter()
  const [tab, setTab] = useState<'overview' | 'outreach' | 'activity'>('overview')
  const [aiChannel, setAiChannel] = useState<'email' | 'whatsapp' | 'linkedin'>('email')
  const [aiTone, setAiTone] = useState<'formal' | 'friendly' | 'direct'>('friendly')
  const [aiResult, setAiResult] = useState<{ subject?: string; body: string } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [stage, setStage] = useState(lead.stage)

  const { label: scoreText, color: scoreColor } = scoreLabel(lead.score)

  async function generateAI() {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, channel: aiChannel, tone: aiTone }),
      })
      const data = await res.json()
      setAiResult(data)
    } finally {
      setAiLoading(false)
    }
  }

  async function sendOutreach() {
    if (!aiResult) return
    setSendLoading(true)
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          channel: aiChannel.toUpperCase(),
          subject: aiResult.subject,
          body: aiResult.body,
        }),
      })
      const data = await res.json()

      // WhatsApp: open click-to-chat in new tab
      if (data.whatsappUrl) window.open(data.whatsappUrl, '_blank')

      setAiResult(null)
      router.refresh()
    } finally {
      setSendLoading(false)
    }
  }

  async function updateStage(newStage: string) {
    setStage(newStage)
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    })
    router.refresh()
  }

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/leads" className="btn-ghost p-1.5">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{lead.companyName}</h1>
          <p className="text-sm text-neutral-500">{[lead.city, lead.country].filter(Boolean).join(', ')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={cn('text-2xl font-bold', scoreColor)}>{lead.score}</p>
            <p className={cn('text-xs', scoreColor)}>{scoreText}</p>
          </div>
          <select
            value={stage}
            onChange={(e) => updateStage(e.target.value)}
            className={cn('badge border-0 cursor-pointer text-white text-[11px] py-1 px-3', STAGE_COLORS[stage as keyof typeof STAGE_COLORS] || 'bg-neutral-700')}
          >
            {Object.entries(STAGE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-800">
        {(['overview', 'outreach', 'activity'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors', tab === t ? 'border-orange-500 text-orange-400' : 'border-transparent text-neutral-400 hover:text-neutral-200')}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact Info */}
          <div className="card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Contact</h3>
            {lead.contactName && <p className="text-sm text-neutral-200">{lead.contactName}</p>}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                <Mail className="w-3.5 h-3.5" />{lead.email}
              </a>
            )}
            {lead.whatsapp && (
              <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-green-400 hover:text-green-300">
                <MessageCircle className="w-3.5 h-3.5" />{lead.whatsapp}
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm text-neutral-300">
                <Phone className="w-3.5 h-3.5" />{lead.phone}
              </a>
            )}
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-200">
                <Globe className="w-3.5 h-3.5" />{lead.website.replace(/^https?:\/\//, '')}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {lead.linkedinPage && (
              <a href={lead.linkedinPage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400">
                <Linkedin className="w-3.5 h-3.5" />LinkedIn
              </a>
            )}
            {lead.facebookPage && (
              <a href={lead.facebookPage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-500">
                <Facebook className="w-3.5 h-3.5" />Facebook
              </a>
            )}
          </div>

          {/* Details */}
          <div className="card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-neutral-600 text-xs">Source</p>
                <p className="text-neutral-300">{lead.source}</p>
              </div>
              <div>
                <p className="text-neutral-600 text-xs">Size</p>
                <p className="text-neutral-300">{lead.estimatedSize || '—'}</p>
              </div>
              <div>
                <p className="text-neutral-600 text-xs">Added</p>
                <p className="text-neutral-300">{formatDate(lead.createdAt)}</p>
              </div>
              <div>
                <p className="text-neutral-600 text-xs">Last Contact</p>
                <p className="text-neutral-300">{lead.lastContactedAt ? formatRelative(lead.lastContactedAt) : '—'}</p>
              </div>
            </div>
            {lead.vehicleSpecialty.length > 0 && (
              <div>
                <p className="text-neutral-600 text-xs mb-1.5">Vehicle Specialty</p>
                <div className="flex flex-wrap gap-1">
                  {lead.vehicleSpecialty.map((s) => (
                    <span key={s} className="badge bg-orange-500/15 text-orange-300 text-[10px]">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {lead.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {lead.tags.map((t) => <span key={t} className="badge bg-neutral-800 text-neutral-500 text-[10px]">#{t}</span>)}
              </div>
            )}
            {lead.notes && (
              <div>
                <p className="text-neutral-600 text-xs mb-1">Notes</p>
                <p className="text-sm text-neutral-400 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Recent Outreach */}
          {lead.outreachLogs.length > 0 && (
            <div className="card p-4 md:col-span-2">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Recent Outreach</h3>
              <div className="space-y-2">
                {lead.outreachLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 py-2 border-b border-neutral-800/60 last:border-0">
                    <span className="badge bg-neutral-800 text-neutral-400 text-[10px] mt-0.5">{log.channel}</span>
                    <div className="flex-1 min-w-0">
                      {log.subject && <p className="text-sm text-neutral-300 font-medium">{log.subject}</p>}
                      <p className="text-xs text-neutral-500 truncate">{log.body.substring(0, 120)}…</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-neutral-600">{log.sentAt ? formatRelative(log.sentAt) : 'Pending'}</p>
                      <span className={cn('badge text-[10px]', log.status === 'SENT' ? 'bg-green-900/40 text-green-400' : log.status === 'FAILED' ? 'bg-red-900/40 text-red-400' : 'bg-neutral-800 text-neutral-500')}>{log.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'outreach' && (
        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-semibold text-neutral-200">AI Outreach Writer</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Channel</label>
                <select value={aiChannel} onChange={(e) => setAiChannel(e.target.value as typeof aiChannel)} className="input">
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </div>
              <div>
                <label className="label">Tone</label>
                <select value={aiTone} onChange={(e) => setAiTone(e.target.value as typeof aiTone)} className="input">
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                  <option value="direct">Direct</option>
                </select>
              </div>
            </div>
            <button onClick={generateAI} disabled={aiLoading} className="btn-primary w-full justify-center">
              {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate with AI</>}
            </button>
          </div>

          {aiResult && (
            <div className="card p-4 space-y-3">
              {aiResult.subject && (
                <div>
                  <label className="label">Subject</label>
                  <input
                    className="input"
                    value={aiResult.subject}
                    onChange={(e) => setAiResult({ ...aiResult, subject: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="label">Message</label>
                <textarea
                  className="input min-h-[180px] resize-y"
                  value={aiResult.body}
                  onChange={(e) => setAiResult({ ...aiResult, body: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={sendOutreach} disabled={sendLoading} className="btn-primary flex-1 justify-center">
                  {sendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send {aiChannel === 'whatsapp' ? '(Opens WhatsApp)' : ''}</>}
                </button>
                <button onClick={() => setAiResult(null)} className="btn-secondary">Discard</button>
              </div>
              {!lead.email && aiChannel === 'email' && (
                <p className="text-xs text-amber-400">⚠️ No email on record — add an email address to send.</p>
              )}
              {!lead.whatsapp && aiChannel === 'whatsapp' && (
                <p className="text-xs text-amber-400">⚠️ No WhatsApp number on record.</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div className="card p-4">
          {lead.activities.length === 0 ? (
            <p className="text-sm text-neutral-600">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {lead.activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 py-2 border-b border-neutral-800/60 last:border-0">
                  <span className="text-base">{ACTIVITY_ICONS[act.type] || '•'}</span>
                  <div className="flex-1">
                    <p className="text-sm text-neutral-300">{act.note || act.type.replace(/_/g, ' ').toLowerCase()}</p>
                  </div>
                  <p className="text-xs text-neutral-600 shrink-0">{formatRelative(act.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
