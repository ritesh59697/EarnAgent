import { Bot, InlineKeyboard, Keyboard } from 'grammy'
import { db } from '../db/client.js'
import 'dotenv/config'

if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('Missing TELEGRAM_BOT_TOKEN')

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN)

// Register bot commands (shows the blue circular menu button next to input field)
bot.api.setMyCommands([
  { command: 'start', description: 'Start the bot and set up profile' },
  { command: 'matches', description: 'Find matching opportunities' },
  { command: 'profile', description: 'View your profile' },
  { command: 'update', description: 'Update your profile details' },
  { command: 'help', description: 'Get help and bot info' }
]).catch(err => console.error('Failed to set bot commands:', err))

// Persistent reply keyboard menu
const mainMenuKeyboard = new Keyboard()
  .text('🔍 Find Matches').text('👤 View Profile')
  .row()
  .text('⚙️ Update Profile').text('ℹ️ Help')
  .resized()

// In-memory onboarding state (use Redis for production)
const onboarding: Record<number, Partial<{
  step: string
  name: string
  bio: string
  skills: string[]
  experience_level: string
  past_work: string
}>> = {}

// Helper handlers
async function showMatches(ctx: any) {
  const telegramId = String(ctx.from?.id)
  const { data: user } = await db
    .from('users')
    .select('id')
    .eq('telegram_id', telegramId)
    .single()

  if (!user) {
    await ctx.reply('Please set up your profile first with /start', {
      reply_markup: { remove_keyboard: true }
    })
    return
  }

  const { data: matches } = await db
    .from('matches')
    .select('*, listings(*)')
    .eq('user_id', user.id)
    .in('status', ['pending', 'sent'])
    .gte('match_score', 7)
    .order('match_score', { ascending: false })
    .limit(5)

  if (!matches?.length) {
    await ctx.reply('No new matches yet. I check every 30 minutes — check back soon! 🔍', {
      reply_markup: mainMenuKeyboard
    })
    return
  }

  for (const match of matches) {
    const listing = match.listings as any
    const keyboard = new InlineKeyboard()
      .text('📋 View draft', `draft_${match.id}`)
      .url('🔗 Open listing', listing.url)
      .row()
      .text('✅ Mark applied', `applied_${match.id}`)
      .text('❌ Dismiss', `dismiss_${match.id}`)

    await ctx.reply(
      `🎯 *Match Score: ${match.match_score}/10*\n\n*${listing.title}*\n${listing.sponsor_name} · ${listing.reward_amount} ${listing.reward_token}\n\n_${match.match_reason}_`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    )
  }
}

async function showProfile(ctx: any) {
  const telegramId = String(ctx.from?.id)
  const { data: user } = await db
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single()

  if (!user) {
    await ctx.reply('Please set up your profile first with /start', {
      reply_markup: { remove_keyboard: true }
    })
    return
  }

  await ctx.reply(
    `*Your Profile*\n\n👤 ${user.name}\n🛠 Skills: ${user.skills?.join(', ')}\n📊 Level: ${user.experience_level}\n📝 Bio: ${user.bio}\n\nTo update, use the button below or type /update.`,
    { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard }
  )
}

async function startUpdate(ctx: any) {
  onboarding[ctx.from!.id] = { step: 'name' }
  await ctx.reply(
    `🔄 Let's update your profile! What's your name?`,
    { reply_markup: { remove_keyboard: true } }
  )
}

async function showHelp(ctx: any) {
  await ctx.reply(
    `🤖 *Earn Agent Help Menu*\n\nHere is how I can help you find opportunities on Superteam Earn:\n\n` +
    `🔍 *Find Matches* - List recent opportunities tailored to your skills.\n` +
    `👤 *View Profile* - Check your currently saved skills, bio, and experience level.\n` +
    `⚙️ *Update Profile* - Modify your profile details.\n\n` +
    `I scan for new listings every 30 minutes and will notify you instantly if there is a match!`,
    { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard }
  )
}

// ── Commands ──────────────────────────────────────────────
bot.command('start', async (ctx) => {
  const telegramId = String(ctx.from?.id)

  // Check if already registered
  const { data: existing } = await db
    .from('users')
    .select('id, name')
    .eq('telegram_id', telegramId)
    .single()

  if (existing) {
    await ctx.reply(
      `Welcome back, ${existing.name}! 👋\n\nI'm watching Superteam Earn for new opportunities that match your skills.\n\nUse the menu buttons below to manage your profile and matches.`,
      { reply_markup: mainMenuKeyboard }
    )
    return
  }

  // Start onboarding
  onboarding[ctx.from!.id] = { step: 'name' }
  await ctx.reply(
    `👋 Welcome to *Earn Agent* — your AI-powered Superteam Earn assistant!\n\nI'll match you with bounties, grants, and projects that fit your skills and draft a personalized application for you.\n\nLet's set up your profile. What's your name?`,
    { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
  )
})

bot.command('matches', showMatches)
bot.command('profile', showProfile)
bot.command('update', startUpdate)
bot.command('help', showHelp)

// ── Button Text Routing ────────────────────────────────────
bot.hears('🔍 Find Matches', showMatches)
bot.hears('👤 View Profile', showProfile)
bot.hears('⚙️ Update Profile', startUpdate)
bot.hears('ℹ️ Help', showHelp)


// ── Inline button callbacks ───────────────────────────────
bot.callbackQuery(/^draft_(.+)$/, async (ctx) => {
  const matchId = ctx.match[1]
  const { data: match } = await db
    .from('matches')
    .select('draft, listings(title)')
    .eq('id', matchId)
    .single()

  if (!match?.draft) {
    await ctx.answerCallbackQuery('Draft not found')
    return
  }

  await ctx.answerCallbackQuery()
  await ctx.reply(
    `📋 *Application Draft*\n_${(match.listings as any)?.title}_\n\n${match.draft}\n\n---\n_Edit this as needed before submitting!_`,
    { parse_mode: 'Markdown' }
  )
})

bot.callbackQuery(/^applied_(.+)$/, async (ctx) => {
  const matchId = ctx.match[1]
  await db.from('matches').update({ status: 'applied' }).eq('id', matchId)
  await ctx.answerCallbackQuery('Marked as applied! Good luck 🚀')
  await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })
})

bot.callbackQuery(/^dismiss_(.+)$/, async (ctx) => {
  const matchId = ctx.match[1]
  await db.from('matches').update({ status: 'dismissed' }).eq('id', matchId)
  await ctx.answerCallbackQuery('Dismissed.')
  await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })
})

// ── Onboarding message handler ────────────────────────────
bot.on('message:text', async (ctx) => {
  const state = onboarding[ctx.from.id]
  if (!state) return

  const text = ctx.message.text.trim()

  if (state.step === 'name') {
    state.name = text
    state.step = 'bio'
    await ctx.reply(`Nice to meet you, ${text}! 👋\n\nTell me a bit about yourself — what do you do? (2-3 sentences)`)

  } else if (state.step === 'bio') {
    state.bio = text
    state.step = 'skills'
    await ctx.reply(
      `Great! What are your main skills?\n\nType them separated by commas. Examples:\n_frontend, solana, rust, content writing, design, backend, smart contracts_`,
      { parse_mode: 'Markdown' }
    )

  } else if (state.step === 'skills') {
    state.skills = text.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    state.step = 'experience'
    const keyboard = new InlineKeyboard()
      .text('Beginner', 'exp_beginner')
      .text('Intermediate', 'exp_intermediate')
      .text('Expert', 'exp_expert')
    await ctx.reply('What\'s your experience level?', { reply_markup: keyboard })

  } else if (state.step === 'past_work') {
    state.past_work = text
    state.step = 'done'

    // Save to DB
    const telegramId = String(ctx.from.id)
    const { error } = await db.from('users').upsert({
      telegram_id: telegramId,
      name: state.name,
      bio: state.bio,
      skills: state.skills,
      experience_level: state.experience_level,
      past_work: state.past_work,
      is_active: true
    }, { onConflict: 'telegram_id' })

    delete onboarding[ctx.from.id]

    if (error) {
      await ctx.reply('Something went wrong saving your profile. Please try /start again.')
      return
    }

    await ctx.reply(
      `✅ *Profile saved!*\n\nI'll now monitor Superteam Earn every 30 minutes and notify you here when I find a good match.\n\nUse the buttons below to check matches or manage your profile. Good luck! 🚀`,
      { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard }
    )
  }
})

// Experience level buttons during onboarding
bot.callbackQuery(/^exp_(.+)$/, async (ctx) => {
  const state = onboarding[ctx.from.id]
  if (!state) return

  state.experience_level = ctx.match[1]
  state.step = 'past_work'
  await ctx.answerCallbackQuery()
  await ctx.reply(
    `Got it — *${ctx.match[1]}*.\n\nLastly, briefly describe your past work or portfolio. Any projects, GitHub links, or achievements worth mentioning?`,
    { parse_mode: 'Markdown' }
  )
})

export async function notifyUser(telegramId: string, matchId: string, listingTitle: string, score: number) {
  try {
    const keyboard = new InlineKeyboard()
      .text('📋 View draft', `draft_${matchId}`)
      .text('/matches', '/matches')

    await bot.api.sendMessage(
      telegramId,
      `🔔 *New match found!*\n\n*${listingTitle}*\nMatch score: ${score}/10\n\nI've drafted an application for you. Tap below to review it!`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    )
  } catch (err) {
    console.error(`[bot] Failed to notify ${telegramId}:`, err)
  }
}
