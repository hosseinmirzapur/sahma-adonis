import ConfigHelper from '#helper/config_helper'
import config from '@adonisjs/core/services/config'
import { test } from '@japa/runner'

test.group('File service test', () => {
  test('config mimetypes test', async ({ assert }) => {
    const types = config.get('mimetypes') as Record<string, Record<string, string[]>>
    const allMimeTypes = Object.values(types)
      .flatMap((category) => Object.values(category))
      .flat()

    assert.typeOf(allMimeTypes, 'array')
  })

  test('mimetypes helper function works', async ({ assert }) => {
    const bookMimetypes = ConfigHelper.mimetypes('book')
    const voiceMimeTypes = ConfigHelper.mimetypes('voice')
    console.log(bookMimetypes)
    console.log(voiceMimeTypes)

    assert.typeOf(bookMimetypes[0], 'string')
  })
})
