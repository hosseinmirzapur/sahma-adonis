import config from '@adonisjs/core/services/config'

type MimetypeConfig = Record<string, Record<string, string[]>>

export default class ConfigHelper {
  public static mimetypes(key?: string): string[] {
    const types = config.get('mimetypes') as MimetypeConfig

    if (key) {
      // If a key is provided, return only the MIME types for that key
      const category = types[key]
      if (!category) {
        return []
      }
      return Object.keys(category).flat()
    }

    // If no key is provided, return all MIME types
    return Object.values(types)
      .flatMap((category) => Object.values(category))
      .flat()
  }
}
