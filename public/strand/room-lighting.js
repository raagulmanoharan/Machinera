import * as T from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
// Studio Small 08 — Sergej Majboroda / Poly Haven, CC0.
// Use the full 1K linear HDR, not an LDR image or the older 256px light proxy.
export async function loadRoomEnvironment(renderer){
 const loader=new RGBELoader(),url='https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_08_1k.hdr';let hdr;
 for(let attempt=0;attempt<3;attempt++){try{hdr=await loader.loadAsync(url+(attempt?'?strand-retry='+attempt:''));break;}catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));}}
 hdr.mapping=T.EquirectangularReflectionMapping;hdr.colorSpace=T.LinearSRGBColorSpace;
 const pmrem=new T.PMREMGenerator(renderer);pmrem.compileEquirectangularShader();
 const environment=pmrem.fromEquirectangular(hdr);hdr.dispose();pmrem.dispose();
 environment.texture.name='Studio Small 08 — 1K HDR image-based lighting';
 return environment.texture;
}
