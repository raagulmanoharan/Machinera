// The digital zoom and aspect-cover crop shown by the finder, in source pixels.
export function captureWindow(width,height,viewWidth,viewHeight,zoom=1){
 if(![width,height,viewWidth,viewHeight,zoom].every(v=>Number.isFinite(v)&&v>0))throw new RangeError('Positive camera dimensions required');
 const aspect=viewWidth/viewHeight;let w=width,h=height;if(w/h>aspect)w=h*aspect;else h=w/aspect;w/=Math.max(1,Math.min(3,zoom));h/=Math.max(1,Math.min(3,zoom));return{x:(width-w)/2,y:(height-h)/2,width:w,height:h};
}

// One raw, unfiltered source shared by the frozen frame and colour extractor.
export function capturePhotoSource(image,viewWidth,viewHeight){
 const width=image.naturalWidth||image.videoWidth||image.width,height=image.naturalHeight||image.videoHeight||image.height,crop=captureWindow(width,height,viewWidth,viewHeight),source=document.createElement('canvas');source.width=Math.max(1,Math.round(crop.width));source.height=Math.max(1,Math.round(crop.height));source.getContext('2d',{willReadFrequently:true}).drawImage(image,crop.x,crop.y,crop.width,crop.height,0,0,source.width,source.height);return source;
}
