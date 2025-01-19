import { Exception } from '@adonisjs/core/exceptions'
import config from '@adonisjs/core/services/config'
import logger from '@adonisjs/core/services/logger'
import axios from 'axios'
import fs from 'node:fs'

export class AiService {
  public async submitToOcr(filePath: string, isImage: boolean = false): Promise<any> {
    let url = config.get('ai.ocr.url') as string

    if (isImage) {
      url = `${url}original`
    }

    try {
      const form = new FormData()
      const file = fs.createReadStream(filePath)
      form.append('file', file)
      const response = await axios.post(url, form, {
        headers: {
          Accept: 'application/json',
        },
      })

      if (response.status !== 200) {
        throw new Exception(
          `An error occurred in submitting image to OCR status: ${response.status}`
        )
      }

      return response.data
    } catch (error) {
      throw new Exception(
        `An error occurred in submitting image to OCR status: ${error.response?.status || 500}`
      )
    }
  }

  public async downloadSearchableFile(link: string): Promise<any> {
    const url = `${config.get('ai.ocr.downloadSearchablePdfLink') as string}${link}`

    try {
      const response = await axios.get(url)

      if (response.status !== 200) {
        throw new Exception(
          `An error occurred in downloading searchable file from OCR status: ${response.status}`
        )
      }

      return response.data
    } catch (error) {
      throw new Exception(
        `An error occurred in downloading searchable file from OCR status: ${
          error.response?.status || 500
        }`
      )
    }
  }

  public async submitToAsr(filepath: string): Promise<any> {
    const url = config.get('ai.stt.url') as string

    try {
      const form = new FormData()
      form.append('name', 'audio_file')
      const contents = fs.createReadStream(filepath)
      form.append('contents', contents)
      const response = await axios.post(url, form, {
        headers: {
          Accept: 'application/json',
        },
      })

      if (response.status !== 200) {
        throw new Exception(
          `An error occurred in submitting audio to ASR status: ${response.status}`
        )
      }

      logger.info(response.data)

      return response.data
    } catch (error) {
      throw new Exception(
        `An error occurred in submitting audio to ASR status: ${error.response?.status || 500}`
      )
    }
  }

  public async getVoiceWindows(content: string): Promise<any> {
    const url = config.get('ai.stt.voice_splitter_url') as string

    try {
      const form = new FormData()
      form.append('name', 'file')
      form.append('contents', content)
      form.append('filename', 'name.wav')

      const res = await axios.post(url, form, {
        timeout: 900,
      })

      if (res.status !== 200) {
        throw new Exception(`An error occurred in submitting audio to ASR status: ${res.status}`)
      }

      const data = res.data
      if (!data?.prediction) {
        throw new Exception(`Failed to get prediction. Response ${res.data}`)
      }

      return data.prediction
    } catch (error) {
      throw new Exception(
        `An error occurred in submitting audio to ASR status: ${error.response?.status || 500}`
      )
    }
  }
}
