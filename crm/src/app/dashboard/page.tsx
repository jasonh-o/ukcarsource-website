import { db } from '@/lib/db'
import { STAGE_LABELS } from '@/types'
import { formatRelative } from '@/lib/utils'
import { Users, Send, TrendingUp, Globe, Flame, Clock } from 'lucide-react'

async function getStats() {
  const [
    totalLeads,
    activeLeads,
    contactedThisWeek,
    repliedLeads,
    recentLeads,
    stageBreakdown,
    topCountries,
    hotLeads,
  ] = await Promise.all([
    db.lead.count({ where: { optedOut: false } }),
    db.lead.count({ where: { optedOut: false, stage: { notIn: ['INACTIVE'] } } }),
    db.lead.count({
      where: {
        optedOut: false,
        lastContactedAt: { gte: new Date(Date.now() - 7 * 86400000) },
      },
    }),
    db.lead.count({ where: { optedOut: false, stage: { in: ['REPLIED', 'QUALIFIED', 'NEGOTIATING', 'ACTIVE_BUYER', 'REPEAT_BUYER'] } } }),
    db.lead.findMany({
      where: { optedOut: false },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, companyName: true, country: true, stage: true, score: true, createdAt: true },
    }),
    db.lead.groupBy({
      by: ['stage'],
      where: { optedOut: false },
      _count: true,
    }),
    db.lead.groupBy({
      by: ['country'],
      where: { optedOut: false },
      _count: true,
      orderBy: { _count: { country: 'desc' } },
      take: 8,
    }),
    db.lead.findMany({
      where: { optedOut: false, score: { gte: 70 } },
      orderBy: { score: 'desc' },
      take: 5,
      select: { id: true, companyName: true, country: true, score: true, stage: true },
    }),
  ])

  return { totalLeads, activeLeads, contactedThisWeek, repliedLeads, recentLeads, stageBreakdown, topCountries, hotLeads }
}

export default async function DashboardPage() {
  const stats = await getStats()

  const statCards = [
    { label: 'Total Leads', value: stats.totalLeads, icon: Users, color: 'text-blue-400' },
    { label: 'Active Pipeline', value: stats.activeLeads, icon: TrendingUp, color: 'text-green-400' },
    { label: 'Contacted (7d)', value: stats.contactedThisWeek, icon: Send, color: 'text-orange-400' },
    { label: 'Engaged / Replied', value: stats.repliedLeads, icon: Flame, color: 'text-red-400' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-0.5">B2B dealer pipeline overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-neutral-500 uppercase tracking-wider">{label}</p>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline Stages */}
        <div className="card p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-neutral-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-400" /> Pipeline Stages
          </h2>
          <div className="space-y-2">
            {stats.stageBreakdown.map(({ stage, _count }) => {
              const label = STAGE_LABELS[stage as keyof typeof STAGE_LABELS] || stage
              const pct = stats.activeLeads > 0 ? Math.round((_count / stats.totalLeads) * 100) : 0
              return (
                <div key={stage} className="flex items-center gap-3">
                  <p className="text-xs text-neutral-400 w-32 shrink-0">{label}</p>
                  <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-neutral-500 w-8 text-right">{_count}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Hot Leads */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-neutral-300 mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400" /> Hot Leads
          </h2>
          {stats.hotLeads.length === 0 ? (
            <p className="text-xs text-neutral-600">No scored leads yet</p>
          ) : (
            <div className="space-y-2">
              {stats.hotLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between py-1.5 border-b border-neutral-800 last:border-0">
                  <div>
                    <p className="text-sm text-neutral-200 font-medium truncate max-w-[130px]">{lead.companyName}</p>
                    <p className="text-xs text-neutral-500">{lead.country}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-400">{lead.score}</p>
                    <p className="text-[10px] text-neutral-600">{STAGE_LABELS[lead.stage as keyof typeof STAGE_LABELS]}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Countries */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-neutral-300 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" /> Leads by Country
          </h2>
          <div className="space-y-1.5">
            {stats.topCountries.map(({ country, _count }) => (
              <div key={country} className="flex items-center justify-between">
                <p className="text-sm text-neutral-300">{country}</p>
                <span className="badge bg-neutral-800 text-neutral-400">{_count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-neutral-300 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-400" /> Recent Leads
          </h2>
          <div className="space-y-2">
            {stats.recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between py-1 border-b border-neutral-800/60 last:border-0">
                <div>
                  <p className="text-sm text-neutral-200 truncate max-w-[160px]">{lead.companyName}</p>
                  <p className="text-xs text-neutral-500">{lead.country}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-neutral-500">{formatRelative(lead.createdAt)}</p>
                  <p className="text-[10px] text-orange-400/70">{STAGE_LABELS[lead.stage as keyof typeof STAGE_LABELS]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
