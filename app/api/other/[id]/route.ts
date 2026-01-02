import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const other = await prisma.other.findUnique({
    where: { id: parseInt(id) },
    include: {
      discs: {
        include: {
          disc: true,
        },
        orderBy: { burnedAt: 'desc' },
      },
    },
  })

  if (!other) {
    return NextResponse.json({ error: 'Other not found' }, { status: 404 })
  }

  return NextResponse.json(other)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { name, desc, size } = body

  const other = await prisma.other.update({
    where: { id: parseInt(id) },
    data: {
      name,
      desc,
      size,
    },
    include: {
      discs: {
        include: {
          disc: true,
        },
      },
    },
  })

  return NextResponse.json(other)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Get all discs this other resource is on to update their sizes
  const other = await prisma.other.findUnique({
    where: { id: parseInt(id) },
    include: {
      discs: {
        include: {
          disc: true,
        },
      },
    },
  })

  const discIds = other?.discs.map((do_) => do_.disc.id) || []

  await prisma.other.delete({
    where: { id: parseInt(id) },
  })

  // Update all affected disc sizes
  for (const discId of discIds) {
    await updateDiscSize(discId)
  }

  return NextResponse.json({ success: true })
}

async function updateDiscSize(discId: number) {
  const disc = await prisma.disc.findUnique({
    where: { id: discId },
    include: {
      movies: {
        include: {
          movie: true,
        },
      },
      bangumiEpisodes: {
        include: {
          bangumiEpisode: true,
        },
      },
      photoVolumes: {
        include: {
          volume: true,
        },
      },
      others: {
        include: {
          other: true,
        },
      },
    },
  })

  if (!disc) return

  const allSizes = [
    ...disc.movies.map((dm) => dm.movie.size),
    ...disc.bangumiEpisodes.map((de) => de.bangumiEpisode.size),
    ...disc.photoVolumes.map((dv) => dv.volume.size),
    ...disc.others.map((do_) => do_.other.size),
  ].filter((s): s is number => s !== null && s !== undefined)

  const totalSize = allSizes.length > 0 ? allSizes.reduce((sum, s) => sum + s, 0) : null

  await prisma.disc.update({
    where: { id: discId },
    data: { size: totalSize },
  })
}
