import Letter from '#models/letter'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'letters'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.foreign('user_id').references('users.id').onDelete('CASCADE')
      table.string('subject').index()
      table.text('text', 'longtext').nullable().index('fulltext')
      table.string('status').index()
      table.string('description').nullable()
      table.json('meta').nullable()
      table.string('priority').defaultTo(Letter.PRIORITY_NORMAL).index()
      table.string('category').defaultTo(Letter.CATEGORY_NORMAL).index()
      table.string('letter_reference_type').nullable()
      table.foreign('letter_reference_id').references('letters.id').onDelete('CASCADE')

      table.timestamp('submitted_at').nullable().index()
      table.date('due_date').nullable()
      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
