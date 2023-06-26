import {
  StateCreator,
  StoreMutatorIdentifier,
  Mutate,
  StoreApi,
} from "zustand";

type Write<T extends object, U extends object> = Omit<T, keyof U> & U;

type StoreSubscribeInternal<T> = {
  subscribeInternal: (fn: (state: T, prevState: T) => void) => () => void;
  atomic: <T>(fn: () => T) => T;
};

type WithSubscribeInternal<S> = S extends { getState: () => infer T }
  ? Write<S, StoreSubscribeInternal<T>>
  : never;

const id = "dhmk/zustand-subscribe-internal";

declare module "zustand/vanilla" {
  interface StoreMutators<S, A> {
    [id]: WithSubscribeInternal<S>;
  }
}

type SubscribeInternal = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  initializer: StateCreator<T, [...Mps, [typeof id, never]], Mcs>
) => StateCreator<T, Mps, [[typeof id, never], ...Mcs]>;

type SubscribeInternalImpl = <T>(
  f: StateCreator<T, [], []>
) => StateCreator<T, [], []>;

const subscribeInternalImpl: SubscribeInternalImpl =
  (createStore) => (set, get, _api) => {
    type T = ReturnType<typeof createStore>;
    const api = _api as Mutate<StoreApi<T>, [[typeof id, never]]>;

    let atomicCounter = 0;
    let prevState;
    const _subscribe = api.subscribe;

    api.atomic = (fn) => {
      try {
        if (!atomicCounter++) prevState = get();
        return fn();
      } finally {
        if (!--atomicCounter) set({});
      }
    };

    api.setState = (...args) => api.atomic(() => set(...args));

    api.subscribe = (fn) =>
      _subscribe((state) => {
        if (!atomicCounter) fn(state, prevState);
      });

    api.subscribeInternal = (fn) =>
      _subscribe((...args) => {
        if (atomicCounter) fn(...args);
      });

    return createStore(api.setState, get, api);
  };

export default subscribeInternalImpl as unknown as SubscribeInternal;
