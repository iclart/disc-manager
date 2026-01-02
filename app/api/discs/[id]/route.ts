import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const disc = await prisma.disc.findUnique({
    where: { id: parseInt(id) },
    include: {
      movies: {
        include: {
          movie: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      bangumiEpisodes: {
        include: {
          bangumiEpisode: {
            include: {
              bangumi: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      photoVolumes: {
        include: {
          volume: {
            include: {
              photo: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      others: {
        include: {
          other: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      history: {
        orderBy: { date: 'desc' },
      },
    },
  })

  if (!disc) {
    return NextResponse.json({ error: 'Disc not found' }, { status: 404 })
  }

  return NextResponse.json(disc)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { type, size } = body

  const disc = await prisma.disc.update({
    where: { id: parseInt(id) },
    data: {
      type,
      size: size !== undefined ? size : undefined,
    },
  })

  return NextResponse.json(disc)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  await prisma.disc.delete({
    where: { id: parseInt(id) },
  })

  return NextResponse.json({ success: true })
}
