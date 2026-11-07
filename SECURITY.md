# Security policy

## Supported versions

Security fixes are released for the latest major version.

| Version | Supported |
| --- | --- |
| 2.x | Yes |
| 1.x | No |

## Reporting a vulnerability

Please do not open a public issue for security problems. Use GitHub's private vulnerability reporting: open the repository's **Security** tab and choose **Report a vulnerability**.

Include what you found, how to reproduce it, the affected version and the impact you expect. You will get an acknowledgement within a few days, and we will keep you updated until the issue is fixed and released. Reporters are credited in the changelog unless they prefer not to be.

## What counts

Examples of in-scope issues: personal data or credentials leaving the page when privacy options say they should not, cross-site scripting or request forgery through SDK behavior, prototype pollution or injection through event properties, and denial of service through crafted page content.

Out of scope: findings that need a compromised page or browser extension, results of intentionally enabled options (for example `privacy.formValues`), and issues in the collector server (report those to the project that hosts it).

## Design notes relevant to security

- The SDK makes no network requests except to the configured `endpoint`. The optional fingerprint library is always started with its telemetry and remote scripts disabled.
- The project key is a public write key: it is visible in page source and can only submit events.
- Sensitive values are removed in the browser before anything is queued or stored. Buffered events in `localStorage` are already sanitized.
