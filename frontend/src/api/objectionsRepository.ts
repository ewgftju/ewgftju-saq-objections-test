import { seed } from "../data/objections";
import type { DemoState } from "../types";

/** The demo adapter is the only module that reads or writes case storage. */
export interface ObjectionsRepository {
  load(): DemoState;
  save(state: DemoState): void;
}

export const STORAGE_KEY = "saq.objections.demo.v1";
const CURRENT_VERSION = 5;

// Version 5 starts manually created appeals at request formation.

export function initialState(): DemoState {
  return {
    version: CURRENT_VERSION,
    date: "2026-09-08",
    cases: seed(),
    agendas: [],
    notifications: [],
  };
}

export function createDemoRepository(
  storage: Pick<Storage, "getItem" | "setItem">,
): ObjectionsRepository {
  return {
    load() {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return initialState();
      const value = JSON.parse(raw) as DemoState;
      if (
        ![1, 2, 3, 4, CURRENT_VERSION].includes(value.version) ||
        !Array.isArray(value.cases) ||
        typeof value.date !== "string"
      ) {
        throw new Error(
          "Сохранённые данные имеют неподдерживаемый формат. Сбросьте демонстрацию.",
        );
      }
      return {
        ...value,
        version: CURRENT_VERSION,
        agendas: value.agendas || [],
        notifications: value.notifications || [],
        cases: value.cases.map((c) => {
          const migrated =
            value.version === 1 && c.status === "commission_voting"
              ? { ...c, status: "commission_members" as const }
              : c;
          return value.version < 5 && migrated.status === "received"
            ? { ...migrated, status: "accepted" as const }
            : migrated;
        }),
      };
    },
    save(state) {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
  };
}
