import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import User from '#models/user'
import EntityGroup from '#models/entity_group'
import Activity from '#models/activity'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import db from '@adonisjs/lucid/services/db'
import EncryptHelper from '#helper/encrypt_helper'

export default class Folder extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare slug: string

  @column()
  declare parent_folder_id: number

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => EntityGroup)
  declare entityGroups: HasMany<typeof EntityGroup>

  @hasMany(() => Activity, {
    foreignKey: 'activity_id',
    onQuery: (query) => query.where('activity_type', 'Folder'),
  })
  declare activities: HasMany<typeof Activity>

  public async createWithSlug(attributes: Partial<Folder>): Promise<Folder> {
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

  public async parentFolder(): Promise<Folder> {
    return await Folder.query().where('id', this.parent_folder_id).firstOrFail()
  }

  // todo: implement subfolders
}
