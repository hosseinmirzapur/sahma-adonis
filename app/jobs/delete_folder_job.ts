import Folder from '#models/folder'
import { FolderService } from '#services/folder_service'
import { inject } from '@adonisjs/core'
import { Job } from '@rlanz/bull-queue'

interface DeleteFolderJobPayload {
  subFolder: Folder
}

@inject()
export default class DeleteFolderJob extends Job {
  constructor(private readonly service: FolderService) {
    super()
  }

  // This is the path to the file that is used to create the job
  static get $$filepath() {
    return import.meta.url
  }

  /**
   * Base Entry point
   */
  async handle(payload: DeleteFolderJobPayload) {
    this.service.deleteFolderRecursive(payload.subFolder)
  }

  /**
   * This is an optional method that gets called when the retries has exceeded and is marked failed.
   */
  async rescue(payload: DeleteFolderJobPayload) {
    this.logger.debug(`Rescuing job for folder:#${payload.subFolder.id}-${payload.subFolder.name}`)
  }
}
