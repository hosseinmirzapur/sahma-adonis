import { exec } from 'node:child_process'

export default class CliHelper {
  declare private static output: string

  public static async execCommand(command: string) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          CliHelper.output = stderr || error.message
          reject(new Error(stderr || error.message))
        } else {
          CliHelper.output = stdout
          resolve(stdout)
        }
      })
    })
  }

  public static getOutput(): string {
    return CliHelper.output
  }
}
