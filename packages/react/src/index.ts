// Context and Provider
export { IndeksProvider, useIndeksContext } from './context/IndeksContext';
export type { IndeksProviderProps } from './context/IndeksContext';

// Hooks
export * from './hooks';

// Components
export * from './components';

// Re-export core types
export type {
  IndeksConfig,
  IndeksEvent,
  ClickEvent,
  ScrollEvent,
  PageViewEvent,
  FormSubmitEvent,
  KeystrokeEvent,
  MouseMoveEvent,
  ResizeEvent,
  ErrorEvent,
} from '@indeks/shared';

export { IndeksTracker } from '@indeks/core';
