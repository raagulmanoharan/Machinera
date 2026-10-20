import {setupMemoryDetail} from './memory-detail.js?v=220';
import {setupMemoryGallery} from './memory-gallery.js?v=230';
import {setupLoomControls} from './loom-controls.js?v=220';
import {MemoryStore} from './memory-store.js?v=201';
import {updateMemoryUI} from './camera-ui.js?v=156';
import {capturePhotoSource} from './camera-framing.js?v=180';
import * as StrandWeaving from './weaving-patterns.js?v=230';
globalThis.StrandWeaving=StrandWeaving;
import {CarpetScroll} from './carpet-scroll.js?v=224';
import {FIRST_PRINT_LENGTH} from './print-sections.js?v=156';
import {LoomAudio} from './loom-audio.js?v=229';
import {PhotoRugBridge} from './photo-rug-bridge.js?v=229';
import {preparePhotoPalette} from './photo-colours.js?v=196';
import {TLRViewfinder} from './tlr-viewfinder.js?v=156';
import {streamDeviceProfile} from './stream-device-profile.js?v=156';
const deviceProfile=streamDeviceProfile();
import * as T from 'three';
import {createStreamPerformance} from './stream-performance.js?v=156';
import {createStreamPipeline} from './stream-render-pipeline.js?v=156';
import { loadRoomEnvironment } from './room-lighting.js?v=156';
import { addTextileLights } from './textile-light-rig.js?v=156';
import { StreamCloth } from './stream-cloth.js?v=230';
import { FramePacer } from './frame-pacer.js?v=156';
const stage=document.querySelector('#stage'),status=document.querySelector('#photoStatus'),capture=document.querySelector('#capture'),video=document.querySelector('#viewfinder'),preview=document.querySelector('#preview');
const renderer=new T.WebGLRenderer({antialias:false,depth:false,stencil:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,deviceProfile.canvasDpr));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1.0;renderer.info.autoReset=false;renderer.shadowMap.enabled=false;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;stage.append(renderer.domElement);
const scene=new T.Scene();scene.background=null;renderer.setClearColor(0x141414,0);const camera=new T.PerspectiveCamera(32,innerWidth/innerHeight,.03,40);camera.up.set(0,0,1);
const cameraTarget=new T.Vector3();
const pipeline=createStreamPipeline(renderer,scene,camera,{...deviceProfile,paperBackground:true});
pipeline.paperReady.then(()=>render(true));
const diagnostics=new URLSearchParams(location.search).get('perf')==='1'?createStreamPerformance():null;if(diagnostics)window.strandPerformance=()=>diagnostics.report(cloth.sim,pipeline);
const memories=new MemoryStore();
function storageFailure(error){const message='This browser could not save memories. Existing saved memories have not been deleted.';stage.dataset.storage='unavailable';const notice=document.querySelector('#storageNotice');notice.textContent=message;notice.hidden=false;document.querySelector('#privacyNote').textContent='Photos are processed on your device, never uploaded or saved. Saving woven memories is unavailable in this browser session.';console.warn('Local memory storage:',error?.name||'unavailable');}
const savedMemories=memories.load().catch(error=>{storageFailure(error);return[];});
const printQueue=[];const bridge=new PhotoRugBridge(stage);const audio=new LoomAudio();let processingPhoto=false,flowVersion=0;
const soundButton=document.querySelector('#soundToggle');
function updateSound(){soundButton.setAttribute('aria-pressed',String(audio.enabled));soundButton.setAttribute('aria-label',audio.enabled?'Mute sound':'Enable sound');soundButton.dataset.enabled=String(audio.enabled);}
// Attempt launch playback; gesture listeners retry when browser autoplay is blocked.
const warmAudio=()=>{if(!processingPhoto)audio.unlock();};
setTimeout(warmAudio,0);
soundButton.onclick=()=>{audio.setEnabled(!audio.enabled);updateSound();};updateSound();
// Safari may require a deliberate touch before allowing the launch score.
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#soundToggle'))audio.unlock();},{passive:true});
document.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')audio.unlock();});
let scroller,scrollVersion=-1,savingMemory=false;const recordIds=[];
const saveMemory=document.querySelector('#saveMemory'),postcardDialog=document.querySelector('#postcardDialog'),postcardPreview=document.querySelector('#postcardPreview'),postcardStatus=document.querySelector('#postcardStatus'),postcardDownload=document.querySelector('#postcardDownload');let postcard=null,postcardURL=null,postcardVersion=0;
const clearPostcard=()=>{postcardVersion++;postcard=null;if(postcardURL)URL.revokeObjectURL(postcardURL);postcardURL=null;postcardPreview.removeAttribute('src');postcardPreview.hidden=true;postcardDownload.disabled=true;};
document.querySelector('#postcardClose').onclick=()=>postcardDialog.close();postcardDialog.addEventListener('close',()=>{memoryDetail.close();clearPostcard();gallery.resume();render(true);});postcardDialog.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation();});
const memoryDetail=setupMemoryDetail({renderer,pipeline,camera,getCloth:()=>cloth,render,downloadButton:postcardDownload,onFlip:()=>audio.startFlip()});
function openMemoryDetail(selection){clearPostcard();postcardStatus.hidden=true;postcardDialog.style.setProperty('--camera-paper',capture.style.getPropertyValue('--camera-paper'));postcardDialog.setAttribute('aria-label',selection.label);postcardDialog.showModal();try{memoryDetail.open(selection);}catch(error){memoryDetail.close();postcardStatus.hidden=false;postcardStatus.textContent='Could not open this memory. Please try again.';}}
async function openPostcard(){postcardDownload.setAttribute('aria-label','Download story');postcardDownload.querySelector('svg').innerHTML='<path d="M12 3v11m-4-4 4 4 4-4M5 16v5h14v-5"/>';if(!ready||processingPhoto||bridge.active||cloth.print||loomControls.busy||!cloth.archive.entries.length)return;audio.saveClick();clearPostcard();const token=postcardVersion;postcardStatus.hidden=false;postcardStatus.textContent='Preparing memory…';postcardDialog.style.setProperty('--camera-paper',capture.style.getPropertyValue('--camera-paper'));postcardDialog.showModal();postcardDialog.focus({preventScroll:true});
 try{const [{createMemoryPostcard},{captureMemoryThumbnail}]=await Promise.all([import('./memory-postcard.js?v=201'),import('./postcard-capture.js?v=220')]);const q=Math.max(0,cloth.visibleHead-(cloth.sim.top-camera.position.z)),located=cloth.archive.locateMaterial(q),entry=located.entry;const result=await createMemoryPostcard({archive:cloth.archive,entry,index:located.index,renderThumbnail:(entry,options)=>captureMemoryThumbnail({renderer,pipeline,camera,cloth,entry,...options})});if(token!==postcardVersion)return;postcard=result;postcardURL=URL.createObjectURL(result.blob);postcardPreview.src=postcardURL;postcardPreview.alt=`Memory ${result.details.number}, ${result.details.weave}`;postcardPreview.hidden=false;postcardStatus.hidden=true;postcardDownload.disabled=false;
 }catch(error){if(token===postcardVersion){postcardStatus.textContent='Could not create this postcard. Please try again.';}console.warn('Postcard:',error);}}
const gallery=setupMemoryGallery({store:memories,capture,render,onSelect:openMemoryDetail,canRender:()=>!postcardDialog.open,onOpen:()=>stopCamera(),onCamera:()=>openCapture(),thumbnail:async(entry,archive)=>{const {captureMemoryThumbnail}=await import('./postcard-capture.js?v=220');if(!gallery.isOpen)throw new Error('Gallery closed');return captureMemoryThumbnail({renderer,pipeline,camera,cloth,entry,archive,gallery:true});}});
saveMemory.onclick=async()=>{if(!ready||savingMemory||processingPhoto||cloth?.print||loomControls.busy)return;savingMemory=true;loomControls.sync();try{const entry=cloth.archive.entries.at(-1),index=recordIds.length-1,id=recordIds[index];if(id==null)recordIds[index]=await memories.save(entry);else await memories.changeLast(id,entry);audio.saveClick();await gallery.open();}catch(error){storageFailure(error);}finally{savingMemory=false;loomControls.sync();render(true);}};
document.querySelector('#downloadMemory').onclick=()=>openPostcard();
postcardDownload.onclick=async()=>{
 if(memoryDetail.isOpen){const selection=memoryDetail.selection;clearPostcard();const token=postcardVersion;
  try{const [{createMemoryPostcard},{captureMemoryThumbnail}]=await Promise.all([import('./memory-postcard.js?v=201'),import('./postcard-capture.js?v=220')]);if(token!==postcardVersion)return;const result=await createMemoryPostcard({...selection,renderThumbnail:(entry,options)=>captureMemoryThumbnail({renderer,pipeline,camera,cloth,entry,archive:selection.archive,...options})});if(token!==postcardVersion)return;postcard=result;postcardURL=URL.createObjectURL(result.blob);}
  catch(error){if(token===postcardVersion){postcardStatus.hidden=false;postcardStatus.textContent='Could not download this memory. Please try again.';}return;}
  finally{if(token===postcardVersion)postcardDownload.disabled=false;}
 }
 if(!postcard)return;audio.saveClick();const link=document.createElement('a');link.href=postcardURL;link.download=postcard.filename;link.click();
};
let printPreviewReady=null;
let cloth,ready=false,pending=false,last=0,sceneDirty=true,media=null,selected=null,selecting=false,cameraRequest=0,cameraFacing='environment',switchingCamera=false;const pacer=new FramePacer(120);
function fit(){if(cloth)cloth.viewportTick=0;cameraTarget.set(0,-.8,1.5);camera.position.set(0,-.19-Math.max(FIRST_PRINT_LENGTH/.68,(cloth?.sim.width??1.5)/(camera.aspect*.8))/(2*Math.tan(camera.fov*Math.PI/360)),1.5);camera.lookAt(cameraTarget);camera.updateMatrixWorld();scroller?.refresh();render(true);}
function render(force=false){if(force===true)sceneDirty=true;if(pending||document.hidden)return;pending=true;requestAnimationFrame(frame);}

function frame(time){pending=false;if(memoryDetail.isOpen){if(!document.hidden)memoryDetail.frame(time);last=0;return;}if(postcardDialog.open||gallery.isOpen){audio.setPrinting(false);last=0;return;}if(document.hidden||(!capture.hidden&&!capture.classList.contains('flipped'))){last=0;return;}if(!pacer.accept(time)){render();return;}const dt=last?Math.min((time-last)/1000,.05):1/60;last=time;const updateStarted=diagnostics?performance.now():0;if(cloth&&printQueue.length&&(capture.hidden||capture.classList.contains('capture-bridging'))&&cloth.canStartPhoto()){const input=printQueue.shift();cloth.addPhoto(input);if(bridge.active){cloth.print.hold=true;cloth.print.preview=true;}savingMemory=true;const recordIndex=recordIds.length;recordIds.push(null);memories.save(cloth.archive.entries.at(-1)).then(id=>{recordIds[recordIndex]=id;stage.dataset.storage='saved';}).catch(storageFailure).finally(()=>{savingMemory=false;loomControls.sync();});}const turning=loomControls.update(dt),feeding=cloth?.update(dt,camera),changed=turning||feeding;if(feeding)scroller?.refresh();audio.setPrinting(!!cloth?.print&&!cloth.print.hold);saveMemory.disabled=!ready||!!cloth?.print||processingPhoto;loomControls.sync();if(scroller&&cloth.version!==scrollVersion){scrollVersion=cloth.version;scroller.reset();scroller.refresh();updateMemoryCount();}const updateMs=diagnostics?performance.now()-updateStarted:0;const shouldDraw=changed||sceneDirty;if(shouldDraw)renderer.info.reset();const submitStarted=diagnostics?performance.now():0;if(shouldDraw){pipeline.render();sceneDirty=false;if(printPreviewReady&&cloth.version>=printPreviewReady.version&&(!cloth.print||cloth.print.hold)){const pendingPreview=printPreviewReady;printPreviewReady=null;stage.dataset.printPreviewReady='true';pendingPreview.resolve();}}if(diagnostics)diagnostics.record(time,updateMs,performance.now()-submitStarted);if(ready&&shouldDraw){stage.dataset.ready='true';stage.dataset.simulation='none';stage.dataset.deviceProfile=deviceProfile.name;stage.dataset.collisionBackend='none';stage.dataset.photoVersion=String(cloth.version);stage.dataset.weave=cloth.currentDraft?.id??'';stage.dataset.printing=String(!!cloth.print);stage.dataset.length=cloth.totalLength.toFixed(3);stage.dataset.activeLength=cloth.sim.length.toFixed(3);stage.dataset.retainedLength=Math.max(0,cloth.totalLength-cloth.sim.length).toFixed(3);stage.dataset.clothActive=String(cloth.sim.active);stage.dataset.triangles=String(renderer.info.render.triangles);stage.dataset.drawCalls=String(renderer.info.render.calls);stage.dataset.cameraDistance=camera.position.distanceTo(cameraTarget).toFixed(3);stage.dataset.room='charcoal-paper';stage.dataset.scrollOffset=cloth.scrollOffset.toFixed(3);stage.dataset.mode=capture.hidden?'printing':'capture';const label=cloth.print?'Weaving your colours · '+Math.round(Math.min(1,cloth.print.time/cloth.print.duration)*100)+'%':'Your woven memory is ready.';const labelNode=document.querySelector('#printingStatus');if(labelNode.textContent!==label)labelNode.textContent=label;}
 if(cloth?.print||printQueue.length||loomControls.busy)render();else last=0;
}
window.addEventListener('resize',()=>{if(memoryDetail.isOpen){memoryDetail.resize();return;}renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();pipeline.resize(innerWidth,innerHeight);if(cloth)cloth.viewportTick=0;scroller?.refresh();render(true);});
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
async function openCapture(){loomControls.reset();audio.setPrinting(false);if(cloth?.print)cloth.print.hold=false;flowVersion++;if(printPreviewReady){printPreviewReady.resolve();printPreviewReady=null;}processingPhoto=false;stopCamera();capture.hidden=false;capture.classList.remove('flipped','capture-frozen','capture-bridging');bridge.dispose();cameraTarget.z=1.5;camera.position.z=1.5;camera.lookAt(cameraTarget);camera.updateMatrixWorld();capture.dataset.captureState='capturing';updateMemoryCount();stage.classList.remove('room-entering');stage.classList.add('behind-camera');loomControls.sync();selected=null;preview.hidden=true;shutter.hidden=false;shell.classList.remove('photo-ready','processing');shutter.disabled=!ready;secondFloor.disabled=!ready;lens.setAttribute('aria-disabled',String(!ready));await startCamera();}
async function closeCapture(prepared=Promise.resolve(),onPrepared=()=>{}){
 if(capture.hidden||bridge.active)return;const version=flowVersion;secondFloor.disabled=true;
 stopCamera();capture.dataset.captureState='transition';stage.classList.remove('behind-camera','room-entering');
 const complete=bridge.begin(preview,lens,{source:selected??preview,prepared,onPrepared,getRugBounds:rugBounds,onScanStart:()=>audio.startScan()});capture.classList.add('flipped','capture-bridging');render(true);await complete;
 if(version!==flowVersion)return;if(cloth?.print?.preview)cloth.print=null;capture.hidden=true;capture.dataset.captureState='printing';loomControls.sync();render(true);
}
secondFloor.onclick=()=>{if(ready&&!processingPhoto)gallery.open();};

async function commit(){if(!selected||!ready||processingPhoto)return;const source=selected,version=flowVersion;processingPhoto=true;secondFloor.disabled=true;lens.setAttribute('aria-disabled','true');shell.classList.add('processing');try{const preparation=preparePhotoPalette(source,{onProgress:p=>{capture.dataset.processing=String(Math.round(p*100));}});let prepared;const resolved=preparation.then(value=>{prepared=value;return value;});await closeCapture(resolved,()=>{if(version!==flowVersion)return;stage.dataset.sourcePixels=String(prepared.sourcePixelCount);stage.dataset.processedPixels=String(prepared.processedPixelCount);stage.dataset.dyeLots=String(prepared.palette?.length??0);scroller?.reset();const visibleFrame=new Promise(resolve=>{printPreviewReady={version:cloth.version+printQueue.length+1,resolve};});stage.dataset.printPreviewReady='false';printQueue.push(prepared);render(true);return visibleFrame;});await preparation;if(version!==flowVersion)return;selected=null;preview.width=preview.height=0;preview.hidden=true;capture.dataset.captureState='printing';render(true);}catch(error){if(cloth?.print)cloth.print.hold=false;bridge.dispose();if(version===flowVersion){capture.hidden=false;capture.classList.remove('flipped','capture-bridging');stage.classList.add('behind-camera');status.textContent='This photo could not be processed. Tap to try another photo.';status.hidden=false;selected=null;capture.classList.remove('capture-frozen');preview.hidden=true;shutter.hidden=false;shutter.disabled=false;secondFloor.disabled=false;lens.setAttribute('aria-disabled','false');capture.dataset.captureState='capturing';}console.error(error);}finally{if(version===flowVersion){processingPhoto=false;shell.classList.remove('processing');loomControls.sync();}}}
function selectImage(image,{cameraSnapshot=false}={}){if(processingPhoto)return;const source=cameraSnapshot?image:capturePhotoSource(image,lens.clientWidth,lens.clientHeight),width=source.width,height=source.height;selected=source;preview.width=Math.round(Math.min(width,1536));preview.height=Math.round(preview.width*height/width);const ctx=preview.getContext('2d'),optics=cameraSnapshot?finder.renderer?.domElement:null;if(optics&&optics.width){finder.resize();finder.renderer.render(finder.scene,finder.camera);ctx.drawImage(optics,0,0,preview.width,preview.height);}else ctx.drawImage(source,0,0,preview.width,preview.height);stopCamera();preview.hidden=false;shutter.hidden=true;capture.classList.add('capture-frozen');capture.dataset.captureState='frozen';shell.classList.add('photo-ready');audio.shutter();commit();}
shutter.onclick=()=>{if(!ready||processingPhoto||switchingCamera)return;audio.unlock();if(video.srcObject&&video.videoWidth)selectImage(capturePhotoSource(video,lens.clientWidth,lens.clientHeight),{cameraSnapshot:true});else document.querySelector('#cameraPhoto').click();};
async function selectFile(file){if(!file||selecting)return;selecting=true;const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();selectImage(image);}catch{status.textContent='Unable to open this photo.';}finally{selecting=false;URL.revokeObjectURL(url);}}
for(const id of ['photoFile','cameraPhoto'])document.querySelector('#'+id).onchange=e=>{selectFile(e.target.files?.[0]);e.target.value='';};

let touchOrigin=null,ignoreLensClick=false;
lens.addEventListener('pointerdown',e=>{touchOrigin={x:e.clientX,y:e.clientY};ignoreLensClick=false;});
lens.addEventListener('pointerup',e=>{if(touchOrigin)ignoreLensClick=Math.hypot(e.clientX-touchOrigin.x,e.clientY-touchOrigin.y)>14;touchOrigin=null;});
lens.addEventListener('pointercancel',()=>{touchOrigin=null;ignoreLensClick=true;});
lens.addEventListener('click',e=>{if((e.detail===0||!ignoreLensClick)&&ready&&!processingPhoto&&!capture.hidden&&!shutter.disabled)shutter.click();});
lens.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();lens.click();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!processingPhoto&&!cloth?.print&&!loomControls.busy){if(capture.hidden)openCapture();}});
window.addEventListener('pageshow',event=>{if(event.persisted&&audio.context)audio.unlock();});
window.addEventListener('pagehide',event=>{if(cloth?.print)cloth.print.hold=false;stopCamera();scroller?.stop();bridge.dispose();if(event.persisted)audio.suspend();else audio.dispose();});document.addEventListener('visibilitychange',()=>{if(document.hidden){scroller?.stop();audio.suspend();stopCamera();last=0;}else if(!capture.hidden&&!selected&&!processingPhoto&&!gallery.isOpen)openCapture();else render();});
function loomNotice(message){const notice=document.querySelector('#storageNotice');notice.textContent=message;notice.hidden=false;}
function rugBounds(){cloth.group.updateMatrixWorld(true);const points=[[-cloth.sim.width/2,cloth.sim.top],[cloth.sim.width/2,cloth.sim.top-cloth.sim.length]].map(([x,z])=>new T.Vector3(x,-.19,z).applyMatrix4(cloth.group.matrixWorld).project(camera));return{x:(Math.min(points[0].x,points[1].x)+1)*innerWidth/2,y:(1-Math.max(points[0].y,points[1].y))*innerHeight/2,width:Math.abs(points[0].x-points[1].x)*innerWidth/2,height:Math.abs(points[0].y-points[1].y)*innerHeight/2};}
const loomControls=setupLoomControls({getCloth:()=>cloth,getBounds:rugBounds,canEdit:()=>ready&&!processingPhoto&&!savingMemory&&!bridge.active&&!cloth?.print,render,store:memories,getRecordId:()=>recordIds.at(-1),capture,onStorageFailure:storageFailure,onNotice:loomNotice,onFlip:()=>audio.startFlip(),onRegenerate:()=>audio.regenerate(),onDiscard:()=>{cloth.discardLast();recordIds.pop();updateMemoryCount();scroller.refresh();openCapture();render(true);}});
loomControls.sync();
const params=new URLSearchParams(location.search);if(params.get('room')==='1'||params.get('perf')==='1')capture.hidden=true;else openCapture();
try{status.hidden=false;status.textContent='Preparing your loom…';scene.environment=await loadRoomEnvironment(renderer);addTextileLights(scene);cloth=new StreamCloth(scene,renderer);await cloth.load();let restored=await savedMemories;try{if(restored.length){cloth.restoreMemories(restored);recordIds.push(...restored.map(record=>record.id));}}catch(error){restored=[];storageFailure(error);}updateMemoryCount();stage.dataset.restoredMemories=String(restored.length);scroller=new CarpetScroll(document.querySelector('#carpetScroll'),document.querySelector('#carpetLength'),cloth,camera,()=>render(true));await cloth.start(render);
// Compile the initially hidden textile before enabling capture.
// Otherwise the first print's shader compilation stalls the camera-to-room pan.
cameraTarget.set(0,-.8,1.5);camera.position.set(0,-.19-Math.max(FIRST_PRINT_LENGTH/.68,(cloth?.sim.width??1.5)/(camera.aspect*.8))/(2*Math.tan(camera.fov*Math.PI/360)),1.5);camera.lookAt(cameraTarget);camera.updateMatrixWorld();
const warmSurfaceVisible=cloth.surface.visible;cloth.surface.visible=true;cloth.yarn.setVisible(true);
await renderer.compileAsync(scene,camera);renderer.shadowMap.needsUpdate=true;pipeline.render();
cloth.surface.visible=warmSurfaceVisible;cloth.yarn.setVisible(warmSurfaceVisible);renderer.shadowMap.needsUpdate=true;pipeline.render();
// Reuse the exact room paper render as a static viewfinder backdrop. One startup
// readback; no second background renderer or animated texture uploads.
await pipeline.paperReady;
const paperSceneVisible=scene.visible;scene.visible=false;
try{pipeline.render();capture.style.setProperty('--camera-paper',`url("${renderer.domElement.toDataURL('image/jpeg',.9)}")`);}catch{/* The charcoal base remains available if canvas export is unavailable. */}finally{scene.visible=paperSceneVisible;renderer.shadowMap.needsUpdate=true;pipeline.render();}

await new Promise(resolve=>requestAnimationFrame(resolve));stage.dataset.pipelineWarmed='true';sceneDirty=false;
stage.dataset.simulation='none';ready=true;saveMemory.disabled=!cloth.archive.entries.length;stage.dataset.ready="true";shutter.disabled=false;secondFloor.disabled=false;lens.setAttribute('aria-disabled','false');renderer.shadowMap.needsUpdate=true;status.hidden=true;fit();}catch(error){stage.dataset.error=error.message;status.hidden=false;status.textContent='The loom could not load. Please reload.';console.error(error);}
