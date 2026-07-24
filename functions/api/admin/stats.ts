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
        MAX(COALESCE(dak_stats.ndc_attempt, 0), COALESCE(ndc_stats.ndc_attempt, 0)) as ndc_attempt,
        MAX(COALESCE(dak_stats.ndc_settled, 0), COALESCE(ndc_stats.ndc_settled, 0)) as ndc_settled,
        MAX(COALESCE(dak_stats.dc_attempt, 0), COALESCE(dc_stats.dc_attempt, 0)) as dc_attempt,
        MAX(COALESCE(dak_stats.dc_settled, 0), COALESCE(dc_stats.dc_settled, 0)) as dc_settled
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
          COUNT(*) as ndc_attempt,
          SUM(CASE WHEN n.issueDate = (SELECT MAX(issueDate) FROM ndc_records WHERE LOWER(created_by) = LOWER(n.created_by)) THEN 1 ELSE 0 END) as ndc_settled
        FROM ndc_records n
        WHERE strftime('%Y-%m', n.created_at) = ? OR n.created_at LIKE ? || '%'
        GROUP BY LOWER(n.created_by)
      ) ndc_stats ON LOWER(u.username) = ndc_stats.staff_name
      LEFT JOIN (
        SELECT 
          LOWER(created_by) as staff_name,
          COUNT(*) as dc_attempt,
          SUM(CASE WHEN d.issueDate = (SELECT MAX(issueDate) FROM dc_records WHERE LOWER(created_by) = LOWER(d.created_by)) THEN 1 ELSE 0 END) as dc_settled
        FROM dc_records d
        WHERE strftime('%Y-%m', d.created_at) = ? OR d.created_at LIKE ? || '%'
        GROUP BY LOWER(d.created_by)
      ) dc_stats ON LOWER(u.username) = dc_stats.staff_name
      GROUP BY u.username
      ORDER BY u.username ASC
    `
    
    const { results } = await env.DB.prepare(query)
      .bind(month, month, month, month, month, month)
      .all<{
        username: string
        ndc_attempt: number
        ndc_settled: number
        dc_attempt: number
        dc_settled: number
      }>()

    return new Response(JSON.stringify(results || []), {
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
