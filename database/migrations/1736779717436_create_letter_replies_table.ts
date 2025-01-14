import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'letter_replies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.foreign('letter_id').references('letters.id').onDelete('CASCADE')
      table.foreign('user_id').references('users.id').onDelete('CASCADE')
      table.foreign('recipient_id').references('users.id').onDelete('CASCADE').nullable()
      table.string('text').index()
      table.json('meta').nullable()
      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
