import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync,existsSync} from 'node:fs';import {dirname,resolve,extname} from 'node:path';import {fileURLToPath} from 'node:url';
test('the current entrypoint reaches every runtime module without retired dependencies',()=>{
 const root=dirname(fileURLToPath(import.meta.url)),seen=new Set(),pending=[resolve(root,'index.html')];
 while(pending.length){const path=pending.pop();if(seen.has(path))continue;assert.ok(existsSync(path),'missing runtime dependency '+path);seen.add(path);if(!['.js','.css','.html'].includes(extname(path)))continue;
 const source=readFileSync(path,'utf8');for(const match of source.matchAll(/["'](\.?\.?\/[^"'\s]+\.(?:js|css)(?:\?[^"']*)?)["']/g))pending.push(resolve(dirname(path),match[1].split('?')[0]));
 }
 for(const name of readdirSync(root).filter(n=>n.endsWith('.js')))assert.ok(seen.has(resolve(root,name)),'unreferenced runtime module '+name);
});
