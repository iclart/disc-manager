import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { updateUser, deleteUser, getUserById } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const userId = parseInt(id)

    const body = await request.json()
    const { username, password } = body

    if (username !== undefined && username.length < 3) {
      return NextResponse.json({ error: '用户名至少3个字符' }, { status: 400 })
    }

    if (password !== undefined && password.length < 6) {
      return NextResponse.json({ error: '密码至少6个字符' }, { status: 400 })
    }

    const user = await updateUser(userId, { username, password })
    return NextResponse.json({ user })
  } catch (error: any) {
    console.error('Update user error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: '用户名已存在' }, { status: 409 })
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const userId = parseInt(id)

    // Check if trying to delete self
    const user = await getUserById(userId)
    if (user && user.username === session.username) {
      return NextResponse.json({ error: '不能删除自己' }, { status: 400 })
    }

    await deleteUser(userId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete user error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 })
  }
}
