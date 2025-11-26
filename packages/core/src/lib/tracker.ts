import FingerprintJS from "@fingerprintjs/fingerprintjs";
import {
  generateId,
  debounce,
  DEFAULT_CONFIG,
  Logger,
  LogLevel,
} from "@indeks/shared";
import { IndeksAnalytics } from "./analytics";
import type { IndeksConfig } from "@indeks/shared";
import type {
  IndeksEvent,
  BaseEvent,
  ClickEvent,
  ScrollEvent,
  PageViewEvent,
  FormSubmitEvent,
  KeystrokeEvent,
  MouseMoveEvent,
  ResizeEvent,
  ErrorEvent,
  // Navigation & Page Events
  PageLeaveEvent,
  BeforeUnloadEvent,
  VisibilityChangeEvent,
  WindowFocusEvent,
  HashChangeEvent,
  PopStateEvent,
  PageLifecycleEvent,
  // Mouse & Touch Events
  MouseHoverEvent,
  ContextMenuEvent,
  DoubleClickEvent,
  MousePressEvent,
  WheelEvent,
  TouchEvent,
  DragDropEvent,
  // Input & Form Events
  InputChangeEvent,
  FieldFocusEvent,
  ClipboardEvent,
  TextSelectionEvent,
  FormAbandonEvent,
  FormErrorEvent,
  // Scroll Events
  ScrollDepthEvent,
  // Media Events
  MediaEvent,
  MediaProgressEvent,
  // Network & Performance Events
  NetworkStatusEvent,
  NetworkChangeEvent,
  PageLoadEvent,
  PerformanceEvent,
  // UI Interaction Events
  FullscreenChangeEvent,
  // Session Events
  SessionStartEvent,
  SessionEndEvent,
  IdleEvent,
  TabFocusEvent,
  // Search Events
  SearchEvent,
  // Rage/Frustration Events
  RageClickEvent,
  DeadClickEvent,
  ErrorClickEvent,
  // Download Events
  FileDownloadEvent,
  // Print Events
  PrintEvent,
  // Share Events
  ShareEvent,
  // Link Events
  OutboundLinkEvent,
  // Error Events
  ResourceErrorEvent,
  // Device Events
  OrientationChangeEvent,
  // Manual/Custom Events
  CustomEvent,
  // Interfaces
  ManualTrackingSchema,
} from "@indeks/shared";

function getClassName(element: Element): string {
  if (typeof element.className === 'string') {
    return element.className;
  }
  return (element.className as unknown as SVGAnimatedString)?.baseVal || '';
}

class IndeksTracker {
  private config: IndeksConfig;
  private sessionId: string;
  private userId: string | null = null;
  private eventQueue: IndeksEvent[] = [];
  private isInitialized: boolean = false;
  private pageLoadTime: number = Date.now();
  private logger: Logger;
  private analytics: IndeksAnalytics;
  private autoFlushInterval: number | null = null;

  // Session tracking properties
  private sessionStartTime: number = Date.now();
  private lastActivityTime: number = Date.now();
  private pageViews: number = 0;
  private totalClicks: number = 0;
  private totalScrolls: number = 0;
  private sessionEnded: boolean = false;
  private previousUrl: string | null = null;  // Track previous page for SPA navigation

  // Rage click detection
  private clickCounts: Map<string, { count: number; timestamp: number }> =
    new Map();
  private elementVisibility: Map<string, number> = new Map();

  // New tracking state for batching and advanced events
  private scrollDepthReached: Set<number> = new Set();
  private formInteractions: Map<string, {
    startTime: number;
    fields: Set<string>;
    lastInteraction: number;
  }> = new Map();
  private mediaProgress: Map<string, Set<number>> = new Map();
  private idleTimer: number | null = null;
  private lastIdleCheck: number = Date.now();
  private isIdle: boolean = false;
  private tabBlurTime: number | null = null;

  constructor(config: IndeksConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.sessionId = generateId("indeks");
    this.logger = new Logger({
      enableConsole: this.config.enableConsoleLogging !== false,
      level: LogLevel.INFO,
    });
    this.analytics = new IndeksAnalytics(this.config);
    this.validateApiKey();
  }

  private validateApiKey(): void {
    if (!this.config.apiKey || this.config.apiKey.trim() === "") {
      throw new Error(
        "Indeks: API key is required. Please provide a valid API key.",
      );
    }

    if (this.config.localOnly) {
      this.logger.info(
        `🏠 LOCAL ONLY MODE: Events tracked locally, not sent to API`,
      );
    }

    this.logger.info(
      `🔧 Initialized with API key: ${this.config.apiKey.substring(0, 8)}...`,
    );
  }

  private async initializeUserId(): Promise<void> {
    try {
      // Load FingerprintJS and generate the fingerprint
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      this.userId = result.visitorId;
    } catch (error) {
      this.logger.warn(
        "Failed to generate fingerprint, using fallback userId:",
        error,
      );
      // Fallback to a random ID if FingerprintJS fails
      this.userId = generateId("fallback");
    }
  }

  private createBaseEvent(): BaseEvent {
    // Check for referrer tracking parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    // Industry standard: utm_source for marketing campaigns
    const utmSource = urlParams.get('utm_source');
    
    // Custom ref parameter for simple tracking (ref, referrer, source)
    const customRef = urlParams.get('ref') || urlParams.get('referrer') || urlParams.get('source');
    
    return {
      type: "",
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      userId: this.userId || "initializing",
      // Priority: utm_source (industry standard) > custom ref > previous page > document.referrer
      referrer: utmSource || customRef || this.previousUrl || document.referrer || undefined,
    };
  }

  private logEvent(event: IndeksEvent): void {
    this.eventQueue.push(event);

    this.logger.info(`📊 Event: ${event.type}`, {
      event,
      queueLength: this.eventQueue.length,
    });

    // Batch event for sending to analytics
    this.analytics.batch([event]).catch((error) => {
      this.logger.warn("Failed to queue event for sending:", error);
    });
  }

  private getElementInfo(element: Element) {
    const attributes: Record<string, string> = {};
    Array.from(element.attributes).forEach((attr) => {
      attributes[attr.name] = attr.value;
    });

    return {
      tagName: element.tagName.toLowerCase(),
      className: getClassName(element),
      id: element.id || "",
      textContent: element.textContent?.substring(0, 100) || "",
      attributes,
    };
  }

  private setupClickTracking(): void {
    if (!this.config.captureClicks) return;

    document.addEventListener(
      "click",
      (e) => {
        const event: ClickEvent = {
          ...this.createBaseEvent(),
          type: "click",
          element: this.getElementInfo(e.target as Element),
          coordinates: {
            x: e.pageX,
            y: e.pageY,
            clientX: e.clientX,
            clientY: e.clientY,
          },
        };
        this.logEvent(event);
      },
      true,
    );
  }

  private setupScrollTracking(): void {
    if (!this.config.captureScrolls) return;

    const handleScroll = debounce(() => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;
      const documentHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight,
      );
      const viewportHeight = window.innerHeight;
      const scrollPercentage = Math.round(
        (scrollTop / (documentHeight - viewportHeight)) * 100,
      );

      const event: ScrollEvent = {
        ...this.createBaseEvent(),
        type: "scroll",
        scrollPosition: {
          x: scrollLeft,
          y: scrollTop,
        },
        documentHeight,
        viewportHeight,
        scrollPercentage: isNaN(scrollPercentage) ? 0 : scrollPercentage,
      };
      this.logEvent(event);
    }, this.config.debounceMs || 100);

    window.addEventListener("scroll", handleScroll, { passive: true });
  }

  private setupPageViewTracking(): void {
    if (!this.config.capturePageViews) return;

    const trackPageView = () => {
      this.pageViews++;
      const event: PageViewEvent = {
        ...this.createBaseEvent(),
        type: "pageview",
        title: document.title,
        referrer: this.previousUrl || document.referrer,  // Use tracked previous URL
      };
      this.logEvent(event);
      
      // Store current URL as previous for next navigation
      this.previousUrl = window.location.href;
    };

    // Track initial page view
    trackPageView();

    // Track navigation changes (for SPAs)
    let currentUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        trackPageView();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private setupFormTracking(): void {
    if (!this.config.captureFormSubmissions) return;

    document.addEventListener("submit", (e) => {
      const form = e.target as HTMLFormElement;
      const formData: Record<string, string> = {};

      const formDataObj = new FormData(form);
      formDataObj.forEach((value, key) => {
        // Only capture non-sensitive data
        if (
          !key.toLowerCase().includes("password") &&
          !key.toLowerCase().includes("secret") &&
          !key.toLowerCase().includes("token")
        ) {
          formData[key] = value.toString();
        }
      });

      const event: FormSubmitEvent = {
        ...this.createBaseEvent(),
        type: "form_submit",
        formData,
        formAction: form.action,
        formMethod: form.method,
        element: {
          tagName: form.tagName.toLowerCase(),
          className: getClassName(form),
          id: form.id || "",
        },
      };
      this.logEvent(event);
    });
  }

  private setupKeystrokeTracking(): void {
    if (!this.config.captureKeystrokes) return;

    document.addEventListener("keydown", (e) => {
      // Skip sensitive inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" &&
        ["password", "hidden", "email"].includes(
          (target as HTMLInputElement).type,
        )
      ) {
        return;
      }

      const event: KeystrokeEvent = {
        ...this.createBaseEvent(),
        type: "keystroke",
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        target: {
          tagName: target.tagName.toLowerCase(),
          className: getClassName(target),
          id: target.id || "",
          type: (target as HTMLInputElement).type,
          name: (target as HTMLInputElement).name,
        },
      };
      this.logEvent(event);
    });
  }

  private setupMouseMovementTracking(): void {
    if (!this.config.captureMouseMovements) return;

    const handleMouseMove = debounce((e: MouseEvent) => {
      const event: MouseMoveEvent = {
        ...this.createBaseEvent(),
        type: "mousemove",
        coordinates: {
          x: e.pageX,
          y: e.pageY,
          clientX: e.clientX,
          clientY: e.clientY,
        },
      };
      this.logEvent(event);
    }, this.config.debounceMs || 100);

    document.addEventListener("mousemove", (e) => handleMouseMove(e), {
      passive: true,
    });
  }

  private setupResizeTracking(): void {
    if (!this.config.captureResizes) return;

    const handleResize = debounce(() => {
      const event: ResizeEvent = {
        ...this.createBaseEvent(),
        type: "resize",
        dimensions: {
          width: window.outerWidth,
          height: window.outerHeight,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
        },
      };
      this.logEvent(event);
    }, this.config.debounceMs || 100);

    window.addEventListener("resize", handleResize);
  }

  private setupErrorTracking(): void {
    if (!this.config.captureErrors) return;

    window.addEventListener("error", (e) => {
      const event: ErrorEvent = {
        ...this.createBaseEvent(),
        type: "error",
        error: {
          message: e.message,
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
          stack: e.error?.stack,
        },
      };
      this.logEvent(event);
    });

    window.addEventListener("unhandledrejection", (e) => {
      const event: ErrorEvent = {
        ...this.createBaseEvent(),
        type: "error",
        error: {
          message: `Unhandled Promise Rejection: ${e.reason}`,
          filename: "",
          lineno: 0,
          colno: 0,
          stack: e.reason?.stack,
        },
      };
      this.logEvent(event);
    });
  }

  // Navigation & Page Events
  private setupBeforeUnloadTracking(): void {
    if (!this.config.captureBeforeUnload) return;

    window.addEventListener("beforeunload", () => {
      const event: BeforeUnloadEvent = {
        ...this.createBaseEvent(),
        type: "beforeunload",
        timeOnPage: Date.now() - this.pageLoadTime,
      };
      this.logEvent(event);
    });
  }

  private setupVisibilityChangeTracking(): void {
    if (!this.config.captureVisibilityChange) return;

    document.addEventListener("visibilitychange", () => {
      const event: VisibilityChangeEvent = {
        ...this.createBaseEvent(),
        type: "visibilitychange",
        visibilityState: document.visibilityState as "visible" | "hidden",
        hidden: document.hidden,
      };
      this.logEvent(event);
    });
  }

  private setupWindowFocusTracking(): void {
    if (!this.config.captureWindowFocus) return;

    window.addEventListener("focus", () => {
      const event: WindowFocusEvent = {
        ...this.createBaseEvent(),
        type: "focus",
        hasFocus: true,
      };
      this.logEvent(event);
    });

    window.addEventListener("blur", () => {
      const event: WindowFocusEvent = {
        ...this.createBaseEvent(),
        type: "blur",
        hasFocus: false,
      };
      this.logEvent(event);
    });
  }

  private setupHashChangeTracking(): void {
    if (!this.config.captureHashChange) return;

    window.addEventListener("hashchange", (e) => {
      const event: HashChangeEvent = {
        ...this.createBaseEvent(),
        type: "hashchange",
        oldURL: e.oldURL,
        newURL: e.newURL,
        oldHash: new URL(e.oldURL).hash,
        newHash: new URL(e.newURL).hash,
      };
      this.logEvent(event);
    });
  }

  private setupPopStateTracking(): void {
    if (!this.config.capturePopState) return;

    window.addEventListener("popstate", (e) => {
      const event: PopStateEvent = {
        ...this.createBaseEvent(),
        type: "popstate",
        state: e.state,
      };
      this.logEvent(event);
    });
  }

  // Mouse & Touch Events
  private setupMouseHoverTracking(): void {
    if (!this.config.captureMouseHover) return;

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as Element;
      const event: MouseHoverEvent = {
        ...this.createBaseEvent(),
        type: "mouseenter",
        element: {
          tagName: target.tagName.toLowerCase(),
          className: getClassName(target),
          id: target.id || "",
        },
        coordinates: {
          x: e.pageX,
          y: e.pageY,
        },
      };
      this.logEvent(event);
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as Element;
      const event: MouseHoverEvent = {
        ...this.createBaseEvent(),
        type: "mouseleave",
        element: {
          tagName: target.tagName.toLowerCase(),
          className: getClassName(target),
          id: target.id || "",
        },
        coordinates: {
          x: e.pageX,
          y: e.pageY,
        },
      };
      this.logEvent(event);
    };

    document.addEventListener("mouseenter", handleMouseEnter, true);
    document.addEventListener("mouseleave", handleMouseLeave, true);
  }

  private setupContextMenuTracking(): void {
    if (!this.config.captureContextMenu) return;

    document.addEventListener("contextmenu", (e) => {
      const event: ContextMenuEvent = {
        ...this.createBaseEvent(),
        type: "contextmenu",
        element: this.getElementInfo(e.target as Element),
        coordinates: {
          x: e.pageX,
          y: e.pageY,
        },
      };
      this.logEvent(event);
    });
  }

  private setupDoubleClickTracking(): void {
    if (!this.config.captureDoubleClick) return;

    document.addEventListener("dblclick", (e) => {
      const event: DoubleClickEvent = {
        ...this.createBaseEvent(),
        type: "dblclick",
        element: this.getElementInfo(e.target as Element),
        coordinates: {
          x: e.pageX,
          y: e.pageY,
        },
      };
      this.logEvent(event);
    });
  }

  private setupMousePressTracking(): void {
    if (!this.config.captureMousePress) return;

    document.addEventListener("mousedown", (e) => {
      const target = e.target as Element;
      const event: MousePressEvent = {
        ...this.createBaseEvent(),
        type: "mousedown",
        button: e.button,
        buttons: e.buttons,
        element: {
          tagName: target.tagName.toLowerCase(),
          className: getClassName(target),
          id: target.id || "",
        },
        coordinates: {
          x: e.pageX,
          y: e.pageY,
        },
      };
      this.logEvent(event);
    });

    document.addEventListener("mouseup", (e) => {
      const target = e.target as Element;
      const event: MousePressEvent = {
        ...this.createBaseEvent(),
        type: "mouseup",
        button: e.button,
        buttons: e.buttons,
        element: {
          tagName: target.tagName.toLowerCase(),
          className: getClassName(target),
          id: target.id || "",
        },
        coordinates: {
          x: e.pageX,
          y: e.pageY,
        },
      };
      this.logEvent(event);
    });
  }

  private setupMouseWheelTracking(): void {
    if (!this.config.captureMouseWheel) return;

    document.addEventListener(
      "wheel",
      (e) => {
        const event: WheelEvent = {
          ...this.createBaseEvent(),
          type: "wheel",
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          deltaZ: e.deltaZ,
          deltaMode: e.deltaMode,
          coordinates: {
            x: e.pageX,
            y: e.pageY,
          },
        };
        this.logEvent(event);
      },
      { passive: true },
    );
  }

  private setupTouchTracking(): void {
    if (!this.config.captureTouchEvents) return;

    const handleTouchEvent = (
      eventType: "touchstart" | "touchend" | "touchmove",
    ) => {
      return (e: globalThis.TouchEvent) => {
        const touches = Array.from(e.touches).map((touch) => ({
          identifier: touch.identifier,
          clientX: touch.clientX,
          clientY: touch.clientY,
          force: touch.force,
        }));

        const target = e.target as Element;
        const event: TouchEvent = {
          ...this.createBaseEvent(),
          type: eventType,
          touches,
          element: {
            tagName: target.tagName.toLowerCase(),
            className: getClassName(target),
            id: target.id || "",
          },
        };
        this.logEvent(event);
      };
    };

    document.addEventListener("touchstart", handleTouchEvent("touchstart"), {
      passive: true,
    });
    document.addEventListener("touchend", handleTouchEvent("touchend"), {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchEvent("touchmove"), {
      passive: true,
    });
  }

  private setupDragDropTracking(): void {
    if (!this.config.captureDragDrop) return;

    const handleDragEvent = (eventType: "dragstart" | "dragend" | "drop") => {
      return (e: DragEvent) => {
        const target = e.target as Element;
        const event: DragDropEvent = {
          ...this.createBaseEvent(),
          type: eventType,
          dataTransfer: e.dataTransfer
            ? {
                dropEffect: e.dataTransfer.dropEffect,
                effectAllowed: e.dataTransfer.effectAllowed,
                types: Array.from(e.dataTransfer.types),
              }
            : undefined,
          element: {
            tagName: target.tagName.toLowerCase(),
            className: getClassName(target),
            id: target.id || "",
          },
          coordinates: {
            x: e.pageX,
            y: e.pageY,
          },
        };
        this.logEvent(event);
      };
    };

    document.addEventListener("dragstart", handleDragEvent("dragstart"));
    document.addEventListener("dragend", handleDragEvent("dragend"));
    document.addEventListener("drop", handleDragEvent("drop"));
  }

  // Input & Form Events
  private setupInputChangeTracking(): void {
    if (!this.config.captureInputChanges) return;

    const handleInputEvent = (eventType: "input" | "change") => {
      return (e: Event) => {
        const target = e.target as HTMLInputElement;

        // Skip sensitive inputs
        if (
          target.type === "password" ||
          target.name?.toLowerCase().includes("password")
        ) {
          return;
        }

        const event: InputChangeEvent = {
          ...this.createBaseEvent(),
          type: eventType,
          element: {
            tagName: target.tagName.toLowerCase(),
            className: getClassName(target),
            id: target.id || "",
            type: target.type,
            name: target.name,
            value: target.value.substring(0, 100), // Limit value length
          },
          inputType: (e as InputEvent).inputType,
        };
        this.logEvent(event);
      };
    };

    document.addEventListener("input", handleInputEvent("input"));
    document.addEventListener("change", handleInputEvent("change"));
  }

  private setupFieldFocusTracking(): void {
    if (!this.config.captureFieldFocus) return;

    const handleFocusEvent = (eventType: "focus" | "blur") => {
      return (e: FocusEvent) => {
        const target = e.target as HTMLElement;

        if (!["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
          return;
        }

        const event: FieldFocusEvent = {
          ...this.createBaseEvent(),
          type: eventType,
          element: {
            tagName: target.tagName.toLowerCase(),
            className: getClassName(target),
            id: target.id || "",
            type: (target as HTMLInputElement).type || "",
            name: (target as HTMLInputElement).name || "",
          },
        };
        this.logEvent(event);
      };
    };

    document.addEventListener("focus", handleFocusEvent("focus"), true);
    document.addEventListener("blur", handleFocusEvent("blur"), true);
  }

  private setupClipboardTracking(): void {
    if (!this.config.captureClipboard) return;

    const handleClipboardEvent = (eventType: "copy" | "paste" | "cut") => {
      return (e: globalThis.ClipboardEvent) => {
        const target = e.target as HTMLElement;

        const event: ClipboardEvent = {
          ...this.createBaseEvent(),
          type: eventType,
          element: {
            tagName: target.tagName.toLowerCase(),
            className: getClassName(target),
            id: target.id || "",
            type: (target as HTMLInputElement).type,
            name: (target as HTMLInputElement).name,
          },
          text:
            eventType !== "paste"
              ? window.getSelection()?.toString().substring(0, 100)
              : undefined,
        };
        this.logEvent(event);
      };
    };

    document.addEventListener("copy", handleClipboardEvent("copy"));
    document.addEventListener("paste", handleClipboardEvent("paste"));
    document.addEventListener("cut", handleClipboardEvent("cut"));
  }

  private setupTextSelectionTracking(): void {
    if (!this.config.captureTextSelection) return;

    document.addEventListener("selectionchange", () => {
      const selection = window.getSelection();
      if (!selection || selection.toString().length === 0) return;

      const parentElement = selection.anchorNode?.parentElement;
      const event: TextSelectionEvent = {
        ...this.createBaseEvent(),
        type: "selectionchange",
        selectedText: selection.toString().substring(0, 200),
        selectionStart: selection.anchorOffset,
        selectionEnd: selection.focusOffset,
        element: parentElement
          ? {
              tagName: parentElement.tagName.toLowerCase(),
              className: getClassName(parentElement),
              id: parentElement.id || "",
              type: (parentElement as HTMLInputElement).type,
              name: (parentElement as HTMLInputElement).name,
            }
          : undefined,
      };
      this.logEvent(event);
    });
  }

  // Media Events
  private setupMediaTracking(): void {
    if (!this.config.captureMediaEvents) return;

    const mediaEventTypes = [
      "play",
      "pause",
      "volumechange",
      "seeking",
      "seeked",
      "ended",
    ];

    mediaEventTypes.forEach((eventType) => {
      document.addEventListener(
        eventType,
        (e) => {
          const target = e.target as HTMLMediaElement;

          if (!["VIDEO", "AUDIO"].includes(target.tagName)) return;

          const event: MediaEvent = {
            ...this.createBaseEvent(),
            type: eventType as any,
            element: {
              tagName: target.tagName.toLowerCase(),
              className: getClassName(target),
              id: target.id || "",
              src: target.src || target.currentSrc,
              currentTime: target.currentTime,
              duration: target.duration,
              volume: target.volume,
              muted: target.muted,
            },
          };
          this.logEvent(event);
        },
        true,
      );
    });
  }

  // Network & Performance Events
  private setupNetworkStatusTracking(): void {
    if (!this.config.captureNetworkStatus) return;

    const handleNetworkChange = (eventType: "online" | "offline") => {
      return () => {
        const event: NetworkStatusEvent = {
          ...this.createBaseEvent(),
          type: eventType,
          isOnline: navigator.onLine,
          connectionType: (navigator as any).connection?.effectiveType,
        };
        this.logEvent(event);
      };
    };

    window.addEventListener("online", handleNetworkChange("online"));
    window.addEventListener("offline", handleNetworkChange("offline"));
  }

  private setupPageLoadTracking(): void {
    if (!this.config.capturePageLoad) return;

    window.addEventListener("load", () => {
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;

      const event: PageLoadEvent = {
        ...this.createBaseEvent(),
        type: "load",
        loadTime: Date.now() - this.pageLoadTime,
        domInteractive: navigation?.domInteractive,
        domComplete: navigation?.domComplete,
      };
      this.logEvent(event);
    });

    document.addEventListener("DOMContentLoaded", () => {
      const event: PageLoadEvent = {
        ...this.createBaseEvent(),
        type: "DOMContentLoaded",
        loadTime: Date.now() - this.pageLoadTime,
      };
      this.logEvent(event);
    });
  }

  // UI Interaction Events
  private setupFullscreenChangeTracking(): void {
    if (!this.config.captureFullscreenChange) return;

    document.addEventListener("fullscreenchange", () => {
      const event: FullscreenChangeEvent = {
        ...this.createBaseEvent(),
        type: "fullscreenchange",
        isFullscreen: !!document.fullscreenElement,
        element: document.fullscreenElement
          ? {
              tagName: document.fullscreenElement.tagName.toLowerCase(),
              className: getClassName(document.fullscreenElement),
              id: document.fullscreenElement.id || "",
            }
          : undefined,
      };
      this.logEvent(event);
    });
  }

  // Session Events
  private setupSessionTracking(): void {
    if (!this.config.captureSessionEvents) return;

    // Track session start
    this.trackSessionStart();

    // Track activity to update lastActivityTime
    const updateActivity = () => {
      this.lastActivityTime = Date.now();
    };

    // Update activity on various events
    document.addEventListener("click", updateActivity, true);
    document.addEventListener("scroll", updateActivity, { passive: true });
    document.addEventListener("keydown", updateActivity, true);
    document.addEventListener("mousemove", updateActivity, { passive: true });

    // Track session end on beforeunload
    window.addEventListener("beforeunload", () => {
      this.trackSessionEnd();
    });

    // Track session end on visibility change (tab close/minimize)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        // Check if this might be a tab close after a delay
        setTimeout(() => {
          if (document.visibilityState === "hidden") {
            this.trackSessionEnd();
          }
        }, 1000);
      }
    });
  }

  private trackSessionStart(): void {
    const event: SessionStartEvent = {
      ...this.createBaseEvent(),
      type: "session_start",
      referrer: document.referrer,
      referrerDomain: document.referrer
        ? new URL(document.referrer).hostname
        : "",
      utmSource: this.getUtmParameter("utm_source"),
      utmMedium: this.getUtmParameter("utm_medium"),
      utmCampaign: this.getUtmParameter("utm_campaign"),
      trafficSource: this.determineTrafficSource(),
      landingPage: window.location.pathname + window.location.search,
      isMobile:
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        ),
      isTablet: /iPad|Android(?=.*\bMobile\b)|Tablet|PlayBook|Silk/i.test(
        navigator.userAgent,
      ),
      isDesktop:
        !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|iPad|Android(?=.*\bMobile\b)|Tablet|PlayBook|Silk/i.test(
          navigator.userAgent,
        ),
      isNewUser: !localStorage.getItem("indeks_last_visit"),
      isReturningUser: !!localStorage.getItem("indeks_last_visit"),
      daysSinceLastVisit: this.getDaysSinceLastVisit(),
    };

    localStorage.setItem("indeks_last_visit", Date.now().toString());
    this.logEvent(event);
  }

  private trackSessionEnd(): void {
    if (this.sessionEnded) return;
    this.sessionEnded = true;

    const sessionDuration = Date.now() - this.sessionStartTime;
    const activeTime = this.calculateActiveTime();
    const idleTime = sessionDuration - activeTime;

    const event: SessionEndEvent = {
      ...this.createBaseEvent(),
      type: "session_end",
      sessionDuration,
      activeTime,
      idleTime,
      pagesViewed: this.pageViews,
      totalClicks: this.totalClicks,
      totalScrolls: this.totalScrolls,
      exitPage: window.location.pathname + window.location.search,
      exitType:
        document.visibilityState === "hidden" ? "tab_close" : "navigation",
      converted: this.hasConversion(),
      bounce: this.pageViews === 1,
    };

    this.logEvent(event);
  }

  private getUtmParameter(param: string): string | undefined {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param) || undefined;
  }

  private determineTrafficSource():
    | "organic"
    | "direct"
    | "social"
    | "referral"
    | "paid"
    | "email"
    | "other" {
    const referrer = document.referrer;
    const urlParams = new URLSearchParams(window.location.search);

    if (!referrer && !urlParams.has("utm_source")) return "direct";

    if (urlParams.has("utm_source")) {
      const utmSource = urlParams.get("utm_source")?.toLowerCase();
      if (
        utmSource?.includes("google") ||
        utmSource?.includes("bing") ||
        utmSource?.includes("yahoo")
      )
        return "paid";
      if (
        utmSource?.includes("facebook") ||
        utmSource?.includes("twitter") ||
        utmSource?.includes("linkedin")
      )
        return "social";
      if (utmSource?.includes("email")) return "email";
      return "paid";
    }

    if (referrer) {
      const referrerDomain = new URL(referrer).hostname.toLowerCase();
      if (
        referrerDomain.includes("google.") ||
        referrerDomain.includes("bing.") ||
        referrerDomain.includes("yahoo.")
      )
        return "organic";
      if (
        referrerDomain.includes("facebook.") ||
        referrerDomain.includes("twitter.") ||
        referrerDomain.includes("linkedin.") ||
        referrerDomain.includes("instagram.")
      )
        return "social";
      return "referral";
    }

    return "other";
  }

  private getDaysSinceLastVisit(): number | undefined {
    const lastVisit = localStorage.getItem("indeks_last_visit");
    if (!lastVisit) return undefined;

    const lastVisitTime = parseInt(lastVisit);
    const now = Date.now();
    const diffMs = now - lastVisitTime;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  private calculateActiveTime(): number {
    // Simple heuristic: assume user is active if there was activity in the last 30 seconds
    // In a real implementation, you'd track active periods more precisely
    return Math.min(Date.now() - this.sessionStartTime, 30 * 60 * 1000); // Cap at 30 minutes for demo
  }

  private hasConversion(): boolean {
    // Check if any custom conversion events were tracked in this session
    return this.eventQueue.some(
      (event) =>
        event.type === "custom" &&
        (event as any).eventName?.includes("convert"),
    );
  }

  // Search Events
  private setupSearchTracking(): void {
    if (!this.config.captureSearchEvents) return;

    // Track search form submissions
    document.addEventListener("submit", (e) => {
      const form = e.target as HTMLFormElement;
      const searchInput = form.querySelector(
        'input[type="search"], input[name*="search"], input[name*="query"]',
      ) as HTMLInputElement;

      if (searchInput && searchInput.value.trim()) {
        this.trackSearch(searchInput.value.trim());
      }
    });

    // Track search button clicks
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const searchButton =
        target.matches('button[type="submit"]') ||
        target.matches('[data-action="search"]') ||
        target.closest('button[type="submit"]') ||
        target.closest('[data-action="search"]');

      if (searchButton) {
        const form = target.closest("form") as HTMLFormElement;
        const searchInput = form?.querySelector(
          'input[type="search"], input[name*="search"], input[name*="query"]',
        ) as HTMLInputElement;

        if (searchInput && searchInput.value.trim()) {
          this.trackSearch(searchInput.value.trim());
        }
      }
    });
  }

  private trackSearch(query: string): void {
    const event: SearchEvent = {
      ...this.createBaseEvent(),
      type: "search",
      query,
      resultsCount: this.getSearchResultsCount(),
      searchLocation: this.determineSearchLocation(),
      filtersApplied: this.getAppliedFilters(),
      sortBy: this.getSortBy(),
      resultsClicked: 0, // Would be tracked separately
      resultPositionClicked: [],
      timeToFirstClick: undefined,
      isRefinement: this.isSearchRefinement(),
      previousQuery: this.getPreviousQuery(),
      searchSource: this.getSearchSource(),
    };

    // Store current query for refinement tracking
    sessionStorage.setItem("indeks_last_search", query);
    this.logEvent(event);
  }

  private getSearchResultsCount(): number {
    // Try to find result count on search results pages
    const countSelectors = [
      ".results-count",
      ".search-results-count",
      "[data-results-count]",
      ".total-results",
    ];

    for (const selector of countSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const count = parseInt(element.textContent?.match(/\d+/)?.[0] || "0");
        if (count > 0) return count;
      }
    }

    // Count result items
    const resultItems = document.querySelectorAll(
      ".search-result, .result-item, .product-item, .item",
    );
    return resultItems.length;
  }

  private determineSearchLocation():
    | "header"
    | "sidebar"
    | "page"
    | "mobile"
    | "other" {
    if (window.innerWidth < 768) return "mobile";

    const searchForm = document.querySelector(
      'form:has(input[type="search"]), form:has(input[name*="search"])',
    );
    if (!searchForm) return "other";

    const rect = searchForm.getBoundingClientRect();
    if (rect.top < 100) return "header";
    if (rect.left < 100) return "sidebar";

    return "page";
  }

  private getAppliedFilters(): Record<string, string> | undefined {
    const filters: Record<string, string> = {};

    // Look for active filter elements
    document
      .querySelectorAll("[data-filter], .filter.active, .facet.active")
      .forEach((el) => {
        const key =
          el.getAttribute("data-filter") || el.getAttribute("data-facet");
        const value = el.getAttribute("data-value") || el.textContent?.trim();

        if (key && value) {
          filters[key] = value;
        }
      });

    return Object.keys(filters).length > 0 ? filters : undefined;
  }

  private getSortBy(): string | undefined {
    const sortSelectors = ['select[name*="sort"]', "[data-sort]", ".sort-by"];

    for (const selector of sortSelectors) {
      const element = document.querySelector(selector) as HTMLSelectElement;
      if (element) {
        return (
          element.value ||
          element.getAttribute("data-sort") ||
          element.textContent?.trim()
        );
      }
    }

    return undefined;
  }

  private isSearchRefinement(): boolean {
    return !!sessionStorage.getItem("indeks_last_search");
  }

  private getPreviousQuery(): string | undefined {
    return sessionStorage.getItem("indeks_last_search") || undefined;
  }

  private getSearchSource():
    | "direct"
    | "autocomplete"
    | "suggestion"
    | "voice" {
    // Check if search was triggered by autocomplete
    if (document.activeElement?.matches("[data-autocomplete]"))
      return "autocomplete";

    // Check for voice search indicators
    if (document.querySelector("[data-voice-search], .voice-search"))
      return "voice";

    // Check for search suggestions
    if (document.querySelector(".search-suggestions, .autocomplete"))
      return "suggestion";

    return "direct";
  }

  // Rage/Frustration Events
  private setupRageTracking(): void {
    if (!this.config.captureRageEvents) return;

    // Track rapid clicks (rage clicks)
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const selector = this.getElementSelector(target);

      const now = Date.now();
      const existing = this.clickCounts.get(selector);

      if (existing && now - existing.timestamp < 2000) {
        // Within 2 seconds
        existing.count++;
        if (existing.count >= 3) {
          // 3+ clicks in 2 seconds
          this.trackRageClick(target, existing.count);
          existing.count = 0; // Reset to avoid duplicate events
        }
      } else {
        this.clickCounts.set(selector, { count: 1, timestamp: now });
      }

      // Clean up old entries
      for (const [key, value] of this.clickCounts.entries()) {
        if (now - value.timestamp > 5000) {
          this.clickCounts.delete(key);
        }
      }
    });

    // Track dead clicks (clicks with no response)
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const selector = this.getElementSelector(target);

      // Check if element is interactive
      const isInteractive =
        target.matches(
          'button, a, input, select, textarea, [role="button"], [onclick], [data-action]',
        ) ||
        target.closest(
          'button, a, input, select, textarea, [role="button"], [onclick], [data-action]',
        );

      if (!isInteractive) {
        // Wait a bit to see if anything happens
        setTimeout(() => {
          if (!this.elementVisibility.has(selector)) {
            this.trackDeadClick(target);
          }
        }, 500);
      }
    });

    // Track error clicks (clicks that cause errors)
    let errorTimeout: number;
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;

      // Clear any existing timeout
      if (errorTimeout) clearTimeout(errorTimeout);

      // Set timeout to check for errors after click
      errorTimeout = window.setTimeout(() => {
        // Check if there are new error events in the queue
        const recentErrors = this.eventQueue.filter(
          (event) =>
            event.type === "error" && Date.now() - event.timestamp < 1000, // Within 1 second
        );

        if (recentErrors.length > 0) {
          this.trackErrorClick(target, recentErrors[0] as any);
        }
      }, 100);
    });
  }

  private trackRageClick(element: HTMLElement, clickCount: number): void {
    const selector = this.getElementSelector(element);
    const visibilityTime = this.elementVisibility.get(selector) || 0;

    const event: RageClickEvent = {
      ...this.createBaseEvent(),
      type: "rage_click",
      element: selector,
      clicksInTimeframe: clickCount,
      timeframe: 2,
      whyRage: this.determineRageReason(element),
      timeOnPage: Date.now() - this.pageLoadTime,
      userGaveUp: this.checkIfUserGaveUp(),
      elementVisibleTime: visibilityTime,
    };

    this.logEvent(event);
  }

  private trackDeadClick(element: HTMLElement): void {
    const selector = this.getElementSelector(element);
    const visibilityTime = this.elementVisibility.get(selector) || 0;

    const event: DeadClickEvent = {
      ...this.createBaseEvent(),
      type: "dead_click",
      element: selector,
      expectedBehavior: this.determineExpectedBehavior(element),
      actualBehavior: "none",
      elementVisibleTime: visibilityTime,
      previousClicksOnElement: this.getPreviousClicksOnElement(selector),
    };

    this.logEvent(event);
  }

  private trackErrorClick(element: HTMLElement, errorEvent: any): void {
    const event: ErrorClickEvent = {
      ...this.createBaseEvent(),
      type: "error_click",
      element: this.getElementSelector(element),
      errorMessage: errorEvent.error.message,
      errorType: this.categorizeError(errorEvent.error.message),
      userContinued: this.checkIfUserContinued(),
      timeToError: Date.now() - this.pageLoadTime,
    };

    this.logEvent(event);
  }

  private getElementSelector(element: HTMLElement): string {
    // Create a unique selector for the element
    const parts: string[] = [];

    if (element.id) {
      return `#${element.id}`;
    }

    const className = getClassName(element);

    if (className) {
      parts.push(
        element.tagName.toLowerCase() +
          "." +
          className.split(" ").filter(Boolean).join("."),
      );
    } else {
      parts.push(element.tagName.toLowerCase());
    }

    // Add nth-child if needed
    const siblings = Array.from(element.parentElement?.children || []);
    const index = siblings.indexOf(element);
    if (index > 0) {
      parts.push(`:nth-child(${index + 1})`);
    }

    return parts.join("");
  }

  private determineRageReason(
    element: HTMLElement,
  ): "button_disabled" | "loading" | "no_response" | "error" | "other" {
    if (
      (element as HTMLButtonElement).disabled ||
      element.getAttribute("aria-disabled") === "true"
    ) {
      return "button_disabled";
    }

    if (
      element.matches(".loading, [data-loading], .spinner") ||
      element.querySelector(".loading, .spinner, [data-loading]")
    ) {
      return "loading";
    }

    if (
      element.matches('[aria-invalid="true"]') ||
      element.closest('[aria-invalid="true"]')
    ) {
      return "error";
    }

    return "no_response";
  }

  private checkIfUserGaveUp(): boolean {
    // Check if user left the page or stopped interacting
    return document.visibilityState === "hidden";
  }

  private determineExpectedBehavior(
    element: HTMLElement,
  ): "navigate" | "submit" | "expand" | "close" | "other" {
    if (element.matches('a, [role="link"]')) return "navigate";
    if (
      element.matches(
        'button[type="submit"], input[type="submit"], [data-action="submit"]',
      )
    )
      return "submit";
    if (
      element.matches(".accordion, .collapse, [data-toggle], [aria-expanded]")
    )
      return "expand";
    if (element.matches('.close, [data-dismiss], [aria-label*="close"]'))
      return "close";

    return "other";
  }

  private getPreviousClicksOnElement(selector: string): number {
    const existing = this.clickCounts.get(selector);
    return existing ? existing.count : 0;
  }

  private categorizeError(
    message: string,
  ): "validation" | "network" | "javascript" | "timeout" | "other" {
    if (
      message.includes("validation") ||
      message.includes("required") ||
      message.includes("invalid")
    ) {
      return "validation";
    }
    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("404") ||
      message.includes("500")
    ) {
      return "network";
    }
    if (message.includes("timeout")) {
      return "timeout";
    }
    if (
      message.includes("undefined") ||
      message.includes("null") ||
      message.includes("TypeError")
    ) {
      return "javascript";
    }

    return "other";
  }

  private checkIfUserContinued(): boolean {
    // Check if user continued interacting after error
    return this.lastActivityTime > Date.now() - 5000; // Active in last 5 seconds
  }

  // Download Events
  private setupDownloadTracking(): void {
    if (!this.config.captureDownloadEvents) return;

    // Track download links
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const link = target.matches("a") ? target : target.closest("a");

      if (link) {
        const href = (link as HTMLAnchorElement).href;
        const isDownload =
          link.hasAttribute("download") ||
          href.match(
            /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|exe|dmg|pkg)$/i,
          ) ||
          href.includes("/download") ||
          href.includes("/file");

        if (isDownload) {
          this.trackFileDownload(link as HTMLAnchorElement);
        }
      }
    });
  }

  private trackFileDownload(link: HTMLAnchorElement): void {
    const url = new URL(link.href);
    const fileName =
      link.download || url.pathname.split("/").pop() || "unknown";
    const fileType = this.getFileType(fileName);

    const event: FileDownloadEvent = {
      ...this.createBaseEvent(),
      type: "file_download",
      fileName,
      fileType,
      fileSize: 0, // Would need HEAD request to get size
      downloadSource: this.determineDownloadSource(link),
      downloadUrl: link.href,
      timeOnPageBeforeDownload: Date.now() - this.pageLoadTime,
      downloadSpeed: undefined,
    };

    this.logEvent(event);
  }

  private getFileType(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      pdf: "pdf",
      doc: "word",
      docx: "word",
      xls: "excel",
      xlsx: "excel",
      ppt: "powerpoint",
      pptx: "powerpoint",
      zip: "archive",
      rar: "archive",
      exe: "executable",
      dmg: "disk_image",
      pkg: "installer",
    };

    return typeMap[ext || ""] || "other";
  }

  private determineDownloadSource(
    link: HTMLAnchorElement,
  ): "link" | "button" | "auto" | "programmatic" {
    if (link.closest("button")) return "button";
    if (link.hasAttribute("download")) return "link";
    if (link.href.includes("blob:") || link.href.includes("data:"))
      return "programmatic";

    return "auto";
  }

  // Print Events
  private setupPrintTracking(): void {
    if (!this.config.capturePrintEvents) return;

    // Track print attempts
    window.addEventListener("beforeprint", () => {
      const event: PrintEvent = {
        ...this.createBaseEvent(),
        type: "print",
        pagePrinted: window.location.pathname,
        timeOnPageBeforePrint: Date.now() - this.pageLoadTime,
        printTrigger: "menu",
        pagesPrinted: undefined,
      };

      this.logEvent(event);
    });

    // Also track print button clicks
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (
        target.matches('[onclick*="print"], [data-action="print"]') ||
        target.textContent?.toLowerCase().includes("print")
      ) {
        const event: PrintEvent = {
          ...this.createBaseEvent(),
          type: "print",
          pagePrinted: window.location.pathname,
          timeOnPageBeforePrint: Date.now() - this.pageLoadTime,
          printTrigger: "button",
          pagesPrinted: undefined,
        };

        this.logEvent(event);
      }
    });
  }

  // Share Events
  private setupShareTracking(): void {
    if (!this.config.captureShareEvents) return;

    // Track native share API
    if (navigator.share) {
      const originalShare = navigator.share;
      navigator.share = async (data) => {
        const event: ShareEvent = {
          ...this.createBaseEvent(),
          type: "share",
          shareMethod: "native_share",
          contentShared: data?.url || window.location.href,
          shareLocation: this.determineShareLocation(),
          shareText: data?.text,
          shareUrl: data?.url,
        };

        this.logEvent(event);
        return originalShare.call(navigator, data);
      };
    }

    // Track social share buttons
    const shareSelectors = [
      "[data-share]",
      ".share-button",
      ".social-share",
      '[href*="facebook.com/sharer"]',
      '[href*="twitter.com/share"]',
      '[href*="linkedin.com/sharing"]',
      '[href*="whatsapp.com"]',
    ];

    shareSelectors.forEach((selector) => {
      document.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target.matches(selector) || target.closest(selector)) {
          this.trackShare(target);
        }
      });
    });

    // Track copy link actions
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (
        target.matches('[data-action="copy-link"], .copy-link') ||
        target.textContent?.toLowerCase().includes("copy link")
      ) {
        const event: ShareEvent = {
          ...this.createBaseEvent(),
          type: "share",
          shareMethod: "copy_link",
          contentShared: window.location.href,
          shareLocation: this.determineShareLocation(),
        };

        this.logEvent(event);
      }
    });
  }

  private trackShare(element: HTMLElement): void {
    const shareMethod = this.determineShareMethod(element);
    const contentShared = this.getSharedContent(element);

    const event: ShareEvent = {
      ...this.createBaseEvent(),
      type: "share",
      shareMethod,
      contentShared,
      shareLocation: this.determineShareLocation(),
      shareText: this.getShareText(element),
      shareUrl: this.getShareUrl(element),
    };

    this.logEvent(event);
  }

  private determineShareMethod(
    element: HTMLElement,
  ):
    | "copy_link"
    | "email"
    | "facebook"
    | "twitter"
    | "linkedin"
    | "whatsapp"
    | "native_share"
    | "other" {
    const href = (element as HTMLAnchorElement).href || "";
    const className = getClassName(element);
    const text = element.textContent?.toLowerCase() || "";

    if (
      href.includes("facebook.com") ||
      className.includes("facebook") ||
      text.includes("facebook")
    )
      return "facebook";
    if (
      href.includes("twitter.com") ||
      className.includes("twitter") ||
      text.includes("twitter")
    )
      return "twitter";
    if (
      href.includes("linkedin.com") ||
      className.includes("linkedin") ||
      text.includes("linkedin")
    )
      return "linkedin";
    if (
      href.includes("whatsapp.com") ||
      className.includes("whatsapp") ||
      text.includes("whatsapp")
    )
      return "whatsapp";
    if (href.includes("mailto:") || text.includes("email")) return "email";
    if (text.includes("copy") || className.includes("copy")) return "copy_link";

    return "other";
  }

  private getSharedContent(element: HTMLElement): string {
    // Try to get content from data attributes or URL
    const dataUrl =
      element.getAttribute("data-url") ||
      element.getAttribute("data-share-url");
    if (dataUrl) return dataUrl;

    // Check if it's a product or article page
    const productId =
      element.getAttribute("data-product-id") ||
      element.getAttribute("data-product");
    if (productId) return productId;

    // Default to current page
    return window.location.href;
  }

  private determineShareLocation():
    | "product_page"
    | "article"
    | "cart"
    | "checkout"
    | "other" {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("/product") || path.includes("/item"))
      return "product_page";
    if (
      path.includes("/article") ||
      path.includes("/blog") ||
      path.includes("/post")
    )
      return "article";
    if (path.includes("/cart") || path.includes("/basket")) return "cart";
    if (path.includes("/checkout")) return "checkout";

    return "other";
  }

  private getShareText(element: HTMLElement): string | undefined {
    return (
      element.getAttribute("data-text") ||
      element.getAttribute("data-share-text") ||
      undefined
    );
  }

  private getShareUrl(element: HTMLElement): string | undefined {
    return (
      element.getAttribute("data-url") ||
      (element as HTMLAnchorElement).href ||
      undefined
    );
  }

  // NEW TRACKING METHODS
  private setupPageLeaveTracking(): void {
    if (!this.config.capturePageLeave) return;

    const trackPageLeave = () => {
      const timeOnPage = Date.now() - this.pageLoadTime;
      const maxScrollDepth = Math.max(...Array.from(this.scrollDepthReached), 0);
      
      const event: PageLeaveEvent = {
        ...this.createBaseEvent(),
        type: "pageleave",
        timeOnPage,
        scrollDepth: maxScrollDepth,
        clickCount: this.totalClicks,
        engaged: timeOnPage > 10000 && this.totalClicks > 2,
      };
      
      this.logEvent(event);
    };

    window.addEventListener("beforeunload", trackPageLeave);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        trackPageLeave();
      }
    });
  }

  private setupScrollDepthTracking(): void {
    if (!this.config.captureScrollDepth) return;

    const thresholds = this.config.scrollDepthThresholds || [25, 50, 75, 100];

    const checkScrollDepth = debounce(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight,
      );
      const viewportHeight = window.innerHeight;
      const scrollPercentage = Math.round(
        (scrollTop / (documentHeight - viewportHeight)) * 100,
      );

      for (const threshold of thresholds) {
        if (scrollPercentage >= threshold && !this.scrollDepthReached.has(threshold)) {
          this.scrollDepthReached.add(threshold);
          
          const event: ScrollDepthEvent = {
            ...this.createBaseEvent(),
            type: "scroll_depth",
            depth: threshold as 25 | 50 | 75 | 100,
            timeToDepth: Date.now() - this.pageLoadTime,
          };
          
          this.logEvent(event);
        }
      }
    }, this.config.debounceMs || 100);

    window.addEventListener("scroll", checkScrollDepth, { passive: true });
  }

  private setupFormAbandonTracking(): void {
    if (!this.config.captureFormAbandon) return;

    document.addEventListener("focusin", (e) => {
      const target = e.target as HTMLElement;
      if (!["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      
      const form = target.closest("form");
      if (!form) return;
      
      const formId = form.id || this.getElementSelector(form as HTMLElement);
      
      if (!this.formInteractions.has(formId)) {
        this.formInteractions.set(formId, {
          startTime: Date.now(),
          fields: new Set(),
          lastInteraction: Date.now(),
        });
      }
      
      const formData = this.formInteractions.get(formId)!;
      formData.fields.add((target as HTMLInputElement).name || target.id);
      formData.lastInteraction = Date.now();
    });

    document.addEventListener("submit", (e) => {
      const form = e.target as HTMLFormElement;
      const formId = form.id || this.getElementSelector(form as HTMLElement);
      this.formInteractions.delete(formId);
    });

    window.addEventListener("beforeunload", () => {
      for (const [formId, data] of this.formInteractions.entries()) {
        const timeSinceLastInteraction = Date.now() - data.lastInteraction;
        
        if (timeSinceLastInteraction > 5000 && data.fields.size > 0) {
          const form = document.getElementById(formId) || 
                        document.querySelector(`[data-form-id="${formId}"]`);
          
          const totalFields = form?.querySelectorAll("input, textarea, select").length || 0;
          
          const event: FormAbandonEvent = {
            ...this.createBaseEvent(),
            type: "form_abandon",
            formId,
            fieldsCompleted: data.fields.size,
            totalFields,
            timeSpent: Date.now() - data.startTime,
            lastField: Array.from(data.fields).pop() || "unknown",
          };
          
          this.logEvent(event);
        }
      }
    });
  }

  private setupFormErrorTracking(): void {
    if (!this.config.captureFormErrors) return;

    document.addEventListener("invalid", (e) => {
      const target = e.target as HTMLInputElement;
      const form = target.closest("form");
      if (!form) return;
      
      const formId = form.id || this.getElementSelector(form as HTMLElement);
      
      const event: FormErrorEvent = {
        ...this.createBaseEvent(),
        type: "form_error",
        formId,
        field: target.name || target.id,
        errorType: target.validity.valueMissing ? "required" : 
                  target.validity.typeMismatch ? "format" : "validation",
        errorMessage: target.validationMessage,
      };
      
      this.logEvent(event);
    }, true);
  }

  private setupIdleDetection(): void {
    if (!this.config.captureIdleEvents) return;

    const idleTimeout = this.config.idleTimeoutMs || 30000;

    const resetIdleTimer = () => {
      if (this.isIdle) {
        const event: IdleEvent = {
          ...this.createBaseEvent(),
          type: "idle_end",
          idleDuration: Date.now() - this.lastIdleCheck,
        };
        this.logEvent(event);
        this.isIdle = false;
      }
      
      this.lastIdleCheck = Date.now();
      
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
      }
      
      this.idleTimer = window.setTimeout(() => {
        if (!this.isIdle) {
          const event: IdleEvent = {
            ...this.createBaseEvent(),
            type: "idle_start",
          };
          this.logEvent(event);
          this.isIdle = true;
        }
      }, idleTimeout);
    };

    ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"].forEach((eventType) => {
      document.addEventListener(eventType, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();
  }

  private setupTabFocusTracking(): void {
    if (!this.config.captureTabFocus) return;

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.tabBlurTime = Date.now();
        const event: TabFocusEvent = {
          ...this.createBaseEvent(),
          type: "tab_blur",
        };
        this.logEvent(event);
      } else {
        const timeAway = this.tabBlurTime ? Date.now() - this.tabBlurTime : 0;
        const event: TabFocusEvent = {
          ...this.createBaseEvent(),
          type: "tab_focus",
          timeAway,
        };
        this.logEvent(event);
        this.tabBlurTime = null;
      }
    });
  }

  private setupPageLifecycleTracking(): void {
    if (!this.config.capturePageLifecycle) return;

    if ("onfreeze" in document) {
      document.addEventListener("freeze", () => {
        const event: PageLifecycleEvent = {
          ...this.createBaseEvent(),
          type: "page_freeze",
        };
        this.logEvent(event);
      });

      document.addEventListener("resume", () => {
        const event: PageLifecycleEvent = {
          ...this.createBaseEvent(),
          type: "page_resume",
        };
        this.logEvent(event);
      });
    }
  }

  private setupOutboundLinkTracking(): void {
    if (!this.config.captureOutboundLinks) return;

    document.addEventListener("click", (e) => {
      const link = (e.target as HTMLElement).closest("a") as HTMLAnchorElement;
      if (!link || !link.href) return;

      try {
        const linkUrl = new URL(link.href);
        const currentUrl = new URL(window.location.href);

        if (linkUrl.hostname !== currentUrl.hostname) {
          const event: OutboundLinkEvent = {
            ...this.createBaseEvent(),
            type: "outbound_link",
            url: link.href,
            domain: linkUrl.hostname,
            linkText: link.textContent?.trim() || "",
            openInNewTab: link.target === "_blank",
          };
          this.logEvent(event);
        }
      } catch (error) {
        // Invalid URL, skip
      }
    }, true);
  }

  private setupResourceErrorTracking(): void {
    if (!this.config.captureResourceErrors) return;

    window.addEventListener("error", (e) => {
      if (e.target !== window && e.target) {
        const target = e.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        
        let resourceType: "img" | "script" | "style" | "font" | "other" = "other";
        let resourceUrl = "";
        
        if (tagName === "img") {
          resourceType = "img";
          resourceUrl = (target as HTMLImageElement).src;
        } else if (tagName === "script") {
          resourceType = "script";
          resourceUrl = (target as HTMLScriptElement).src;
        } else if (tagName === "link") {
          const link = target as HTMLLinkElement;
          if (link.rel === "stylesheet") {
            resourceType = "style";
            resourceUrl = link.href;
          }
        }
        
        if (resourceUrl) {
          const event: ResourceErrorEvent = {
            ...this.createBaseEvent(),
            type: "resource_error",
            resourceType,
            resourceUrl,
            errorMessage: `Failed to load ${resourceType}: ${resourceUrl}`,
          };
          this.logEvent(event);
        }
      }
    }, true);
  }

  private setupMediaProgressTracking(): void {
    if (!this.config.captureMediaProgress) return;

    const thresholds = [25, 50, 75, 100];

    const trackProgress = (media: HTMLMediaElement, type: "video_progress" | "audio_progress") => {
      const mediaId = media.src || media.currentSrc;
      if (!this.mediaProgress.has(mediaId)) {
        this.mediaProgress.set(mediaId, new Set());
      }
      
      const progress = this.mediaProgress.get(mediaId)!;
      const currentProgress = Math.round((media.currentTime / media.duration) * 100);
      
      for (const threshold of thresholds) {
        if (currentProgress >= threshold && !progress.has(threshold)) {
          progress.add(threshold);
          
          const event: MediaProgressEvent = {
            ...this.createBaseEvent(),
            type,
            progress: threshold as 25 | 50 | 75 | 100,
            currentTime: media.currentTime,
            duration: media.duration,
            mediaUrl: mediaId,
          };
          
          this.logEvent(event);
        }
      }
    };

    document.addEventListener("timeupdate", (e) => {
      const target = e.target as HTMLMediaElement;
      if (target.tagName === "VIDEO") {
        trackProgress(target, "video_progress");
      } else if (target.tagName === "AUDIO") {
        trackProgress(target, "audio_progress");
      }
    }, true);
  }

  private setupOrientationChangeTracking(): void {
    if (!this.config.captureOrientationChange) return;

    window.addEventListener("orientationchange", () => {
      const orientation = window.innerWidth > window.innerHeight ? "landscape" : "portrait";
      const angle = window.orientation || 0;
      
      const event: OrientationChangeEvent = {
        ...this.createBaseEvent(),
        type: "orientation_change",
        orientation,
        angle,
      };
      
      this.logEvent(event);
    });
  }

  private setupNetworkChangeTracking(): void {
    if (!this.config.captureNetworkChange) return;

    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      
      connection.addEventListener("change", () => {
        const event: NetworkChangeEvent = {
          ...this.createBaseEvent(),
          type: "network_change",
          effectiveType: connection.effectiveType || "unknown",
          downlink: connection.downlink,
          rtt: connection.rtt,
        };
        
        this.logEvent(event);
      });
    }
  }

  private setupPerformanceTracking(): void {
    if (!this.config.capturePerformanceMetrics) return;

    try {
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") {
            const event: PerformanceEvent = {
              ...this.createBaseEvent(),
              type: "first_contentful_paint",
              value: entry.startTime,
              rating: entry.startTime < 1800 ? "good" : 
                     entry.startTime < 3000 ? "needs-improvement" : "poor",
            };
            this.logEvent(event);
            fcpObserver.disconnect();
          }
        }
      });
      fcpObserver.observe({ type: "paint", buffered: true });

      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        const event: PerformanceEvent = {
          ...this.createBaseEvent(),
          type: "largest_contentful_paint",
          value: lastEntry.startTime,
          rating: lastEntry.startTime < 2500 ? "good" : 
                 lastEntry.startTime < 4000 ? "needs-improvement" : "poor",
        };
        this.logEvent(event);
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as any;
          const event: PerformanceEvent = {
            ...this.createBaseEvent(),
            type: "first_input_delay",
            value: fidEntry.processingStart - fidEntry.startTime,
            rating: fidEntry.processingStart - fidEntry.startTime < 100 ? "good" : 
                   fidEntry.processingStart - fidEntry.startTime < 300 ? "needs-improvement" : "poor",
          };
          this.logEvent(event);
          fidObserver.disconnect();
        }
      });
      fidObserver.observe({ type: "first-input", buffered: true });

      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as any;
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value;
          }
        }
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          const event: PerformanceEvent = {
            ...this.createBaseEvent(),
            type: "cumulative_layout_shift",
            value: clsValue,
            rating: clsValue < 0.1 ? "good" : 
                   clsValue < 0.25 ? "needs-improvement" : "poor",
          };
          this.logEvent(event);
        }
      });

      window.addEventListener("load", () => {
        const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        if (navigation) {
          const ttfb = navigation.responseStart - navigation.requestStart;
          const event: PerformanceEvent = {
            ...this.createBaseEvent(),
            type: "time_to_first_byte",
            value: ttfb,
            rating: ttfb < 800 ? "good" : 
                   ttfb < 1800 ? "needs-improvement" : "poor",
          };
          this.logEvent(event);
        }
      });
    } catch (error) {
      this.logger.warn("Performance tracking not supported:", error);
    }
  }

  public async init(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn("Tracker already initialized");
      return;
    }

    if (typeof window === "undefined") {
      this.logger.warn("Cannot initialize in non-browser environment");
      return;
    }

    // Ensure userId is initialized before starting tracking
    if (!this.userId) {
      await this.initializeUserId();
    }

    // Basic events
    this.setupClickTracking();
    this.setupScrollTracking();
    this.setupPageViewTracking();
    this.setupFormTracking();
    this.setupKeystrokeTracking();
    this.setupMouseMovementTracking();
    this.setupResizeTracking();
    this.setupErrorTracking();

    // Navigation & Page Events
    this.setupBeforeUnloadTracking();
    this.setupVisibilityChangeTracking();
    this.setupWindowFocusTracking();
    this.setupHashChangeTracking();
    this.setupPopStateTracking();

    // Mouse & Touch Events
    this.setupMouseHoverTracking();
    this.setupContextMenuTracking();
    this.setupDoubleClickTracking();
    this.setupMousePressTracking();
    this.setupMouseWheelTracking();
    this.setupTouchTracking();
    this.setupDragDropTracking();

    // Input & Form Events
    this.setupInputChangeTracking();
    this.setupFieldFocusTracking();
    this.setupClipboardTracking();
    this.setupTextSelectionTracking();

    // Media Events
    this.setupMediaTracking();

    // Network & Performance Events
    this.setupNetworkStatusTracking();
    this.setupPageLoadTracking();

    // UI Interaction Events
    this.setupFullscreenChangeTracking();

    // New Advanced Events
    this.setupSessionTracking();
    this.setupSearchTracking();
    this.setupRageTracking();
    this.setupDownloadTracking();
    this.setupPrintTracking();
    this.setupShareTracking();

    // NEW: Additional Advanced Events
    this.setupPageLeaveTracking();
    this.setupScrollDepthTracking();
    this.setupFormAbandonTracking();
    this.setupFormErrorTracking();
    this.setupIdleDetection();
    this.setupTabFocusTracking();
    this.setupPageLifecycleTracking();
    this.setupOutboundLinkTracking();
    this.setupResourceErrorTracking();
    this.setupMediaProgressTracking();
    this.setupOrientationChangeTracking();
    this.setupNetworkChangeTracking();
    this.setupPerformanceTracking();

    this.isInitialized = true;

    // Set up automatic batch flushing every 5 seconds
    this.autoFlushInterval = window.setInterval(() => {
      this.analytics.flush().catch((error) => {
        this.logger.warn("Auto-flush failed:", error);
      });
    }, 5000);

    this.logger.info(
      "🚀 Tracker initialized successfully with all advanced events",
    );
  }

  public getEvents(): IndeksEvent[] {
    return [...this.eventQueue];
  }

  public clearEvents(): void {
    this.eventQueue = [];
    this.logger.info("🧹 Event queue cleared");
  }

  public updateConfig(newConfig: Partial<IndeksConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.setConsoleEnabled(this.config.enableConsoleLogging !== false);
    this.logger.info("⚙️ Config updated", this.config);
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getUserId(): string | null {
    return this.userId;
  }

  public destroy(): void {
    // Flush any remaining events before destroying
    this.analytics.flush().catch(console.error);
    
    // Clear auto-flush interval
    if (this.autoFlushInterval) {
      clearInterval(this.autoFlushInterval);
      this.autoFlushInterval = null;
    }
    
    this.clearEvents();
    this.analytics.clearBatch();
    this.isInitialized = false;
    this.logger.info("💀 Tracker destroyed");
  }

  /**
   * Manually flush all pending events to the analytics API
   */
  public async flush(): Promise<void> {
    await this.analytics.flush();
    this.logger.info("📤 Manually flushed events");
  }

  /**
   * Get the current batch size (events waiting to be sent)
   */
  public getBatchSize(): number {
    return this.analytics.getBatchSize();
  }

  /**
   * Manually track events based on a schema definition
   * @param schema - Schema defining what elements to track and how
   */
  public track(schema: ManualTrackingSchema): void {
    if (!this.isInitialized) {
      this.logger.warn("Tracker not initialized. Call init() first.");
      return;
    }

    // Set up event listeners for each selector
    schema.selectors.forEach((selector: string) => {
      const eventType = schema.eventType || "click";

      document.addEventListener(eventType, (e) => {
        const target = e.target as HTMLElement;
        if (target.matches(selector) || target.closest(selector)) {
          const event: CustomEvent = {
            ...this.createBaseEvent(),
            type: "custom",
            eventName: schema.eventName || `manual_${eventType}`,
            properties: {
              ...schema.properties,
              selector,
              element: this.getElementInfo(target),
            },
            category: schema.category,
            value: schema.value,
            label: schema.label,
          };

          this.logEvent(event);
        }
      });
    });

    this.logger.info(
      `📋 Set up manual tracking for selectors: ${schema.selectors.join(", ")}`,
    );
  }
}

export default IndeksTracker;
