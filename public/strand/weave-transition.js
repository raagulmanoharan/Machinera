import {THREAD_PITCH} from './yarn-structure.js?v=128';
export {THREAD_PITCH};
const order=[0,4,2,6,1,5,3,7];
// A pick has one complete draft and one colour source. Never interpolate drafts
// or old/new RGB. Two plain binding picks secure different structures first.
export function transitionPick(q,boundary,next,previous,span=.42){const pick=Math.floor(q/THREAD_PITCH+.5),centre=pick*THREAD_PITCH,distance=centre-boundary;if(distance<=0)return{draft:previous,nextColour:false,centre,binding:false};if(distance>=span)return{draft:next,nextColour:true,centre,binding:false};const index=Math.max(0,Math.floor(distance/THREAD_PITCH)),binding=next!==previous&&index<2;const progress=Math.max(0,Math.min(1,(distance-2*THREAD_PITCH)/(span-2*THREAD_PITCH))),nextColour=!binding&&progress>(order[index%8]+.5)/8;return{draft:binding?0:nextColour?next:previous,nextColour,centre,binding};}
