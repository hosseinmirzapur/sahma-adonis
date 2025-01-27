import FileSystemHelper from '#helper/filesystem_helper'
import StringHelper from '#helper/string_helpers'
import Letter from '#models/letter'
import LetterAttachment from '#models/letter_attachment'
import { letterValidator } from '#validators/letter'
import { MultipartFile } from '@adonisjs/core/bodyparser'
import { DateTime } from 'luxon'
import type { DriveDisks } from '@adonisjs/drive/types'
import { Exception } from '@adonisjs/core/exceptions'
import LetterInbox from '#models/letter_inbox'
import User from '#models/user'
import LetterSign from '#models/letter_sign'

export class LetterService {
  public async letterValidation(parameters: Record<string, any>[]) {
    return letterValidator.validate(parameters)
  }

  public async handleLetterSignAndInbox(
    letter: Letter,
    receiverUserIds: number[],
    signUserIds: number[],
    uploadedFiles: MultipartFile[]
  ) {
    const query = LetterAttachment.query().where('letter_id', letter.id)
    const attachments = await query
    if (attachments.length > 0) {
      await query.delete()
    }

    uploadedFiles.forEach(async (file) => {
      const originalFileName = file.clientName
      const extension = FileSystemHelper.fileExtension(file.clientName)

      const nowDate = DateTime.now().toISODate()
      const now = DateTime.now().millisecond / 1000
      const hash = StringHelper.hashWithAlgo('sha3-256', file.clientName)
      const fileName = `${hash}-${now}.${extension}`
      const originalPdfPath = `letter-attachments/${nowDate}`

      const extensionToDiskMap: Record<string, keyof DriveDisks> = {
        doc: 'word',
        docx: 'word',
        jpeg: 'image',
        jpg: 'image',
        png: 'image',
        tif: 'image',
        mp4: 'video',
        avi: 'video',
        mov: 'video',
        wmv: 'video',
        wav: 'voice',
        mp3: 'voice',
        aac: 'voice',
        flac: 'voice',
        wma: 'voice',
        ogg: 'voice',
        m4a: 'voice',
        pdf: 'pdf',
      }

      const disk = extensionToDiskMap[extension]

      if (!disk) {
        throw new Exception('فایل آپلود شده پشتیبانی نمیشود', {
          status: 422,
        })
      }

      try {
        await file.moveToDisk(originalPdfPath, disk, {
          contentType: file.headers['content-type'],
        })
      } catch (error) {
        throw new Exception('Failed to store file in storage', { status: 500 })
      }

      const meta: Record<string, any> = {
        original_file_name: originalFileName,
      }

      const letterAttachment = new LetterAttachment()
      letterAttachment.type = disk
      letterAttachment.file_location = `${originalPdfPath}/${fileName}`
      letterAttachment.meta = meta
      await letterAttachment.related('attachable').associate(letter)
      await letterAttachment.save()
    })
    const letterInboxes = await LetterInbox.query().where('letter_id', letter.id)
    if (letterInboxes.length > 0) {
      await LetterInbox.query().where('letter_id', letter.id).delete()
    }

    receiverUserIds.forEach(async (userId) => {
      const user = await User.find(userId)
      if (!user) {
        throw new Exception('کاربر گیرنده معتبر نیست!', {
          status: 422,
        })
      }

      await LetterInbox.create({
        letter_id: letter.id,
        user_id: user.id,
      })
    })

    const letterSigns = await LetterSign.query().where('letter_id', letter.id)
    if (letterSigns.length > 0) {
      await LetterSign.query().where('letter_id', letter.id).delete()
    }

    signUserIds.forEach(async (userId) => {
      const user = await User.find(userId)
      if (!user) {
        throw new Exception('کاربر امضا کننده معتبر نیست!', {
          status: 422,
        })
      }

      await LetterSign.create({
        letter_id: letter.id,
        user_id: user.id,
      })
    })
  }
}
