// IndexedDB is local to this browser and origin. No network or photo uploads.
const DATABASE='machinera-memories',STORE='memories';
export function snapshotWeave(entry){
 const {previous,...snapshot}=entry;
 snapshot.plan=Object.fromEntries(Object.entries(entry.plan).filter(([,value])=>typeof value!=='function'));
 return{version:1,...snapshot};
}
export function validateWeave(snapshot){
 if(snapshot?.version!==1||!Number.isFinite(snapshot.length)||snapshot.length<=0||!Number.isFinite(snapshot.end)||!snapshot.plan?.draft||!Array.isArray(snapshot.palette)||!snapshot.palette.length||snapshot.palette.length>5||!Array.isArray(snapshot.warp)||!Array.isArray(snapshot.weft)||!(snapshot.baked instanceof Uint8Array)||!(snapshot.drafts instanceof Uint8Array)||!(snapshot.newYarn instanceof Uint8Array))throw new Error('Saved weave is not supported');
 return snapshot;
}
export class MemoryStore{
 constructor(factory=globalThis.indexedDB){this.factory=factory;this.connection=null;}
 open(){if(this.connection)return this.connection;this.connection=new Promise((resolve,reject)=>{
  if(!this.factory){reject(new Error('Local storage is unavailable'));return;}
  const request=this.factory.open(DATABASE,2);let blocked=false;
  request.onupgradeneeded=event=>{
   if(event.oldVersion===0)request.result.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});
   else{const cursor=request.transaction.objectStore(STORE).openCursor();cursor.onsuccess=()=>{const row=cursor.result;if(!row)return;const {id,archive,createdAt}=row.value;row.update({id,archive,createdAt});row.continue();};}
  };
  request.onerror=()=>reject(request.error||new Error('Local storage is unavailable'));
  request.onblocked=()=>{blocked=true;reject(new Error('Please close other Machinera tabs to enable saving'));};
  request.onsuccess=()=>{const db=request.result;if(blocked){db.close();return;}db.onversionchange=()=>{db.close();this.connection=null;};resolve(db);};
 });return this.connection;}
 async save(entry){const db=await this.open(),archive=snapshotWeave(entry);return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let request,failure;
  // Reject a stale tab rather than combining incompatible cloth histories.
  const tail=store.openCursor(null,'prev');tail.onsuccess=()=>{const end=tail.result?.value.archive.end??0;if(Math.abs(end-(entry.end-entry.length))>1e-6){failure=new Error('Memories changed in another tab. Reload to continue saving.');tx.abort();return;}request=store.add({archive,createdAt:Date.now()});};
  tx.oncomplete=()=>resolve(request.result);tx.onabort=()=>reject(failure||tx.error||new Error('This browser could not save your memory'));tx.onerror=()=>{};
 });}

 async load(){const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).openCursor(),records=[];request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;
   // Only derived weave data is persisted. Source photos are never saved.
   try{const {id,archive,createdAt}=cursor.value;records.push({id,archive:validateWeave(archive),createdAt});cursor.continue();}catch(error){reject(error);tx.abort();}
  };tx.oncomplete=()=>resolve(records);tx.onabort=()=>reject(tx.error||new Error('Saved memories could not be read'));tx.onerror=()=>{};request.onerror=()=>reject(request.error);});}
}
