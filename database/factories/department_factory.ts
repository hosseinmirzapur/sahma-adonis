import factory from '@adonisjs/lucid/factories'
import Department from '#models/department'

export const DepartmentFactory = factory
  .define(Department, async ({ faker }) => {
    return {}
  })
  .build()
