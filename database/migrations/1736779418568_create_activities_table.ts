import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'activities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.string('status').index()
      table.string('description').nullable()
      // morph activity
      table.string('activity_type')
      table.bigInteger('activity_id').unsigned()
      table.index(['activity_type', 'activity_id'])

      table.json('meta').nullable()
      table.timestamps()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
