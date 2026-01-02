import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateDiscCode, calculateTotalSize } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const type = searchParams.get('type')
  const sortField = searchParams.get('sortField')
  const sortOrder = searchParams.get('sortOrder')

  const where = type ? { type } : {}

  // Build orderBy based on sort parameters
  let orderBy: any = { createdAt: 'desc' }
  if (sortField && sortOrder) {
    const order = sortOrder === 'ascend' ? 'asc' : 'desc'
    if (sortField === 'code') {
      orderBy = { code: order }
    } else if (sortField === 'createdAt') {
      orderBy = { createdAt: order }
    }
  }

  const [discs, total] = await Promise.all([
    prisma.disc.findMany({
      where,
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
          take: 1,
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
    }),
    prisma.disc.count({ where }),
  ])

  return NextResponse.json({ data: discs, total, page, pageSize })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    type,
    size: sizeStr,
    selectedMovieIds,
    movieNotes,
    movies,
    selectedEpisodeIds,
    episodeNotes,
    bangumiEpisodes,
    newBangumi,
    selectedVolumeIds,
    volumeNotes,
    photoVolumes,
    newPhotos,
    selectedOtherIds,
    otherNotes,
    others
  } = body

  // Generate unique disc code
  let code = generateDiscCode()
  while (await prisma.disc.findUnique({ where: { code } })) {
    code = generateDiscCode()
  }

  // Convert size to KiB if provided
  let size: number | null = null
  if (sizeStr) {
    const match = sizeStr.toString().trim().match(/^([\d.]+)(GiB|MiB|KiB)$/i)
    if (match) {
      const value = parseFloat(match[1])
      const unit = match[2].toUpperCase()
      switch (unit) {
        case 'GiB':
          size = Math.round(value * 1024 * 1024)
          break
        case 'MiB':
          size = Math.round(value * 1024)
          break
        case 'KiB':
          size = Math.round(value)
          break
      }
    }
  }

  // Collect all resource sizes for auto-calculation
  const allResourceSizes: number[] = []

  // Process sizes from new resources
  if (movies) {
    movies.forEach((m: any) => {
      if (m.sizeValue !== undefined && m.sizeValue !== null && m.sizeUnit) {
        const value = parseFloat(m.sizeValue)
        switch (m.sizeUnit) {
          case 'GiB': allResourceSizes.push(Math.round(value * 1024 * 1024)); break
          case 'MiB': allResourceSizes.push(Math.round(value * 1024)); break
          case 'KiB': allResourceSizes.push(Math.round(value)); break
        }
      }
    })
  }

  if (bangumiEpisodes) {
    bangumiEpisodes.forEach((e: any) => {
      if (e.sizeValue !== undefined && e.sizeValue !== null && e.sizeUnit) {
        const value = parseFloat(e.sizeValue)
        switch (e.sizeUnit) {
          case 'GiB': allResourceSizes.push(Math.round(value * 1024 * 1024)); break
          case 'MiB': allResourceSizes.push(Math.round(value * 1024)); break
          case 'KiB': allResourceSizes.push(Math.round(value)); break
        }
      }
    })
  }

  // Process sizes from new bangumi with episodes
  if (newBangumi) {
    newBangumi.forEach((b: any) => {
      if (b.episodes) {
        b.episodes.forEach((ep: any) => {
          if (ep.sizeValue !== undefined && ep.sizeValue !== null && ep.sizeUnit) {
            const value = parseFloat(ep.sizeValue)
            switch (ep.sizeUnit) {
              case 'GiB': allResourceSizes.push(Math.round(value * 1024 * 1024)); break
              case 'MiB': allResourceSizes.push(Math.round(value * 1024)); break
              case 'KiB': allResourceSizes.push(Math.round(value)); break
            }
          }
        })
      }
    })
  }

  if (photoVolumes) {
    photoVolumes.forEach((v: any) => {
      if (v.sizeValue !== undefined && v.sizeValue !== null && v.sizeUnit) {
        const value = parseFloat(v.sizeValue)
        switch (v.sizeUnit) {
          case 'GiB': allResourceSizes.push(Math.round(value * 1024 * 1024)); break
          case 'MiB': allResourceSizes.push(Math.round(value * 1024)); break
          case 'KiB': allResourceSizes.push(Math.round(value)); break
        }
      }
    })
  }

  // Process sizes from new photos with volumes
  if (newPhotos) {
    newPhotos.forEach((p: any) => {
      if (p.volumes) {
        p.volumes.forEach((v: any) => {
          if (v.sizeValue !== undefined && v.sizeValue !== null && v.sizeUnit) {
            const value = parseFloat(v.sizeValue)
            switch (v.sizeUnit) {
              case 'GiB': allResourceSizes.push(Math.round(value * 1024 * 1024)); break
              case 'MiB': allResourceSizes.push(Math.round(value * 1024)); break
              case 'KiB': allResourceSizes.push(Math.round(value)); break
            }
          }
        })
      }
    })
  }

  if (others) {
    others.forEach((o: any) => {
      if (o.sizeValue !== undefined && o.sizeValue !== null && o.sizeUnit) {
        const value = parseFloat(o.sizeValue)
        switch (o.sizeUnit) {
          case 'GiB': allResourceSizes.push(Math.round(value * 1024 * 1024)); break
          case 'MiB': allResourceSizes.push(Math.round(value * 1024)); break
          case 'KiB': allResourceSizes.push(Math.round(value)); break
        }
      }
    })
  }

  // Add sizes from selected existing resources
  if (selectedMovieIds && selectedMovieIds.length > 0) {
    const selectedMovies = await prisma.movie.findMany({
      where: { id: { in: selectedMovieIds } },
    })
    selectedMovies.forEach(m => {
      if (m.size) allResourceSizes.push(m.size)
    })
  }

  if (selectedEpisodeIds && selectedEpisodeIds.length > 0) {
    const selectedEpisodes = await prisma.bangumiEpisode.findMany({
      where: { id: { in: selectedEpisodeIds } },
    })
    selectedEpisodes.forEach(e => {
      if (e.size) allResourceSizes.push(e.size)
    })
  }

  if (selectedVolumeIds && selectedVolumeIds.length > 0) {
    const selectedVolumes = await prisma.photoVolume.findMany({
      where: { id: { in: selectedVolumeIds } },
    })
    selectedVolumes.forEach(v => {
      if (v.size) allResourceSizes.push(v.size)
    })
  }

  if (selectedOtherIds && selectedOtherIds.length > 0) {
    const selectedOthers = await prisma.other.findMany({
      where: { id: { in: selectedOtherIds } },
    })
    selectedOthers.forEach(o => {
      if (o.size) allResourceSizes.push(o.size)
    })
  }

  // Calculate total size if not provided
  if (size === null || size === undefined) {
    if (allResourceSizes.length > 0) {
      size = allResourceSizes.reduce((sum, s) => sum + s, 0)
    }
  }

  // Create the disc
  const disc = await prisma.disc.create({
    data: {
      code,
      type,
      size,
    },
  })

  // Link selected existing resources via junction tables
  if (selectedMovieIds && selectedMovieIds.length > 0) {
    await prisma.discMovie.createMany({
      data: selectedMovieIds.map((movieId: number) => ({
        discId: disc.id,
        movieId,
        notes: movieNotes?.[movieId] || null,
      })),
    })
  }

  if (selectedEpisodeIds && selectedEpisodeIds.length > 0) {
    await prisma.discBangumiEpisode.createMany({
      data: selectedEpisodeIds.map((episodeId: number) => ({
        discId: disc.id,
        bangumiEpisodeId: episodeId,
        notes: episodeNotes?.[episodeId] || null,
      })),
    })
  }

  if (selectedVolumeIds && selectedVolumeIds.length > 0) {
    await prisma.discPhotoVolume.createMany({
      data: selectedVolumeIds.map((volumeId: number) => ({
        discId: disc.id,
        volumeId,
        notes: volumeNotes?.[volumeId] || null,
      })),
    })
  }

  if (selectedOtherIds && selectedOtherIds.length > 0) {
    await prisma.discOther.createMany({
      data: selectedOtherIds.map((otherId: number) => ({
        discId: disc.id,
        otherId,
        notes: otherNotes?.[otherId] || null,
      })),
    })
  }

  // Create new resources
  if (movies && movies.length > 0) {
    for (const m of movies) {
      let movieSize: number | null = null
      if (m.sizeValue !== undefined && m.sizeValue !== null && m.sizeUnit) {
        const value = parseFloat(m.sizeValue)
        switch (m.sizeUnit) {
          case 'GiB':
            movieSize = Math.round(value * 1024 * 1024)
            break
          case 'MiB':
            movieSize = Math.round(value * 1024)
            break
          case 'KiB':
            movieSize = Math.round(value)
            break
        }
      }
      const movie = await prisma.movie.create({
        data: {
          name: m.name,
          size: movieSize,
          format: m.format,
          codec: m.codec,
        },
      })
      // Link to disc
      await prisma.discMovie.create({
        data: {
          discId: disc.id,
          movieId: movie.id,
          notes: m.notes || null,
        },
      })
    }
  }

  if (bangumiEpisodes && bangumiEpisodes.length > 0) {
    for (const ep of bangumiEpisodes) {
      let episodeSize: number | null = null
      if (ep.sizeValue !== undefined && ep.sizeValue !== null && ep.sizeUnit) {
        const value = parseFloat(ep.sizeValue)
        switch (ep.sizeUnit) {
          case 'GiB':
            episodeSize = Math.round(value * 1024 * 1024)
            break
          case 'MiB':
            episodeSize = Math.round(value * 1024)
            break
          case 'KiB':
            episodeSize = Math.round(value)
            break
        }
      }

      // Create episode and link to bangumi
      const episode = await prisma.bangumiEpisode.create({
        data: {
          season: ep.season,
          episode: ep.episode,
          size: episodeSize,
          format: ep.format,
          codec: ep.codec,
          bangumiId: ep.bangumiId,
        },
      })
      // Link to disc
      await prisma.discBangumiEpisode.create({
        data: {
          discId: disc.id,
          bangumiEpisodeId: episode.id,
          notes: ep.notes || null,
        },
      })
    }
  }

  // Create new bangumi with episodes
  if (newBangumi && newBangumi.length > 0) {
    for (const b of newBangumi) {
      // Create the bangumi
      const bangumi = await prisma.bangumi.create({
        data: {
          name: b.name,
          size: null, // Will be calculated from episodes
        },
      })

      // Create episodes for this bangumi
      if (b.episodes && b.episodes.length > 0) {
        for (const ep of b.episodes) {
          let episodeSize: number | null = null
          if (ep.sizeValue !== undefined && ep.sizeValue !== null && ep.sizeUnit) {
            const value = parseFloat(ep.sizeValue)
            switch (ep.sizeUnit) {
              case 'GiB':
                episodeSize = Math.round(value * 1024 * 1024)
                break
              case 'MiB':
                episodeSize = Math.round(value * 1024)
                break
              case 'KiB':
                episodeSize = Math.round(value)
                break
            }
          }

          const episode = await prisma.bangumiEpisode.create({
            data: {
              season: ep.season,
              episode: ep.episode,
              size: episodeSize,
              format: ep.format,
              codec: ep.codec,
              bangumiId: bangumi.id,
            },
          })
          // Link to disc
          await prisma.discBangumiEpisode.create({
            data: {
              discId: disc.id,
              bangumiEpisodeId: episode.id,
              notes: ep.notes || null,
            },
          })
        }

        // Calculate and update bangumi size
        const episodes = await prisma.bangumiEpisode.findMany({
          where: { bangumiId: bangumi.id },
        })
        const totalSize = calculateTotalSize(episodes)
        await prisma.bangumi.update({
          where: { id: bangumi.id },
          data: { size: totalSize },
        })
      }
    }
  }

  if (photoVolumes && photoVolumes.length > 0) {
    for (const vol of photoVolumes) {
      let volumeSize: number | null = null
      if (vol.sizeValue !== undefined && vol.sizeValue !== null && vol.sizeUnit) {
        const value = parseFloat(vol.sizeValue)
        switch (vol.sizeUnit) {
          case 'GiB':
            volumeSize = Math.round(value * 1024 * 1024)
            break
          case 'MiB':
            volumeSize = Math.round(value * 1024)
            break
          case 'KiB':
            volumeSize = Math.round(value)
            break
        }
      }

      const volume = await prisma.photoVolume.create({
        data: {
          vol: vol.vol,
          size: volumeSize,
          photoId: vol.photoId,
        },
      })
      // Link to disc
      await prisma.discPhotoVolume.create({
        data: {
          discId: disc.id,
          volumeId: volume.id,
          notes: vol.notes || null,
        },
      })
    }
  }

  // Create new photos with volumes
  if (newPhotos && newPhotos.length > 0) {
    for (const p of newPhotos) {
      // Create the photo
      const photo = await prisma.photo.create({
        data: {
          name: p.name,
          size: null, // Will be calculated from volumes
        },
      })

      // Create volumes for this photo
      if (p.volumes && p.volumes.length > 0) {
        for (const vol of p.volumes) {
          let volumeSize: number | null = null
          if (vol.sizeValue !== undefined && vol.sizeValue !== null && vol.sizeUnit) {
            const value = parseFloat(vol.sizeValue)
            switch (vol.sizeUnit) {
              case 'GiB':
                volumeSize = Math.round(value * 1024 * 1024)
                break
              case 'MiB':
                volumeSize = Math.round(value * 1024)
                break
              case 'KiB':
                volumeSize = Math.round(value)
                break
            }
          }

          const volume = await prisma.photoVolume.create({
            data: {
              vol: vol.vol,
              size: volumeSize,
              photoId: photo.id,
            },
          })
          // Link to disc
          await prisma.discPhotoVolume.create({
            data: {
              discId: disc.id,
              volumeId: volume.id,
              notes: vol.notes || null,
            },
          })
        }

        // Calculate and update photo size
        const volumes = await prisma.photoVolume.findMany({
          where: { photoId: photo.id },
        })
        const totalSize = calculateTotalSize(volumes)
        await prisma.photo.update({
          where: { id: photo.id },
          data: { size: totalSize },
        })
      }
    }
  }

  if (others && others.length > 0) {
    for (const o of others) {
      let otherSize: number | null = null
      if (o.sizeValue !== undefined && o.sizeValue !== null && o.sizeUnit) {
        const value = parseFloat(o.sizeValue)
        switch (o.sizeUnit) {
          case 'GiB':
            otherSize = Math.round(value * 1024 * 1024)
            break
          case 'MiB':
            otherSize = Math.round(value * 1024)
            break
          case 'KiB':
            otherSize = Math.round(value)
            break
        }
      }

      const other = await prisma.other.create({
        data: {
          name: o.name,
          desc: o.desc,
          size: otherSize,
        },
      })
      // Link to disc
      await prisma.discOther.create({
        data: {
          discId: disc.id,
          otherId: other.id,
          notes: o.notes || null,
        },
      })
    }
  }

  // Update Bangumi and Photo sizes
  const finalDisc = await prisma.disc.findUnique({
    where: { id: disc.id },
    include: {
      movies: {
        include: {
          movie: true,
        },
      },
      bangumiEpisodes: {
        include: {
          bangumiEpisode: {
            include: {
              bangumi: true,
            },
          },
        },
      },
      photoVolumes: {
        include: {
          volume: {
            include: {
              photo: true,
            },
          },
        },
      },
      others: {
        include: {
          other: true,
        },
      },
    },
  })

  if (finalDisc?.bangumiEpisodes) {
    const bangumiIds = [...new Set(finalDisc.bangumiEpisodes.map(e => e.bangumiEpisode.bangumiId))]
    for (const bangumiId of bangumiIds) {
      const episodes = await prisma.bangumiEpisode.findMany({
        where: { bangumiId },
      })
      const totalSize = calculateTotalSize(episodes)
      await prisma.bangumi.update({
        where: { id: bangumiId },
        data: { size: totalSize },
      })
    }
  }

  if (finalDisc?.photoVolumes) {
    const photoIds = [...new Set(finalDisc.photoVolumes.map(v => v.volume.photoId))]
    for (const photoId of photoIds) {
      const volumes = await prisma.photoVolume.findMany({
        where: { photoId },
      })
      const totalSize = calculateTotalSize(volumes)
      await prisma.photo.update({
        where: { id: photoId },
        data: { size: totalSize },
      })
    }
  }

  // Create default inspection record (status: good) for new disc
  await prisma.discHistory.create({
    data: {
      discId: disc.id,
      date: new Date(),
      status: true,
      desc: '新建光盘',
    },
  })

  return NextResponse.json(finalDisc)
}
