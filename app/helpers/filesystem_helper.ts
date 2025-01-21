import app from '@adonisjs/core/services/app'
import type { DriveDisks } from '@adonisjs/drive/types'
import fs from 'node:fs'
import path from 'node:path'
import archiver from 'archiver'

export default class FileSystemHelper {
  public static makeDirectory(inDisk: keyof DriveDisks, inPath: string): string {
    let basePath = app.makePath(`storage/app`)
    if (inDisk === 'fs') {
      basePath = app.makePath(`storage`)
    }
    const directoryPath = path.join(basePath, inDisk, inPath)
    fs.mkdirSync(directoryPath, { recursive: true })

    return directoryPath
  }

  public static path(disk: keyof DriveDisks, filepath?: string): string {
    let basePath = app.makePath(`storage/app`)
    if (disk === 'fs') {
      basePath = app.makePath(`storage`)
    }
    return path.join(basePath, disk, filepath || '')
  }

  public static async zip(baseFolderPath: string, zipFileName: string) {
    const output = fs.createWriteStream(path.join(baseFolderPath, zipFileName))

    const archive = archiver('zip', {
      zlib: { level: 9 },
    })

    archive.on('error', (err) => {
      throw new Error(err.data as string)
    })

    archive.pipe(output)

    archive.directory(baseFolderPath, false)

    await archive.finalize()
  }

  public static fileExtension(filename: string): string {
    return filename.split('.').pop() || ''
  }
}
