#!/usr/bin/env bun
import { Command } from "commander";
import { buildConfig } from "./config";
import { TabloClient } from "./http";
import { ConsoleMessageService, TelegramMessageService } from "./message";
import { createMonitoringNotifier } from "./monitoring-notifier";
import { scanMultipleDays } from "./scanner";
import { JsonStateManager } from "./state-manager";
import { DefaultTableTracker } from "./table-tracker";
import { FileUserLoader } from "./user-loader";
import { createUserMonitor } from "./user-monitor";
import { usersCmd } from "./users";

const program = new Command();
program
  .name("tablocrawler")
  .description("TabloCrawler CLI (Bun)")
  .version("0.1.0");

program
  .command("users")
  .description("List users for a restaurant")
  .requiredOption("--id-ristorante <id>", "Restaurant ID")
  .option("--min-partecipazioni <n>", "Minimum participations")
  .option("--api.base.url <url>", "API base URL")
  .option("--auth.token <token>", "Auth token")
  .action(async (opts: { idRistorante: string; minPartecipazioni?: string; apiBaseUrl?: string; authToken?: string; }) => {
    const args: string[] = [
      "--id-ristorante", opts.idRistorante,
      ...(opts.minPartecipazioni ? ["--min-partecipazioni", opts.minPartecipazioni] : []),
      ...(opts.apiBaseUrl ? ["--api.base.url", opts.apiBaseUrl] : []),
      ...(opts.authToken ? ["--auth.token", opts.authToken] : []),
    ];
    await usersCmd(args);
  });

program
  .command("scan")
  .description("Scan tables across multiple days")
  .option("--days <n>", "Days to scan")
  .option("--min-participants <n>", "Minimum participants")
  .option("--max-distance <km>", "Maximum distance in km")
  .option("--latitude <lat>", "Search latitude (default: Padova)")
  .option("--longitude <lng>", "Search longitude (default: Padova)")
  .option("--search-radius <km>", "Search radius in km")
  .option("--api.base.url <url>", "API base URL")
  .option("--auth.token <token>", "Auth token")
  .option("--telegram.bot.token <token>", "Telegram bot token")
  .option("--telegram.chat.id <id>", "Telegram chat id")
  .action(async (opts: any) => {
    const config = buildConfig({
      baseUrl: opts.apiBaseUrl,
      authToken: opts.authToken,
      daysToScan: opts.days ? Number(opts.days) : undefined,
      minParticipants: opts.minParticipants ? Number(opts.minParticipants) : undefined,
      maxDistance: opts.maxDistance ? Number(opts.maxDistance) : undefined,
      latitude: opts.latitude,
      longitude: opts.longitude,
      searchRadius: opts.searchRadius,
      telegramBotToken: opts.telegram?.bot?.token ?? opts["telegram.bot.token"],
      telegramChatId: opts.telegram?.chat?.id ?? opts["telegram.chat.id"],
    });
    if (!config.authToken) throw new Error("Missing auth token (--auth.token or TABLO_AUTH_TOKEN)");
    const client = new TabloClient(config.baseUrl, config.authToken);
    const message = (config.enableTelegramNotifications && config.telegramBotToken && config.telegramChatId)
      ? new TelegramMessageService(config.telegramBotToken, config.telegramChatId)
      : new ConsoleMessageService();
    await scanMultipleDays(client, message, config);
  });

program
  .command("watch-users")
  .description("Monitor specific users for table participation")
  .option("--user-ids-file <path>", "Path to file containing user IDs to monitor")
  .option("--state-file <path>", "Path to state persistence file")
  .option("--scan-interval <seconds>", "Scan interval in seconds")
  .option("--days <n>", "Days to scan")
  .option("--latitude <lat>", "Search latitude (default: Padova)")
  .option("--longitude <lng>", "Search longitude (default: Padova)")
  .option("--search-radius <km>", "Search radius in km")
  .option("--api.base.url <url>", "API base URL")
  .option("--auth.token <token>", "Auth token")
  .option("--telegram.bot.token <token>", "Telegram bot token")
  .option("--telegram.chat.id <id>", "Telegram chat id")
  .action(async (opts: any) => {
    const config = buildConfig({
      baseUrl: opts.apiBaseUrl,
      authToken: opts.authToken,
      userIdsFilePath: opts.userIdsFile,
      stateFilePath: opts.stateFile,
      monitoringIntervalSeconds: opts.scanInterval ? Number(opts.scanInterval) : undefined,
      daysToScan: opts.days ? Number(opts.days) : undefined,
      latitude: opts.latitude,
      longitude: opts.longitude,
      searchRadius: opts.searchRadius,
      telegramBotToken: opts.telegram?.bot?.token ?? opts["telegram.bot.token"],
      telegramChatId: opts.telegram?.chat?.id ?? opts["telegram.chat.id"],
    });

    if (!config.authToken) {
      throw new Error("Missing auth token (--auth.token or TABLO_AUTH_TOKEN)");
    }

    // Create services
    const client = new TabloClient(config.baseUrl, config.authToken);
    const messageService = (config.enableTelegramNotifications && config.telegramBotToken && config.telegramChatId)
      ? new TelegramMessageService(config.telegramBotToken, config.telegramChatId)
      : new ConsoleMessageService();

    const userLoader = new FileUserLoader();
    const stateManager = new JsonStateManager();
    const tableTracker = new DefaultTableTracker();
    const notifier = createMonitoringNotifier(messageService);

    // Create and start user monitor
    const userMonitor = createUserMonitor(
      client,
      userLoader,
      stateManager,
      tableTracker,
      notifier
    );

    await userMonitor.startMonitoring(config);
  });

program.parse(Bun.argv);
