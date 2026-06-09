import { Sidebar } from '@/components/layout/Sidebar'
import { Settings, Key, Mail, MessageCircle, Globe } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-6 space-y-6 max-w-3xl">
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-sm text-neutral-500">API keys and configuration</p>
        </div>

        {/* API Keys */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <Key className="w-4 h-4 text-orange-400" /> API Keys
          </h2>
          <p className="text-xs text-neutral-500">These are set in your <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-orange-300">crm/.env</code> file. Edit that file to update them.</p>

          <div className="space-y-3">
            {[
              { label: 'Anthropic API Key', key: 'ANTHROPIC_API_KEY', desc: 'Powers AI outreach generation and lead scoring', status: 'configured' },
              { label: 'Resend API Key', key: 'RESEND_API_KEY', desc: 'Sends emails from deals@ukcarsource.com', status: 'configured' },
              { label: 'WhatsApp Business API', key: 'WHATSAPP_ACCESS_TOKEN', desc: 'For approved WhatsApp Business templates', status: 'optional' },
            ].map(({ label, key, desc, status }) => (
              <div key={key} className="flex items-start justify-between gap-4 py-3 border-b border-neutral-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-neutral-200">{label}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>
                  <p className="text-xs text-neutral-700 mt-1 font-mono">{key}</p>
                </div>
                <span className={`badge shrink-0 mt-0.5 ${status === 'configured' ? 'bg-green-900/40 text-green-400' : 'bg-neutral-800 text-neutral-500'}`}>
                  {status}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-neutral-800/50 rounded-md p-3 text-xs text-neutral-400">
            <p className="font-medium text-neutral-300 mb-1">To update a key:</p>
            <p>Open <code className="text-orange-300">crm/.env</code> in any text editor → change the value → save → restart the CRM server</p>
          </div>
        </div>

        {/* Email Config */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <Mail className="w-4 h-4 text-orange-400" /> Email Configuration
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">From email</span>
              <span className="text-neutral-200 font-mono text-xs">deals@ukcarsource.com</span>
            </div>
            <div className="flex justify-between py-2 border-b border-neutral-800">
              <span className="text-neutral-400">From name</span>
              <span className="text-neutral-200">UK Car Source</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-neutral-400">Provider</span>
              <span className="text-neutral-200">Resend</span>
            </div>
          </div>
          <div className="bg-amber-900/20 border border-amber-800/40 rounded-md p-3 text-xs text-amber-300">
            ⚠️ To send real emails you must verify <strong>ukcarsource.com</strong> in your Resend dashboard → Domains → Add Domain → add the DNS records given.
          </div>
        </div>

        {/* WhatsApp */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-400" /> WhatsApp
          </h2>
          <p className="text-sm text-neutral-400">WhatsApp click-to-chat links work immediately — no API key needed. The Send button opens WhatsApp Web with your message pre-typed. You press send.</p>
          <p className="text-xs text-neutral-600">For fully automated WhatsApp Business API messaging, a Meta Business account and approved templates are required.</p>
        </div>

        {/* About */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-neutral-600">
            <span>UK Car Source CRM v1.0</span>
            <a href="https://ukcarsource.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-neutral-400 transition-colors">
              <Globe className="w-3 h-3" /> ukcarsource.com
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
