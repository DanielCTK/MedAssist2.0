// File: MedAssist2.0/vite-env.d.ts

/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Khai báo biến môi trường Vite của bạn ở đây
  readonly VITE_LOCAL_CORE_API_URL: string
  // Nếu bạn có biến nào khác, thêm vào đây:
  // readonly VITE_OTHER_API_KEY: string
  // ...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}