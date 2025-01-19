import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import EntityGroup from '#models/entity_group'
import Folder from '#models/folder'

export default class Activity extends BaseModel {
  static TYPE_CREATE = 'CREATE'
  static TYPE_PRINT = 'PRINT'
  static TYPE_DESCRIPTION = 'DESCRIPTION'
  static TYPE_UPLOAD = 'UPLOAD'
  static TYPE_DELETE = 'DELETE'
  static TYPE_RENAME = 'RENAME'
  static TYPE_COPY = 'COPY'
  static TYPE_EDIT = 'EDIT'
  static TYPE_TRANSCRIPTION = 'TRANSCRIPTION'
  static TYPE_LOGIN = 'LOGIN'
  static TYPE_LOGOUT = 'LOGOUT'
  static TYPE_ARCHIVE = 'ARCHIVE'
  static TYPE_RETRIEVAL = 'RETRIEVAL'
  static TYPE_MOVE = 'MOVE'
  static TYPE_DOWNLOAD = 'DOWNLOAD'

  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column()
  declare user_id: number

  @column()
  declare status: string

  @column()
  declare description: string

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  // Morph relation
  @belongsTo(() => BaseModel, {
    foreignKey: 'activity_id',
    onQuery: (query) => query.where('activity_type', 'Activity'),
  })
  declare activities: BelongsTo<typeof User | typeof Folder | typeof EntityGroup>

  static forPeriod = scope((query, start: string, end: string) => {
    query.whereBetween('created_at', [start, end])
  })

  static logins = scope((query) => {
    query.where('status', Activity.TYPE_LOGIN)
  })

  static logouts = scope((query) => {
    query.where('status', Activity.TYPE_LOGOUT)
  })
}
