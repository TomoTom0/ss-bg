/**
 * パスワード生成
 */

export interface PasswordGenOptions {
  /** 文字数（4〜128にクランプ） */
  length: number;
  /** 大文字を含む（デフォルトtrue） */
  uppercase?: boolean;
  /** 数字を含む（デフォルトtrue） */
  digits?: boolean;
  /** 記号を含む（デフォルトtrue）。小文字は常に含む */
  symbols?: boolean;
}

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?';

const MIN_LENGTH = 4;
const MAX_LENGTH = 128;

/**
 * 暗号学的に安全な乱数で [0, max) の整数を偏りなく返す
 */
function secureRandomInt(max: number): number {
  if (max <= 0) throw new Error('max must be positive');
  const maxUint32 = 0xffffffff;
  // 残差バイアスを除去するため、最大値を max の倍数に切り下て再抽選
  const limit = maxUint32 - (maxUint32 % max);
  const buf = new Uint32Array(1);
  let value = maxUint32;
  while (value > limit) {
    crypto.getRandomValues(buf);
    value = buf[0];
  }
  return value % max;
}

/**
 * 配列を Fisher-Yates でシャッフル（破壊的）
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * パスワードを生成する。
 * 小文字は常に含み、各有効セットから最低1文字を保証してシャッフルする。
 */
export function generatePassword(options: PasswordGenOptions): string {
  const length = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, Math.floor(options.length) || MIN_LENGTH));
  const useUpper = options.uppercase ?? true;
  const useDigits = options.digits ?? true;
  const useSymbols = options.symbols ?? true;

  // 文字集合を構築
  const pools: string[] = [LOWERCASE];
  if (useUpper) pools.push(UPPERCASE);
  if (useDigits) pools.push(DIGITS);
  if (useSymbols) pools.push(SYMBOLS);
  const all = pools.join('');

  // 各セットから最低1文字（長さが足りない場合は前方から詰める）
  const chars: string[] = [];
  const guaranteed = Math.min(pools.length, length);
  for (let i = 0; i < guaranteed; i++) {
    chars.push(pools[i][secureRandomInt(pools[i].length)]);
  }
  // 残りを全集合から均等に選ぶ
  for (let i = guaranteed; i < length; i++) {
    chars.push(all[secureRandomInt(all.length)]);
  }

  return shuffle(chars).join('');
}
