const clamp=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
export const PRINT_SECONDS=5.4;
// One submitted clock drives the feed, camera and final slot withdrawal.
export function printMotion(t){
 t=clamp(t);
 const u=clamp((t-.12)/.78),r=.12;
 // Integrate a smooth velocity ramp: even feed through the middle, soft ends.
 const integral=x=>x*x*x-.5*x*x*x*x;
 const feed=u<r?r*integral(u/r)/(1-r):u>1-r?1-r*integral((1-u)/r)/(1-r):(u-r/2)/(1-r);
 return{photo:ease(t/.16),camera:ease((t-.12)/.48),feed,retract:ease((t-.9)/.1)};
}
