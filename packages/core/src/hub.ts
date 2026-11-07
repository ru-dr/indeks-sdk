import { debounce } from "@indeks/shared";

export type Disposer = () => void;

interface Registration {
  target: EventTarget;
  type: string;
  handler: EventListener;
  options?: boolean | AddEventListenerOptions;
}

export class Hub {
  private registrations: Registration[] = [];
  private timeouts = new Set<number>();
  private cancellers: Array<() => void> = [];
  private observers: Array<{ disconnect(): void }> = [];

  on<K extends keyof DocumentEventMap>(
    target: Document,
    type: K,
    handler: (ev: DocumentEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): Disposer;
  on<K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    handler: (ev: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): Disposer;
  on(
    target: EventTarget,
    type: string,
    handler: (ev: Event) => void,
    options?: boolean | AddEventListenerOptions,
  ): Disposer;
  on(
    target: EventTarget,
    type: string,
    handler: (ev: never) => void,
    options?: boolean | AddEventListenerOptions,
  ): Disposer {
    const listener = handler as unknown as EventListener;
    target.addEventListener(type, listener, options);
    const registration = { target, type, handler: listener, options };
    this.registrations.push(registration);
    return () => {
      target.removeEventListener(type, listener, options);
      this.registrations = this.registrations.filter((r) => r !== registration);
    };
  }

  later(handler: () => void, delay: number): number {
    const id = window.setTimeout(() => {
      this.timeouts.delete(id);
      handler();
    }, delay);
    this.timeouts.add(id);
    return id;
  }

  cancel(id: number | null): void {
    if (id === null) return;
    clearTimeout(id);
    this.timeouts.delete(id);
  }

  debounced<T extends (...args: never[]) => void>(handler: T, delay: number) {
    const wrapped = debounce(handler, delay);
    this.cancellers.push(wrapped.cancel);
    return wrapped;
  }

  observe<T extends { disconnect(): void }>(observer: T): T {
    this.observers.push(observer);
    return observer;
  }

  release(observer: { disconnect(): void }): void {
    observer.disconnect();
    this.observers = this.observers.filter((item) => item !== observer);
  }

  dispose(): void {
    for (const cancel of this.cancellers) cancel();
    for (const id of this.timeouts) clearTimeout(id);
    for (const { target, type, handler, options } of this.registrations) {
      target.removeEventListener(type, handler, options);
    }
    for (const observer of this.observers) {
      try {
        observer.disconnect();
      } catch {
        continue;
      }
    }
    this.cancellers = [];
    this.timeouts.clear();
    this.registrations = [];
    this.observers = [];
  }
}
