import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'department_files'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.foreign('entity_group_id').references('id').inTable('entity_groups').onDelete('CASCADE')
      table.foreign('department_id').references('id').inTable('departments').onDelete('CASCADE')
      table.unique(['entity_group_id', 'department_id'])

      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
