export type InstallMode = "hidden" | "android" | "ios";

/** Chrome bắn sự kiện này khi app đủ điều kiện cài; chưa có trong lib DOM chuẩn. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
