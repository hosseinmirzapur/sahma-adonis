import Notification from '#models/notification'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.foreign('user_id').references('users.id').onDelete('CASCADE')
      table.foreign('letter_id').references('letters.id').onDelete('CASCADE').nullable()
      table.string('subject').nullable()
      table.string('description').nullable()
      table.string('priority').defaultTo(Notification.PRIORITY_NORMAL)
      table.json('meta').nullable()
      table.date('remind_at')

      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
