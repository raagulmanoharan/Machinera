// The digital zoom and aspect-cover crop shown by the finder, in source pixels.
export function captureWindow(width,height,viewWidth,viewHeight,zoom=1){
 if(![width,height,viewWidth,viewHeight,zoom].every(v=>Number.isFinite(v)&&v>0))throw new RangeError('Positive camera dimensions required');
 const aspect=viewWidth/viewHeight;let w=width,h=height;if(w/h>aspect)w=h*aspect;else h=w/aspect;w/=Math.max(1,Math.min(3,zoom));h/=Math.max(1,Math.min(3,zoom));return{x:(width-w)/2,y:(height-h)/2,width:w,height:h};
}
