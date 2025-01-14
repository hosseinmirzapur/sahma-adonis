import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'folders'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.string('name').index()
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE').nullable()
      table
        .foreign('parent_folder_id')
        .references('id')
        .inTable('folders')
        .onDelete('CASCADE')
        .nullable()
      table.json('meta').nullable()
      table.string('slug').nullable().index()
      table.timestamp('archived_at').nullable().index()
      table.timestamp('deleted_at').nullable().index()
      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
