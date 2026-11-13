import { useEffect, useState } from 'react';

import { today } from '../game/dates';

/** The local calendar date, updated within a second of midnight. */
export function useToday(): string {
  const [date, setDate] = useState(today);
  useEffect(() => {
    const id = setInterval(() => setDate(today()), 1000);
    return () => clearInterval(id);
  }, []);
  return date;
}
