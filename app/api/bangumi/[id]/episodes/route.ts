import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateTotalSize } from '@/lib/utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { season, episode, size, format, codec, discId, notes } = body

  const episodeData = await prisma.bangumiEpisode.create({
    data: {
      season,
      episode: typeof episode === 'string' ? parseInt(episode) : episode,
      size,
      format,
      codec,
      bangumiId: parseInt(id),
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
      bangumi: true,
    },
  })

  // Update bangumi total size
  const allEpisodes = await prisma.bangumiEpisode.findMany({
    where: { bangumiId: parseInt(id) },
  })
  const totalSize = calculateTotalSize(allEpisodes)
  await prisma.bangumi.update({
    where: { id: parseInt(id) },
    data: { size: totalSize },
  })

  // Update disc size if applicable
  if (discId) {
    await updateDiscSize(discId)
  }

  return NextResponse.json(episodeData)
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
