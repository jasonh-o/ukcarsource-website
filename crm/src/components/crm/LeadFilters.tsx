'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { STAGE_LABELS } from '@/types'
import { Search, X } from 'lucide-react'

const STAGES = Object.entries(STAGE_LABELS)

export function LeadFilters({ countries }: { countries: string[] }) {
  const router = useRouter()
  const params = useSearchParams()

  function update(key: string, value: string) {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    p.delete('page')
    router.push(`?${p.toString()}`)
  }

  function clear() {
    router.push('/leads')
  }

  const hasFilters = params.has('stage') || params.has('country') || params.has('search')

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
        <input
          className="input pl-8 w-52 py-1.5"
          placeholder="Search leads…"
          defaultValue={params.get('search') || ''}
          onChange={(e) => update('search', e.target.value)}
        />
      </div>

      <select
        className="input w-40 py-1.5"
        value={params.get('stage') || ''}
        onChange={(e) => update('stage', e.target.value)}
      >
        <option value="">All Stages</option>
        {STAGES.map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <select
        className="input w-40 py-1.5"
        value={params.get('country') || ''}
        onChange={(e) => update('country', e.target.value)}
      >
        <option value="">All Countries</option>
        {countries.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {hasFilters && (
        <button onClick={clear} className="btn-ghost py-1.5 text-xs gap-1">
          <X className="w-3.5 h-3.5" /> Clear
        </button>
      )}
    </div>
  )
}
