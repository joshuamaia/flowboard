// GitHub Pages serves 404.html for unknown paths. Copying index.html there lets
// deep links such as /flowboard/board load the SPA, which then routes client-side.
import { copyFileSync, existsSync } from 'node:fs';

const dir = process.argv[2] ?? 'dist/flowboard/browser';
const index = `${dir}/index.html`;

if (!existsSync(index)) {
  console.error(`index.html not found in ${dir}. Run the build first.`);
  process.exit(1);
}
copyFileSync(index, `${dir}/404.html`);
console.log(`Created ${dir}/404.html`);
