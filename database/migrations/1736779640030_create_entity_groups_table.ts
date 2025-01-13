import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'entity_groups'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      table.integer('user_id').unsigned().references('id').inTable('users')
      table.integer('parent_folder_id').unsigned().nullable().references('id').inTable('folders')

      table.string('name').index()
      table.string('type').index()

      table.text('transcription_result', 'longtext').nullable().index('fulltext')

      table.timestamp('transcription_at', { useTz: true }).nullable().index()
      table.string('status').index()
      table.json('meta').nullable()
      table.string('file_location')
      table.string('description').nullable()
      table.timestamp('archived_at', { useTz: true }).nullable().index()
      table.json('result_location').nullable()
      table.integer('number_of_try').defaultTo(0).index()
      table.timestamp('deleted_at', { useTz: true }).nullable().index()
      table.string('slug').nullable().unique()

      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
