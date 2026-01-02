import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateTotalSize } from '@/lib/utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { season, episode, size, format, codec } = body

  const episodeData = await prisma.bangumiEpisode.update({
    where: { id: parseInt(id) },
    data: {
      season,
      episode,
      size,
      format,
      codec,
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
  const oldEpisode = await prisma.bangumiEpisode.findUnique({ where: { id: parseInt(id) } })
  if (oldEpisode) {
    const allEpisodes = await prisma.bangumiEpisode.findMany({
      where: { bangumiId: oldEpisode.bangumiId },
    })
    const totalSize = calculateTotalSize(allEpisodes)
    await prisma.bangumi.update({
      where: { id: oldEpisode.bangumiId },
      data: { size: totalSize },
    })
  }

  return NextResponse.json(episodeData)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Get all discs this episode is on to update their sizes
  const episode = await prisma.bangumiEpisode.findUnique({
    where: { id: parseInt(id) },
    include: {
      discs: {
        include: {
          disc: true,
        },
      },
    },
  })

  const bangumiId = episode?.bangumiId
  const discIds = episode?.discs.map((de) => de.disc.id) || []

  await prisma.bangumiEpisode.delete({
    where: { id: parseInt(id) },
  })

  // Update bangumi total size
  if (bangumiId) {
    const allEpisodes = await prisma.bangumiEpisode.findMany({
      where: { bangumiId },
    })
    const totalSize = calculateTotalSize(allEpisodes)
    await prisma.bangumi.update({
      where: { id: bangumiId },
      data: { size: totalSize },
    })
  }

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
