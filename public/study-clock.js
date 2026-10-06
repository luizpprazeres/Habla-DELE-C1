// Counts foreground study time and stops at an idle boundary, never across days.
export class StudyClock {
 constructor(milliseconds=0, idleMs=180000) {this.milliseconds=Math.max(0,Number(milliseconds)||0);this.idleMs=idleMs;this.running=false;this.reason='paused';this.lastTick=0;this.lastActivity=0;}
 resume(now=Date.now()){if(this.running)this.tick(now);this.running=true;this.reason='';this.lastTick=now;this.lastActivity=now;}
 tick(now=Date.now()){if(!this.running)return;const end=Math.min(now,this.lastActivity+this.idleMs);this.milliseconds+=Math.max(0,end-this.lastTick);this.lastTick=Math.max(this.lastTick,now);if(now>=this.lastActivity+this.idleMs){this.running=false;this.reason='idle';}}
 activity(now=Date.now()){this.tick(now);this.lastActivity=now;}
 pause(reason='paused',now=Date.now()){this.tick(now);this.running=false;this.reason=reason;}
 seconds(now=Date.now()){this.tick(now);return Math.floor(this.milliseconds/1000);}
}
