import {test} from 'node:test';import assert from 'node:assert/strict';
import {warpOver,yarnHeight} from './weave-types.js';import {WEAVE_LIBRARY} from './weave-library.js';
test('all loom drafts repeat at their true periods and give complementary yarn heights',()=>{
 for(let type=0;type<WEAVE_LIBRARY.length;type++){const d=WEAVE_LIBRARY[type];for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++){
 assert.equal(warpOver(x,y,type),warpOver(x+d.width,y-d.height,type));assert.equal(yarnHeight(y,x,true,type),-yarnHeight(x,y,false,type));
 }for(let end=0;end<d.width;end++)assert.ok(Math.abs(yarnHeight(0,end,true,type)-yarnHeight(d.height,end,true,type))<1e-9);}
});
