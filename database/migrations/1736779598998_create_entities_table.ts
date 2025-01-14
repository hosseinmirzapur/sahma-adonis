import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'entities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      table
        .foreign('entity_group_id')
        .references('id')
        .inTable('entity_groups')
        .onDelete('CASCADE')
        .nullable()
      table.string('type').index()
      table.text('transcription_result', 'longtext').nullable()
      table.string('file_location')
      table.json('result_location').nullable()
      table.json('meta').nullable()

      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
