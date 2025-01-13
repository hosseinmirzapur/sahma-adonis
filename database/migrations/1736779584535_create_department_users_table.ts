import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'department_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()

      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.foreign('department_id').references('id').inTable('departments').onDelete('CASCADE')
      table.unique(['user_id', 'department_id'])

      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
