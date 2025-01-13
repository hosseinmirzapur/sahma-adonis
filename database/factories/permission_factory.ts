import factory from '@adonisjs/lucid/factories'
import Permission from '#models/permission'

export const PermissionFactory = factory
  .define(Permission, async ({ faker }) => {
    return {}
  })
  .build()
