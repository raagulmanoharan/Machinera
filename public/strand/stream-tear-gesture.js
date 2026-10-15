export function shouldTear({startY,dy,dx,uvY,height,printing,torn}){
 return !printing&&!torn&&startY<height*.34&&uvY<.42&&dy>Math.max(64,height*.085)&&dy>Math.abs(dx)*1.6;
}
