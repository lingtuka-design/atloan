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

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message + 'loan-salt-129')
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function checkAdmin(request: Request, env: Env): Promise<{ id: string; username: string; role: string } | null> {
  const cookies = parseCookies(request.headers.get('Cookie'))
  const token = cookies['session_token']
  if (!token) return null

  const session = await env.DB.prepare(
    `SELECT u.id, u.username, u.role, s.expires_at 
     FROM sessions s 
     JOIN users u ON s.user_id = u.id 
     WHERE s.token = ?`
  ).bind(token).first<{ id: string; username: string; role: string; expires_at: number }>()

  if (!session || session.expires_at < Date.now() || session.role !== 'admin') {
    return null
  }

  return session
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  // Verify requester is admin
  const adminUser = await checkAdmin(request, env)
  if (!adminUser) {
    return new Response(JSON.stringify({ error: 'Permission denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const url = new URL(request.url)

  // GET: List all users
  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(
        'SELECT id, username, role, designation, created_at FROM users ORDER BY created_at DESC'
      ).all<{ id: string; username: string; role: string; designation: string; created_at: string }>()

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

  // POST: Create User
  if (request.method === 'POST') {
    try {
      const { username, password, role, designation } = await request.json() as Record<string, string>

      if (!username || !password || !role) {
        return new Response(JSON.stringify({ error: 'Khawngaihin form hi thun kim rawh' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (role !== 'admin' && role !== 'user') {
        return new Response(JSON.stringify({ error: 'Role hi admin emaw user a ni tur a ni' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Check duplicate username
      const existing = await env.DB.prepare(
        'SELECT id FROM users WHERE LOWER(username) = LOWER(?)'
      ).bind(username.trim()).first()

      if (existing) {
        return new Response(JSON.stringify({ error: 'Username hi a awm sa a ni' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const userId = crypto.randomUUID()
      const passwordHash = await sha256(password)

      await env.DB.prepare(
        'INSERT INTO users (id, username, password_hash, role, designation) VALUES (?, ?, ?, ?, ?)'
      ).bind(userId, username.trim(), passwordHash, role, designation || '').run()

      return new Response(JSON.stringify({ success: true }), {
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

  // DELETE: Remove User
  if (request.method === 'DELETE') {
    try {
      const id = url.searchParams.get('id')
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing user ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (id === adminUser.id) {
        return new Response(JSON.stringify({ error: 'I mahni account i in delete thei lo!' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()

      return new Response(JSON.stringify({ success: true }), {
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

  // PUT: Update User details (Password Change)
  if (request.method === 'PUT') {
    try {
      const { id, password, designation } = await request.json() as Record<string, string>

      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (password) {
        const passwordHash = await sha256(password)
        await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, id).run()
      }
      if (designation !== undefined) {
        await env.DB.prepare('UPDATE users SET designation = ? WHERE id = ?').bind(designation, id).run()
      }

      return new Response(JSON.stringify({ success: true }), {
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

  return new Response('Method not allowed', { status: 405 })
}
