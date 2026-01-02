import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { movieIds, episodeIds, volumeIds, otherIds } = body

    const duplicates: any[] = []

    // Check movies
    if (movieIds && movieIds.length > 0) {
      const existingMovies = await prisma.discMovie.findMany({
        where: { movieId: { in: movieIds } },
        include: {
          disc: true,
          movie: true,
        },
      })

      duplicates.push(
        ...existingMovies.map((em) => ({
          type: 'movie',
          resourceId: em.movieId,
          resourceName: em.movie.name,
          discCode: em.disc.code,
          discId: em.disc.id,
          burnedAt: em.burnedAt,
          notes: em.notes,
        }))
      )
    }

    // Check bangumi episodes
    if (episodeIds && episodeIds.length > 0) {
      const existingEpisodes = await prisma.discBangumiEpisode.findMany({
        where: { bangumiEpisodeId: { in: episodeIds } },
        include: {
          disc: true,
          bangumiEpisode: {
            include: {
              bangumi: true,
            },
          },
        },
      })

      duplicates.push(
        ...existingEpisodes.map((ee) => ({
          type: 'episode',
          resourceId: ee.bangumiEpisodeId,
          resourceName: `${ee.bangumiEpisode.bangumi.name} S${ee.bangumiEpisode.season}E${ee.bangumiEpisode.episode}`,
          discCode: ee.disc.code,
          discId: ee.disc.id,
          burnedAt: ee.burnedAt,
          notes: ee.notes,
        }))
      )
    }

    // Check photo volumes
    if (volumeIds && volumeIds.length > 0) {
      const existingVolumes = await prisma.discPhotoVolume.findMany({
        where: { volumeId: { in: volumeIds } },
        include: {
          disc: true,
          volume: {
            include: {
              photo: true,
            },
          },
        },
      })

      duplicates.push(
        ...existingVolumes.map((ev) => ({
          type: 'volume',
          resourceId: ev.volumeId,
          resourceName: `${ev.volume.photo.name} Vol.${ev.volume.vol}`,
          discCode: ev.disc.code,
          discId: ev.disc.id,
          burnedAt: ev.burnedAt,
          notes: ev.notes,
        }))
      )
    }

    // Check others
    if (otherIds && otherIds.length > 0) {
      const existingOthers = await prisma.discOther.findMany({
        where: { otherId: { in: otherIds } },
        include: {
          disc: true,
          other: true,
        },
      })

      duplicates.push(
        ...existingOthers.map((eo) => ({
          type: 'other',
          resourceId: eo.otherId,
          resourceName: eo.other.name,
          discCode: eo.disc.code,
          discId: eo.disc.id,
          burnedAt: eo.burnedAt,
          notes: eo.notes,
        }))
      )
    }

    return NextResponse.json({ duplicates })
  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 })
  }
}
