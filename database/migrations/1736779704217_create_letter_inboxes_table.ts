import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'letter_inboxes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.foreign('letter_id').references('letters.id').onDelete('CASCADE')
      table.foreign('user_id').references('users.id').onDelete('CASCADE')
      table.string('read_status').defaultTo('0').index()
      table.string('is_refer').defaultTo('0').index()
      table.foreign('referred_by').references('users.id').onDelete('CASCADE').nullable()
      table.string('refer_description').nullable()
      table.date('due_date').nullable()
      table.json('meta').nullable()

      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
