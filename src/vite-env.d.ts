/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DUCKER_ISSUER?: string;
  readonly VITE_DUCKER_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
