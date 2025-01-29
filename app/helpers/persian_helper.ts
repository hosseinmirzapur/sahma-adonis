import moment from 'moment-jalaali'

export default class PersianHelper {
  public static englishDigitsToPersian(str: string): string[] | string {
    const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
    const english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

    if (Array.isArray(str)) {
      return str.map((s) => {
        return s.ltrim(
          s.replace(/[۰-۹]/g, (w: any) => {
            return persian[english.indexOf(w)]
          }),
          '0'
        )
      })
    }

    return str.replace(/[۰-۹]/g, (w) => {
      return persian[english.indexOf(w)]
    })
  }

  public static timestampToPersianDatetime(
    timestamp: Date | number | string | null,
    includeTime: boolean = true
  ): string {
    if (timestamp === null) {
      return ''
    }

    // Convert the timestamp to a Date object if it's not already one
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)

    // Format the date using moment-jalaali
    if (includeTime) {
      return moment(date).format('jYYYY/jMM/jDD HH:mm')
    } else {
      return moment(date).format('jYYYY/jMM/jDD')
    }
  }
}
