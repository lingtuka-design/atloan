interface Env {
  DB: D1Database
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message + 'loan-salt-129')
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function ensureTables(db: D1Database) {
  try {
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        designation TEXT DEFAULT '',
        role TEXT CHECK(role IN ('admin', 'user')) NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS ndc_records (
        id TEXT PRIMARY KEY,
        dept TEXT,
        refNo TEXT,
        name TEXT,
        desig TEXT,
        office TEXT,
        reason TEXT,
        reasonVal TEXT,
        retireDate TEXT,
        rawRetireDate TEXT,
        issueDate TEXT,
        rawIssueDate TEXT,
        date TEXT,
        copy1Val TEXT,
        ddoName TEXT,
        sigName TEXT,
        sigDesig TEXT,
        showSd INTEGER,
        manualIssue TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS dc_records (
        id TEXT PRIMARY KEY,
        name TEXT,
        dept TEXT,
        type TEXT,
        dateSaved TEXT,
        issueDate TEXT,
        sharedInputs TEXT,
        loanInputsArray TEXT,
        allCalculatedData TEXT,
        noteHTMLSaved TEXT,
        legalCertHTMLSaved TEXT,
        ndcCertHTMLSaved TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS dak_records (
        id TEXT PRIMARY KEY,
        sl_no INTEGER,
        receive_no TEXT,
        name TEXT,
        department TEXT,
        case_type TEXT,
        sent_date TEXT,
        amount TEXT DEFAULT '',
        action TEXT DEFAULT 'Pending',
        issue_date TEXT,
        assigned_to TEXT,
        created_by TEXT,
        is_new INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS dak_issue_records (
        id TEXT PRIMARY KEY,
        sl_no INTEGER,
        receive_no TEXT,
        name TEXT,
        address TEXT,
        case_type TEXT,
        issue_date TEXT,
        issue_no TEXT,
        sent TEXT,
        phone_number TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`)
    ])
  } catch (e) {
    console.error('ensureTables error:', e)
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { username, password } = await request.json() as Record<string, string>

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Username leh password thun luh a ngai' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 0. Ensure tables exist
    await ensureTables(env.DB)

    // 1. Seed default admin if users table is empty
    const { results } = await env.DB.prepare('SELECT COUNT(*) as count FROM users').all<{ count: number }>()
    const count = results[0]?.count || 0

    if (count === 0) {
      const defaultHash = await sha256('12345')
      const adminId = crypto.randomUUID()
      await env.DB.prepare(
        'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)'
      ).bind(adminId, 'mala', defaultHash, 'admin').run()
    }

    // 2. Query user (ignore case and spaces)
    const dbUser = await env.DB.prepare(
      "SELECT * FROM users WHERE REPLACE(LOWER(username), ' ', '') = REPLACE(LOWER(?), ' ', '')"
    ).bind(username.trim()).first<{ id: string; username: string; password_hash: string; role: string }>()

    if (!dbUser) {
      return new Response(JSON.stringify({ error: 'Username he a dik lo' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 3. Verify password
    const inputHash = await sha256(password)
    if (dbUser.password_hash !== inputHash) {
      return new Response(JSON.stringify({ error: 'Password a dik lo' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 4. Generate Session Token
    const token = crypto.randomUUID()
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 Hours

    await env.DB.prepare(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(token, dbUser.id, expiresAt).run()

    // 5. Build secure HTTP-Only Cookie header
    const cookie = `session_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: dbUser.id, username: dbUser.username, role: dbUser.role }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookie
        }
      }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
