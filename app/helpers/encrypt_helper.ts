import crypto from 'node:crypto'
import env from '#start/env'

class EncryptHelper {
  /**
   * Get OpenSSL Cipher Settings
   */
  public static getOpenSslCipherSettings(): {
    cipherAlgorithm: string
    option: number
    iv: Buffer
  } {
    const cipherAlgorithm = 'aes-128-cbc'
    const option = 0
    const iv = Buffer.from([0xe, 0xe8, 0xed, 0xd5, 0xef, 0x02, 0xeb, 0x86, 0x1])

    return {
      cipherAlgorithm,
      option,
      iv,
    }
  }

  /**
   * Encrypt a string
   * @throws Error
   */
  public static encrypt(str: string): string {
    const settings = this.getOpenSslCipherSettings()
    const key = Buffer.from(env.get('APP_KEY', ''), 'utf8') // Ensure APP_KEY is set in environment variables

    try {
      const cipher = crypto.createCipheriv(settings.cipherAlgorithm, key, settings.iv)
      let encrypted = cipher.update(str, 'utf8', 'base64')
      encrypted += cipher.final('base64')
      return encrypted
    } catch (error) {
      throw new Error('Failed to encrypt string')
    }
  }

  /**
   * Decrypt a string
   */
  public static decrypt(cipherText: string): string {
    const settings = this.getOpenSslCipherSettings()
    const key = Buffer.from(env.get('APP_KEY', ''), 'utf8') // Ensure APP_KEY is set in environment variables

    try {
      const decipher = crypto.createDecipheriv(settings.cipherAlgorithm, key, settings.iv)
      let decrypted = decipher.update(cipherText, 'base64', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (error) {
      throw new Error('Failed to decrypt string')
    }
  }
}

export default EncryptHelper
