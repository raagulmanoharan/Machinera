import * as T from 'three';
// Freeze the rendered yarns for a short, disposable roll. No second cloth solver
// or full yarn scene is needed while the replacement is revealed underneath.
export function createRugRoll({renderer,pipeline,scene,cloth,bounds}){
 pipeline.render();
 const image=document.createElement('canvas'),source=renderer.domElement,ratio=source.width/innerWidth;
 image.width=Math.max(1,Math.round(bounds.width*ratio));image.height=Math.max(1,Math.round(bounds.height*ratio));
 image.getContext('2d').drawImage(source,bounds.x*ratio,bounds.y*ratio,image.width,image.height,0,0,image.width,image.height);
 const texture=new T.CanvasTexture(image);texture.colorSpace=T.SRGBColorSpace;
 const geometry=new T.PlaneGeometry(cloth.sim.width,cloth.sim.length,4,80),material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,toneMapped:false});
 const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);
 const {width,length,top}=cloth.sim,lift=bounds.y/bounds.height*length+.8;
 function update(progress){rollPositions(geometry.attributes.position.array,5,81,width,length,top,progress,lift);geometry.attributes.position.needsUpdate=true;geometry.computeBoundingSphere();}
 update(0);
 return{update,dispose(){scene.remove(mesh);geometry.dispose();material.dispose();texture.dispose();image.width=image.height=0;}};
}
export function rollPositions(positions,nx,ny,width,length,top,progress,lift){
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);},rolled=length*smooth(progress/.78),flat=length-rolled,up=lift*smooth((progress-.72)/.28);
 for(let y=0;y<ny;y++){const s=y/(ny-1)*length,travel=Math.max(0,s-flat),angle=travel/.14+smooth((progress-.78)/.22)*Math.PI*1.5,radius=.14+travel*.018;
  for(let x=0;x<nx;x++){const i=(y*nx+x)*3;positions[i]=(x/(nx-1)-.5)*width;positions[i+1]=-.205-radius*(1-Math.cos(angle))-travel*.012;positions[i+2]=top-Math.min(s,flat)-radius*Math.sin(angle)+up;}
 }
}
