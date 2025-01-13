import factory from '@adonisjs/lucid/factories'
import EntityGroup from '#models/entity_group'

export const EntityGroupFactory = factory
  .define(EntityGroup, async ({ faker }) => {
    return {}
  })
  .build()
