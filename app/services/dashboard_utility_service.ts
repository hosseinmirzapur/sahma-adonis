import Activity from '#models/activity'
import DepartmentFile from '#models/department_file'
import EntityGroup from '#models/entity_group'
import Folder from '#models/folder'
import User from '#models/user'
import { ActivityService } from '#services/activity_service'
import { inject } from '@adonisjs/core'
import { Exception } from '@adonisjs/core/exceptions'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { FileService } from '#services/file_service'
import { DateTime } from 'luxon'
import StringHelper from '#helper/string_helpers'
import drive from '@adonisjs/drive/services/main'
import FileSystemHelper from '#helper/filesystem_helper'
import router from '@adonisjs/core/services/router'

@inject()
export class DashboardUtilityService {
  constructor(protected readonly activityService: ActivityService) {}

  public async copySelectedFolders(
    selectedFoldersId: number[],
    user: User,
    folderId?: string | number
  ) {
    selectedFoldersId.map(async (id) => {
      const selectedFolder = await Folder.find(id)

      if (!selectedFolder) {
        throw new Exception('پوشه مورد نظر یافت نشد')
      }

      const newFolder = await Folder.createWithSlug({
        name: selectedFolder.name,
        user_id: user.id,
        parent_folder_id: folderId as number,
      })

      await selectedFolder.replicateSubFoldersAndFiles(newFolder)

      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} پوشه ${newFolder.name} را کپی کرد`

      await this.activityService.logUserAction(
        user,
        Activity.TYPE_COPY,
        selectedFolder,
        description
      )

      await this.activityService.logUserAction(user, Activity.TYPE_COPY, newFolder, description)
    })
  }

  public async copySelectedFiles(
    selectedFilesId: number[],
    user: User,
    folderId?: string | number
  ) {
    selectedFilesId.map(async (id) => {
      const selectedFile = await EntityGroup.find(id)

      if (!selectedFile) {
        throw new Exception('فایل مورد نظر یافت نشد')
      }

      const data = {
        ...selectedFile,
        name: selectedFile.name,
        user_id: user.id,
        parent_folder_id: folderId as number,
        result_location: selectedFile.result_location,
        meta: selectedFile.meta,
      }

      const newEntityGroup = await EntityGroup.createWithSlug(data)

      const departments = await selectedFile.getEntityGroupDepartments()

      departments.map(async (dep) => {
        await DepartmentFile.create({
          entity_group_id: newEntityGroup.id,
          department_id: dep.id,
        })
      })

      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} فایل ${newEntityGroup.name} را کپی کرد`

      await this.activityService.logUserAction(
        user,
        Activity.TYPE_COPY,
        newEntityGroup,
        description
      )

      await this.activityService.logUserAction(user, Activity.TYPE_COPY, selectedFile, description)
    })
  }

  public async moveSelectedFolders(
    selectedFoldersId: number[],
    user: User,
    folderId?: number | string
  ) {
    selectedFoldersId.map(async (id) => {
      const selectedFolder = await Folder.find(id)

      if (!selectedFolder) {
        throw new Exception('پوشه مورد نظر یافت نشد')
      }

      selectedFolder.parent_folder_id = folderId as number
      await selectedFolder.save()

      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} پوشه ${selectedFolder.name} را به پوشه ${selectedFolder.parent_folder_id} منتقل کرد`
      await this.activityService.logUserAction(
        user,
        Activity.TYPE_MOVE,
        selectedFolder,
        description
      )
    })
  }

  public async permenantDeleteSelectedFolders(selectedFoldersId: number[], user: User) {
    db.transaction(async (trx) => {
      selectedFoldersId.map(async (id) => {
        const selectedFolder = await Folder.query().where('id', id).forUpdate().firstOrFail()
        selectedFolder.useTransaction(trx)
        await this.deleteChildEntityGroupsAndSubFolders(selectedFolder, user)
      })
    })
  }

  public async permanentDeleteSelectedFiles(selectedFilesId: number[], user: User) {
    const fileService = await app.container.make(FileService)

    db.transaction(async (trx) => {
      selectedFilesId.map(async (id) => {
        const selectedFile = await EntityGroup.findOrFail(id)
        selectedFile.useTransaction(trx)
        await fileService.deleteEntityGroupAndEntitiesAndFiles(selectedFile, user)
      })
    })
  }

  public async deleteChildEntityGroupsAndSubFolders(folder: Folder, user: User) {
    const entityGroups = await EntityGroup.query().where('parent_folder_id', folder.id)
    const fileService = await app.container.make(FileService)

    entityGroups.map(async (entityGroup) => {
      await fileService.deleteEntityGroupAndEntitiesAndFiles(entityGroup, user)
      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} فایل ${entityGroup.name} حذف کرد.`
      await this.activityService.logUserAction(user, Activity.TYPE_DELETE, entityGroup, description)
    })

    const subFolders = await Folder.query().where('parent_folder_id', folder.id)

    subFolders.map(async (subFolder) => {
      await this.deleteChildEntityGroupsAndSubFolders(subFolder, user)
      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} پوشه ${subFolder.name} حذف کرد.`
      await this.activityService.logUserAction(user, Activity.TYPE_DELETE, subFolder, description)
    })

    await folder.delete()
  }

  public async trashSelectedFolders(selectedFoldersId: number[], user: User) {
    selectedFoldersId.map(async (id) => {
      const selectedFolder = await Folder.findOrFail(id)
      if (selectedFolder.archived_at) {
        selectedFolder.archived_at = null
      }

      selectedFolder.deleted_at = DateTime.now()
      await selectedFolder.save()

      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} پوشه ${selectedFolder.name} حذف کرد.`
      await this.activityService.logUserAction(
        user,
        Activity.TYPE_DELETE,
        selectedFolder,
        description
      )
    })
  }

  public async trashSelectedFiles(selectedFilesId: number[], user: User): Promise<void> {
    selectedFilesId.map(async (id) => {
      const selectedFile = await EntityGroup.findOrFail(id)

      if (selectedFile.archived_at) {
        selectedFile.archived_at = null
      }

      selectedFile.deleted_at = DateTime.now()
      await selectedFile.save()

      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} فایل ${selectedFile.name} حذف کرد.`

      await this.activityService.logUserAction(
        user,
        Activity.TYPE_DELETE,
        selectedFile,
        description
      )
    })
  }

  public async retrieveTrashSelectedFolders(
    selectedFoldersId: number[],
    user: User
  ): Promise<void> {
    selectedFoldersId.map(async (id) => {
      const selectedFolder = await Folder.findOrFail(id)

      selectedFolder.deleted_at = null
      await selectedFolder.save()

      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} پوشه ${selectedFolder.name} بازیابی کرد.`

      await this.activityService.logUserAction(
        user,
        Activity.TYPE_RETRIEVAL,
        selectedFolder,
        description
      )
    })
  }

  public async retrieveTrashSelectedFiles(selectedFilesId: number[], user: User): Promise<void> {
    selectedFilesId.map(async (id) => {
      const selectedFile = await EntityGroup.findOrFail(id)

      selectedFile.deleted_at = null
      await selectedFile.save()

      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} فایل ${selectedFile.name} بازیابی کرد.`

      await this.activityService.logUserAction(
        user,
        Activity.TYPE_RETRIEVAL,
        selectedFile,
        description
      )
    })
  }

  public async archiveSelectedFolders(selectedFoldersId: number[], user: User): Promise<void> {
    selectedFoldersId.map(async (id) => {
      const selectedFolder = await Folder.findOrFail(id)

      selectedFolder.archived_at = DateTime.now()
      await selectedFolder.save()

      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} پوشه ${selectedFolder.name} بایگانی کرد.`

      await this.activityService.logUserAction(
        user,
        Activity.TYPE_RETRIEVAL,
        selectedFolder,
        description
      )
    })
  }

  public async archiveSelectedFiles(selectedFilesId: number[], user: User): Promise<void> {
    selectedFilesId.map(async (id) => {
      const selectedFile = await EntityGroup.findOrFail(id)

      selectedFile.archived_at = DateTime.now()
      await selectedFile.save()

      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} فایل ${selectedFile.name} بایگانی کرد.`

      await this.activityService.logUserAction(
        user,
        Activity.TYPE_RETRIEVAL,
        selectedFile,
        description
      )
    })
  }

  public async retrieveArchiveSelectedFolders(
    selectedFoldersId: number[],
    user: User
  ): Promise<void> {
    selectedFoldersId.map(async (id) => {
      const selectedFolder = await Folder.findOrFail(id)

      selectedFolder.archived_at = null
      await selectedFolder.save()

      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} پوشه ${selectedFolder.name} از بایگانی خارج کرد.`

      await this.activityService.logUserAction(
        user,
        Activity.TYPE_RETRIEVAL,
        selectedFolder,
        description
      )
    })
  }

  public async retrieveArchiveSelectedFiles(selectedFilesId: number[], user: User): Promise<void> {
    selectedFilesId.map(async (id) => {
      const selectedFile = await EntityGroup.findOrFail(id)

      selectedFile.archived_at = null
      await selectedFile.save()

      const description = `کاربر ${user.name} با کد پرسنلی ${user.personal_id} فایل ${selectedFile.name} از بایگانی خارج کرد.`

      await this.activityService.logUserAction(
        user,
        Activity.TYPE_RETRIEVAL,
        selectedFile,
        description
      )
    })
  }

  public async downloadZipFile(
    user: User,
    folderIds: (number | string)[],
    fileIds: (number | string)[]
  ): Promise<string> {
    const todayDate = DateTime.now().toISODate()
    const folderName = StringHelper.uniqid(`${user.id}`)
    const baseFolder = `${todayDate}/${folderName}`

    FileSystemHelper.makeDirectory('zip', baseFolder)

    folderIds.map(async (id) => {
      const selectedFolder = await Folder.find(id)
      if (!selectedFolder) {
        throw new Exception('پوشه مورد نظر یافت نشد')
      }

      const baseFolderDir = `${baseFolder}/${selectedFolder.name}`
      const resultDir = FileSystemHelper.makeDirectory('zip', baseFolderDir)
      await selectedFolder.retrieveSubFoldersAndFilesForDownload(resultDir)
    })

    try {
      fileIds.map(async (id) => {
        const eg = await EntityGroup.findOrFail(id)
        const { fileContent, fileName } = await eg.generateFileDataForEmbedding(false)
        await drive.use('zip').put(`${baseFolder}/${fileName}`, fileContent as string)
      })

      const baseFolderPath = FileSystemHelper.path('zip', baseFolder)

      await FileSystemHelper.zip(baseFolderPath, `${folderName}.zip`)

      return `${baseFolder}/${folderName}.zip`
    } catch (error) {
      throw new Exception(JSON.stringify(error))
    }
  }

  public async getRedirectRouteAfterOperation(folderId: number | string): Promise<string> {
    const destinationFolder = await Folder.find(folderId)
    if (!destinationFolder) {
      throw new Exception('پوشه مورد نظر یافت نشد')
    }

    return router
      .builder()
      .params({
        folderId: destinationFolder.getFolderId(),
      })
      .make('web.user.dashboard.folder.show')
  }
}
