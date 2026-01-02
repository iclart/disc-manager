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

  const [photoList, total] = await Promise.all([
    prisma.photo.findMany({
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
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
    }),
    prisma.photo.count(),
  ])

  return NextResponse.json({ data: photoList, total, page, pageSize })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, volumes } = body

  const photo = await prisma.photo.create({
    data: {
      name,
      size: null,
      volumes: volumes
        ? {
            create: volumes.map((v: any) => ({
              vol: v.vol,
              size: v.size,
              discId: v.discId,
            })),
          }
        : undefined,
    },
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

  // Calculate total size from volumes
  if (volumes && volumes.length > 0) {
    const totalSize = calculateTotalSize(photo.volumes)
    await prisma.photo.update({
      where: { id: photo.id },
      data: { size: totalSize },
    })
  }

  return NextResponse.json(photo)
}
