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
        COALESCE(dak_stats.ndc_attempt, 0) as dak_ndc_attempt,
        COALESCE(dak_stats.ndc_settled, 0) as dak_ndc_settled,
        COALESCE(dak_stats.dc_attempt, 0) as dak_dc_attempt,
        COALESCE(dak_stats.dc_settled, 0) as dak_dc_settled,
        COALESCE(ndc_stats.ndc_count, 0) as ndc_saved_count,
        COALESCE(dc_stats.dc_count, 0) as dc_saved_count
      FROM users u
      LEFT JOIN (
        SELECT 
          LOWER(assigned_to) as staff_name,
          SUM(CASE WHEN case_type = 'NDC' THEN 1 ELSE 0 END) as ndc_attempt,
          SUM(CASE WHEN case_type = 'NDC' AND issue_date IS NOT NULL AND TRIM(issue_date) != '' THEN 1 ELSE 0 END) as ndc_settled,
          SUM(CASE WHEN case_type = 'DC' THEN 1 ELSE 0 END) as dc_attempt,
          SUM(CASE WHEN case_type = 'DC' AND issue_date IS NOT NULL AND TRIM(issue_date) != '' THEN 1 ELSE 0 END) as dc_settled
        FROM dak_records
        WHERE strftime('%Y-%m', created_at) = ? OR created_at LIKE ? || '%'
        GROUP BY LOWER(assigned_to)
      ) dak_stats ON LOWER(u.username) = dak_stats.staff_name
      LEFT JOIN (
        SELECT 
          LOWER(created_by) as staff_name,
          COUNT(*) as ndc_count
        FROM ndc_records
        WHERE strftime('%Y-%m', created_at) = ? OR created_at LIKE ? || '%'
        GROUP BY LOWER(created_by)
      ) ndc_stats ON LOWER(u.username) = ndc_stats.staff_name
      LEFT JOIN (
        SELECT 
          LOWER(created_by) as staff_name,
          COUNT(*) as dc_count
        FROM dc_records
        WHERE strftime('%Y-%m', created_at) = ? OR created_at LIKE ? || '%'
        GROUP BY LOWER(created_by)
      ) dc_stats ON LOWER(u.username) = dc_stats.staff_name
      GROUP BY u.username
      ORDER BY u.username ASC
    `
    
    const { results } = await env.DB.prepare(query)
      .bind(month, month, month, month, month, month)
      .all<{
        username: string
        dak_ndc_attempt: number
        dak_ndc_settled: number
        dak_dc_attempt: number
        dak_dc_settled: number
        ndc_saved_count: number
        dc_saved_count: number
      }>()

    const performanceStats = (results || []).map(r => {
      const ndc_settled = Math.max(r.dak_ndc_settled || 0, r.ndc_saved_count || 0)
      const ndc_attempt = Math.max(r.dak_ndc_attempt || 0, ndc_settled)
      const dc_settled = Math.max(r.dak_dc_settled || 0, r.dc_saved_count || 0)
      const dc_attempt = Math.max(r.dak_dc_attempt || 0, dc_settled)
      return {
        username: r.username,
        ndc_attempt,
        ndc_settled,
        dc_attempt,
        dc_settled
      }
    })

    return new Response(JSON.stringify(performanceStats), {
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
