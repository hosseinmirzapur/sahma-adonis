import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Letter extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static PRIORITY_NORMAL = 'NORMAL'
  static PRIORITY_IMMEDIATELY = 'IMMEDIATELY'
  static PRIORITY_INSTANT = 'INSTANT'
  static CATEGORY_NORMAL = 'NORMAL'
  static CATEGORY_SECRET = 'SECRET'
  static CATEGORY_CONFIDENTIAL = 'CONFIDENTIAL'
  static STATUS_SENT = 'SENT'
  static STATUS_RECEIVED = 'RECEIVED'
  static STATUS_REPLIED = 'REPLIED'
  static STATUS_ACHIEVED = 'ACHIEVED'
  static STATUS_DELETED = 'DELETED'
  static STATUS_DRAFT = 'DRAFT'
}
