export interface ElementRef {
  tagName: string;
  className: string;
  id: string;
}

export interface DeviceData {
  browserName: string;
  browserVersion: string;
  browserEngine: string;
  browserEngineVersion: string;

  osName: string;
  osVersion: string;

  deviceType: "mobile" | "tablet" | "desktop";
  deviceVendor: string;
  deviceModel: string;

  screenWidth: number;
  screenHeight: number;
  screenColorDepth: number;
  pixelRatio: number;
  viewportWidth: number;
  viewportHeight: number;

  timezone: string;
  timezoneOffset: number;
  language: string;
  languages: string[];

  deviceMemory: number | null;
  hardwareConcurrency: number | null;
  maxTouchPoints: number;
  touchSupport: boolean;

  connectionType: string | null;
  connectionEffectiveType: string | null;
  connectionDownlink: number | null;
  connectionRtt: number | null;

  platform: string;
  vendor: string;
  cookiesEnabled: boolean;
  doNotTrack: boolean;
  online: boolean;

  isBot: boolean;
}

export interface IndeksBaseEvent {
  type: string;
  timestamp: number;
  url: string;
  userAgent: string;
  sessionId: string;
  userId: string;
  referrer?: string;
  externalUserId?: string;
}

export interface IndeksClickEvent extends IndeksBaseEvent {
  type: "click";
  element: ElementRef & {
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

export interface IndeksScrollEvent extends IndeksBaseEvent {
  type: "scroll";
  scrollPosition: {
    x: number;
    y: number;
  };
  documentHeight: number;
  viewportHeight: number;
  scrollPercentage: number;
}

export interface IndeksPageViewEvent extends IndeksBaseEvent {
  type: "pageview";
  title: string;
  referrer: string;
  name?: string;
  properties?: Record<string, unknown>;
}

export interface IndeksFormSubmitEvent extends IndeksBaseEvent {
  type: "form_submit";

  formData: Record<string, string>;

  formValuesCaptured?: boolean;
  formAction: string;
  formMethod: string;
  element: ElementRef;
}

export interface IndeksKeystrokeEvent extends IndeksBaseEvent {
  type: "keystroke";

  key?: string;
  keyCategory: "printable" | "navigation" | "modifier" | "whitespace";
  code?: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  target: ElementRef & {
    type?: string;
    name?: string;
  };
}

export interface IndeksMouseMoveEvent extends IndeksBaseEvent {
  type: "mousemove";
  coordinates: {
    x: number;
    y: number;
    clientX: number;
    clientY: number;
  };
}

export interface IndeksResizeEvent extends IndeksBaseEvent {
  type: "resize";
  dimensions: {
    width: number;
    height: number;
    innerWidth: number;
    innerHeight: number;
  };
}

export interface IndeksErrorEvent extends IndeksBaseEvent {
  type: "error";
  error: {
    message: string;
    filename: string;
    lineno: number;
    colno: number;
    stack?: string;
  };
}

export interface IndeksBeforeUnloadEvent extends IndeksBaseEvent {
  type: "beforeunload";
  timeOnPage: number;
}

export interface IndeksVisibilityChangeEvent extends IndeksBaseEvent {
  type: "visibilitychange";
  visibilityState: "visible" | "hidden";
  hidden: boolean;
}

export interface IndeksWindowFocusEvent extends IndeksBaseEvent {
  type: "focus" | "blur";
  hasFocus: boolean;
}

export interface IndeksHashChangeEvent extends IndeksBaseEvent {
  type: "hashchange";
  oldURL: string;
  newURL: string;
  oldHash: string;
  newHash: string;
}

export interface IndeksPopStateEvent extends IndeksBaseEvent {
  type: "popstate";
  hasState: boolean;
}

export interface IndeksMouseHoverEvent extends IndeksBaseEvent {
  type: "mouseenter" | "mouseleave";
  element: ElementRef;
  coordinates: {
    x: number;
    y: number;
  };
}

export interface IndeksContextMenuEvent extends IndeksBaseEvent {
  type: "contextmenu";
  element: ElementRef & {
    textContent: string;
  };
  coordinates: {
    x: number;
    y: number;
  };
}

export interface IndeksDoubleClickEvent extends IndeksBaseEvent {
  type: "dblclick";
  element: ElementRef & {
    textContent: string;
  };
  coordinates: {
    x: number;
    y: number;
  };
}

export interface IndeksMousePressEvent extends IndeksBaseEvent {
  type: "mousedown" | "mouseup";
  button: number;
  buttons: number;
  element: ElementRef;
  coordinates: {
    x: number;
    y: number;
  };
}

export interface IndeksWheelEvent extends IndeksBaseEvent {
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

export interface IndeksTouchEvent extends IndeksBaseEvent {
  type: "touchstart" | "touchend" | "touchmove";
  touches: Array<{
    identifier: number;
    clientX: number;
    clientY: number;
    force?: number;
  }>;
  element: ElementRef;
}

export interface IndeksDragDropEvent extends IndeksBaseEvent {
  type: "dragstart" | "dragend" | "drop";
  dataTransfer?: {
    dropEffect: string;
    effectAllowed: string;
    types: string[];
  };
  element: ElementRef;
  coordinates: {
    x: number;
    y: number;
  };
}

export interface IndeksInputChangeEvent extends IndeksBaseEvent {
  type: "input" | "change";
  element: ElementRef & {
    type: string;
    name: string;

    value?: string;
    valueLength: number;
  };
  inputType?: string;
}

export interface IndeksFieldFocusEvent extends IndeksBaseEvent {
  type: "field_focus" | "field_blur";
  element: ElementRef & {
    type: string;
    name: string;
  };
}

export interface IndeksClipboardEvent extends IndeksBaseEvent {
  type: "copy" | "paste" | "cut";
  element: ElementRef & {
    type?: string;
    name?: string;
  };

  text?: string;

  textLength?: number;
}

export interface IndeksTextSelectionEvent extends IndeksBaseEvent {
  type: "selectionchange";

  selectedText?: string;
  selectedTextLength: number;
  selectionStart: number;
  selectionEnd: number;
  element?: ElementRef & {
    type?: string;
    name?: string;
  };
}

export interface IndeksMediaEvent extends IndeksBaseEvent {
  type: "play" | "pause" | "volumechange" | "seeking" | "seeked" | "ended";
  element: ElementRef & {
    src: string;
    currentTime: number;
    duration: number;
    volume?: number;
    muted?: boolean;
  };
}

export interface IndeksNetworkStatusEvent extends IndeksBaseEvent {
  type: "online" | "offline";
  isOnline: boolean;
  connectionType?: string;
}

export interface IndeksPageLoadEvent extends IndeksBaseEvent {
  type: "load" | "DOMContentLoaded";
  loadTime?: number;
  domInteractive?: number;
  domComplete?: number;
}

export interface IndeksFullscreenChangeEvent extends IndeksBaseEvent {
  type: "fullscreenchange";
  isFullscreen: boolean;
  element?: ElementRef;
}

export interface IndeksSessionStartEvent extends IndeksBaseEvent {
  type: "session_start";
  device: DeviceData;
  referrer: string;
  referrerDomain: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  trafficSource: "organic" | "direct" | "social" | "referral" | "paid" | "email" | "other";
  landingPage: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isNewUser: boolean;
  isReturningUser: boolean;
  daysSinceLastVisit?: number;
}

export interface IndeksSessionEndEvent extends IndeksBaseEvent {
  type: "session_end";
  sessionDuration: number;
  activeTime: number;
  idleTime: number;
  pagesViewed: number;
  totalClicks: number;
  totalScrolls: number;
  exitPage: string;
  exitType: "navigation" | "tab_close" | "timeout" | "refresh" | "reset";
  converted: boolean;
  bounce: boolean;
}

export interface IndeksSearchEvent extends IndeksBaseEvent {
  type: "search";

  query?: string;
  queryLength: number;
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

export interface IndeksRageClickEvent extends IndeksBaseEvent {
  type: "rage_click";
  element: string;
  clicksInTimeframe: number;
  timeframe: number;
  whyRage: "button_disabled" | "loading" | "no_response" | "error" | "other";
  timeOnPage: number;
  elementVisibleTime?: number;
}

export interface IndeksDeadClickEvent extends IndeksBaseEvent {
  type: "dead_click";
  element: string;
  expectedBehavior: "navigate" | "submit" | "expand" | "close" | "other";
  actualBehavior: "none" | "error" | "redirect" | "other";

  elementVisibleTime?: number;
  previousClicksOnElement: number;
}

export interface IndeksErrorClickEvent extends IndeksBaseEvent {
  type: "error_click";
  element: string;
  errorMessage: string;
  errorType: "validation" | "network" | "javascript" | "timeout" | "other";
  userContinued: boolean;
  timeToError: number;
}

export interface IndeksFileDownloadEvent extends IndeksBaseEvent {
  type: "file_download";
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadSource: "link" | "button" | "auto" | "programmatic";
  downloadUrl?: string;
  timeOnPageBeforeDownload: number;
  downloadSpeed?: number;
}

export interface IndeksPrintEvent extends IndeksBaseEvent {
  type: "print";
  pagePrinted: string;
  timeOnPageBeforePrint: number;
  printTrigger: "menu" | "button" | "keyboard" | "programmatic";
  pagesPrinted?: number;
}

export interface IndeksShareEvent extends IndeksBaseEvent {
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
  contentShared: string;
  shareLocation: "product_page" | "article" | "cart" | "checkout" | "other";
  shareText?: string;
  shareUrl?: string;
}

export interface IndeksPageLeaveEvent extends IndeksBaseEvent {
  type: "pageleave";
  timeOnPage: number;
  scrollDepth: number;
  clickCount: number;
  engaged: boolean;
}

export interface IndeksScrollDepthEvent extends IndeksBaseEvent {
  type: "scroll_depth";
  depth: 25 | 50 | 75 | 100;
  timeToDepth: number;
}

export interface IndeksFormAbandonEvent extends IndeksBaseEvent {
  type: "form_abandon";
  formId: string;
  fieldsCompleted: number;
  totalFields: number;
  timeSpent: number;
  lastField: string;
}

export interface IndeksFormErrorEvent extends IndeksBaseEvent {
  type: "form_error";
  formId: string;
  field: string;
  errorType: "validation" | "required" | "format" | "other";
  errorMessage: string;
}

export interface IndeksIdleEvent extends IndeksBaseEvent {
  type: "idle_start" | "idle_end";
  idleDuration?: number;
}

export interface IndeksTabFocusEvent extends IndeksBaseEvent {
  type: "tab_focus" | "tab_blur";
  timeAway?: number;
}

export interface IndeksPageLifecycleEvent extends IndeksBaseEvent {
  type: "page_freeze" | "page_resume";
}

export interface IndeksOutboundLinkEvent extends IndeksBaseEvent {
  type: "outbound_link";
  targetUrl: string;
  domain: string;
  linkText: string;
  openInNewTab: boolean;
}

export interface IndeksResourceErrorEvent extends IndeksBaseEvent {
  type: "resource_error";
  resourceType: "img" | "script" | "style" | "font" | "other";
  resourceUrl: string;
  errorMessage: string;
}

export interface IndeksMediaProgressEvent extends IndeksBaseEvent {
  type: "video_progress" | "audio_progress";
  progress: 25 | 50 | 75 | 100;
  currentTime: number;
  duration: number;
  mediaUrl: string;
}

export interface IndeksOrientationChangeEvent extends IndeksBaseEvent {
  type: "orientation_change";
  orientation: "portrait" | "landscape";
  angle: number;
}

export interface IndeksNetworkChangeEvent extends IndeksBaseEvent {
  type: "network_change";
  effectiveType: "slow-2g" | "2g" | "3g" | "4g" | "unknown";
  downlink?: number;
  rtt?: number;
}

export interface IndeksPerformanceEvent extends IndeksBaseEvent {
  type:
    | "first_contentful_paint"
    | "largest_contentful_paint"
    | "interaction_to_next_paint"
    | "cumulative_layout_shift"
    | "time_to_first_byte";
  value: number;
  rating?: "good" | "needs-improvement" | "poor";
}

export interface IndeksCustomEvent extends IndeksBaseEvent {
  type: "custom";
  eventName: string;
  properties: Record<string, unknown>;
  category?: string;
  value?: number;
  label?: string;
}

export interface IndeksIdentifyEvent extends IndeksBaseEvent {
  type: "identify";
  traits: Record<string, unknown>;
}

export type IndeksEvent =
  | IndeksClickEvent
  | IndeksScrollEvent
  | IndeksPageViewEvent
  | IndeksFormSubmitEvent
  | IndeksKeystrokeEvent
  | IndeksMouseMoveEvent
  | IndeksResizeEvent
  | IndeksErrorEvent
  | IndeksPageLeaveEvent
  | IndeksBeforeUnloadEvent
  | IndeksVisibilityChangeEvent
  | IndeksWindowFocusEvent
  | IndeksHashChangeEvent
  | IndeksPopStateEvent
  | IndeksPageLifecycleEvent
  | IndeksMouseHoverEvent
  | IndeksContextMenuEvent
  | IndeksDoubleClickEvent
  | IndeksMousePressEvent
  | IndeksWheelEvent
  | IndeksTouchEvent
  | IndeksDragDropEvent
  | IndeksInputChangeEvent
  | IndeksFieldFocusEvent
  | IndeksClipboardEvent
  | IndeksTextSelectionEvent
  | IndeksFormAbandonEvent
  | IndeksFormErrorEvent
  | IndeksScrollDepthEvent
  | IndeksMediaEvent
  | IndeksMediaProgressEvent
  | IndeksNetworkStatusEvent
  | IndeksNetworkChangeEvent
  | IndeksPageLoadEvent
  | IndeksPerformanceEvent
  | IndeksFullscreenChangeEvent
  | IndeksSessionStartEvent
  | IndeksSessionEndEvent
  | IndeksIdleEvent
  | IndeksTabFocusEvent
  | IndeksSearchEvent
  | IndeksRageClickEvent
  | IndeksDeadClickEvent
  | IndeksErrorClickEvent
  | IndeksFileDownloadEvent
  | IndeksPrintEvent
  | IndeksShareEvent
  | IndeksOutboundLinkEvent
  | IndeksResourceErrorEvent
  | IndeksOrientationChangeEvent
  | IndeksCustomEvent
  | IndeksIdentifyEvent;
