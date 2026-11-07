export interface Debounced<T extends (...args: never[]) => void> {
  (...args: Parameters<T>): void;
  cancel(): void;
}

export function debounce<T extends (...args: never[]) => void>(
  func: T,
  delay: number,
): Debounced<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      func(...args);
    }, delay);
  }) as Debounced<T>;
  debounced.cancel = () => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    timeoutId = undefined;
  };
  return debounced;
}
