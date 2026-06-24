import Groq from 'groq-sdk'
import { db } from '../db/client.js'
import 'dotenv/config'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

interface Listing {
  id: string
  title: string
  description: string
  type: string
  skills: string[]
  reward_amount: number
  reward_token: string
  sponsor_name: string
  url: string
}

interface User {
  id: string
  name: string
  bio: string
  skills: string[]
  experience_level: string
  past_work: string
}

interface MatchResult {
  score: number
  reason: string
  draft: string
}

// Step 1: Score how well a listing matches a user profile
async function scoreMatch(listing: Listing, user: User): Promise<{ score: number; reason: string }> {
  const prompt = `You are a grant matching assistant. Score how well this opportunity matches the user profile.

LISTING:
Title: ${listing.title}
Type: ${listing.type}
Skills required: ${listing.skills.join(', ')}
Description: ${listing.description?.slice(0, 500)}
Reward: ${listing.reward_amount} ${listing.reward_token}
Sponsor: ${listing.sponsor_name}

USER PROFILE:
Name: ${user.name}
Skills: ${user.skills.join(', ')}
Experience: ${user.experience_level}
Bio: ${user.bio}
Past work: ${user.past_work}

Respond with ONLY a JSON object like this:
{"score": 8, "reason": "Strong match because user has Solana and frontend skills which directly align with the listing requirements."}

Score 0-10. Be strict — only score 7+ if there is genuine skill overlap.`

  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 200,
    response_format: { type: 'json_object' }
  })

  const raw = res.choices[0]?.message?.content || '{}'
  try {
    const parsed = JSON.parse(raw)
    return { score: parsed.score || 0, reason: parsed.reason || '' }
  } catch {
    return { score: 0, reason: 'Could not parse match score' }
  }
}

// Step 2: Generate a tailored application draft
async function generateDraft(listing: Listing, user: User, matchReason: string): Promise<string> {
  const prompt = `You are an expert grant writer. Write a compelling, personalized application for this opportunity.

LISTING:
Title: ${listing.title}
Type: ${listing.type}
Description: ${listing.description?.slice(0, 800)}
Sponsor: ${listing.sponsor_name}

APPLICANT:
Name: ${user.name}
Skills: ${user.skills.join(', ')}
Bio: ${user.bio}
Past work: ${user.past_work}
Experience level: ${user.experience_level}

WHY THEY'RE A GOOD FIT: ${matchReason}

Write a professional but human application draft. Include:
1. A strong opening that shows genuine interest in the sponsor/project
2. Relevant experience and skills (be specific)
3. What they will deliver / how they will approach the work
4. A brief closing

Keep it under 300 words. Write in first person as the applicant. Do not use generic filler phrases.`

  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 600
  })

  return res.choices[0]?.message?.content || 'Could not generate draft.'
}

// Main: run matching for all active users against new listings
export async function runMatchingForNewListings(): Promise<void> {
  console.log('[agent] Starting matching run...')

  // Get active users
  const { data: users, error: userErr } = await db
    .from('users')
    .select('*')
    .eq('is_active', true)

  if (userErr || !users?.length) {
    console.log('[agent] No active users found.')
    return
  }

  // Get recent listings not yet matched to each user (last 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: listings, error: listErr } = await db
    .from('listings')
    .select('*')
    .eq('is_active', true)
    .gte('scraped_at', since)

  if (listErr || !listings?.length) {
    console.log('[agent] No new listings to match.')
    return
  }

  console.log(`[agent] Matching ${listings.length} listings against ${users.length} users...`)

  for (const user of users) {
    for (const listing of listings) {
      // Skip if already matched
      const { data: existing } = await db
        .from('matches')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', listing.id)
        .single()

      if (existing) continue

      // Score the match
      const { score, reason } = await scoreMatch(listing, user)
      console.log(`[agent] ${user.name} <> "${listing.title}" → score: ${score}`)

      if (score >= 7) {
        // Generate draft only for good matches
        const draft = await generateDraft(listing, user, reason)

        await db.from('matches').insert({
          user_id: user.id,
          listing_id: listing.id,
          match_score: score,
          match_reason: reason,
          draft,
          status: 'pending'
        })

        console.log(`[agent] ✓ Match saved for ${user.name} — score ${score}`)
      }
    }
  }

  console.log('[agent] Matching run complete.')
}
