import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, scope } from '@adonisjs/lucid/orm'

import User from '#models/user'
import Department from '#models/department'
import Activity from '#models/activity'
import Entity from '#models/entity'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import db from '@adonisjs/lucid/services/db'
import EncryptHelper from '#helper/encrypt_helper'
import Folder from '#models/folder'
import TimeHelper from '#helper/time_helper'
import { Exception } from '@adonisjs/core/exceptions'
import logger from '@adonisjs/core/services/logger'
import drive from '@adonisjs/drive/services/main'
import str from '@adonisjs/core/helpers/string'
import { DriveDisks } from '@adonisjs/drive/types'

export default class EntityGroup extends BaseModel {
  static STATUS_WAITING_FOR_TRANSCRIPTION = 'WAITING_FOR_TRANSCRIPTION'
  static STATUS_TRANSCRIBED = 'TRANSCRIBED'
  static STATUS_WAITING_FOR_AUDIO_SEPARATION = 'WAITING_FOR_AUDIO_SEPARATION'
  static STATUS_WAITING_FOR_SPLIT = 'WAITING_FOR_SPLIT'
  static STATUS_WAITING_FOR_WORD_EXTRACTION = 'WAITING_FOR_WORD_EXTRACTION'
  static STATUS_WAITING_FOR_RETRY = 'WAITING_FOR_RETRY'
  static STATUS_REJECTED = 'REJECTED'
  static STATUS_ZIPPED = 'ZIPPED'
  static STATUS_REPORT = 'REPORT'

  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column()
  declare deleted_by: number | null

  @column()
  declare slug: string

  @column()
  declare result_location: any

  @column()
  declare file_location: string

  @column()
  declare transcription_result: string

  @column()
  declare meta: any

  @column()
  declare name: string

  @column()
  declare type: keyof DriveDisks

  @column()
  declare status: string

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Entity)
  declare entities: HasMany<typeof Entity>

  @hasMany(() => Activity, {
    foreignKey: 'activity_id',
    onQuery: (query) => query.where('activity_type', 'EntityGroup'),
  })
  declare activities: HasMany<typeof Activity>

  @belongsTo(() => Folder)
  declare folder: BelongsTo<typeof Folder>

  static textSearch = scope((query, text: string) => {
    // ILike is case-insensitiive search
    query.whereILike('transcription_result', `%${text}%`)
  })

  static availableNow = scope((query) => {
    const lastDivisibleDateTime = TimeHelper.getLastNMinDivisibleDateTime(
      60,
      DateTime.now(),
      1
    ).minus({ minutes: 15 })

    if (!lastDivisibleDateTime.isValid) {
      throw new Exception('Last divisible date time is not defined')
    }

    return query.where('created_at', '<', lastDivisibleDateTime.toISO() as string)
  })

  public async getEntityGroupDepartments(): Promise<{ id: number; name: string }[]> {
    const departments = await Department.query()
      .select(['departments.id', 'departments.name'])
      .join('department_files', 'department_files.department_id', 'departments.id')
      .where('department_files.entity_group_id', this.id)
      .distinct()

    return departments.map((department) => department.serialize() as { id: number; name: string })
  }

  public static async createWithSlug(attributes: Partial<EntityGroup>): Promise<EntityGroup> {
    return db.transaction(async (trx) => {
      const entityGroup = new EntityGroup()
      entityGroup.fill(attributes)
      await entityGroup.useTransaction(trx).save()

      entityGroup.slug = entityGroup.getEntityGroupId()
      return await entityGroup.save()
    })
  }

  public getEntityGroupId(): string {
    if (!this.id) {
      throw new Exception('EntityGroup ID is not defined')
    }

    // Pad the ID with leading zeros to a length of 12
    const paddedId = this.id.toString().padStart(12, '0')

    // Encrypt the padded ID
    const encryptedId = EncryptHelper.encrypt(paddedId)

    // Encode the encrypted ID in base64 and return
    return Buffer.from(encryptedId).toString('base64')
  }

  public static async convertObfuscatedIdToEntityGroupId(obfuscatedId: string): Promise<number> {
    const base64Decoded = Buffer.from(obfuscatedId, 'base64').toString('utf-8')
    const decryptedId = EncryptHelper.decrypt(base64Decoded)

    return Number.parseInt(decryptedId)
  }

  public async getFileData(getWavFile: boolean = false): Promise<string | null> {
    let data: string | null = null

    if (getWavFile) {
      let audioLocation = ''
      if (this.result_location?.wav_location) {
        logger.info('EntityGroup: removing space from pathname')
        audioLocation = str.condenseWhitespace(this.result_location.wav_location)
      }
      data = await drive.use('voice').get(audioLocation)
    } else {
      if (this.name.includes('tif')) {
        data = await drive.use(this.type).get(this.meta.tif_converted_png_location || '')
      } else {
        let disk = this.type
        let fileLocation = this.file_location

        if (this.type === 'word') {
          disk = 'pdf'
          fileLocation = this.result_location.converted_word_to_pdf || ''
        }

        data = await drive.use(disk).get(fileLocation)
      }
    }

    if (!data) {
      throw new Exception(`Failed to get entity data. EntityGroup id: #${this.id}`)
    }

    return data
  }

  public async getTranscribedFileData(): Promise<string | null> {
    let fileLocation: string
    if (this.type === 'word' && this.status !== EntityGroup.STATUS_TRANSCRIBED) {
      fileLocation = this.result_location.converted_word_to_pdf || ''
    } else {
      fileLocation = this.result_location.pdf_location || ''
    }

    const data = await drive.use('pdf').get(fileLocation)

    if (!data) {
      throw new Exception(`Failed to get entity data. EntityGroup id: #${this.id}`)
    }

    return data
  }

  public async getExtensionFile(): Promise<string> {
    const fileLocation = this.file_location
    const extension = fileLocation.split('.').pop()
    if (!extension) throw new Exception(`Failed to get extension. EntityGroup id: #${this.id}`)
    return extension
  }

  public async getHtmlEmbeddableFileData(isBase64: boolean = true): Promise<string | null> {
    if (await this.fileNotExists()) {
      return null
    }

    if (!isBase64 && ['voice', 'image', 'pdf', 'video', 'word'].includes(this.type)) {
      return (await this.getFileData()) ?? ''
    }

    const fileFormat = this.file_location ? this.file_location.split('.').pop() : ''

    let base64Data: string | null = null

    if (this.type === 'voice' || this.type === 'image') {
      base64Data = `data:${this.type === 'voice' ? 'audio' : 'image'}/${fileFormat};base64,${Buffer.from((await this.getFileData()) ?? '').toString('base64')}`
    } else if (this.type === 'pdf' || this.type === 'word') {
      base64Data = `data:application/pdf;base64,${Buffer.from((await this.getFileData()) ?? '').toString('base64')}`
    } else if (this.type === 'video') {
      base64Data = `data:video/${fileFormat};base64,${Buffer.from((await this.getFileData()) ?? '').toString('base64')}`
    }

    return base64Data
  }

  public async getHtmlEmbeddableTranscribedFileData(
    isBase64: boolean = true
  ): Promise<string | null> {
    if (!this.transcribedFileExists()) {
      return null
    }

    if (['voice', 'image', 'pdf', 'video', 'word'].includes(this.type)) {
      if (!isBase64) return (await this.getTranscribedFileData()) ?? ''

      return `data:application/pdf;base64,${Buffer.from((await this.getTranscribedFileData()) ?? '').toString('base64')}`
    } else {
      return null
    }
  }

  public async fileNotExists(): Promise<boolean> {
    return !this.fileExists()
  }

  public async fileExists(): Promise<boolean> {
    if (this.file_location === null) {
      return false
    }

    return drive.use(this.type).exists(this.file_location)
  }

  public async transcribedFileExists(): Promise<boolean> {
    if (this.result_location?.pdf_location === null) {
      return false
    }

    return drive.use('pdf').exists(this.result_location.pdf_location ?? '')
  }

  public async generateFileDataForEmbedding(
    isBase64: boolean = true
  ): Promise<{ fileType: string; fileContent: string | null; fileName: string }> {
    let fileType
    let fileName
    let fileContent
    if (['image', 'pdf', 'word'].includes(this.type) && this.transcription_result) {
      if (this.type === 'image' && this.status !== EntityGroup.STATUS_TRANSCRIBED) {
        fileType = 'image'
        fileName = this.name
      } else {
        fileType = 'pdf'
        fileName = `${this.name}.pdf`
      }

      fileContent = await this.getHtmlEmbeddableFileData(isBase64)
    } else {
      fileType = this.type
      fileContent = await this.getHtmlEmbeddableFileData(isBase64)
      fileName = this.name
    }

    return { fileType, fileContent, fileName }
  }

  public async getFileSizeHumanReadable(sizeInBytes: number): Promise<string> {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let unitIndex = 0
    while (sizeInBytes >= 1024 && unitIndex < units.length - 1) {
      sizeInBytes /= 1024
      unitIndex++
    }

    return `${Math.round(sizeInBytes).toPrecision(2)} ${units[unitIndex]}`
  }
}
