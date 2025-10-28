# 🚀 Indeks Browser Event Tracker

A powerful, zero-config client-side analytics S<!-- Or via CDN (when published) -->

<script type="module">
  import indeks from 'https://unpkg.com/indeks-core/dist/index.js';
  const tracker = indeks('your-api-key-here');
</script>ilt with Bun.js that captures all user events on websites. Perfect for understanding user behavior, debugging,src/

├── index.ts # Main entry point with initialization function
├── tracker.ts # Core event tracking implementation  
└── types.ts # TypeScript interface definitions
dist/
├── index.js # Browser build (ESM)
└── index.d.ts # TypeScript definitions analytics.

## ✨ Features

- 🖱️ **Click Events** - Capture all user clicks with element details and coordinates
- 📜 **Scroll Events** - Track scroll position and scroll percentage
- 📄 **Page Views** - Monitor page navigation and SPA route changes
- 📝 **Form Submissions** - Capture form data (excluding sensitive fields)
- ⌨️ **Keystroke Events** - Optional keyboard interaction tracking
- 🖱️ **Mouse Movements** - Optional mouse movement tracking (with debouncing)
- 📱 **Resize Events** - Track viewport and window size changes
- ❌ **Error Tracking** - Capture JavaScript errors and unhandled promise rejections
- 🔒 **Privacy-First** - Automatically excludes sensitive data like passwords
- 🚀 **High Performance** - Debounced events and optimized for minimal impact
- 📊 **Console Logging** - Beautiful console output for debugging
- 🔧 **Configurable** - Granular control over what events to capture
- 🌐 **Browser-Only** - Pure client-side library, no server dependencies## 📦 Installation

```bash
# Install with bun
bun add indeks-core

# Or with npm
npm install indeks-core

# Or with yarn
yarn add indeks-core
```

## 🚀 Quick Start

### Basic Usage

```javascript
import indeks from "indeks-core";

// Initialize with your API key - that's it!
const tracker = indeks("your-api-key-here");

// Events are now being captured and logged to console
```

### Advanced Configuration

```javascript
import indeks from "indeks-core";

const tracker = indeks("your-api-key-here", {
  enableConsoleLogging: true,
  captureClicks: true,
  captureScrolls: true,
  capturePageViews: true,
  captureFormSubmissions: true,
  captureKeystrokes: false, // Disabled by default for privacy
  captureMouseMovements: false, // Disabled by default for performance
  captureResizes: true,
  captureErrors: true,
  debounceMs: 100, // Debounce scroll/mouse events
});
```

### HTML Script Tag Usage

````html
### HTML Script Tag Usage ```html
<!-- Direct script import -->
<script type="module">
  import indeks from "./path/to/indeks-browser/dist/index.js";

  const tracker = indeks("your-api-key-here", {
    enableConsoleLogging: true,
  });
</script>

<!-- Or via CDN (when published) -->
<script type="module">
  import indeks from "https://unpkg.com/indeks-browser/dist/index.js";
  const tracker = indeks("your-api-key-here");
</script>
````

## 📋 API Reference

````

## 📋 API Reference

### Configuration Options

| Option                   | Type      | Default      | Description                            |
| ------------------------ | --------- | ------------ | -------------------------------------- |
| `apiKey`                 | `string`  | **Required** | Your API key for the tracker           |
| `enableConsoleLogging`   | `boolean` | `true`       | Show events in browser console         |
| `captureClicks`          | `boolean` | `true`       | Track click events                     |
| `captureScrolls`         | `boolean` | `true`       | Track scroll events                    |
| `capturePageViews`       | `boolean` | `true`       | Track page navigation                  |
| `captureFormSubmissions` | `boolean` | `true`       | Track form submissions                 |
| `captureKeystrokes`      | `boolean` | `false`      | Track keyboard events                  |
| `captureMouseMovements`  | `boolean` | `false`      | Track mouse movements                  |
| `captureResizes`         | `boolean` | `true`       | Track window resize events             |
| `captureErrors`          | `boolean` | `true`       | Track JavaScript errors                |
| `debounceMs`             | `number`  | `100`        | Debounce delay for scroll/mouse events |

### Tracker Methods

```javascript
// Get all captured events
const events = tracker.getEvents();

// Clear the event queue
tracker.clearEvents();

// Update configuration
tracker.updateConfig({ captureKeystrokes: true });

// Get current session ID
const sessionId = tracker.getSessionId();

// Destroy the tracker (removes event listeners)
tracker.destroy();
````

## 📊 Event Types

### Click Events

```javascript
{
  type: 'click',
  timestamp: 1634567890123,
  url: 'https://example.com',
  userAgent: 'Mozilla/5.0...',
  sessionId: 'indeks_1634567890_abc123',
  element: {
    tagName: 'button',
    className: 'btn btn-primary',
    id: 'submit-btn',
    textContent: 'Submit',
    attributes: { 'data-action': 'submit' }
  },
  coordinates: {
    x: 150, y: 200,
    clientX: 150, clientY: 200
  }
}
```

### Scroll Events

```javascript
{
  type: 'scroll',
  timestamp: 1634567890123,
  scrollPosition: { x: 0, y: 500 },
  documentHeight: 2000,
  viewportHeight: 800,
  scrollPercentage: 25
}
```

### Form Submission Events

```javascript
{
  type: 'form_submit',
  timestamp: 1634567890123,
  formData: {
    username: 'john_doe',
    email: 'john@example.com'
    // password fields are automatically excluded
  },
  formAction: '/submit',
  formMethod: 'POST'
}
```

## 🛠️ Development

### Setup

```bash
# Install dependencies
bun install

# Build the library
bun run build:all

# Watch for changes during development
bun run dev
```

### Project Structure

```
src/
├── index.ts      # Main entry point and exports
├── tracker.ts    # Core tracker implementation
└── types.ts      # TypeScript type definitions
```

### Building

```bash
# Build for browser (ESM)
bun run build

# Build with TypeScript definitions
bun run build:all

# Development with watch mode
bun run dev
```

## 🎯 Use Cases- **Analytics** - Understand user behavior patterns

- **Debugging** - Track down user-reported issues
- **A/B Testing** - Measure interaction with different UI elements
- **Performance Monitoring** - Track scroll behavior and engagement
- **Form Optimization** - Analyze form completion patterns
- **Error Tracking** - Capture and analyze client-side errors

## 🔒 Privacy & Security

- **Automatic Privacy Protection**: Passwords, secrets, and tokens are automatically excluded
- **Configurable Tracking**: Granular controls over what events to capture
- **Local Processing**: Events are stored locally until you decide what to do with them
- **No Automatic Transmission**: Events are only logged to console by default
- **GDPR Friendly**: Easy to implement user consent controls

## 🎨 Demo & Examples

Check out the included `demo.html` file for a comprehensive example of all tracking capabilities:

```bash
# After building, open the demo
bun run build
# Then open demo.html in your browser
```

### Simple Integration Example

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Website</title>
  </head>
  <body>
    <h1>Welcome to my site!</h1>
    <button id="my-button">Click me!</button>

    <script type="module">
      import indeks from "./path/to/indeks-browser/dist/index.js";

      // Initialize tracking
      const tracker = indeks("your-api-key-here", {
        enableConsoleLogging: true,
        captureClicks: true,
        captureScrolls: true,
        capturePageViews: true,
      });

      // Optional: Access events
      setTimeout(() => {
        console.log("Captured events:", tracker.getEvents());
      }, 5000);
    </script>
  </body>
</html>
```

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🐛 Issues

Found a bug? Please open an issue on GitHub with details about your environment and steps to reproduce.

---

Built with ❤️ using [Bun](https://bun.sh)
