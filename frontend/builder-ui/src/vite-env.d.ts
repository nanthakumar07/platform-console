/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_URL: string
  readonly VITE_API_URL: string
  readonly VITE_DATA_URL: string
  readonly VITE_METADATA_URL: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
