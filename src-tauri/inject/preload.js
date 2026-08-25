class P{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if("mediaSession"in navigator);let e=()=>{let i=document.querySelector("video");if(i)i.addEventListener("play",()=>this.handlePlaybackChange(!0)),i.addEventListener("pause",()=>this.handlePlaybackChange(!1)),i.addEventListener("ended",()=>this.handlePlaybackChange(!1)),i.addEventListener("timeupdate",()=>{let o=Math.floor(i.currentTime);this.onTickCallbacks.forEach((r)=>r(o))})},t=new MutationObserver(()=>{this.checkTrackUpdate()}),n=document.body;if(n)t.observe(n,{childList:!0,subtree:!0});e(),this.tickInterval=window.setInterval(()=>{this.checkTrackUpdate();let i=document.querySelector("video");if(i&&!i.paused)this.onTickCallbacks.forEach((o)=>o(Math.floor(i.currentTime)))},1000)}extractTrackInfo(){let e=document.querySelector("video"),t=navigator.mediaSession?.metadata,n=t?.title||"",i=t?.artist||"",o=t?.album||"",r=t?.artwork?.[t.artwork.length-1]?.src||"";if(!n){let p=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(p)n=p.textContent?.trim()||""}if(!i){let p=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(p){let k=(p.textContent?.trim()||"").split("•").map((b)=>b.trim());if(i=k[0]||"",k.length>1)o=k[1]}}if(!r){let p=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(p)r=p.src}let s=new URLSearchParams(window.location.search).get("v")||void 0,l=e?Math.floor(e.duration||0):0,c=e?Math.floor(e.currentTime||0):0,u=e?!e.paused&&!e.ended:!1;if(!n)return null;return{title:n,artist:i||"Unknown Artist",album:o||void 0,coverUrl:r||void 0,durationSecs:l,currentTimeSecs:c,isPlaying:u,videoId:s}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=!this.currentTrack||this.currentTrack.title!==e.title||this.currentTrack.artist!==e.artist||this.currentTrack.videoId!==e.videoId,n=this.currentTrack&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t)this.onTrackChangeCallbacks.forEach((i)=>i(e));if(n)this.onPlaybackChangeCallbacks.forEach((i)=>i(e.isPlaying))}handlePlaybackChange(e){if(this.currentTrack)this.currentTrack.isPlaying=e;this.onPlaybackChangeCallbacks.forEach((t)=>t(e))}destroy(){if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null}}class d{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)t.volume=Math.max(0,Math.min(1,e))}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}class _{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(o){console.error(`[YTMD] Failed to init plugin ${t}:`,o)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,i)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,i)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTick:`,i)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var R={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Blocks audio/video ads, auto-skips pre-rolls, and dismisses premium upsell banners",defaultEnabled:!0,onInit(e){let t=null,n=()=>{let o=e.getVideoElement();if(document.querySelector(".ad-showing, .ad-interrupting")&&o)o.muted=!0,o.currentTime=o.duration||99999;document.querySelectorAll(".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button").forEach((l)=>l.click()),document.querySelectorAll("ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)").forEach((l)=>{l.style.display="none";let c=l.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(c)c.click()})},i=document.createElement("style");i.id="ytmd-adblock-styles",i.textContent=`
      ytmusic-mealbar-promo-renderer,
      ytmusic-upsell-dialog-renderer,
      .ytmusic-popup-container:has(ytmusic-upsell-dialog-renderer),
      ytmusic-guide-entry-renderer:has(path[d*="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93"]),
      #premium-badge,
      .companion-ad-container {
        display: none !important;
      }
    `,document.head.appendChild(i),t=window.setInterval(n,500),this._cleanup=()=>{if(t)clearInterval(t);let o=document.getElementById("ytmd-adblock-styles");if(o)o.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var B={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){this._segments=[],this._lastVideoId=""},async onTrackChange(e){if(!e.videoId||e.videoId===this._lastVideoId)return;this._lastVideoId=e.videoId,this._segments=[];try{let t=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),n=`https://sponsor.ajay.app/api/skipSegments?videoID=${e.videoId}&categories=${encodeURIComponent(t)}`,i=await fetch(n);if(i.ok){let o=await i.json();this._segments=o,console.log(`[YTMD SponsorBlock] Loaded ${o.length} segments for ${e.videoId}`)}}catch(t){}},onTick(e,t){let n=this._segments;if(!n||n.length===0)return;for(let i of n){let[o,r]=i.segment;if(e>=o&&e<r-0.5){console.log(`[YTMD SponsorBlock] Skipping segment (${i.category}): ${o}s -> ${r}s`);let a=t.getVideoElement();if(a)a.currentTime=r;break}}}};var V={id:"lyrics",name:"Synchronized Lyrics (LRCLIB)",description:"Fetches synchronized scrolling lyrics and displays them with real-time highlighting and seek-on-click",defaultEnabled:!0,onInit(){this._lines=[],this._currentActiveIdx=-1;let e=document.createElement("div");e.id="ytmd-lyrics-container",e.innerHTML=`
      <div class="ytmd-lyrics-header">
        <span class="ytmd-lyrics-title">Synchronized Lyrics</span>
        <button id="ytmd-lyrics-close">✕</button>
      </div>
      <div class="ytmd-lyrics-body" id="ytmd-lyrics-body">
        <div class="ytmd-lyrics-placeholder">Play a song to load lyrics</div>
      </div>
    `;let t=document.createElement("style");t.id="ytmd-lyrics-styles",t.textContent=`
      #ytmd-lyrics-container {
        position: fixed;
        right: 16px;
        bottom: 84px;
        width: 340px;
        max-height: 480px;
        background: #111113;
        border: 1px solid #27272a;
        border-radius: 12px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #f4f4f5;
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      #ytmd-lyrics-container.hidden {
        display: none;
      }
      .ytmd-lyrics-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #27272a;
        background: #18181b;
      }
      .ytmd-lyrics-title {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #a1a1aa;
      }
      #ytmd-lyrics-close {
        background: none;
        border: none;
        color: #71717a;
        cursor: pointer;
        font-size: 14px;
        padding: 4px 8px;
        border-radius: 4px;
      }
      #ytmd-lyrics-close:hover {
        background: #27272a;
        color: #fff;
      }
      .ytmd-lyrics-body {
        padding: 16px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
        scroll-behavior: smooth;
      }
      .ytmd-lyric-line {
        font-size: 15px;
        line-height: 1.5;
        color: #71717a;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 6px;
        transition: color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
      }
      .ytmd-lyric-line:hover {
        color: #e4e4e7;
        background: #1c1c20;
      }
      .ytmd-lyric-line.active {
        color: #ffffff;
        font-weight: 600;
        font-size: 17px;
        background: #27272a;
      }
      .ytmd-lyrics-placeholder {
        color: #71717a;
        font-size: 14px;
        text-align: center;
        margin: auto;
      }
    `,document.head.appendChild(t),document.body.appendChild(e);let n=document.getElementById("ytmd-lyrics-close");if(n)n.addEventListener("click",()=>{e.classList.toggle("hidden")});this._cleanup=()=>{t.remove(),e.remove()}},async onTrackChange(e,t){let n=document.getElementById("ytmd-lyrics-body");if(n)n.innerHTML='<div class="ytmd-lyrics-placeholder">Loading synced lyrics...</div>';this._lines=[],this._currentActiveIdx=-1;try{let i=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(i?.syncedLyrics){let o=oe(i.syncedLyrics);this._lines=o,re(o,t)}else if(i?.plainLyrics){if(n)n.innerHTML=i.plainLyrics.split(`
`).map((o)=>`<div class="ytmd-lyric-line">${ae(o)}</div>`).join("")}else if(n)n.innerHTML='<div class="ytmd-lyrics-placeholder">No lyrics available for this song.</div>'}catch(i){if(n)n.innerHTML='<div class="ytmd-lyrics-placeholder">Lyrics not found.</div>'}},onTick(e){let t=this._lines;if(!t||t.length===0)return;let n=-1;for(let i=0;i<t.length;i++)if(e>=t[i].timeSecs)n=i;else break;if(n!==this._currentActiveIdx)this._currentActiveIdx=n,document.querySelectorAll(".ytmd-lyric-line").forEach((o,r)=>{if(r===n)o.classList.add("active"),o.scrollIntoView({behavior:"smooth",block:"center"});else o.classList.remove("active")})},onDestroy(){if(this._cleanup)this._cleanup()}};function oe(e){let t=e.split(`
`),n=[],i=/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;for(let o of t){let r=o.match(i);if(r){let a=parseInt(r[1],10),s=parseInt(r[2],10),l=parseInt(r[3].padEnd(3,"0").slice(0,3),10),c=a*60+s+l/1000,u=r[4].trim();if(u)n.push({timeSecs:c,text:u})}}return n.sort((o,r)=>o.timeSecs-r.timeSecs)}function re(e,t){let n=document.getElementById("ytmd-lyrics-body");if(!n)return;n.innerHTML="",e.forEach((i)=>{let o=document.createElement("div");o.className="ytmd-lyric-line",o.textContent=i.text,o.addEventListener("click",()=>{let r=t.getVideoElement();if(r)r.currentTime=i.timeSecs}),n.appendChild(o)})}function ae(e){let t=document.createElement("div");return t.textContent=e,t.innerHTML}var z={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit(e){let t=(n)=>{let i=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!i)return;let o=i.getBoundingClientRect();if(n.clientX>=o.left&&n.clientX<=o.right&&n.clientY>=o.top&&n.clientY<=o.bottom){n.preventDefault();let r=e.getVideoElement();if(r){let a=e.config.wheel_volume_step||0.05,s=n.deltaY<0?a:-a,l=Math.max(0,Math.min(1,r.volume+s));r.volume=l}}};window.addEventListener("wheel",t,{passive:!1}),this._cleanup=()=>{window.removeEventListener("wheel",t)}},onDestroy(){if(this._cleanup)this._cleanup()}};var Y={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!0,async onTrackChange(e,t){try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var q={id:"visualizer",name:"Modern Clean Theme & Custom CSS",description:"Applies sleek dark aesthetics, subtle scrollbars, and user-defined custom CSS",defaultEnabled:!0,onInit(e){let t=document.createElement("style");t.id="ytmd-theme-styles";let n=e.config.custom_css||"",i=e.config.theme||"default-dark",o=`
      /* Clean subtle scrollbars */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: #27272a;
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #3f3f46;
      }

      /* Refined UI aesthetics */
      ytmusic-nav-bar {
        background: rgba(9, 9, 11, 0.92) !important;
        backdrop-filter: blur(12px);
        border-bottom: 1px solid #18181b;
      }

      ytmusic-player-bar {
        background: rgba(13, 13, 15, 0.96) !important;
        backdrop-filter: blur(16px);
        border-top: 1px solid #222226;
      }
    `;if(i==="oled")o+=`
        body, #content, ytmusic-app-layout, #background.ytmusic-item-section-renderer {
          background-color: #000000 !important;
        }
        ytmusic-nav-bar, ytmusic-player-bar {
          background: #000000 !important;
          border-color: #1a1a1a !important;
        }
      `;t.textContent=`${o}
${n}`,document.head.appendChild(t),this._cleanup=()=>{t.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var E=[32,64,125,250,500,1000,2000,4000,8000,16000],I={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function x(e){return Math.max(-12,Math.min(12,e))}class g{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;static getInstance(){if(!g.instance)g.instance=new g;return g.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=E.map((i,o)=>{if(!this.audioCtx)throw Error("AudioContext missing");let r=this.audioCtx.createBiquadFilter();if(o===0)r.type="lowshelf";else if(o===E.length-1)r.type="highshelf";else r.type="peaking",r.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return r.frequency.setValueAtTime(i,this.audioCtx.currentTime),r.gain.setValueAtTime(0,this.audioCtx.currentTime),r}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.filters.length||!this.audioCtx)return;let n=x(t);this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){if(!this.audioCtx)return;e.forEach((t,n)=>{if(n<this.filters.length)this.filters[n].gain.setValueAtTime(x(t),this.audioCtx.currentTime)})}setPreamp(e){if(!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,x(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=I[e]||I.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return-100;let e=new Float32Array(this.analyserNode.fftSize);this.analyserNode.getFloatTimeDomainData(e);let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){let t=Math.max(0.5,Math.min(2,e));if(this.hookedVideo)this.hookedVideo.playbackRate=t}setPreservesPitch(e){if(this.hookedVideo)this.hookedVideo.preservesPitch=e,this.hookedVideo.mozPreservesPitch=e,this.hookedVideo.webkitPreservesPitch=e}}class M{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)g.getInstance().fadeIn(this.crossfadeSeconds);else g.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),g.getInstance().fadeOut(n),setTimeout(()=>{let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[YTMD Crossfade] Advancing to next track..."),d.next()},Math.max(100,(n-0.2)*1000))}}class S{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=g.getInstance().getAudioPowerDb();if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,d.next()}else this.consecutiveSilentTicks=0}}var H={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=e.getVideoElement(),n=g.getInstance(),i=new M,o=new S;if(this._crossfade=i,this._skipSilence=o,t)n.init(t);else{let a=setInterval(()=>{let s=e.getVideoElement();if(s)clearInterval(a),n.init(s)},500)}let r=e.config;if(r.equalizer_gains&&Array.isArray(r.equalizer_gains))n.setAllGains(r.equalizer_gains);else if(r.equalizer_preset&&typeof r.equalizer_preset==="string")n.applyPreset(r.equalizer_preset);if(r.preamp_gain!==void 0)n.setPreamp(r.preamp_gain);if(r.loudness_normalization!==void 0)n.setLoudnessNormalization(Boolean(r.loudness_normalization));if(r.crossfade_seconds!==void 0)i.setCrossfadeSeconds(r.crossfade_seconds);if(r.skip_silence_enabled!==void 0)o.setEnabled(Boolean(r.skip_silence_enabled));if(r.playback_speed!==void 0)n.setPlaybackRate(r.playback_speed);if(r.preserve_pitch!==void 0)n.setPreservesPitch(Boolean(r.preserve_pitch));if(window.__TAURI__?.event){let{listen:a}=window.__TAURI__.event;a("set-eq-band",(s)=>{n.setBandGain(s.payload.bandIndex,s.payload.gain)}),a("set-eq-all",(s)=>{n.setAllGains(s.payload.gains)}),a("set-eq-preset",(s)=>{n.applyPreset(s.payload)}),a("set-preamp",(s)=>{n.setPreamp(s.payload)}),a("set-loudness-normalization",(s)=>{n.setLoudnessNormalization(s.payload)}),a("set-crossfade-seconds",(s)=>{i.setCrossfadeSeconds(s.payload)}),a("set-skip-silence",(s)=>{o.setEnabled(s.payload)}),a("set-playback-rate",(s)=>{n.setPlaybackRate(s.payload)}),a("set-preserves-pitch",(s)=>{n.setPreservesPitch(s.payload)})}console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){let t=this._crossfade,n=this._skipSilence;if(t)t.onTrackChange(e);if(n)n.onTrackChange()},onTick(e,t){let n=this._crossfade,i=this._skipSilence;if(n)n.onTick(e,t.track);if(i)i.onTick(e,t.track,t.getVideoElement())}};async function U(e){return new Promise((t)=>{let n={primary:"#18181b",secondary:"#09090b",accent:"#dc2626"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=16,o.height=16;let r=o.getContext("2d");if(!r){t(n);return}r.drawImage(i,0,0,16,16);let a=r.getImageData(0,0,16,16).data,s=0,l=0,c=0,u=0,p=0,m=0,k=0,b=0;for(let f=0;f<a.length;f+=4){let T=a[f],w=a[f+1],C=a[f+2];if(a[f+3]<128)continue;let N=(T+w+C)/3;if(N<20||N>240)continue;if(f<a.length/2)s+=T,l+=w,c+=C,u++;else p+=T,m+=w,k+=C,b++}if(u===0&&b===0){t(n);return}let L=u>0?Math.round(s/u):220,D=u>0?Math.round(l/u):38,A=u>0?Math.round(c/u):38,te=b>0?Math.round(p/b):24,ne=b>0?Math.round(m/b):24,ie=b>0?Math.round(k/b):27;t({primary:`rgb(${L}, ${D}, ${A})`,secondary:`rgb(${te}, ${ne}, ${ie})`,accent:`rgb(${Math.min(255,L+30)}, ${Math.min(255,D+30)}, ${Math.min(255,A+30)})`})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var F={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Smoothly diffuses dynamic, reactive ambient colors from the active album cover behind the player",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=document.createElement("div"),t.id="ytmd-ambient-backdrop",document.body.prepend(t);let n=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,i=e.config.ambient_lighting_enabled!==!1,o=document.createElement("style");if(o.id="ytmd-ambient-styles",o.textContent=`
      #ytmd-ambient-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 0;
        opacity: ${i?n:0};
        transition: opacity 0.8s ease, filter 0.8s ease;
        overflow: hidden;
        filter: blur(90px);
        transform: scale(1.2);
        will-change: transform, opacity;
      }
      .ytmd-ambient-orb {
        position: absolute;
        border-radius: 50%;
        transition: all 1.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      #ytmd-orb-1 {
        width: 60vw;
        height: 60vh;
        top: -10vh;
        right: -10vw;
        background: #18181b;
      }
      #ytmd-orb-2 {
        width: 55vw;
        height: 55vh;
        bottom: 5vh;
        left: -10vw;
        background: #09090b;
      }
      /* Ensure YouTube Music transparent backgrounds let ambient glow pass through subtly */
      ytmusic-app-layout, #browse-page, ytmusic-browse-response {
        background-color: transparent !important;
      }
    `,document.head.appendChild(o),t.innerHTML=`
      <div id="ytmd-orb-1" class="ytmd-ambient-orb"></div>
      <div id="ytmd-orb-2" class="ytmd-ambient-orb"></div>
    `,this._setIntensity=(r)=>{if(t)t.style.opacity=String(r)},window.__TAURI__?.event)window.__TAURI__.event.listen("set-ambient-intensity",(r)=>{this._setIntensity(r.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(r)=>{this._setIntensity(r.payload?0.6:0)});if(e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){if(!e.coverUrl)return;try{let t=await U(e.coverUrl),n=document.getElementById("ytmd-orb-1"),i=document.getElementById("ytmd-orb-2");if(n)n.style.background=t.primary;if(i)i.style.background=t.secondary}catch{}}};var v={default:{id:"default",name:"Modern Dark",css:`
      /* Clean Dark Minimal */
      ytmusic-nav-bar { background: rgba(18, 18, 21, 0.94) !important; border-bottom: 1px solid #27272a !important; }
      ytmusic-player-bar { background: rgba(18, 18, 21, 0.96) !important; border-top: 1px solid #27272a !important; }
    `},oled:{id:"oled",name:"Pure OLED Black",css:`
      body, #content, ytmusic-app-layout, #background.ytmusic-item-section-renderer, ytmusic-browse-response {
        background-color: #000000 !important;
      }
      ytmusic-nav-bar, ytmusic-player-bar, ytmusic-player-page {
        background: #000000 !important;
        border-color: #1a1a1a !important;
      }
      ytmusic-guide-renderer {
        background-color: #000000 !important;
        border-right: 1px solid #141414 !important;
      }
    `},nord:{id:"nord",name:"Nord Arctic",css:`
      body, #content, ytmusic-app-layout {
        background-color: #2e3440 !important;
      }
      ytmusic-nav-bar {
        background: #3b4252 !important;
        border-bottom: 1px solid #434c5e !important;
      }
      ytmusic-player-bar {
        background: #3b4252 !important;
        border-top: 1px solid #434c5e !important;
      }
      ytmusic-guide-renderer {
        background-color: #2e3440 !important;
        border-right: 1px solid #3b4252 !important;
      }
      tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
        background-color: #88c0d0 !important;
      }
    `},catppuccin:{id:"catppuccin",name:"Catppuccin Mocha",css:`
      body, #content, ytmusic-app-layout {
        background-color: #1e1e2e !important;
      }
      ytmusic-nav-bar {
        background: #181825 !important;
        border-bottom: 1px solid #313244 !important;
      }
      ytmusic-player-bar {
        background: #181825 !important;
        border-top: 1px solid #313244 !important;
      }
      ytmusic-guide-renderer {
        background-color: #1e1e2e !important;
        border-right: 1px solid #313244 !important;
      }
      tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
        background-color: #cba6f7 !important;
      }
    `},gruvbox:{id:"gruvbox",name:"Gruvbox Dark",css:`
      body, #content, ytmusic-app-layout {
        background-color: #282828 !important;
      }
      ytmusic-nav-bar {
        background: #1d2021 !important;
        border-bottom: 1px solid #3c3836 !important;
      }
      ytmusic-player-bar {
        background: #1d2021 !important;
        border-top: 1px solid #3c3836 !important;
      }
      ytmusic-guide-renderer {
        background-color: #282828 !important;
        border-right: 1px solid #3c3836 !important;
      }
      tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
        background-color: #fe8019 !important;
      }
    `},tokyo_night:{id:"tokyo_night",name:"Tokyo Night",css:`
      body, #content, ytmusic-app-layout {
        background-color: #1a1b26 !important;
      }
      ytmusic-nav-bar {
        background: #16161e !important;
        border-bottom: 1px solid #292e42 !important;
      }
      ytmusic-player-bar {
        background: #16161e !important;
        border-top: 1px solid #292e42 !important;
      }
      ytmusic-guide-renderer {
        background-color: #1a1b26 !important;
        border-right: 1px solid #292e42 !important;
      }
      tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
        background-color: #7aa2f7 !important;
      }
    `},dracula:{id:"dracula",name:"Dracula",css:`
      body, #content, ytmusic-app-layout {
        background-color: #282a36 !important;
      }
      ytmusic-nav-bar {
        background: #21222c !important;
        border-bottom: 1px solid #44475a !important;
      }
      ytmusic-player-bar {
        background: #21222c !important;
        border-top: 1px solid #44475a !important;
      }
      ytmusic-guide-renderer {
        background-color: #282a36 !important;
        border-right: 1px solid #44475a !important;
      }
      tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
        background-color: #bd93f9 !important;
      }
    `},rose_pine:{id:"rose_pine",name:"Rosé Pine",css:`
      body, #content, ytmusic-app-layout {
        background-color: #191724 !important;
      }
      ytmusic-nav-bar {
        background: #1f1d2e !important;
        border-bottom: 1px solid #26233a !important;
      }
      ytmusic-player-bar {
        background: #1f1d2e !important;
        border-top: 1px solid #26233a !important;
      }
      ytmusic-guide-renderer {
        background-color: #191724 !important;
        border-right: 1px solid #26233a !important;
      }
      tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
        background-color: #eb6f92 !important;
      }
    `}};var j={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Applies curated aesthetic themes and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(s)=>{let l=document.getElementById(s);if(!l){l=document.createElement("style"),l.id=s;let c=t();if(c)c.appendChild(l)}return l},i=(s)=>{let l=v[s]||v.default,c=n("ytmd-active-theme");if(c)c.textContent=l.css},o=(s)=>{let l=n("ytmd-custom-css");if(l)l.textContent=s},r=e.config.theme_preset||e.config.theme||"default";i(r);let a=e.config.custom_css||"";if(o(a),window.__TAURI__?.event)window.__TAURI__.event.listen("set-theme-preset",(s)=>{i(s.payload)}),window.__TAURI__.event.listen("set-custom-css",(s)=>{o(s.payload)});console.log("[YTMD] Theme engine active.")}};var G={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let n=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(n){let i=document.createElement("button");i.id="ytmd-pip-btn",i.title="Picture-in-Picture (Float Video)",i.innerHTML=`
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/>
          </svg>
        `,i.style.cssText=`
          background: none;
          border: none;
          color: #a1a1aa;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 4px;
          transition: color 0.15s ease, background-color 0.15s ease;
        `,i.addEventListener("mouseenter",()=>{i.style.color="#fafafa",i.style.backgroundColor="#27272a"}),i.addEventListener("mouseleave",()=>{i.style.color="#a1a1aa",i.style.backgroundColor="transparent"}),i.addEventListener("click",async()=>{let o=e.getVideoElement();if(!o)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await o.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(r){console.warn("[YTMD PiP] Could not enter PiP:",r),await e.invoke("toggle_mini_player")}}),n.appendChild(i)}};setInterval(t,1000),t()}};var O={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=()=>{if(document.getElementById("ytmd-download-btn"))return;let o=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(o){let r=document.createElement("button");r.id="ytmd-download-btn",r.title="Download Track (MP3/FLAC with ID3 Tags & Lyrics)",r.innerHTML=`
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
          </svg>
        `,r.style.cssText=`
          background: none;
          border: none;
          color: #a1a1aa;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 4px;
          transition: color 0.15s ease, background-color 0.15s ease;
        `,r.addEventListener("mouseenter",()=>{if(!n)r.style.color="#fafafa",r.style.backgroundColor="#27272a"}),r.addEventListener("mouseleave",()=>{if(!n)r.style.color="#a1a1aa",r.style.backgroundColor="transparent"}),r.addEventListener("click",async()=>{if(!t||!t.videoId||n)return;n=!0,r.style.color="#38bdf8",r.title="Downloading...";try{let a=e.config.download_format||"mp3",s=e.config.embed_lyrics!==!1;await e.invoke("download_track",{request:{video_id:t.videoId,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:a,embed_lyrics:s}}),r.style.color="#22c55e",r.title="Downloaded!",setTimeout(()=>{n=!1,r.style.color="#a1a1aa",r.title="Download Track"},3000)}catch(a){console.error("[YTMD Downloader] Download failed:",a),r.style.color="#ef4444",setTimeout(()=>{n=!1,r.style.color="#a1a1aa",r.title="Download Track"},3000)}}),o.appendChild(r)}};setInterval(i,1000),i(),this._setCurrentTrack=(o)=>{t=o}},onTrackChange(e){if(this._setCurrentTrack)this._setCurrentTrack(e)}};var W={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-local-nav-btn"))return;let n=document.querySelector("ytmusic-nav-bar .right-content");if(n){let i=document.createElement("button");i.id="ytmd-local-nav-btn",i.title="Local Music Library",i.innerHTML=`
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
          </svg>
          <span style="margin-left: 6px; font-size: 13px; font-weight: 500;">Local Files</span>
        `,i.style.cssText=`
          display: inline-flex;
          align-items: center;
          background: #18181b;
          border: 1px solid #27272a;
          color: #d4d4d8;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          margin-right: 8px;
          font-family: inherit;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        `,i.addEventListener("mouseenter",()=>{i.style.background="#27272a",i.style.borderColor="#3f3f46",i.style.color="#fafafa"}),i.addEventListener("mouseleave",()=>{i.style.background="#18181b",i.style.borderColor="#27272a",i.style.color="#d4d4d8"}),i.addEventListener("click",async()=>{await e.invoke("toggle_local_library_window")}),n.prepend(i)}};setInterval(t,1000),t()}};class Q{isHost=!1;inRoom=!1;lastAppliedTimestamp=0;setRoomState(e,t){this.inRoom=e,this.isHost=t}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback(e,t){if(!this.inRoom||this.isHost||!t)return;let n=Date.now(),i=(n-e.timestamp_ms)/1000,o=e.is_playing?e.current_time_secs+Math.max(0,i):e.current_time_secs;this.lastAppliedTimestamp=n;let r=new URLSearchParams(window.location.search).get("v");if(e.video_id&&r!==e.video_id){console.log(`[YTMD Room Sync] Switching to track: ${e.video_id}`),window.location.href=`https://music.youtube.com/watch?v=${e.video_id}`;return}if(e.is_playing&&t.paused)d.play();else if(!e.is_playing&&!t.paused)d.pause();let a=Math.abs(t.currentTime-o);if(a>1.5)console.log(`[YTMD Room Sync] Drift detected (${a.toFixed(2)}s). Resyncing to ${o.toFixed(1)}s...`),d.seekTo(o)}broadcastLocalState(e,t,n){if(!this.inRoom||!this.isHost||!e||!e.videoId||!t)return;if(Date.now()-this.lastAppliedTimestamp<1000)return;n("broadcast_sync_state",{playback:{video_id:e.videoId,title:e.title,artist:e.artist,current_time_secs:t.currentTime,is_playing:!t.paused,timestamp_ms:Date.now()}}).catch(()=>{})}}var X={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new Q;this._controller=t;let n=()=>{if(document.getElementById("ytmd-sync-nav-btn"))return;let i=document.querySelector("ytmusic-nav-bar .right-content");if(i){let o=document.createElement("button");o.id="ytmd-sync-nav-btn",o.title="Listen Together (Room Sync)",o.innerHTML=`
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
          <span style="margin-left: 6px; font-size: 13px; font-weight: 500;">Listen Together</span>
        `,o.style.cssText=`
          display: inline-flex;
          align-items: center;
          background: #18181b;
          border: 1px solid #27272a;
          color: #d4d4d8;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          margin-right: 8px;
          font-family: inherit;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        `,o.addEventListener("mouseenter",()=>{o.style.background="#27272a",o.style.borderColor="#3f3f46",o.style.color="#fafafa"}),o.addEventListener("mouseleave",()=>{o.style.background="#18181b",o.style.borderColor="#27272a",o.style.color="#d4d4d8"}),o.addEventListener("click",async()=>{await e.invoke("toggle_sync_window")}),i.prepend(o)}};if(setInterval(n,1000),n(),window.__TAURI__?.event)window.__TAURI__.event.listen("sync-room-updated",(i)=>{t.setRoomState(!0,i.payload.is_host)}),window.__TAURI__.event.listen("sync-room-left",()=>{t.setRoomState(!1,!1)}),window.__TAURI__.event.listen("sync-playback-remote",(i)=>{t.handleRemotePlayback(i.payload,e.getVideoElement())})},onTick(e,t){let n=this._controller;if(n&&n.isInRoom()&&n.isRoomHost())n.broadcastLocalState(t.track,t.getVideoElement(),t.invoke)}};var J={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Inhibits system sleep during active playback and auto-pauses when screen is locked",defaultEnabled:!0,onInit(e){let t=null,n=e.config.inhibit_sleep!==!1,i=async()=>{if(!n||t!==null)return;try{if("wakeLock"in navigator)t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null});await e.invoke("set_inhibit_sleep",{inhibit:!0})}catch{}},o=async()=>{if(t!==null)try{await t.release(),t=null}catch{}await e.invoke("set_inhibit_sleep",{inhibit:!1})},r=e.getVideoElement();if(r)r.addEventListener("play",i),r.addEventListener("playing",i),r.addEventListener("pause",o),r.addEventListener("ended",o);else{let a=setInterval(()=>{let s=e.getVideoElement();if(s)clearInterval(a),s.addEventListener("play",i),s.addEventListener("playing",i),s.addEventListener("pause",o),s.addEventListener("ended",o)},1000)}if(e.config.pause_on_lock)document.addEventListener("visibilitychange",()=>{if(document.hidden&&e.config.pause_on_lock);})}};var K={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-remote-nav-btn"))return;let n=document.querySelector("ytmusic-nav-bar .right-content");if(n){let i=document.createElement("button");i.id="ytmd-remote-nav-btn",i.title="Mobile Web Remote (QR Code)",i.innerHTML=`
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
          </svg>
          <span style="margin-left: 6px; font-size: 13px; font-weight: 500;">Remote</span>
        `,i.style.cssText=`
          display: inline-flex;
          align-items: center;
          background: #18181b;
          border: 1px solid #27272a;
          color: #d4d4d8;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          margin-right: 8px;
          font-family: inherit;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        `,i.addEventListener("mouseenter",()=>{i.style.background="#27272a",i.style.borderColor="#3f3f46",i.style.color="#fafafa"}),i.addEventListener("mouseleave",()=>{i.style.background="#18181b",i.style.borderColor="#27272a",i.style.color="#d4d4d8"}),i.addEventListener("click",async()=>{await se(e)}),n.prepend(i)}};setInterval(t,1000),t()}};async function se(e){let t=document.getElementById("ytmd-remote-modal");if(!t)t=document.createElement("div"),t.id="ytmd-remote-modal",t.style.cssText=`
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.75);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
    `,document.body.appendChild(t);t.style.display="flex",t.innerHTML=`
    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; max-width: 360px; width: 90%; text-align: center; color: #fafafa; font-family: inherit; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
      <h3 style="margin: 0 0 8px 0; font-size: 18px;">Mobile Web Remote</h3>
      <p style="font-size: 13px; color: #a1a1aa; margin-bottom: 16px;">Scan with your phone camera on the same Wi-Fi network:</p>
      <div id="ytmd-qr-container" style="background: #ffffff; padding: 12px; border-radius: 8px; display: inline-block; margin-bottom: 16px;">
        <span style="color: #000; font-size: 12px;">Loading QR code...</span>
      </div>
      <div id="ytmd-remote-url" style="font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all;"></div>
      <button id="ytmd-remote-close-btn" style="background: #dc2626; color: #fff; border: none; border-radius: 6px; padding: 8px 20px; font-weight: 600; cursor: pointer; font-size: 13px;">Close</button>
    </div>
  `;let n=document.getElementById("ytmd-remote-close-btn");if(n)n.addEventListener("click",()=>{if(t)t.style.display="none"});try{let i=await e.invoke("get_remote_info"),o=document.getElementById("ytmd-qr-container"),r=document.getElementById("ytmd-remote-url");if(o&&i.qr_svg){o.innerHTML=i.qr_svg;let a=o.querySelector("svg");if(a)a.style.width="180px",a.style.height="180px",a.style.display="block"}if(r)r.textContent=i.url}catch(i){console.error("[YTMD Remote] Failed to load remote info:",i)}}var h=null,y=async(e,t={})=>{try{let n=window.__TAURI_INTERNALS__;if(n&&typeof n.invoke==="function")return await n.invoke(e,t);let i=window.__TAURI__;if(i?.core&&typeof i.core.invoke==="function")return await i.core.invoke(e,t)}catch{}return null};function Z(e){let t=document.body||document.documentElement;if(!t)return;if(document.getElementById("ytmd-burger-btn"))return;let n=document.createElement("button");n.id="ytmd-burger-btn",n.title="YTMD Menu (Ctrl+,)",n.innerHTML=`
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
    </svg>
    <span style="font-size: 12px; font-weight: 700; letter-spacing: -0.2px;">YTMD</span>
  `,n.style.cssText=`
    position: fixed !important;
    top: 10px !important;
    right: 76px !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;
    background: #18181b !important;
    color: #fafafa !important;
    border: 1px solid #3f3f46 !important;
    padding: 6px 12px !important;
    border-radius: 8px !important;
    cursor: pointer !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    z-index: 2147483647 !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.6) !important;
    transition: background 0.15s ease, border-color 0.15s ease !important;
  `,n.addEventListener("mouseenter",()=>{n.style.background="#27272a",n.style.borderColor="#52525b"}),n.addEventListener("mouseleave",()=>{n.style.background="#18181b",n.style.borderColor="#3f3f46"});let i=document.getElementById("ytmd-burger-popover");if(!i){i=document.createElement("div"),i.id="ytmd-burger-popover",i.style.cssText=`
      position: fixed !important;
      top: 52px !important;
      right: 76px !important;
      width: 290px !important;
      background: #121215 !important;
      border: 1px solid #27272a !important;
      border-radius: 12px !important;
      box-shadow: 0 20px 48px rgba(0,0,0,0.9) !important;
      z-index: 2147483647 !important;
      display: none;
      flex-direction: column;
      padding: 8px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      color: #fafafa !important;
      backdrop-filter: blur(16px) !important;
    `;let o=(l,c,u,p)=>{let m=document.createElement("button");return m.style.cssText=`
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        width: 100% !important;
        background: transparent !important;
        border: none !important;
        color: #e4e4e7 !important;
        padding: 10px 12px !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        font-size: 13px !important;
        font-family: inherit !important;
        text-align: left !important;
        transition: background 0.12s ease, color 0.12s ease !important;
      `,m.innerHTML=`
        <span style="display:flex; align-items:center; gap:10px;">
          <span style="font-size: 15px;">${l}</span>
          <span style="font-weight: 500;">${c}</span>
        </span>
        <span style="font-size: 11px; color: #71717a; font-family: monospace;">${u}</span>
      `,m.addEventListener("mouseenter",()=>{m.style.background="#27272a",m.style.color="#ffffff"}),m.addEventListener("mouseleave",()=>{m.style.background="transparent",m.style.color="#e4e4e7"}),m.addEventListener("click",()=>{if(i)i.style.display="none";p()}),m},r=()=>{let l=document.createElement("div");return l.style.cssText="height: 1px !important; background: #27272a !important; margin: 6px 4px !important;",l};i.appendChild(o("⚙","Preferences & DSP EQ","Ctrl+,",()=>{y("toggle_settings_window")})),i.appendChild(o("\uD83C\uDFB5","Local Music Library","",()=>{y("toggle_local_library_window")})),i.appendChild(o("\uD83D\uDC65","Listen Together (Sync)","",()=>{y("toggle_sync_window")})),i.appendChild(o("\uD83D\uDCF1","Mobile Web Remote","",()=>{let l=document.getElementById("ytmd-remote-nav-btn");if(l)l.click();else y("toggle_settings_window")})),i.appendChild(o("\uD83D\uDDD6","Mini Player","",()=>{y("toggle_mini_player")})),i.appendChild(r()),i.appendChild(o("⬇","Download Current Track","",async()=>{if(!h||!h.videoId){alert("Please play a track first to download.");return}try{await y("download_track",{request:{video_id:h.videoId,title:h.title,artist:h.artist,album:h.album||void 0,cover_url:h.coverUrl||void 0,format:e.download_format||"mp3",embed_lyrics:e.embed_lyrics!==!1}}),alert(`Download started for: ${h.title}`)}catch(l){console.error("[YTMD Download Error]:",l)}}));let a=document.createElement("div");a.style.cssText="display: flex; gap: 4px; padding: 6px 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;";let s=document.createElement("span");s.textContent="Theme:",s.style.cssText="font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase;",a.appendChild(s),["oled","nord","catppuccin","tokyo_night","gruvbox"].forEach((l)=>{let c=document.createElement("button");c.textContent=l.toUpperCase(),c.style.cssText=`
        background: #1c1c20;
        border: 1px solid #27272a;
        color: #a1a1aa;
        padding: 3px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
      `,c.addEventListener("click",()=>{let u=document.getElementById("ytmd-active-theme");if(u&&v[l])u.textContent=v[l].css}),a.appendChild(c)}),i.appendChild(a),t.appendChild(i),document.addEventListener("click",(l)=>{if(i&&i.style.display==="flex"){if(!i.contains(l.target)&&!n.contains(l.target))i.style.display="none"}})}n.addEventListener("click",(o)=>{if(o.stopPropagation(),i)i.style.display=i.style.display==="flex"?"none":"flex"}),t.appendChild(n)}async function ee(){console.log("[YTMD] Initializing YouTube Music Desktop integration bridge...");let e={};Z(e),setInterval(()=>Z(e),1000),y("get_config").then((a)=>{if(a&&typeof a==="object")e=a});let n=new _({track:null,config:e,invoke:y,sendPlayerCommand:(a)=>{o(a)},getVideoElement:()=>d.getVideo()});n.register(R),n.register(B),n.register(V),n.register(z),n.register(Y),n.register(q),n.register(H),n.register(F),n.register(j),n.register(G),n.register(O),n.register(W),n.register(X),n.register(J),n.register(K);try{await n.initAll()}catch(a){console.error("[YTMD] Registry init error:",a)}let i=new P;i.onTrackChange(async(a)=>{h=a,n.handleTrackChange(a);try{await y("update_track_info",{track:{title:a.title,artist:a.artist,album:a.album||null,cover_url:a.coverUrl||null,duration_secs:a.durationSecs,current_time_secs:a.currentTimeSecs,is_playing:a.isPlaying,video_id:a.videoId||null}})}catch(s){console.error("[YTMD] Failed to sync track info to backend:",s)}}),i.onPlaybackChange(async(a)=>{n.handlePlaybackChange(a);let s=i.getCurrentTrack();if(s){s.isPlaying=a;try{await y("update_track_info",{track:{title:s.title,artist:s.artist,album:s.album||null,cover_url:s.coverUrl||null,duration_secs:s.durationSecs,current_time_secs:s.currentTimeSecs,is_playing:a,video_id:s.videoId||null}})}catch(l){console.error("[YTMD] Failed to sync playback status:",l)}}}),i.onTick((a)=>{n.handleTick(a)});function o(a){switch(a){case"play":d.play();break;case"pause":d.pause();break;case"play_pause":d.playPause();break;case"next":d.next();break;case"previous":d.previous();break;case"like":d.toggleLike();break;case"dislike":d.toggleDislike();break;case"mute":d.toggleMute();break}}let r=(a,s)=>{let l=window.__TAURI__;if(l?.event?.listen)l.event.listen(a,(c)=>s(c.payload))};r("player-command",(a)=>o(a)),r("tray-command",(a)=>o(a)),r("mpris-command",(a)=>o(a)),r("global-shortcut-event",(a)=>o(a)),r("player-seek",(a)=>d.seekTo(a)),r("mpris-command-seek",(a)=>d.seekTo(a)),r("player-volume",(a)=>d.setVolume(a)),window.addEventListener("keydown",(a)=>{if(a.ctrlKey&&a.key===","||a.key==="F2")a.preventDefault(),y("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>ee());else ee();
