import { db, parseLead } from '@/lib/db'
import { Sidebar } from '@/components/layout/Sidebar'
import { STAGE_LABELS } from '@/types'
import { formatRelative, cn } from '@/lib/utils'
import Link from 'next/link'
import { Mail, MessageCircle, Clock, AlertCircle, CheckCircle, Send, Zap } from 'lucide-react'

export default async function OutreachPage() {
  // Leads that need first contact (New or Enriched with email or whatsapp)
  const rawNeedContact = await db.lead.findMany({
    where: { optedOut: false, stage: { in: ['NEW', 'ENRICHED'] } },
    orderBy: { score: 'desc' },
    take: 20,
  })
  const needContact = rawNeedContact.map(parseLead)

  // Leads that need follow-up (Contacted 5+ days ago, no reply)
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000)
  const rawNeedFollowUp = await db.lead.findMany({
    where: {
      optedOut: false,
      stage: 'CONTACTED',
      lastContactedAt: { lte: fiveDaysAgo },
    },
    orderBy: { lastContactedAt: 'asc' },
    take: 20,
  })
  const needFollowUp = rawNeedFollowUp.map(parseLead)

  // Recent outreach logs
  const recentLogs = await db.outreachLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: { lead: { select: { companyName: true, country: true } } },
  })

  // Stats
  const [totalSent, totalReplied, totalPending] = await Promise.all([
    db.outreachLog.count({ where: { status: 'SENT' } }),
    db.lead.count({ where: { stage: { in: ['REPLIED', 'QUALIFIED', 'NEGOTIATING', 'ACTIVE_BUYER'] } } }),
    db.lead.count({ where: { stage: { in: ['NEW', 'ENRICHED'] }, optedOut: false } }),
  ])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Outreach</h1>
            <p className="text-sm text-neutral-500">Who to contact today</p>
          </div>
          <Link href="/outreach/bulk" className="btn-primary gap-2">
            <Zap className="w-4 h-4" /> Bulk Send
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <Send className="w-8 h-8 text-orange-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-white">{totalSent}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Emails Sent</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-white">{totalReplied}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Replied / Active</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-yellow-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-white">{totalPending}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Not Yet Contacted</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Need first contact */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
              <Mail className="w-4 h-4 text-orange-400" />
              Contact Today — Not Yet Reached
              <span className="badge bg-orange-500/20 text-orange-400 ml-1">{needContact.length}</span>
            </h2>
            <div className="space-y-2">
              {needContact.length === 0 && (
                <div className="card p-4">
                  <p className="text-sm text-neutral-600">All leads have been contacted 🎉</p>
                </div>
              )}
              {needContact.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`}
                  className="card p-3 flex items-center justify-between hover:border-orange-500/40 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-200 truncate">{lead.companyName}</p>
                    <p className="text-xs text-neutral-500">{lead.country}</p>
                    {(lead.vehicleSpecialty as string[]).length > 0 && (
                      <p className="text-[10px] text-orange-400/70 mt-0.5">
                        {(lead.vehicleSpecialty as string[]).slice(0, 2).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {lead.email && <Mail className="w-3.5 h-3.5 text-blue-400" />}
                    {lead.whatsapp && <MessageCircle className="w-3.5 h-3.5 text-green-400" />}
                    <span className="text-lg font-bold text-orange-400">{lead.score}</span>
                    <span className="text-xs text-neutral-600 group-hover:text-orange-400 transition-colors">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Need follow-up */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              Follow-Up Overdue
              <span className="badge bg-yellow-500/20 text-yellow-400 ml-1">{needFollowUp.length}</span>
            </h2>
            <div className="space-y-2">
              {needFollowUp.length === 0 && (
                <div className="card p-4">
                  <p className="text-sm text-neutral-600">No overdue follow-ups</p>
                </div>
              )}
              {needFollowUp.map((lead) => {
                const daysSince = lead.lastContactedAt
                  ? Math.floor((Date.now() - new Date(lead.lastContactedAt).getTime()) / 86400000)
                  : null
                return (
                  <Link key={lead.id} href={`/leads/${lead.id}`}
                    className="card p-3 flex items-center justify-between hover:border-yellow-500/30 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-200 truncate">{lead.companyName}</p>
                      <p className="text-xs text-neutral-500">{lead.country}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      {lead.email && <Mail className="w-3.5 h-3.5 text-blue-400" />}
                      {lead.whatsapp && <MessageCircle className="w-3.5 h-3.5 text-green-400" />}
                      {daysSince && (
                        <span className="text-xs text-yellow-400 font-medium">{daysSince}d ago</span>
                      )}
                      <span className="text-xs text-neutral-600 group-hover:text-yellow-400 transition-colors">→</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="text-sm font-semibold text-neutral-300 mb-3 flex items-center gap-2">
            <Send className="w-4 h-4 text-neutral-500" /> Recent Outreach
          </h2>
          <div className="card overflow-hidden">
            {recentLogs.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-neutral-600">No outreach sent yet — open a lead and hit Generate with AI to start</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left px-4 py-2.5 text-xs text-neutral-500 uppercase tracking-wider">Lead</th>
                    <th className="text-left px-4 py-2.5 text-xs text-neutral-500 uppercase tracking-wider">Channel</th>
                    <th className="text-left px-4 py-2.5 text-xs text-neutral-500 uppercase tracking-wider hidden md:table-cell">Subject</th>
                    <th className="text-left px-4 py-2.5 text-xs text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs text-neutral-500 uppercase tracking-wider">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-800/20">
                      <td className="px-4 py-2.5">
                        <p className="text-neutral-200 font-medium truncate max-w-[140px]">{log.lead?.companyName}</p>
                        <p className="text-xs text-neutral-600">{log.lead?.country}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('badge text-[10px]',
                          log.channel === 'EMAIL' ? 'bg-blue-900/40 text-blue-400' :
                          log.channel === 'WHATSAPP' ? 'bg-green-900/40 text-green-400' :
                          'bg-neutral-800 text-neutral-400'
                        )}>
                          {log.channel}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <p className="text-xs text-neutral-400 truncate max-w-[200px]">{log.subject || log.body.substring(0, 50) + '…'}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('badge text-[10px]',
                          log.status === 'SENT' ? 'bg-green-900/40 text-green-400' :
                          log.status === 'FAILED' ? 'bg-red-900/40 text-red-400' :
                          log.status === 'REPLIED' ? 'bg-purple-900/40 text-purple-400' :
                          'bg-neutral-800 text-neutral-500'
                        )}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-xs text-neutral-500">{formatRelative(log.createdAt)}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
