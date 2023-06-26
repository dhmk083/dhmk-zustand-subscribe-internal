# zustand-subscribe-internal

Internal subscription queue for zustand

## Installation

```sh
npm install @dhmk/zustand-subscribe-internal
```

## Description

Zustand middleware that adds atomic setters and one more notifications queue alongside with `subscribe` queue.

In a typical zustand app you have the following algorithm when you call setter function:

1. Update state
2. Notify listeners attached via `subscribe` function

With this middleware you will have extra steps:

1. Update state
2. Notify listeners attached via `subscribeInternal` function
3. If some of listeners call setter, repeat steps 1-2
4. Notify listeners attached via `subscribe` function

This might be useful if you want to manage parts of your app state with subscriptions, allowing them to be loosely coupled, while maintaining correct app state at the same time.

Here is an example (although contrived):

Let's say you have a `dayModule`, which manages days of the current month. And also you have a `monthModule`, which manages months. `dayModule` depends on `monthModule` and the latter doesn't know about the former.

Let's say we have an app state such as current day is 31 and current month is January.

Now, `monthModule` has its `setMonth` function called, and the current month is now February. `monthModule` can not change `dayModule`'s current day to any valid day (since 31 February is incorrect), because in our app architecture it doesn't know about that module. So without this middleware `dayModule` would have to use standard `subscribe` function to change its current day appropriately, but that would result into 2 updates visible to "public" listeners (which are attached using `subscribe` function): one with incorrect state and one with correct. This can possibly lead to some bugs further down the road.

Instead, if `dayModule` would use `subscribeInternal` function, it could set its current day to a valid value, before any "public" listeners would be called. That would result into 1 and only update with correct state.

The point is, this middleware allows you to have multiple `internal` states of the app, some of which may be intentionally incorrect, before notifying "public" listeners that the state has changed.

This means that every call of a setter function is now atomic for "public" listeners, i.e. each listener will be called exactly one time during that function. Also, if you want to achieve atomicity between several setter calls, you can use `atomic` wrapper function.

## API

### `(default export) subscribeInternal()`

Enhances zustand store with several functions:

#### `subscribeInternal(callback: (state, prevState) => void): UnsubscribeFunction`

#### `atomic<T>(fn: () => T): T`

Example:

```ts
const store = createStore(
  subscribeInternal((set, get, api) => {
    api.subscribeInternal((state, prevState) => {
      /* your code here */
    });

    return {
      value: 0,

      test() {
        // `subscribe` listeners will be called only once at the end of this function
        // despite having multiple `set` operations
        api.atomic(() => {
          set({ value: 1 });
          api.atomic(() => {
            set({ value: 2 });
          });
          set({ value: 3 });
        });
      },
    };
  })
);
```
