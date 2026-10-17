// Fixed planar support for the woven surface. No cloth solver or pointer state.
export class StraightSpan{
 constructor(){this.nx=2;this.ny=33;this.width=1.536;this.length=3.85+.48*Math.PI/2+4.83;this.top=4.35;this.wallLimit=Infinity;this.floorLimit=-Infinity;this.positions=new Float32Array(this.nx*this.ny*3);this.active=false;this.isWorker=false;this.shape();}
 shape(){for(let y=0;y<this.ny;y++)for(let x=0;x<this.nx;x++){const i=(y*this.nx+x)*3;this.positions[i]=(x/(this.nx-1)-.5)*this.width;this.positions[i+1]=-.19;this.positions[i+2]=this.top-y/(this.ny-1)*this.length;}}
 pose(){}
}
