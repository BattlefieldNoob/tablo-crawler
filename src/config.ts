export interface AppConfig {
  baseUrl: string;
  authToken: string;
  enableLogging: boolean;
  enableTelegramNotifications: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  daysToScan: number;
  minParticipants: number;
  maxDistance: number; // km
  intervalSeconds: number; // for loop mode
}

export function buildConfig(partial: Partial<AppConfig>): AppConfig {
  return {
    baseUrl: partial.baseUrl ?? Bun.env.API_BASE_URL ?? "https://api.tabloapp.com",
    authToken: partial.authToken ?? Bun.env.TABLO_AUTH_TOKEN ?? "",
    enableLogging: partial.enableLogging ?? (Bun.env.LOGGING_ENABLED?.toLowerCase() === "true" || true),
    enableTelegramNotifications: partial.enableTelegramNotifications ?? (Bun.env.TELEGRAM_NOTIFICATIONS_ENABLED?.toLowerCase() === "true" || true),
    telegramBotToken: partial.telegramBotToken ?? Bun.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: partial.telegramChatId ?? Bun.env.TELEGRAM_CHAT_ID,
    daysToScan: partial.daysToScan ?? Number(Bun.env.DAYS_TO_SCAN ?? 3),
    minParticipants: partial.minParticipants ?? Number(Bun.env.MIN_PARTICIPANTS ?? 2),
    maxDistance: partial.maxDistance ?? Number(Bun.env.MAX_DISTANCE ?? 10.0),
    intervalSeconds: partial.intervalSeconds ?? Number(Bun.env.INTERVAL_SECONDS ?? 300),
  };
}

export function requireAuth(config: AppConfig) {
  if (!config.authToken) throw new Error("Missing auth token (use --auth-token or TABLO_AUTH_TOKEN)");
}
