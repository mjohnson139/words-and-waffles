import { useEffect, useState } from 'react';

import { today } from '../game/dates';

/** The local calendar date, updated within a few seconds of midnight. */
export function useToday(): string {
  const [date, setDate] = useState(today);
  useEffect(() => {
    const id = setInterval(() => setDate(today()), 5000);
    return () => clearInterval(id);
  }, []);
  return date;
}
