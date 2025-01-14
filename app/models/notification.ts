import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Notification extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static PRIORITY_NORMAL = 'NORMAL'
  static PRIORITY_IMMEDIATELY = 'IMMEDIATELY'
  static PRIORITY_INSTANT = 'INSTANT'
}
