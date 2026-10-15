import {test} from 'node:test';
import assert from 'node:assert/strict';
import {warpOver,yarnHeight,WEAVES} from './weave-types.js';
test('three balanced weave drafts repeat without tile seams',()=>{const drafts=[];for(let type=0;type<WEAVES.length;type++){let count=0,draft='';for(let y=0;y<8;y++)for(let x=0;x<8;x++){const over=warpOver(x,y,type);count+=over;draft+=Number(over);assert.equal(over,warpOver(x+8,y-8,type));assert.equal(yarnHeight(y,x,true,type),-yarnHeight(x,y,false,type));}assert.equal(count,32);drafts.push(draft);for(let strand=0;strand<8;strand++)assert.ok(Math.abs(yarnHeight(0,strand,true,type)-yarnHeight(8,strand,true,type))<1e-9);}assert.equal(new Set(drafts).size,3);});
