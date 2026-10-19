import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

test('woven lettering reaches the GPU after initial allocation, edits and rug-size changes',async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage();
  await page.route('https://lettering.test/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/')return route.fulfill({contentType:'text/html',body:'<script type="importmap">{"imports":{"three":"/vendor/three.module.js"}}</script>'});
   const file=path==='/vendor/three.module.js'?new URL('../../node_modules/three/build/three.module.js',import.meta.url):new URL('.'+path.replace('/strand',''),import.meta.url);
   await route.fulfill({contentType:'application/javascript',body:await readFile(fileURLToPath(file),'utf8')});
  });
  await page.goto('https://lettering.test/');
  const result=await page.evaluate(async()=>{
   const T=await import('three'),{initialiseLettering,refreshLettering}=await import('/strand/woven-lettering.js');
   const entry={end:3.8,length:3.8,palette:[{rgb:[220,200,170]},{rgb:[30,40,65]}],lettering:{front:{text:'Home',x:.1,y:.3,w:.8,h:.15,stretch:1}}},cloth={story:{},archive:{entries:[entry]},backSide:false};initialiseLettering(cloth);
   const renderer=new T.WebGLRenderer(),target=new T.WebGLRenderTarget(48,119),scene=new T.Scene(),material=new T.ShaderMaterial({uniforms:{mask:cloth.story.streamTextMask,enabled:cloth.story.streamTextEnabled},vertexShader:'varying vec2 at;void main(){at=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform sampler2D mask;uniform float enabled;varying vec2 at;void main(){gl_FragColor=vec4(texture2D(mask,at).rgb*enabled,1.);}'}),geometry=new T.PlaneGeometry(2,2);scene.add(new T.Mesh(geometry,material));
   const sample=()=>{renderer.setRenderTarget(target);renderer.render(scene,new T.Camera());const rgba=new Uint8Array(48*119*4);renderer.readRenderTargetPixels(target,0,0,48,119,rgba);return rgba.filter((v,i)=>i%4===0&&v>128).length;};
   const initial=sample(),emptyId=cloth.story.streamTextMask.value.uuid;refreshLettering(cloth);const first=sample(),firstId=cloth.story.streamTextMask.value.uuid;
   entry.lettering.front.text='Hi';refreshLettering(cloth);const edited=sample(),editId=cloth.story.streamTextMask.value.uuid;
   entry.length=2.4;refreshLettering(cloth);const resized=sample(),resizedId=cloth.story.streamTextMask.value.uuid;
   entry.lettering.front.text='';refreshLettering(cloth);const cleared=sample();
   cloth.backSide=true;refreshLettering(cloth);const emptyBack=sample();entry.lettering.back={...entry.lettering.front,text:'Back'};refreshLettering(cloth);const back=sample();cloth.backSide=false;refreshLettering(cloth);const frontAfterBack=sample();
   const error=renderer.getContext().getError();material.dispose();geometry.dispose();target.dispose();renderer.dispose();
   return{initial,first,edited,resized,cleared,emptyBack,back,frontAfterBack,emptyId,firstId,editId,resizedId,error};
  });
  assert.equal(result.initial,0);assert.ok(result.first>30);assert.ok(result.edited>10);assert.notEqual(result.first,result.edited);assert.ok(result.resized>10);assert.equal(result.cleared,0);assert.equal(result.emptyBack,0);assert.ok(result.back>10);assert.equal(result.frontAfterBack,0);assert.notEqual(result.emptyId,result.firstId);assert.equal(result.firstId,result.editId);assert.notEqual(result.firstId,result.resizedId);assert.equal(result.error,0);
 }finally{await browser.close();}
});
