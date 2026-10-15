// iOS browsers share WebKit. Keep this policy explicit and diagnostic: the
// physics grid stays unchanged; a modest supersampled scene resolves fine yarn.
export function streamDeviceProfile(nav=globalThis.navigator){
 const appleTouch=/iPhone|iPad|iPod/.test(nav?.userAgent??'')||(nav?.platform==='MacIntel'&&(nav?.maxTouchPoints??0)>1);
 return appleTouch?{name:'apple-touch',canvasDpr:1.5,renderScale:1.5,samples:0,nx:13,ny:97}:{name:'standard',canvasDpr:2,renderScale:1,samples:2,nx:13,ny:97};
}
