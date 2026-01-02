import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const photo = await prisma.photo.findUnique({
    where: { id: parseInt(id) },
    include: {
      volumes: {
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

  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  return NextResponse.json(photo)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { name } = body

  const photo = await prisma.photo.update({
    where: { id: parseInt(id) },
    data: { name },
    include: {
      volumes: true,
    },
  })

  return NextResponse.json(photo)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // This will cascade delete all volumes
  await prisma.photo.delete({
    where: { id: parseInt(id) },
  })

  return NextResponse.json({ success: true })
}
