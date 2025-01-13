import factory from '@adonisjs/lucid/factories'
import Folder from '#models/folder'

export const FolderFactory = factory
  .define(Folder, async ({ faker }) => {
    return {}
  })
  .build()
