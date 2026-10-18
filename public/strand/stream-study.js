import {createMemoryBrowser} from './memory-browser.js?v=199';
import {currentCandidate,memoryName} from './memory-exploration.js?v=199';
import {MemoryStore} from './memory-store.js?v=199';
import {updateMemoryUI} from './camera-ui.js?v=156';
import {capturePhotoSource} from './camera-framing.js?v=180';
import * as StrandWeaving from './weaving-patterns.js?v=197';
globalThis.StrandWeaving=StrandWeaving;
import {CarpetScroll} from './carpet-scroll.js?v=156';
import {FIRST_PRINT_LENGTH,NEXT_PRINT_LENGTH} from './print-sections.js?v=156';
import {FloorReturn} from './floor-return.js?v=156';
import {LoomAudio} from './loom-audio.js?v=186';
import {PhotoRugBridge,createPrintProgressReader} from './photo-rug-bridge.js?v=199';
import {preparePhotoPalette} from './photo-colours.js?v=196';
import {TLRViewfinder} from './tlr-viewfinder.js?v=156';
import {streamDeviceProfile} from './stream-device-profile.js?v=156';
const deviceProfile=streamDeviceProfile();
import * as T from 'three';
import {createStreamPerformance} from './stream-performance.js?v=156';
import {createStreamPipeline} from './stream-render-pipeline.js?v=156';
import { loadRoomEnvironment } from './room-lighting.js?v=156';
import { addTextileLights } from './textile-light-rig.js?v=156';
import { StreamCloth } from './stream-cloth.js?v=199';
import { FramePacer } from './frame-pacer.js?v=156';
const stage=document.querySelector('#stage'),status=document.querySelector('#photoStatus'),capture=document.querySelector('#capture'),video=document.querySelector('#viewfinder'),preview=document.querySelector('#preview');
function createRenderer(){try{return new T.WebGLRenderer({antialias:false,depth:false,stencil:false,powerPreference:'high-performance'});}catch(error){document.querySelector('#captureFeedback').hidden=false;status.textContent='This browser could not start the loom. Try reopening in Safari or Chrome.';document.querySelector('#choosePhoto').hidden=true;const retry=document.querySelector('#retryCamera');retry.textContent='Reload';retry.onclick=()=>location.reload();throw error;}}
const renderer=createRenderer();renderer.setPixelRatio(Math.min(devicePixelRatio,deviceProfile.canvasDpr));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=1.0;renderer.info.autoReset=false;renderer.shadowMap.enabled=false;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;stage.append(renderer.domElement);
const scene=new T.Scene();scene.background=null;renderer.setClearColor(0x141414,0);const camera=new T.PerspectiveCamera(32,innerWidth/innerHeight,.03,40);camera.up.set(0,0,1);
const cameraTarget=new T.Vector3();
const pipeline=createStreamPipeline(renderer,scene,camera,{...deviceProfile,paperBackground:true});
pipeline.paperReady.then(()=>render(true));
const diagnostics=new URLSearchParams(location.search).get('perf')==='1'?createStreamPerformance():null;if(diagnostics)window.strandPerformance=()=>diagnostics.report(cloth.sim,pipeline);
const upstairs=new FloorReturn(stage,capture,()=>openCapture());
const memories=new MemoryStore(),privacyMessage=document.querySelector('#privacyNote').textContent;
function storageFailure(error){const message=restoreFailed==='history'?'Saved memories could not be opened. They have not been deleted. New memories are available in this session only; download them before closing.':error?.message?.includes('another tab')?'Memories changed in another tab. Download unsaved memories before reloading.':'This browser could not save memories. New memories may be lost when you close it. You can still download them. Existing saved memories have not been deleted.';stage.dataset.storage='unavailable';const notice=document.querySelector('#storageNotice');notice.textContent=message;notice.hidden=false;document.querySelector('#privacyNote').textContent='Photos are processed on your device, never uploaded or saved. Saving woven memories is unavailable in this browser session.';console.warn('Local memory storage:',error?.name||'unavailable');}
let restoreFailed=false,savePending=Promise.resolve();
const storageNotice=document.querySelector('#storageNotice');new ResizeObserver(()=>document.documentElement.style.setProperty('--storage-notice-height',storageNotice.getBoundingClientRect().height+'px')).observe(storageNotice);
const savedMemories=memories.load().catch(error=>{restoreFailed=error.code==='ARCHIVE_READ'?'history':'storage';storageFailure(error);return[];});
function persistEntry(entry){entry.saveState='saving';savePending=savePending.then(async()=>{try{if(restoreFailed==='history')throw new Error('Saved memories could not be read. Download new memories before reloading.');const previous=cloth.archive.entries.slice(0,cloth.archive.entries.indexOf(entry));if(previous.some(value=>value.saveState==='unsaved'))throw new Error('Earlier memories are not saved. Download session memories before closing.');await memories.save(entry);if(cloth.archive.entries.every(value=>value.saveState==='saved')){restoreFailed=false;stage.dataset.storage='saved';document.querySelector('#storageNotice').hidden=true;document.querySelector('#privacyNote').textContent=privacyMessage;}}catch(error){entry.saveState='unsaved';storageFailure(error);}});return savePending;}
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
let scroller,scrollVersion=-1;
const physicsButton=document.querySelector('#physicsToggle');let physicsDispose=null,physicsLoading=false;
physicsButton.onclick=async()=>{if(!ready||physicsLoading||processingPhoto||bridge.active||upstairs.active)return;physicsLoading=true;physicsButton.disabled=true;
 try{if(physicsDispose){physicsDispose();physicsDispose=null;}else{const {enableClothPhysics}=await import('./cloth-physics.js?v=180');physicsDispose=enableClothPhysics({cloth,canvas:renderer.domElement,camera,render,scroll:scroller});}
 const enabled=!!physicsDispose;renderer.shadowMap.enabled=enabled;renderer.shadowMap.needsUpdate=enabled;document.body.classList.toggle('cloth-physics',enabled);physicsButton.setAttribute('aria-pressed',String(enabled));physicsButton.setAttribute('aria-label',enabled?'Disable cloth interaction':'Enable cloth interaction');stage.dataset.simulation=enabled?'optional-physics':'none';
 }catch(error){console.warn('Cloth interaction unavailable',error);}finally{physicsLoading=false;physicsButton.disabled=false;}};

const saveMemory=document.querySelector('#saveMemory'),postcardDialog=document.querySelector('#postcardDialog'),postcardPreview=document.querySelector('#postcardPreview'),postcardStatus=document.querySelector('#postcardStatus'),postcardDownload=document.querySelector('#postcardDownload');let postcard=null,postcardURL=null,postcardVersion=0;
const clearPostcard=()=>{postcardVersion++;postcard=null;if(postcardURL)URL.revokeObjectURL(postcardURL);postcardURL=null;postcardPreview.removeAttribute('src');postcardPreview.hidden=true;postcardDownload.disabled=true;};
document.querySelector('#postcardClose').onclick=()=>postcardDialog.close();postcardDialog.addEventListener('close',()=>{clearPostcard();if(cloth?.physicsEnabled)render(true);});postcardDialog.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation();});
let exportSelection=null,exportBusy=false;
async function openPostcard(selection){
 if(!ready||processingPhoto||bridge.active||cloth.print||!cloth.archive.entries.length)return;
 if(postcardDialog.open&&exportBusy)return;
 const q=Math.max(0,cloth.visibleHead-(cloth.sim.top-camera.position.z));
 exportSelection=selection??cloth.archive.locateMaterial(q);
 if(!exportSelection?.entry)return;
 audio.saveClick();clearPostcard();exportBusy=true;const token=postcardVersion,locked=exportSelection;
 document.querySelector('#postcardRetry').hidden=true;document.querySelector('#postcardDirectDownload').hidden=true;
 postcardStatus.hidden=false;postcardStatus.textContent='Preparing memory…';postcardDialog.style.setProperty('--camera-paper',capture.style.getPropertyValue('--camera-paper'));
 if(!postcardDialog.open)postcardDialog.showModal();postcardDialog.focus({preventScroll:true});
 try{const [{createMemoryPostcard},{captureMemoryThumbnail}]=await Promise.all([import('./memory-postcard.js?v=199'),import('./postcard-capture.js?v=199')]);
 if(token!==postcardVersion)return;
 const result=await createMemoryPostcard({entry:locked.entry,index:locked.index,renderThumbnail:entry=>captureMemoryThumbnail({renderer,pipeline,camera,cloth,entry})});
 if(token!==postcardVersion)return;
 postcard=result;postcardURL=URL.createObjectURL(result.blob);postcardPreview.src=postcardURL;postcardPreview.alt=`Memory ${result.details.number}, ${result.details.weave}`;postcardPreview.hidden=false;postcardStatus.hidden=true;postcardDownload.disabled=false;
 }catch(error){if(token===postcardVersion){postcardStatus.textContent='Could not prepare this postcard. Try again.';document.querySelector('#postcardRetry').hidden=false;}console.warn('Postcard:',error);}
 finally{if(token===postcardVersion)exportBusy=false;}
}
postcardDialog.addEventListener('close',()=>{exportBusy=false;saveMemory.focus({preventScroll:true});render(true);});
saveMemory.onclick=()=>openPostcard();document.querySelector('#postcardRetry').onclick=()=>openPostcard(exportSelection);
function downloadPostcard(){if(!postcard||!postcardURL)return;const link=document.createElement('a');link.href=postcardURL;link.download=postcard.filename;document.body.append(link);link.click();link.remove();postcardStatus.hidden=false;postcardStatus.textContent='If no download appears, open this page in Safari or Chrome and try again.';}
document.querySelector('#postcardDirectDownload').onclick=downloadPostcard;
let sharing=false;
postcardDownload.onclick=async()=>{if(!postcard||sharing)return;sharing=true;postcardDownload.disabled=true;audio.saveClick();const file=new File([postcard.blob],postcard.filename,{type:'image/png'});try{if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:`Memory ${postcard.details.number}`});return;}catch(error){if(error.name==='AbortError')return;postcardStatus.hidden=false;postcardStatus.textContent='Sharing is unavailable here. You can download the image instead.';document.querySelector('#postcardDirectDownload').hidden=false;return;}}downloadPostcard();}finally{sharing=false;postcardDownload.disabled=!postcard;}};
let printPreviewReady=null;
let memoryBrowser;
let cloth,ready=false,pending=false,last=0,sceneDirty=true,media=null,selected=null,selecting=false,cameraRequest=0,cameraFacing='environment',switchingCamera=false;const pacer=new FramePacer(120);
function fit(){if(cloth)cloth.viewportTick=0;cameraTarget.set(0,-.8,1.5);camera.position.set(0,-7.4*Math.max(1,.48/camera.aspect),1.5);camera.lookAt(cameraTarget);camera.updateMatrixWorld();scroller?.refresh();render(true);}
function render(force=false){if(force===true)sceneDirty=true;if(pending||document.hidden)return;pending=true;requestAnimationFrame(frame);}
let shadowClock=0;
function frame(time){pending=false;if(postcardDialog.open||memoryBrowser?.open){audio.setPrinting(false);last=0;return;}if(document.hidden||(!capture.hidden&&!capture.classList.contains('flipped')&&!capture.classList.contains('returning-upstairs'))){last=0;return;}if(!pacer.accept(time)){render();return;}const dt=last?Math.min((time-last)/1000,.05):1/60;last=time;const updateStarted=diagnostics?performance.now():0;if(cloth&&printQueue.length&&(capture.hidden||capture.classList.contains('capture-bridging'))&&cloth.canStartPhoto()){const input=printQueue.shift();cloth.addPhoto(input);if(bridge.active)cloth.print.hold=true;persistEntry(cloth.archive.entries.at(-1));}const changed=cloth?.update(dt,camera);audio.setPrinting(!!cloth?.print&&!cloth.print.hold);saveMemory.disabled=!ready||!!cloth?.print||processingPhoto;physicsButton.disabled=!!cloth?.print||processingPhoto||physicsLoading;document.querySelector('#firstFloor').disabled=!!cloth?.print||processingPhoto;memoryBrowser?.refresh();if(scroller&&cloth.version!==scrollVersion){scrollVersion=cloth.version;scroller.reset();scroller.refresh();updateMemoryCount();}shadowClock+=dt;if(changed&&cloth?.physicsEnabled&&shadowClock>1/30){renderer.shadowMap.needsUpdate=true;shadowClock=0;}const updateMs=diagnostics?performance.now()-updateStarted:0;const shouldDraw=changed||sceneDirty;if(shouldDraw)renderer.info.reset();const submitStarted=diagnostics?performance.now():0;if(shouldDraw){pipeline.render();sceneDirty=false;if(printPreviewReady&&cloth.version>=printPreviewReady.version&&(!cloth.print||cloth.print.hold)){const pendingPreview=printPreviewReady;printPreviewReady=null;stage.dataset.printPreviewReady='true';pendingPreview.resolve();}}if(diagnostics)diagnostics.record(time,updateMs,performance.now()-submitStarted);if(ready&&shouldDraw){stage.dataset.ready='true';stage.dataset.simulation=cloth?.physicsEnabled?'optional-physics':'none';stage.dataset.deviceProfile=deviceProfile.name;stage.dataset.collisionBackend='none';stage.dataset.photoVersion=String(cloth.version);stage.dataset.weave=cloth.currentDraft?.id??'';stage.dataset.printing=String(!!cloth.print);stage.dataset.length=cloth.totalLength.toFixed(3);stage.dataset.activeLength=cloth.sim.length.toFixed(3);stage.dataset.retainedLength=Math.max(0,cloth.totalLength-cloth.sim.length).toFixed(3);stage.dataset.clothActive=String(cloth.sim.active);stage.dataset.triangles=String(renderer.info.render.triangles);stage.dataset.drawCalls=String(renderer.info.render.calls);stage.dataset.cameraDistance=camera.position.distanceTo(cameraTarget).toFixed(3);stage.dataset.room='charcoal-paper';stage.dataset.scrollOffset=cloth.scrollOffset.toFixed(3);stage.dataset.mode=capture.hidden?'printing':'capture';const label=cloth.print?'Weaving your colours · '+Math.round(Math.min(1,cloth.print.time/cloth.print.duration)*100)+'%':'Scroll to explore your memories.';const labelNode=document.querySelector('#printingStatus');if(labelNode.textContent!==label)labelNode.textContent=label;}
 if(cloth?.physicsEnabled||cloth?.sim.active||cloth?.print||printQueue.length)render();else last=0;
}
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();pipeline.resize(innerWidth,innerHeight);if(cloth)cloth.viewportTick=0;scroller?.refresh();render(true);});
const lens=document.querySelector('.lens');
const finder=new TLRViewfinder(lens,video),shell=document.querySelector('.camera-shell'),shutter=document.querySelector('#shutter'),secondFloor=document.querySelector('#secondFloor');
const switchCamera=document.querySelector('#switchCamera');
function showCaptureFeedback(message){status.hidden=false;status.textContent=message;document.querySelector('#captureFeedback').hidden=false;}
document.querySelector('#retryCamera').onclick=()=>{if(ready&&!processingPhoto)startCamera();};
document.querySelector('#choosePhoto').onclick=()=>{if(ready&&!processingPhoto)document.querySelector('#photoFile').click();};
document.addEventListener('machinera-about',event=>{finder.suspended=event.detail.open;});
function updateMemoryCount(){updateMemoryUI(cloth?.version??0);}
async function startCamera(facing=cameraFacing){const request=++cameraRequest;let next;try{
 next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1920},height:{ideal:1440}},audio:false});
 if(capture.hidden||capture.classList.contains('flipped')||request!==cameraRequest){next.getTracks().forEach(t=>t.stop());return false;}
 media=next;video.srcObject=next;await video.play();if(request!==cameraRequest){next.getTracks().forEach(t=>t.stop());return false;}
 cameraFacing=next.getVideoTracks()[0]?.getSettings?.().facingMode||facing;finder.start();finder.suspended=document.querySelector('#aboutDialog').open;shell.classList.add('has-camera');shell.dataset.camera='live';shell.dataset.facing=cameraFacing;document.querySelector('#captureFeedback').hidden=true;switchCamera.setAttribute('aria-label',cameraFacing==='environment'?'Switch to front camera':'Switch to rear camera');return true;
 }catch{next?.getTracks().forEach(t=>t.stop());if(request===cameraRequest){if(media===next)media=null;video.srcObject=null;shell.dataset.camera='file';showCaptureFeedback('Camera access is unavailable. Retry camera access, or choose a photo.');}return false;}}
switchCamera.onclick=async()=>{if(!ready||processingPhoto||selecting||switchingCamera||capture.hidden||bridge.active)return;const previous=cameraFacing;switchingCamera=true;switchCamera.disabled=true;shutter.disabled=true;lens.setAttribute('aria-disabled','true');stopCamera();try{const started=await startCamera(previous==='environment'?'user':'environment');if(!started&&!capture.hidden&&!bridge.active&&!processingPhoto)await startCamera(previous);}finally{switchingCamera=false;if(!capture.hidden&&!bridge.active&&!processingPhoto){switchCamera.disabled=false;shutter.disabled=!ready;lens.setAttribute('aria-disabled',String(!ready));}}};
function stopCamera(){cameraRequest++;finder.stop();media?.getTracks().forEach(t=>t.stop());media=null;video.srcObject=null;shell.classList.remove('has-camera');}
async function openCapture(){audio.setPrinting(false);if(cloth?.print)cloth.print.hold=false;flowVersion++;if(printPreviewReady){printPreviewReady.resolve();printPreviewReady=null;}processingPhoto=false;stopCamera();capture.hidden=false;capture.classList.remove('flipped','capture-frozen','capture-departing','capture-bridging');bridge.dispose();cameraTarget.z=1.5;camera.position.z=1.5;camera.lookAt(cameraTarget);camera.updateMatrixWorld();capture.dataset.captureState='capturing';updateMemoryCount();stage.classList.remove('room-entering');stage.classList.add('behind-camera');selected=null;preview.hidden=true;shutter.hidden=false;shell.classList.remove('photo-ready','processing');shutter.disabled=!ready;secondFloor.disabled=!ready;lens.setAttribute('aria-disabled',String(!ready));await startCamera();}
async function closeCapture(prepared=Promise.resolve(),onPrepared=()=>{}){
 if(capture.hidden||bridge.active)return;const version=flowVersion;secondFloor.disabled=true;
 if(!selected&&media&&video.videoWidth){preview.width=video.videoWidth;preview.height=video.videoHeight;preview.getContext('2d').drawImage(video,0,0);preview.hidden=false;}
 stopCamera();capture.dataset.captureState='transition';stage.classList.remove('behind-camera','room-entering');
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
  const section=cloth.version===0?FIRST_PRINT_LENGTH:NEXT_PRINT_LENGTH;
  const readPrintProgress=createPrintProgressReader(()=>cloth.print);
  const complete=bridge.begin(preview,lens,section,{feed:!!(processingPhoto&&selected),prepared,onPrepared,readPrintProgress,onScanStart:()=>audio.startScan()});capture.classList.add('flipped','capture-bridging');render(true);await complete;
 }else{capture.classList.add('flipped','capture-bridging');await prepared;await onPrepared();if(cloth.print){cloth.print.time=cloth.print.duration;cloth.print.hold=false;cloth.update(0,camera);}render(true);await new Promise(resolve=>requestAnimationFrame(resolve));}
 if(version!==flowVersion)return;capture.hidden=true;capture.dataset.captureState='printing';render(true);
}
secondFloor.onclick=()=>{if(ready&&!processingPhoto&&!upstairs.active)closeCapture();};
document.querySelector('#firstFloor').onclick=()=>{if(ready&&!processingPhoto&&!cloth.print&&!bridge.active&&!upstairs.active){upstairs.pull(0);upstairs.end(true);}};
async function commit(){if(!selected||!ready||processingPhoto)return;const source=selected,version=flowVersion;processingPhoto=true;secondFloor.disabled=true;lens.setAttribute('aria-disabled','true');shell.classList.add('processing');try{const preparation=preparePhotoPalette(source,{onProgress:p=>{capture.dataset.processing=String(Math.round(p*100));}});let prepared;const resolved=preparation.then(value=>{prepared=value;return value;});await closeCapture(resolved,()=>{if(version!==flowVersion)return;stage.dataset.sourcePixels=String(prepared.sourcePixelCount);stage.dataset.processedPixels=String(prepared.processedPixelCount);stage.dataset.dyeLots=String(prepared.palette?.length??0);scroller?.reset();const visibleFrame=new Promise(resolve=>{printPreviewReady={version:cloth.version+printQueue.length+1,resolve};});stage.dataset.printPreviewReady='false';printQueue.push(prepared);render(true);return visibleFrame;});await preparation;if(version!==flowVersion)return;selected=null;preview.width=preview.height=0;preview.hidden=true;capture.dataset.captureState='printing';render(true);}catch(error){if(cloth?.print)cloth.print.hold=false;bridge.dispose();if(version===flowVersion){capture.hidden=false;capture.classList.remove('flipped','capture-bridging');stage.classList.add('behind-camera');status.textContent='This photo could not be processed. Tap to try another photo.';status.hidden=false;selected=null;preview.width=preview.height=0;capture.classList.remove('capture-frozen');preview.hidden=true;shutter.hidden=false;shutter.disabled=false;secondFloor.disabled=false;lens.setAttribute('aria-disabled','false');capture.dataset.captureState='capturing';showCaptureFeedback('Could not prepare this photo. Try another photo.');}console.error(error);}finally{if(version===flowVersion){processingPhoto=false;shell.classList.remove('processing');}}}
function selectImage(image,{cameraSnapshot=false}={}){if(processingPhoto)return;document.querySelector('#captureFeedback').hidden=true;const source=cameraSnapshot?image:capturePhotoSource(image,lens.clientWidth,lens.clientHeight),width=source.width,height=source.height;selected=source;preview.width=Math.round(Math.min(width,1536));preview.height=Math.round(preview.width*height/width);const ctx=preview.getContext('2d'),optics=cameraSnapshot?finder.renderer?.domElement:null;if(optics&&optics.width){finder.resize();finder.renderer.render(finder.scene,finder.camera);ctx.drawImage(optics,0,0,preview.width,preview.height);}else ctx.drawImage(source,0,0,preview.width,preview.height);stopCamera();preview.hidden=false;shutter.hidden=true;capture.classList.add('capture-frozen');capture.dataset.captureState='frozen';shell.classList.add('photo-ready');audio.shutter();commit();}
shutter.onclick=()=>{if(!ready||processingPhoto||selecting||switchingCamera)return;audio.unlock();if(video.srcObject&&video.videoWidth)selectImage(capturePhotoSource(video,lens.clientWidth,lens.clientHeight),{cameraSnapshot:true});else document.querySelector('#cameraPhoto').click();};
async function selectFile(file){if(!file||selecting||processingPhoto)return;selecting=true;const version=flowVersion;shutter.disabled=switchCamera.disabled=secondFloor.disabled=true;lens.setAttribute('aria-disabled','true');const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;await image.decode();if(version!==flowVersion||capture.hidden||capture.classList.contains('flipped'))return;document.querySelector('#aboutDialog').close();selectImage(image);}catch{if(version===flowVersion&&!capture.hidden)showCaptureFeedback('Could not open this photo. Choose another.');}finally{selecting=false;URL.revokeObjectURL(url);if(version===flowVersion&&!processingPhoto&&!capture.hidden){shutter.disabled=!ready;switchCamera.disabled=false;secondFloor.disabled=!ready;lens.setAttribute('aria-disabled',String(!ready));}}}
for(const id of ['photoFile','cameraPhoto'])document.querySelector('#'+id).onchange=e=>{selectFile(e.target.files?.[0]);e.target.value='';};

let touchOrigin=null,ignoreLensClick=false;
lens.addEventListener('pointerdown',e=>{touchOrigin={x:e.clientX,y:e.clientY};ignoreLensClick=false;});
lens.addEventListener('pointerup',e=>{if(touchOrigin)ignoreLensClick=Math.hypot(e.clientX-touchOrigin.x,e.clientY-touchOrigin.y)>14;touchOrigin=null;});
lens.addEventListener('pointercancel',()=>{touchOrigin=null;ignoreLensClick=true;});
lens.addEventListener('click',e=>{if((e.detail===0||!ignoreLensClick)&&ready&&!processingPhoto&&!capture.hidden&&!shutter.disabled)shutter.click();});
lens.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();lens.click();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')&&!processingPhoto&&!cloth?.print&&!upstairs.active){if(capture.hidden)openCapture();else closeCapture();}});
let resumeCamera=false;
window.addEventListener('pageshow',event=>{if(!event.persisted)return;if(audio.context)audio.unlock();if(resumeCamera)openCapture();else{capture.hidden=!!cloth?.archive.entries.length;render(true);}});
window.addEventListener('pagehide',event=>{resumeCamera=!capture.hidden&&!cloth?.print;flowVersion++;processingPhoto=false;selected=null;preview.width=preview.height=0;preview.hidden=true;if(printPreviewReady){printPreviewReady.resolve();printPreviewReady=null;}stopCamera();scroller?.stop();bridge.dispose();if(memoryBrowser?.open)memoryBrowser.close();memoryBrowser?.dispose();if(cloth?.print){cloth.print.time=cloth.print.duration;cloth.print.hold=false;cloth.update(0,camera);}if(upstairs.active)upstairs.cleanup();if(event.persisted)audio.suspend();else audio.dispose();});document.addEventListener('visibilitychange',()=>{bridge.setPaused(document.hidden);if(document.hidden){scroller?.stop();if(upstairs.active)upstairs.cleanup();audio.suspend();stopCamera();cloth?.sim.release?.();last=0;}else if(!capture.hidden&&!selected&&!processingPhoto)openCapture();else render();});
const params=new URLSearchParams(location.search);if(params.get('room')==='1'||params.get('perf')==='1')capture.hidden=true;else openCapture();
try{status.hidden=false;status.textContent='Preparing your loom…';scene.environment=await loadRoomEnvironment(renderer);addTextileLights(scene);cloth=new StreamCloth(scene,renderer);await cloth.load();let restored=await savedMemories;try{if(restored.length)cloth.restoreMemories(restored);}catch(error){restored=[];restoreFailed='history';storageFailure(error);}updateMemoryCount();stage.dataset.restoredMemories=String(restored.length);scroller=new CarpetScroll(document.querySelector('#carpetScroll'),document.querySelector('#carpetLength'),cloth,camera,()=>render(true));await cloth.start(render);
// Compile the initially hidden textile before enabling capture.
// Otherwise the first print's shader compilation stalls the camera-to-room pan.
cameraTarget.set(0,-.8,1.5);camera.position.set(0,-7.4*Math.max(1,.48/camera.aspect),1.5);camera.lookAt(cameraTarget);camera.updateMatrixWorld();
const warmSurfaceVisible=cloth.surface.visible;cloth.surface.visible=true;cloth.yarn.setVisible(true);
await renderer.compileAsync(scene,camera);renderer.shadowMap.needsUpdate=true;pipeline.render();
cloth.surface.visible=warmSurfaceVisible;cloth.yarn.setVisible(warmSurfaceVisible);renderer.shadowMap.needsUpdate=true;pipeline.render();
// Reuse the exact room paper render as a static upstairs backdrop. One startup
// readback; no second background renderer or animated texture uploads.
await pipeline.paperReady;
const paperSceneVisible=scene.visible;scene.visible=false;
try{pipeline.render();capture.style.setProperty('--camera-paper',`url("${renderer.domElement.toDataURL('image/jpeg',.9)}")`);}catch{/* The charcoal base remains available if canvas export is unavailable. */}finally{scene.visible=paperSceneVisible;renderer.shadowMap.needsUpdate=true;pipeline.render();}

await new Promise(resolve=>requestAnimationFrame(resolve));stage.dataset.pipelineWarmed='true';sceneDirty=false;
stage.dataset.simulation=cloth?.physicsEnabled?'optional-physics':'none';ready=true;initMemoryBrowser();saveMemory.disabled=!cloth.archive.entries.length;stage.dataset.ready="true";shutter.disabled=false;secondFloor.disabled=false;lens.setAttribute('aria-disabled','false');renderer.shadowMap.needsUpdate=true;status.hidden=true;if(shell.dataset.camera==='file')showCaptureFeedback('Camera access is unavailable. Retry camera access, or choose a photo.');fit();}catch(error){stage.dataset.error=error.message;status.hidden=false;showCaptureFeedback('The loom could not load. Please reload. Your saved memories have not been removed.');document.querySelector('#choosePhoto').hidden=true;const reload=document.querySelector('#retryCamera');reload.textContent='Reload';reload.onclick=()=>location.reload();console.error(error);}

function initMemoryBrowser(){
 const busy=()=>!ready||processingPhoto||!!cloth.print||bridge.active||upstairs.active||physicsLoading||postcardDialog.open;
 memoryBrowser=createMemoryBrowser({getArchive:()=>cloth.archive,getSelected:()=>cloth.archive.locateMaterial(Math.max(0,cloth.visibleHead-(cloth.sim.top-camera.position.z)))?.entry,isBusy:busy,
  async thumbnail(entry,archive=cloth.archive){const {captureMemoryThumbnail}=await import('./postcard-capture.js?v=199');const image=captureMemoryThumbnail({renderer,pipeline,camera,cloth,entry,archive,width:288,height:512}),bounds=image.rugBounds,thumb=document.createElement('canvas');const x=bounds.left/1080*image.width,y=Math.max(0,(1440-bounds.bottom)/1920*image.height),width=(bounds.right-bounds.left)/1080*image.width,height=Math.min(image.height-y,(bounds.bottom/1920*image.height)-y);thumb.width=180;thumb.height=Math.max(1,Math.round(180*height/width));thumb.getContext('2d').drawImage(image,x,y,width,height,0,0,thumb.width,thumb.height);try{const blob=await new Promise((resolve,reject)=>thumb.toBlob(value=>value?resolve(value):reject(new Error('Preview unavailable')),'image/png'));return URL.createObjectURL(blob);}finally{image.width=image.height=thumb.width=thumb.height=0;}},
  jump(entry){scroller.stop();const q=entry.end-entry.length/2,distance=Math.max(0,cloth.archive.length-(cloth.sim.top-camera.position.z)-q);document.querySelector('#carpetScroll').scrollTop=distance*scroller.pixelsPerMetre;scroller.sync();render(true);},
  save:openPostcard,
  async rename(entry,value){await savePending;const name=memoryName(value);await memories.rename(entry,name,entry.metadata?.name??'');entry.metadata={...entry.metadata,name};},
  async add(candidate){if(busy()||!currentCandidate(candidate,cloth.archive))throw new Error('This preview is no longer current. Try another weave.');await savePending;if(restoreFailed==='history')throw new Error('Saved memories could not be read. Download session memories before reloading.');let savedTail=0;for(const entry of cloth.archive.entries){if(entry.saveState!=='saved')break;savedTail=entry.end;}try{await memories.assertTail(savedTail);}catch(error){if(error.code==='MEMORY_CONFLICT')throw error;storageFailure(error);}if(!currentCandidate(candidate,cloth.archive))throw new Error('Memories changed. Try another weave.');scroller.reset();const entry=cloth.addPhoto(candidate.input);persistEntry(entry);updateMemoryCount();render(true);},
  onDialog(open){if(open){scroller.stop();audio.setPrinting(false);}else render(true);}
 });
}
