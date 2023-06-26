import { createStore } from "zustand/vanilla";
import { immer } from "zustand/middleware/immer";
import subscribeInternal from "./";

it("calendar", () => {
  const store = createStore<any>()(
    immer(
      subscribeInternal((set, get, api) => {
        api.subscribeInternal((state, prevState) => {
          if (
            state.monthModule.currentMonth !==
            prevState.monthModule.currentMonth
          ) {
            set((s) => {
              s.dayModule.currentDay = 1;
            });
          }
        });

        return {
          dayModule: {
            currentDay: 31,
          },

          monthModule: {
            currentMonth: "january",

            setMonth(m) {
              set((s) => {
                s.monthModule.currentMonth = m;
              });
            },
          },
        };
      })
    )
  );

  const cb = jest.fn();
  store.subscribe((state) => cb(state));

  store.getState().monthModule.setMonth("february");

  // without `subscribeInternal` it would be called 2 times
  expect(cb).toBeCalledTimes(1);
  const cbState = cb.mock.lastCall[0];
  expect(cbState.dayModule.currentDay).toBe(1);
  expect(cbState.monthModule.currentMonth).toBe("february");
});

it("atomic", () => {
  const subInternalCb = jest.fn();
  const subCb = jest.fn();

  const store = createStore<any>()(
    subscribeInternal((set, get, api) => {
      api.subscribeInternal(subInternalCb);

      return {
        value: 0,

        test() {
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

  store.subscribe(subCb);
  store.getState().test();

  expect(subInternalCb).toBeCalledTimes(3);
  expect(subCb).toBeCalledTimes(1);
});
