export const INDEKS_VERSION = '1.0.0';

export const DEFAULT_CONFIG = {
  enableConsoleLogging: false,
  captureClicks: true,
  captureScrolls: true,
  capturePageViews: true,
  captureFormSubmissions: true,
  captureKeystrokes: false,
  captureMouseMovements: false,
  captureResizes: true,
  captureErrors: true,
  captureBeforeUnload: true,
  captureVisibilityChange: true,
  captureWindowFocus: true,
  captureHashChange: true,
  capturePopState: true,
  captureMouseHover: false,
  captureContextMenu: true,
  captureDoubleClick: true,
  captureMousePress: false,
  captureMouseWheel: true,
  captureTouchEvents: true,
  captureDragDrop: true,
  captureInputChanges: true,
  captureFieldFocus: true,
  captureClipboard: true,
  captureTextSelection: false,
  captureMediaEvents: true,
  captureNetworkStatus: true,
  capturePageLoad: true,
  captureFullscreenChange: true,
  debounceMs: 100,
} as const;

export const API_ENDPOINTS = {
  DEFAULT: 'https://api.indeks.com/v1/events',
  STAGING: 'https://staging-api.indeks.com/v1/events',
  DEV: 'http://localhost:3000/v1/events',
} as const;

export const STORAGE_KEYS = {
  EVENTS: 'indeks_events',
  SESSION_EVENTS: 'indeks_events_session',
  USER_ID: 'indeks_user_id',
  SESSION_ID: 'indeks_session_id',
} as const;

export const EVENT_TYPES = {
  // Basic events
  CLICK: 'click',
  SCROLL: 'scroll',
  PAGEVIEW: 'pageview',
  FORM_SUBMIT: 'form_submit',
  KEYSTROKE: 'keystroke',
  MOUSEMOVE: 'mousemove',
  RESIZE: 'resize',
  ERROR: 'error',
  
  // Navigation & Page Events
  BEFORE_UNLOAD: 'beforeunload',
  VISIBILITY_CHANGE: 'visibilitychange',
  FOCUS: 'focus',
  BLUR: 'blur',
  HASH_CHANGE: 'hashchange',
  POP_STATE: 'popstate',
  
  // Mouse & Touch Events
  MOUSE_ENTER: 'mouseenter',
  MOUSE_LEAVE: 'mouseleave',
  CONTEXT_MENU: 'contextmenu',
  DOUBLE_CLICK: 'dblclick',
  MOUSE_DOWN: 'mousedown',
  MOUSE_UP: 'mouseup',
  WHEEL: 'wheel',
  TOUCH_START: 'touchstart',
  TOUCH_END: 'touchend',
  TOUCH_MOVE: 'touchmove',
  DRAG_START: 'dragstart',
  DRAG_END: 'dragend',
  DROP: 'drop',
  
  // Input & Form Events
  INPUT: 'input',
  CHANGE: 'change',
  COPY: 'copy',
  PASTE: 'paste',
  CUT: 'cut',
  SELECTION_CHANGE: 'selectionchange',
  
  // Media Events
  PLAY: 'play',
  PAUSE: 'pause',
  VOLUME_CHANGE: 'volumechange',
  SEEKING: 'seeking',
  SEEKED: 'seeked',
  ENDED: 'ended',
  
  // Network & Performance Events
  ONLINE: 'online',
  OFFLINE: 'offline',
  LOAD: 'load',
  DOM_CONTENT_LOADED: 'DOMContentLoaded',
  
  // UI Interaction Events
  FULLSCREEN_CHANGE: 'fullscreenchange',
} as const;

export const BATCH_CONFIG = {
  DEFAULT_BATCH_SIZE: 50,
  AUTO_FLUSH_INTERVAL: 5000, // 5 seconds
  MAX_BATCH_SIZE: 100,
  MIN_BATCH_SIZE: 1,
} as const;

export const VALIDATION = {
  MIN_API_KEY_LENGTH: 10,
  MAX_DEBOUNCE_MS: 10000,
  MAX_TEXT_LENGTH: 100,
  MAX_SELECTION_LENGTH: 200,
} as const;
