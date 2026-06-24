import axios from 'axios'
import { db } from '../db/client.js'

// Superteam Earn public API endpoints
const BASE_URL = 'https://earn.superteam.fun/api'
const AGENT_API_KEY = process.env.SUPERTEAM_AGENT_KEY || ''

interface EarnListing {
  id: string
  title: string
  description: string
  type: 'bounty' | 'grant' | 'project'
  skills: { skills: string }[]
  rewardAmount: number
  token: string
  deadline: string
  sponsor: {
    name: string
    logo: string
  }
  slug: string
  isActive: boolean
}

async function fetchListings(): Promise<EarnListing[]> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (AGENT_API_KEY) headers['Authorization'] = `Bearer ${AGENT_API_KEY}`

    const endpoint = AGENT_API_KEY
      ? `${BASE_URL}/agents/listings/live`
      : `${BASE_URL}/listings/`

    const params = AGENT_API_KEY
      ? { take: 50, deadline: '2027-12-31' }
      : { order: 'desc', take: 50, isActive: true }

    const res = await axios.get(endpoint, { headers, params, maxRedirects: 5 })
    const data = res.data
    const listings = data?.listings || data?.bounties || data || []
    console.log(`[scraper] Raw API returned ${Array.isArray(listings) ? listings.length : 'unknown'} items`)
    return Array.isArray(listings) ? listings : []
  } catch (err) {
    console.error('[scraper] Failed to fetch listings:', err)
    return []
  }
}

function normalizeSkills(raw: { skills: string }[]): string[] {
  if (!raw || !Array.isArray(raw)) return []
  return raw.map(s => s.skills?.toLowerCase()).filter(Boolean)
}

export async function scrapeAndStore(): Promise<number> {
  console.log('[scraper] Starting scrape...')
  const listings = await fetchListings()

  if (!listings.length) {
    console.log('[scraper] No listings fetched.')
    return 0
  }

  let newCount = 0

  for (const listing of listings) {
    const normalized = {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      type: listing.type,
      skills: normalizeSkills(listing.skills),
      reward_amount: listing.rewardAmount,
      reward_token: listing.token,
      deadline: listing.deadline ? new Date(listing.deadline).toISOString() : null,
      sponsor_name: listing.sponsor?.name,
      sponsor_logo: listing.sponsor?.logo,
      url: `https://earn.superteam.fun/listings/${listing.slug}/`,
      is_active: listing.isActive ?? true,
      scraped_at: new Date().toISOString()
    }

    // Upsert — update if exists, insert if new
    const { error, data } = await db
      .from('listings')
      .upsert(normalized, { onConflict: 'id', ignoreDuplicates: false })
      .select('id')

    if (error) {
      console.error(`[scraper] Error upserting listing ${listing.id}:`, error.message)
    } else if (data?.length) {
      newCount++
    }
  }

  console.log(`[scraper] Done. Processed ${listings.length} listings, ${newCount} new/updated.`)
  return newCount
}

// Run directly: npx tsx src/scraper/index.ts
if (process.argv[1]?.includes('scraper')) {
  scrapeAndStore().then(() => process.exit(0))
}
