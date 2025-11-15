export interface BaseEvent {
  type: string;
  timestamp: number;
  url: string;
  userAgent: string;
  sessionId: string;
  userId: string;
  referrer?: string;
}

export interface ClickEvent extends BaseEvent {
  type: "click";
  element: {
    tagName: string;
    className: string;
    id: string;
    textContent: string;
    attributes: Record<string, string>;
  };
  coordinates: {
    x: number;
    y: number;
    clientX: number;
    clientY: number;
  };
}

export interface ScrollEvent extends BaseEvent {
  type: "scroll";
  scrollPosition: {
    x: number;
    y: number;
  };
  documentHeight: number;
  viewportHeight: number;
  scrollPercentage: number;
}

export interface PageViewEvent extends BaseEvent {
  type: "pageview";
  title: string;
  referrer: string;
}

export interface FormSubmitEvent extends BaseEvent {
  type: "form_submit";
  formData: Record<string, string>;
  formAction: string;
  formMethod: string;
  element: {
    tagName: string;
    className: string;
    id: string;
  };
}

export interface KeystrokeEvent extends BaseEvent {
  type: "keystroke";
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  target: {
    tagName: string;
    className: string;
    id: string;
    type?: string;
    name?: string;
  };
}

export interface MouseMoveEvent extends BaseEvent {
  type: "mousemove";
  coordinates: {
    x: number;
    y: number;
    clientX: number;
    clientY: number;
  };
}

export interface ResizeEvent extends BaseEvent {
  type: "resize";
  dimensions: {
    width: number;
    height: number;
    innerWidth: number;
    innerHeight: number;
  };
}

export interface ErrorEvent extends BaseEvent {
  type: "error";
  error: {
    message: string;
    filename: string;
    lineno: number;
    colno: number;
    stack?: string;
  };
}

// Navigation & Page Events
export interface BeforeUnloadEvent extends BaseEvent {
  type: "beforeunload";
  timeOnPage: number;
}

export interface VisibilityChangeEvent extends BaseEvent {
  type: "visibilitychange";
  visibilityState: "visible" | "hidden";
  hidden: boolean;
}

export interface WindowFocusEvent extends BaseEvent {
  type: "focus" | "blur";
  hasFocus: boolean;
}

export interface HashChangeEvent extends BaseEvent {
  type: "hashchange";
  oldURL: string;
  newURL: string;
  oldHash: string;
  newHash: string;
}

export interface PopStateEvent extends BaseEvent {
  type: "popstate";
  state: any;
}

// Mouse & Touch Events
export interface MouseHoverEvent extends BaseEvent {
  type: "mouseenter" | "mouseleave";
  element: {
    tagName: string;
    className: string;
    id: string;
  };
  coordinates: {
    x: number;
    y: number;
  };
}

export interface ContextMenuEvent extends BaseEvent {
  type: "contextmenu";
  element: {
    tagName: string;
    className: string;
    id: string;
    textContent: string;
  };
  coordinates: {
    x: number;
    y: number;
  };
}

export interface DoubleClickEvent extends BaseEvent {
  type: "dblclick";
  element: {
    tagName: string;
    className: string;
    id: string;
    textContent: string;
  };
  coordinates: {
    x: number;
    y: number;
  };
}

export interface MousePressEvent extends BaseEvent {
  type: "mousedown" | "mouseup";
  button: number;
  buttons: number;
  element: {
    tagName: string;
    className: string;
    id: string;
  };
  coordinates: {
    x: number;
    y: number;
  };
}

export interface WheelEvent extends BaseEvent {
  type: "wheel";
  deltaX: number;
  deltaY: number;
  deltaZ: number;
  deltaMode: number;
  coordinates: {
    x: number;
    y: number;
  };
}

export interface TouchEvent extends BaseEvent {
  type: "touchstart" | "touchend" | "touchmove";
  touches: Array<{
    identifier: number;
    clientX: number;
    clientY: number;
    force?: number;
  }>;
  element: {
    tagName: string;
    className: string;
    id: string;
  };
}

export interface DragDropEvent extends BaseEvent {
  type: "dragstart" | "dragend" | "drop";
  dataTransfer?: {
    dropEffect: string;
    effectAllowed: string;
    types: string[];
  };
  element: {
    tagName: string;
    className: string;
    id: string;
  };
  coordinates: {
    x: number;
    y: number;
  };
}

// Input & Form Events
export interface InputChangeEvent extends BaseEvent {
  type: "input" | "change";
  element: {
    tagName: string;
    className: string;
    id: string;
    type: string;
    name: string;
    value: string;
  };
  inputType?: string;
}

export interface FieldFocusEvent extends BaseEvent {
  type: "focus" | "blur";
  element: {
    tagName: string;
    className: string;
    id: string;
    type: string;
    name: string;
  };
}

export interface ClipboardEvent extends BaseEvent {
  type: "copy" | "paste" | "cut";
  element: {
    tagName: string;
    className: string;
    id: string;
    type?: string;
    name?: string;
  };
  text?: string; // Only for copy/cut, not paste for privacy
}

export interface TextSelectionEvent extends BaseEvent {
  type: "selectionchange";
  selectedText: string;
  selectionStart: number;
  selectionEnd: number;
  element?: {
    tagName: string;
    className: string;
    id: string;
    type?: string;
    name?: string;
  };
}

// Media Events
export interface MediaEvent extends BaseEvent {
  type: "play" | "pause" | "volumechange" | "seeking" | "seeked" | "ended";
  element: {
    tagName: string;
    className: string;
    id: string;
    src: string;
    currentTime: number;
    duration: number;
    volume?: number;
    muted?: boolean;
  };
}

// Network & Performance Events
export interface NetworkStatusEvent extends BaseEvent {
  type: "online" | "offline";
  isOnline: boolean;
  connectionType?: string;
}

export interface PageLoadEvent extends BaseEvent {
  type: "load" | "DOMContentLoaded";
  loadTime?: number;
  domInteractive?: number;
  domComplete?: number;
}

// UI Interaction Events
export interface FullscreenChangeEvent extends BaseEvent {
  type: "fullscreenchange";
  isFullscreen: boolean;
  element?: {
    tagName: string;
    className: string;
    id: string;
  };
}

// Session Events
export interface SessionStartEvent extends BaseEvent {
  type: "session_start";
  referrer: string;
  referrerDomain: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  trafficSource:
    | "organic"
    | "direct"
    | "social"
    | "referral"
    | "paid"
    | "email"
    | "other";
  landingPage: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isNewUser: boolean;
  isReturningUser: boolean;
  daysSinceLastVisit?: number;
}

export interface SessionEndEvent extends BaseEvent {
  type: "session_end";
  sessionDuration: number;
  activeTime: number;
  idleTime: number;
  pagesViewed: number;
  totalClicks: number;
  totalScrolls: number;
  exitPage: string;
  exitType: "navigation" | "tab_close" | "timeout" | "refresh";
  converted: boolean;
  bounce: boolean;
}

// Search Events
export interface SearchEvent extends BaseEvent {
  type: "search";
  query: string;
  resultsCount: number;
  searchLocation: "header" | "sidebar" | "page" | "mobile" | "other";
  filtersApplied?: Record<string, string>;
  sortBy?: string;
  resultsClicked: number;
  resultPositionClicked?: number[];
  timeToFirstClick?: number;
  isRefinement: boolean;
  previousQuery?: string;
  searchSource?: "direct" | "autocomplete" | "suggestion" | "voice";
}

// Rage/Frustration Events
export interface RageClickEvent extends BaseEvent {
  type: "rage_click";
  element: string; // CSS selector
  clicksInTimeframe: number;
  timeframe: number; // seconds
  whyRage: "button_disabled" | "loading" | "no_response" | "error" | "other";
  timeOnPage: number;
  userGaveUp: boolean;
  elementVisibleTime?: number;
}

export interface DeadClickEvent extends BaseEvent {
  type: "dead_click";
  element: string; // CSS selector
  expectedBehavior: "navigate" | "submit" | "expand" | "close" | "other";
  actualBehavior: "none" | "error" | "redirect" | "other";
  elementVisibleTime: number;
  previousClicksOnElement: number;
}

export interface ErrorClickEvent extends BaseEvent {
  type: "error_click";
  element: string; // CSS selector
  errorMessage: string;
  errorType: "validation" | "network" | "javascript" | "timeout" | "other";
  userContinued: boolean;
  timeToError: number;
}

// Download Events
export interface FileDownloadEvent extends BaseEvent {
  type: "file_download";
  fileName: string;
  fileType: string;
  fileSize: number; // bytes
  downloadSource: "link" | "button" | "auto" | "programmatic";
  downloadUrl?: string;
  timeOnPageBeforeDownload: number;
  downloadSpeed?: number; // bytes per second
}

// Print Events
export interface PrintEvent extends BaseEvent {
  type: "print";
  pagePrinted: string;
  timeOnPageBeforePrint: number;
  printTrigger: "menu" | "button" | "keyboard" | "programmatic";
  pagesPrinted?: number;
}

// Share Events
export interface ShareEvent extends BaseEvent {
  type: "share";
  shareMethod:
    | "copy_link"
    | "email"
    | "facebook"
    | "twitter"
    | "linkedin"
    | "whatsapp"
    | "native_share"
    | "other";
  contentShared: string; // URL, product ID, or content identifier
  shareLocation: "product_page" | "article" | "cart" | "checkout" | "other";
  shareText?: string;
  shareUrl?: string;
}

// Page Leave Event
export interface PageLeaveEvent extends BaseEvent {
  type: "pageleave";
  timeOnPage: number;
  scrollDepth: number;
  clickCount: number;
  engaged: boolean;
}

// Scroll Depth Event
export interface ScrollDepthEvent extends BaseEvent {
  type: "scroll_depth";
  depth: 25 | 50 | 75 | 100;
  timeToDepth: number;
}

// Form Events
export interface FormAbandonEvent extends BaseEvent {
  type: "form_abandon";
  formId: string;
  fieldsCompleted: number;
  totalFields: number;
  timeSpent: number;
  lastField: string;
}

export interface FormErrorEvent extends BaseEvent {
  type: "form_error";
  formId: string;
  field: string;
  errorType: "validation" | "required" | "format" | "other";
  errorMessage: string;
}

// Idle Events
export interface IdleEvent extends BaseEvent {
  type: "idle_start" | "idle_end";
  idleDuration?: number;
}

// Tab Focus Events
export interface TabFocusEvent extends BaseEvent {
  type: "tab_focus" | "tab_blur";
  timeAway?: number;
}

// Page Lifecycle Events
export interface PageLifecycleEvent extends BaseEvent {
  type: "page_freeze" | "page_resume";
}

// Outbound Link Event
export interface OutboundLinkEvent extends BaseEvent {
  type: "outbound_link";
  url: string;
  domain: string;
  linkText: string;
  openInNewTab: boolean;
}

// Resource Error Event
export interface ResourceErrorEvent extends BaseEvent {
  type: "resource_error";
  resourceType: "img" | "script" | "style" | "font" | "other";
  resourceUrl: string;
  errorMessage: string;
}

// Media Progress Events
export interface MediaProgressEvent extends BaseEvent {
  type: "video_progress" | "audio_progress";
  progress: 25 | 50 | 75 | 100;
  currentTime: number;
  duration: number;
  mediaUrl: string;
}

// Device Events
export interface OrientationChangeEvent extends BaseEvent {
  type: "orientation_change";
  orientation: "portrait" | "landscape";
  angle: number;
}

export interface NetworkChangeEvent extends BaseEvent {
  type: "network_change";
  effectiveType: "slow-2g" | "2g" | "3g" | "4g" | "unknown";
  downlink?: number;
  rtt?: number;
}

// Performance Events
export interface PerformanceEvent extends BaseEvent {
  type:
    | "first_contentful_paint"
    | "largest_contentful_paint"
    | "first_input_delay"
    | "cumulative_layout_shift"
    | "time_to_interactive"
    | "time_to_first_byte";
  value: number;
  rating?: "good" | "needs-improvement" | "poor";
}

// Manual/Custom Events
export interface CustomEvent extends BaseEvent {
  type: "custom";
  eventName: string;
  properties: Record<string, any>;
  category?: string;
  value?: number;
  label?: string;
}

export type IndeksEvent =
  | ClickEvent
  | ScrollEvent
  | PageViewEvent
  | FormSubmitEvent
  | KeystrokeEvent
  | MouseMoveEvent
  | ResizeEvent
  | ErrorEvent
  // Navigation & Page Events
  | PageLeaveEvent
  | BeforeUnloadEvent
  | VisibilityChangeEvent
  | WindowFocusEvent
  | HashChangeEvent
  | PopStateEvent
  | PageLifecycleEvent
  // Mouse & Touch Events
  | MouseHoverEvent
  | ContextMenuEvent
  | DoubleClickEvent
  | MousePressEvent
  | WheelEvent
  | TouchEvent
  | DragDropEvent
  // Input & Form Events
  | InputChangeEvent
  | FieldFocusEvent
  | ClipboardEvent
  | TextSelectionEvent
  | FormAbandonEvent
  | FormErrorEvent
  // Scroll Events
  | ScrollDepthEvent
  // Media Events
  | MediaEvent
  | MediaProgressEvent
  // Network & Performance Events
  | NetworkStatusEvent
  | NetworkChangeEvent
  | PageLoadEvent
  | PerformanceEvent
  // UI Interaction Events
  | FullscreenChangeEvent
  // Session Events
  | SessionStartEvent
  | SessionEndEvent
  | IdleEvent
  | TabFocusEvent
  // Search Events
  | SearchEvent
  // Rage/Frustration Events
  | RageClickEvent
  | DeadClickEvent
  | ErrorClickEvent
  // Download Events
  | FileDownloadEvent
  // Print Events
  | PrintEvent
  // Share Events
  | ShareEvent
  // Link Events
  | OutboundLinkEvent
  // Error Events
  | ResourceErrorEvent
  // Device Events
  | OrientationChangeEvent
  // Manual/Custom Events
  | CustomEvent;
