-- Supabase Migration Schema (PostgreSQL)

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    type TEXT NOT NULL,
    business_name TEXT,
    contact_name TEXT,
    phone TEXT,
    ein TEXT,
    certification_number TEXT,
    business_description TEXT,
    organization_name TEXT,
    districts JSONB,
    categories JSONB,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    saved_opportunities JSONB,
    capability_statement TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    years_in_business TEXT,
    certifications TEXT
);

-- Opportunities Table
CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    scope_summary TEXT NOT NULL,
    district TEXT NOT NULL,
    district_name TEXT NOT NULL,
    category TEXT NOT NULL,
    category_name TEXT NOT NULL,
    subcategory TEXT,
    estimated_value TEXT,
    due_date TEXT,
    due_time TEXT,
    submission_method TEXT,
    status TEXT DEFAULT 'published',
    posted_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    posted_by INTEGER REFERENCES users (id),
    attachments TEXT,
    duration TEXT,
    requirements TEXT,
    certifications TEXT,
    experience TEXT
);

-- Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    opportunity_id TEXT NOT NULL REFERENCES opportunities (id),
    small_business_id INTEGER NOT NULL REFERENCES users (id),
    prime_contractor_id INTEGER REFERENCES users (id),
    status TEXT DEFAULT 'pending',
    applied_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Saved Opportunities Table
CREATE TABLE IF NOT EXISTS saved_opportunities (
    id SERIAL PRIMARY KEY,
    small_business_id INTEGER NOT NULL REFERENCES users (id),
    opportunity_id TEXT NOT NULL REFERENCES opportunities (id),
    saved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(small_business_id, opportunity_id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users (id),
    receiver_id INTEGER NOT NULL REFERENCES users (id),
    opportunity_id TEXT REFERENCES opportunities (id),
    subject TEXT,
    body TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial opportunities (optional but recommended for fresh setup)
-- INSERT INTO opportunities (...) VALUES (...);
