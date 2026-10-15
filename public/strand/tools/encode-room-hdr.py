"""Encode the two linear Float32 RGBA captures as one RGBE Radiance atlas.
Run after bake-empty-room.html captures: python encode-room-hdr.py lit.f32 shadow.f32 output.hdr
"""
import sys
import numpy as np
from pathlib import Path
w,h=512,910
lit,shade=(np.fromfile(p,dtype=np.float32).reshape(h,w,4)[::-1,:,:3] for p in sys.argv[1:3])
rgb=np.maximum(np.concatenate([lit,shade],axis=1),0)
assert np.isfinite(rgb).all()
maximum=rgb.max(axis=2);exponent=np.floor(np.log2(np.maximum(maximum,1e-32))).astype(int)+1
scale=255/np.exp2(exponent)
rgbe=np.zeros((h,w*2,4),dtype=np.uint8)
rgbe[:,:,:3]=np.clip(np.rint(rgb*scale[:,:,None]),0,255).astype(np.uint8)
rgbe[:,:,3]=np.where(maximum>1e-32,exponent+128,0).astype(np.uint8)
with Path(sys.argv[3]).open('wb') as f:
 f.write(f'#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y {h} +X {w*2}\n'.encode())
 for row in rgbe:
  f.write(bytes([2,2,(w*2)>>8,(w*2)&255]))
  for channel in row.T:
   values=channel.tolist();i=0
   while i<len(values):
    run=1
    while i+run<len(values) and values[i+run]==values[i] and run<127:run+=1
    if run>=4:
     f.write(bytes([128+run,values[i]]));i+=run
    else:
     start=i;i+=run
     while i<len(values) and i-start<128:
      run=1
      while i+run<len(values) and values[i+run]==values[i] and run<127:run+=1
      if run>=4:break
      i+=min(run,128-(i-start))
     f.write(bytes([i-start]));f.write(bytes(values[start:i]))
print('HDR atlas:',rgb.shape,'linear range',float(rgb.min()),float(rgb.max()))
