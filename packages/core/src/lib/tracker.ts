import FingerprintJS from "@fingerprintjs/fingerprintjs";
import {
  generateId,
  debounce,
  DEFAULT_CONFIG,
  Logger,
  LogLevel,
} from "@indeks/shared";
import type { IndeksConfig } from "@/types";
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
  BeforeUnloadEvent,
  VisibilityChangeEvent,
  WindowFocusEvent,
  HashChangeEvent,
  PopStateEvent,
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
  // Media Events
  MediaEvent,
  // Network & Performance Events
  NetworkStatusEvent,
  PageLoadEvent,
  // UI Interaction Events
  FullscreenChangeEvent,
} from "@/types";

class IndeksTracker {
  private config: IndeksConfig;
  private sessionId: string;
  private userId: string | null = null;
  private eventQueue: IndeksEvent[] = [];
  private isInitialized: boolean = false;
  private pageLoadTime: number = Date.now();
  private logger: Logger;

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
    this.validateApiKey();
  }

  private validateApiKey(): void {
    if (!this.config.apiKey || this.config.apiKey.trim() === "") {
      throw new Error(
        "Indeks: API key is required. Please provide a valid API key.",
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
    return {
      type: "",
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      userId: this.userId || "initializing",
    };
  }

  private logEvent(event: IndeksEvent): void {
    this.eventQueue.push(event);

    this.logger.info(`📊 Event: ${event.type}`, {
      event,
      queueLength: this.eventQueue.length,
    });
  }

  private getElementInfo(element: Element) {
    const attributes: Record<string, string> = {};
    Array.from(element.attributes).forEach((attr) => {
      attributes[attr.name] = attr.value;
    });

    return {
      tagName: element.tagName.toLowerCase(),
      className: element.className || "",
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
      const event: PageViewEvent = {
        ...this.createBaseEvent(),
        type: "pageview",
        title: document.title,
        referrer: document.referrer,
      };
      this.logEvent(event);
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
          className: form.className || "",
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
          className: target.className || "",
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
      const event: MouseHoverEvent = {
        ...this.createBaseEvent(),
        type: "mouseenter",
        element: {
          tagName: (e.target as Element).tagName.toLowerCase(),
          className: (e.target as Element).className || "",
          id: (e.target as Element).id || "",
        },
        coordinates: {
          x: e.pageX,
          y: e.pageY,
        },
      };
      this.logEvent(event);
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const event: MouseHoverEvent = {
        ...this.createBaseEvent(),
        type: "mouseleave",
        element: {
          tagName: (e.target as Element).tagName.toLowerCase(),
          className: (e.target as Element).className || "",
          id: (e.target as Element).id || "",
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
      const event: MousePressEvent = {
        ...this.createBaseEvent(),
        type: "mousedown",
        button: e.button,
        buttons: e.buttons,
        element: {
          tagName: (e.target as Element).tagName.toLowerCase(),
          className: (e.target as Element).className || "",
          id: (e.target as Element).id || "",
        },
        coordinates: {
          x: e.pageX,
          y: e.pageY,
        },
      };
      this.logEvent(event);
    });

    document.addEventListener("mouseup", (e) => {
      const event: MousePressEvent = {
        ...this.createBaseEvent(),
        type: "mouseup",
        button: e.button,
        buttons: e.buttons,
        element: {
          tagName: (e.target as Element).tagName.toLowerCase(),
          className: (e.target as Element).className || "",
          id: (e.target as Element).id || "",
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

        const event: TouchEvent = {
          ...this.createBaseEvent(),
          type: eventType,
          touches,
          element: {
            tagName: (e.target as Element).tagName.toLowerCase(),
            className: (e.target as Element).className || "",
            id: (e.target as Element).id || "",
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
            tagName: (e.target as Element).tagName.toLowerCase(),
            className: (e.target as Element).className || "",
            id: (e.target as Element).id || "",
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
            className: target.className || "",
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
            className: target.className || "",
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
            className: target.className || "",
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

      const event: TextSelectionEvent = {
        ...this.createBaseEvent(),
        type: "selectionchange",
        selectedText: selection.toString().substring(0, 200),
        selectionStart: selection.anchorOffset,
        selectionEnd: selection.focusOffset,
        element: selection.anchorNode?.parentElement
          ? {
              tagName: selection.anchorNode.parentElement.tagName.toLowerCase(),
              className: selection.anchorNode.parentElement.className || "",
              id: selection.anchorNode.parentElement.id || "",
              type: (selection.anchorNode.parentElement as HTMLInputElement)
                .type,
              name: (selection.anchorNode.parentElement as HTMLInputElement)
                .name,
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
              className: target.className || "",
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
              className: document.fullscreenElement.className || "",
              id: document.fullscreenElement.id || "",
            }
          : undefined,
      };
      this.logEvent(event);
    });
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

    this.isInitialized = true;

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
    // Remove all event listeners would require more complex cleanup
    // For now, just clear the queue and mark as not initialized
    this.clearEvents();
    this.isInitialized = false;
    this.logger.info("💀 Tracker destroyed");
  }
}

export default IndeksTracker;
