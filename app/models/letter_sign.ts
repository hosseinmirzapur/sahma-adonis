import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Letter from '#models/letter'
import User from '#models/user'

export default class LetterSign extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Letter)
  declare letter: BelongsTo<typeof Letter>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
