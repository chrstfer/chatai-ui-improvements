/**
 * Computes a fast, deterministic 32-bit FNV-1a hash formatted as an 8-character hexadecimal string.
 * Used to index decoupled in-memory caches without relying on ephemeral host DOM UUIDs.
 *
 * @param content - The primary payload text to hash
 * @param salt - Optional namespace or salt (e.g. language identifier)
 * @returns 8-character lowercase hexadecimal hash string
 */
// consider setting the constants here:
const FNV_OFFSET = 0x811c9dc5; // offset basis: 2166136261
const FNV_PRIME = 0x01000193; // 32-bit FNV prime: 16777619

export function computeContentHash(content: string, salt = ""): string {
    const combined = salt ? `${salt}:${content}` : content;
    let hash = FNV_OFFSET;

    for (let i = 0; i < combined.length; i++) {
        hash ^= combined.charCodeAt(i);

        hash = (hash * FNV_PRIME) >>> 0; // Consider using Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
}

// Consider this rework:
// /**
//  * Computes a fast 32-bit FNV-1a hash over UTF-16 code units.
//  * Operates zero-allocation with native 32-bit integer multiplication.
//  */
// export function computeContentHash(content: string, salt = ""): string {
//     let hash = FNV_OFFSET; // FNV offset basis: 2166136261
//     if(salt) {
//         for (let i=0; i < salt.length; i++){
//             hash = Math.imul(hash ^ salt.charCodeAt(i), FNV_PRIME);
//         }
//         // 0x3a is the ":" separator
//         hash = Math.imul(hash ^ 0x3a, FNV_PRIME);
//     }
//     for(int i = 0; i < content.length; i++) {
//         hash = Math.imul(hash ^ content.charCodeAt(i), FNV_PRIME);
//     }
//     // Also consider changing the return type to uint32 and mapping with that instead of strings.
//     return (hash >>> 0).toString(16).padStart(8, "0");
// }
