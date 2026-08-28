/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SESSIONS_SHEET_CSV_URL: string;
  readonly VITE_QUESTIONS_SHEET_CSV_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
