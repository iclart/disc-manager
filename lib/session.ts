import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'session'
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface Session {
  userId: number
  username: string
  expires: number
}

export async function createSession(userId: number, username: string): Promise<void> {
  const cookieStore = await cookies()
  const session: Session = {
    userId,
    username,
    expires: Date.now() + SESSION_DURATION,
  }

  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  })
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie) return null

  try {
    const session: Session = JSON.parse(sessionCookie.value)

    // Check if session is expired
    if (Date.now() > session.expires) {
      await deleteSession()
      return null
    }

    return session
  } catch {
    return null
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}
