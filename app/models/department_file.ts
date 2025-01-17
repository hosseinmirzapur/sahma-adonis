import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Department from '#models/department'
import EntityGroup from '#models/entity_group'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class DepartmentFile extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare department_id: number

  @column()
  declare entity_group_id: number

  @belongsTo(() => EntityGroup)
  declare entityGroup: BelongsTo<typeof EntityGroup>

  @belongsTo(() => Department)
  declare department: BelongsTo<typeof Department>
}
