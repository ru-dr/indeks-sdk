# Event reference

Generated from `packages/shared/src/types/events.ts` by `scripts/generate-event-docs.ts`. Do not edit by hand; run `bun run docs:events`.

## Common fields

Every event carries these fields. In the request body they are top-level, and everything else is sent under `properties` (see [protocol.md](protocol.md)).

| Field | Type | Description |
| --- | --- | --- |
| `type` | string | Event type (listed below) |
| `timestamp` | number | Milliseconds since the Unix epoch |
| `url` | string | Current page URL, scrubbed of credentials, fragments and sensitive query values |
| `userAgent` | string | `navigator.userAgent` |
| `sessionId` | string | Current session id |
| `userId` | string | Anonymous user id (or fingerprint when enabled) |
| `referrer` | string, optional | Scrubbed `document.referrer` |
| `externalUserId` | string, optional | Id set with `identify()`; sent inside `properties` |

There are 52 event shapes covering 78 event types.

## `click`

TypeScript type: `IndeksClickEvent`

| Field | Type | Required |
| --- | --- | --- |
| `element` | `ElementRef & { textContent: string; attributes: Record<string, string> }` | yes |
| `coordinates` | `{ x: number; y: number; clientX: number; clientY: number }` | yes |

## `scroll`

TypeScript type: `IndeksScrollEvent`

| Field | Type | Required |
| --- | --- | --- |
| `scrollPosition` | `{ x: number; y: number }` | yes |
| `documentHeight` | `number` | yes |
| `viewportHeight` | `number` | yes |
| `scrollPercentage` | `number` | yes |

## `pageview`

TypeScript type: `IndeksPageViewEvent`

| Field | Type | Required |
| --- | --- | --- |
| `title` | `string` | yes |
| `referrer` | `string` | yes |
| `name` | `string` | no |
| `properties` | `Record<string, unknown>` | no |

## `form_submit`

TypeScript type: `IndeksFormSubmitEvent`

| Field | Type | Required |
| --- | --- | --- |
| `formData` | `Record<string, string>` | yes |
| `formValuesCaptured` | `boolean` | no |
| `formAction` | `string` | yes |
| `formMethod` | `string` | yes |
| `element` | `ElementRef` | yes |

## `keystroke`

TypeScript type: `IndeksKeystrokeEvent`

| Field | Type | Required |
| --- | --- | --- |
| `key` | `string` | no |
| `keyCategory` | `"printable" \| "navigation" \| "modifier" \| "whitespace"` | yes |
| `code` | `string` | yes |
| `ctrlKey` | `boolean` | yes |
| `shiftKey` | `boolean` | yes |
| `altKey` | `boolean` | yes |
| `metaKey` | `boolean` | yes |
| `target` | `ElementRef & { type?: string; name?: string }` | yes |

## `mousemove`

TypeScript type: `IndeksMouseMoveEvent`

| Field | Type | Required |
| --- | --- | --- |
| `coordinates` | `{ x: number; y: number; clientX: number; clientY: number }` | yes |

## `resize`

TypeScript type: `IndeksResizeEvent`

| Field | Type | Required |
| --- | --- | --- |
| `dimensions` | `{ width: number; height: number; innerWidth: number; innerHeight: number }` | yes |

## `error`

TypeScript type: `IndeksErrorEvent`

| Field | Type | Required |
| --- | --- | --- |
| `error` | `{ message: string; filename: string; lineno: number; colno: number; stack?: string }` | yes |

## `beforeunload`

TypeScript type: `IndeksBeforeUnloadEvent`

| Field | Type | Required |
| --- | --- | --- |
| `timeOnPage` | `number` | yes |

## `visibilitychange`

TypeScript type: `IndeksVisibilityChangeEvent`

| Field | Type | Required |
| --- | --- | --- |
| `visibilityState` | `"visible" \| "hidden"` | yes |
| `hidden` | `boolean` | yes |

## `focus`, `blur`

TypeScript type: `IndeksWindowFocusEvent`

| Field | Type | Required |
| --- | --- | --- |
| `hasFocus` | `boolean` | yes |

## `hashchange`

TypeScript type: `IndeksHashChangeEvent`

| Field | Type | Required |
| --- | --- | --- |
| `oldURL` | `string` | yes |
| `newURL` | `string` | yes |
| `oldHash` | `string` | yes |
| `newHash` | `string` | yes |

## `popstate`

TypeScript type: `IndeksPopStateEvent`

| Field | Type | Required |
| --- | --- | --- |
| `hasState` | `boolean` | yes |

## `mouseenter`, `mouseleave`

TypeScript type: `IndeksMouseHoverEvent`

| Field | Type | Required |
| --- | --- | --- |
| `element` | `ElementRef` | yes |
| `coordinates` | `{ x: number; y: number }` | yes |

## `contextmenu`

TypeScript type: `IndeksContextMenuEvent`

| Field | Type | Required |
| --- | --- | --- |
| `element` | `ElementRef & { textContent: string }` | yes |
| `coordinates` | `{ x: number; y: number }` | yes |

## `dblclick`

TypeScript type: `IndeksDoubleClickEvent`

| Field | Type | Required |
| --- | --- | --- |
| `element` | `ElementRef & { textContent: string }` | yes |
| `coordinates` | `{ x: number; y: number }` | yes |

## `mousedown`, `mouseup`

TypeScript type: `IndeksMousePressEvent`

| Field | Type | Required |
| --- | --- | --- |
| `button` | `number` | yes |
| `buttons` | `number` | yes |
| `element` | `ElementRef` | yes |
| `coordinates` | `{ x: number; y: number }` | yes |

## `wheel`

TypeScript type: `IndeksWheelEvent`

| Field | Type | Required |
| --- | --- | --- |
| `deltaX` | `number` | yes |
| `deltaY` | `number` | yes |
| `deltaZ` | `number` | yes |
| `deltaMode` | `number` | yes |
| `coordinates` | `{ x: number; y: number }` | yes |

## `touchstart`, `touchend`, `touchmove`

TypeScript type: `IndeksTouchEvent`

| Field | Type | Required |
| --- | --- | --- |
| `touches` | `Array<{ identifier: number; clientX: number; clientY: number; force?: number }>` | yes |
| `element` | `ElementRef` | yes |

## `dragstart`, `dragend`, `drop`

TypeScript type: `IndeksDragDropEvent`

| Field | Type | Required |
| --- | --- | --- |
| `dataTransfer` | `{ dropEffect: string; effectAllowed: string; types: string[] }` | no |
| `element` | `ElementRef` | yes |
| `coordinates` | `{ x: number; y: number }` | yes |

## `input`, `change`

TypeScript type: `IndeksInputChangeEvent`

| Field | Type | Required |
| --- | --- | --- |
| `element` | `ElementRef & { type: string; name: string; value?: string; valueLength: number }` | yes |
| `inputType` | `string` | no |

## `field_focus`, `field_blur`

TypeScript type: `IndeksFieldFocusEvent`

| Field | Type | Required |
| --- | --- | --- |
| `element` | `ElementRef & { type: string; name: string }` | yes |

## `copy`, `paste`, `cut`

TypeScript type: `IndeksClipboardEvent`

| Field | Type | Required |
| --- | --- | --- |
| `element` | `ElementRef & { type?: string; name?: string }` | yes |
| `text` | `string` | no |
| `textLength` | `number` | no |

## `selectionchange`

TypeScript type: `IndeksTextSelectionEvent`

| Field | Type | Required |
| --- | --- | --- |
| `selectedText` | `string` | no |
| `selectedTextLength` | `number` | yes |
| `selectionStart` | `number` | yes |
| `selectionEnd` | `number` | yes |
| `element` | `ElementRef & { type?: string; name?: string }` | no |

## `play`, `pause`, `volumechange`, `seeking`, `seeked`, `ended`

TypeScript type: `IndeksMediaEvent`

| Field | Type | Required |
| --- | --- | --- |
| `element` | `ElementRef & { src: string; currentTime: number; duration: number; volume?: number; muted?: boolean }` | yes |

## `online`, `offline`

TypeScript type: `IndeksNetworkStatusEvent`

| Field | Type | Required |
| --- | --- | --- |
| `isOnline` | `boolean` | yes |
| `connectionType` | `string` | no |

## `load`, `DOMContentLoaded`

TypeScript type: `IndeksPageLoadEvent`

| Field | Type | Required |
| --- | --- | --- |
| `loadTime` | `number` | no |
| `domInteractive` | `number` | no |
| `domComplete` | `number` | no |

## `fullscreenchange`

TypeScript type: `IndeksFullscreenChangeEvent`

| Field | Type | Required |
| --- | --- | --- |
| `isFullscreen` | `boolean` | yes |
| `element` | `ElementRef` | no |

## `session_start`

TypeScript type: `IndeksSessionStartEvent`

| Field | Type | Required |
| --- | --- | --- |
| `device` | `DeviceData` | yes |
| `referrer` | `string` | yes |
| `referrerDomain` | `string` | yes |
| `utmSource` | `string` | no |
| `utmMedium` | `string` | no |
| `utmCampaign` | `string` | no |
| `trafficSource` | `"organic" \| "direct" \| "social" \| "referral" \| "paid" \| "email" \| "other"` | yes |
| `landingPage` | `string` | yes |
| `isMobile` | `boolean` | yes |
| `isTablet` | `boolean` | yes |
| `isDesktop` | `boolean` | yes |
| `isNewUser` | `boolean` | yes |
| `isReturningUser` | `boolean` | yes |
| `daysSinceLastVisit` | `number` | no |

## `session_end`

TypeScript type: `IndeksSessionEndEvent`

| Field | Type | Required |
| --- | --- | --- |
| `sessionDuration` | `number` | yes |
| `activeTime` | `number` | yes |
| `idleTime` | `number` | yes |
| `pagesViewed` | `number` | yes |
| `totalClicks` | `number` | yes |
| `totalScrolls` | `number` | yes |
| `exitPage` | `string` | yes |
| `exitType` | `"navigation" \| "tab_close" \| "timeout" \| "refresh"` | yes |
| `converted` | `boolean` | yes |
| `bounce` | `boolean` | yes |

## `search`

TypeScript type: `IndeksSearchEvent`

| Field | Type | Required |
| --- | --- | --- |
| `query` | `string` | no |
| `queryLength` | `number` | yes |
| `resultsCount` | `number` | yes |
| `searchLocation` | `"header" \| "sidebar" \| "page" \| "mobile" \| "other"` | yes |
| `filtersApplied` | `Record<string, string>` | no |
| `sortBy` | `string` | no |
| `resultsClicked` | `number` | yes |
| `resultPositionClicked` | `number[]` | no |
| `timeToFirstClick` | `number` | no |
| `isRefinement` | `boolean` | yes |
| `previousQuery` | `string` | no |
| `searchSource` | `"direct" \| "autocomplete" \| "suggestion" \| "voice"` | no |

## `rage_click`

TypeScript type: `IndeksRageClickEvent`

| Field | Type | Required |
| --- | --- | --- |
| `element` | `string` | yes |
| `clicksInTimeframe` | `number` | yes |
| `timeframe` | `number` | yes |
| `whyRage` | `"button_disabled" \| "loading" \| "no_response" \| "error" \| "other"` | yes |
| `timeOnPage` | `number` | yes |
| `elementVisibleTime` | `number` | no |

## `dead_click`

TypeScript type: `IndeksDeadClickEvent`

| Field | Type | Required |
| --- | --- | --- |
| `element` | `string` | yes |
| `expectedBehavior` | `"navigate" \| "submit" \| "expand" \| "close" \| "other"` | yes |
| `actualBehavior` | `"none" \| "error" \| "redirect" \| "other"` | yes |
| `elementVisibleTime` | `number` | no |
| `previousClicksOnElement` | `number` | yes |

## `error_click`

TypeScript type: `IndeksErrorClickEvent`

| Field | Type | Required |
| --- | --- | --- |
| `element` | `string` | yes |
| `errorMessage` | `string` | yes |
| `errorType` | `"validation" \| "network" \| "javascript" \| "timeout" \| "other"` | yes |
| `userContinued` | `boolean` | yes |
| `timeToError` | `number` | yes |

## `file_download`

TypeScript type: `IndeksFileDownloadEvent`

| Field | Type | Required |
| --- | --- | --- |
| `fileName` | `string` | yes |
| `fileType` | `string` | yes |
| `fileSize` | `number` | yes |
| `downloadSource` | `"link" \| "button" \| "auto" \| "programmatic"` | yes |
| `downloadUrl` | `string` | no |
| `timeOnPageBeforeDownload` | `number` | yes |
| `downloadSpeed` | `number` | no |

## `print`

TypeScript type: `IndeksPrintEvent`

| Field | Type | Required |
| --- | --- | --- |
| `pagePrinted` | `string` | yes |
| `timeOnPageBeforePrint` | `number` | yes |
| `printTrigger` | `"menu" \| "button" \| "keyboard" \| "programmatic"` | yes |
| `pagesPrinted` | `number` | no |

## `share`

TypeScript type: `IndeksShareEvent`

| Field | Type | Required |
| --- | --- | --- |
| `shareMethod` | `"copy_link" \| "email" \| "facebook" \| "twitter" \| "linkedin" \| "whatsapp" \| "native_share" \| "other"` | yes |
| `contentShared` | `string` | yes |
| `shareLocation` | `"product_page" \| "article" \| "cart" \| "checkout" \| "other"` | yes |
| `shareText` | `string` | no |
| `shareUrl` | `string` | no |

## `pageleave`

TypeScript type: `IndeksPageLeaveEvent`

| Field | Type | Required |
| --- | --- | --- |
| `timeOnPage` | `number` | yes |
| `scrollDepth` | `number` | yes |
| `clickCount` | `number` | yes |
| `engaged` | `boolean` | yes |

## `scroll_depth`

TypeScript type: `IndeksScrollDepthEvent`

| Field | Type | Required |
| --- | --- | --- |
| `depth` | `25 \| 50 \| 75 \| 100` | yes |
| `timeToDepth` | `number` | yes |

## `form_abandon`

TypeScript type: `IndeksFormAbandonEvent`

| Field | Type | Required |
| --- | --- | --- |
| `formId` | `string` | yes |
| `fieldsCompleted` | `number` | yes |
| `totalFields` | `number` | yes |
| `timeSpent` | `number` | yes |
| `lastField` | `string` | yes |

## `form_error`

TypeScript type: `IndeksFormErrorEvent`

| Field | Type | Required |
| --- | --- | --- |
| `formId` | `string` | yes |
| `field` | `string` | yes |
| `errorType` | `"validation" \| "required" \| "format" \| "other"` | yes |
| `errorMessage` | `string` | yes |

## `idle_start`, `idle_end`

TypeScript type: `IndeksIdleEvent`

| Field | Type | Required |
| --- | --- | --- |
| `idleDuration` | `number` | no |

## `tab_focus`, `tab_blur`

TypeScript type: `IndeksTabFocusEvent`

| Field | Type | Required |
| --- | --- | --- |
| `timeAway` | `number` | no |

## `page_freeze`, `page_resume`

TypeScript type: `IndeksPageLifecycleEvent`

No additional fields.

## `outbound_link`

TypeScript type: `IndeksOutboundLinkEvent`

| Field | Type | Required |
| --- | --- | --- |
| `targetUrl` | `string` | yes |
| `domain` | `string` | yes |
| `linkText` | `string` | yes |
| `openInNewTab` | `boolean` | yes |

## `resource_error`

TypeScript type: `IndeksResourceErrorEvent`

| Field | Type | Required |
| --- | --- | --- |
| `resourceType` | `"img" \| "script" \| "style" \| "font" \| "other"` | yes |
| `resourceUrl` | `string` | yes |
| `errorMessage` | `string` | yes |

## `video_progress`, `audio_progress`

TypeScript type: `IndeksMediaProgressEvent`

| Field | Type | Required |
| --- | --- | --- |
| `progress` | `25 \| 50 \| 75 \| 100` | yes |
| `currentTime` | `number` | yes |
| `duration` | `number` | yes |
| `mediaUrl` | `string` | yes |

## `orientation_change`

TypeScript type: `IndeksOrientationChangeEvent`

| Field | Type | Required |
| --- | --- | --- |
| `orientation` | `"portrait" \| "landscape"` | yes |
| `angle` | `number` | yes |

## `network_change`

TypeScript type: `IndeksNetworkChangeEvent`

| Field | Type | Required |
| --- | --- | --- |
| `effectiveType` | `"slow-2g" \| "2g" \| "3g" \| "4g" \| "unknown"` | yes |
| `downlink` | `number` | no |
| `rtt` | `number` | no |

## `first_contentful_paint`, `largest_contentful_paint`, `interaction_to_next_paint`, `cumulative_layout_shift`, `time_to_first_byte`

TypeScript type: `IndeksPerformanceEvent`

| Field | Type | Required |
| --- | --- | --- |
| `value` | `number` | yes |
| `rating` | `"good" \| "needs-improvement" \| "poor"` | no |

## `custom`

TypeScript type: `IndeksCustomEvent`

| Field | Type | Required |
| --- | --- | --- |
| `eventName` | `string` | yes |
| `properties` | `Record<string, unknown>` | yes |
| `category` | `string` | no |
| `value` | `number` | no |
| `label` | `string` | no |

## `identify`

TypeScript type: `IndeksIdentifyEvent`

| Field | Type | Required |
| --- | --- | --- |
| `traits` | `Record<string, unknown>` | yes |

