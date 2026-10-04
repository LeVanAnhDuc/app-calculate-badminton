/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
  readonly VITE_DUCKER_ISSUER?: string;
  readonly VITE_DUCKER_CLIENT_ID?: string;
  readonly VITE_DUCKER_SCOPE?: string;
  readonly VITE_DUCKER_PROFILE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
