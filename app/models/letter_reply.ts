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
  declare meta: Record<string, any>

  @column()
  declare text: string

  @belongsTo(() => Letter)
  declare letter: BelongsTo<typeof Letter>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => LetterAttachment, {
    foreignKey: 'attachble_id',
    onQuery(query) {
      query.where('attachble_type', 'LetterReply')
    },
  })
  declare attachments: HasMany<typeof LetterAttachment>
}
