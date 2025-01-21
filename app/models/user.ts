import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Role from '#models/role'
import DepartmentUser from '#models/department_user'
import Activity from '#models/activity'
import Notification from '#models/notification'
import Folder from '#models/folder'
import Department from '#models/department'
import EntityGroup from '#models/entity_group'
import router from '@adonisjs/core/services/router'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare name: string | null

  @column()
  declare personal_id: string | number | null

  @column({
    serializeAs: null,
  })
  declare password: string

  @column({
    serializeAs: null,
  })
  declare remember_token: string

  @column()
  declare meta: Record<string, any>

  @belongsTo(() => Role)
  declare role: BelongsTo<typeof Role>

  @hasMany(() => DepartmentUser)
  declare userDepartments: HasMany<typeof DepartmentUser>

  @hasMany(() => Activity, {
    foreignKey: 'activity_id',
    onQuery: (query) => query.where('activity_type', 'User'),
  })
  declare activities: HasMany<typeof Activity>

  @hasMany(() => Notification)
  declare notifications: HasMany<typeof Notification>

  public async getDepartmentIds(): Promise<number[]> {
    const departments = await Department.query()
      .select('departments.*')
      .join('department_users', 'department_users.department_id', 'departments.id')
      .where('department_users.user_id', this.id)

    return departments.map((dep) => dep.id)
  }

  public async getAllAvailableFilesAsArray(folder: Folder): Promise<any[]> {
    const departmentIds = await this.getDepartmentIds()

    const entityGroups = await EntityGroup.query()
      .select('entity_groups.*')
      .innerJoin('department_files', 'department_files.entity_group_id', 'entity_groups.id')
      .where('entity_groups.parent_folder_id', folder.id)
      .whereIn('department_files.department_id', departmentIds)
      .whereNull('entity_groups.deleted_at')
      .whereNull('entity_groups.archived_at')
      .distinct()

    return entityGroups.map((entityGroup) => ({
      id: entityGroup.id,
      name: entityGroup.name,
      type: entityGroup.type,
      status: entityGroup.status,
      slug: entityGroup.getEntityGroupId(),
      description: entityGroup.description,
      parentSlug: entityGroup.parent_folder_id
        ? router
            .builder()
            .params({
              folderId: entityGroup.parentFolder.getFolderId(),
            })
            .make('web.user.dashboard.folder.show')
        : null,
      departments: entityGroup.getEntityGroupDepartments(),
    }))
  }
}
