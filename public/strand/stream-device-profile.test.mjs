import test from 'node:test';
import assert from 'node:assert/strict';
import {streamDeviceProfile} from './stream-device-profile.js';
test('iPhone avoids the extra resolve and canvas upsample without reducing physics',()=>{const p=streamDeviceProfile({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',maxTouchPoints:5});assert.equal(p.samples,0);assert.equal(p.canvasDpr,1);assert.deepEqual([p.nx,p.ny],[13,97]);});
test('iPad desktop identification follows the Apple touch path',()=>{assert.equal(streamDeviceProfile({userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:5}).name,'apple-touch');});
test('desktop retains its existing render path',()=>{const p=streamDeviceProfile({userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:0});assert.equal(p.samples,2);assert.equal(p.canvasDpr,2);});
