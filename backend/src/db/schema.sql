-- Run this in your Supabase SQL editor

-- Listings scraped from Superteam Earn
create table listings (
  id text primary key,
  title text not null,
  description text,
  type text, -- 'bounty' | 'grant' | 'project'
  skills text[], -- array of required skills
  reward_amount numeric,
  reward_token text,
  deadline timestamptz,
  sponsor_name text,
  sponsor_logo text,
  url text,
  is_active boolean default true,
  scraped_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Users who signed up via Telegram or web
create table users (
  id uuid primary key default gen_random_uuid(),
  telegram_id text unique,
  email text unique,
  name text,
  bio text,
  skills text[], -- e.g. ['frontend', 'solana', 'content']
  experience_level text, -- 'beginner' | 'intermediate' | 'expert'
  past_work text, -- description of past work / portfolio
  wallet_address text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Matches between users and listings
create table matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  listing_id text references listings(id) on delete cascade,
  match_score integer, -- 0-10
  match_reason text,
  draft text, -- AI-generated application draft
  status text default 'pending', -- 'pending' | 'sent' | 'applied' | 'dismissed'
  notified_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, listing_id)
);

-- Indexes
create index on listings(is_active, created_at desc);
create index on matches(user_id, status);
create index on matches(listing_id);

-- Grant privileges to standard Supabase roles
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;

