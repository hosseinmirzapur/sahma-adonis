import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Activity from '#models/activity'
import LetterAttachment from '#models/letter_attachment'
import Notification from '#models/notification'
import LetterSign from '#models/letter_sign'
import LetterInbox from '#models/letter_inbox'
import LetterReply from '#models/letter_reply'
import { Exception } from '@adonisjs/core/exceptions'

export default class Letter extends BaseModel {
  public static PRIORITY_NORMAL = 'NORMAL'
  public static PRIORITY_IMMEDIATELY = 'IMMEDIATELY'
  public static PRIORITY_INSTANT = 'INSTANT'
  public static CATEGORY_NORMAL = 'NORMAL'
  public static CATEGORY_SECRET = 'SECRET'
  public static CATEGORY_CONFIDENTIAL = 'CONFIDENTIAL'
  public static STATUS_SENT = 'SENT'
  public static STATUS_RECEIVED = 'RECEIVED'
  public static STATUS_REPLIED = 'REPLIED'
  public static STATUS_ARCHIEVED = 'ARCHIEVED'
  public static STATUS_DELETED = 'DELETED'
  public static STATUS_DRAFT = 'DRAFT'

  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare meta: Record<string, any>

  @column()
  declare status: string

  @column()
  declare user_id: number

  @column()
  declare priority: string

  @column()
  declare subject: string

  @column()
  declare description: string | null

  @column.date()
  declare due_date: DateTime | null

  @column()
  declare submitted_at: DateTime | null | string

  @column()
  declare letter_reference_type: string | null

  @column()
  declare category: string

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => Activity, {
    foreignKey: 'activity_id',
    onQuery: (query) => query.where('activity_type', 'Letter'),
  })
  declare activities: HasMany<typeof Activity>

  @hasMany(() => LetterAttachment, {
    foreignKey: 'activity_id',
    onQuery: (query) => query.where('activity_type', 'Letter'),
  })
  declare attachments: HasMany<typeof LetterAttachment>

  @hasMany(() => Notification)
  declare notifications: HasMany<typeof Notification>

  @hasMany(() => LetterSign)
  declare letterSigns: HasMany<typeof LetterSign>

  @hasMany(() => LetterInbox)
  declare letterInboxes: HasMany<typeof LetterInbox>

  @hasMany(() => LetterReply)
  declare letterReplies: HasMany<typeof LetterReply>

  public getLetterStatus(user: User): string {
    return this.status === Letter.STATUS_SENT
      ? this.user_id === user.id
        ? Letter.STATUS_SENT
        : Letter.STATUS_RECEIVED
      : this.status
  }

  public getPriorityLetterInPersian(): string {
    switch (this.priority) {
      case Letter.PRIORITY_NORMAL:
        return 'عادی'
      case Letter.PRIORITY_IMMEDIATELY:
        return 'فوری'
      case Letter.PRIORITY_INSTANT:
        return 'آنی'
      default:
        throw new Exception('unsupported priority letter')
    }
  }

  public getCategoryLetterInPersian(): string {
    switch (this.priority) {
      case Letter.CATEGORY_SECRET:
        return 'عادی'
      case Letter.CATEGORY_CONFIDENTIAL:
        return 'فوری'
      case Letter.CATEGORY_NORMAL:
        return 'آنی'
      default:
        throw new Error('unsupported category letter')
    }
  }

  public static getAllLetterCategories(): string[] {
    return [Letter.CATEGORY_NORMAL, Letter.CATEGORY_CONFIDENTIAL, Letter.CATEGORY_SECRET]
  }

  public static getAllLetterPriorities(): string[] {
    return [Letter.PRIORITY_INSTANT, Letter.PRIORITY_IMMEDIATELY, Letter.PRIORITY_NORMAL]
  }

  public static getMimeTypes(): string[] {
    return ['jpeg', 'jpg', 'png', 'pdf']
  }
}
