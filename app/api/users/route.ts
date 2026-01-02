import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAllUsers, createUser } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const users = await getAllUsers()
    return NextResponse.json({ data: users })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
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

    const user = await createUser(username, password)
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Create user error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: '用户名已存在' }, { status: 409 })
    }
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 })
  }
}
