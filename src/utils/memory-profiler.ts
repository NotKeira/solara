/**
 * Memory profiling utilities for debugging memory usage
 */

export function getDetailedMemoryUsage() {
  const usage = process.memoryUsage();
  const formatMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

  return {
    rss: `${formatMB(usage.rss)}MB`, // Resident Set Size - physical memory used
    heapTotal: `${formatMB(usage.heapTotal)}MB`, // Total heap allocated
    heapUsed: `${formatMB(usage.heapUsed)}MB`, // Heap actually used
    external: `${formatMB(usage.external)}MB`, // External memory (C++ objects)
    arrayBuffers: `${formatMB(usage.arrayBuffers)}MB`, // ArrayBuffer memory

    // Calculated values
    heapFree: `${formatMB(usage.heapTotal - usage.heapUsed)}MB`,
    nonHeapMemory: `${formatMB(usage.rss - usage.heapTotal)}MB`,
  };
}

export function logMemoryUsage(label: string = "Memory Usage") {
  const usage = getDetailedMemoryUsage();
  console.log(`\n=== ${label} ===`);
  console.log(`RSS (Physical Memory): ${usage.rss}`);
  console.log(`Heap Total: ${usage.heapTotal}`);
  console.log(`Heap Used: ${usage.heapUsed}`);
  console.log(`Heap Free: ${usage.heapFree}`);
  console.log(`External (C++ Objects): ${usage.external}`);
  console.log(`ArrayBuffers: ${usage.arrayBuffers}`);
  console.log(`Non-Heap Memory: ${usage.nonHeapMemory}`);
  console.log("========================\n");
}

export function startMemoryMonitoring(intervalMs: number = 30000) {
  console.log(`Starting memory monitoring every ${intervalMs}ms`);

  setInterval(() => {
    const usage = getDetailedMemoryUsage();
    console.log(
      `[MEMORY] RSS: ${usage.rss} | Heap: ${usage.heapUsed}/${usage.heapTotal} | External: ${usage.external}`
    );
  }, intervalMs);
}

// Memory leak detection
export function checkForMemoryLeaks() {
  const initialUsage = process.memoryUsage();

  return {
    start: () => {
      const currentUsage = process.memoryUsage();
      const diff = {
        rss: (currentUsage.rss - initialUsage.rss) / 1024 / 1024,
        heapUsed: (currentUsage.heapUsed - initialUsage.heapUsed) / 1024 / 1024,
        external: (currentUsage.external - initialUsage.external) / 1024 / 1024,
      };

      console.log("Memory change since start:");
      console.log(`RSS: ${diff.rss > 0 ? "+" : ""}${diff.rss.toFixed(2)}MB`);
      console.log(
        `Heap: ${diff.heapUsed > 0 ? "+" : ""}${diff.heapUsed.toFixed(2)}MB`
      );
      console.log(
        `External: ${diff.external > 0 ? "+" : ""}${diff.external.toFixed(2)}MB`
      );
    },
  };
}

// Force garbage collection and report memory freed
export function forceGarbageCollection() {
  const beforeGC = process.memoryUsage();

  if (global.gc) {
    global.gc();
    const afterGC = process.memoryUsage();

    const freed = {
      heapUsed: ((beforeGC.heapUsed - afterGC.heapUsed) / 1024 / 1024).toFixed(
        2
      ),
      rss: ((beforeGC.rss - afterGC.rss) / 1024 / 1024).toFixed(2),
    };

    console.log(
      `[GC] Freed ${freed.heapUsed}MB from heap, ${freed.rss}MB from RSS`
    );
    return freed;
  } else {
    console.log("[GC] Garbage collection not exposed. Use --expose-gc flag.");
    return null;
  }
}
