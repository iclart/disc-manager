/**
 * Convert a size string (e.g., "1.5GiB", "512MiB", "2048KiB") to KiB
 */
export function sizeToKiB(sizeStr: string): number {
  const match = sizeStr.trim().match(/^([\d.]+)(GiB|MiB|KiB)$/i)
  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}. Use format like "1.5GiB", "512MiB", "2048KiB"`)
  }

  const value = parseFloat(match[1])
  const unit = match[2].toUpperCase()

  switch (unit) {
    case 'GiB':
      return Math.round(value * 1024 * 1024)
    case 'MiB':
      return Math.round(value * 1024)
    case 'KiB':
      return Math.round(value)
    default:
      throw new Error(`Unknown size unit: ${unit}`)
  }
}

/**
 * Convert KiB to a human-readable string (MiB or GiB with 2 decimal places)
 */
export function formatSize(kib: number | null | undefined): string {
  if (kib === null || kib === undefined) {
    return '-'
  }

  const gib = kib / (1024 * 1024)
  if (gib >= 1) {
    return `${gib.toFixed(2)} GiB`
  }

  const mib = kib / 1024
  if (mib >= 1) {
    return `${mib.toFixed(2)} MiB`
  }

  return `${kib} KiB`
}

/**
 * Suggested size units for input
 */
export const SIZE_UNITS = [
  { label: 'KiB', value: 'KiB' },
  { label: 'MiB', value: 'MiB' },
  { label: 'GiB', value: 'GiB' },
]

/**
 * Disc types supported
 */
export const DISC_TYPES = [
  { label: 'CD-R', value: 'CD-R' },
  { label: 'CD-RW', value: 'CD-RW' },
  { label: 'DVD-R', value: 'DVD-R' },
  { label: 'DVD-RW', value: 'DVD-RW' },
  { label: 'DVD+R', value: 'DVD+R' },
  { label: 'DVD+RW', value: 'DVD+RW' },
  { label: 'DVD-R/DL', value: 'DVD-R/DL' },
  { label: 'DVD+R/DL', value: 'DVD+R/DL' },
  { label: 'BD-R', value: 'BD-R' },
  { label: 'BD-RE', value: 'BD-RE' },
  { label: 'BD-R/DL', value: 'BD-R/DL' },
  { label: 'BD-RE/DL', value: 'BD-RE/DL' },
  { label: 'BD-R/TL', value: 'BD-R/TL' },
  { label: 'BD-RE/TL', value: 'BD-RE/TL' },
  { label: 'BD-R/QL', value: 'BD-R/QL' },
  { label: 'BD-RE/QL', value: 'BD-RE/QL' },
]

/**
 * Common file formats
 */
export const FILE_FORMATS = [
  { label: 'MKV', value: 'MKV' },
  { label: 'MP4', value: 'MP4' },
  { label: 'WebM', value: 'WebM' },
  { label: 'AVI', value: 'AVI' },
  { label: 'ISO', value: 'ISO' },
]

/**
 * Common video codecs
 */
export const VIDEO_CODECS = [
  { label: 'H.264', value: 'H.264' },
  { label: 'H.265', value: 'H.265' },
  { label: 'VP9', value: 'VP9' },
  { label: 'AV1', value: 'AV1' },
  { label: 'MPEG-2', value: 'MPEG-2' },
]

/**
 * Generate a unique 6-character alphanumeric disc code (uppercase)
 */
export function generateDiscCode(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Calculate total size from a list of items with optional size property
 */
export function calculateTotalSize<T extends { size?: number | null }>(items: T[]): number | null {
  const validSizes = items.map(item => item.size).filter((s): s is number => s !== null && s !== undefined)
  if (validSizes.length === 0) {
    return null
  }
  return validSizes.reduce((sum, size) => sum + size, 0)
}
