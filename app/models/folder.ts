import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import User from '#models/user'
import EntityGroup from '#models/entity_group'
import Activity from '#models/activity'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import db from '@adonisjs/lucid/services/db'
import EncryptHelper from '#helper/encrypt_helper'
import logger from '@adonisjs/core/services/logger'
import DepartmentFile from '#models/department_file'
import drive from '@adonisjs/drive/services/main'
import { Exception } from '@adonisjs/core/exceptions'
import app from '@adonisjs/core/services/app'

export default class Folder extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column()
  declare slug: string

  @column()
  declare parent_folder_id: number | null

  @column()
  declare user_id: number

  @column()
  declare name: string

  @column()
  declare deleted_by: number | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => EntityGroup)
  declare entityGroups: HasMany<typeof EntityGroup>

  @hasMany(() => Activity, {
    foreignKey: 'activity_id',
    onQuery: (query) => query.where('activity_type', 'Folder'),
  })
  declare activities: HasMany<typeof Activity>

  public static async createWithSlug(attributes: Partial<Folder>): Promise<Folder> {
    return db.transaction(async (trx) => {
      const folder = new Folder()
      folder.fill(attributes)
      await folder.useTransaction(trx).save()

      folder.slug = folder.getFolderId()
      await folder.save()

      return folder
    })
  }

  public getFolderId(): string {
    if (!this.id) {
      throw new Error('Folder ID is not defined')
    }

    // Pad the ID with leading zeros to a length of 12
    const paddedId = this.id.toString().padStart(12, '0')

    // Encrypt the padded ID
    const encryptedId = EncryptHelper.encrypt(paddedId)

    // Encode the encrypted ID in base64 and return
    return Buffer.from(encryptedId).toString('base64')
  }

  public static async convertObfuscatedIdToFolderId(obfuscatedId: string): Promise<number> {
    const base64Decoded = Buffer.from(obfuscatedId, 'base64').toString('utf-8')
    const decryptedId = EncryptHelper.decrypt(base64Decoded)

    return Number.parseInt(decryptedId)
  }

  public async parentFolder(): Promise<Folder | null> {
    if (!this.parent_folder_id) {
      return null
    }
    return Folder.query().where('id', this.parent_folder_id).firstOrFail()
  }

  public async subFolders(breadcrumbs?: any[], currentFolderId?: number): Promise<any[]> {
    const folders = await Folder.query().where('parent_folder_id', this.id).whereNull('deleted_at')
    return folders.map(async (folder) => {
      return {
        id: folder.id,
        name: folder.name,
        parent_folder_id: folder.parent_folder_id,
        slug: folder.getFolderId(),
        subFolders: await folder.subFolders(breadcrumbs),
        isOpen:
          breadcrumbs?.includes(folder.id) || (currentFolderId && currentFolderId === folder.id),
      }
    })
  }

  public async tempDeleteSubFoldersAndFiles(folder: Folder, user: User) {
    const subFolders = await Folder.query().where('parent_folder_id', folder.id)
    const now = DateTime.now()

    await db.transaction(async (trx) => {
      subFolders.map(async (sf) => {
        sf.deleted_at = now
        sf.deleted_by = user.id
        await sf.useTransaction(trx).save()
        await this.tempDeleteSubFoldersAndFiles(sf, user)
      })
    })

    const entityGroups = await EntityGroup.query().where('parent_folder_id', folder.id)

    await db.transaction(async (trx) => {
      entityGroups.map(async (eg) => {
        eg.deleted_at = now
        eg.deleted_by = user.id
        await eg.useTransaction(trx).save()
      })
    })
  }

  public async retrieveSubFoldersAndFiles(folder: Folder, user: User) {
    const subFolders = await Folder.query().where('parent_folder_id', folder.id)

    await db.transaction(async (trx) => {
      subFolders.map(async (sf) => {
        sf.deleted_at = null
        sf.deleted_by = null
        await sf.useTransaction(trx).save()
        await this.retrieveSubFoldersAndFiles(sf, user)
      })
    })

    const entityGroups = await EntityGroup.query().where('parent_folder_id', folder.id)

    await db.transaction(async (trx) => {
      entityGroups.map(async (eg) => {
        eg.deleted_at = null
        eg.deleted_by = null
        await eg.useTransaction(trx).save()
      })
    })
  }

  public async getParentFolders(
    folder: Folder,
    breadcrumbs: { name: string; slug: string; id: number }[]
  ): Promise<{ name: string; slug: string; id: number }[]> {
    logger.info(`Debug: Entering getParentFolders for folder: ${folder.name}`)

    if (breadcrumbs.length === 0) {
      breadcrumbs.push({
        name: folder.name,
        slug: folder.getFolderId(),
        id: folder.id,
      })
    }

    if (folder.parent_folder_id) {
      const parentFolder = await folder.parentFolder()
      if (!parentFolder) {
        return breadcrumbs
      }

      breadcrumbs.unshift({
        name: parentFolder.name,
        slug: parentFolder.getFolderId(),
        id: parentFolder.id,
      })
      await this.getParentFolders(parentFolder, breadcrumbs)
    }

    logger.info(`Debug: Exiting getParentFolders for folder: ${folder.name}`)
    logger.info(`Debug: Breadcrumbs: ${JSON.stringify(breadcrumbs)}`)
    return breadcrumbs
  }
  public async getAllSubFoldersId(folder: Folder, arrayIds: number[] = []): Promise<number[]> {
    const subFolders = await Folder.query().where('parent_folder_id', folder.id)

    subFolders.map(async (sf) => {
      arrayIds.push(sf.id)
      await this.getAllSubFoldersId(sf, arrayIds)
    })

    return arrayIds
  }

  public async replicateSubFoldersAndFiles(newFolder: Folder) {
    const folders = await Folder.query().where('parent_folder_id', this.id).whereNull('deleted_at')

    const files = await EntityGroup.query().where('parent_folder_id', this.id)

    await db.transaction(async (trx) => {
      files.map(async (file) => {
        const data = {
          ...file,
          user_id: newFolder.user_id,
          parent_folder_id: newFolder.id,
        }

        const newEntityGroup = await EntityGroup.createWithSlug(data)

        const departments = await file.getEntityGroupDepartments()

        departments.map(async (dep) => {
          const departmentFile = new DepartmentFile()
          departmentFile.useTransaction(trx).fill({
            department_id: dep.id,
            entity_group_id: newEntityGroup.id,
          })
        })
      })
    })

    await db.transaction(async () => {
      folders.map(async (folder) => {
        const newSubFolder = await Folder.createWithSlug({
          name: folder.name,
          user_id: newFolder.user_id,
          parent_folder_id: newFolder.id,
        })

        folder.replicateSubFoldersAndFiles(newSubFolder)
      })
    })
  }

  public async retrieveSubFoldersAndFilesForDownload(currentDirectory: string) {
    const entityGroups = await EntityGroup.query().where('parent_folder_id', this.id)

    entityGroups.map(async (eg) => {
      let { fileContent, fileName } = await eg.generateFileDataForEmbedding(false)
      if (!fileContent) fileContent = ''
      if (!fileName) fileName = ''

      try {
        await drive.use('zip').put(`${currentDirectory}/${fileName}`, fileContent)
      } catch (error) {
        throw new Exception('Failed to write data for zip.')
      }
    })

    const folders = await Folder.query().where('parent_folder_id', this.id).whereNull('deleted_at')

    folders.map(async (folder) => {
      const newDir = `${currentDirectory}/${folder.name}`
      app.makePath(newDir)

      await folder.retrieveSubFoldersAndFilesForDownload(newDir)
    })
  }
}
