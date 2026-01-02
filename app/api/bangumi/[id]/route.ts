import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateTotalSize } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const bangumi = await prisma.bangumi.findUnique({
    where: { id: parseInt(id) },
    include: {
      episodes: {
        include: {
          discs: {
            include: {
              disc: true,
            },
          },
        },
      },
    },
  })

  if (!bangumi) {
    return NextResponse.json({ error: 'Bangumi not found' }, { status: 404 })
  }

  return NextResponse.json(bangumi)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { name } = body

  const bangumi = await prisma.bangumi.update({
    where: { id: parseInt(id) },
    data: { name },
    include: {
      episodes: true,
    },
  })

  return NextResponse.json(bangumi)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // This will cascade delete all episodes
  await prisma.bangumi.delete({
    where: { id: parseInt(id) },
  })

  return NextResponse.json({ success: true })
}
