import { useSyncExternalStore } from "react";

// `useEffect` is not invoked during server rendering, meaning
// we can use this to determine if we're on the server or not.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return useSyncExternalStore<S | C>(
    () => () => undefined,
    () => client,
    () => server,
  );
}
