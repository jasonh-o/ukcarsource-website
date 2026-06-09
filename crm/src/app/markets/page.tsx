import { db, parseJsonArray } from '@/lib/db'
import { Sidebar } from '@/components/layout/Sidebar'
import { PRIORITY_MARKETS } from '@/types'
import { Globe, TrendingUp, Users } from 'lucide-react'

export default async function MarketsPage() {
  const leads = await db.lead.findMany({
    where: { optedOut: false },
    select: { country: true, stage: true, score: true },
  })

  const byCountry: Record<string, { total: number; avgScore: number; active: number }> = {}
  for (const lead of leads) {
    if (!byCountry[lead.country]) byCountry[lead.country] = { total: 0, avgScore: 0, active: 0 }
    byCountry[lead.country].total++
    byCountry[lead.country].avgScore += lead.score
    if (!['NEW', 'INACTIVE'].includes(lead.stage)) byCountry[lead.country].active++
  }
  for (const c of Object.keys(byCountry)) {
    byCountry[c].avgScore = Math.round(byCountry[c].avgScore / byCountry[c].total)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">Markets</h1>
          <p className="text-sm text-neutral-500">Priority export markets and dealer intelligence</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRIORITY_MARKETS.map((market) => {
            const stats = byCountry[market.name]
            return (
              <div key={market.code} className="card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{market.flag}</span>
                    <div>
                      <p className="font-semibold text-neutral-100">{market.name}</p>
                      <p className="text-xs text-neutral-500">{market.region}</p>
                    </div>
                  </div>
                  {stats && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-400">{stats.total}</p>
                      <p className="text-[10px] text-neutral-600">leads</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  {market.specialty.map((s) => (
                    <span key={s} className="badge bg-orange-500/10 text-orange-300 text-[10px]">{s}</span>
                  ))}
                </div>

                {stats ? (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-800">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-neutral-500" />
                      <span className="text-xs text-neutral-400">Avg score: <span className="text-orange-400 font-medium">{stats.avgScore}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-neutral-500" />
                      <span className="text-xs text-neutral-400">Active: <span className="text-green-400 font-medium">{stats.active}</span></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-700 pt-1 border-t border-neutral-800">No leads yet — add some</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Markets not in priority list but with leads */}
        {Object.entries(byCountry)
          .filter(([country]) => !PRIORITY_MARKETS.find(m => m.name === country))
          .length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-neutral-400 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Other Markets
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(byCountry)
                .filter(([country]) => !PRIORITY_MARKETS.find(m => m.name === country))
                .map(([country, stats]) => (
                  <div key={country} className="card p-3 text-center">
                    <p className="text-sm font-medium text-neutral-200">{country}</p>
                    <p className="text-xs text-neutral-500">{stats.total} leads</p>
                    <p className="text-xs text-orange-400">{stats.avgScore} avg</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
