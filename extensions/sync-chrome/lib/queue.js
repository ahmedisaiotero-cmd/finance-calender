(() => {
  const QUEUE_KEY = "syncCaptureQueue";

  async function readQueue() {
    const stored = await chrome.storage.local.get(QUEUE_KEY);
    return Array.isArray(stored[QUEUE_KEY]) ? stored[QUEUE_KEY] : [];
  }

  async function writeQueue(queue) {
    await chrome.storage.local.set({ [QUEUE_KEY]: queue });
    return queue;
  }

  async function enqueue(item) {
    const queue = await readQueue();
    queue.push(item);
    return writeQueue(queue);
  }

  async function clearQueue() {
    return writeQueue([]);
  }

  async function removeItem(id) {
    const queue = await readQueue();
    return writeQueue(queue.filter((item) => item.id !== id));
  }

  async function markAttempt(id, lastError) {
    const queue = await readQueue();
    return writeQueue(
      queue.map((item) =>
        item.id === id
          ? {
              ...item,
              attempts: (item.attempts ?? 0) + 1,
              lastError: lastError ?? null,
            }
          : item,
      ),
    );
  }

  const api = { readQueue, writeQueue, enqueue, clearQueue, removeItem, markAttempt };
  globalThis.SyncCaptureQueue = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
