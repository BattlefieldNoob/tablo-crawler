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
  // Location and search parameters
  latitude: string;
  longitude: string;
  searchRadius: string; // km
  // User monitoring configuration
  userIdsFilePath: string;
  stateFilePath: string;
  monitoringIntervalSeconds: number;
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
    // Location and search parameters (defaults to Padova, Italy)
    latitude: partial.latitude ?? Bun.env.SEARCH_LATITUDE ?? "45.408153",
    longitude: partial.longitude ?? Bun.env.SEARCH_LONGITUDE ?? "11.875273",
    searchRadius: partial.searchRadius ?? Bun.env.SEARCH_RADIUS ?? "4",
    // User monitoring configuration
    userIdsFilePath: partial.userIdsFilePath ?? Bun.env.USER_IDS_FILE_PATH ?? "monitored-users.txt",
    stateFilePath: partial.stateFilePath ?? Bun.env.STATE_FILE_PATH ?? "monitoring-state.json",
    monitoringIntervalSeconds: partial.monitoringIntervalSeconds ?? Number(Bun.env.MONITORING_INTERVAL_SECONDS ?? 60),
  };
}

export function requireAuth(config: AppConfig) {
  if (!config.authToken) throw new Error("Missing auth token (use --auth-token or TABLO_AUTH_TOKEN)");
}
