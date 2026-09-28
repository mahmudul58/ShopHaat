export function createCachedFetcher(fetchFn, ttlMs = 5000) {
  let cache = null;
  let cacheTime = 0;
  let activeRequest = null;

  return async function (...args) {
    const now = Date.now();

    if (cache && now - cacheTime < ttlMs) {
      return cache;
    }

    if (activeRequest) {
      return activeRequest;
    }

    activeRequest = fetchFn(...args)
      .then((data) => {
        cache = data;
        cacheTime = Date.now();
        activeRequest = null;
        return data;
      })
      .catch((err) => {
        activeRequest = null;
        throw err;
      });

    return activeRequest;
  };
}
