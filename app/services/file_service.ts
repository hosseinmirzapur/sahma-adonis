import Department from '#models/department'
import User from '#models/user'
import { ActivityService } from '#services/activity_service'
import { inject } from '@adonisjs/core'
import { MultipartFile } from '@adonisjs/core/bodyparser'
import { Exception } from '@adonisjs/core/exceptions'
import logger from '@adonisjs/core/services/logger'
import drive from '@adonisjs/drive/services/main'
import { DateTime } from 'luxon'
import { createReadStream, unlinkSync, writeFileSync } from 'node:fs'
import { PdfInfoService } from '#services/pdf_info_service'
import db from '@adonisjs/lucid/services/db'
import EntityGroup from '#models/entity_group'
import app from '@adonisjs/core/services/app'
import FileSystemHelper from '#helper/filesystem_helper'
import DepartmentFile from '#models/department_file'
import Activity from '#models/activity'
import SubmitFileToOcrJob from '#jobs/submit_file_to_ocr_job'
import Queue from '@rlanz/bull-queue/services/main'
import AudioHelper from '#helper/audio_helper'
import ConvertVoiceToWavJob from '#jobs/convert_voice_to_wav_job'
import SubmitVoiceToSplitterJob from '#jobs/submit_voice_to_splitter_job'
import sharp from 'sharp'
import ExtractVoiceFromVideoJob from '#jobs/extract_voice_from_video_job'
import path, { dirname } from 'node:path'
import CliHelper from '#helper/cli_helper'
import { HttpContext } from '@adonisjs/core/http'
import config from '@adonisjs/core/services/config'
import vine from '@vinejs/vine'
import ConfigHelper from '#helper/config_helper'
import fs from 'node:fs'
import csv from 'csv-parser'
import StringHelper from '#helper/string_helpers'
import Entity from '#models/entity'

@inject()
export class FileService {
  constructor(protected readonly activityService: ActivityService) {}

  public async storePdf(
    user: User,
    pdf: MultipartFile,
    departments: Department[],
    parentFolderId: number | null
  ) {
    const bookOriginalFileName = pdf.clientName
    const extension = pdf.extname?.slice(1)

    const nowDate = DateTime.now().toISODate()
    const now = DateTime.now().toMillis() / 1000
    const hash = StringHelper.hashWithAlgo('sha3-256', pdf.clientName)
    const fileName = `${hash}-${now}-${extension}`
    const originalPdfPath = `/${nowDate}`

    try {
      const readable = createReadStream(pdf.tmpPath!)
      await drive.use('pdf').putStream(`${originalPdfPath}/${fileName}`, readable)

      logger.info(`PDF => Stored PDF file to disk pdf user: ${user.id}.`)
    } catch (error) {
      throw new Exception('Failed to store file in storage')
    }

    // @ts-ignore
    const pdfInfo = new PdfInfoService(pdf)
    // @ts-ignore
    const numberOfPages = await pdfInfo.pages
    const meta = {
      number_of_pages: numberOfPages,
    }

    const entityGroup = await db.transaction(async (trx) => {
      const eg = await EntityGroup.createWithSlug({
        user_id: user.id,
        parent_folder_id: parentFolderId,
        name: bookOriginalFileName,
        type: 'pdf',
        file_location: app.makePath(FileSystemHelper.path('pdf', `${originalPdfPath}/${fileName}`)),
        status: EntityGroup.STATUS_WAITING_FOR_TRANSCRIPTION,
        meta,
      })

      departments.map(async (depId) => {
        const department = await Department.findOrFail(depId)

        const df = new DepartmentFile()
        df.useTransaction(trx).fill({
          entity_group_id: eg.id,
          department_id: department.id,
        })
      })

      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} فایل ${eg.name} آپلود کرد.`

      await this.activityService.logUserAction(user, Activity.TYPE_UPLOAD, eg, description)

      return eg
    })

    // this is like Job::dispach(someJob) in laravel
    Queue.dispatch(SubmitFileToOcrJob, {
      entityGroup,
      user,
    })
  }

  public async storeVoice(
    user: User,
    voice: MultipartFile,
    departments: Department[],
    parentFolderId: number | null
  ): Promise<void> {
    const mimetype = voice.headers['content-type']
    let extension = voice.extname?.slice(1)
    const voiceOriginalFileName = voice.clientName

    // Validate MIME type
    if (mimetype === 'application/octet-stream') {
      throw new Exception('فایل مورد نظر قابل پردازش نیست لطفا آن را به فرمت m4a تبدیل نمایید', {
        status: 400,
      })
    }

    // Handle specific MIME type for .m4a files
    if (extension === 'm4a' && mimetype === 'video/3gpp') {
      extension = 'm4a'
    }

    // Generate file name and path
    const nowDate = DateTime.now().toISODate()
    const now = DateTime.now().toMillis() / 1000
    const hash = StringHelper.hashWithAlgo('sha3-256', voice.clientName)
    const fileName = `${hash}-${now}.${extension}`
    const originalPdfPath = `/${nowDate}`

    // Save the file to disk
    try {
      const readable = createReadStream(voice.tmpPath!)
      await drive.use('voice').putStream(`${originalPdfPath}/${fileName}`, readable)

      logger.info(`VOICE => Stored voice file to disk voice user: #${user.id}.`)
    } catch (error) {
      throw new Exception('Failed to store voice file in storage', { status: 500 })
    }

    // Get the file location
    const fileLocation = `${originalPdfPath}/${fileName}`

    // Get audio duration using FFmpeg
    let duration: number
    try {
      const filePath = await drive.use('voice').getUrl(fileLocation)
      const fileContent = await drive.use('voice').get(fileLocation)
      duration = await AudioHelper.getAudioDurationByFfmpeg(filePath, fileContent)
    } catch (error) {
      throw new Exception('فایل مورد نظر کیفیت مناسب را برای پردازش ندارد', { status: 400 })
    }

    // Prepare metadata
    const meta = { duration }

    // Create entity group and department files in a transaction
    const entityGroup = await db.transaction(async (trx) => {
      const eg = await EntityGroup.create(
        {
          user_id: user.id,
          parent_folder_id: parentFolderId,
          name: voiceOriginalFileName,
          type: 'voice',
          file_location: fileLocation,
          status: EntityGroup.STATUS_WAITING_FOR_SPLIT,
          meta,
        },
        { client: trx }
      )

      // Create department files
      for (const departmentId of departments) {
        const department = await Department.findOrFail(departmentId)
        await DepartmentFile.create(
          {
            entity_group_id: eg.id,
            department_id: department.id,
          },
          { client: trx }
        )
      }

      // Log user activity
      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} فایل ${eg.name} بارگزاری کرد.`
      await this.activityService.logUserAction(user, Activity.TYPE_UPLOAD, eg, description)

      return eg
    })

    // Dispatch job based on file extension
    if (extension !== 'wav') {
      logger.info(
        `STT => entityGroup: #${entityGroup.id} audio file needs to be converted to .wav (${extension})`
      )
      await Queue.dispatch(ConvertVoiceToWavJob, { entityGroup })
    } else {
      await Queue.dispatch(SubmitVoiceToSplitterJob, { entityGroup })
    }
  }

  public async storeImage(
    user: User,
    image: MultipartFile,
    departments: Department[],
    parentFolderId: number | null
  ): Promise<void> {
    const imageOriginalFileName = image.clientName
    const extension = image.extname?.slice(1)

    // Generate file name and path
    const nowDate = DateTime.now().toISODate()
    const now = DateTime.now().toMillis() / 1000
    const hash = StringHelper.hashWithAlgo('sha3-256', image.clientName)
    const fileName = `${hash}-${now}.${extension}`
    const originalImagePath = `/${nowDate}`

    // Save the file to disk
    try {
      const readable = createReadStream(image.tmpPath!)
      await drive.use('image').putStream(`${originalImagePath}/${fileName}`, readable)

      logger.info(`OCR => Stored image file to disk image user: #${user.id}.`)
    } catch (error) {
      throw new Exception('Failed to store image file in storage', { status: 500 })
    }

    // Get the file location
    const fileLocation = `${originalImagePath}/${fileName}`

    // Convert TIFF to PNG if necessary
    let fileLocationTiffConverted: string | null = null
    if (extension === 'tif' || extension === 'tiff') {
      fileLocationTiffConverted = await this.convertTiffToPng(fileLocation)
    }

    // Get the final file path
    const finalFilePath = fileLocationTiffConverted || fileLocation

    // Get image dimensions using Sharp
    const imageBuffer = await drive.use('image').get(finalFilePath)
    const { width, height } = await sharp(imageBuffer).metadata()

    if (!width || !height) {
      throw new Exception('Failed to get image dimensions', { status: 500 })
    }

    // Prepare metadata
    const meta: any = {
      width,
      height,
    }

    if (fileLocationTiffConverted) {
      meta.tif_converted_png_location = fileLocationTiffConverted
    }

    // Create entity group and department files in a transaction
    const entityGroup = await db.transaction(async (trx) => {
      const eg = await EntityGroup.create(
        {
          user_id: user.id,
          parent_folder_id: parentFolderId,
          name: imageOriginalFileName,
          type: 'image',
          file_location: fileLocation,
          status: EntityGroup.STATUS_WAITING_FOR_TRANSCRIPTION,
          meta,
        },
        { client: trx }
      )

      // Create department files
      for (const departmentId of departments) {
        const department = await Department.findOrFail(departmentId)
        await DepartmentFile.create(
          {
            entity_group_id: eg.id,
            department_id: department.id,
          },
          { client: trx }
        )
      }

      // Log user activity
      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} فایل ${eg.name} بارگزاری کرد.`
      await this.activityService.logUserAction(user, Activity.TYPE_UPLOAD, eg, description)

      return eg
    })

    // Dispatch job for OCR processing
    await Queue.dispatch(SubmitFileToOcrJob, { entityGroup, user: entityGroup.user })
  }

  public async storeVideo(
    user: User,
    video: MultipartFile,
    departments: Department[],
    parentFolderId: number | null
  ): Promise<void> {
    const mimetype = video.headers['content-type']

    // Validate MIME type
    if (mimetype === 'application/octet-stream') {
      throw new Exception('فایل مورد نظر قابل پردازش نیست لطفا آن را به فرمت m4a تبدیل نمایید', {
        status: 400,
      })
    }

    const videoOriginalFileName = video.clientName
    const extension = video.extname?.slice(1)

    // Generate file name and path
    const nowDate = DateTime.now().toISODate()
    const now = DateTime.now().toMillis() / 1000
    const hash = StringHelper.hashWithAlgo('sha3-256', video.clientName)
    const fileName = `${hash}-${now}.${extension}`
    const originalVideoPath = `/${nowDate}`

    // Save the file to disk
    try {
      const readable = createReadStream(video.tmpPath!)
      await drive.use('video').putStream(`${originalVideoPath}/${fileName}`, readable)

      logger.info(`VTT => Stored video file to disk video user: #${user.id}.`)
    } catch (error) {
      throw new Exception('Failed to store video file in storage', { status: 500 })
    }

    // Get the file location
    const fileLocation = `${originalVideoPath}/${fileName}`

    // Create entity group and department files in a transaction
    const entityGroup = await db.transaction(async (trx) => {
      const eg = await EntityGroup.create(
        {
          user_id: user.id,
          parent_folder_id: parentFolderId,
          name: videoOriginalFileName,
          type: 'video',
          file_location: fileLocation,
          status: EntityGroup.STATUS_WAITING_FOR_AUDIO_SEPARATION,
        },
        { client: trx }
      )

      // Create department files
      for (const departmentId of departments) {
        const department = await Department.findOrFail(departmentId)
        await DepartmentFile.create(
          {
            entity_group_id: eg.id,
            department_id: department.id,
          },
          { client: trx }
        )
      }

      // Log user activity
      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} فایل ${eg.name} بارگزاری کرد.`
      await this.activityService.logUserAction(user, Activity.TYPE_UPLOAD, eg, description)

      return eg
    })

    // Dispatch job for audio extraction
    await Queue.dispatch(ExtractVoiceFromVideoJob, { entityGroup })
  }

  public async storeWord(
    user: User,
    word: MultipartFile,
    departments: Department[],
    parentFolderId: number | null
  ): Promise<void> {
    const wordOriginalFileName = word.clientName
    const extension = word.extname?.slice(1)

    // Generate file name and path
    const nowDate = DateTime.now().toISODate()
    const now = DateTime.now().toMillis() / 1000
    const hash = StringHelper.hashWithAlgo('sha3-256', word.clientName)
    const fileName = `${hash}-${now}.${extension}`
    const originalFilePath = `/${nowDate}`

    // Save the file to disk
    try {
      const readable = createReadStream(word.tmpPath!)
      await drive.use('word').putStream(`${originalFilePath}/${fileName}`, readable)

      logger.info(`WORD => Stored word file to disk word user: #${user.id}.`)
    } catch (error) {
      throw new Exception('Failed to store word file in storage', { status: 500 })
    }

    // Get the file location
    const wordFileLocation = `${originalFilePath}/${fileName}`

    // Extract file details
    const filenameOriginalWord = path.parse(wordFileLocation).name
    const baseNameOriginalWord = path.basename(wordFileLocation)
    const baseDirOriginalWord = path.dirname(wordFileLocation)

    // Create temporary file paths
    const tmpFilePath = `/tmp/${baseNameOriginalWord}`
    const tempPdfFilePath = `/tmp/${filenameOriginalWord}.pdf`

    // Write the Word file to a temporary location
    const wordFileContent = await drive.use('word').get(wordFileLocation)
    writeFileSync(tmpFilePath, wordFileContent)

    // Convert Word to PDF using unoconv
    // unoconv should be installed locally on the server
    const command =
      process.env.NODE_ENV === 'development'
        ? `unoconv -f pdf ${tmpFilePath}`
        : `sudo -u deployer unoconv -f pdf ${tmpFilePath}`

    logger.info('Starting convert word to PDF!')
    logger.info(`Command: ${command}`)

    try {
      await CliHelper.execCommand(command)
      logger.info('Converting finished successfully.')
    } catch (error) {
      logger.error('Failed to convert Word to PDF:', error)
      throw new Exception('Failed to convert Word to PDF', { status: 500 })
    }

    // Save the converted PDF file
    const pdfFileLocation = `${baseDirOriginalWord}/${filenameOriginalWord}.pdf`
    try {
      const pdfFileContent = createReadStream(tempPdfFilePath)
      await drive.use('pdf').putStream(pdfFileLocation, pdfFileContent)
    } catch (error) {
      throw new Exception('Failed to store converted PDF file', { status: 500 })
    }

    // Clean up temporary files
    unlinkSync(tmpFilePath)
    unlinkSync(tempPdfFilePath)

    // Create entity group and department files in a transaction
    const entityGroup = await db.transaction(async (trx) => {
      const result = { converted_word_to_pdf: pdfFileLocation }

      const eg = await EntityGroup.create(
        {
          user_id: user.id,
          parent_folder_id: parentFolderId,
          name: wordOriginalFileName,
          type: 'word',
          file_location: wordFileLocation,
          status: EntityGroup.STATUS_WAITING_FOR_TRANSCRIPTION,
          result_location: result,
        },
        { client: trx }
      )

      // Create department files
      for (const departmentId of departments) {
        const department = await Department.findOrFail(departmentId)
        await DepartmentFile.create(
          {
            entity_group_id: eg.id,
            department_id: department.id,
          },
          { client: trx }
        )
      }

      // Log user activity
      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} فایل ${eg.name} بارگزاری کرد.`
      await this.activityService.logUserAction(user, Activity.TYPE_UPLOAD, eg, description)

      return eg
    })

    // Dispatch job for OCR processing
    await Queue.dispatch(SubmitFileToOcrJob, { entityGroup, user: entityGroup.user })
  }

  @inject()
  public async handleUploadedFile(
    { request }: HttpContext,
    folderId: number | null = null
  ): Promise<void> {
    // Get all valid file extensions from the mimeTypes object
    const types = config.get('mimetypes') as Record<string, Record<string, string[]>>
    const mimeTypes = Object.values(types)
      .flatMap((category) => Object.values(category))
      .flat()

    const file = request.file('file')
    const departments = request.input('tags', []) as any[]
    const extension = file?.extname

    const validator = vine.compile(
      vine.object({
        file: vine.file({
          size: '307mb',
          extnames: mimeTypes,
        }),
        tags: vine.array(vine.string()).minLength(1),
      })
    )
    try {
      await request.validateUsing(validator)
    } catch (error) {
      throw new Exception('فایل ارسالی نامعتبر است', { status: 422 })
    }

    // @ts-ignore
    const user = request.user as User
    if (!user) {
      throw new Exception('دسترسی لازم را ندارید.', { status: 403 })
    }

    if (ConfigHelper.mimetypes('book').includes(extension!)) {
      await this.storePdf(user, file!, departments, folderId)
    } else if (ConfigHelper.mimetypes('voice').includes(extension!)) {
      await this.storeVoice(user, file!, departments, folderId)
    } else if (ConfigHelper.mimetypes('image').includes(extension!)) {
      await this.storeImage(user, file!, departments, folderId)
    } else if (ConfigHelper.mimetypes('video').includes(extension!)) {
      await this.storeVideo(user, file!, departments, folderId)
    } else if (ConfigHelper.mimetypes('office').includes(extension!)) {
      await this.storeWord(user, file!, departments, folderId)
    } else {
      throw new Exception('فایل مورد نظر پشتیبانی نمیشود', { status: 422 })
    }
  }

  public static async getAudioInfo(audioPath: string): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      const data: Record<string, string> = {}
      fs.createReadStream(audioPath)
        .pipe(csv({ separator: '\t', headers: false }))
        .on('data', (row) => {
          const start = row[0]
          const text = row[2]

          if (start === 'start') {
            return
          }

          const startInSeconds = Number.parseFloat(start) / 1000
          data[startInSeconds.toString()] = text
        })
        .on('end', () => {
          resolve(data)
        })
        .on('error', (error) => {
          reject(
            new Exception('خطا در پردازش فایل csv', {
              cause: error,
              status: 500,
            })
          )
        })
    })
  }

  public static async setWatermarkToImage(imagePath: string) {
    try {
      const watermarkPath = app.publicPath('images/irapardaz-logo.png')
      const image = sharp(imagePath)
      const watermark = sharp(watermarkPath)

      const metadata = await image.metadata()
      const imageWidth = metadata.width || 0
      const imageHeight = metadata.height || 0

      const watermarkHeight = Math.round(imageHeight * 0.5)
      const watermarkWidth = Math.round(watermarkHeight * 0.7)

      const resizedWatermark = await watermark
        .resize(watermarkWidth, watermarkHeight, {
          fit: 'inside',
        })
        .toBuffer()

      await image
        .composite([
          {
            input: resizedWatermark,
            top: Math.round((imageHeight - watermarkHeight) / 2), // Center vertically
            left: Math.round((imageWidth - watermarkWidth) / 2), // Center horizontally
            blend: 'over', // Blend mode for opacity
          },
        ])
        .toFile(imagePath)
    } catch (error) {
      throw new Exception('خطا در افزودن watermark به عکس', {
        cause: error,
        status: 500,
      })
    }
  }

  public async addWaterMarkToPdf(entityGroup: EntityGroup, searchablePdfFile: string) {
    const originalPdfFilePath = FileSystemHelper.path('pdf', searchablePdfFile)
    const convertedImagesDirAbsolute = `${dirname(entityGroup.file_location)}/pdf-watermarked-images-${entityGroup.id}`
    const convertedImagesDir = FileSystemHelper.makeDirectory('image', convertedImagesDirAbsolute)

    // pdftoppm should be installed locally on the server
    const command = `pdftoppm -png ${originalPdfFilePath} ${convertedImagesDir}/converted 2>&1`
    logger.info(command)
    try {
      logger.info(`ITT => Starting extract images to pdf`)
      await CliHelper.execCommand(command)
      logger.info(`ITT => Extract pages of pdf finished. Output: ${CliHelper.getOutput()}`)
    } catch (error) {
      throw new Exception(`ITT => Return value of pdftoppm is ${CliHelper.getOutput()}`)
    }

    // check if job has been done successfully
    const pics: string[] = []
    const files = fs.readdirSync(convertedImagesDir)
    files.forEach(async (file) => {
      const explodedFilename = file.split('.')
      if (
        file !== '.' &&
        file !== '..' &&
        explodedFilename[explodedFilename.length - 1] === 'png'
      ) {
        logger.info('ITT => Starting watermark image')
        await FileService.setWatermarkToImage(`${convertedImagesDir}/${file}`)
        logger.info('ITT => Watermark image finished')
        pics.push(file)
      }
    })

    pics.sort()

    // list all PNG files in the directory
    const imageFiles = fs
      .readdirSync(convertedImagesDir)
      .filter((file) => path.extname(file).toLowerCase() === '.png')
    logger.info(`${convertedImagesDir}`)

    if (imageFiles.length === 0) {
      throw new Exception('no images exist', { status: 422 })
    }

    const convertedWatermarkedImagesDirAbsolute = `${FileSystemHelper.path('pdf', entityGroup.file_location)}/pdf-watermarked-${entityGroup.id}-${DateTime.now().millisecond / 1000}.pdf`
    const watermarkPdfPath = FileSystemHelper.path('pdf', convertedWatermarkedImagesDirAbsolute)

    // todo: use `img2pdf` utility command
    const command2 = `img2pdf ${convertedImagesDir}/*.png -o ${watermarkPdfPath}`
    logger.info(command2)
    try {
      logger.info(`ITT => Starting convert images to pdf`)
      await CliHelper.execCommand(command2)
      logger.info(`ITT => Convert images to pdf finished. Output: ${CliHelper.getOutput()}`)
    } catch (error) {
      throw new Exception(`ITT => Return value of img2pdf is ${CliHelper.getOutput()}`)
    }

    await drive.use('image').deleteAll(convertedWatermarkedImagesDirAbsolute)

    return convertedWatermarkedImagesDirAbsolute
  }

  public async convertTiffToPng(tiffFilePathFromDisk: string): Promise<string> {
    const tiffFilePathFromRoot = FileSystemHelper.path('image', tiffFilePathFromDisk)
    const pngFilePathFromDisk = `${tiffFilePathFromRoot}/${StringHelper.uniqid('tiff-converted-')}.png`
    const pngFilePathFromRoot = FileSystemHelper.path('image', pngFilePathFromDisk)
    const command = `convert ${tiffFilePathFromRoot} ${pngFilePathFromRoot}`
    logger.info(command)
    try {
      await CliHelper.execCommand(command)
      logger.info(`ITT => Convert tiff to png finished. Output: ${CliHelper.getOutput()}`)
    } catch (error) {
      logger.info(`ITT => Return value of convert is ${CliHelper.getOutput()}`)
      throw new Exception('Failed to convert tiff to png', { status: 500 })
    }

    return pngFilePathFromDisk
  }

  public async deleteEntitiesOfEntityGroup(entityGroup: EntityGroup) {
    const entities = await Entity.query().where('entity_group_id', entityGroup.id)
    entities.forEach(async (entity) => {
      await drive.use('csv').delete(entity.meta['csv_location'] ?? '')
      await drive.use('voice').delete(entity.file_location)
      await entity.delete()
    })

    await drive.use('word').delete(entityGroup.result_location['word_location'] ?? '')
  }

  public async deleteEntityGroupAndEntitiesAndFiles(entityGroup: EntityGroup, user: User) {
    await db.transaction(async (trx) => {
      const lockedEntityGroup = await EntityGroup.query()
        .where('id', entityGroup.id)
        .forUpdate()
        .firstOrFail()

      // Delete department files
      const departmentFiles = await DepartmentFile.query().where(
        'entity_group_id',
        lockedEntityGroup.id
      )

      departmentFiles.forEach(async (departmentFile) => {
        await departmentFile.useTransaction(trx).delete()
      })

      // Delete entities and their associated files
      const entities = await Entity.query().where('entity_group_id', lockedEntityGroup.id)

      entities.forEach(async (entity) => {
        await drive.use('csv').delete(entity.meta['csv_location'] ?? '')
        await drive.use('voice').delete(entity.file_location)
        await entity.useTransaction(trx).delete()
      })

      await drive.use(lockedEntityGroup.type).delete(lockedEntityGroup.file_location)

      if (['pdf', 'image'].includes(lockedEntityGroup.type)) {
        await drive.use('pdf').delete(lockedEntityGroup.result_location['pdf_location'] ?? '')
      }

      await drive.use('word').delete(lockedEntityGroup.result_location['word_location'] ?? '')

      await lockedEntityGroup.useTransaction(trx).delete()

      logger.info(`${user}`)
    })
  }
}
