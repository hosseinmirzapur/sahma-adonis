import { exec } from 'node:child_process'

export default class CliHelper {
  public static async execCommand(command: string) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message))
        } else {
          resolve(stdout)
        }
      })
    })
  }
}
