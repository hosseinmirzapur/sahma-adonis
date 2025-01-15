import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import Folder from '#models/folder'
import DepartmentUser from '#models/department_user'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Department extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Folder)
  declare folders: HasMany<typeof Folder>

  @hasMany(() => DepartmentUser)
  declare departmentUsers: HasMany<typeof DepartmentUser>
}
