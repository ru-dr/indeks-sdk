import type { CollectorName } from "@useindeks/shared";
import type { Collector } from "../context";
import {
  click,
  contextMenu,
  doubleClick,
  dragDrop,
  hover,
  keystroke,
  mouseMove,
  mousePress,
  touch,
  wheel,
} from "./interaction";
import { fullscreen, idle, orientation, resize, scroll, scrollDepth } from "./engagement";
import {
  beforeUnload,
  hashChange,
  pageLeave,
  pageLifecycle,
  pageLoad,
  pageview,
  popState,
  tabFocus,
  visibility,
  windowFocus,
} from "./navigation";
import {
  clipboard,
  fieldFocus,
  formAbandon,
  formError,
  formSubmit,
  inputChange,
  textSelection,
} from "./forms";
import { session } from "./session";
import { frustration } from "./frustration";
import { download, outboundLink, print, share } from "./links";
import { search } from "./search";
import { media, mediaProgress } from "./media";
import { error, networkChange, networkStatus, resourceError } from "./network";
import { performanceMetrics } from "./performance";

export const COLLECTORS: Record<CollectorName, Collector> = {
  click,
  doubleClick,
  contextMenu,
  mousePress,
  hover,
  mouseMove,
  wheel,
  touch,
  dragDrop,
  keystroke,
  scroll,
  scrollDepth,
  resize,
  fullscreen,
  orientation,
  idle,
  pageview,
  pageLoad,
  pageLeave,
  pageLifecycle,
  beforeUnload,
  hashChange,
  popState,
  visibility,
  windowFocus,
  tabFocus,
  session,
  formSubmit,
  inputChange,
  fieldFocus,
  formAbandon,
  formError,
  clipboard,
  textSelection,
  search,
  frustration,
  download,
  outboundLink,
  print,
  share,
  media,
  mediaProgress,
  error,
  resourceError,
  networkStatus,
  networkChange,
  performance: performanceMetrics,
};
