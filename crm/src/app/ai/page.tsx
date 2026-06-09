'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Sparkles, Loader2, Copy, CheckCheck } from 'lucide-react'
import { PRIORITY_MARKETS, VEHICLE_CATEGORIES } from '@/types'

export default function AIToolsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [copied, setCopied] = useState(false)

  // Standalone AI writer — no lead needed
  const [company, setCompany] = useState('')
  const [country, setCountry] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [channel, setChannel] = useState('email')
  const [tone, setTone] = useState('friendly')

  async function generate() {
    if (!company || !country) return
    setLoading(true)
    setResult('')
    try {
      const res = await fetch('/api/ai/freeform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, country, specialty, channel, tone }),
      })
      const data = await res.json()
      setResult(data.body || data.message || JSON.stringify(data))
    } catch (e) {
      setResult('Error generating message. Check your Anthropic API key in .env')
    } finally {
      setLoading(false)
    }
  }

  function copy() {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-400" /> AI Tools
          </h1>
          <p className="text-sm text-neutral-500">Generate outreach messages without needing a saved lead</p>
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-200">Quick Message Writer</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Dealer / Company Name</label>
              <input className="input" placeholder="e.g. Gulf Elite Motors" value={company} onChange={e => setCompany(e.target.value)} />
            </div>
            <div>
              <label className="label">Country</label>
              <select className="input" value={country} onChange={e => setCountry(e.target.value)}>
                <option value="">Select country…</option>
                {PRIORITY_MARKETS.map(m => (
                  <option key={m.code} value={m.name}>{m.flag} {m.name}</option>
                ))}
                <option value="Nigeria">🇳🇬 Nigeria</option>
                <option value="Ghana">🇬🇭 Ghana</option>
                <option value="Tanzania">🇹🇿 Tanzania</option>
                <option value="Indonesia">🇮🇩 Indonesia</option>
                <option value="Sri Lanka">🇱🇰 Sri Lanka</option>
                <option value="Oman">🇴🇲 Oman</option>
                <option value="Qatar">🇶🇦 Qatar</option>
                <option value="Bahrain">🇧🇭 Bahrain</option>
                <option value="Kazakhstan">🇰🇿 Kazakhstan</option>
                <option value="Armenia">🇦🇲 Armenia</option>
              </select>
            </div>
            <div>
              <label className="label">Vehicle Specialty</label>
              <select className="input" value={specialty} onChange={e => setSpecialty(e.target.value)}>
                <option value="">General dealer</option>
                {VEHICLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Channel</label>
              <select className="input" value={channel} onChange={e => setChannel(e.target.value)}>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>
            <div>
              <label className="label">Tone</label>
              <select className="input" value={tone} onChange={e => setTone(e.target.value)}>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
                <option value="direct">Direct</option>
              </select>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !company || !country}
            className="btn-primary w-full justify-center"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate Message</>}
          </button>
        </div>

        {result && (
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-200">Generated Message</p>
              <button onClick={copy} className="btn-ghost py-1 text-xs">
                {copied ? <><CheckCheck className="w-3.5 h-3.5 text-green-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>
            <textarea
              className="input min-h-[200px] resize-y text-sm"
              value={result}
              onChange={e => setResult(e.target.value)}
            />
            <p className="text-xs text-neutral-600">Edit as needed, then copy and send manually or go to the lead's Outreach tab to send directly.</p>
          </div>
        )}
      </div>
    </div>
  )
}
