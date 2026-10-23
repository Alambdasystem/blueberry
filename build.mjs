import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const read = name => readFile(join(root, name), 'utf8');
const sources = ['coverage.js', 'navigation.js', 'quote-demo.js', 'motion.js'];
const portalStyles = await read('portal.css');
const portalScripts = {owner: await read('owner.js'), apply: await read('apply.js')};
let html = await read('page.template.html');
for (const [marker, content] of [
  ['<!-- BLUEBERRY_STYLES -->', await read('styles.css')],
  ['<!-- BLUEBERRY_SCRIPTS -->', (await Promise.all(sources.map(read))).join('')],
]) {
  if (html.split(marker).length !== 2) throw new Error(`Expected exactly one ${marker}`);
  html = html.replace(marker, () => content);
}
if (process.argv.includes('--check')) {
  if (html !== await read('index.html')) throw new Error('index.html is stale. Run npm run build.');
  console.log('Generated index.html matches source files.');
} else {
  await writeFile(join(root, 'index.html'), html);
  console.log('Built index.html.');
}

for (const name of ['owner', 'apply']) {
  const page = (await read(`${name}.template.html`))
    .replace('<!-- PORTAL_STYLES -->', () => portalStyles)
    .replace('<!-- PORTAL_SCRIPT -->', () => portalScripts[name]);
  if (process.argv.includes('--check')) {
    if (page !== await read(`${name}.html`)) throw new Error(`${name}.html is stale.`);
  } else await writeFile(join(root, `${name}.html`), page);
}
