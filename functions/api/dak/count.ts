interface Env {
  DB: D1Database
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Get user session
  const cookieHeader = request.headers.get('Cookie') || ''
  const match = cookieHeader.match(/session_token=([^;]+)/)
  const token = match ? match[1] : null

  if (!token) return Response.json({ new_cases: 0 })

  const session = await env.DB.prepare(
    'SELECT user_id, expires_at FROM sessions WHERE token = ?'
  ).bind(token).first<{ user_id: string; expires_at: number }>()

  if (!session || Date.now() > session.expires_at) return Response.json({ new_cases: 0 })

  const dbUser = await env.DB.prepare('SELECT username, role FROM users WHERE id = ?').bind(session.user_id).first<{ username: string; role: string }>()
  if (!dbUser || dbUser.role === 'admin') return Response.json({ new_cases: 0 })

  // Count unread records
  try {
    const result = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM dak_records WHERE assigned_to = ? AND is_new = 1'
    ).bind(dbUser.username).first<{ count: number }>()

    return Response.json({ new_cases: result?.count || 0 }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })
  } catch (err: any) {
    return new Response(err.message, { status: 500 })
  }
}
