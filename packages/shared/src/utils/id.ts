function getCrypto(): Crypto | undefined {
  return typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;
}

function randomSuffix(): string {
  const cryptoObj = getCrypto();
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID().replace(/-/g, "").substring(0, 13);
  }
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(8);
    cryptoObj.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(36).padStart(2, "0"))
      .join("")
      .substring(0, 13);
  }
  return Math.random().toString(36).substring(2, 15);
}

export function generateId(prefix: string = ""): string {
  const id = `${Date.now()}_${randomSuffix()}`;
  return prefix ? `${prefix}_${id}` : id;
}

export function generateUuid(): string {
  const cryptoObj = getCrypto();
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return generateId("indeks");
}
