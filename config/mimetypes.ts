export default {
  voice: {
    'wav': ['audio/wav', 'audio/x-wav'],
    'mp3': ['audio/mpeg'],
    'aac': ['audio/aac'],
    'flac': ['audio/flac', 'audio/x-flac'],
    'wma': ['audio/x-ms-wma'],
    'ogg': ['audio/ogg'],
    'm4a': ['audio/m4a', 'audio/x-m4a'],
    '3gp': ['video/3gpp'],
  },
  video: {
    mp4: ['video/mp4'],
    avi: ['video/x-msvideo'],
    mov: ['video/quicktime'],
    wmv: ['video/x-ms-wmv'],
  },
  book: {
    pdf: ['application/pdf'],
  },
  image: {
    jpeg: ['image/jpeg'],
    jpg: ['image/jpg'],
    tif: ['image/tif'],
  },
  office: {
    docx: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    doc: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
}
