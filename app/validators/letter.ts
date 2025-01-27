import ConfigHelper from '#helper/config_helper'
import Letter from '#models/letter'
import vine from '@vinejs/vine'

export const letterValidator = vine.compile(
  vine.object({
    users: vine
      .array(
        vine.number().exists(async (db, value) => {
          const user = await db.from('users').where('id', value).first()
          return !!user
        })
      )
      .minLength(1),
    attachments: vine
      .array(
        vine.file({
          extnames: ConfigHelper.mimetypes(),
          size: '5120kb',
        })
      )
      .nullable(),
    signs: vine
      .array(
        vine.number().exists(async (db, value) => {
          const user = await db.from('users').where('id', value).first()
          return !!user
        })
      )
      .nullable(),
    subject: vine.string(),
    text: vine.string(),
    description: vine.string().nullable(),
    priority: vine.string().in(Letter.getAllLetterPriorities()),
    dueDate: vine.string().nullable(),
    category: vine.string().in(Letter.getAllLetterCategories()),
    referenceType: vine.string().in(['FOLLOW', 'REFERENCE']).nullable(),
    referenceId: vine
      .number()
      .exists(async (db, value) => {
        const letter = await db.from('letters').where('id', value).first()
        return !!letter
      })
      .nullable(),
  })
)
