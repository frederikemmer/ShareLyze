/** Debounces edits and serializes writes so older requests cannot overwrite newer ones. */
export function createAutosave<T>(
  save: (value: T) => Promise<void>,
  onSaved: (value: T) => void,
  onError: (error: unknown) => void,
  delay = 350,
) {
  let revision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queue = Promise.resolve();
  const cancel = () => { revision++; clearTimeout(timer); };
  return {
    cancel,
    schedule(value: T) {
      cancel();
      const current = revision;
      timer = setTimeout(() => {
        queue = queue.then(async () => {
          if (current !== revision) return;
          try {
            await save(value);
            if (current === revision) onSaved(value);
          } catch (error) {
            if (current === revision) onError(error);
          }
        });
      }, delay);
    },
  };
}
