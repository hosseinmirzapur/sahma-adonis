import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'letter_signs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.foreign('letter_id').references('letters.id').onDelete('CASCADE').nullable()
      table.foreign('user_id').references('users.id').onDelete('CASCADE').nullable()
      table.timestamp('signed_at').nullable()

      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
