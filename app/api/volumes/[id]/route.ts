import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateTotalSize } from '@/lib/utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { vol, size } = body

  const volume = await prisma.photoVolume.update({
    where: { id: parseInt(id) },
    data: {
      vol,
      size,
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
  const oldVolume = await prisma.photoVolume.findUnique({ where: { id: parseInt(id) } })
  if (oldVolume) {
    const allVolumes = await prisma.photoVolume.findMany({
      where: { photoId: oldVolume.photoId },
    })
    const totalSize = calculateTotalSize(allVolumes)
    await prisma.photo.update({
      where: { id: oldVolume.photoId },
      data: { size: totalSize },
    })
  }

  return NextResponse.json(volume)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Get all discs this volume is on to update their sizes
  const volume = await prisma.photoVolume.findUnique({
    where: { id: parseInt(id) },
    include: {
      discs: {
        include: {
          disc: true,
        },
      },
    },
  })

  const photoId = volume?.photoId
  const discIds = volume?.discs.map((dv) => dv.disc.id) || []

  await prisma.photoVolume.delete({
    where: { id: parseInt(id) },
  })

  // Update photo total size
  if (photoId) {
    const allVolumes = await prisma.photoVolume.findMany({
      where: { photoId },
    })
    const totalSize = calculateTotalSize(allVolumes)
    await prisma.photo.update({
      where: { id: photoId },
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
