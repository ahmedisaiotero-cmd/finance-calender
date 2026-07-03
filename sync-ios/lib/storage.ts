import AsyncStorage from "@react-native-async-storage/async-storage";

const memory = new Map<string, string>();
let ready = false;

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function installPolyfill(store: StorageLike) {
  const globalObject = globalThis as unknown as {
    localStorage?: StorageLike;
    window?: { localStorage?: StorageLike };
  };

  globalObject.localStorage = store;
  globalObject.window = globalObject.window ?? {};
  globalObject.window.localStorage = store;
}

export async function initSyncStorage(): Promise<void> {
  if (ready) return;

  const keys = await AsyncStorage.getAllKeys();
  const pairs = await Promise.all(
    keys.map(async (key) => [key, await AsyncStorage.getItem(key)] as const),
  );
  for (const [key, value] of pairs) {
    if (key && value != null) {
      memory.set(key, value);
    }
  }

  installPolyfill({
    getItem(key) {
      return memory.get(key) ?? null;
    },
    setItem(key, value) {
      memory.set(key, value);
      void AsyncStorage.setItem(key, value);
    },
    removeItem(key) {
      memory.delete(key);
      void AsyncStorage.removeItem(key);
    },
  });

  ready = true;
}

export function isStorageReady() {
  return ready;
}
