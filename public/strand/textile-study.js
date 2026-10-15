import * as T from 'three';
import { studioEnvironment } from './studio-environment.js?v=10';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const W=2.4,H=W*1.55,S=W/714;
const palette={teal:'#145362',rust:'#b84b32',gold:'#c99528',ivory:'#e0cc9f'};
const scene=new T.Scene();scene.background=new T.Color('#e6e0d6');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
document.querySelector('#stage').prepend(renderer.domElement);
scene.environment=studioEnvironment(renderer);scene.environmentIntensity=.12;scene.environmentRotation.y=.45;
const camera=new T.OrthographicCamera(-2,2,3,-3,.1,30);camera.position.set(0,0,7);camera.lookAt(0,0,0);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableRotate=false;controls.enableDamping=false;controls.screenSpacePanning=true;controls.minZoom=1;controls.maxZoom=12;controls.mouseButtons.LEFT=T.MOUSE.PAN;controls.touches.ONE=T.TOUCH.PAN;controls.touches.TWO=T.TOUCH.DOLLY_PAN;
// Camera looks along -Z: negative X / positive Y is the upper-left of the image.
// A grazing key reveals yarn relief; weak indirect light keeps the cavities readable.
const key=new T.DirectionalLight(0xfff2de,3.0);
key.position.set(-3,4,3);key.target.position.set(0,0,0);
key.castShadow=true;key.shadow.mapSize.set(4096,4096);
key.shadow.camera.left=-2.3;key.shadow.camera.right=2.3;
key.shadow.camera.top=2.6;key.shadow.camera.bottom=-2.6;
key.shadow.camera.near=.1;key.shadow.camera.far=12;
key.shadow.bias=-.000005;key.shadow.normalBias=.00015;
scene.add(key,key.target);
scene.add(new T.HemisphereLight(0xffffff,0xc5b8a8,.12));
// This is the studio wall, not a second cloth or coloured backing layer.
const wall=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0xe6e0d6,roughness:1}));wall.position.z=-.008;wall.receiveShadow=true;scene.add(wall);
const textile=new T.Group();scene.add(textile);
const bins=Object.fromEntries(Object.keys(palette).map(k=>[k,{p:[],n:[],uv:[],i:[]}]));const hairs=[],hairColours=[];
const P=(x,y,z=0)=>new T.Vector3((x-357)*S,(640-y)*H/1280,z);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fract=n=>n-Math.floor(n);let seed=1;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function filament(points,radius,name,twist=0){const b=bins[name],sides=6,plies=3,steps=points.length-1,offset=b.p.length/3;
 let distance=0;for(let j=0;j<=steps;j++){if(j)distance+=points[j].distanceTo(points[j-1]);const t=j/steps,centre=points[j],tangent=points[Math.min(steps,j+1)].clone().sub(points[Math.max(0,j-1)]).normalize();const across=new T.Vector3(-tangent.y,tangent.x,0).normalize(),up=new T.Vector3().crossVectors(tangent,across).normalize();for(let ply=0;ply<plies;ply++){const turn=distance/radius*1.25+ply/3*Math.PI*2+twist;for(let side=0;side<sides;side++){const a=side/sides*Math.PI*2,dx=(Math.cos(a)*.57+Math.cos(turn)*.42)*radius,dz=(Math.sin(a)*.57+Math.sin(turn)*.42)*radius*.72;const point=centre.clone().addScaledVector(across,dx).addScaledVector(up,dz);b.p.push(point.x,point.y,point.z);b.uv.push(t,side/sides+ply/3);if(j<steps){const a0=offset+j*plies*sides+ply*sides+side,a1=offset+j*plies*sides+ply*sides+(side+1)%sides;b.i.push(a0,a1,a0+plies*sides,a1,a1+plies*sides,a0+plies*sides);}}}}
 const colour=new T.Color(palette[name]);for(let k=4+Math.floor(random()*20);k<steps;k+=28){const root=points[k];for(let h=0;h<2;h++){const angle=random()*Math.PI*2,length=(.5+random()*1.3)*S;let old=root.clone().add(new T.Vector3(0,0,radius*.8));for(let i=1;i<=2;i++){const f=i/2,next=root.clone().add(new T.Vector3(Math.cos(angle)*length*f,Math.sin(angle)*length*f,radius*.8+Math.sin(f*2)*length*.65));hairs.push(...old.toArray(),...next.toArray());for(let n=0;n<2;n++)hairColours.push(colour.r,colour.g,colour.b);old=next;}}}
}
// Weft-faced plain weave: each crossing alternates above/below its neighbour.
// All visible material is yarn geometry, with no solid backing or traced motif.
const cols=100,rows=176,dx=W/cols,dy=H/rows,subdivisions=6;
const bands=[['teal',24],['ivory',3],['rust',5],['ivory',2],['gold',5],['teal',12],['gold',2],['rust',25],['ivory',3],['teal',5],['gold',22],['rust',3],['ivory',3],['teal',24],['rust',3],['ivory',2],['gold',5],['rust',8],['teal',22]];
function dye(row){let n=((row%rows)+rows)%rows;for(const [name,count]of bands){if(n<count)return name;n-=count;}return 'teal';}
function surface(x,y){return .0012*Math.sin(x*2.5+y*.8)+.0006*Math.sin(y*4);}
// Fine warp is mostly hidden by the thicker, closely packed coloured weft.
for(let col=0;col<cols;col++){
 const points=[],x=-W/2+(col+.5)*dx;
 for(let j=0;j<=rows*subdivisions;j++){
  const v=j/subdivisions,y=H/2-(v+.5)*dy;
  const z=-Math.cos(Math.PI*(v+col))*dy*.32;
  points.push(new T.Vector3(x+.00015*Math.sin(v*1.3+col),y,surface(x,y)+z));
 }
 filament(points,dx*.27,'teal',col*.7);
}
for(let row=0;row<rows;row++){
 const points=[],y=H/2-(row+.5)*dy;
 for(let j=0;j<=cols*subdivisions;j++){
  const u=j/subdivisions,x=-W/2+(u+.5)*dx;
  const z=Math.cos(Math.PI*(u+row))*dy*.32;
  points.push(new T.Vector3(x,y+.00018*Math.sin(u*1.2+row),surface(x,y)+z));
 }
 filament(points,dy*.48,dye(row),row*.41);
}
// Loose warp ends remain visibly fine rather than forming a thick carpet body.
for(let col=0;col<cols;col++)for(const sign of [-1,1]){
 const x=-W/2+(col+.5)*dx,points=[];
 for(let j=0;j<=16;j++){const t=j/16;points.push(new T.Vector3(x+Math.sin(t*4+col)*.002*t,sign*(H/2+t*.065),-.002*t));}
 filament(points,dx*.24,'ivory',col);
}
const microCanvas=document.createElement('canvas');microCanvas.width=512;microCanvas.height=256;const microContext=microCanvas.getContext('2d'),micro=microContext.createImageData(512,256);for(let y=0;y<256;y++)for(let x=0;x<512;x++){const value=145+14*Math.sin(y*.9+x*.4)+8*Math.sin(y*4.5-x*.1)+4*Math.sin(x*31.7+y*19.2),j=(y*512+x)*4;micro.data.set([value,value,value,255],j);}microContext.putImageData(micro,0,0);const fibreBump=new T.CanvasTexture(microCanvas);fibreBump.wrapS=fibreBump.wrapT=T.RepeatWrapping;fibreBump.repeat.set(3,1);fibreBump.anisotropy=16;
for(const [name,b] of Object.entries(bins)){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setIndex(b.i);g.computeVertexNormals();const m=new T.MeshPhysicalMaterial({color:palette[name],roughness:.98,bumpMap:fibreBump,bumpScale:.00018,sheen:.7,sheenColor:palette[name],sheenRoughness:.85,side:T.DoubleSide});const mesh=new T.Mesh(g,m);mesh.castShadow=mesh.receiveShadow=true;textile.add(mesh);b.p.length=b.uv.length=b.i.length=0;}
const hg=new T.BufferGeometry();hg.setAttribute('position',new T.Float32BufferAttribute(hairs,3));hg.setAttribute('color',new T.Float32BufferAttribute(hairColours,3));textile.add(new T.LineSegments(hg,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.26,depthWrite:false})));
let pending=false;
function render(){if(pending)return;pending=true;requestAnimationFrame(()=>{renderer.render(scene,camera);pending=false;document.querySelector('#stage').dataset.ready='true';});}
function resize(){renderer.setSize(innerWidth,innerHeight);const aspect=innerWidth/innerHeight,viewHeight=Math.max(H+.4,(W+.35)/aspect);camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();render();}
controls.addEventListener('change',render);window.addEventListener('resize',resize);
document.querySelector('#zoomIn').onclick=()=>{camera.zoom=Math.min(12,camera.zoom*1.5);camera.updateProjectionMatrix();render()};document.querySelector('#zoomOut').onclick=()=>{camera.zoom=Math.max(1,camera.zoom/1.5);camera.updateProjectionMatrix();render()};document.querySelector('#fitFabric').onclick=()=>{controls.target.set(0,0,0);camera.position.set(0,0,7);camera.zoom=1;camera.updateProjectionMatrix();controls.update();render()};
document.querySelector('#light').oninput=e=>{renderer.toneMappingExposure=Number(e.target.value);render()};
document.querySelector('#saveFabric').onclick=()=>{const max=Math.min(4096,renderer.capabilities.maxTextureSize),target=new T.WebGLRenderTarget(Math.round(max*W/H),max);target.texture.colorSpace=T.SRGBColorSpace;const c=new T.OrthographicCamera(-W/2-.02,W/2+.02,H/2+.02,-H/2-.02,.1,30);c.position.set(0,0,7);c.lookAt(0,0,0);renderer.setRenderTarget(target);renderer.render(scene,c);const bytes=new Uint8Array(target.width*target.height*4);renderer.readRenderTargetPixels(target,0,0,target.width,target.height,bytes);renderer.setRenderTarget(null);const out=document.createElement('canvas');out.width=target.width;out.height=target.height;const ctx=out.getContext('2d'),data=ctx.createImageData(out.width,out.height);for(let y=0;y<out.height;y++)data.data.set(bytes.subarray((out.height-1-y)*out.width*4,(out.height-y)*out.width*4),y*out.width*4);ctx.putImageData(data,0,0);target.dispose();out.toBlob(blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='strand-material-study.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)});render()};
resize();
