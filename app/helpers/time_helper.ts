import { DateTime } from 'luxon'

class TimeHelper {
  /**
   * Get the next datetime divisible by 3 hours.
   * @param datetime Optional Luxon DateTime instance
   * @returns Luxon DateTime instance
   */
  public static getNext3DivisibleDateTime(datetime: DateTime = DateTime.now()): DateTime {
    const hourRemainder = datetime.hour % 3
    const addHours = hourRemainder === 0 ? 3 : 3 - hourRemainder
    return datetime.plus({ hours: addHours }).set({ minute: 0, second: 0, millisecond: 0 })
  }

  /**
   * Get the last divisible datetime by `n` minutes.
   * @param n Minutes divisor
   * @param date Optional Luxon DateTime instance
   * @param last Which previous interval to calculate (default: 1)
   * @returns Luxon DateTime instance
   */
  public static getLastNMinDivisibleDateTime(
    n: number,
    date: DateTime = DateTime.now(),
    last: number = 1
  ): DateTime {
    const seconds = n * 60
    const offsetSeconds = date.offset * 60
    const adjustedTimestamp = Math.floor((date.toSeconds() + offsetSeconds) / seconds) - (last - 1)
    return DateTime.fromSeconds(adjustedTimestamp * seconds - offsetSeconds)
  }

  /**
   * Get the last 15-minute divisible timestamp.
   * @param last Which previous interval to calculate (default: 1)
   * @returns Timestamp as a number
   */
  public static getLast15MinTimestamp(last: number = 1): number {
    const nowSeconds = Math.floor(DateTime.now().toSeconds())
    return Math.floor((nowSeconds / 900 - (last - 1)) * 900)
  }

  /**
   * Get human-readable difference between two DateTime instances in Persian.
   * @param start Starting Luxon DateTime instance
   * @param end Ending Luxon DateTime instance (default: now)
   * @returns Human-readable Persian difference
   */
  public static getPersianHumanReadableDiff(
    start: DateTime,
    end: DateTime = DateTime.now()
  ): string {
    const diff = end
      .diff(start, ['years', 'months', 'days', 'hours', 'minutes', 'seconds'])
      .toObject()

    const { years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0 } = diff

    let readable = ''
    if (years) {
      readable = `${years} سال`
      if (months) readable += ` و ${months} ماه`
    } else if (months) {
      readable = `${months} ماه`
      if (days) readable += ` و ${days} روز`
    } else if (days) {
      readable = `${days} روز`
      if (hours) readable += ` و ${hours} ساعت`
    } else if (hours) {
      readable = `${hours} ساعت`
      if (minutes) readable += ` و ${minutes} دقیقه`
    } else if (minutes) {
      readable = `${minutes} دقیقه`
      if (seconds) readable += ` و ${seconds} ثانیه`
    } else if (seconds) {
      readable = `${seconds} ثانیه`
    }

    return this.convertToPersianNumbers(readable)
  }

  /**
   * Convert English digits to Persian digits.
   * @param input String to convert
   * @returns Converted string
   */
  private static convertToPersianNumbers(input: string): string {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
    return input.replace(/\d/g, (digit) => persianNumbers[Number.parseInt(digit, 10)])
  }
}

export default TimeHelper
