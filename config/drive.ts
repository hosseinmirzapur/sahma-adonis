import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, services } from '@adonisjs/drive'

const driveConfig = defineConfig({
  // Default disk to use
  default: env.get('DRIVE_DISK', 'fs'),

  services: {
    // Local filesystem configuration
    fs: services.fs({
      location: app.makePath('storage'),
      serveFiles: true,
      routeBasePath: '/uploads', // Base path for serving files
      visibility: 'public',
    }),

    // Additional local disks for different file types
    image: services.fs({
      location: app.makePath('storage/app/image'),
      serveFiles: true,
      routeBasePath: '/uploads/image', // Base path for image files
      visibility: 'public',
    }),
    word: services.fs({
      location: app.makePath('storage/app/word'),
      serveFiles: true,
      routeBasePath: '/uploads/word', // Base path for word files
      visibility: 'public',
    }),
    csv: services.fs({
      location: app.makePath('storage/app/csv'),
      serveFiles: true,
      routeBasePath: '/uploads/csv', // Base path for CSV files
      visibility: 'public',
    }),
    voice: services.fs({
      location: app.makePath('storage/app/voice'),
      serveFiles: true,
      routeBasePath: '/uploads/voice', // Base path for voice files
      visibility: 'public',
    }),
    video: services.fs({
      location: app.makePath('storage/app/video'),
      serveFiles: true,
      routeBasePath: '/uploads/video', // Base path for video files
      visibility: 'public',
    }),
    pdf: services.fs({
      location: app.makePath('storage/app/pdf'),
      serveFiles: true,
      routeBasePath: '/uploads/pdf', // Base path for PDF files
      visibility: 'public',
    }),
    zip: services.fs({
      location: app.makePath('storage/app/zip'),
      serveFiles: true,
      routeBasePath: '/uploads/zip', // Base path for zip files
      visibility: 'public',
    }),
    excel: services.fs({
      location: app.makePath('storage/app/excel'),
      serveFiles: true,
      routeBasePath: '/uploads/excel', // Base path for Excel files
      visibility: 'public',
    }),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}
