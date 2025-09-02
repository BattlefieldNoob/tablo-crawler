# Product Overview

TabloCrawler is a TypeScript CLI application that monitors the Tablo social dining platform API to find gender-balanced dining opportunities. It intelligently filters restaurant tables based on participant demographics and sends notifications via Telegram or console output.

## Core Purpose
- Monitor Tablo API for dining events across multiple days
- Filter tables by gender balance (≤1 person difference between male/female participants)
- Apply distance and minimum participant filters
- Send smart notifications only for balanced tables
- Provide detailed participant demographics and restaurant information

## Key Features
- **Smart Gender Filtering**: Only notifies about balanced tables (tolerance of 1 person difference)
- **Multi-Day Scanning**: Configurable scanning from 1-7 days ahead
- **Distance-Based Sorting**: Orders results by proximity to configured location
- **Flexible Notifications**: Telegram integration with console fallback
- **Dual CLI Tasks**: Table scanning and restaurant user listing
- **Robust Configuration**: Environment variables, CLI flags, and sensible defaults

## Target Users
Developers and users interested in finding balanced social dining opportunities in the Padova area through automated monitoring of the Tablo platform.