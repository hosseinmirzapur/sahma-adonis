import ffmpeg from 'fluent-ffmpeg'
import tmp from 'tmp'
import fs from 'node:fs'
import { promisify } from 'node:util'
import { cuid } from '@adonisjs/core/helpers'
import drive from '@adonisjs/drive/services/main'
import app from '@adonisjs/core/services/app'

const writeFile = promisify(fs.writeFile)

export default class AudioHelper {
  /**
   * Get WAV duration and metadata
   */
  public static async getWavDurationAndMetaData(
    filename: string,
    audioData: Buffer
  ): Promise<{ duration: number; metadata: any }> {
    const duration = await this.getAudioDuration(filename, audioData)
    const metadata = await this.getWavMetaData(audioData)
    return { duration, metadata }
  }

  /**
   * Get audio duration
   */
  public static async getAudioDuration(filename: string, audioData: Buffer): Promise<number> {
    const extension = filename.split('.').pop()?.toLowerCase()
    if (extension === 'ogg' || extension === 'mp4') {
      return this.getAudioDurationByFfmpeg(filename, audioData)
    }

    const tmpFile = tmp.fileSync({ postfix: `.${extension}` })
    await writeFile(tmpFile.name, audioData)

    try {
      const duration = await this.getDurationUsingFfprobe(tmpFile.name)
      return duration
    } finally {
      tmpFile.removeCallback()
    }
  }

  /**
   * Get audio duration using FFmpeg
   */
  public static async getAudioDurationByFfmpeg(
    filename: string,
    audioData: Buffer | string
  ): Promise<number> {
    const tmpFile = tmp.fileSync({ postfix: `.${filename.split('.').pop()}` })
    await writeFile(tmpFile.name, audioData)

    try {
      const duration = await this.getDurationUsingFfprobe(tmpFile.name)
      return duration
    } finally {
      tmpFile.removeCallback()
    }
  }

  /**
   * Get duration using FFprobe
   */
  private static async getDurationUsingFfprobe(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error('Failed to get audio duration'))
        } else {
          resolve(metadata.format.duration || 0)
        }
      })
    })
  }

  /**
   * Get WAV metadata
   */
  public static async getWavMetaData(audioData: Buffer): Promise<any> {
    const tmpFile = tmp.fileSync({ postfix: `.wav` })
    await writeFile(tmpFile.name, audioData)

    try {
      const metadata = await this.getMetadataUsingFfprobe(tmpFile.name)
      return metadata
    } finally {
      tmpFile.removeCallback()
    }
  }

  /**
   * Get metadata using FFprobe
   */
  private static async getMetadataUsingFfprobe(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error('Failed to get metadata'))
        } else {
          resolve(metadata.streams[0] || {})
        }
      })
    })
  }

  /**
   * Get max possible audio duration for text
   */
  public static getMaxPossibleAudioDurationForText(text: string): number {
    const words = text.trim().split(' ')
    let totalDuration = 0

    for (const word of words) {
      if (word.length > 2) {
        totalDuration += 1.2
      } else {
        totalDuration += 0.8
      }
    }

    return totalDuration <= 4 ? 4 : totalDuration
  }

  /**
   * Convert voice to MP3
   */
  public static async voiceConvertToMp3(
    audioData: Buffer,
    start?: number,
    end?: number
  ): Promise<any> {
    const tempFileName = `temp/${cuid()}.wav`
    const outputFileName = `temp/${cuid()}.mp3`

    // Save the temporary WAV file
    await drive.use('voice').put(tempFileName, audioData)

    // Get full paths
    const tempFilePath = app.tmpPath(tempFileName)
    const outputFilePath = app.tmpPath(outputFileName)

    // Convert to MP3 using FFmpeg
    await new Promise((resolve, reject) => {
      const command = ffmpeg(tempFilePath).output(outputFilePath).audioCodec('libmp3lame')

      if (start !== undefined && end !== undefined) {
        command.setStartTime(start).setDuration(end - start)
      }

      command.on('end', resolve).on('error', reject).run()
    })

    // Read the converted MP3 file
    const mp3Data = await drive.use('voice').get(outputFileName)

    // Clean up temporary files
    await drive.use('voice').delete(tempFileName)
    await drive.use('voice').delete(outputFileName)

    return mp3Data
  }
}
