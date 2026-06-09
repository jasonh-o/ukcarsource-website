'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Send, Loader2, CheckCircle, XCircle, Eye, MessageCircle, Mail, AlertTriangle } from 'lucide-react'

type Result = {
  id: string
  company: string
  email?: string
  whatsapp?: string
  status: string
  subject?: string
  message?: string
  waUrl?: string
}

export default function BulkOutreachPage() {
  const [mode, setMode] = useState<'email' | 'whatsapp'>('email')
  const [limit, setLimit] = useState(10)
  const [country, setCountry] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [stats, setStats] = useState<{ sent: number; failed: number; dryRun?: boolean } | null>(null)
  const [previewed, setPreviewed] = useState(false)

  async function runPreview() {
    setLoading(true)
    setResults([])
    setStats(null)
    try {
      const res = await fetch('/api/outreach/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit, country: country || undefined, dryRun: true }),
      })
      const data = await res.json()
      setResults(data.results || [])
      setStats({ sent: 0, failed: 0, dryRun: true })
      setPreviewed(true)
    } finally {
      setLoading(false)
    }
  }

  async function runSend() {
    if (!confirm(`Send ${mode === 'email' ? 'emails' : 'WhatsApp list'} to up to ${limit} leads? This cannot be undone.`)) return
    setLoading(true)
    setResults([])
    setStats(null)
    setPreviewed(false)
    try {
      const endpoint = mode === 'email' ? '/api/outreach/bulk' : '/api/outreach/whatsapp-blast'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit, country: country || undefined, dryRun: false }),
      })
      const data = await res.json()
      setResults(data.results || [])
      setStats({ sent: data.sent || data.count || 0, failed: data.failed || 0 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-xl font-bold text-white">Bulk Outreach</h1>
          <p className="text-sm text-neutral-500">AI writes a personalised message for each dealer based on what they buy</p>
        </div>

        {/* Warning */}
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-300 space-y-1">
            <p className="font-semibold">Before sending — check your Resend domain is verified</p>
            <p className="text-amber-400/80">Max 20 emails per run. Each email is AI-personalised to match what that specific dealer buys. Always Preview first.</p>
          </div>
        </div>

        {/* Controls */}
        <div className="card p-5 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setMode('email')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'email' ? 'bg-orange-500 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
            >
              <Mail className="w-4 h-4" /> Email
            </button>
            <button
              onClick={() => setMode('whatsapp')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'whatsapp' ? 'bg-green-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp List
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">How many leads</label>
              <select className="input" value={limit} onChange={e => setLimit(Number(e.target.value))}>
                <option value={5}>5 leads</option>
                <option value={10}>10 leads</option>
                <option value={15}>15 leads</option>
                <option value={20}>20 leads (max)</option>
              </select>
            </div>
            <div>
              <label className="label">Filter by country (optional)</label>
              <input className="input" placeholder="e.g. UAE" value={country} onChange={e => setCountry(e.target.value)} />
            </div>
          </div>

          <p className="text-xs text-neutral-500">
            {mode === 'email'
              ? 'Sends to leads with email addresses in NEW or ENRICHED stage, highest score first. Each email is AI-written to match their vehicle specialty.'
              : 'Generates personalised WhatsApp messages with click-to-open links. Opens each chat in WhatsApp Web — you press send.'}
          </p>

          <div className="flex gap-3">
            {mode === 'email' && (
              <button onClick={runPreview} disabled={loading} className="btn-secondary gap-2">
                {loading && previewed === false ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Preview First
              </button>
            )}
            <button onClick={runSend} disabled={loading} className={`gap-2 ${mode === 'email' ? 'btn-primary' : 'inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-md transition-colors'}`}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {mode === 'email' ? 'Send Emails' : 'Generate WhatsApp Links'}
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className={`rounded-lg p-4 flex items-center gap-4 ${stats.dryRun ? 'bg-blue-900/20 border border-blue-700/40' : 'bg-green-900/20 border border-green-700/40'}`}>
            {stats.dryRun ? (
              <p className="text-sm text-blue-300">👁 <strong>Preview only</strong> — no emails sent. Review messages below then click Send Emails.</p>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 text-green-400" />
                <p className="text-sm text-green-300"><strong>{stats.sent}</strong> sent successfully{stats.failed > 0 ? `, ${stats.failed} failed` : ''}</p>
              </>
            )}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-300">{stats?.dryRun ? 'Preview — Messages to be sent' : 'Send Results'}</h2>
            {results.map((r, i) => (
              <div key={r.id || i} className="card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-200">{r.company}</p>
                    <p className="text-xs text-neutral-500">{r.email || r.whatsapp}</p>
                    {r.subject && <p className="text-xs text-orange-400 mt-0.5">Subject: {r.subject}</p>}
                  </div>
                  <span className={`badge text-[10px] shrink-0 ${r.status === 'SENT' || r.status === 'DRY_RUN' ? 'bg-green-900/40 text-green-400' : r.status.startsWith('FAILED') ? 'bg-red-900/40 text-red-400' : 'bg-neutral-800 text-neutral-400'}`}>
                    {r.status === 'DRY_RUN' ? 'PREVIEW' : r.status}
                  </span>
                </div>
                {(r.message || stats?.dryRun) && r.status === 'DRY_RUN' && (
                  <details className="cursor-pointer">
                    <summary className="text-xs text-neutral-500 hover:text-neutral-300">View message</summary>
                    <p className="text-xs text-neutral-400 mt-2 whitespace-pre-wrap bg-neutral-800/50 rounded p-2">{r.message}</p>
                  </details>
                )}
                {r.waUrl && (
                  <a href={r.waUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-green-400 hover:text-green-300 bg-green-900/20 px-3 py-1.5 rounded-md">
                    <MessageCircle className="w-3.5 h-3.5" /> Open in WhatsApp Web
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
