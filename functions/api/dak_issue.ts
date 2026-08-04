interface Env {
  DB: D1Database
}

function parseCookies(cookieHeader: string | null): Record<string, string> {
  const list: Record<string, string> = {}
  if (!cookieHeader) return list
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=')
    list[parts.shift()!.trim()] = decodeURIComponent(parts.join('='))
  })
  return list
}

async function getAuthenticatedUser(request: Request, env: Env): Promise<{ id: string; username: string; role: string } | null> {
  const cookies = parseCookies(request.headers.get('Cookie'))
  const token = cookies['session_token']
  if (!token) return null

  const session = await env.DB.prepare(
    `SELECT u.id, u.username, u.role, s.expires_at 
     FROM sessions s 
     JOIN users u ON s.user_id = u.id 
     WHERE s.token = ?`
  ).bind(token).first<{ id: string; username: string; role: string; expires_at: number }>()

  if (!session || session.expires_at < Date.now()) {
    return null
  }

  return session
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  }

  // Auth Guard
  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Admin only for Issue management
  if (user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Permission denied. Admin access required.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Ensure dak_issue_records table exists
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS dak_issue_records (
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
      )
    `).run()
  } catch (e) {}

  if (request.method === 'GET') {
    try {
      const query = await env.DB.prepare(
        'SELECT * FROM dak_issue_records ORDER BY created_at DESC'
      ).all()
      return Response.json(query.results || [], {
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    } catch (err: any) {
      return new Response(err.message, { status: 500 })
    }
  }

  if (request.method === 'POST') {
    try {
      const record = await request.json() as any
      const id = 'dak_issue_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)

      const maxSlQuery = await env.DB.prepare(`
        SELECT MAX(sl_no) as max_sl 
        FROM dak_issue_records 
        WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')
      `).first<{ max_sl: number }>()

      const nextSl = (maxSlQuery?.max_sl || 0) + 1

      await env.DB.prepare(`
        INSERT INTO dak_issue_records (
          id, sl_no, receive_no, name, address, case_type, 
          issue_date, issue_no, sent, phone_number, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        nextSl,
        record.receive_no || '',
        record.name || '',
        record.address || '',
        record.case_type || '',
        record.issue_date || '',
        record.issue_no || '',
        record.sent || '',
        record.phone_number || '',
        user.username
      ).run()

      // Automatically sync issue_date and update action to 'Settled' in Receive Dak (dak_records) table
      if (record.receive_no && record.issue_date) {
        try {
          await env.DB.prepare(`
            UPDATE dak_records 
            SET issue_date = ?, action = 'Settled'
            WHERE receive_no = ?
          `).bind(record.issue_date, record.receive_no).run()
        } catch (e) {
          console.error('Error syncing issue_date to dak_records:', e)
        }
      }

      return Response.json({ success: true, id }, {
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    } catch (err: any) {
      return new Response(err.message, { status: 500 })
    }
  }

  if (request.method === 'PATCH') {
    try {
      const record = await request.json() as any
      if (!record.id) {
        return new Response('Missing id', { status: 400 })
      }

      const updates = []
      const values = []

      if (record.receive_no !== undefined) { updates.push('receive_no = ?'); values.push(record.receive_no) }
      if (record.name !== undefined) { updates.push('name = ?'); values.push(record.name) }
      if (record.address !== undefined) { updates.push('address = ?'); values.push(record.address) }
      if (record.case_type !== undefined) { updates.push('case_type = ?'); values.push(record.case_type) }
      if (record.issue_date !== undefined) { updates.push('issue_date = ?'); values.push(record.issue_date) }
      if (record.issue_no !== undefined) { updates.push('issue_no = ?'); values.push(record.issue_no) }
      if (record.sent !== undefined) { updates.push('sent = ?'); values.push(record.sent) }
      if (record.phone_number !== undefined) { updates.push('phone_number = ?'); values.push(record.phone_number) }

      if (updates.length > 0) {
        values.push(record.id)
        await env.DB.prepare(`
          UPDATE dak_issue_records SET ${updates.join(', ')} WHERE id = ?
        `).bind(...values).run()
      }

      return Response.json({ success: true }, {
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    } catch (err: any) {
      return new Response(err.message, { status: 500 })
    }
  }

  if (request.method === 'DELETE') {
    try {
      const id = url.searchParams.get('id')
      if (!id) return new Response('Missing id parameter', { status: 400 })

      const record = await env.DB.prepare('SELECT created_at FROM dak_issue_records WHERE id = ?').bind(id).first<{ created_at: string }>()
      if (!record) return new Response('Not found', { status: 404 })

      await env.DB.prepare('DELETE FROM dak_issue_records WHERE id = ?').bind(id).run()

      const monthStr = record.created_at.substring(0, 7)
      const remaining = await env.DB.prepare(`
        SELECT id FROM dak_issue_records 
        WHERE substr(created_at, 1, 7) = ? 
        ORDER BY created_at ASC
      `).bind(monthStr).all<{ id: string }>()

      if (remaining.results) {
        for (let i = 0; i < remaining.results.length; i++) {
          await env.DB.prepare('UPDATE dak_issue_records SET sl_no = ? WHERE id = ?')
            .bind(i + 1, remaining.results[i].id)
            .run()
        }
      }

      return Response.json({ success: true }, {
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    } catch (err: any) {
      return new Response(err.message, { status: 500 })
    }
  }

  return new Response('Method not allowed', { status: 405 })
}
