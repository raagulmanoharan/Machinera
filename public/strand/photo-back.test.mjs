import test from 'node:test';
import assert from 'node:assert/strict';
import {StreamCloth} from './stream-cloth.js';
import {RugArchive} from './rug-archive.js';
import {FABRIC_COLUMNS,ATLAS_ROWS} from './fabric-coordinates.js';
import {WARP_ENDS} from './yarn-structure.js';
function material(){const cloth=Object.create(StreamCloth.prototype);cloth.archive=new RugArchive();const entry=cloth.archive.append({palette:[{rgb:[220,35,25],share:.5},{rgb:[25,45,210],share:.5}]},3.8,null,null,{independent:true});entry.photoYarns={width:2,height:2,indices:new Uint8Array([0,1,1,0])};cloth.scrollOffset=0;cloth.backSide=false;cloth.story={streamAtlasBase:{value:0}};cloth.texture={image:{data:new Uint8Array(FABRIC_COLUMNS*ATLAS_ROWS*4)}};cloth.photoTexture={image:{data:new Uint8Array(FABRIC_COLUMNS*ATLAS_ROWS*4)}};cloth.weftTexture={image:{data:new Uint8Array(WARP_ENDS*ATLAS_ROWS*4)}};cloth.weaveTexture={image:{data:new Uint8Array(ATLAS_ROWS*4)}};return cloth;}
test('front and photo coexist without swapping textures during a turn',()=>{const cloth=material();cloth.rebuildPalette();const draft=cloth.weaveTexture.image.data.slice(),front=cloth.texture.image.data.slice(),back=cloth.photoTexture.image.data.slice();assert.notDeepEqual(back,front);cloth.setBack(true);assert.deepEqual(cloth.weaveTexture.image.data,draft);assert.deepEqual(cloth.texture.image.data,front);assert.deepEqual(cloth.photoTexture.image.data,back);assert.equal(cloth.rebuildPalette(),false,'Changing visible side never rebuilds or replaces the dye atlas');cloth.setBack(false);assert.deepEqual(cloth.texture.image.data,front);});

test('resting faces use an explicit side, and twisting releases the geometric face selection',()=>{
 const cloth=Object.create(StreamCloth.prototype);cloth.uniforms={streamPhotoSide:{value:0},streamTurning:{value:1}};cloth.group={rotation:{},position:{set(){}}};
 cloth.setBack(true);cloth.setTurn(Math.PI);assert.equal(cloth.uniforms.streamPhotoSide.value,1);assert.equal(cloth.uniforms.streamTurning.value,0);
 cloth.setBack(false);cloth.setTurn(0);assert.equal(cloth.uniforms.streamPhotoSide.value,0);assert.equal(cloth.uniforms.streamTurning.value,0);
});
