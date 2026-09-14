import { assertEquals } from "@std/assert";
import { DEFAULT_SETTINGS, SettingsStore } from "../../../src/core/storage/settings.ts";

Deno.test("unit: SettingsStore initializes with DEFAULT_SETTINGS baseline", () => {
    // Arrange & Act
    const store = new SettingsStore();

    // Assert
    assertEquals(store.settings, DEFAULT_SETTINGS);
});

Deno.test("unit: SettingsStore updates in-memory settings state on update", async () => {
    // Arrange
    const store = new SettingsStore();

    // Act
    const updated = await store.update({ fullWidth: false, widthPercent: 80 });

    // Assert
    assertEquals(updated.fullWidth, false);
});

Deno.test("unit: SettingsStore dispatches change notification to active subscribers", async () => {
    // Arrange
    const store = new SettingsStore();
    const notifications: unknown[] = [];
    const unsub = store.subscribe((s) => {
        notifications.push({ ...s });
    });

    try {
        // Act
        await store.update({ fullWidth: false, widthPercent: 80 });

        // Assert
        assertEquals(notifications.length, 1);
    } finally {
        unsub();
    }
});

Deno.test("unit: SettingsStore stops notifying subscriber after unsubscribe", async () => {
    // Arrange
    const store = new SettingsStore();
    const notifications: unknown[] = [];
    const unsub = store.subscribe((s) => {
        notifications.push({ ...s });
    });
    await store.update({ fullWidth: false });

    // Act
    unsub();
    await store.update({ hudCollapsed: false });

    // Assert
    assertEquals(notifications.length, 1);
});

Deno.test("unit: SettingsStore reset restores settings to DEFAULT_SETTINGS", () => {
    // Arrange
    const store = new SettingsStore({ fullWidth: false, widthPercent: 100 });

    // Act
    store.reset();

    // Assert
    assertEquals(store.settings, { ...DEFAULT_SETTINGS });
});

Deno.test("unit: SettingsStore load hydrates settings from browser.storage.local", async () => {
    // Arrange
    const mockStorage: Record<string, unknown> = {
        fullWidth: false,
        widthPercent: 90,
        hudCollapsed: true,
        autoRenderOrg: false,
        hudPosition: { x: 120, y: 240 },
    };

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

        // Act
        const loaded = await store.load();

        // Assert
        assertEquals(loaded.widthPercent, 90);
    } finally {
        delete (globalThis as unknown as { browser?: unknown }).browser;
    }
});

Deno.test("unit: SettingsStore update persists modified values to browser.storage.local", async () => {
    // Arrange
    const mockStorage: Record<string, unknown> = {
        widthPercent: 90,
    };

    (globalThis as unknown as { browser: unknown }).browser = {
        storage: {
            local: {
                get: () => Promise.resolve({ ...mockStorage }),
                set: (items: Record<string, unknown>) => {
                    Object.assign(mockStorage, items);
                    return Promise.resolve();
                },
            },
        },
    };

    try {
        const store = new SettingsStore();
        await store.load();

        // Act
        await store.update({ widthPercent: 100 });

        // Assert
        assertEquals(mockStorage.widthPercent, 100);
    } finally {
        delete (globalThis as unknown as { browser?: unknown }).browser;
    }
});
