import crypto from 'node:crypto'

class StringHelper {
  public static uniqid(prefix: string = ''): string {
    const randomValue = Math.floor(Math.random() * 1000000000)
    const timestamp = Date.now()
    return `${prefix}${timestamp}${randomValue}`
  }

  public static hashWithAlgo(algorithm: string, data: any): string {
    return crypto.createHash(algorithm).update(data).digest('hex')
  }
}

export default StringHelper
