import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import LetterReply from '#models/letter_reply'
import Letter from '#models/letter'

export default class LetterAttachment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare meta: Record<string, any>

  @column()
  declare type: string

  @column()
  declare file_location: string

  @belongsTo(() => BaseModel, {
    foreignKey: 'attachable_id',
  })
  declare attachable: BelongsTo<typeof LetterReply | typeof Letter>
}
