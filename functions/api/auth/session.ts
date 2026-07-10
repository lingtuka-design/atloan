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

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  const cookieHeader = request.headers.get('Cookie')
  const cookies = parseCookies(cookieHeader)
  const token = cookies['session_token']

  if (!token) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const session = await env.DB.prepare(
      `SELECT u.id, u.username, u.role, s.expires_at 
       FROM sessions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.token = ?`
    ).bind(token).first<{ id: string; username: string; role: string; expires_at: number }>()

    if (!session) {
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (session.expires_at < Date.now()) {
      // Session expired, delete it
      await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
      const expiredCookie = 'session_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': expiredCookie
        }
      })
    }

    return new Response(
      JSON.stringify({
        authenticated: true,
        user: { id: session.id, username: session.username, role: session.role }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
