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
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

  // GET: Fetch records
  if (request.method === 'GET') {
    try {
      let results
      if (user.role === 'admin') {
        // Admins can see all records
        const query = await env.DB.prepare(
          'SELECT * FROM ndc_records ORDER BY created_at DESC'
        ).all()
        results = query.results
      } else {
        // Users can only see their own records
        const query = await env.DB.prepare(
          'SELECT * FROM ndc_records WHERE created_by = ? ORDER BY created_at DESC'
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

  // POST: Create or Update record
  if (request.method === 'POST') {
    try {
      const record = await request.json() as any
      if (!record.id) {
        record.id = 'ndc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
      }

      // Check if it already exists to determine INSERT vs UPDATE
      const existing = await env.DB.prepare(
        'SELECT id, created_by FROM ndc_records WHERE id = ?'
      ).bind(record.id).first<{ id: string; created_by: string }>()

      if (existing) {
        // If not admin, verify ownership
        if (user.role !== 'admin' && existing.created_by !== user.username) {
          return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403 })
        }

        await env.DB.prepare(`
          UPDATE ndc_records SET
            dept = ?, refNo = ?, name = ?, desig = ?, office = ?, reason = ?, reasonVal = ?,
            retireDate = ?, rawRetireDate = ?, issueDate = ?, rawIssueDate = ?, date = ?,
            copy1Val = ?, ddoName = ?, sigName = ?, sigDesig = ?, showSd = ?, manualIssue = ?
          WHERE id = ?
        `).bind(
          record.dept || '',
          record.refNo || '',
          record.name || '',
          record.desig || '',
          record.office || '',
          record.reason || '',
          record.reasonVal || '',
          record.retireDate || '',
          record.rawRetireDate || '',
          record.issueDate || '',
          record.rawIssueDate || '',
          record.date || '',
          record.copy1Val || '',
          record.ddoName || '',
          record.sigName || '',
          record.sigDesig || '',
          record.showSd ? 1 : 0,
          record.manualIssue || '',
          record.id
        ).run()
      } else {
        await env.DB.prepare(`
          INSERT INTO ndc_records (
            id, dept, refNo, name, desig, office, reason, reasonVal,
            retireDate, rawRetireDate, issueDate, rawIssueDate, date,
            copy1Val, ddoName, sigName, sigDesig, showSd, manualIssue, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          record.id,
          record.dept || '',
          record.refNo || '',
          record.name || '',
          record.desig || '',
          record.office || '',
          record.reason || '',
          record.reasonVal || '',
          record.retireDate || '',
          record.rawRetireDate || '',
          record.issueDate || '',
          record.rawIssueDate || '',
          record.date || '',
          record.copy1Val || '',
          record.ddoName || '',
          record.sigName || '',
          record.sigDesig || '',
          record.showSd ? 1 : 0,
          record.manualIssue || '',
          user.username
        ).run()
      }

      return Response.json({ success: true, id: record.id }, {
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    } catch (err: any) {
      return new Response(err.message, { status: 500 })
    }
  }

  // DELETE: Remove a record
  if (request.method === 'DELETE') {
    try {
      const id = url.searchParams.get('id')
      if (!id) {
        return new Response('Missing id parameter', { status: 400 })
      }

      const existing = await env.DB.prepare(
        'SELECT created_by FROM ndc_records WHERE id = ?'
      ).bind(id).first<{ created_by: string }>()

      if (!existing) {
        return new Response('Record not found', { status: 404 })
      }

      // If not admin, verify ownership
      if (user.role !== 'admin' && existing.created_by !== user.username) {
        return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403 })
      }

      await env.DB.prepare('DELETE FROM ndc_records WHERE id = ?').bind(id).run()
      return Response.json({ success: true }, {
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    } catch (err: any) {
      return new Response(err.message, { status: 500 })
    }
  }

  return new Response('Method not allowed', { status: 405 })
}
