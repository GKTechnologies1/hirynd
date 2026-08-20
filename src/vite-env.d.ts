/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RECRUITER_SESSION_TIMEOUT_MINUTES?: string;
  readonly VITE_RECRUITER_WARNING_MINUTES?: string;
  readonly VITE_DEFAULT_SESSION_TIMEOUT_MINUTES?: string;
  readonly VITE_DEFAULT_WARNING_MINUTES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
