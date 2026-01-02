import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateTotalSize } from '@/lib/utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { vol, size, discId, notes } = body

  const volume = await prisma.photoVolume.create({
    data: {
      vol: typeof vol === 'string' ? parseInt(vol) : vol,
      size,
      photoId: parseInt(id),
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
      photo: true,
    },
  })

  // Update photo total size
  const allVolumes = await prisma.photoVolume.findMany({
    where: { photoId: parseInt(id) },
  })
  const totalSize = calculateTotalSize(allVolumes)
  await prisma.photo.update({
    where: { id: parseInt(id) },
    data: { size: totalSize },
  })

  // Update disc size if applicable
  if (discId) {
    await updateDiscSize(discId)
  }

  return NextResponse.json(volume)
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
