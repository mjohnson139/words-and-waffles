import { fit } from '../fit';

describe('fit', () => {
  it('small phone 320x568', () => {
    expect(fit({ width: 320, height: 568, boardTop: 110 })).toEqual({ tile: 30, key: 40 });
  });
  it('phone 390x844 is width limited', () => {
    expect(fit({ width: 390, height: 844, boardTop: 110 })).toEqual({ tile: 61, key: 50 });
  });
  it('tablet 768x1024 caps at 62', () => {
    expect(fit({ width: 768, height: 1024, boardTop: 110 })).toEqual({ tile: 62, key: 50 });
  });
  it('short wide window 1280x720 is height limited', () => {
    // h = (720-110-190-125)/6 = 49.17
    expect(fit({ width: 1280, height: 720, boardTop: 110 })).toEqual({ tile: 49, key: 50 });
  });
  it('key steps and keyboard override', () => {
    expect(fit({ width: 400, height: 700, boardTop: 0 }).key).toBe(45);
    expect(fit({ width: 400, height: 700, boardTop: 0, keyboardHeight: 300 }).tile).toBeLessThan(
      fit({ width: 400, height: 700, boardTop: 0 }).tile,
    );
  });
});
