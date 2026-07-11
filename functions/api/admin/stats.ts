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

async function checkAdmin(request: Request, env: Env): Promise<boolean> {
  const cookies = parseCookies(request.headers.get('Cookie'))
  const token = cookies['session_token']
  if (!token) return false

  const session = await env.DB.prepare(
    `SELECT u.role, s.expires_at 
     FROM sessions s 
     JOIN users u ON s.user_id = u.id 
     WHERE s.token = ?`
  ).bind(token).first<{ role: string; expires_at: number }>()

  if (!session || session.expires_at < Date.now() || session.role !== 'admin') {
    return false
  }

  return true
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  // Verify requester is admin
  const isAdmin = await checkAdmin(request, env)
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(request.url)
  const month = url.searchParams.get('month')

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return new Response(JSON.stringify({ error: 'Invalid or missing month parameter. Format must be YYYY-MM.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const query = `
      SELECT 
        u.username,
        COUNT(DISTINCT n.id) as ndc_count,
        COUNT(DISTINCT d.id) as dc_count
      FROM users u
      LEFT JOIN ndc_records n 
        ON u.username = n.created_by 
        AND strftime('%Y-%m', n.created_at) = ?
      LEFT JOIN dc_records d 
        ON u.username = d.created_by 
        AND strftime('%Y-%m', d.created_at) = ?
      GROUP BY u.username
      ORDER BY u.username ASC
    `
    
    const { results } = await env.DB.prepare(query)
      .bind(month, month)
      .all<{ username: string; ndc_count: number; dc_count: number }>()

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
