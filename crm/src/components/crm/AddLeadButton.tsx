'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2 } from 'lucide-react'
import { VEHICLE_CATEGORIES, PRIORITY_MARKETS } from '@/types'

export function AddLeadButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [specialties, setSpecialties] = useState<string[]>([])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const data = {
      companyName: fd.get('companyName'),
      contactName: fd.get('contactName') || undefined,
      country: fd.get('country'),
      city: fd.get('city') || undefined,
      email: fd.get('email') || undefined,
      whatsapp: fd.get('whatsapp') || undefined,
      website: fd.get('website') || undefined,
      linkedinPage: fd.get('linkedinPage') || undefined,
      source: fd.get('source') || 'MANUAL',
      vehicleSpecialty: specialties,
      notes: fd.get('notes') || undefined,
    }

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed')
      setOpen(false)
      router.refresh()
    } catch {
      alert('Failed to add lead. Please check all required fields.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="w-4 h-4" /> Add Lead
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <h2 className="font-semibold text-neutral-100">Add New Lead</h2>
              <button onClick={() => setOpen(false)} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="label">Company Name *</label>
                  <input name="companyName" required className="input" placeholder="Dubai Prestige Motors" />
                </div>
                <div>
                  <label className="label">Contact Name</label>
                  <input name="contactName" className="input" placeholder="Ahmed Al-Rashid" />
                </div>
                <div>
                  <label className="label">Country *</label>
                  <select name="country" required className="input">
                    <option value="">Select…</option>
                    {PRIORITY_MARKETS.map((m) => (
                      <option key={m.code} value={m.name}>{m.flag} {m.name}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">City</label>
                  <input name="city" className="input" placeholder="Dubai" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input name="email" type="email" className="input" placeholder="contact@dealer.ae" />
                </div>
                <div>
                  <label className="label">WhatsApp</label>
                  <input name="whatsapp" className="input" placeholder="+971501234567" />
                </div>
                <div>
                  <label className="label">Website</label>
                  <input name="website" className="input" placeholder="https://dealer.ae" />
                </div>
                <div>
                  <label className="label">LinkedIn Page</label>
                  <input name="linkedinPage" className="input" placeholder="linkedin.com/company/..." />
                </div>
                <div>
                  <label className="label">Source</label>
                  <select name="source" className="input">
                    <option value="MANUAL">Manual</option>
                    <option value="GOOGLE_MAPS">Google Maps</option>
                    <option value="LINKEDIN">LinkedIn</option>
                    <option value="FACEBOOK">Facebook</option>
                    <option value="DIRECTORY">Directory</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="TRADE_SHOW">Trade Show</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Vehicle Specialty</label>
                <div className="flex flex-wrap gap-1.5">
                  {VEHICLE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSpecialties((s) => s.includes(cat) ? s.filter((x) => x !== cat) : [...s, cat])}
                      className={`badge text-xs cursor-pointer transition-colors ${specialties.includes(cat) ? 'bg-orange-500 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea name="notes" className="input min-h-[70px] resize-none" placeholder="Any relevant context about this dealer…" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Lead'}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
