// iOS browsers share WebKit. Keep this policy explicit and diagnostic: the
// cloth's visual yarn density and CSS-resolution scene stay unchanged.
export function streamDeviceProfile(nav=globalThis.navigator){
 const appleTouch=/iPhone|iPad|iPod/.test(nav?.userAgent??'')||(nav?.platform==='MacIntel'&&(nav?.maxTouchPoints??0)>1);
 return appleTouch?{name:'apple-touch',canvasDpr:1,samples:0,nx:13,ny:97}:{name:'standard',canvasDpr:2,samples:2,nx:13,ny:97};
}
