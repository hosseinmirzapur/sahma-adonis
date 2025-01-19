import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import EntityGroup from '#models/entity_group'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import drive from '@adonisjs/drive/services/main'
import { DriveDisks } from '@adonisjs/drive/types'
import { Exception } from '@adonisjs/core/exceptions'

export default class Entity extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare meta: Record<string, any>

  @column()
  declare result_location: any

  @column()
  declare type: keyof DriveDisks

  @column()
  declare file_location: string

  @belongsTo(() => EntityGroup)
  declare entityGroup: BelongsTo<typeof EntityGroup>

  public async getFileData(): Promise<string | null> {
    const data = await drive.use(this.type).get(this.file_location)

    if (!data) {
      throw new Exception(`Failed to get file data for entity #${this.id}`)
    }

    return data
  }

  public async getExtensionFile(): Promise<string> {
    const fileLocation = this.file_location
    return fileLocation.split('.').pop() as string
  }

  public async fileNotExists(): Promise<boolean> {
    return !this.fileExists()
  }

  public async fileExists(): Promise<boolean> {
    if (!this.file_location) {
      return false
    }
    return drive.use(this.type).exists(this.file_location)
  }
}
