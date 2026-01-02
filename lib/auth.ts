import { prisma } from './prisma'
import argon2 from 'argon2'

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password)
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

// System Config functions
export async function getSystemConfig() {
  let config = await prisma.systemConfig.findUnique({
    where: { id: 1 },
  })

  // Create default config if not exists
  if (!config) {
    config = await prisma.systemConfig.create({
      data: {
        id: 1,
        allowRegistration: true,
      },
    })
  }

  return config
}

export async function updateSystemConfig(data: { allowRegistration?: boolean }) {
  return prisma.systemConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      ...data,
    },
    update: data,
  })
}

export async function isRegistrationAllowed(): Promise<boolean> {
  const config = await getSystemConfig()
  return config.allowRegistration
}

export async function createUser(username: string, password: string) {
  const hashedPassword = await hashPassword(password)
  return prisma.user.create({
    data: {
      username,
      password: hashedPassword,
    },
  })
}

export async function getUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
  })
}

export async function getUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function updateUser(id: number, data: { username?: string; password?: string }) {
  const updateData: any = {}
  if (data.username) updateData.username = data.username
  if (data.password) updateData.password = await hashPassword(data.password)

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      username: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function deleteUser(id: number) {
  return prisma.user.delete({
    where: { id },
  })
}

export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}
