import { STORAGE_KEYS, sanitizeUserInput } from "@useindeks/shared";
import type { IndeksSearchEvent } from "@useindeks/shared";
import type { Collector, CollectorContext } from "../context";

type SearchSettings = CollectorContext["config"]["collectorOptions"]["search"];
import { isMasked, normalizeText, storageGet, storageSet, toElement } from "../dom";

const DEDUPE_WINDOW_MS = 500;
function resultsCount(options: SearchSettings): number {
  const text = document.querySelector(options.resultsCountSelector)?.textContent;
  const count = parseInt(text?.match(/\d+/)?.[0] || "0", 10);
  if (count > 0) return count;
  return document.querySelectorAll(options.resultItemSelector).length;
}

function searchLocation(): IndeksSearchEvent["searchLocation"] {
  if (window.innerWidth < 768) return "mobile";
  let form: Element | null;
  try {
    form = document.querySelector(
      'form:has(input[type="search"]), form:has(input[name*="search"])',
    );
  } catch {
    return "other";
  }
  if (!form) return "other";
  const rect = form.getBoundingClientRect();
  if (rect.top < 100) return "header";
  return rect.left < 100 ? "sidebar" : "page";
}

function appliedFilters(ctx: CollectorContext): Record<string, string> | undefined {
  if (!ctx.captureText()) return undefined;
  const filters: Record<string, string> = {};
  document.querySelectorAll("[data-filter], .filter.active, .facet.active").forEach((el) => {
    if (isMasked(el)) return;
    const key = el.getAttribute("data-filter") || el.getAttribute("data-facet");
    const value = el.getAttribute("data-value") || el.textContent?.trim();
    if (key && value) filters[key] = normalizeText(value);
  });
  return Object.keys(filters).length ? filters : undefined;
}

function sortBy(ctx: CollectorContext): string | undefined {
  if (!ctx.captureText()) return undefined;
  for (const selector of ['select[name*="sort"]', "[data-sort]", ".sort-by"]) {
    const element = document.querySelector<HTMLSelectElement>(selector);
    if (element && !isMasked(element)) {
      const raw = element.value || element.getAttribute("data-sort") || element.textContent?.trim();
      return normalizeText(raw) || undefined;
    }
  }
  return undefined;
}

function searchSource(): NonNullable<IndeksSearchEvent["searchSource"]> {
  if (document.activeElement?.matches("[data-autocomplete]")) return "autocomplete";
  if (document.querySelector("[data-voice-search], .voice-search")) return "voice";
  if (document.querySelector(".search-suggestions, .autocomplete")) return "suggestion";
  return "direct";
}

function emitSearch(
  ctx: CollectorContext,
  query: string,
  last: { query: string; at: number } | null,
) {
  const captureTerms = ctx.config.privacy.searchTerms;
  const previous = storageGet("sessionStorage", STORAGE_KEYS.LAST_SEARCH);
  ctx.emit<IndeksSearchEvent>({
    type: "search",
    query: captureTerms ? normalizeText(sanitizeUserInput(query)) : undefined,
    queryLength: query.length,
    resultsCount: resultsCount(ctx.config.collectorOptions.search),
    searchLocation: searchLocation(),
    filtersApplied: appliedFilters(ctx),
    sortBy: sortBy(ctx),
    resultsClicked: 0,
    isRefinement: previous !== null && last !== undefined,
    previousQuery: captureTerms ? (previous ?? undefined) : undefined,
    searchSource: searchSource(),
  });
  storageSet(
    "sessionStorage",
    STORAGE_KEYS.LAST_SEARCH,
    captureTerms ? query : String(query.length),
  );
}

export const search: Collector = (ctx) => {
  let last: { query: string; at: number } | null = null;
  const track = (query: string) => {
    const now = Date.now();
    if (last?.query === query && now - last.at < DEDUPE_WINDOW_MS) return;
    const previous = last;
    last = { query, at: now };
    emitSearch(ctx, query, previous);
  };
  ctx.on(document, "submit", (e) => {
    const form = toElement(e.target) as HTMLFormElement | null;
    const input = form?.querySelector<HTMLInputElement>(
      ctx.config.collectorOptions.search.inputSelector,
    );
    if (input?.value.trim()) track(input.value.trim());
  });
  ctx.on(document, "click", (e) => {
    const trigger = toElement(e.target)?.closest('[data-action="search"]');
    if (!trigger || trigger.closest("form")) return;
    const scope = trigger.closest("[data-search-scope]") ?? document;
    const input = scope.querySelector<HTMLInputElement>(
      ctx.config.collectorOptions.search.inputSelector,
    );
    if (input?.value.trim()) track(input.value.trim());
  });
};
