'use client'

import Link from 'next/link'
import { formatRelative, scoreLabel, cn } from '@/lib/utils'
import { STAGE_LABELS, STAGE_COLORS } from '@/types'
import { Mail, MessageCircle, ExternalLink, Activity } from 'lucide-react'

interface Lead {
  id: string
  companyName: string
  contactName: string | null
  country: string
  city: string | null
  email: string | null
  whatsapp: string | null
  vehicleSpecialty: string[]
  stage: string
  score: number
  lastContactedAt: Date | null
  updatedAt: Date
  _count: { activities: number; outreachLogs: number }
}

interface Props {
  leads: Lead[]
  total: number
  page: number
  limit: number
}

export function LeadsTable({ leads, total, page, limit }: Props) {
  if (leads.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-neutral-500">No leads found. Add your first dealer lead to get started.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800">
              <th className="text-left px-4 py-3 text-xs text-neutral-500 uppercase tracking-wider font-medium">Company</th>
              <th className="text-left px-4 py-3 text-xs text-neutral-500 uppercase tracking-wider font-medium">Country</th>
              <th className="text-left px-4 py-3 text-xs text-neutral-500 uppercase tracking-wider font-medium hidden md:table-cell">Specialty</th>
              <th className="text-left px-4 py-3 text-xs text-neutral-500 uppercase tracking-wider font-medium">Stage</th>
              <th className="text-left px-4 py-3 text-xs text-neutral-500 uppercase tracking-wider font-medium">Score</th>
              <th className="text-left px-4 py-3 text-xs text-neutral-500 uppercase tracking-wider font-medium hidden lg:table-cell">Last Contact</th>
              <th className="text-left px-4 py-3 text-xs text-neutral-500 uppercase tracking-wider font-medium">Channels</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {leads.map((lead) => {
              const { label: scoreText, color: scoreColor } = scoreLabel(lead.score)
              return (
                <tr key={lead.id} className="hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-100">{lead.companyName}</p>
                    {lead.contactName && <p className="text-xs text-neutral-500">{lead.contactName}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-neutral-300">{lead.country}</p>
                    {lead.city && <p className="text-xs text-neutral-600">{lead.city}</p>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {lead.vehicleSpecialty.slice(0, 2).map((s) => (
                        <span key={s} className="badge bg-neutral-800 text-neutral-400 text-[10px]">{s}</span>
                      ))}
                      {lead.vehicleSpecialty.length > 2 && (
                        <span className="badge bg-neutral-800 text-neutral-600 text-[10px]">+{lead.vehicleSpecialty.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('badge text-white text-[10px]', STAGE_COLORS[lead.stage as keyof typeof STAGE_COLORS] || 'bg-neutral-700')}>
                      {STAGE_LABELS[lead.stage as keyof typeof STAGE_LABELS] || lead.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-sm font-bold', scoreColor)}>{lead.score}</span>
                      <span className={cn('text-[10px]', scoreColor)}>{scoreText}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-xs text-neutral-500">
                      {lead.lastContactedAt ? formatRelative(lead.lastContactedAt) : '—'}
                    </p>
                    {lead._count.outreachLogs > 0 && (
                      <p className="text-[10px] text-neutral-600">{lead._count.outreachLogs} sent</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {lead.email && <Mail className="w-3.5 h-3.5 text-blue-400" title="Email available" />}
                      {lead.whatsapp && <MessageCircle className="w-3.5 h-3.5 text-green-400" title="WhatsApp available" />}
                      {lead._count.activities > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-neutral-600">
                          <Activity className="w-3 h-3" />{lead._count.activities}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="btn-ghost py-1 text-xs">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
          <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`?page=${page - 1}`} className="btn-secondary py-1 px-2 text-xs">Previous</Link>
            )}
            {page * limit < total && (
              <Link href={`?page=${page + 1}`} className="btn-secondary py-1 px-2 text-xs">Next</Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
