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

  if (token) {
    try {
      await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
    } catch (err) {
      console.error('Error deleting session:', err)
    }
  }

  // Clear cookie
  const expiredCookie = 'session_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': expiredCookie
    }
  })
}
