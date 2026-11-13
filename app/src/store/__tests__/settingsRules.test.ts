import { describe, expect, it } from 'vitest';
import { cleanSettings, isEndpointUrl } from '../settingsRules';

describe('isEndpointUrl', () => {
  it('accepts https and trims', () => {
    expect(isEndpointUrl('https://a.example.com/v1/word')).toBe(true);
    expect(isEndpointUrl('  https://a.example.com/v1/word  ')).toBe(true);
  });
  it('rejects everything else', () => {
    for (const s of ['http://a.com', 'javascript:alert(1)', 'https://user:pass@a.com', 'https://user@a.com', 'garbage', '', 'https://', 5, null]) {
      expect(isEndpointUrl(s)).toBe(false);
    }
  });
});

describe('cleanSettings', () => {
  it('defaults', () => {
    expect(cleanSettings(null)).toEqual({ pingEnabled: true, wordEndpointOverride: '' });
    expect(cleanSettings('x')).toEqual({ pingEnabled: true, wordEndpointOverride: '' });
  });
  it('keeps valid values and trims the override', () => {
    expect(cleanSettings({ pingEnabled: false, wordEndpointOverride: ' https://a.com/w ' })).toEqual({
      pingEnabled: false,
      wordEndpointOverride: 'https://a.com/w',
    });
  });
  it('drops bad values', () => {
    expect(cleanSettings({ pingEnabled: 'no', wordEndpointOverride: 'http://a.com' })).toEqual({
      pingEnabled: true,
      wordEndpointOverride: '',
    });
  });
});
