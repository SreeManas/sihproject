workerRef.current = new Worker(
    new URL("../workers/nlpWorker.js", import.meta.url)
  );
  