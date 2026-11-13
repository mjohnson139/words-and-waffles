import { createHash } from 'node:crypto';
import { sha256Hex } from '../sha256';

const node = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

describe('sha256Hex', () => {
  it('matches the known vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });
  it('matches node on long and non-ASCII input', () => {
    const long = 'x'.repeat(1000);
    expect(sha256Hex(long)).toBe(node(long));
    for (const s of ['café ☕', '😀 emoji', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64)]) {
      expect(sha256Hex(s)).toBe(node(s));
    }
  });
});
