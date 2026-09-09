import { assertEquals } from "@std/assert";
import { DEFAULT_SETTINGS, SettingsStore } from "../../../src/core/storage/settings.ts";

Deno.test("SettingsStore: initializes with DEFAULT_SETTINGS", () => {
    const store = new SettingsStore();
    assertEquals(store.settings.fullWidth, true);
    assertEquals(store.settings.widthPercent, 94);
    assertEquals(store.settings.hudCollapsed, false);
    assertEquals(store.settings.autoRenderOrg, true);
});

Deno.test("SettingsStore: updates in-memory settings and notifies subscribers", async () => {
    const store = new SettingsStore();
    const notifications: unknown[] = [];

    const unsub = store.subscribe((s) => {
        notifications.push({ ...s });
    });

    const updated = await store.update({ fullWidth: false, widthPercent: 80 });
    assertEquals(updated.fullWidth, false);
    assertEquals(updated.widthPercent, 80);
    assertEquals(store.settings.fullWidth, false);
    assertEquals(store.settings.widthPercent, 80);

    assertEquals(notifications.length, 1);
    assertEquals(notifications[0], {
        fullWidth: false,
        widthPercent: 80,
        hudCollapsed: false,
        autoRenderOrg: true,
    });

    unsub();

    await store.update({ hudCollapsed: true });
    assertEquals(notifications.length, 1); // Not notified after unsubscribe
    assertEquals(store.settings.hudCollapsed, true);
});

Deno.test("SettingsStore: resets to defaults", () => {
    const store = new SettingsStore({ fullWidth: false, widthPercent: 100 });
    assertEquals(store.settings.fullWidth, false);
    assertEquals(store.settings.widthPercent, 100);

    store.reset();
    assertEquals(store.settings, { ...DEFAULT_SETTINGS });
});

Deno.test("SettingsStore: loads from browser.storage.local when available", async () => {
    const mockStorage: Record<string, unknown> = {
        fullWidth: false,
        widthPercent: 90,
        hudCollapsed: true,
        autoRenderOrg: false,
        hudPosition: { x: 120, y: 240 },
    };

    // Temporarily mock global browser
    (globalThis as unknown as { browser: unknown }).browser = {
        storage: {
            local: {
                get: (keys: string[]) => {
                    const res: Record<string, unknown> = {};
                    for (const k of keys) {
                        if (k in mockStorage) res[k] = mockStorage[k];
                    }
                    return Promise.resolve(res);
                },
                set: (items: Record<string, unknown>) => {
                    Object.assign(mockStorage, items);
                    return Promise.resolve();
                },
            },
        },
    };

    try {
        const store = new SettingsStore();
        const loaded = await store.load();

        assertEquals(loaded.fullWidth, false);
        assertEquals(loaded.widthPercent, 90);
        assertEquals(loaded.hudCollapsed, true);
        assertEquals(loaded.autoRenderOrg, false);
        assertEquals(loaded.hudPosition, { x: 120, y: 240 });

        await store.update({ widthPercent: 100 });
        assertEquals(mockStorage.widthPercent, 100);
    } finally {
        delete (globalThis as unknown as { browser?: unknown }).browser;
    }
});
