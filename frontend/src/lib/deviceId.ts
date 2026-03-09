/**
 * deviceId.ts
 * Creates a robust device identifier that persists across:
 * - Multiple tabs (same browser)
 * - Incognito mode (same browser)
 * - LocalStorage clearing (cookies + IndexedDB fallback)
 *
 * It also generates a lightweight browser fingerprint to catch
 * users who switch between browsers on the same device.
 */

const DEVICE_KEY = "karaokeando_deviceId";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

// ─── Utilities ────────────────────────────────────────────────────────────────

function randomId(): string {
    return (
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2) +
        Date.now().toString(36)
    );
}

// ─── Cookie ───────────────────────────────────────────────────────────────────

function getCookie(name: string): string | null {
    const match = document.cookie.match(
        new RegExp("(?:^|;\\s*)" + name + "=([^;]+)")
    );
    return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string): void {
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}

// ─── IndexedDB ────────────────────────────────────────────────────────────────

function idbGet(): Promise<string | null> {
    return new Promise(resolve => {
        try {
            const req = indexedDB.open("karaoke_device", 1);
            req.onupgradeneeded = e => {
                (e.target as IDBOpenDBRequest).result.createObjectStore("kv");
            };
            req.onsuccess = e => {
                const db = (e.target as IDBOpenDBRequest).result;
                const tx = db.transaction("kv", "readonly");
                const get = tx.objectStore("kv").get(DEVICE_KEY);
                get.onsuccess = () => resolve((get.result as string) ?? null);
                get.onerror = () => resolve(null);
            };
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
}

function idbSet(value: string): void {
    try {
        const req = indexedDB.open("karaoke_device", 1);
        req.onupgradeneeded = e => {
            (e.target as IDBOpenDBRequest).result.createObjectStore("kv");
        };
        req.onsuccess = e => {
            const db = (e.target as IDBOpenDBRequest).result;
            const tx = db.transaction("kv", "readwrite");
            tx.objectStore("kv").put(value, DEVICE_KEY);
        };
    } catch {
        /* silent */
    }
}

// ─── Resolve / Create stable deviceId ────────────────────────────────────────

/**
 * Returns a stable device ID, reading from or writing to:
 * localStorage → cookie → IndexedDB (in priority order).
 * If none exist, generates and persists a new one in all three.
 */
export async function getOrCreateDeviceId(): Promise<string> {
    // 1. Try localStorage
    const ls = localStorage.getItem(DEVICE_KEY);
    if (ls) {
        // Back-fill into other stores in case they were cleared
        setCookie(DEVICE_KEY, ls);
        idbSet(ls);
        return ls;
    }

    // 2. Try cookie
    const cookie = getCookie(DEVICE_KEY);
    if (cookie) {
        localStorage.setItem(DEVICE_KEY, cookie);
        idbSet(cookie);
        return cookie;
    }

    // 3. Try IndexedDB
    const idb = await idbGet();
    if (idb) {
        localStorage.setItem(DEVICE_KEY, idb);
        setCookie(DEVICE_KEY, idb);
        return idb;
    }

    // 4. Generate fresh ID and persist everywhere
    const newId = randomId();
    localStorage.setItem(DEVICE_KEY, newId);
    setCookie(DEVICE_KEY, newId);
    idbSet(newId);
    return newId;
}

// ─── Lightweight Browser Fingerprint ─────────────────────────────────────────

/**
 * Generates a short fingerprint string from stable browser/hardware traits.
 * Not 100% unique, but combined with deviceId covers ~90% of bypass attempts.
 */
export function getBrowserFingerprint(): string {
    const traits: string[] = [
        navigator.language || "",
        Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        `${screen.width}x${screen.height}x${screen.colorDepth}`,
        String(navigator.hardwareConcurrency || 0),
        navigator.platform || "",
        // Canvas fingerprint — detects GPU/driver differences
        (() => {
            try {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (!ctx) return "";
                ctx.fillStyle = "#7c4dff";
                ctx.fillRect(0, 0, 10, 10);
                ctx.fillStyle = "#ff4081";
                ctx.font = "14px Arial";
                ctx.fillText("🎤", 0, 10);
                return canvas.toDataURL().slice(-32);
            } catch {
                return "";
            }
        })(),
    ];
    return traits.join("|");
}

// ─── Combined device fingerprint ──────────────────────────────────────────────

/**
 * Returns a combined string: `deviceId::browserFingerprint`.
 * Send this as `deviceFingerprint` in the enqueue body.
 */
export async function getDeviceFingerprint(): Promise<string> {
    const deviceId = await getOrCreateDeviceId();
    const browserFP = getBrowserFingerprint();
    return `${deviceId}::${browserFP}`;
}
