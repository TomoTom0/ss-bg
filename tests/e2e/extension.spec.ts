import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_PATH = path.join(__dirname, '../../dist');

test.describe('Build Verification', () => {
  test('distフォルダが存在する', () => {
    expect(fs.existsSync(EXTENSION_PATH)).toBe(true);
  });

  test('manifest.jsonが生成されている', () => {
    const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    
    // manifest.jsonの内容を検証
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBe('SS-BG');
    expect(manifest.version).toBeDefined();
    expect(manifest.manifest_version).toBe(3);
  });

  test('popup HTMLが生成されている', () => {
    const popupPath = path.join(EXTENSION_PATH, 'src/popup/index.html');
    expect(fs.existsSync(popupPath)).toBe(true);
    
    const html = fs.readFileSync(popupPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
  });

  test('options HTMLが生成されている', () => {
    const optionsPath = path.join(EXTENSION_PATH, 'src/options/index.html');
    expect(fs.existsSync(optionsPath)).toBe(true);
    
    const html = fs.readFileSync(optionsPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
  });

  test('アイコンファイルが存在する', () => {
    expect(fs.existsSync(path.join(EXTENSION_PATH, 'icons/icon16.png'))).toBe(true);
    expect(fs.existsSync(path.join(EXTENSION_PATH, 'icons/icon48.png'))).toBe(true);
    expect(fs.existsSync(path.join(EXTENSION_PATH, 'icons/icon128.png'))).toBe(true);
  });

  test('Service WorkerのJSが生成されている', () => {
    // assetsフォルダ内にJSファイルが存在するか
    const assetsPath = path.join(EXTENSION_PATH, 'assets');
    expect(fs.existsSync(assetsPath)).toBe(true);
    
    const files = fs.readdirSync(assetsPath);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);
  });

  test('Content ScriptのJSが生成されている', () => {
    // main.ts関連のJSファイルが存在するか
    const assetsPath = path.join(EXTENSION_PATH, 'assets');
    const files = fs.readdirSync(assetsPath);
    const mainJs = files.filter(f => f.includes('main.ts') && f.endsWith('.js'));
    expect(mainJs.length).toBeGreaterThan(0);
  });

  test('manifest.jsonのpermissionsが正しい', () => {
    const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    expect(manifest.permissions).toContain('storage');
    expect(manifest.permissions).toContain('unlimitedStorage');
    expect(manifest.permissions).toContain('activeTab');
    expect(manifest.permissions).toContain('tabs');
  });

  test('manifest.jsonのcontent_scriptsが設定されている', () => {
    const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    expect(manifest.content_scripts).toBeDefined();
    expect(Array.isArray(manifest.content_scripts)).toBe(true);
    expect(manifest.content_scripts.length).toBeGreaterThan(0);
  });

  test('manifest.jsonのbackgroundが設定されている', () => {
    const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    expect(manifest.background).toBeDefined();
    expect(manifest.background.service_worker).toBeDefined();
  });

  test('manifest.jsonのcommandsが設定されている（スクリーンショット）', () => {
    const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    expect(manifest.commands).toBeDefined();
    // スクリーンショット用のコマンドが設定されているか
    const commandKeys = Object.keys(manifest.commands);
    expect(commandKeys.length).toBeGreaterThan(0);
  });
});

test.describe('Static File Validation', () => {
  test('popup HTMLにVueアプリのマウントポイントがある', () => {
    const popupPath = path.join(EXTENSION_PATH, 'src/popup/index.html');
    const html = fs.readFileSync(popupPath, 'utf-8');
    
    expect(html).toContain('id="app"');
  });

  test('options HTMLにVueアプリのマウントポイントがある', () => {
    const optionsPath = path.join(EXTENSION_PATH, 'src/options/index.html');
    const html = fs.readFileSync(optionsPath, 'utf-8');
    
    expect(html).toContain('id="app"');
  });

  test('JSファイルにソースマップが生成されている', () => {
    const assetsPath = path.join(EXTENSION_PATH, 'assets');
    const files = fs.readdirSync(assetsPath);
    const mapFiles = files.filter(f => f.endsWith('.js.map'));
    
    // 少なくとも1つのソースマップが存在する
    expect(mapFiles.length).toBeGreaterThan(0);
  });

  test('.vite/manifest.jsonが生成されている', () => {
    const viteManifestPath = path.join(EXTENSION_PATH, '.vite/manifest.json');
    expect(fs.existsSync(viteManifestPath)).toBe(true);
  });
});

test.describe('Package Structure', () => {
  test('必要なディレクトリ構造が維持されている', () => {
    expect(fs.existsSync(path.join(EXTENSION_PATH, 'src'))).toBe(true);
    expect(fs.existsSync(path.join(EXTENSION_PATH, 'src/popup'))).toBe(true);
    expect(fs.existsSync(path.join(EXTENSION_PATH, 'src/options'))).toBe(true);
    expect(fs.existsSync(path.join(EXTENSION_PATH, 'icons'))).toBe(true);
    expect(fs.existsSync(path.join(EXTENSION_PATH, 'assets'))).toBe(true);
  });

  test('不要なソースファイルが含まれていない', () => {
    // .tsファイルがdistに含まれていないことを確認
    const assetsPath = path.join(EXTENSION_PATH, 'assets');
    const files = fs.readdirSync(assetsPath);
    const tsFiles = files.filter(f => f.endsWith('.ts') && !f.endsWith('.js'));
    
    expect(tsFiles.length).toBe(0);
  });
});

