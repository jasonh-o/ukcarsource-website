export type LeadStage =
  | 'NEW'
  | 'ENRICHED'
  | 'CONTACTED'
  | 'REPLIED'
  | 'QUALIFIED'
  | 'NEGOTIATING'
  | 'ACTIVE_BUYER'
  | 'REPEAT_BUYER'
  | 'INACTIVE'

export type Channel = 'EMAIL' | 'WHATSAPP' | 'LINKEDIN' | 'FACEBOOK' | 'SMS'

export type LeadSource =
  | 'MANUAL'
  | 'GOOGLE_MAPS'
  | 'LINKEDIN'
  | 'FACEBOOK'
  | 'DIRECTORY'
  | 'REFERRAL'
  | 'WEBSITE'
  | 'TRADE_SHOW'

export const STAGE_LABELS: Record<LeadStage, string> = {
  NEW: 'New Lead',
  ENRICHED: 'Enriched',
  CONTACTED: 'Contacted',
  REPLIED: 'Replied',
  QUALIFIED: 'Qualified',
  NEGOTIATING: 'Negotiating',
  ACTIVE_BUYER: 'Active Buyer',
  REPEAT_BUYER: 'Repeat Buyer',
  INACTIVE: 'Inactive',
}

export const STAGE_COLORS: Record<LeadStage, string> = {
  NEW: 'bg-slate-600',
  ENRICHED: 'bg-blue-600',
  CONTACTED: 'bg-yellow-600',
  REPLIED: 'bg-orange-500',
  QUALIFIED: 'bg-purple-600',
  NEGOTIATING: 'bg-pink-600',
  ACTIVE_BUYER: 'bg-green-600',
  REPEAT_BUYER: 'bg-emerald-500',
  INACTIVE: 'bg-gray-600',
}

export const PRIORITY_MARKETS = [
  { code: 'AE', name: 'UAE', flag: '🇦🇪', region: 'Middle East', specialty: ['Rolls-Royce', 'Prestige SUV', 'LHD'] },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'SE Asia', specialty: ['Prestige RHD', 'Performance', 'Classic'] },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', region: 'SE Asia', specialty: ['Prestige RHD', 'Luxury'] },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', region: 'Pacific', specialty: ['RHD Performance', 'Prestige'] },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'Pacific', specialty: ['RHD Performance', 'Prestige'] },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', region: 'SE Asia', specialty: ['Rolls-Royce', 'Prestige RHD'] },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', region: 'Europe', specialty: ['LHD Luxury', 'EU-reg'] },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', region: 'Europe', specialty: ['RHD', 'Prestige'] },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', region: 'Africa', specialty: ['Prestige SUV', 'Commercial'] },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', region: 'Africa', specialty: ['Prestige SUV', 'American Trucks'] },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'Africa', specialty: ['RHD Performance', 'Luxury'] },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲', region: 'Caribbean', specialty: ['RHD', 'Performance'] },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', region: 'SE Asia', specialty: ['RHD Prestige', 'SUV'] },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', region: 'SE Asia', specialty: ['Prestige', 'Rolls-Royce'] },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧', region: 'Caribbean', specialty: ['Prestige RHD'] },
]

export const VEHICLE_CATEGORIES = [
  'Rolls-Royce',
  'Bentley',
  'Prestige Saloon',
  'Luxury SUV',
  'Performance / Sports',
  'American Muscle / Truck',
  'RHD Specialist',
  'LHD Specialist',
  'Electric / Hybrid',
  'Classic / Collector',
  'Commercial / Truck',
  'Motorcycle',
  'Specialist / Military',
  'OEM Parts',
]
