import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const discId = searchParams.get('discId')
  const sortField = searchParams.get('sortField')
  const sortOrder = searchParams.get('sortOrder')

  const where = discId
    ? { discs: { some: { discId: parseInt(discId) } } }
    : {}

  // Build orderBy based on sort parameters
  let orderBy: any = { createdAt: 'desc' }
  if (sortField && sortOrder) {
    const order = sortOrder === 'ascend' ? 'asc' : 'desc'
    if (sortField === 'name') {
      orderBy = { name: order }
    }
  }

  const [others, total] = await Promise.all([
    prisma.other.findMany({
      where,
      include: {
        discs: {
          include: {
            disc: true,
          },
          orderBy: { burnedAt: 'desc' },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
    }),
    prisma.other.count({ where }),
  ])

  return NextResponse.json({ data: others, total, page, pageSize })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, desc, size, discId, notes } = body

  const other = await prisma.other.create({
    data: {
      name,
      desc,
      size,
      ...(discId
        ? {
            discs: {
              create: {
                discId,
                notes: notes || null,
              },
            },
          }
        : {}),
    },
    include: {
      discs: {
        include: {
          disc: true,
        },
      },
    },
  })

  // Update disc size
  if (discId) {
    await updateDiscSize(discId)
  }

  return NextResponse.json(other)
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
