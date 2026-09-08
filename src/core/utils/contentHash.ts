const FNV_OFFSET = 0x811c9dc5; // 32-bit FNV offset basis: 2166136261
const FNV_PRIME = 0x01000193; // 32-bit FNV prime: 16777619
const COLON_CODE = 0x3a; // ASCII code for ":" separator

/**
 * Computes a fast, deterministic 32-bit FNV-1a hash over UTF-16 code units.
 * Operates with zero memory allocation using native 32-bit integer multiplication (Math.imul).
 *
 * @param content - The primary payload text to hash
 * @param salt - Optional namespace or salt (e.g. language identifier)
 * @returns 32-bit unsigned integer (uint32)
 */
export function computeContentHash(content: string, salt = ""): number {
    let hash = FNV_OFFSET;

    if (salt) {
        for (let i = 0; i < salt.length; i++) {
            hash = Math.imul(hash ^ salt.charCodeAt(i), FNV_PRIME);
        }
        hash = Math.imul(hash ^ COLON_CODE, FNV_PRIME);
    }

    for (let i = 0; i < content.length; i++) {
        hash = Math.imul(hash ^ content.charCodeAt(i), FNV_PRIME);
    }

    return hash >>> 0;
}

/**
 * Formats a 32-bit unsigned integer hash as an 8-character lowercase hexadecimal string.
 *
 * @param hash - 32-bit unsigned integer hash
 * @returns 8-character lowercase hexadecimal string
 */
export function formatHashHex(hash: number): string {
    return (hash >>> 0).toString(16).padStart(8, "0");
}
