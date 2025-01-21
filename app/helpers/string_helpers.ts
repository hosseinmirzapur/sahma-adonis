class StringHelper {
  public static uniqid(prefix: string = ''): string {
    const randomValue = Math.floor(Math.random() * 1000000000)
    const timestamp = Date.now()
    return `${prefix}${timestamp}${randomValue}`
  }
}

export default StringHelper
