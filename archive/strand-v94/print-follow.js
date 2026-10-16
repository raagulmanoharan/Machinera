// A bounded presentation pan; the settled room camera and cloth physics stay fixed.
export function printFollowOffset(elapsed,duration=4.8){const t=Math.max(0,Math.min(1,elapsed/duration));return 1.15*(1-t*t*(3-2*t));}
