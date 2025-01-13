import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 255)
      table.bigInteger('personal_id').unique().index()
      table.string('email', 255).nullable()
      table.string('password')
      table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE')
      table.json('meta').nullable()
      table.boolean('is_super_admin').defaultTo(false)
      table.string('remember_token', 100).nullable()
      table.foreign('created_by').references('id').inTable('users').onDelete('CASCADE')

      table.timestamp('created_at')
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
