# Specification 24: Internationalization and Localization (I18n/L10n)

**Priority**: P2 (Release 2)
**Status**: Draft
**Last Updated**: 2025-11-11

## 1. Overview

This specification defines the internationalization (i18n) and localization (l10n) capabilities for dCMMS to support global deployment across multiple regions, languages, and cultural contexts. The system will support multi-language interfaces, locale-specific formatting, timezone handling, and culturally appropriate content.

### 1.1 Objectives

- Support 15+ languages for global renewable energy operations
- Provide locale-specific formatting for dates, times, numbers, and currency
- Enable right-to-left (RTL) language support
- Implement timezone-aware data handling
- Support regional compliance and regulatory requirements
- Enable efficient translation management workflows

### 1.2 Scope

**In Scope:**
- User interface translation (web, mobile)
- Backend message localization
- Date/time/number/currency formatting
- Timezone conversion and display
- Translation management system
- RTL language support
- Locale-specific content
- Regional settings management

**Out of Scope:**
- Machine translation of user-generated content
- Voice/audio localization
- Automated content translation (manual translation workflow)

## 2. Supported Languages and Locales

### 2.1 Primary Languages (Phase 1)

| Language | Locale Code | Script | Direction | Priority | Market |
|----------|-------------|--------|-----------|----------|--------|
| English (US) | en-US | Latin | LTR | P0 | Global |
| English (UK) | en-GB | Latin | LTR | P1 | UK, Australia |
| Spanish | es-ES | Latin | LTR | P1 | Spain, Latin America |
| Spanish (Mexico) | es-MX | Latin | LTR | P1 | Mexico |
| French | fr-FR | Latin | LTR | P1 | France, Africa |
| German | de-DE | Latin | LTR | P1 | Germany, Central Europe |
| Hindi | hi-IN | Devanagari | LTR | P1 | India |
| Chinese (Simplified) | zh-CN | Han | LTR | P1 | China |
| Japanese | ja-JP | Kanji/Kana | LTR | P2 | Japan |
| Portuguese (Brazil) | pt-BR | Latin | LTR | P2 | Brazil |

### 2.2 Additional Languages (Phase 2)

| Language | Locale Code | Script | Direction | Priority | Market |
|----------|-------------|--------|-----------|----------|--------|
| Arabic | ar-SA | Arabic | RTL | P2 | Middle East |
| Italian | it-IT | Latin | LTR | P2 | Italy |
| Dutch | nl-NL | Latin | LTR | P2 | Netherlands |
| Korean | ko-KR | Hangul | LTR | P2 | South Korea |
| Turkish | tr-TR | Latin | LTR | P2 | Turkey |

### 2.3 Locale Selection Priority

```javascript
// Locale detection priority order
const localeDetectionStrategy = {
  priority: [
    'user_profile_preference',      // 1. User's saved preference
    'browser_language_header',      // 2. Accept-Language header
    'ip_geolocation',               // 3. IP-based location
    'organization_default',         // 4. Organization setting
    'system_default'                // 5. en-US fallback
  ],

  fallbackChain: {
    'es-MX': ['es-ES', 'en-US'],
    'pt-BR': ['pt-PT', 'en-US'],
    'zh-TW': ['zh-CN', 'en-US'],
    'en-GB': ['en-US']
  }
};
```

## 3. Architecture

### 3.1 I18n Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                     │
├─────────────────────────────────────────────────────────────┤
│  Web App           │  Mobile App       │  Email Templates   │
│  (react-i18next)   │  (i18next)        │  (Handlebars)      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Translation Management                     │
├─────────────────────────────────────────────────────────────┤
│  Phrase TMS / Crowdin                                       │
│  - Translation memory                                        │
│  - Glossary management                                       │
│  - Workflow automation                                       │
│  - Quality assurance                                         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Translation Storage                       │
├─────────────────────────────────────────────────────────────┤
│  S3 Bucket                 │  CDN Cache                      │
│  /translations/            │  (CloudFront)                   │
│    en-US/                  │                                 │
│      common.json           │                                 │
│      workorders.json       │                                 │
│    es-ES/                  │                                 │
│      common.json           │                                 │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Backend Services                        │
├─────────────────────────────────────────────────────────────┤
│  API Gateway              │  Microservices                   │
│  - Locale detection       │  - i18next (Node.js)             │
│  - Language header        │  - Format.js (formatting)        │
│  - Timezone conversion    │  - Luxon (dates/times)           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                        Data Layer                            │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL                                                  │
│  - User locale preferences                                   │
│  - Timezone settings                                         │
│  - Regional configurations                                   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Translation File Structure

```
translations/
├── en-US/
│   ├── common.json              # Common UI elements
│   ├── auth.json                # Authentication
│   ├── workorders.json          # Work order module
│   ├── assets.json              # Asset management
│   ├── analytics.json           # Analytics/reporting
│   ├── notifications.json       # Notifications
│   ├── compliance.json          # Compliance module
│   └── errors.json              # Error messages
├── es-ES/
│   ├── common.json
│   ├── auth.json
│   └── ...
└── [locale]/
    └── ...
```

**Example Translation File (en-US/workorders.json):**

```json
{
  "workorder": {
    "title": "Work Orders",
    "create": "Create Work Order",
    "edit": "Edit Work Order",
    "delete": "Delete Work Order",
    "status": {
      "draft": "Draft",
      "in_progress": "In Progress",
      "completed": "Completed",
      "cancelled": "Cancelled"
    },
    "priority": {
      "low": "Low",
      "medium": "Medium",
      "high": "High",
      "critical": "Critical"
    },
    "form": {
      "title": "Title",
      "description": "Description",
      "asset": "Asset",
      "assignee": "Assigned To",
      "due_date": "Due Date",
      "estimated_hours": "Estimated Hours"
    },
    "messages": {
      "created": "Work order {{id}} created successfully",
      "updated": "Work order updated successfully",
      "deleted": "Work order deleted successfully",
      "error_loading": "Failed to load work order: {{error}}"
    },
    "validation": {
      "title_required": "Title is required",
      "title_min_length": "Title must be at least {{min}} characters",
      "due_date_invalid": "Due date must be in the future",
      "assignee_required": "Assignee is required"
    },
    "statistics": {
      "total": "Total Work Orders",
      "open": "Open",
      "overdue": "Overdue",
      "completed_this_month": "Completed This Month",
      "average_completion_time": "Avg. Completion Time",
      "completion_rate": "{{count}} of {{total}} completed ({{percentage}}%)"
    }
  }
}
```

### 3.3 Frontend I18n Implementation

**React Component with i18next:**

```javascript
import React from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { enUS, es, de, fr } from 'date-fns/locale';

const localeMap = {
  'en-US': enUS,
  'es-ES': es,
  'de-DE': de,
  'fr-FR': fr
};

const WorkOrderList = ({ workOrders }) => {
  const { t, i18n } = useTranslation('workorders');
  const currentLocale = localeMap[i18n.language] || enUS;

  return (
    <div>
      <h1>{t('workorder.title')}</h1>
      <button>{t('workorder.create')}</button>

      <table>
        <thead>
          <tr>
            <th>{t('workorder.form.title')}</th>
            <th>{t('workorder.form.assignee')}</th>
            <th>{t('workorder.form.due_date')}</th>
            <th>{t('workorder.status')}</th>
          </tr>
        </thead>
        <tbody>
          {workOrders.map(wo => (
            <tr key={wo.id}>
              <td>{wo.title}</td>
              <td>{wo.assignee.name}</td>
              <td>
                {format(new Date(wo.dueDate), 'PPP', { locale: currentLocale })}
              </td>
              <td>{t(`workorder.status.${wo.status}`)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="statistics">
        <p>
          {t('workorder.statistics.completion_rate', {
            count: workOrders.filter(wo => wo.status === 'completed').length,
            total: workOrders.length,
            percentage: Math.round(
              (workOrders.filter(wo => wo.status === 'completed').length / workOrders.length) * 100
            )
          })}
        </p>
      </div>
    </div>
  );
};

export default WorkOrderList;
```

**i18next Configuration:**

```javascript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en-US',
    supportedLngs: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'hi-IN', 'zh-CN'],

    // Namespace configuration
    ns: ['common', 'auth', 'workorders', 'assets', 'analytics'],
    defaultNS: 'common',

    // Backend configuration
    backend: {
      loadPath: 'https://cdn.dcmms.com/translations/{{lng}}/{{ns}}.json',
      crossDomain: true,
      withCredentials: false
    },

    // Language detection
    detection: {
      order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
      lookupLocalStorage: 'userLocale',
      lookupCookie: 'locale'
    },

    // Interpolation
    interpolation: {
      escapeValue: false,
      format: (value, format, lng) => {
        if (format === 'uppercase') return value.toUpperCase();
        if (format === 'lowercase') return value.toLowerCase();
        if (value instanceof Date) {
          return new Intl.DateTimeFormat(lng).format(value);
        }
        return value;
      }
    },

    // React options
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p']
    }
  });

export default i18n;
```

### 3.4 Backend I18n Implementation

**Node.js Service with i18next:**

```javascript
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');

// Initialize i18next for backend
i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en-US',
    preload: ['en-US', 'es-ES', 'fr-FR', 'de-DE'],
    ns: ['common', 'emails', 'notifications', 'errors'],
    defaultNS: 'common',

    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json'
    },

    detection: {
      order: ['header', 'querystring'],
      lookupHeader: 'accept-language',
      lookupQuerystring: 'lang'
    }
  });

// Express middleware
app.use(middleware.handle(i18next));

// Localized email service
class EmailService {
  async sendWorkOrderAssignmentEmail(workOrder, assignee, locale = 'en-US') {
    const t = i18next.getFixedT(locale, 'emails');

    const subject = t('workorder.assignment.subject', {
      workOrderId: workOrder.workOrderId
    });

    const body = t('workorder.assignment.body', {
      assigneeName: assignee.name,
      workOrderTitle: workOrder.title,
      dueDate: this.formatDate(workOrder.dueDate, locale),
      priority: t(`workorder.priority.${workOrder.priority}`)
    });

    await this.sendEmail({
      to: assignee.email,
      subject,
      body,
      locale
    });
  }

  formatDate(date, locale) {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  }
}

// API endpoint with localized response
app.post('/api/work-orders', async (req, res) => {
  try {
    const workOrder = await createWorkOrder(req.body);

    res.status(201).json({
      success: true,
      message: req.t('workorder.messages.created', {
        id: workOrder.workOrderId
      }),
      data: workOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: req.t('workorder.messages.error_loading', {
        error: error.message
      })
    });
  }
});
```

## 4. Date, Time, and Timezone Handling

### 4.1 Timezone Strategy

**Principles:**
- Store all timestamps in UTC in the database
- Convert to user's timezone for display
- Accept input in user's timezone, convert to UTC for storage
- Support site-specific timezones for asset operations

**Database Schema:**

```sql
-- User timezone preference
ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN locale VARCHAR(10) DEFAULT 'en-US';
ALTER TABLE users ADD COLUMN date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY';
ALTER TABLE users ADD COLUMN time_format VARCHAR(10) DEFAULT '12h'; -- '12h' or '24h'

-- Site timezone (operational timezone)
ALTER TABLE sites ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';

-- Organization default settings
ALTER TABLE organizations ADD COLUMN default_timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE organizations ADD COLUMN default_locale VARCHAR(10) DEFAULT 'en-US';
```

### 4.2 Timezone Conversion Service

```javascript
const { DateTime } = require('luxon');

class TimezoneService {
  /**
   * Convert UTC timestamp to user's timezone
   */
  toUserTimezone(utcTimestamp, userTimezone) {
    return DateTime.fromJSDate(new Date(utcTimestamp), { zone: 'UTC' })
      .setZone(userTimezone)
      .toISO();
  }

  /**
   * Convert user's local time to UTC
   */
  toUTC(localTimestamp, userTimezone) {
    return DateTime.fromISO(localTimestamp, { zone: userTimezone })
      .toUTC()
      .toISO();
  }

  /**
   * Format timestamp for display
   */
  formatForDisplay(timestamp, locale, timezone, options = {}) {
    const dt = DateTime.fromISO(timestamp, { zone: timezone });

    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    };

    return dt.toLocaleString({ ...defaultOptions, ...options }, { locale });
  }

  /**
   * Get business hours in UTC for a site
   */
  getBusinessHoursUTC(siteTimezone, businessHours) {
    const startLocal = DateTime.fromObject(
      { hour: businessHours.startHour, minute: 0 },
      { zone: siteTimezone }
    );

    const endLocal = DateTime.fromObject(
      { hour: businessHours.endHour, minute: 0 },
      { zone: siteTimezone }
    );

    return {
      startUTC: startLocal.toUTC().hour,
      endUTC: endLocal.toUTC().hour
    };
  }

  /**
   * Check if current time is within business hours for a site
   */
  isWithinBusinessHours(siteTimezone, businessHours) {
    const now = DateTime.now().setZone(siteTimezone);
    const currentHour = now.hour;

    return currentHour >= businessHours.startHour &&
           currentHour < businessHours.endHour &&
           businessHours.workDays.includes(now.weekday);
  }
}
```

### 4.3 Date/Time Formatting by Locale

```javascript
class DateTimeFormatter {
  constructor(locale, timezone) {
    this.locale = locale;
    this.timezone = timezone;
  }

  /**
   * Format date based on locale preferences
   */
  formatDate(date, style = 'medium') {
    const formats = {
      'en-US': {
        short: 'M/d/yyyy',
        medium: 'MMM d, yyyy',
        long: 'MMMM d, yyyy',
        full: 'EEEE, MMMM d, yyyy'
      },
      'en-GB': {
        short: 'd/M/yyyy',
        medium: 'd MMM yyyy',
        long: 'd MMMM yyyy',
        full: 'EEEE, d MMMM yyyy'
      },
      'de-DE': {
        short: 'dd.MM.yyyy',
        medium: 'dd. MMM yyyy',
        long: 'dd. MMMM yyyy',
        full: 'EEEE, dd. MMMM yyyy'
      },
      'fr-FR': {
        short: 'dd/MM/yyyy',
        medium: 'd MMM yyyy',
        long: 'd MMMM yyyy',
        full: 'EEEE d MMMM yyyy'
      }
    };

    const format = formats[this.locale]?.[style] || formats['en-US'][style];

    return DateTime.fromJSDate(new Date(date), { zone: this.timezone })
      .toFormat(format);
  }

  /**
   * Format time based on 12h/24h preference
   */
  formatTime(date, use24Hour = false) {
    const dt = DateTime.fromJSDate(new Date(date), { zone: this.timezone });

    if (use24Hour) {
      return dt.toFormat('HH:mm');
    } else {
      return dt.toFormat('h:mm a');
    }
  }

  /**
   * Format datetime with relative time
   */
  formatRelative(date) {
    const dt = DateTime.fromJSDate(new Date(date), { zone: this.timezone });
    const now = DateTime.now().setZone(this.timezone);

    const diffInHours = now.diff(dt, 'hours').hours;

    if (diffInHours < 1) {
      return dt.toRelative({ locale: this.locale }); // "5 minutes ago"
    } else if (diffInHours < 24) {
      return dt.toRelativeCalendar({ locale: this.locale }); // "today at 2:30 PM"
    } else {
      return this.formatDate(date, 'medium');
    }
  }
}
```

## 5. Number and Currency Formatting

### 5.1 Number Formatting

```javascript
class NumberFormatter {
  constructor(locale) {
    this.locale = locale;
  }

  /**
   * Format decimal numbers with locale-specific separators
   */
  formatNumber(value, options = {}) {
    return new Intl.NumberFormat(this.locale, {
      minimumFractionDigits: options.minDecimals || 0,
      maximumFractionDigits: options.maxDecimals || 2,
      useGrouping: options.useGrouping !== false
    }).format(value);
  }

  /**
   * Format percentages
   */
  formatPercent(value, decimals = 1) {
    return new Intl.NumberFormat(this.locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value / 100);
  }

  /**
   * Format large numbers with compact notation
   */
  formatCompact(value) {
    return new Intl.NumberFormat(this.locale, {
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value);
  }

  /**
   * Format energy values (kWh, MWh)
   */
  formatEnergy(valueInKWh, locale) {
    if (valueInKWh >= 1000000) {
      // GWh
      return `${this.formatNumber(valueInKWh / 1000000, { maxDecimals: 2 })} GWh`;
    } else if (valueInKWh >= 1000) {
      // MWh
      return `${this.formatNumber(valueInKWh / 1000, { maxDecimals: 2 })} MWh`;
    } else {
      // kWh
      return `${this.formatNumber(valueInKWh, { maxDecimals: 2 })} kWh`;
    }
  }
}

// Example usage
const formatter = new NumberFormatter('de-DE');
console.log(formatter.formatNumber(1234567.89)); // "1.234.567,89"
console.log(formatter.formatPercent(23.5)); // "23,5 %"
console.log(formatter.formatCompact(1234567)); // "1,2 Mio."
```

### 5.2 Currency Formatting

```javascript
class CurrencyFormatter {
  // Currency codes by country/region
  static CURRENCY_MAP = {
    'en-US': 'USD',
    'en-GB': 'GBP',
    'en-AU': 'AUD',
    'en-IN': 'INR',
    'es-ES': 'EUR',
    'es-MX': 'MXN',
    'fr-FR': 'EUR',
    'de-DE': 'EUR',
    'zh-CN': 'CNY',
    'ja-JP': 'JPY',
    'pt-BR': 'BRL',
    'ar-SA': 'SAR'
  };

  constructor(locale, currencyCode = null) {
    this.locale = locale;
    this.currencyCode = currencyCode || CurrencyFormatter.CURRENCY_MAP[locale] || 'USD';
  }

  /**
   * Format currency value
   */
  format(value, options = {}) {
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: this.currencyCode,
      minimumFractionDigits: options.minDecimals || 2,
      maximumFractionDigits: options.maxDecimals || 2
    }).format(value);
  }

  /**
   * Format currency without symbol (accounting format)
   */
  formatAccounting(value) {
    const formatted = new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: this.currencyCode,
      currencyDisplay: 'code'
    }).format(Math.abs(value));

    if (value < 0) {
      return `(${formatted})`;
    }
    return formatted;
  }

  /**
   * Parse currency string to number
   */
  parse(currencyString) {
    // Remove currency symbols and thousands separators
    const cleanString = currencyString
      .replace(/[^\d.,\-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    return parseFloat(cleanString);
  }
}

// Example usage
const usdFormatter = new CurrencyFormatter('en-US', 'USD');
console.log(usdFormatter.format(1234.56)); // "$1,234.56"

const eurFormatter = new CurrencyFormatter('de-DE', 'EUR');
console.log(eurFormatter.format(1234.56)); // "1.234,56 €"

const inrFormatter = new CurrencyFormatter('en-IN', 'INR');
console.log(inrFormatter.format(123456.78)); // "₹1,23,456.78"
```

### 5.3 Multi-Currency Support

```sql
-- Currency exchange rates table
CREATE TABLE currency_exchange_rates (
    id SERIAL PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(18, 8) NOT NULL,
    effective_date TIMESTAMPTZ NOT NULL,
    source VARCHAR(50) DEFAULT 'ECB', -- European Central Bank
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_currency, to_currency, effective_date)
);

CREATE INDEX idx_currency_rates_date ON currency_exchange_rates(effective_date DESC);
CREATE INDEX idx_currency_rates_pair ON currency_exchange_rates(from_currency, to_currency);
```

```javascript
class CurrencyConverter {
  /**
   * Get latest exchange rate
   */
  async getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1.0;

    const rate = await db.currencyExchangeRates.findOne({
      from_currency: fromCurrency,
      to_currency: toCurrency,
      effective_date: { $lte: new Date() }
    }, {
      sort: { effective_date: -1 }
    });

    if (!rate) {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    return rate.rate;
  }

  /**
   * Convert amount between currencies
   */
  async convert(amount, fromCurrency, toCurrency) {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  }

  /**
   * Fetch latest rates from external API
   */
  async updateExchangeRates() {
    // Using European Central Bank API
    const response = await fetch('https://api.exchangeratesapi.io/latest?base=USD');
    const data = await response.json();

    const rates = Object.entries(data.rates).map(([currency, rate]) => ({
      from_currency: 'USD',
      to_currency: currency,
      rate: rate,
      effective_date: new Date(data.date),
      source: 'ECB'
    }));

    await db.currencyExchangeRates.insertMany(rates, {
      updateOnDuplicate: ['rate', 'updated_at']
    });
  }
}
```

## 6. Right-to-Left (RTL) Language Support

### 6.1 RTL Implementation

**CSS Configuration:**

```css
/* Base RTL styles */
[dir="rtl"] {
  direction: rtl;
  text-align: right;
}

[dir="ltr"] {
  direction: ltr;
  text-align: left;
}

/* Logical properties for RTL compatibility */
.container {
  margin-inline-start: 20px;  /* Instead of margin-left */
  margin-inline-end: 10px;     /* Instead of margin-right */
  padding-inline: 15px;        /* Instead of padding-left/right */
}

/* RTL-specific overrides */
[dir="rtl"] .icon-arrow-right::before {
  content: "←";
}

[dir="ltr"] .icon-arrow-right::before {
  content: "→";
}

/* Flexbox RTL support */
.flex-container {
  display: flex;
  flex-direction: row; /* Automatically reverses in RTL */
}

[dir="rtl"] .flex-container {
  flex-direction: row-reverse;
}
```

**React Component with RTL:**

```javascript
import React from 'react';
import { useTranslation } from 'react-i18next';

const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

const App = () => {
  const { i18n } = useTranslation();

  const isRTL = RTL_LANGUAGES.some(lang =>
    i18n.language.startsWith(lang)
  );

  React.useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language, isRTL]);

  return (
    <div className="app" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* App content */}
    </div>
  );
};
```

### 6.2 RTL-Compatible UI Components

```javascript
// Button component with RTL support
const Button = ({ icon, iconPosition = 'start', children, ...props }) => {
  const { i18n } = useTranslation();
  const isRTL = RTL_LANGUAGES.some(lang => i18n.language.startsWith(lang));

  const actualPosition = isRTL
    ? (iconPosition === 'start' ? 'end' : 'start')
    : iconPosition;

  return (
    <button className="btn" {...props}>
      {actualPosition === 'start' && icon}
      <span>{children}</span>
      {actualPosition === 'end' && icon}
    </button>
  );
};
```

## 7. Translation Management Workflow

### 7.1 Translation Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Phase                        │
├─────────────────────────────────────────────────────────────┤
│  Developer adds new translation keys in code                │
│  ↓                                                           │
│  Extract keys: npm run i18n:extract                         │
│  ↓                                                           │
│  Update source file: en-US/*.json                           │
│  ↓                                                           │
│  Commit to Git                                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Translation Phase                        │
├─────────────────────────────────────────────────────────────┤
│  CI/CD pushes new keys to Phrase/Crowdin                   │
│  ↓                                                           │
│  Translators translate in TMS UI                            │
│  ↓                                                           │
│  QA review and approval                                     │
│  ↓                                                           │
│  Export translations                                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Phase                         │
├─────────────────────────────────────────────────────────────┤
│  Pull translations from TMS                                 │
│  ↓                                                           │
│  Upload to S3/CDN                                           │
│  ↓                                                           │
│  Invalidate CDN cache                                       │
│  ↓                                                           │
│  Translations available to users                            │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Translation Extraction Script

```javascript
// scripts/extract-translations.js
const fs = require('fs');
const path = require('path');
const parser = require('i18next-parser');

const config = {
  locales: ['en-US'],
  output: 'translations/$LOCALE/$NAMESPACE.json',
  input: ['src/**/*.{js,jsx,ts,tsx}'],
  defaultNamespace: 'common',
  keySeparator: '.',
  namespaceSeparator: ':',

  // Custom key extraction
  customValueTemplate: {
    message: '${key}',
    description: '${description}',
    context: '${context}'
  }
};

// Run extraction
parser.gulp(config.input, {
  locales: config.locales,
  output: config.output
}).pipe(gulp.dest('./'));

console.log('Translation keys extracted successfully');
```

### 7.3 Translation Validation

```javascript
class TranslationValidator {
  /**
   * Validate translation files
   */
  async validate() {
    const errors = [];

    // Load source (en-US) translations
    const sourceTranslations = this.loadTranslations('en-US');
    const sourceKeys = this.flattenKeys(sourceTranslations);

    // Validate each target locale
    for (const locale of this.targetLocales) {
      const targetTranslations = this.loadTranslations(locale);
      const targetKeys = this.flattenKeys(targetTranslations);

      // Check for missing keys
      const missingKeys = sourceKeys.filter(key => !targetKeys.includes(key));
      if (missingKeys.length > 0) {
        errors.push({
          locale,
          type: 'missing_keys',
          keys: missingKeys
        });
      }

      // Check for extra keys (not in source)
      const extraKeys = targetKeys.filter(key => !sourceKeys.includes(key));
      if (extraKeys.length > 0) {
        errors.push({
          locale,
          type: 'extra_keys',
          keys: extraKeys
        });
      }

      // Check for placeholder mismatches
      for (const key of sourceKeys) {
        const sourcePlaceholders = this.extractPlaceholders(
          this.getTranslation(sourceTranslations, key)
        );
        const targetPlaceholders = this.extractPlaceholders(
          this.getTranslation(targetTranslations, key)
        );

        if (!this.arraysEqual(sourcePlaceholders, targetPlaceholders)) {
          errors.push({
            locale,
            type: 'placeholder_mismatch',
            key,
            source: sourcePlaceholders,
            target: targetPlaceholders
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  extractPlaceholders(text) {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      matches.push(match[1]);
    }

    return matches.sort();
  }
}
```

### 7.4 Continuous Localization with CI/CD

```yaml
# .github/workflows/i18n.yml
name: Continuous Localization

on:
  push:
    branches: [main, develop]
    paths:
      - 'src/**/*.{js,jsx,ts,tsx}'
      - 'translations/**/*.json'

jobs:
  sync-translations:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Extract translation keys
        run: npm run i18n:extract

      - name: Push to Phrase
        env:
          PHRASE_API_TOKEN: ${{ secrets.PHRASE_API_TOKEN }}
        run: |
          npm install -g phrase-cli
          phrase push --project-id=${{ secrets.PHRASE_PROJECT_ID }}

      - name: Pull translations
        run: phrase pull --project-id=${{ secrets.PHRASE_PROJECT_ID }}

      - name: Validate translations
        run: npm run i18n:validate

      - name: Upload to S3
        run: |
          aws s3 sync translations/ s3://dcmms-translations/ \
            --cache-control "max-age=3600" \
            --metadata-directive REPLACE

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DIST_ID }} \
            --paths "/translations/*"
```

## 8. Locale-Specific Content

### 8.1 Compliance Content by Region

```javascript
const complianceContentByRegion = {
  'en-US': {
    regulatoryFrameworks: ['NERC', 'FERC', 'OSHA', 'EPA'],
    reportingTemplates: [
      'NERC EOP-004',
      'FERC Form 1',
      'OSHA 300 Log'
    ],
    helpLinks: {
      compliance: 'https://docs.dcmms.com/en/compliance/us-regulations'
    }
  },

  'en-IN': {
    regulatoryFrameworks: ['CEA', 'MNRE', 'CERC'],
    reportingTemplates: [
      'CEA Grid Code Compliance',
      'MNRE Performance Report',
      'CERC Tariff Filing'
    ],
    helpLinks: {
      compliance: 'https://docs.dcmms.com/en/compliance/india-regulations'
    }
  },

  'en-GB': {
    regulatoryFrameworks: ['Ofgem', 'National Grid ESO', 'HSE'],
    reportingTemplates: [
      'REMIT Reporting',
      'Grid Code Compliance',
      'FiT Generation Report'
    ],
    helpLinks: {
      compliance: 'https://docs.dcmms.com/en/compliance/uk-regulations'
    }
  }
};

// Component usage
const ComplianceModule = () => {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const content = complianceContentByRegion[locale] || complianceContentByRegion['en-US'];

  return (
    <div>
      <h2>{t('compliance.regulatory_frameworks')}</h2>
      <ul>
        {content.regulatoryFrameworks.map(framework => (
          <li key={framework}>{framework}</li>
        ))}
      </ul>
    </div>
  );
};
```

### 8.2 Region-Specific Defaults

```javascript
const regionDefaults = {
  'en-US': {
    units: {
      energy: 'kWh',
      power: 'kW',
      temperature: '°F',
      distance: 'miles',
      speed: 'mph'
    },
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    currency: 'USD',
    firstDayOfWeek: 0 // Sunday
  },

  'en-GB': {
    units: {
      energy: 'kWh',
      power: 'kW',
      temperature: '°C',
      distance: 'km',
      speed: 'km/h'
    },
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'GBP',
    firstDayOfWeek: 1 // Monday
  },

  'de-DE': {
    units: {
      energy: 'kWh',
      power: 'kW',
      temperature: '°C',
      distance: 'km',
      speed: 'km/h'
    },
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h',
    currency: 'EUR',
    firstDayOfWeek: 1 // Monday
  }
};
```

## 9. Performance Optimization

### 9.1 Translation Loading Strategy

```javascript
class TranslationLoader {
  /**
   * Lazy load translations by namespace
   */
  async loadNamespace(locale, namespace) {
    const cacheKey = `translation:${locale}:${namespace}`;

    // Check browser cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);

      // Cache valid for 1 hour
      if (Date.now() - timestamp < 3600000) {
        return data;
      }
    }

    // Fetch from CDN
    const response = await fetch(
      `https://cdn.dcmms.com/translations/${locale}/${namespace}.json`
    );
    const data = await response.json();

    // Cache in localStorage
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));

    return data;
  }

  /**
   * Preload critical namespaces
   */
  async preloadCritical(locale) {
    const criticalNamespaces = ['common', 'auth', 'navigation'];

    await Promise.all(
      criticalNamespaces.map(ns => this.loadNamespace(locale, ns))
    );
  }
}
```

### 9.2 Bundle Size Optimization

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        // Separate translation bundles
        translations: {
          test: /[\\/]translations[\\/]/,
          name: 'translations',
          chunks: 'all',
          priority: 10
        }
      }
    }
  }
};
```

## 10. Testing

### 10.1 I18n Unit Tests

```javascript
// __tests__/i18n.test.js
import i18n from '../i18n';
import { renderHook } from '@testing-library/react-hooks';
import { useTranslation } from 'react-i18next';

describe('I18n', () => {
  test('should load translations for all supported locales', async () => {
    const locales = ['en-US', 'es-ES', 'fr-FR', 'de-DE'];

    for (const locale of locales) {
      await i18n.changeLanguage(locale);

      const { result } = renderHook(() => useTranslation('common'));
      const { t } = result.current;

      expect(t('common.save')).toBeTruthy();
      expect(t('common.cancel')).toBeTruthy();
    }
  });

  test('should interpolate variables correctly', () => {
    const { result } = renderHook(() => useTranslation('workorders'));
    const { t } = result.current;

    const message = t('workorder.messages.created', { id: 'WO-12345' });
    expect(message).toContain('WO-12345');
  });

  test('should handle pluralization', () => {
    const { result } = renderHook(() => useTranslation('common'));
    const { t } = result.current;

    expect(t('common.items_count', { count: 0 })).toBe('0 items');
    expect(t('common.items_count', { count: 1 })).toBe('1 item');
    expect(t('common.items_count', { count: 5 })).toBe('5 items');
  });
});
```

### 10.2 Visual Regression Testing for RTL

```javascript
// __tests__/rtl-visual.test.js
import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';

describe('RTL Visual Regression', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('should render RTL correctly for Arabic', async () => {
    await page.goto('http://localhost:3000');

    // Switch to Arabic
    await page.evaluate(() => {
      localStorage.setItem('userLocale', 'ar-SA');
      window.location.reload();
    });

    await page.waitForSelector('[dir="rtl"]');

    const screenshot = await page.screenshot();

    // Compare with baseline
    // (Implementation depends on your visual testing setup)
  });
});
```

## 11. Implementation Plan

### 11.1 Phase 1: Foundation (Weeks 1-2)

**Week 1:**
- Set up i18next for frontend and backend
- Configure translation file structure
- Implement locale detection
- Set up basic English (en-US) translations

**Week 2:**
- Implement date/time/number formatting
- Set up timezone handling
- Configure currency formatting
- Implement user locale preferences

### 11.2 Phase 2: Content Translation (Weeks 3-5)

**Week 3:**
- Extract all translation keys
- Set up Phrase/Crowdin TMS
- Translate to Spanish, French, German

**Week 4:**
- Translate to Hindi, Chinese
- Implement RTL support for Arabic
- QA and validation

**Week 5:**
- Translate remaining languages
- Implement locale-specific content
- Region-specific defaults

### 11.3 Phase 3: Optimization & Testing (Week 6)

- Performance optimization
- Translation caching
- Bundle size optimization
- Comprehensive testing
- Documentation

## 12. Monitoring and Metrics

### 12.1 I18n Metrics

```javascript
class I18nMetrics {
  trackLanguageUsage() {
    analytics.track('language_selected', {
      locale: i18n.language,
      previous_locale: this.previousLocale,
      detection_method: this.detectionMethod
    });
  }

  trackMissingTranslation(key, locale) {
    logger.warn('Missing translation', {
      key,
      locale,
      namespace: this.currentNamespace
    });

    // Send to monitoring
    metrics.increment('i18n.missing_translations', {
      locale,
      namespace: this.currentNamespace
    });
  }

  trackTranslationLoadTime(locale, namespace, duration) {
    metrics.histogram('i18n.load_time', duration, {
      locale,
      namespace
    });
  }
}
```

### 12.2 Translation Coverage Dashboard

```sql
-- Translation coverage query
SELECT
    locale,
    namespace,
    COUNT(*) as total_keys,
    SUM(CASE WHEN translation IS NOT NULL THEN 1 ELSE 0 END) as translated_keys,
    ROUND(
        SUM(CASE WHEN translation IS NOT NULL THEN 1 ELSE 0 END)::numeric /
        COUNT(*)::numeric * 100,
        2
    ) as coverage_percent
FROM translation_keys
GROUP BY locale, namespace
ORDER BY locale, namespace;
```

## 13. Success Criteria

### 13.1 Functional Requirements

- ✅ Support for 10+ languages
- ✅ RTL support for Arabic
- ✅ Locale-specific formatting (dates, numbers, currency)
- ✅ Timezone-aware display
- ✅ Translation coverage >95% for primary languages
- ✅ User-selectable language preference

### 13.2 Performance Requirements

- Translation loading time <200ms (p95)
- Bundle size increase <100KB per language
- Translation cache hit rate >80%
- CDN cache hit rate >90%

### 13.3 Quality Requirements

- Zero placeholder mismatches
- <1% missing translation keys
- Consistent terminology across modules
- Professional translation quality (human-reviewed)

## 14. Appendix

### 14.1 Translation Memory Glossary

| English Term | Spanish | French | German | Hindi | Context |
|--------------|---------|--------|--------|-------|---------|
| Work Order | Orden de Trabajo | Bon de Travail | Arbeitsauftrag | कार्य आदेश | |
| Asset | Activo | Actif | Anlage | परिसंपत्ति | Equipment/device |
| Inverter | Inversor | Onduleur | Wechselrichter | इन्वर्टर | Solar equipment |
| Preventive Maintenance | Mantenimiento Preventivo | Maintenance Préventive | Vorbeugende Wartung | निवारक रखरखाव | |
| Downtime | Tiempo de Inactividad | Temps d'Arrêt | Ausfallzeit | डाउनटाइम | |

### 14.2 Locale-Specific Considerations

**India (hi-IN):**
- Use Devanagari script
- Support INR currency with lakh/crore formatting (₹1,23,45,678)
- Include IST timezone
- Support both Hindi and English (code-mixing common)

**China (zh-CN):**
- Simplified Chinese characters
- Support CNY currency (¥)
- China Standard Time (CST)
- Use Chinese numerals for formal contexts

**Arabic (ar-SA):**
- Right-to-left text direction
- Arabic numerals (٠١٢٣٤٥٦٧٨٩) or Western (0123456789)
- Support SAR currency (﷼)
- Consider regional dialects

### 14.3 Resources

**Translation Services:**
- Phrase (https://phrase.com) - Translation management system
- Crowdin (https://crowdin.com) - Localization platform
- Gengo (https://gengo.com) - Professional translation services

**Libraries:**
- i18next (https://www.i18next.com) - Internationalization framework
- Luxon (https://moment.github.io/luxon) - Date/time handling
- Format.js (https://formatjs.io) - Formatting utilities
- react-i18next (https://react.i18next.com) - React integration

**Standards:**
- BCP 47 - Language tags
- ISO 639 - Language codes
- ISO 3166 - Country codes
- ISO 4217 - Currency codes
- CLDR - Common Locale Data Repository

---

**End of Specification 24: Internationalization and Localization**
