import EntityGroup from '#models/entity_group'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import path from 'node:path'
import fs from 'node:fs'
import { DateTime } from 'luxon'
import drive from '@adonisjs/drive/services/main'
import { cuid } from '@adonisjs/core/helpers'
import Entity from '#models/entity'
import { Exception } from '@adonisjs/core/exceptions'
import FileSystemHelper from '#helper/filesystem_helper'
import { FileService } from '#services/file_service'
import CliHelper from '#helper/cli_helper'

export class OfficeService {
  public async generateWordFile(entityGroup: EntityGroup, text: string) {
    const paragraphs = text.split('\n').map((line) => line.trim())

    const docParagraphs = []
    let previousIsEmpty = false

    for (const paragraph of paragraphs) {
      if (paragraph) {
        if (previousIsEmpty) {
          docParagraphs.push(new Paragraph(''))
        }
        docParagraphs.push(
          new Paragraph({
            children: [new TextRun(paragraph)],
            alignment: 'both',
          })
        )
        previousIsEmpty = false
      } else {
        previousIsEmpty = true
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docParagraphs,
        },
      ],
    })

    const buffer = await Packer.toBuffer(doc)
    const originalFileName = path.parse(entityGroup.name).name
    const filename = `${originalFileName}.docx`
    const tempPath = path.join('/tmp', filename)
    await fs.promises.writeFile(tempPath, buffer)

    const nowDate = DateTime.now().toFormat('yyyy-LL-dd')
    const nowTimestamp = DateTime.now().toSeconds()
    const storageFilePath = `${nowDate}/${nowTimestamp}-${filename}`

    try {
      const fileContent = await fs.promises.readFile(tempPath)
      await drive.use('word').put(storageFilePath, fileContent)
      await fs.promises.unlink(tempPath)
      return storageFilePath
    } catch (error) {
      throw new Error(`WORD => Failed to process file: ${error.message}`)
    }
  }

  public async generateCsvFileEntity(text: string) {
    const originalFileName = `split_voice_${cuid().replace(/-/g, '')}`
    const now = DateTime.now()
    const fileName = `${now.toSeconds()}-${originalFileName}.csv`
    const tempPath = path.join('/tmp', fileName)

    try {
      await fs.promises.writeFile(tempPath, text, 'utf8')
      const content = await fs.promises.readFile(tempPath, 'utf8')
      await fs.promises.unlink(tempPath)

      const nowDate = now.toFormat('yyyy-MM-dd')
      const csvAddress = `${nowDate}/${fileName}`

      await drive.use('csv').put(csvAddress, content)
      return csvAddress
    } catch (error) {
      throw new Error(`Failed to process CSV file: ${error.message}`)
    }
  }

  public async generateWindowsEntityGroup(
    entityGroup: EntityGroup
  ): Promise<Record<string, string>> {
    const entities = await Entity.query().where('entity_group_id', entityGroup.id)
    const voiceWindows: Record<string, string> = {}

    entities.forEach(async (entity) => {
      if (!entity.meta) {
        throw new Exception('csv location does not exist', {
          status: 422,
        })
      }

      const beginningOfWindow = entity.meta['window']['start'] ?? 0
      const csvFilePath = FileSystemHelper.path('csv', entity.meta['csv_location'] ?? '')
      const entityWindows = await FileService.getAudioInfo(csvFilePath)

      for (const [key, text] of Object.entries(entityWindows)) {
        const start = Number(key) + beginningOfWindow
        voiceWindows[start] = text
      }
    })
    return voiceWindows
  }

  public async convertWordFileToPdf(wordFilePath: string): Promise<string> {
    const filename = path.parse(wordFilePath).name
    const baseDir = path.dirname(wordFilePath)

    const wordFileFullPath = FileSystemHelper.path('word', wordFilePath)

    try {
      await CliHelper.execCommand(`unoconv -f pdf ${wordFilePath}`)
      const pdfFileLocation = path.join(baseDir, `${filename}.pdf`)

      await drive.use('pdf').put(pdfFileLocation, await fs.promises.readFile(wordFileFullPath))

      return pdfFileLocation
    } catch (error) {
      throw new Exception(`Failed to convert Word file to PDF: ${error.message}`)
    }
  }
}
