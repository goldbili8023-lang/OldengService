import { constants } from 'node:fs';
import { access, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const distDir = resolve('dist');
const indexPath = resolve(distDir, 'index.html');
const fallbackPath = resolve(distDir, '404.html');

try {
  await access(indexPath, constants.R_OK);
  await copyFile(indexPath, fallbackPath);
  console.log(`Created GitHub Pages SPA fallback: ${fallbackPath}`);
} catch (error) {
  console.error('Failed to create GitHub Pages SPA fallback from dist/index.html.');
  console.error(error);
  process.exitCode = 1;
}
