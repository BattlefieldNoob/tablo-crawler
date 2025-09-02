#!/usr/bin/env bun
import { Command } from "commander";
import { usersCmd } from "./users";
import { buildConfig } from "./config";
import { TabloClient } from "./http";
import { ConsoleMessageService, TelegramMessageService } from "./message";
import { scanMultipleDays } from "./scanner";

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

program.parse(Bun.argv);
