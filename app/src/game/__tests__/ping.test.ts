import { afterPing, cleanPingState, pingBody } from '../ping';

describe('pingBody', () => {
  it('first ever flags everything', () => {
    expect(pingBody({}, '2026-11-13', 'ios')).toEqual({ d: true, w: true, m: true, n: true, p: 'ios' });
  });
  it('is null after pinging today', () => {
    expect(pingBody(afterPing('2026-11-13'), '2026-11-13', 'web')).toBeNull();
  });
  it('new day, same week and month', () => {
    expect(pingBody(afterPing('2026-11-12'), '2026-11-13', 'android')).toEqual({
      d: true, w: false, m: false, n: false, p: 'android',
    });
  });
  it('new week, same month', () => {
    const b = pingBody(afterPing('2026-11-13'), '2026-11-16', 'web');
    expect(b).toMatchObject({ d: true, w: true, m: false, n: false });
  });
  it('2026-12-31 to 2027-01-04 is a new week and month', () => {
    expect(pingBody(afterPing('2026-12-31'), '2027-01-04', 'web')).toMatchObject({ w: true, m: true });
  });
  it('2026-12-31 to 2027-01-01 is the same ISO week but a new month', () => {
    expect(pingBody(afterPing('2026-12-31'), '2027-01-01', 'web')).toMatchObject({ w: false, m: true });
  });
  it('new month within a week', () => {
    expect(pingBody(afterPing('2026-10-30'), '2026-11-01', 'web')).toMatchObject({ w: false, m: true });
  });
});

describe('cleanPingState', () => {
  it('keeps good values', () => {
    expect(cleanPingState(afterPing('2026-11-13'))).toEqual(afterPing('2026-11-13'));
  });
  it('drops garbage', () => {
    expect(cleanPingState(null)).toEqual({});
    expect(cleanPingState('x')).toEqual({});
    expect(cleanPingState({ lastDay: 5, lastWeek: 'nope', lastMonth: {} })).toEqual({});
    expect(cleanPingState({ lastDay: '2026-11-13', extra: 1 })).toEqual({ lastDay: '2026-11-13' });
  });
});
