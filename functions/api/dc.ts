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
        const query = await env.DB.prepare(
          'SELECT * FROM dc_records ORDER BY created_at DESC'
        ).all()
        results = query.results
      } else {
        const query = await env.DB.prepare(
          'SELECT * FROM dc_records WHERE created_by = ? ORDER BY created_at DESC'
        ).bind(user.username).all()
        results = query.results
      }

      // Parse JSON fields
      const parsedResults = results.map((r: any) => ({
        ...r,
        sharedInputs: r.sharedInputs ? JSON.parse(r.sharedInputs) : {},
        loanInputsArray: r.loanInputsArray ? JSON.parse(r.loanInputsArray) : [],
        allCalculatedData: r.allCalculatedData ? JSON.parse(r.allCalculatedData) : []
      }))

      return Response.json(parsedResults, {
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
        record.id = 'dc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
      }

      // Check if it already exists
      const existing = await env.DB.prepare(
        'SELECT id, created_by FROM dc_records WHERE id = ?'
      ).bind(record.id).first<{ id: string; created_by: string }>()

      const sharedInputsStr = JSON.stringify(record.sharedInputs || {})
      const loanInputsArrayStr = JSON.stringify(record.loanInputsArray || [])
      const allCalculatedDataStr = JSON.stringify(record.allCalculatedData || [])

      if (existing) {
        // If not admin, verify ownership
        if (user.role !== 'admin' && existing.created_by !== user.username) {
          return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403 })
        }

        await env.DB.prepare(`
          UPDATE dc_records SET
            name = ?, dept = ?, type = ?, dateSaved = ?, issueDate = ?,
            sharedInputs = ?, loanInputsArray = ?, allCalculatedData = ?,
            noteHTMLSaved = ?, legalCertHTMLSaved = ?, ndcCertHTMLSaved = ?
          WHERE id = ?
        `).bind(
          record.name || '',
          record.dept || '',
          record.type || '',
          record.dateSaved || '',
          record.issueDate || '',
          sharedInputsStr,
          loanInputsArrayStr,
          allCalculatedDataStr,
          record.noteHTMLSaved || '',
          record.legalCertHTMLSaved || '',
          record.ndcCertHTMLSaved || '',
          record.id
        ).run()
      } else {
        await env.DB.prepare(`
          INSERT INTO dc_records (
            id, name, dept, type, dateSaved, issueDate,
            sharedInputs, loanInputsArray, allCalculatedData,
            noteHTMLSaved, legalCertHTMLSaved, ndcCertHTMLSaved, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          record.id,
          record.name || '',
          record.dept || '',
          record.type || '',
          record.dateSaved || '',
          record.issueDate || '',
          sharedInputsStr,
          loanInputsArrayStr,
          allCalculatedDataStr,
          record.noteHTMLSaved || '',
          record.legalCertHTMLSaved || '',
          record.ndcCertHTMLSaved || '',
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
        'SELECT created_by FROM dc_records WHERE id = ?'
      ).bind(id).first<{ created_by: string }>()

      if (!existing) {
        return new Response('Record not found', { status: 404 })
      }

      // If not admin, verify ownership
      if (user.role !== 'admin' && existing.created_by !== user.username) {
        return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403 })
      }

      await env.DB.prepare('DELETE FROM dc_records WHERE id = ?').bind(id).run()
      return Response.json({ success: true }, {
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    } catch (err: any) {
      return new Response(err.message, { status: 500 })
    }
  }

  return new Response('Method not allowed', { status: 405 })
}
