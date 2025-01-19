import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import User from '#models/user'
import Letter from '#models/letter'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Notification extends BaseModel {
  static PRIORITY_NORMAL = 'NORMAL'
  static PRIORITY_IMMEDIATELY = 'IMMEDIATELY'
  static PRIORITY_INSTANT = 'INSTANT'

  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare meta: Record<string, any>

  @column()
  declare priority: string

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Letter)
  declare letter: BelongsTo<typeof Letter>

  public getPriorityNotification(): string {
    switch (this.priority) {
      case Notification.PRIORITY_NORMAL:
        return 'عادی'
      case Notification.PRIORITY_IMMEDIATELY:
        return 'فوری'
      case Notification.PRIORITY_INSTANT:
        return 'آنی'
      default:
        throw new Error('unsupported priority notification')
    }
  }
}
