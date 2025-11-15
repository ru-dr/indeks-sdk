export interface IndeksConfig {
  apiKey: string;
  enableConsoleLogging?: boolean;
  endpoint?: string;
  localOnly?: boolean;  // Skip sending to API, only track locally
  captureClicks?: boolean;
  captureScrolls?: boolean;
  capturePageViews?: boolean;
  captureFormSubmissions?: boolean;
  captureKeystrokes?: boolean;
  captureMouseMovements?: boolean;
  captureResizes?: boolean;
  captureErrors?: boolean;
  // Navigation & Page Events
  captureBeforeUnload?: boolean;
  captureVisibilityChange?: boolean;
  captureWindowFocus?: boolean;
  captureHashChange?: boolean;
  capturePopState?: boolean;
  // Mouse & Touch Events
  captureMouseHover?: boolean;
  captureContextMenu?: boolean;
  captureDoubleClick?: boolean;
  captureMousePress?: boolean;
  captureMouseWheel?: boolean;
  captureTouchEvents?: boolean;
  captureDragDrop?: boolean;
  // Input & Form Events
  captureInputChanges?: boolean;
  captureFieldFocus?: boolean;
  captureClipboard?: boolean;
  captureTextSelection?: boolean;
  // Media Events
  captureMediaEvents?: boolean;
  // Network & Performance
  captureNetworkStatus?: boolean;
  capturePageLoad?: boolean;
  // UI Interaction Events
  captureFullscreenChange?: boolean;
  // Session Events
  captureSessionEvents?: boolean;
  // Search Events
  captureSearchEvents?: boolean;
  // Rage/Frustration Events
  captureRageEvents?: boolean;
  // Download Events
  captureDownloadEvents?: boolean;
  // Print Events
  capturePrintEvents?: boolean;
  // Share Events
  captureShareEvents?: boolean;
  // New Events
  capturePageLeave?: boolean;
  captureScrollDepth?: boolean;
  captureFormAbandon?: boolean;
  captureFormErrors?: boolean;
  captureIdleEvents?: boolean;
  captureTabFocus?: boolean;
  capturePageLifecycle?: boolean;
  captureOutboundLinks?: boolean;
  captureResourceErrors?: boolean;
  captureMediaProgress?: boolean;
  captureOrientationChange?: boolean;
  captureNetworkChange?: boolean;
  capturePerformanceMetrics?: boolean;
  debounceMs?: number;
  idleTimeoutMs?: number;
  scrollDepthThresholds?: number[];
}
