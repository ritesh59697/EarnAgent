import cron from 'node-cron'
import 'dotenv/config'
import { scrapeAndStore } from './scraper/index.js'
import { runMatchingForNewListings } from './agent/index.js'
import { bot, notifyUser } from './bot/index.js'
import { db } from './db/client.js'

const INTERVAL = process.env.SCRAPE_INTERVAL_MINUTES || '30'

async function runPipeline() {
  console.log('\n──────────────────────────────')
  console.log(`[pipeline] Run started at ${new Date().toISOString()}`)

  // Step 1: Scrape new listings
  await scrapeAndStore()

  // Step 2: Run AI matching
  await runMatchingForNewListings()

  // Step 3: Notify users of new pending matches via Telegram
  await notifyPendingMatches()

  console.log('[pipeline] Run complete.')
  console.log('──────────────────────────────\n')
}

async function notifyPendingMatches() {
  // Find matches that haven't been notified yet
  const { data: matches } = await db
    .from('matches')
    .select('id, match_score, listings(title), users(telegram_id)')
    .eq('status', 'pending')
    .is('notified_at', null)

  if (!matches?.length) return

  console.log(`[notify] Sending ${matches.length} notifications...`)

  for (const match of matches) {
    const user = match.users as any
    const listing = match.listings as any

    if (user?.telegram_id) {
      await notifyUser(user.telegram_id, match.id, listing?.title, match.match_score)

      // Mark as notified
      await db
        .from('matches')
        .update({ notified_at: new Date().toISOString(), status: 'sent' })
        .eq('id', match.id)
    }
  }
}

// Start Telegram bot
bot.start()
console.log('[bot] Telegram bot started')

// Run pipeline immediately on startup
runPipeline()

// Then run on schedule (every N minutes)
cron.schedule(`*/${INTERVAL} * * * *`, runPipeline)
console.log(`[cron] Pipeline scheduled every ${INTERVAL} minutes`)
