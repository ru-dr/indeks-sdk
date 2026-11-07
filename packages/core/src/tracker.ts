import {
  BATCH_CONFIG,
  COLLECTOR_NAMES,
  Logger,
  LogLevel,
  PRIVACY_SENSITIVE_COLLECTORS,
  STORAGE_KEYS,
  generateUuid,
  getDeviceInfo,
  resolveConfig,
  sanitizeEventData,
  scrubUrl,
  validateConfig,
  validateEventData,
} from "@useindeks/shared";
import type {
  CollectorName,
  DeviceData,
  IndeksConfig,
  IndeksCustomEvent,
  IndeksEvent,
  IndeksIdentifyEvent,
  ManualTrackingSchema,
  PrivacyConfig,
  ResolvedConfig,
} from "@useindeks/shared";
import { IndeksAnalytics } from "./analytics";
import { COLLECTORS } from "./collectors";
import { emitPageView } from "./collectors/navigation";
import type { CollectorContext, CollectorState, EventFields, SessionHooks } from "./context";
import { getElementInfo, normalizeText, storageGet, storageSet, toElement } from "./dom";
import { Hub } from "./hub";
import type { Disposer } from "./hub";
import { Lifecycle, PageState } from "./lifecycle";
import { SessionManager } from "./session";

const MAX_PENDING_CALLS = 100;
const MAX_NAME_LENGTH = 200;
const MAX_EXTERNAL_ID_LENGTH = 256;
const PRIVACY_KEYS = [
  "elementText",
  "formValues",
  "clipboardText",
  "searchTerms",
  "fingerprint",
] as const satisfies ReadonlyArray<keyof PrivacyConfig>;

export interface TrackOptions {
  category?: string;
  value?: number;
  label?: string;
}

const noop: Disposer = () => undefined;

function collectorOrder(): CollectorName[] {
  return [...COLLECTOR_NAMES].sort((a, b) => Number(b === "session") - Number(a === "session"));
}

class IndeksTracker {
  private config: ResolvedConfig;
  private readonly logger: Logger;
  private readonly analytics: IndeksAnalytics;
  private readonly initialPrivacy: Required<PrivacyConfig>;
  private readonly hub = new Hub();
  private readonly session = new SessionManager();
  private readonly pageState = new PageState();
  private readonly lifecycle: Lifecycle;
  private readonly state: CollectorState = { lastError: null, printHint: null };
  private readonly sessionHooks: SessionHooks = {};
  private readonly context: CollectorContext;

  private userId: string;
  private externalUserId: string | null;
  private device: DeviceData | null = null;
  private eventQueue: IndeksEvent[] = [];
  private pending: Array<() => void> = [];
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;
  private active = false;
  private accepting = true;
  private generation = 0;
  private rotatingSession = false;

  constructor(config: IndeksConfig) {
    const errors = validateConfig(config);
    if (errors.length) {
      throw new Error(`Indeks: invalid configuration - ${errors.join("; ")}`);
    }
    this.config = resolveConfig(config);
    this.initialPrivacy = { ...this.config.privacy };
    this.logger = new Logger({ enableConsole: this.config.debug, level: LogLevel.INFO });
    this.analytics = new IndeksAnalytics(this.config);
    this.userId = this.resolveUserId();
    this.externalUserId = storageGet("localStorage", STORAGE_KEYS.EXTERNAL_ID);
    this.lifecycle = new Lifecycle(
      this.hub,
      this.session,
      this.pageState,
      () => this.config.idleTimeoutMs,
      () => this.config.debounceMs,
    );
    this.context = this.createContext();

    if (this.config.localOnly) {
      this.logger.info("Local only mode: events are tracked but not sent");
    }
  }

  private createContext(): CollectorContext {
    const context = {
      logger: this.logger,
      hub: this.hub,
      lifecycle: this.lifecycle,
      page: this.pageState,
      session: this.session,
      state: this.state,
      sessionHooks: this.sessionHooks,
      on: ((...args: Parameters<Hub["on"]>) => this.hub.on(...args)) as Hub["on"],
      later: (handler, delay) => this.hub.later(handler, delay),
      debounced: (handler) => this.hub.debounced(handler, this.config.debounceMs),
      throttled: (handler, interval) => this.hub.throttled(handler, interval),
      emit: (fields) => this.emit(fields),
      captureText: () => this.config.privacy.elementText,
    } as CollectorContext;
    Object.defineProperties(context, {
      config: { get: () => this.config, enumerable: true },
      device: { get: () => this.device ?? getDeviceInfo(), enumerable: true },
    });
    return context;
  }

  private resolveUserId(): string {
    try {
      const existing = localStorage.getItem(STORAGE_KEYS.USER_ID);
      if (existing) return existing;
      const created = generateUuid();
      localStorage.setItem(STORAGE_KEYS.USER_ID, created);
      return created;
    } catch {
      return generateUuid();
    }
  }

  private async useFingerprint(): Promise<void> {
    try {
      const { Thumbmark } = await import("@thumbmarkjs/thumbmarkjs");
      const result = await new Thumbmark({ logging: false }).get();
      if (result.thumbmark) this.userId = result.thumbmark;
    } catch (error) {
      this.logger.warn("Failed to generate fingerprint, keeping first-party userId:", error);
    }
  }

  private hasOptedOut(): boolean {
    if (storageGet("localStorage", STORAGE_KEYS.OPT_OUT) === "1") return true;
    if (!this.config.privacy.respectDoNotTrack) return false;
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
  }

  private emit<E extends IndeksEvent>(fields: EventFields<E>, at?: number): void {
    if (!this.active) return;
    this.rotateSessionIfExpired();
    const referrer = scrubUrl(document.referrer) || undefined;
    const event = {
      timestamp: at ?? Date.now(),
      url: scrubUrl(window.location.href) || window.location.pathname,
      userAgent: navigator.userAgent,
      sessionId: this.session.id,
      userId: this.userId,
      externalUserId: this.externalUserId ?? undefined,
      referrer,
      ...fields,
    } as unknown as IndeksEvent;

    if (!validateEventData(event)) {
      this.logger.warn(`Dropping malformed event: ${event?.type || "unknown"}`);
      return;
    }
    if (event.type === "custom" && event.eventName.includes("convert")) {
      this.session.markConverted();
    }
    this.eventQueue.push(event);
    if (this.eventQueue.length > BATCH_CONFIG.MAX_EVENT_QUEUE_SIZE) this.eventQueue.shift();
    this.session.touch();
    this.logger.info(`Event: ${event.type}`, event);
    this.analytics.batch([event]).catch((error) => {
      this.logger.warn("Failed to queue event for sending:", error);
    });
  }

  private rotateSessionIfExpired(): void {
    if (this.rotatingSession || !this.session.isExpired()) return;
    this.rotatingSession = true;
    try {
      this.sessionHooks.end?.("timeout");
      this.session.restart();
      this.pageState.reset();
      this.sessionHooks.start?.();
    } finally {
      this.rotatingSession = false;
    }
  }

  private whenReady(action: (calledAt: number) => Disposer | void): Disposer {
    const calledAt = Date.now();
    if (this.isInitialized) return action(calledAt) ?? noop;
    if (!this.accepting || this.pending.length >= MAX_PENDING_CALLS) return noop;
    let cancelled = false;
    let inner: Disposer | void;
    this.pending.push(() => {
      if (!cancelled) inner = action(calledAt);
    });
    return () => {
      cancelled = true;
      inner?.();
    };
  }

  public init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.accepting = true;
    const promise: Promise<void> = this.runInit(this.generation).then(
      (started) => {
        if (!started && this.initPromise === promise) this.initPromise = null;
      },
      (error) => {
        if (this.initPromise === promise) this.initPromise = null;
        throw error;
      },
    );
    this.initPromise = promise;
    return promise;
  }

  private async runInit(generation: number): Promise<boolean> {
    if (typeof window === "undefined") {
      this.logger.warn("Cannot initialize in non-browser environment");
      return false;
    }
    await Promise.resolve();
    if (generation !== this.generation) return false;
    if (this.hasOptedOut()) {
      this.logger.info(
        "Tracking disabled: opt-out, Do Not Track or Global Privacy Control is active",
      );
      this.pending = [];
      this.accepting = false;
      return false;
    }
    if (this.config.privacy.fingerprint) {
      await this.useFingerprint();
      if (generation !== this.generation) return false;
    }
    try {
      this.device = getDeviceInfo();
    } catch (error) {
      this.logger.warn("Failed to read device info:", error);
    }

    this.active = true;
    this.analytics.open();
    this.lifecycle.start();
    this.session.addPageView();
    this.lifecycle.onNavigation(() => this.session.addPageView());

    for (const name of collectorOrder()) {
      if (!this.config.collectors[name]) continue;
      try {
        COLLECTORS[name](this.context);
      } catch (error) {
        this.logger.warn(`Collector "${name}" failed to start:`, error);
      }
    }
    this.lifecycle.onExit(() => this.analytics.flushSync());
    this.watchOptOut();

    await this.analytics.restorePersisted().catch((error) => {
      this.logger.warn("Failed to restore offline buffer:", error);
    });
    if (generation !== this.generation) return false;
    while (this.pending.length) {
      const batch = this.pending;
      this.pending = [];
      for (const action of batch) action();
    }
    this.isInitialized = true;
    this.logger.info("Tracker initialized");
    return true;
  }

  private watchOptOut(): void {
    this.hub.on(window, "storage", (event) => {
      if (event.key === STORAGE_KEYS.OPT_OUT && event.newValue === "1") void this.applyOptOut();
    });
    const recheck = () => {
      if (this.hasOptedOut()) void this.applyOptOut();
    };
    this.hub.on(window, "pageshow", recheck);
    this.hub.on(document, "visibilitychange", () => {
      if (document.visibilityState === "visible") recheck();
    });
  }

  public track(
    name: string,
    properties: Record<string, unknown> = {},
    options: TrackOptions = {},
  ): void {
    this.whenReady((at) => {
      this.emit<IndeksCustomEvent>(
        {
          type: "custom",
          eventName: normalizeText(name, MAX_NAME_LENGTH),
          properties: sanitizeEventData(properties),
          category: options.category ? normalizeText(options.category, MAX_NAME_LENGTH) : undefined,
          label: options.label ? normalizeText(options.label, MAX_NAME_LENGTH) : undefined,
          value: Number.isFinite(options.value) ? options.value : undefined,
        },
        at,
      );
    });
  }

  public trackElements(schema: ManualTrackingSchema): Disposer {
    return this.whenReady(() => {
      const eventType = schema.eventType || "click";
      return this.hub.on(document, eventType, (e: Event) => {
        const target = toElement(e.target);
        if (!target) return;
        for (const selector of schema.selectors) {
          const match = target.closest(selector);
          if (!match) continue;
          this.emit<IndeksCustomEvent>({
            type: "custom",
            eventName: normalizeText(schema.eventName || `manual_${eventType}`, MAX_NAME_LENGTH),
            properties: {
              ...schema.properties,
              selector,
              element: getElementInfo(match, this.config.privacy.elementText),
            },
            category: schema.category ? normalizeText(schema.category, MAX_NAME_LENGTH) : undefined,
            value: Number.isFinite(schema.value) ? schema.value : undefined,
            label: schema.label ? normalizeText(schema.label, MAX_NAME_LENGTH) : undefined,
          });
          return;
        }
      });
    });
  }

  public page(name?: string, properties?: Record<string, unknown>): void {
    this.whenReady(() => {
      if (!this.config.collectors.pageview) this.session.addPageView();
      emitPageView(this.context, {
        name: name ? normalizeText(name, MAX_NAME_LENGTH) : undefined,
        properties: properties ? sanitizeEventData(properties) : undefined,
      });
    });
  }

  public identify(id: string, traits: Record<string, unknown> = {}): void {
    if (!id || typeof id !== "string") {
      this.logger.warn("identify() requires a non-empty string id");
      return;
    }
    if (this.hasOptedOut()) {
      this.logger.info("identify() ignored: tracking is opted out");
      return;
    }
    const externalId = id.slice(0, MAX_EXTERNAL_ID_LENGTH);
    this.externalUserId = externalId;
    storageSet("localStorage", STORAGE_KEYS.EXTERNAL_ID, externalId);
    this.whenReady((at) => {
      this.emit<IndeksIdentifyEvent>({ type: "identify", traits: sanitizeEventData(traits) }, at);
    });
  }

  public reset(): void {
    this.sessionHooks.end?.("reset");
    this.externalUserId = null;
    try {
      localStorage.removeItem(STORAGE_KEYS.EXTERNAL_ID);
      localStorage.removeItem(STORAGE_KEYS.USER_ID);
      sessionStorage.removeItem(STORAGE_KEYS.LAST_SEARCH);
    } catch {
      this.logger.debug("Could not clear stored identity");
    }
    this.userId = this.resolveUserId();
    this.session.restart();
    this.pageState.reset();
    if (this.active) this.session.addPageView();
    this.sessionHooks.start?.();
  }

  private clearStoredData(): void {
    for (const key of [
      STORAGE_KEYS.EVENTS,
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.EXTERNAL_ID,
      STORAGE_KEYS.LAST_VISIT,
    ]) {
      try {
        localStorage.removeItem(key);
      } catch {
        this.logger.debug(`Could not clear ${key}`);
      }
    }
    for (const key of [STORAGE_KEYS.SESSION_ID, STORAGE_KEYS.LAST_SEARCH]) {
      try {
        sessionStorage.removeItem(key);
      } catch {
        this.logger.debug(`Could not clear ${key}`);
      }
    }
  }

  private async applyOptOut(): Promise<void> {
    this.analytics.discard();
    this.teardown();
    this.externalUserId = null;
    this.clearStoredData();
  }

  public async optOut(): Promise<void> {
    storageSet("localStorage", STORAGE_KEYS.OPT_OUT, "1");
    await this.applyOptOut();
  }

  public async optIn(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEYS.OPT_OUT);
    } catch {
      this.logger.debug("Could not clear opt-out flag");
    }
    this.userId = this.resolveUserId();
    this.externalUserId = null;
    this.session.restart();
    await this.init();
  }

  public isOptedOut(): boolean {
    return this.hasOptedOut();
  }

  public updateConfig(update: Partial<IndeksConfig>): void {
    if (update.collectors) {
      const blocked = Object.entries(update.collectors).filter(
        ([name, enabled]) =>
          enabled === true && (PRIVACY_SENSITIVE_COLLECTORS as readonly string[]).includes(name),
      );
      if (blocked.length) {
        this.logger.warn("Privacy-sensitive collectors cannot be enabled at runtime");
      }
      this.logger.warn("Collector changes take effect on the next tracker instance");
    }
    for (const key of PRIVACY_KEYS) {
      const next = update.privacy?.[key];
      if (next === undefined) continue;
      if (next === true && this.initialPrivacy[key] !== true) {
        this.logger.warn(
          `Refusing to enable privacy.${key} at runtime: privacy can only become stricter.`,
        );
        continue;
      }
      this.config = { ...this.config, privacy: { ...this.config.privacy, [key]: next } };
    }
    if (update.privacy?.respectDoNotTrack === true) {
      this.config = {
        ...this.config,
        privacy: { ...this.config.privacy, respectDoNotTrack: true },
      };
    }
    if (update.debug !== undefined) {
      this.config = { ...this.config, debug: update.debug };
      this.logger.setConsoleEnabled(update.debug);
    }
  }

  public getEvents(): IndeksEvent[] {
    return [...this.eventQueue];
  }

  public clearEvents(): void {
    this.eventQueue = [];
  }

  public getSessionId(): string {
    return this.session.id;
  }

  public getUserId(): string | null {
    return this.userId;
  }

  public getExternalUserId(): string | null {
    return this.externalUserId;
  }

  public getDeviceInfo(): DeviceData | null {
    return this.device;
  }

  public async flush(): Promise<void> {
    await this.analytics.flush();
  }

  public getBatchSize(): number {
    return this.analytics.getBatchSize();
  }

  private teardown(): void {
    this.generation++;
    this.accepting = false;
    this.active = false;
    this.initPromise = null;
    this.hub.dispose();
    this.lifecycle.stop();
    this.eventQueue = [];
    this.pending = [];
    this.state.lastError = null;
    this.state.printHint = null;
    this.sessionHooks.start = undefined;
    this.sessionHooks.end = undefined;
    this.pageState.previousUrl = null;
    this.pageState.reset();
    this.isInitialized = false;
  }

  public async destroy(): Promise<void> {
    if (this.active) this.session.touch(true);
    this.analytics.close();
    this.teardown();
  }
}

export default IndeksTracker;
