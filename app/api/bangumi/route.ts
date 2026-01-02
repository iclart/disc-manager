import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateTotalSize } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const sortField = searchParams.get('sortField')
  const sortOrder = searchParams.get('sortOrder')

  // Build orderBy based on sort parameters
  let orderBy: any = { createdAt: 'desc' }
  if (sortField && sortOrder) {
    const order = sortOrder === 'ascend' ? 'asc' : 'desc'
    if (sortField === 'name') {
      orderBy = { name: order }
    }
  }

  const [bangumiList, total] = await Promise.all([
    prisma.bangumi.findMany({
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
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
    }),
    prisma.bangumi.count(),
  ])

  return NextResponse.json({ data: bangumiList, total, page, pageSize })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, episodes } = body

  const bangumi = await prisma.bangumi.create({
    data: {
      name,
      size: null,
      episodes: episodes
        ? {
            create: episodes.map((e: any) => ({
              season: e.season,
              episode: e.episode,
              size: e.size,
              format: e.format,
              codec: e.codec,
              discId: e.discId,
            })),
          }
        : undefined,
    },
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

  // Calculate total size from episodes
  if (episodes && episodes.length > 0) {
    const totalSize = calculateTotalSize(bangumi.episodes)
    await prisma.bangumi.update({
      where: { id: bangumi.id },
      data: { size: totalSize },
    })
  }

  return NextResponse.json(bangumi)
}
