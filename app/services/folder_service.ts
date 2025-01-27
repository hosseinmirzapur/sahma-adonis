import EntityGroup from '#models/entity_group'
import Folder from '#models/folder'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import Queue from '@rlanz/bull-queue/services/main'
import DeleteFolderJob from '#jobs/delete_folder_job'

export class FolderService {
  public async deleteFolderRecursive(folder: Folder) {
    logger.info(`Folder:#${folder.id}-${folder.name} START to delete its subfolders and files`)

    const subFolders = await Folder.query().where('parent_folder_id', folder.id)
    const subFiles = await EntityGroup.query().where('parent_folder_id', folder.id)

    subFiles.forEach(async (file) => {
      file.deleted_at = DateTime.now()
      file.deleted_by = folder.deleted_by
      await file.save()
      logger.info(`File:#${file.id}-${file.name} deleted by User::#${folder.deleted_by}`)
    })

    subFolders.forEach(async (subFolder) => {
      subFolder.deleted_at = DateTime.now()
      subFolder.deleted_by = folder.deleted_by
      await subFolder.save()
      logger.info(
        `Folder:#${subFolder.id}-${subFolder.name} temporarily deleted by User::#${folder.deleted_by}`
      )
      logger.info(
        `Folder:#${subFolder.id}-${subFolder.name} IS_GOING_TO to delete its subfolders and files`
      )
      Queue.dispatch(
        DeleteFolderJob,
        {
          subFolder,
        },
        {
          attempts: 3,
          queueName: ' folder::delete-sub-folders-and-files',
        }
      )
    })
  }
}
