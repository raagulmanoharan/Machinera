import test from 'node:test';
import assert from 'node:assert/strict';
import {StreamCloth} from './stream-cloth.js';
import {RugArchive} from './rug-archive.js';
import {FABRIC_COLUMNS,ATLAS_ROWS} from './fabric-coordinates.js';
import {WARP_ENDS} from './yarn-structure.js';
function material(){const cloth=Object.create(StreamCloth.prototype);cloth.archive=new RugArchive();const entry=cloth.archive.append({palette:[{rgb:[220,35,25],share:.5},{rgb:[25,45,210],share:.5}]},3.8,null,null,{independent:true});entry.photoYarns={width:2,height:2,indices:new Uint8Array([0,1,1,0])};cloth.scrollOffset=0;cloth.backSide=false;cloth.story={streamAtlasBase:{value:0}};cloth.texture={image:{data:new Uint8Array(FABRIC_COLUMNS*ATLAS_ROWS*4)}};cloth.weftTexture={image:{data:new Uint8Array(WARP_ENDS*ATLAS_ROWS*4)}};cloth.weaveTexture={image:{data:new Uint8Array(ATLAS_ROWS*4)}};return cloth;}
test('photo reverse changes yarn colours while retaining the exact loom draft',()=>{const cloth=material();cloth.rebuildPalette();const draft=cloth.weaveTexture.image.data.slice(),front=cloth.texture.image.data.slice();cloth.backSide=true;cloth.rebuildPalette();assert.deepEqual(cloth.weaveTexture.image.data,draft);assert.notDeepEqual(cloth.texture.image.data,front);cloth.backSide=false;cloth.rebuildPalette();assert.deepEqual(cloth.texture.image.data,front);});
