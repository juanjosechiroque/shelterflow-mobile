export interface Clock {
  todayISO(): string;
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const systemClock: Clock = {
  todayISO() {
    return toISODate(new Date());
  },
};

export function fixedClock(isoDate: string): Clock {
  return { todayISO: () => isoDate };
}
