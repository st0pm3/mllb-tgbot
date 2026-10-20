import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('tgcloud');let count=0;
function walk(dir){for(const name of fs.readdirSync(dir)){const file=path.join(dir,name);if(fs.statSync(file).isDirectory()){walk(file);continue;}if(!file.endsWith('.js'))continue;count++;const text=fs.readFileSync(file,'utf8');for(const m of text.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){const imp=m[1];if(['sdk','sdk/db','sdk/api','sdk/fetch'].includes(imp))continue;if(!imp.startsWith('.')||!imp.endsWith('.js'))throw new Error(`Unsupported runtime import ${imp} in ${file}`);const target=path.resolve(path.dirname(file),imp);if(!target.startsWith(root+path.sep)||!fs.existsSync(target))throw new Error(`Invalid runtime module ${target}`);}}}
walk(root);console.log(`Runtime module check passed: ${count} JavaScript modules.`);
