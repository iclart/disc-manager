import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const history = await prisma.discHistory.findMany({
    where: { discId: parseInt(id) },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(history)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { date, status, desc } = body

  const history = await prisma.discHistory.create({
    data: {
      discId: parseInt(id),
      date: new Date(date),
      status,
      desc,
    },
  })

  return NextResponse.json(history)
}
