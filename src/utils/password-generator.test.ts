import { describe, it, expect } from 'vitest';
import { generatePassword } from './password-generator';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?';

describe('generatePassword', () => {
  it('指定した長さの文字列を返す', () => {
    expect(generatePassword({ length: 16 }).length).toBe(16);
    expect(generatePassword({ length: 32 }).length).toBe(32);
  });

  it('最小長未満は最小長(4)にクランプ', () => {
    expect(generatePassword({ length: 1 }).length).toBe(4);
    expect(generatePassword({ length: 0 }).length).toBe(4);
  });

  it('最大長超は最大長(128)にクランプ', () => {
    expect(generatePassword({ length: 9999 }).length).toBe(128);
  });

  it('デフォルト(全セット有効)で小文字・大文字・数字・記号を含む', () => {
    const pw = generatePassword({ length: 40 });
    expect([...pw].some(c => LOWER.includes(c))).toBe(true);
    expect([...pw].some(c => UPPER.includes(c))).toBe(true);
    expect([...pw].some(c => DIGITS.includes(c))).toBe(true);
    expect([...pw].some(c => SYMBOLS.includes(c))).toBe(true);
  });

  it('記号OFFの場合は記号を含まない', () => {
    for (let i = 0; i < 20; i++) {
      const pw = generatePassword({ length: 24, symbols: false });
      expect([...pw].some(c => SYMBOLS.includes(c))).toBe(false);
    }
  });

  it('大文字/数字OFFの場合はそれらを含まない', () => {
    for (let i = 0; i < 20; i++) {
      const pw = generatePassword({ length: 24, uppercase: false, digits: false, symbols: false });
      // 小文字のみ
      expect([...pw].every(c => LOWER.includes(c))).toBe(true);
    }
  });

  it('文字種セット数より長さが短い場合でもエラーにならない', () => {
    const pw = generatePassword({ length: 4 });
    expect(pw.length).toBe(4);
  });

  it('乱数性: 同オプションで連続生成すると異なる結果が得られる', () => {
    const a = generatePassword({ length: 24 });
    const b = generatePassword({ length: 24 });
    expect(a).not.toBeNull();
    // 極めて低確率で一致し得るが、実用上は異なるはず
    // 複数回生成して全一致の可能性を排除
    const set = new Set<string>();
    for (let i = 0; i < 10; i++) set.add(generatePassword({ length: 24 }));
    expect(set.size).toBeGreaterThan(1);
  });
});
