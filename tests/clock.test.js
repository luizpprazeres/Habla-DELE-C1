import test from 'node:test';
import assert from 'node:assert/strict';
import {StudyClock} from '../public/study-clock.js';
test('hidden and overnight periods do not add to study time',()=>{const c=new StudyClock();c.resume(1000);c.pause('hidden',61000);assert.equal(c.seconds(86401000),60);c.resume(86401000);c.pause('paused',86461000);assert.equal(c.seconds(),120);});
test('idle tab stops counting at the boundary, not when the user returns',()=>{const c=new StudyClock(240000);c.resume(1000);assert.equal(c.seconds(86401000),420);assert.equal(c.reason,'idle');assert.equal(c.running,false);c.resume(86401000);c.activity(86411000);assert.equal(c.seconds(86421000),440);});
test('activity refreshes the idle deadline without counting a pause',()=>{const c=new StudyClock(0,10000);c.resume(1000);c.activity(9000);assert.equal(c.seconds(18000),17);c.pause('paused',19000);assert.equal(c.seconds(40000),18);});
