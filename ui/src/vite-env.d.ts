/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AWS_ASSETS_BUCKET: string
  readonly VITE_AWS_USER_FILES_BUCKET: string
  readonly VITE_AWS_USER_IMAGES_BUCKET: string
  // Add other env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
