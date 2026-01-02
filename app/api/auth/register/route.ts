import { NextRequest, NextResponse } from 'next/server'
import { getUserByUsername, createUser, isRegistrationAllowed } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Check if registration is allowed
    const allowRegistration = await isRegistrationAllowed()
    if (!allowRegistration) {
      return NextResponse.json({ error: '注册功能已关闭' }, { status: 403 })
    }

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 })
    }

    if (username.length < 3) {
      return NextResponse.json({ error: '用户名至少3个字符' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少6个字符' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await getUserByUsername(username)
    if (existingUser) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 409 })
    }

    // Create user
    const user = await createUser(username, password)

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: '注册失败' }, { status: 500 })
  }
}
