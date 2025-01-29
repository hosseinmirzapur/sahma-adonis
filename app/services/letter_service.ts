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
import PersianHelper from '#helper/persian_helper'
import LetterReply from '#models/letter_reply'
import router from '@adonisjs/core/services/router'
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'

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

  public async getUserLettersByStatusAsArray(
    user: User,
    neededStatuses: string[]
  ): Promise<Array<Record<string, any>>> {
    const letters = await Letter.query()
      .where('user_id', user.id)
      .whereIn('status', neededStatuses)
      .orderBy('created_at', 'desc')

    return letters.map(async (letter) => {
      const attachmentExists = await LetterAttachment.query().where('letter_id', letter.id)
      const sender = await User.find(letter.user_id)
      const letterSigns = await LetterSign.query().where('letter_id', letter.id)

      return {
        status: letter.getLetterStatus(user),
        attachment: !!attachmentExists,
        id: letter.id,
        subject: letter.subject,
        sender: sender?.name,
        description: letter.description,
        dueDate: letter.due_date,
        submittedAt: PersianHelper.timestampToPersianDatetime(letter.submitted_at as string),
        referenceType: letter.letter_reference_type ?? null,
        letterSigns: !!letterSigns,
        priority: letter.priority,
        category: letter.category,
      }
    })
  }

  public async getUserInboxLettersAsArray(user: User): Promise<Array<Record<string, any>>> {
    const letters = await Letter.query()
      .select('letters.*')
      .join('letter_inboxes', 'letter_inboxes.letter_id', 'letters.id')
      .where('letter_inboxes.letter_id', user.id)
      .whereNotIn('letters.status', [
        Letter.STATUS_DRAFT,
        Letter.STATUS_DELETED,
        Letter.STATUS_ARCHIEVED,
      ])
      .distinct('letters.id')
      .orderBy('letters.updated_at')

    return letters.map(async (letter) => {
      const letterSignInfo = await LetterSign.query()
        .where('letter_id', letter.id)
        .where('user_id', user.id)
        .select('letter_signs.signed_at')

      const letterReplies = await LetterReply.query()
        .where('letter_id', letter.id)
        .where('recipient_id', user.id)
        .orWhere('user_id', user.id)

      const letterRepliesArray = letterReplies.map(async (lr) => {
        return {
          userName: lr.user.name,
          createdAt: PersianHelper.timestampToPersianDatetime(lr.createdAt.toISODate()),
          text: lr.text,
          attachments: await this.getAttachments(lr),
        }
      })

      const referInfo = await LetterInbox.query()
        .where('letter_id', letter.id)
        .where('user_id', user.id)
        .where('is_refer', true)
        .first()

      const attachments = await LetterAttachment.query().where('letter_id', letter.id)

      const readStatus = await LetterInbox.query()
        .where('letter_id', letter.id)
        .where('user_id', user.id)
        .where('read_status', true)
        .first()

      const signUsers = await LetterSign.query().where('letter_id', letter.id)

      return {
        status: letter.getLetterStatus(user),
        attachment: !!attachments,
        id: letter.id,
        read_status: !!readStatus,
        subject: letter.subject,
        sender: letter.user.name,
        description: letter.description,
        dueDate: letter.due_date,
        submittedAt: PersianHelper.timestampToPersianDatetime(letter.submitted_at as string),
        referenceType: letter.letter_reference_type ?? null,
        signUsers: !!signUsers,
        priority: letter.priority,
        category: letter.category,
        letterSignInfo: letterSignInfo,
        letterReplies: letterRepliesArray,
        referInfo: referInfo
          ? {
              referrerUser: referInfo.referrerUser?.name,
              referDescription: referInfo.refer_desccription,
            }
          : null,
      }
    })
  }

  public async getUserAllLettersArchivedOrDeletedAsArray(
    user: User,
    isArchviedList: boolean = true,
    isDeletedList: boolean = true
  ) {
    const letters = await Letter.query()
      .select('letters.*')
      .join('letter_inboxes', 'letter_inboxes.letter_id', 'letters.id')
      .where((q) => {
        if (isArchviedList) {
          q.orWhere('letters.status', Letter.STATUS_ARCHIEVED)
        }

        if (isDeletedList) {
          q.orWhere('letters.status', Letter.STATUS_DELETED)
        }
      })
      .where((q) => {
        q.where('letters.users_id', user.id).orWhere('letter_inboxes.user_id', user.id)
      })
      .distinct('letters.id')
      .orderBy('letters.id')

    return letters.map(async (letter) => {
      const attachments = await LetterAttachment.query().where('letter_id', letter.id)
      const signUsers = await LetterSign.query().where('letter_id', letter.id)

      return {
        status: letter.getLetterStatus(user),
        attachment: !!attachments,
        id: letter.id,
        subject: letter.subject,
        sender: letter.user.name,
        description: letter.description,
        dueDate: letter.due_date,
        submittedAt: PersianHelper.timestampToPersianDatetime(letter.submitted_at as string),
        referenceType: letter.letter_reference_type ?? null,
        signUsers: !!signUsers,
        priority: letter.priority,
        category: letter.category,
      }
    })
  }

  public async getSignUserInfo(letter: Letter): Promise<Array<Record<string, any>>> {
    const signs = await LetterSign.query().where('letter_id', letter.id)

    return signs.map(async (sign) => {
      return {
        id: sign.user.id,
        userName: sign.user.name,
        signedAt: sign.signed_at,
      }
    })
  }

  public async getReceiverUsers(letter: Letter): Promise<Array<Record<string, any>>> {
    const inboxes = await LetterInbox.query().where('letter_id', letter.id)

    return inboxes.map(async (inbox) => {
      return {
        id: inbox.user.id,
        userName: inbox.user.name,
        seen: !!inbox.read_status,
        personalId: !!inbox.user.personal_id,
      }
    })
  }

  public async getAttachments(letter: LetterReply | Letter): Promise<Array<Record<string, any>>> {
    const attachments = await LetterAttachment.query().where('attachable_id', letter.id)

    return attachments.map(async (attachment) => {
      return {
        id: attachment.id,
        fileName: attachment.meta['original_file_name'] ?? '',
        type: attachment.type,
        downloadLink: router
          .builder()
          .params({
            letterAttachment: attachment.id,
          })
          .make('web.user.cartable.download-attachment'),
      }
    })
  }

  public async getReplies(letter: Letter, user: User): Promise<Array<Record<string, any>>> {
    const replies = await LetterReply.query()
      .where('letter_id', letter.id)
      .where((q) => {
        q.where('recipient_id', user.id).orWhere('user_id', user.id)
      })
      .orderBy('id', 'desc')

    return replies.map(async (reply) => {
      const attachments = await LetterAttachment.query()
        .where('attachable_id', reply.id)
        .select(['id', 'meta', 'type'])
      const attachmentsData = attachments.map((attachment) => {
        return {
          id: attachment.id,
          fileName: attachment.meta['original_file_name'] ?? null,
          type: attachment.type,
          downloadLink: router
            .builder()
            .params({
              letterAttachment: attachment.id,
            })
            .make('web.user.cartable.download-attachment'),
        }
      })

      return {
        id: reply.id,
        repliedAt: PersianHelper.timestampToPersianDatetime(reply.createdAt.toISO()),
        respondingUser: reply.user.name,
        respondText: reply.text,
        attachments: attachmentsData,
      }
    })
  }

  @inject()
  public async paginationService(ctx: HttpContext, currentPage: number, queryArrayLetter: any[]) {
    const perPage = 7
    const offset = (currentPage - 1) * perPage
    const limitedWorkers = queryArrayLetter.slice(offset, offset + perPage)
    const total = queryArrayLetter.length
    const lastPage = Math.ceil(total / perPage)

    // Get HTTP context for URL generation
    const path = ctx.request.url()

    // Preserve existing query parameters (except page)
    const queryWithoutPage = { ...ctx.request.qs() }
    delete queryWithoutPage.page

    // Helper to build pagination URLs
    const buildPageUrl = (page: number) => {
      const query = { ...queryWithoutPage, page }
      const queryString = new URLSearchParams({
        page: `${query.page}`,
      }).toString()
      return queryString ? `${path}?${queryString}` : path
    }

    return {
      data: limitedWorkers,
      meta: {
        total: total,
        per_page: perPage,
        current_page: currentPage,
        last_page: lastPage,
        first_page: 1,
        from: offset + 1,
        to: offset + limitedWorkers.length,
      },
      links: {
        first: buildPageUrl(1),
        last: buildPageUrl(lastPage),
        prev: currentPage > 1 ? buildPageUrl(currentPage - 1) : null,
        next: currentPage < lastPage ? buildPageUrl(currentPage + 1) : null,
      },
    }
  }
}
