import * as T from 'three';
// Directional wood fibre and growth-ring variation, kept separate from surface roughness.
export function woodMaterial({floor=false}={}){
 const w=1024,h=256,colour=new Uint8Array(w*h*4),rough=new Uint8Array(w*h*4),height=new Uint8Array(w*h*4);
 const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)};
 function noise(x,y){const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b,s=u*u*(3-2*u),t=v*v*(3-2*v);return T.MathUtils.lerp(T.MathUtils.lerp(hash(a,b),hash(a+1,b),s),T.MathUtils.lerp(hash(a,b+1),hash(a+1,b+1),s),t)}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const u=x/w,v=y/h,row=floor?Math.floor(v*4):0,local=floor?(v*4)%1:v,flow=local*95+noise(u*4,row+local*6)*3.8+noise(u*10,local*5)*.6,knot=Math.exp(-((u-.29)**2*35+(local-.44)**2*90)),grain=Math.sin(flow*Math.PI*2+knot*8),fibre=noise(u*14,local*240),tone=.79+grain*.055+(fibre-.5)*.11+(noise(u*2,row+local*4)-.5)*.16,seam=floor&&(local<.009||local>.991)? .55:1,j=(y*w+x)*4,base=floor?[182,124,72]:[119,73,39];colour.set([base[0]*tone*seam,base[1]*tone*seam,base[2]*tone*seam,255],j);const r=184+fibre*40;rough.set([r,r,r,255],j);const b=124+grain*12+fibre*18;height.set([b,b,b,255],j);}
 const texture=(data,srgb=false)=>{const t=new T.DataTexture(data,w,h);t.wrapS=t.wrapT=T.RepeatWrapping;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=8;t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;if(floor)t.repeat.set(4,4);t.needsUpdate=true;return t};
 return new T.MeshStandardMaterial({map:texture(colour,true),roughnessMap:texture(rough),roughness:.92,bumpMap:texture(height),bumpScale:floor?.0007:.0003});
}
