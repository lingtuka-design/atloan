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
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
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

  // Handle route based on pathname
  const pathParts = url.pathname.split('/').filter(Boolean)
  
  if (pathParts[pathParts.length - 1] === 'count') {
    // GET count of new cases for the staff
    if (request.method === 'GET') {
      try {
        const query = await env.DB.prepare(
          'SELECT COUNT(*) as new_cases FROM dak_records WHERE assigned_to = ? AND is_new = 1'
        ).bind(user.username).first<{ new_cases: number }>()
        
        return Response.json({ new_cases: query?.new_cases || 0 }, { headers: { 'Access-Control-Allow-Origin': '*' } })
      } catch (err: any) {
        return new Response(err.message, { status: 500 })
      }
    }
  }

  // Normal /api/dak endpoints
  if (request.method === 'GET') {
    try {
      let results
      if (user.role === 'admin') {
        const query = await env.DB.prepare(
          'SELECT d.*, u.designation as user_designation FROM dak_records d LEFT JOIN users u ON LOWER(d.assigned_to) = LOWER(u.username) ORDER BY d.created_at DESC'
        ).all()
        results = query.results
      } else {
        const query = await env.DB.prepare(
          'SELECT d.*, u.designation as user_designation FROM dak_records d LEFT JOIN users u ON LOWER(d.assigned_to) = LOWER(u.username) WHERE d.assigned_to = ? ORDER BY d.created_at DESC'
        ).bind(user.username).all()
        results = query.results
      }

      return Response.json(results, {
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    } catch (err: any) {
      return new Response(err.message, { status: 500 })
    }
  }

  if (request.method === 'POST') {
    // Admin only
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403 })
    }

    try {
      const record = await request.json() as any
      const id = 'dak_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
      
      const maxSlQuery = await env.DB.prepare(`
        SELECT MAX(sl_no) as max_sl 
        FROM dak_records 
        WHERE assigned_to = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')
      `).bind(record.assigned_to || '').first<{ max_sl: number }>()

      const nextSl = (maxSlQuery?.max_sl || 0) + 1

      await env.DB.prepare(`
        INSERT INTO dak_records (
          id, sl_no, receive_no, name, department, case_type, sent_date, 
          assigned_to, created_by, action, issue_date, is_new
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', '', 1)
      `).bind(
        id,
        nextSl,
        record.receive_no || '',
        record.name || '',
        record.department || '',
        record.case_type || 'Others',
        record.sent_date || '',
        record.assigned_to || '',
        user.username
      ).run()

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

      // First check ownership/roles
      const existing = await env.DB.prepare('SELECT assigned_to FROM dak_records WHERE id = ?').bind(record.id).first<{ assigned_to: string }>()
      if (!existing) return new Response('Not found', { status: 404 })

      if (user.role !== 'admin' && existing.assigned_to !== user.username) {
        return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403 })
      }

      // Fields that might be updated
      const updates = []
      const values = []

      if (record.action !== undefined) { updates.push('action = ?'); values.push(record.action) }
      if (record.issue_date !== undefined) { updates.push('issue_date = ?'); values.push(record.issue_date) }
      if (record.case_type !== undefined) { updates.push('case_type = ?'); values.push(record.case_type) }
      if (record.is_new !== undefined) { updates.push('is_new = ?'); values.push(record.is_new ? 1 : 0) }

      if (updates.length > 0) {
        values.push(record.id)
        await env.DB.prepare(`
          UPDATE dak_records SET ${updates.join(', ')} WHERE id = ?
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
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403 })
    }

    try {
      const id = url.searchParams.get('id')
      if (!id) return new Response('Missing id parameter', { status: 400 })

      // Get the record first to know its month and assigned_to
      const record = await env.DB.prepare('SELECT assigned_to, created_at FROM dak_records WHERE id = ?').bind(id).first<{ assigned_to: string, created_at: string }>()
      if (!record) return new Response('Not found', { status: 404 })

      await env.DB.prepare('DELETE FROM dak_records WHERE id = ?').bind(id).run()

      // Re-sequence the sl_no for the month of the deleted record, specifically for that staff
      const monthStr = record.created_at.substring(0, 7)
      
      const remaining = await env.DB.prepare(`
        SELECT id FROM dak_records 
        WHERE assigned_to = ? AND substr(created_at, 1, 7) = ? 
        ORDER BY created_at ASC
      `).bind(record.assigned_to, monthStr).all<{ id: string }>()

      if (remaining.results) {
        for (let i = 0; i < remaining.results.length; i++) {
          await env.DB.prepare('UPDATE dak_records SET sl_no = ? WHERE id = ?')
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
