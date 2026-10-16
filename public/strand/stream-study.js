import {updateMemoryUI} from './camera-ui.js?v=123';
import {captureWindow} from './camera-framing.js?v=120';
import * as StrandWeaving from './weaving-patterns.js?v=120';
globalThis.StrandWeaving=StrandWeaving;
import {CarpetScroll} from './carpet-scroll.js?v=120';
import {FIRST_PRINT_LENGTH,NEXT_PRINT_LENGTH} from './print-sections.js?v=120';
import {FloorReturn} from './floor-return.js?v=120';
import {LoomAudio} from './loom-audio.js?v=120';
import {PhotoRugBridge} from './photo-rug-bridge.js?v=120';
import {preparePhotoPalette} from './photo-colours.js?v=120';
import {TLRViewfinder} from './tlr-viewfinder.js?v=120';
import {streamDeviceProfile} from './stream-device-profile.js?v=120';
const deviceProfile=streamDeviceProfile();
import * as T from 'three';
import {createStreamPerformance} from './stream-performance.js?v=120';
import {createStreamPipeline} from './stream-render-pipeline.js?v=120';
import { loadRoomEnvironment } from './room-lighting.js?v=120';
import { addTextileLights } from './textile-light-rig.js?v=120';
import { StreamCloth } from './stream-cloth.js?v=120';
import { installClothInteraction } from './stream-interaction.js?v=120';
import { FramePacer } from './frame-pacer.js?v=120';
const stage=document.querySelector('#stage'),status=document.querySelector('#photoStatus'),capture=document.querySelector('#capture'),video=document.querySelector('#viewfinder'),preview=document.querySelector('#preview');
const renderer=new T.WebGLRenderer({antialias:false,depth:false,stencil:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,deviceProfile.canvasDpr));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1.0;renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;stage.append(renderer.domElement);
const scene=new T.Scene();scene.background=null;renderer.setClearColor(0x141414,0);const camera=new T.PerspectiveCamera(32,innerWidth/innerHeight,.03,40);camera.up.set(0,0,1);
const cameraTarget=new T.Vector3();
const pipeline=createStreamPipeline(renderer,scene,camera,{...deviceProfile,paperBackground:true});
pipeline.paperReady.then(()=>render(true));
const diagnostics=new URLSearchParams(location.search).get('perf')==='1'?createStreamPerformance():null;if(diagnostics)window.strandPerformance=()=>diagnostics.report(cloth.sim,pipeline);
const upstairs=new FloorReturn(stage,capture,()=>openCapture());
const printQueue=[];const bridge=new PhotoRugBridge(stage);const audio=new LoomAudio();let processingPhoto=false,flowVersion=0;
let scroller,scrollVersion=-1;
let printPreviewReady=null;
let cloth,ready=false,pending=false,last=0,sceneDirty=true,media=null,selected=null,selecting=false,cameraRequest=0,cameraFacing='environment',switchingCamera=false;const pacer=new FramePacer(120);
function fit(){if(cloth)cloth.viewportTick=0;cameraTarget.set(0,-.8,1.5);camera.position.set(0,-7.4*Math.max(1,.48/camera.aspect),1.5);camera.lookAt(cameraTarget);camera.updateMatrixWorld();scroller?.refresh();render(true);}
function render(force=false){if(force===true)sceneDirty=true;if(pending||document.hidden)return;pending=true;requestAnimationFrame(frame);}
let shadowClock=0;
function frame(time){pending=false;if(document.hidden||(!capture.hidden&&!capture.classList.contains('flipped')&&!capture.classList.contains('returning-upstairs'))){last=0;return;}if(!pacer.accept(time)){render();return;}const dt=last?Math.min((time-last)/1000,.05):1/60;last=time;const updateStarted=diagnostics?performance.now():0;if(cloth&&printQueue.length&&(capture.hidden||capture.classList.contains('capture-bridging'))&&cloth.canStartPhoto())cloth.addPhoto(printQueue.shift());const changed=cloth?.update(dt,camera);if(scroller&&cloth.version!==scrollVersion){scrollVersion=cloth.version;scroller.reset();scroller.refresh();updateMemoryCount();}audio.setMode(cloth?.print?'printing':processingPhoto?'processing':'idle');shadowClock+=dt;if(changed&&shadowClock>1/30){renderer.shadowMap.needsUpdate=true;shadowClock=0;}const updateMs=diagnostics?performance.now()-updateStarted:0;const shouldDraw=changed||sceneDirty;if(shouldDraw)renderer.info.reset();const submitStarted=diagnostics?performance.now():0;if(shouldDraw){pipeline.render();sceneDirty=false;if(printPreviewReady&&cloth.version>=printPreviewReady.version&&(!cloth.print||cloth.print.time>=1.65)){const pendingPreview=printPreviewReady;printPreviewReady=null;stage.dataset.printPreviewReady='true';pendingPreview.resolve();}}if(diagnostics)diagnostics.record(time,updateMs,performance.now()-submitStarted);if(ready&&shouldDraw){stage.dataset.ready='true';stage.dataset.simulation='guided';stage.dataset.deviceProfile=deviceProfile.name;stage.dataset.collisionBackend='none';stage.dataset.photoVersion=String(cloth.version);stage.dataset.weave=cloth.currentDraft?.id??'';stage.dataset.printing=String(!!cloth.print);stage.dataset.length=cloth.totalLength.toFixed(3);stage.dataset.activeLength=cloth.sim.length.toFixed(3);stage.dataset.retainedLength=Math.max(0,cloth.totalLength-cloth.sim.length).toFixed(3);stage.dataset.clothActive=String(cloth.sim.active);stage.dataset.triangles=String(renderer.info.render.triangles);stage.dataset.drawCalls=String(renderer.info.render.calls);stage.dataset.cameraDistance=camera.position.distanceTo(cameraTarget).toFixed(3);stage.dataset.room='charcoal-paper';stage.dataset.scrollOffset=cloth.scrollOffset.toFixed(3);stage.dataset.mode=capture.hidden?'printing':'capture';const label=cloth.print?'Weaving your colours · '+Math.round(Math.min(1,cloth.print.time/cloth.print.duration)*100)+'%':'Scroll down to explore · drag sideways to play.';const labelNode=document.querySelector('#printingStatus');if(labelNode.textContent!==label)labelNode.textContent=label;}
 if(cloth?.sim.active||cloth?.print||printQueue.length)render();else last=0;
}
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();pipeline.resize(innerWidth,innerHeight);if(cloth)cloth.viewportTick=0;scroller?.refresh();render(true);});
const lens=document.querySelector('.lens');
const finder=new TLRViewfinder(lens,video),shell=document.querySelector('.camera-shell'),shutter=document.querySelector('#shutter'),secondFloor=document.querySelector('#secondFloor');
const switchCamera=document.querySelector('#switchCamera');
document.addEventListener('machinera-about',event=>{finder.suspended=event.detail.open;});
function updateMemoryCount(){updateMemoryUI(cloth?.version??0);}
async function startCamera(facing=cameraFacing){const request=++cameraRequest;let next;try{
 next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1920},height:{ideal:1440}},audio:false});
 if(capture.hidden||capture.classList.contains('flipped')||request!==cameraRequest){next.getTracks().forEach(t=>t.stop());return false;}
 media=next;video.srcObject=next;await video.play();if(request!==cameraRequest){next.getTracks().forEach(t=>t.stop());return false;}
 cameraFacing=next.getVideoTracks()[0]?.getSettings?.().facingMode||facing;finder.start();finder.suspended=document.querySelector('#aboutDialog').open;shell.classList.add('has-camera');shell.dataset.camera='live';shell.dataset.facing=cameraFacing;switchCamera.setAttribute('aria-label',cameraFacing==='environment'?'Switch to front camera':'Switch to rear camera');return true;
 }catch{next?.getTracks().forEach(t=>t.stop());if(request===cameraRequest){if(media===next)media=null;video.srcObject=null;shell.dataset.camera='file';}return false;}}
switchCamera.onclick=async()=>{if(!ready||processingPhoto||switchingCamera||capture.hidden||bridge.active)return;const previous=cameraFacing;switchingCamera=true;switchCamera.disabled=true;shutter.disabled=true;lens.setAttribute('aria-disabled','true');stopCamera();try{const started=await startCamera(previous==='environment'?'user':'environment');if(!started&&!capture.hidden&&!bridge.active&&!processingPhoto)await startCamera(previous);}finally{switchingCamera=false;if(!capture.hidden&&!bridge.active&&!processingPhoto){switchCamera.disabled=false;shutter.disabled=!ready;lens.setAttribute('aria-disabled',String(!ready));}}};
function stopCamera(){cameraRequest++;finder.stop();media?.getTracks().forEach(t=>t.stop());media=null;video.srcObject=null;shell.classList.remove('has-camera');}
async function openCapture(){flowVersion++;if(printPreviewReady){printPreviewReady.resolve();printPreviewReady=null;}processingPhoto=false;audio.stop();stopCamera();capture.hidden=false;capture.classList.remove('flipped','capture-frozen','capture-departing','capture-bridging');bridge.dispose();cameraTarget.z=1.5;camera.position.z=1.5;camera.lookAt(cameraTarget);camera.updateMatrixWorld();capture.dataset.captureState='capturing';updateMemoryCount();stage.classList.remove('room-entering');stage.classList.add('behind-camera');selected=null;preview.hidden=true;shutter.hidden=false;shell.classList.remove('photo-ready','processing');shutter.disabled=!ready;secondFloor.disabled=!ready;lens.setAttribute('aria-disabled',String(!ready));await startCamera();}
async function closeCapture(prepared=Promise.resolve(),onPrepared=()=>{}){
 if(capture.hidden||bridge.active)return;const version=flowVersion;secondFloor.disabled=true;
 if(!selected&&media&&video.videoWidth){preview.width=video.videoWidth;preview.height=video.videoHeight;preview.getContext('2d').drawImage(video,0,0);preview.hidden=false;}
 stopCamera();capture.dataset.captureState='transition';stage.classList.remove('behind-camera','room-entering');
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
  const section=cloth.version===0?FIRST_PRINT_LENGTH:NEXT_PRINT_LENGTH;
  const complete=bridge.begin(preview,lens,section,{feed:!!(processingPhoto&&selected),prepared,onPrepared});capture.classList.add('flipped','capture-bridging');render(true);await complete;
 }else{capture.classList.add('flipped','capture-bridging');await prepared;await onPrepared();render(true);await new Promise(resolve=>requestAnimationFrame(resolve));}
 if(version!==flowVersion)return;capture.hidden=true;capture.dataset.captureState='printing';render(true);
}
secondFloor.onclick=()=>{if(ready&&!processingPhoto&&!upstairs.active)closeCapture();};
document.querySelector('#firstFloor').onclick=()=>{if(ready&&!processingPhoto&&!bridge.active&&!upstairs.active){upstairs.pull(0);upstairs.end(true);}};
async function commit(){if(!selected||!ready||processingPhoto)return;const source=selected,version=flowVersion;processingPhoto=true;secondFloor.disabled=true;lens.setAttribute('aria-disabled','true');shell.classList.add('processing');audio.setMode('processing');try{const preparation=preparePhotoPalette(source,{onProgress:p=>{capture.dataset.processing=String(Math.round(p*100));}});let prepared;const resolved=preparation.then(value=>{prepared=value;});await closeCapture(resolved,()=>{if(version!==flowVersion)return;stage.dataset.sourcePixels=String(prepared.sourcePixelCount);stage.dataset.processedPixels=String(prepared.processedPixelCount);stage.dataset.dyeLots=String(prepared.palette?.length??0);scroller?.reset();const visibleFrame=new Promise(resolve=>{printPreviewReady={version:cloth.version+printQueue.length+1,resolve};});stage.dataset.printPreviewReady='false';printQueue.push(prepared);render(true);return visibleFrame;});await preparation;if(version!==flowVersion)return;selected=null;capture.dataset.captureState='printing';render(true);}catch(error){bridge.dispose();if(version===flowVersion){capture.hidden=false;capture.classList.remove('flipped','capture-bridging');stage.classList.add('behind-camera');status.textContent='This photo could not be processed. Tap to try another photo.';status.hidden=false;selected=null;capture.classList.remove('capture-frozen');preview.hidden=true;shutter.hidden=false;shutter.disabled=false;secondFloor.disabled=false;lens.setAttribute('aria-disabled','false');capture.dataset.captureState='capturing';}console.error(error);}finally{if(version===flowVersion){processingPhoto=false;shell.classList.remove('processing');if(!cloth?.print)audio.stop();}}}
function selectImage(image){if(processingPhoto)return;const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height,aspect=document.querySelector('.lens').clientWidth/document.querySelector('.lens').clientHeight;let w=width,h=height;if(w/h>aspect)w=h*aspect;else h=w/aspect;selected=image;preview.width=Math.round(Math.min(w,1536));preview.height=Math.round(preview.width/aspect);const ctx=preview.getContext('2d');const optics=finder.renderer?.domElement;if(optics&&optics.width){finder.resize();finder.renderer.render(finder.scene,finder.camera);ctx.drawImage(optics,0,0,preview.width,preview.height);}else ctx.drawImage(image,(width-w)/2,(height-h)/2,w,h,0,0,preview.width,preview.height);stopCamera();preview.hidden=false;shutter.hidden=true;capture.classList.add('capture-frozen');capture.dataset.captureState='frozen';shell.classList.add('photo-ready');audio.shutter();commit();}
shutter.onclick=()=>{if(!ready||processingPhoto||switchingCamera)return;audio.unlock();if(video.srcObject&&video.videoWidth){const c=document.createElement('canvas');const crop=captureWindow(video.videoWidth,video.videoHeight,lens.clientWidth,lens.clientHeight);c.width=Math.round(crop.width);c.height=Math.round(crop.height);c.getContext('2d').drawImage(video,crop.x,crop.y,crop.width,crop.height,0,0,c.width,c.height);selectImage(c);}else document.querySelector('#cameraPhoto').click();};
async function selectFile(file){if(!file||selecting)return;selecting=true;const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();selectImage(image);}catch{status.textContent='Unable to open this photo.';}finally{selecting=false;URL.revokeObjectURL(url);}}
for(const id of ['photoFile','cameraPhoto'])document.querySelector('#'+id).onchange=e=>{selectFile(e.target.files?.[0]);e.target.value='';};

let touchOrigin=null,ignoreLensClick=false;
lens.addEventListener('pointerdown',e=>{touchOrigin={x:e.clientX,y:e.clientY};ignoreLensClick=false;});
lens.addEventListener('pointerup',e=>{if(touchOrigin)ignoreLensClick=Math.hypot(e.clientX-touchOrigin.x,e.clientY-touchOrigin.y)>14;touchOrigin=null;});
lens.addEventListener('pointercancel',()=>{touchOrigin=null;ignoreLensClick=true;});
lens.addEventListener('click',e=>{if((e.detail===0||!ignoreLensClick)&&ready&&!processingPhoto&&!capture.hidden&&!shutter.disabled)shutter.click();});
lens.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();lens.click();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!processingPhoto&&!upstairs.active){if(capture.hidden)openCapture();else closeCapture();}});
window.addEventListener('pagehide',()=>{stopCamera();scroller?.stop();bridge.dispose();if(upstairs.active)upstairs.cleanup();audio.dispose();});document.addEventListener('visibilitychange',()=>{if(document.hidden){scroller?.stop();if(upstairs.active)upstairs.cleanup();audio.stop();stopCamera();cloth?.sim.release();last=0;}else if(!capture.hidden&&!selected&&!processingPhoto)openCapture();else render();});
const params=new URLSearchParams(location.search);if(params.get('room')==='1'||params.get('perf')==='1')capture.hidden=true;else openCapture();
try{status.hidden=false;status.textContent='Preparing your loom…';scene.environment=await loadRoomEnvironment(renderer);addTextileLights(scene);cloth=new StreamCloth(scene,renderer);await cloth.load();scroller=new CarpetScroll(document.querySelector('#carpetScroll'),document.querySelector('#carpetLength'),cloth,camera,()=>render(true));installClothInteraction({canvas:renderer.domElement,camera,cloth,render,scroll:scroller,onReturnPull:distance=>{if(ready&&!processingPhoto&&!bridge.active){upstairs.pull(distance);render();}},onReturnEnd:commit=>upstairs.end(commit),onInteraction:type=>{stage.dataset.lastInteraction=type;}});await cloth.start(render);
// Compile the initially hidden textile before enabling capture.
// Otherwise the first print's shader compilation stalls the camera-to-room pan.
cameraTarget.set(0,-.8,1.5);camera.position.set(0,-7.4*Math.max(1,.48/camera.aspect),1.5);camera.lookAt(cameraTarget);camera.updateMatrixWorld();
const warmSurfaceVisible=cloth.surface.visible;cloth.surface.visible=true;cloth.yarn.setVisible(true);
await renderer.compileAsync(scene,camera);renderer.shadowMap.needsUpdate=true;pipeline.render();
cloth.surface.visible=warmSurfaceVisible;cloth.yarn.setVisible(warmSurfaceVisible);renderer.shadowMap.needsUpdate=true;pipeline.render();
// Reuse the exact room paper render as a static upstairs backdrop. One startup
// readback; no second background renderer or animated texture uploads.
await pipeline.paperReady;pipeline.render();
try{capture.style.setProperty('--camera-paper',`url("${renderer.domElement.toDataURL('image/jpeg',.9)}")`);}catch{/* The charcoal base remains available if canvas export is unavailable. */}

await new Promise(resolve=>requestAnimationFrame(resolve));stage.dataset.pipelineWarmed='true';sceneDirty=false;
stage.dataset.simulation='guided';ready=true;stage.dataset.ready="true";shutter.disabled=false;secondFloor.disabled=false;lens.setAttribute('aria-disabled','false');renderer.shadowMap.needsUpdate=true;status.hidden=true;fit();}catch(error){stage.dataset.error=error.message;status.hidden=false;status.textContent='The loom could not load. Please reload.';console.error(error);}
