import * as T from 'three';
import { studioEnvironment } from './studio-environment.js?v=10';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const W=2.4,H=W*1280/714,S=W/714;
const palette={teal:'#173e47',rust:'#a95235',gold:'#a97b2c',ivory:'#c6b697'};
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
const wall=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0xe6e0d6,roughness:1}));wall.position.z=-.028;wall.receiveShadow=true;scene.add(wall);
const textile=new T.Group();scene.add(textile);
const bins=Object.fromEntries(Object.keys(palette).map(k=>[k,{p:[],n:[],uv:[],i:[]}]));const hairs=[],hairColours=[];
const P=(x,y,z=0)=>new T.Vector3((x-357)*S,(640-y)*H/1280,z);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const fract=n=>n-Math.floor(n);let seed=1;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function path(points){return new T.CatmullRomCurve3(points.map(p=>P(...p)),false,'centripetal',.2);}
function arch(x,y,width,leftEnd,rightEnd){const radius=width/2,points=[];for(let yy=leftEnd;yy>y+radius;yy-=20)points.push([x,yy]);for(let i=0;i<=40;i++){const t=Math.PI-i/40*Math.PI;points.push([x+radius+Math.cos(t)*radius,y+radius-Math.sin(t)*radius]);}for(let yy=y+radius+20;yy<rightEnd;yy+=20)points.push([x+width,yy]);points.push([x+width,rightEnd]);return path(points);}
function poly(points){return path(points);}
function filament(points,radius,name,twist=0){const b=bins[name],sides=5,plies=3,steps=points.length-1,offset=b.p.length/3;
 for(let j=0;j<=steps;j++){const t=j/steps,centre=points[j],tangent=points[Math.min(steps,j+1)].clone().sub(points[Math.max(0,j-1)]).normalize();const across=new T.Vector3(-tangent.y,tangent.x,0).normalize(),up=new T.Vector3().crossVectors(tangent,across).normalize();for(let ply=0;ply<plies;ply++){const turn=t*12.56+ply/3*Math.PI*2+twist;for(let side=0;side<sides;side++){const a=side/sides*Math.PI*2,dx=(Math.cos(a)*.57+Math.cos(turn)*.42)*radius,dz=(Math.sin(a)*.57+Math.sin(turn)*.42)*radius*.72;const point=centre.clone().addScaledVector(across,dx).addScaledVector(up,dz);b.p.push(point.x,point.y,point.z);b.uv.push(t,side/sides+ply/3);if(j<steps){const a0=offset+j*plies*sides+ply*sides+side,a1=offset+j*plies*sides+ply*sides+(side+1)%sides;b.i.push(a0,a1,a0+plies*sides,a1,a1+plies*sides,a0+plies*sides);}}}}
 const colour=new T.Color(palette[name]);if(random()<.75){const k=Math.floor(random()*steps),root=points[k];for(let h=0;h<2;h++){const angle=random()*Math.PI*2,length=(.5+random()*1.3)*S;let old=root.clone().add(new T.Vector3(0,0,radius*.8));for(let i=1;i<=2;i++){const f=i/2,next=root.clone().add(new T.Vector3(Math.cos(angle)*length*f,Math.sin(angle)*length*f,radius*.8+Math.sin(f*2)*length*.65));hairs.push(...old.toArray(),...next.toArray());for(let n=0;n<2;n++)hairColours.push(colour.r,colour.g,colour.b);old=next;}}}
}
function cord(curve,radius,name,height=.007){const length=curve.getLength(),steps=Math.max(8,Math.ceil(length/(3*S))),points=[];for(let i=0;i<=steps;i++){const p=curve.getPointAt(i/steps);p.z+=height*3;points.push(p);}filament(points,radius*S,name);}
function satin(curve,width,name,height=.008){const length=curve.getLength(),count=Math.ceil(length/(1.15*S));for(let i=0;i<count;i++){const t=(i+.5)/count,centre=curve.getPointAt(t),tangent=curve.getTangentAt(t),normal=new T.Vector3(-tangent.y,tangent.x,0).normalize(),points=[];for(let j=0;j<=16;j++){const f=j/16,p=centre.clone().addScaledVector(normal,(f-.5)*width*S);p.z=height*3+Math.sin(f*Math.PI)*.0012+Math.sin(i*1.71)*.00008;points.push(p);}filament(points,.68*S,name,i*.31);} // One dye per yarn; no contrasting warp or hidden brown body.
 for(const sign of [-1,1]){const points=[];for(let i=0;i<=Math.ceil(length/(3*S));i++){const t=i/Math.ceil(length/(3*S)),p=curve.getPointAt(t),n=curve.getTangentAt(t);p.add(new T.Vector3(-n.y,n.x,0).multiplyScalar(sign*(width/2-.5)*S));p.z=height*3+.0015;points.push(p);}filament(points,1.1*S,name);}}
function lattice(x,y,width,height,name,spacing=24,crosses=false){for(let xx=x;xx<=x+width;xx+=spacing)cord(poly([[xx,y],[xx,y+height]]),1.05,name,.004);for(let yy=y;yy<=y+height;yy+=spacing)cord(poly([[x,yy],[x+width,yy]]),1.05,name,.006);if(crosses)for(let xx=x;xx<x+width;xx+=spacing)for(let yy=y;yy<y+height;yy+=spacing){cord(poly([[xx+2,yy+2],[xx+spacing-2,yy+spacing-2]]),.65,'ivory',.007);cord(poly([[xx+spacing-2,yy+2],[xx+2,yy+spacing-2]]),.65,'ivory',.007);}}
// Open lattice foundations are strands, not an opaque fabric underneath.
lattice(38,210,195,210,'rust',26);lattice(225,75,145,360,'gold',26);lattice(392,195,275,245,'rust',29,true);lattice(236,510,260,235,'gold',24);lattice(45,700,210,215,'rust',28,true);lattice(335,790,285,310,'rust',26,true);lattice(58,1000,190,200,'gold',28);
// Hand-traced motif layout: nested arches, returning curves and stitched coils.
satin(arch(50,82,190,413,376),20,'rust');satin(arch(74,106,143,390,352),17,'gold');satin(arch(97,130,96,376,331),14,'gold');
satin(poly([[254,32],[254,282],[259,385],[290,428],[338,435],[360,403],[358,330],[359,220],[399,120],[478,72],[577,72],[637,118],[652,205]]),28,'ivory');
satin(poly([[306,80],[291,198],[291,310],[306,350],[337,349],[338,300],[340,218],[386,161],[445,144]]),27,'teal');
satin(arch(346,282,321,954,782),27,'rust',.010);satin(arch(376,311,262,912,756),23,'gold',.012);satin(arch(405,340,204,879,724),26,'ivory',.014);satin(arch(437,373,142,844,692),25,'teal',.016);
satin(poly([[20,424],[61,396],[113,392],[159,420],[179,470],[175,548],[161,635],[131,710],[115,778],[132,828],[184,846],[235,829],[256,784],[255,727],[233,690],[198,677]]),34,'gold',.012);
satin(poly([[21,456],[66,435],[104,441],[128,481],[124,549],[102,627],[77,700],[69,772],[84,837],[127,881],[184,896],[246,872],[284,826],[292,755],[272,694],[227,654]]),35,'teal',.012);
satin(poly([[9,522],[34,540],[61,548],[87,534],[90,499],[77,480],[51,484],[45,508],[58,518]]),16,'ivory',.014);
satin(poly([[180,554],[174,610],[179,652],[212,679],[267,677],[300,638],[305,568],[302,511],[314,467],[354,439],[403,427]]),29,'rust',.015);
satin(poly([[212,560],[209,604],[224,628],[249,625],[267,605],[268,545],[270,502],[301,464],[345,451]]),24,'ivory',.017);
satin(poly([[641,434],[610,448],[588,482],[592,520],[625,541],[662,531],[684,503],[683,461],[654,436],[621,428],[584,443],[564,478],[563,536],[590,579],[637,596],[682,578]]),30,'teal',.018);
satin(poly([[647,465],[630,475],[627,498],[642,509],[656,501],[657,482],[644,471]]),15,'gold',.021);
satin(poly([[682,611],[632,615],[596,651],[584,710],[586,774],[609,817],[653,828],[689,807]]),27,'rust',.020);
satin(poly([[680,652],[643,653],[622,682],[619,735],[633,765],[662,767],[680,752]]),23,'gold',.022);
satin(arch(354,908,318,1230,1230),28,'teal',.014);satin(arch(387,942,251,1230,1230),24,'ivory',.017);satin(arch(417,971,189,1230,1230),25,'rust',.020);satin(arch(450,1003,123,1230,1230),25,'teal',.023);
satin(poly([[15,918],[43,924],[65,951],[66,996],[91,1014],[116,1005],[121,976],[108,954],[82,948],[52,963],[43,1001],[61,1048],[105,1079],[159,1070],[192,1030],[193,968]]),31,'gold',.013);
satin(poly([[22,1061],[45,1121],[87,1170],[141,1190],[198,1170],[231,1124],[235,1059],[223,1009]]),29,'teal',.016);
satin(poly([[22,1124],[48,1177],[100,1216],[165,1220],[224,1186],[260,1139],[267,1085],[262,1025]]),25,'ivory',.018);
satin(poly([[299,675],[322,703],[329,746],[322,797],[298,847],[279,898],[285,947],[309,987],[337,1004]]),23,'rust',.019);
function disc(x,y,r,name,z=.022){for(let dy=-r+1;dy<r;dy+=1.2){const span=Math.sqrt(r*r-dy*dy);cord(poly([[x-span,y+dy],[x+span,y+dy]]),.68,name,z+.003*Math.sqrt(1-dy*dy/(r*r)));}}
disc(516,522,35,'rust',.020);disc(646,490,17,'gold',.024);disc(510,1083,31,'teal',.025);
// Shallow, thin perimeter stitches keep the entire portrait visible and unfolded.
const hem=new T.CurvePath();for(const [a,b] of [[[18,16],[18,1238]],[[18,1238],[694,1238]],[[694,1238],[694,16]]])hem.add(new T.LineCurve3(P(...a),P(...b)));cord(hem,1.1,'rust',.003);
const microCanvas=document.createElement('canvas');microCanvas.width=512;microCanvas.height=256;const microContext=microCanvas.getContext('2d'),micro=microContext.createImageData(512,256);for(let y=0;y<256;y++)for(let x=0;x<512;x++){const value=145+14*Math.sin(y*.9+x*.4)+8*Math.sin(y*4.5-x*.1)+4*Math.sin(x*31.7+y*19.2),j=(y*512+x)*4;micro.data.set([value,value,value,255],j);}microContext.putImageData(micro,0,0);const fibreBump=new T.CanvasTexture(microCanvas);fibreBump.wrapS=fibreBump.wrapT=T.RepeatWrapping;fibreBump.repeat.set(3,1);fibreBump.anisotropy=16;
for(const [name,b] of Object.entries(bins)){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setIndex(b.i);g.computeVertexNormals();const m=new T.MeshPhysicalMaterial({color:palette[name],roughness:.98,bumpMap:fibreBump,bumpScale:.00012,sheen:.45,sheenColor:palette[name],sheenRoughness:.85,side:T.DoubleSide});const mesh=new T.Mesh(g,m);mesh.castShadow=mesh.receiveShadow=true;textile.add(mesh);b.p.length=b.uv.length=b.i.length=0;}
const hg=new T.BufferGeometry();hg.setAttribute('position',new T.Float32BufferAttribute(hairs,3));hg.setAttribute('color',new T.Float32BufferAttribute(hairColours,3));textile.add(new T.LineSegments(hg,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.26,depthWrite:false})));
let pending=false;
function render(){if(pending)return;pending=true;requestAnimationFrame(()=>{renderer.render(scene,camera);pending=false;document.querySelector('#stage').dataset.ready='true';});}
function resize(){renderer.setSize(innerWidth,innerHeight);const aspect=innerWidth/innerHeight,viewHeight=Math.max(H+.4,(W+.35)/aspect);camera.left=-viewHeight*aspect/2;camera.right=viewHeight*aspect/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();render();}
controls.addEventListener('change',render);window.addEventListener('resize',resize);
document.querySelector('#zoomIn').onclick=()=>{camera.zoom=Math.min(12,camera.zoom*1.5);camera.updateProjectionMatrix();render()};document.querySelector('#zoomOut').onclick=()=>{camera.zoom=Math.max(1,camera.zoom/1.5);camera.updateProjectionMatrix();render()};document.querySelector('#fitFabric').onclick=()=>{controls.target.set(0,0,0);camera.position.set(0,0,7);camera.zoom=1;camera.updateProjectionMatrix();controls.update();render()};
document.querySelector('#light').oninput=e=>{renderer.toneMappingExposure=Number(e.target.value);render()};
document.querySelector('#saveFabric').onclick=()=>{const max=Math.min(4096,renderer.capabilities.maxTextureSize),target=new T.WebGLRenderTarget(Math.round(max*W/H),max);target.texture.colorSpace=T.SRGBColorSpace;const c=new T.OrthographicCamera(-W/2-.02,W/2+.02,H/2+.02,-H/2-.02,.1,30);c.position.set(0,0,7);c.lookAt(0,0,0);renderer.setRenderTarget(target);renderer.render(scene,c);const bytes=new Uint8Array(target.width*target.height*4);renderer.readRenderTargetPixels(target,0,0,target.width,target.height,bytes);renderer.setRenderTarget(null);const out=document.createElement('canvas');out.width=target.width;out.height=target.height;const ctx=out.getContext('2d'),data=ctx.createImageData(out.width,out.height);for(let y=0;y<out.height;y++)data.data.set(bytes.subarray((out.height-1-y)*out.width*4,(out.height-y)*out.width*4),y*out.width*4);ctx.putImageData(data,0,0);target.dispose();out.toBlob(blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='strand-material-study.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)});render()};
resize();
