import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import Letter from '#models/letter'
import User from '#models/user'
import LetterAttachment from '#models/letter_attachment'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class LetterReply extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare meta: any

  @belongsTo(() => Letter)
  declare letter: BelongsTo<typeof Letter>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => LetterAttachment)
  declare attachments: HasMany<typeof LetterAttachment>
}
