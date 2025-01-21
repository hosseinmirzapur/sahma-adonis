import Department from '#models/department'
import User from '#models/user'
import { ActivityService } from '#services/activity_service'
import { inject } from '@adonisjs/core'
import { MultipartFile } from '@adonisjs/core/bodyparser'
import { Exception } from '@adonisjs/core/exceptions'
import logger from '@adonisjs/core/services/logger'
import drive from '@adonisjs/drive/services/main'
import { DateTime } from 'luxon'
import crypto from 'node:crypto'
import { createReadStream } from 'node:fs'
import { PdfInfoService } from '#services/pdf_info_service'
import db from '@adonisjs/lucid/services/db'
import EntityGroup from '#models/entity_group'
import app from '@adonisjs/core/services/app'
import FileSystemHelper from '#helper/filesystem_helper'
import DepartmentFile from '#models/department_file'
import Activity from '#models/activity'
import SubmitFileToOcrJob from '#jobs/submit_file_to_ocr_job'
import Queue from '@rlanz/bull-queue/services/main'

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
    const hash = crypto.createHash('sha3-256').update(pdf.clientName).digest('hex')
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
  ): Promise<void> {}

  public async storeImage(
    user: User,
    image: MultipartFile,
    departments: Department[],
    parentFolderId: number | null
  ): Promise<void> {}

  public async storeVideo(
    user: User,
    video: MultipartFile,
    departments: Department[],
    parentFolderId: number | null
  ) {}

  public async storeWord(
    user: User,
    voice: MultipartFile,
    departments: Department[],
    parentFolderId: number | null
  ) {}

  @inject()
  public async handleUploadedFile(request: any, folderId: number | null) {}

  public async getAudioInfo(path: string): Promise<any[]> {
    return []
  }

  public async setWatermarkToImage(imagePath: string) {}

  public async convertPdfToImage(entityGroup: EntityGroup): Promise<string> {
    return ''
  }

  public async addWaterMarkToPdf(entityGroup: EntityGroup, searchablePdfFile: string) {}

  public async convertTiffToPng($tifFilePathFromDisk: string): Promise<string> {
    return ''
  }

  public async deleteEntitiesOfEntityGroup(entityGroup: EntityGroup) {}

  public async deleteEntityGroupAndEntitiesAndFiles(entityGroup: EntityGroup, user: User) {}
}
