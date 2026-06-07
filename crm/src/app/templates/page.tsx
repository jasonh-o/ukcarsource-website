import { db } from '@/lib/db'
import { Sidebar } from '@/components/layout/Sidebar'
import { formatDate } from '@/lib/utils'
import { FileText, Mail, MessageCircle, Linkedin } from 'lucide-react'

const CHANNEL_ICONS = { EMAIL: Mail, WHATSAPP: MessageCircle, LINKEDIN: Linkedin, FACEBOOK: MessageCircle, SMS: Mail }

export default async function TemplatesPage() {
  const templates = await db.template.findMany({
    where: { isActive: true },
    orderBy: { useCount: 'desc' },
  })

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Templates</h1>
            <p className="text-sm text-neutral-500">Outreach message templates</p>
          </div>
        </div>

        {templates.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">No templates yet. Templates are auto-populated when you use the AI outreach tool.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t) => {
              const Icon = CHANNEL_ICONS[t.channel as keyof typeof CHANNEL_ICONS] || Mail
              return (
                <div key={t.id} className="card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-orange-400 shrink-0" />
                      <p className="text-sm font-semibold text-neutral-200">{t.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge bg-neutral-800 text-neutral-500 text-[10px]">{t.channel}</span>
                      <span className="text-[10px] text-neutral-600">{t.useCount} uses</span>
                    </div>
                  </div>
                  {t.subject && <p className="text-xs text-neutral-400 font-medium">Subject: {t.subject}</p>}
                  <p className="text-xs text-neutral-500 line-clamp-3">{t.body}</p>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-wrap gap-1">
                      {t.tags.map((tag) => <span key={tag} className="badge bg-orange-500/10 text-orange-400 text-[10px]">{tag}</span>)}
                    </div>
                    <p className="text-[10px] text-neutral-700">{formatDate(t.createdAt)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
