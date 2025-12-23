# PantryPal

**A self-hosted pantry management system built to solve a real household problem**

[![Status](https://img.shields.io/badge/Status-Production%20Ready-success)](https://github.com/harung1993/pantrypal)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Web-blue)](https://github.com/harung1993/pantrypal)
[![License](https://img.shields.io/badge/License-AGPL--3.0-orange)](LICENSE)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Ready-41BDF5)](https://www.home-assistant.io/)

---

## The Story Behind PantryPal

My wife and I have a pantry in the basement. We kept buying duplicate items because we couldn't remember what we already had down there, and we'd regularly discover expired food we'd forgotten about.

As a data scientist learning software development as a hobby, I built PantryPal to solve this problem. It integrates with our Home Assistant setup and lets us quickly scan barcodes to track what we have.

Simple problem, over-engineered solution. But it works.

This is the first of three household management tools I'm building as part of the PalStack - a suite of privacy-first, self-hosted life management applications:

- **PantryPal** - You're here! Pantry inventory management
- **PropertyPal** - Property and maintenance tracking (in development)
- **BudgetPal** - Debt repayment and household budgeting (fork of DollarDollar Bill Y'all)

---

## What PantryPal Does

**The Core Problem:** "Do we have tomato sauce, or should I buy it?"

**The Solution:**
- Scan barcodes with your phone to add items instantly
- Get notified before things expire
- Integrate with Home Assistant for automations
- Voice control: "Hey Google, do we have pasta?" (coming soon)
- Multi-user support so the whole family can contribute

---

## Key Features

### For Everyday Use
- **Barcode Scanning**: Quick item entry via mobile camera (supports food & household items)
- **Manual Entry**: Add items without barcodes
- **Expiry Tracking**: Know what's expiring before it goes bad
- **Multi-User Support**: Family members can all access and update
- **Beautiful Web Dashboard**: Minimal, clean interface with dark mode
- **Mobile App**: Native iOS app (distributed via TestFlight)
- **Automated Backups**: Optional scheduled CSV backups with retention policy
- **CSV Import/Export**: Easy data portability and disaster recovery
- **Multi-Source Lookup**: Automatic fallback to multiple barcode databases for better coverage

### For Home Assistant Fans
- **REST API Integration**: Pull pantry data into Home Assistant
- **Automation Support**: Trigger notifications, shopping lists, etc.
- **Voice Control Ready**: Foundation laid for Google Assistant/Alexa integration
- **Self-Hosted**: No cloud dependencies, runs on your network
- **API Key Support**: Secure service-to-service authentication

### Privacy & Control
- **100% Self-Hosted**: Your data never leaves your network
- **No Subscriptions**: Free and open for personal use
- **No Tracking**: No analytics, no telemetry, no phone-home
- **Full Control**: Modify anything you want
- **Secure by Default**: Multiple authentication modes for different use cases

---

## Screenshots

### Web Dashboard (Light Mode)
Clean, minimal interface with warm color scheme showing all your items at a glance

### Web Dashboard (Dark Mode)
Easy on the eyes for evening pantry checks with full dark mode support

### Mobile App
Native iOS experience with barcode scanning and biometric authentication

### Home Assistant Integration
Pantry stats and expiring items right in your dashboard

---

## Quick Start

### Option 1: Docker Hub (Easiest - Recommended)

Pull pre-built images from Docker Hub - no need to clone the repo!

```bash
# Download docker-compose file
curl -O https://raw.githubusercontent.com/harung1993/pantrypal/main/docker-compose-hub.yml

# (Optional) Create .env file for email notifications
cat > .env << 'EOF'
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=PantryPal
SMTP_USE_TLS=true
EOF

# Start PantryPal
docker-compose -f docker-compose-hub.yml up -d

# Access at http://localhost
```

**First Time Setup:**
1. Open http://localhost in your browser
2. Click "Sign Up" to create your account
3. Set your username and password
4. Configure default location and categories in Settings

### Option 2: Build from Source

For developers or if you want to customize:

```bash
# Clone repository
git clone https://github.com/harung1993/pantrypal.git
cd pantrypal

# Start services (builds automatically)
./start-pantrypal.sh

# Or manually
docker-compose up -d
```

### Prerequisites (for both options)
- Docker and Docker Compose
- (Optional) Home Assistant instance
- (Optional) SMTP for email notifications
- For iOS app: Request TestFlight access (email: palstack4u@gmail.com)

**That's it!** Open http://localhost in your browser and create your account.

---

## Architecture

Built with a microservices architecture for easy maintenance and future expansion:

```
nginx (reverse proxy)
├── api-gateway (FastAPI)     # Authentication, routing, email notifications
├── inventory-service         # Item CRUD operations
├── lookup-service            # Barcode to product info lookup
└── web-ui (React)            # Dashboard interface
```

**Tech Stack:**
- Backend: Python 3.11 + FastAPI
- Frontend: React 18 + Vite
- Mobile: React Native + Expo
- Database: SQLite (simple, portable, no setup)
- Reverse Proxy: nginx
- Barcode Data: Open Food Facts API + UPCitemDB (fallback for non-food items)

---

## Authentication Modes

PantryPal supports flexible authentication to fit different use cases. Configure `AUTH_MODE` in `docker-compose.yml`:

| Mode | Best For | Home Network | External Access |
|------|----------|--------------|-----------------|
| **full** | Maximum security (recommended) | Login required | Login required |
| **smart** | Convenience at home | Open (no login) | Login required |
| **none** | Single user only | Open | Open (insecure) |
| **api_key_only** | API integrations | API key only | API key only |

**Default Mode:** `full` - All users must create accounts and login, ensuring secure access from anywhere.

### Authentication Features
- **Session-based authentication** for web and mobile
- **API key support** for Home Assistant and service integrations
- **Biometric authentication** on mobile (Face ID, Touch ID, Fingerprint)
- **Password reset** via email
- **Multi-user support** with admin capabilities

---

## Mobile App Access

The iOS app is distributed via TestFlight for family and early testers.

**Features:**
- Native iOS experience
- Barcode scanning with camera
- Biometric authentication (Face ID/Touch ID)
- Self-hosted server configuration
- Full inventory management on the go

**Request Access:**
- Email: palstack4u@gmail.com
- Subject: "PantryPal TestFlight Request"
- Include: Your Apple ID email

You'll receive an invitation within 24-48 hours.

**Note:** This is a personal project for family use, not a commercial app. No App Store release is planned.

---

## Home Assistant Integration

### Quick Setup

Add this to your `configuration.yaml`:

```yaml
sensor:
  - platform: rest
    name: Pantry Expiring Items
    resource: http://YOUR_SERVER_IP/api/stats/expiring?days=7
    headers:
      X-API-Key: YOUR_API_KEY_HERE
    value_template: "{{ value_json.summary.total_expiring }}"
    json_attributes:
      - summary
      - items
    scan_interval: 3600
```

### Generate API Key

1. Log in to PantryPal web interface
2. Go to Settings
3. Scroll to "API Keys" section
4. Click "Generate New API Key"
5. Give it a name (e.g., "Home Assistant")
6. Copy the key and use it in your Home Assistant configuration

### Example Automation

```yaml
automation:
  - alias: "Morning Pantry Check"
    trigger:
      - platform: time
        at: "09:00:00"
    condition:
      - condition: numeric_state
        entity_id: sensor.pantry_expiring_items
        above: 0
    action:
      - service: notify.mobile_app
        data:
          title: "Pantry Alert"
          message: "{{ states('sensor.pantry_expiring_items') }} items expiring soon"
```

---

## The PalStack Vision

PantryPal is part of a larger ecosystem of self-hosted life management tools I'm building:

### PantryPal (This Project)
**Status:** Production Ready
**Purpose:** Never buy duplicate groceries again
**Integrations:** Home Assistant, mobile apps

### PropertyPal (In Development)
**Purpose:** Track home maintenance, warranties, and property documents
**Why:** Because I can never remember when I last changed the HVAC filter

### BudgetPal (Planned)
**Purpose:** Household budgeting with focus on debt repayment
**Based on:** DollarDollar Bill Y'all methodology
**Why:** Making finances manageable and transparent for couples

All three share the same philosophy:
- **Privacy-first**: Self-hosted, no cloud dependencies
- **Family-focused**: Multi-user, easy for everyone to use
- **Smart home ready**: Built with Home Assistant integration in mind
- **Open source**: AGPL-3.0 for personal use
- **Privacy-first**: Self-hosted, no cloud dependencies (because trust issues)
- **Family-focused**: Multi-user, easy for everyone to use (even spouses who "just want a list")
- **Smart home ready**: Built with Home Assistant integration in mind (because of course)
- **Open source**: AGPL-3.0 for personal use (sharing is caring)
- **Over-engineered**: Why use a spreadsheet when you can use Docker? 🤷‍♂️

---

## Mobile App Access

The iOS app is distributed via TestFlight for family and early testers.

**Request Access:**
- Email: palstack4u@gmail.com
- Subject: "PantryPal TestFlight Request"
- Include: Your Apple ID email

You'll receive an invitation within 24-48 hours.

**Note:** This is a personal project for family use, not a commercial app. No App Store release is planned.

---

## Authentication Modes

Configure `AUTH_MODE` in `docker-compose.yml`:

| Mode | Best For | Home Network | External Access |
|------|----------|--------------|-----------------|
| **smart** | Most households | Open (no login) | Login required |
| **none** | Single user only | Open | Open (insecure) |
| **full** | Maximum security | Login required | Login required |
| **api_key_only** | API integrations | API key only | API key only |

**Recommended:** Use `smart` mode - it's open when you're home, secure when you're away.

---

## Barcode Lookup

PantryPal uses multiple barcode databases to ensure maximum product coverage.

### Supported Product Types

- **Food Items**: Groceries, beverages, snacks, canned goods
- **Cleaning Products**: Detergents, soaps, household cleaners
- **Personal Care**: Beauty products, hygiene items
- **Household Items**: Paper products, tissues, general household goods
- **Health Products**: Vitamins, supplements, medicines

### How It Works

When you scan a barcode, PantryPal:
1. Checks the local cache first (instant results)
2. Queries Open Food Facts API (best for food items)
3. Falls back to UPCitemDB API (for cleaning & household items)
4. Caches results for 30 days to improve speed

### If Product Not Found

If a barcode isn't found in any database:
- The app allows manual entry
- You can add the product name, brand, category, and other details
- It will be saved for future use

This multi-source approach provides significantly better coverage than single-database systems, especially for non-food items like cleaning supplies that are often missing from food-focused databases.

---

## Automated Backups

PantryPal includes optional automated CSV backups for disaster recovery.

### Configuration

In `docker-compose.yml` or `docker-compose-hub.yml`, configure the inventory service:

```yaml
inventory-service:
  environment:
    - BACKUP_ENABLED=true                 # Enable automated backups
    - BACKUP_SCHEDULE=0 2 * * *          # Daily at 2 AM (cron format)
    - BACKUP_RETENTION_DAYS=7             # Keep backups for 7 days
    - BACKUP_PATH=/app/backups
  volumes:
    - ./backups:/app/backups              # Backup storage directory
```

### Backup Schedule Examples

```bash
# Daily at 2 AM
BACKUP_SCHEDULE=0 2 * * *

# Every 6 hours
BACKUP_SCHEDULE=0 */6 * * *

# Weekly on Sunday at 2 AM
BACKUP_SCHEDULE=0 2 * * 0

# Twice daily (2 AM and 2 PM)
BACKUP_SCHEDULE=0 2,14 * * *
```

### Manual Export

Export your data anytime via the web dashboard:
1. Open PantryPal web UI
2. Navigate to Inventory page
3. Click "Export" button
4. CSV file downloads automatically

### Disaster Recovery

If your database is lost or corrupted:
1. Find the latest backup in `./backups/` directory
2. Open PantryPal web UI
3. Click "Import" on the Inventory page
4. Select the backup CSV file
5. All items are restored

Backup files are named: `pantrypal_backup_YYYY-MM-DD_HHMMSS.csv`

---

## Built With AI Assistance

This project was built with significant help from AI coding assistants:
- **Claude** (Anthropic) - Primary development assistant
- **Qwen** - Code review and optimization
- **Gemini** (Google) - Architecture decisions

Why mention this? Because in 2025, building useful software doesn't mean writing every line yourself. It means solving real problems efficiently. AI tools helped me go from "frustrated pantry shopper" to "working app" in weeks instead of months.

---

## Contributing

This is a personal project built for my household, but:

- 🐛 **Bug reports** are welcome via GitHub Issues
- 💡 **Feature suggestions** appreciated
- 🍴 **Forks encouraged** for personal customization
- 🚫 **Commercial use** requires permission (see LICENSE)

If PantryPal solves your household problem too, I'd love to hear about it!

---

## Development

### Local Development

```bash
# Backend services
docker-compose up -d

# Web UI (with hot reload)
cd services/web-ui
npm install
npm run dev

# Mobile app
cd mobile
npm install
npx expo start
```

### Building for Production

```bash
# Build all Docker images
docker-compose up -d --build

# Build iOS app
cd mobile
eas build --platform ios --profile production
```

### Project Structure

```
pantrypal/
├── docker-compose.yml          # Main orchestration file
├── nginx/                      # Reverse proxy configuration
├── services/
│   ├── api-gateway/           # Authentication and routing
│   ├── inventory-service/     # Item management
│   ├── lookup-service/        # Barcode lookup
│   └── web-ui/                # React dashboard
├── mobile/                     # React Native app
└── data/                       # SQLite databases (created on first run)
```

---

## Roadmap

**Near Term:**
- [ ] Home Assistant voice control integration
- [ ] Receipt scanning with LLM processing for bulk entry
- [ ] Android native app (currently Expo Go only)
- [ ] Shopping list generation from pantry

**Future:**
- [ ] Meal planning based on inventory
- [ ] Nutrition tracking
- [ ] Recipe suggestions based on available items
- [ ] PropertyPal & BudgetPal integration

---

## Why Self-Hosted?

Because your pantry inventory is your personal data. You shouldn't need:
- A subscription to track your own groceries
- Permission from a cloud service to access your data
- Internet connectivity to know what's in your basement

Self-hosting means:
- Complete privacy and control
- No recurring costs
- Works offline
- Integrate with anything
- Modify as needed

---

## Contributing

This is a personal project built for my household, but:

- **Bug reports** are welcome via GitHub Issues
- **Feature suggestions** appreciated
- **Forks encouraged** for personal customization
- **Commercial use** requires permission (see LICENSE)

If PantryPal solves your household problem too, I'd love to hear about it!

---

## License

**AGPL-3.0 - Personal Use**

Copyright (c) 2025 Harun Gunasekaran

This software is free for personal, non-commercial use. If PantryPal helps you solve the same problem it solved for me, that's wonderful!

For commercial use, please reach out.

---

## Acknowledgments

- **My wife** - For the original suggestion to "just keep a list" which I spectacularly over-engineered
- **Three cans of tomato sauce** - For sitting in my basement and inspiring this entire project
- **Open Food Facts** - For the amazing product database API
- **Home Assistant Community** - For building an incredible smart home platform
- **Docker** - For making "but it works on my machine" a thing of the past
- **Everyone who said "just use Google Keep"** - You're not wrong, you're just... simpler than me

---

## Contact

**Project Maintainer:** Harun Gunasekaran
**Email:** palstack4u@gmail.com
**GitHub:** [@harung1993](https://github.com/harung1993)

**PalStack Projects:**
- PantryPal - This project
- PropertyPal - Coming soon
- BudgetPal - Planned

---

*"That's what pals do - they show up and help with the everyday stuff."*

Built for households tired of buying duplicate groceries.
