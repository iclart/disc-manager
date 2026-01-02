import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getSystemConfig, updateSystemConfig } from '@/lib/auth'

export async function GET() {
  try {
    const config = await getSystemConfig()
    return NextResponse.json({ config })
  } catch (error) {
    console.error('Get system config error:', error)
    return NextResponse.json({ error: '获取系统配置失败' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { allowRegistration } = body

    if (typeof allowRegistration !== 'boolean') {
      return NextResponse.json({ error: '无效的参数' }, { status: 400 })
    }

    const config = await updateSystemConfig({ allowRegistration })
    return NextResponse.json({ config })
  } catch (error) {
    console.error('Update system config error:', error)
    return NextResponse.json({ error: '更新系统配置失败' }, { status: 500 })
  }
}
