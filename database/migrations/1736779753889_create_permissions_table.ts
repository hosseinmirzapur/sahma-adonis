import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'permissions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.foreign('role_id').references('roles.id').onDelete('CASCADE')
      table.boolean('full')
      table.boolean('modify')
      table.boolean('read_only')

      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
