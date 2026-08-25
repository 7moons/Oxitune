class E{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if("mediaSession"in navigator);let e=()=>{let n=document.querySelector("video");if(n)n.addEventListener("play",()=>this.handlePlaybackChange(!0)),n.addEventListener("pause",()=>this.handlePlaybackChange(!1)),n.addEventListener("ended",()=>this.handlePlaybackChange(!1)),n.addEventListener("timeupdate",()=>{let o=Math.floor(n.currentTime);this.onTickCallbacks.forEach((r)=>r(o))})},t=new MutationObserver(()=>{this.checkTrackUpdate()}),i=document.body;if(i)t.observe(i,{childList:!0,subtree:!0});e(),this.tickInterval=window.setInterval(()=>{this.checkTrackUpdate();let n=document.querySelector("video");if(n&&!n.paused)this.onTickCallbacks.forEach((o)=>o(Math.floor(n.currentTime)))},1000)}extractTrackInfo(){let e=document.querySelector("video"),t=navigator.mediaSession?.metadata,i=t?.title||"",n=t?.artist||"",o=t?.album||"",r=t?.artwork?.[t.artwork.length-1]?.src||"";if(!i){let c=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(c)i=c.textContent?.trim()||""}if(!n){let c=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(c){let g=(c.textContent?.trim()||"").split("•").map((h)=>h.trim());if(n=g[0]||"",g.length>1)o=g[1]}}if(!r){let c=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(c)r=c.src}let s=new URLSearchParams(window.location.search).get("v")||void 0,m=e?Math.floor(e.duration||0):0,a=e?Math.floor(e.currentTime||0):0,d=e?!e.paused&&!e.ended:!1;if(!i)return null;return{title:i,artist:n||"Unknown Artist",album:o||void 0,coverUrl:r||void 0,durationSecs:m,currentTimeSecs:a,isPlaying:d,videoId:s}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=!this.currentTrack||this.currentTrack.title!==e.title||this.currentTrack.artist!==e.artist||this.currentTrack.videoId!==e.videoId,i=this.currentTrack&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t)this.onTrackChangeCallbacks.forEach((n)=>n(e));if(i)this.onPlaybackChangeCallbacks.forEach((n)=>n(e.isPlaying))}handlePlaybackChange(e){if(this.currentTrack)this.currentTrack.isPlaying=e;this.onPlaybackChangeCallbacks.forEach((t)=>t(e))}destroy(){if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null}}class p{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)t.volume=Math.max(0,Math.min(1,e))}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let i=e.parentElement?.querySelector("paper-icon-button, #button");if(i)i.click()}}}class I{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,i]of this.plugins)if(e?.[t]!==void 0?e[t]:i.defaultEnabled){if(this.enabledPlugins.add(t),i.onInit)try{await i.onInit(this.context)}catch(o){console.error(`[YTMD] Failed to init plugin ${t}:`,o)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let i=this.plugins.get(t);if(i?.onTrackChange)try{i.onTrackChange(e,this.context)}catch(n){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,n)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let i=this.plugins.get(t);if(i?.onPlaybackChange)try{i.onPlaybackChange(e,this.context)}catch(n){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,n)}}}handleTick(e){for(let t of this.enabledPlugins){let i=this.plugins.get(t);if(i?.onTick)try{i.onTick(e,this.context)}catch(n){console.error(`[YTMD] Error in plugin ${t} onTick:`,n)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var B={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Blocks audio/video ads, auto-skips pre-rolls, and dismisses premium upsell banners",defaultEnabled:!0,onInit(e){let t=null,i=()=>{let o=e.getVideoElement();if(document.querySelector(".ad-showing, .ad-interrupting")&&o)o.muted=!0,o.currentTime=o.duration||99999;document.querySelectorAll(".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button").forEach((m)=>m.click()),document.querySelectorAll("ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)").forEach((m)=>{m.style.display="none";let a=m.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(a)a.click()})},n=document.createElement("style");n.id="ytmd-adblock-styles",n.textContent=`
      ytmusic-mealbar-promo-renderer,
      ytmusic-upsell-dialog-renderer,
      .ytmusic-popup-container:has(ytmusic-upsell-dialog-renderer),
      ytmusic-guide-entry-renderer:has(path[d*="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93"]),
      #premium-badge,
      .companion-ad-container {
        display: none !important;
      }
    `,document.head.appendChild(n),t=window.setInterval(i,500),this._cleanup=()=>{if(t)clearInterval(t);let o=document.getElementById("ytmd-adblock-styles");if(o)o.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var R={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){this._segments=[],this._lastVideoId=""},async onTrackChange(e){if(!e.videoId||e.videoId===this._lastVideoId)return;this._lastVideoId=e.videoId,this._segments=[];try{let t=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),i=`https://sponsor.ajay.app/api/skipSegments?videoID=${e.videoId}&categories=${encodeURIComponent(t)}`,n=await fetch(i);if(n.ok){let o=await n.json();this._segments=o,console.log(`[YTMD SponsorBlock] Loaded ${o.length} segments for ${e.videoId}`)}}catch(t){}},onTick(e,t){let i=this._segments;if(!i||i.length===0)return;for(let n of i){let[o,r]=n.segment;if(e>=o&&e<r-0.5){console.log(`[YTMD SponsorBlock] Skipping segment (${n.category}): ${o}s -> ${r}s`);let l=t.getVideoElement();if(l)l.currentTime=r;break}}}};var V={id:"lyrics",name:"Synchronized Lyrics (LRCLIB)",description:"Fetches synchronized scrolling lyrics and displays them with real-time highlighting and seek-on-click",defaultEnabled:!0,onInit(){this._lines=[],this._currentActiveIdx=-1;let e=document.createElement("div");e.id="ytmd-lyrics-container",e.innerHTML=`
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
    `,document.head.appendChild(t),document.body.appendChild(e);let i=document.getElementById("ytmd-lyrics-close");if(i)i.addEventListener("click",()=>{e.classList.toggle("hidden")});this._cleanup=()=>{t.remove(),e.remove()}},async onTrackChange(e,t){let i=document.getElementById("ytmd-lyrics-body");if(i)i.innerHTML='<div class="ytmd-lyrics-placeholder">Loading synced lyrics...</div>';this._lines=[],this._currentActiveIdx=-1;try{let n=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(n?.syncedLyrics){let o=te(n.syncedLyrics);this._lines=o,ne(o,t)}else if(n?.plainLyrics){if(i)i.innerHTML=n.plainLyrics.split(`
`).map((o)=>`<div class="ytmd-lyric-line">${ie(o)}</div>`).join("")}else if(i)i.innerHTML='<div class="ytmd-lyrics-placeholder">No lyrics available for this song.</div>'}catch(n){if(i)i.innerHTML='<div class="ytmd-lyrics-placeholder">Lyrics not found.</div>'}},onTick(e){let t=this._lines;if(!t||t.length===0)return;let i=-1;for(let n=0;n<t.length;n++)if(e>=t[n].timeSecs)i=n;else break;if(i!==this._currentActiveIdx)this._currentActiveIdx=i,document.querySelectorAll(".ytmd-lyric-line").forEach((o,r)=>{if(r===i)o.classList.add("active"),o.scrollIntoView({behavior:"smooth",block:"center"});else o.classList.remove("active")})},onDestroy(){if(this._cleanup)this._cleanup()}};function te(e){let t=e.split(`
`),i=[],n=/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;for(let o of t){let r=o.match(n);if(r){let l=parseInt(r[1],10),s=parseInt(r[2],10),m=parseInt(r[3].padEnd(3,"0").slice(0,3),10),a=l*60+s+m/1000,d=r[4].trim();if(d)i.push({timeSecs:a,text:d})}}return i.sort((o,r)=>o.timeSecs-r.timeSecs)}function ne(e,t){let i=document.getElementById("ytmd-lyrics-body");if(!i)return;i.innerHTML="",e.forEach((n)=>{let o=document.createElement("div");o.className="ytmd-lyric-line",o.textContent=n.text,o.addEventListener("click",()=>{let r=t.getVideoElement();if(r)r.currentTime=n.timeSecs}),i.appendChild(o)})}function ie(e){let t=document.createElement("div");return t.textContent=e,t.innerHTML}var z={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit(e){let t=(i)=>{let n=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!n)return;let o=n.getBoundingClientRect();if(i.clientX>=o.left&&i.clientX<=o.right&&i.clientY>=o.top&&i.clientY<=o.bottom){i.preventDefault();let r=e.getVideoElement();if(r){let l=e.config.wheel_volume_step||0.05,s=i.deltaY<0?l:-l,m=Math.max(0,Math.min(1,r.volume+s));r.volume=m}}};window.addEventListener("wheel",t,{passive:!1}),this._cleanup=()=>{window.removeEventListener("wheel",t)}},onDestroy(){if(this._cleanup)this._cleanup()}};var Y={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!0,async onTrackChange(e,t){try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(i){console.warn("[YTMD] Notification dispatch failed:",i)}}};var q={id:"visualizer",name:"Modern Clean Theme & Custom CSS",description:"Applies sleek dark aesthetics, subtle scrollbars, and user-defined custom CSS",defaultEnabled:!0,onInit(e){let t=document.createElement("style");t.id="ytmd-theme-styles";let i=e.config.custom_css||"",n=e.config.theme||"default-dark",o=`
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
    `;if(n==="oled")o+=`
        body, #content, ytmusic-app-layout, #background.ytmusic-item-section-renderer {
          background-color: #000000 !important;
        }
        ytmusic-nav-bar, ytmusic-player-bar {
          background: #000000 !important;
          border-color: #1a1a1a !important;
        }
      `;t.textContent=`${o}
${i}`,document.head.appendChild(t),this._cleanup=()=>{t.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var M=[32,64,125,250,500,1000,2000,4000,8000,16000],S={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function T(e){return Math.max(-12,Math.min(12,e))}class b{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;static getInstance(){if(!b.instance)b.instance=new b;return b.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=M.map((n,o)=>{if(!this.audioCtx)throw Error("AudioContext missing");let r=this.audioCtx.createBiquadFilter();if(o===0)r.type="lowshelf";else if(o===M.length-1)r.type="highshelf";else r.type="peaking",r.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return r.frequency.setValueAtTime(n,this.audioCtx.currentTime),r.gain.setValueAtTime(0,this.audioCtx.currentTime),r}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph();let i=()=>this.resumeContext();e.addEventListener("play",i),e.addEventListener("playing",i),document.addEventListener("click",i,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.filters.length||!this.audioCtx)return;let i=T(t);this.filters[e].gain.setValueAtTime(i,this.audioCtx.currentTime)}setAllGains(e){if(!this.audioCtx)return;e.forEach((t,i)=>{if(i<this.filters.length)this.filters[i].gain.setValueAtTime(T(t),this.audioCtx.currentTime)})}setPreamp(e){if(!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,T(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=S[e]||S.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return-100;let e=new Float32Array(this.analyserNode.fftSize);this.analyserNode.getFloatTimeDomainData(e);let t=0;for(let n=0;n<e.length;n++)t+=e[n]*e[n];let i=Math.sqrt(t/e.length);if(i<=0.00001)return-100;return 20*Math.log10(i)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){let t=Math.max(0.5,Math.min(2,e));if(this.hookedVideo)this.hookedVideo.playbackRate=t}setPreservesPitch(e){if(this.hookedVideo)this.hookedVideo.preservesPitch=e,this.hookedVideo.mozPreservesPitch=e,this.hookedVideo.webkitPreservesPitch=e}}class L{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)b.getInstance().fadeIn(this.crossfadeSeconds);else b.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let i=t.durationSecs-e;if(i<=this.crossfadeSeconds&&!this.fadeOutTriggered&&i>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${i.toFixed(1)}s remaining)...`),b.getInstance().fadeOut(i),setTimeout(()=>{let n=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===n)console.log("[YTMD Crossfade] Advancing to next track..."),p.next()},Math.max(100,(i-0.2)*1000))}}class D{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,i){if(!this.enabled||!t||!i||i.paused||i.ended)return;let n=b.getInstance().getAudioPowerDb();if(!this.checkedIntro&&e<15)if(n<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${n.toFixed(1)} dB). Fast forwarding...`),i.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(n<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${n.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,p.next()}else this.consecutiveSilentTicks=0}}var H={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=e.getVideoElement(),i=b.getInstance(),n=new L,o=new D;if(this._crossfade=n,this._skipSilence=o,t)i.init(t);else{let l=setInterval(()=>{let s=e.getVideoElement();if(s)clearInterval(l),i.init(s)},500)}let r=e.config;if(r.equalizer_gains&&Array.isArray(r.equalizer_gains))i.setAllGains(r.equalizer_gains);else if(r.equalizer_preset&&typeof r.equalizer_preset==="string")i.applyPreset(r.equalizer_preset);if(r.preamp_gain!==void 0)i.setPreamp(r.preamp_gain);if(r.loudness_normalization!==void 0)i.setLoudnessNormalization(Boolean(r.loudness_normalization));if(r.crossfade_seconds!==void 0)n.setCrossfadeSeconds(r.crossfade_seconds);if(r.skip_silence_enabled!==void 0)o.setEnabled(Boolean(r.skip_silence_enabled));if(r.playback_speed!==void 0)i.setPlaybackRate(r.playback_speed);if(r.preserve_pitch!==void 0)i.setPreservesPitch(Boolean(r.preserve_pitch));if(window.__TAURI__?.event){let{listen:l}=window.__TAURI__.event;l("set-eq-band",(s)=>{i.setBandGain(s.payload.bandIndex,s.payload.gain)}),l("set-eq-all",(s)=>{i.setAllGains(s.payload.gains)}),l("set-eq-preset",(s)=>{i.applyPreset(s.payload)}),l("set-preamp",(s)=>{i.setPreamp(s.payload)}),l("set-loudness-normalization",(s)=>{i.setLoudnessNormalization(s.payload)}),l("set-crossfade-seconds",(s)=>{n.setCrossfadeSeconds(s.payload)}),l("set-skip-silence",(s)=>{o.setEnabled(s.payload)}),l("set-playback-rate",(s)=>{i.setPlaybackRate(s.payload)}),l("set-preserves-pitch",(s)=>{i.setPreservesPitch(s.payload)})}console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){let t=this._crossfade,i=this._skipSilence;if(t)t.onTrackChange(e);if(i)i.onTrackChange()},onTick(e,t){let i=this._crossfade,n=this._skipSilence;if(i)i.onTick(e,t.track);if(n)n.onTick(e,t.track,t.getVideoElement())}};async function U(e){return new Promise((t)=>{let i={primary:"#18181b",secondary:"#09090b",accent:"#dc2626"};if(!e){t(i);return}let n=new Image;n.crossOrigin="anonymous",n.onload=()=>{try{let o=document.createElement("canvas");o.width=16,o.height=16;let r=o.getContext("2d");if(!r){t(i);return}r.drawImage(n,0,0,16,16);let l=r.getImageData(0,0,16,16).data,s=0,m=0,a=0,d=0,c=0,u=0,g=0,h=0;for(let v=0;v<l.length;v+=4){let C=l[v],P=l[v+1],_=l[v+2];if(l[v+3]<128)continue;let N=(C+P+_)/3;if(N<20||N>240)continue;if(v<l.length/2)s+=C,m+=P,a+=_,d++;else c+=C,u+=P,g+=_,h++}if(d===0&&h===0){t(i);return}let y=d>0?Math.round(s/d):220,k=d>0?Math.round(m/d):38,x=d>0?Math.round(a/d):38,w=h>0?Math.round(c/h):24,f=h>0?Math.round(u/h):24,ee=h>0?Math.round(g/h):27;t({primary:`rgb(${y}, ${k}, ${x})`,secondary:`rgb(${w}, ${f}, ${ee})`,accent:`rgb(${Math.min(255,y+30)}, ${Math.min(255,k+30)}, ${Math.min(255,x+30)})`})}catch{t(i)}},n.onerror=()=>t(i),n.src=e})}var F={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Smoothly diffuses dynamic, reactive ambient colors from the active album cover behind the player",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=document.createElement("div"),t.id="ytmd-ambient-backdrop",document.body.prepend(t);let i=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,n=e.config.ambient_lighting_enabled!==!1,o=document.createElement("style");if(o.id="ytmd-ambient-styles",o.textContent=`
      #ytmd-ambient-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 0;
        opacity: ${n?i:0};
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
    `,this._setIntensity=(r)=>{if(t)t.style.opacity=String(r)},window.__TAURI__?.event)window.__TAURI__.event.listen("set-ambient-intensity",(r)=>{this._setIntensity(r.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(r)=>{this._setIntensity(r.payload?0.6:0)});if(e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){if(!e.coverUrl)return;try{let t=await U(e.coverUrl),i=document.getElementById("ytmd-orb-1"),n=document.getElementById("ytmd-orb-2");if(i)i.style.background=t.primary;if(n)n.style.background=t.secondary}catch{}}};var A={default:{id:"default",name:"Modern Dark",css:`
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
    `}};var j={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Applies curated aesthetic themes and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,i=(s)=>{let m=document.getElementById(s);if(!m){m=document.createElement("style"),m.id=s;let a=t();if(a)a.appendChild(m)}return m},n=(s)=>{let m=A[s]||A.default,a=i("ytmd-active-theme");if(a)a.textContent=m.css},o=(s)=>{let m=i("ytmd-custom-css");if(m)m.textContent=s},r=e.config.theme_preset||e.config.theme||"default";n(r);let l=e.config.custom_css||"";if(o(l),window.__TAURI__?.event)window.__TAURI__.event.listen("set-theme-preset",(s)=>{n(s.payload)}),window.__TAURI__.event.listen("set-custom-css",(s)=>{o(s.payload)});console.log("[YTMD] Theme engine active.")}};var G={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let n=document.createElement("button");n.id="ytmd-pip-btn",n.title="Picture-in-Picture (Float Video)",n.innerHTML=`
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/>
          </svg>
        `,n.style.cssText=`
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
        `,n.addEventListener("mouseenter",()=>{n.style.color="#fafafa",n.style.backgroundColor="#27272a"}),n.addEventListener("mouseleave",()=>{n.style.color="#a1a1aa",n.style.backgroundColor="transparent"}),n.addEventListener("click",async()=>{let o=e.getVideoElement();if(!o)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await o.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(r){console.warn("[YTMD PiP] Could not enter PiP:",r),await e.invoke("toggle_mini_player")}}),i.appendChild(n)}};setInterval(t,1000),t()}};var O={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){let t=null,i=!1,n=()=>{if(document.getElementById("ytmd-download-btn"))return;let o=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(o){let r=document.createElement("button");r.id="ytmd-download-btn",r.title="Download Track (MP3/FLAC with ID3 Tags & Lyrics)",r.innerHTML=`
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
        `,r.addEventListener("mouseenter",()=>{if(!i)r.style.color="#fafafa",r.style.backgroundColor="#27272a"}),r.addEventListener("mouseleave",()=>{if(!i)r.style.color="#a1a1aa",r.style.backgroundColor="transparent"}),r.addEventListener("click",async()=>{if(!t||!t.videoId||i)return;i=!0,r.style.color="#38bdf8",r.title="Downloading...";try{let l=e.config.download_format||"mp3",s=e.config.embed_lyrics!==!1;await e.invoke("download_track",{request:{video_id:t.videoId,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:l,embed_lyrics:s}}),r.style.color="#22c55e",r.title="Downloaded!",setTimeout(()=>{i=!1,r.style.color="#a1a1aa",r.title="Download Track"},3000)}catch(l){console.error("[YTMD Downloader] Download failed:",l),r.style.color="#ef4444",setTimeout(()=>{i=!1,r.style.color="#a1a1aa",r.title="Download Track"},3000)}}),o.appendChild(r)}};setInterval(n,1000),n(),this._setCurrentTrack=(o)=>{t=o}},onTrackChange(e){if(this._setCurrentTrack)this._setCurrentTrack(e)}};var W={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-local-nav-btn"))return;let i=document.querySelector("ytmusic-nav-bar .right-content");if(i){let n=document.createElement("button");n.id="ytmd-local-nav-btn",n.title="Local Music Library",n.innerHTML=`
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
          </svg>
          <span style="margin-left: 6px; font-size: 13px; font-weight: 500;">Local Files</span>
        `,n.style.cssText=`
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
        `,n.addEventListener("mouseenter",()=>{n.style.background="#27272a",n.style.borderColor="#3f3f46",n.style.color="#fafafa"}),n.addEventListener("mouseleave",()=>{n.style.background="#18181b",n.style.borderColor="#27272a",n.style.color="#d4d4d8"}),n.addEventListener("click",async()=>{await e.invoke("toggle_local_library_window")}),i.prepend(n)}};setInterval(t,1000),t()}};class Q{isHost=!1;inRoom=!1;lastAppliedTimestamp=0;setRoomState(e,t){this.inRoom=e,this.isHost=t}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback(e,t){if(!this.inRoom||this.isHost||!t)return;let i=Date.now(),n=(i-e.timestamp_ms)/1000,o=e.is_playing?e.current_time_secs+Math.max(0,n):e.current_time_secs;this.lastAppliedTimestamp=i;let r=new URLSearchParams(window.location.search).get("v");if(e.video_id&&r!==e.video_id){console.log(`[YTMD Room Sync] Switching to track: ${e.video_id}`),window.location.href=`https://music.youtube.com/watch?v=${e.video_id}`;return}if(e.is_playing&&t.paused)p.play();else if(!e.is_playing&&!t.paused)p.pause();let l=Math.abs(t.currentTime-o);if(l>1.5)console.log(`[YTMD Room Sync] Drift detected (${l.toFixed(2)}s). Resyncing to ${o.toFixed(1)}s...`),p.seekTo(o)}broadcastLocalState(e,t,i){if(!this.inRoom||!this.isHost||!e||!e.videoId||!t)return;if(Date.now()-this.lastAppliedTimestamp<1000)return;i("broadcast_sync_state",{playback:{video_id:e.videoId,title:e.title,artist:e.artist,current_time_secs:t.currentTime,is_playing:!t.paused,timestamp_ms:Date.now()}}).catch(()=>{})}}var X={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new Q;this._controller=t;let i=()=>{if(document.getElementById("ytmd-sync-nav-btn"))return;let n=document.querySelector("ytmusic-nav-bar .right-content");if(n){let o=document.createElement("button");o.id="ytmd-sync-nav-btn",o.title="Listen Together (Room Sync)",o.innerHTML=`
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
        `,o.addEventListener("mouseenter",()=>{o.style.background="#27272a",o.style.borderColor="#3f3f46",o.style.color="#fafafa"}),o.addEventListener("mouseleave",()=>{o.style.background="#18181b",o.style.borderColor="#27272a",o.style.color="#d4d4d8"}),o.addEventListener("click",async()=>{await e.invoke("toggle_sync_window")}),n.prepend(o)}};if(setInterval(i,1000),i(),window.__TAURI__?.event)window.__TAURI__.event.listen("sync-room-updated",(n)=>{t.setRoomState(!0,n.payload.is_host)}),window.__TAURI__.event.listen("sync-room-left",()=>{t.setRoomState(!1,!1)}),window.__TAURI__.event.listen("sync-playback-remote",(n)=>{t.handleRemotePlayback(n.payload,e.getVideoElement())})},onTick(e,t){let i=this._controller;if(i&&i.isInRoom()&&i.isRoomHost())i.broadcastLocalState(t.track,t.getVideoElement(),t.invoke)}};var J={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Inhibits system sleep during active playback and auto-pauses when screen is locked",defaultEnabled:!0,onInit(e){let t=null,i=e.config.inhibit_sleep!==!1,n=async()=>{if(!i||t!==null)return;try{if("wakeLock"in navigator)t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null});await e.invoke("set_inhibit_sleep",{inhibit:!0})}catch{}},o=async()=>{if(t!==null)try{await t.release(),t=null}catch{}await e.invoke("set_inhibit_sleep",{inhibit:!1})},r=e.getVideoElement();if(r)r.addEventListener("play",n),r.addEventListener("playing",n),r.addEventListener("pause",o),r.addEventListener("ended",o);else{let l=setInterval(()=>{let s=e.getVideoElement();if(s)clearInterval(l),s.addEventListener("play",n),s.addEventListener("playing",n),s.addEventListener("pause",o),s.addEventListener("ended",o)},1000)}if(e.config.pause_on_lock)document.addEventListener("visibilitychange",()=>{if(document.hidden&&e.config.pause_on_lock);})}};var K={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-remote-nav-btn"))return;let i=document.querySelector("ytmusic-nav-bar .right-content");if(i){let n=document.createElement("button");n.id="ytmd-remote-nav-btn",n.title="Mobile Web Remote (QR Code)",n.innerHTML=`
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
          </svg>
          <span style="margin-left: 6px; font-size: 13px; font-weight: 500;">Remote</span>
        `,n.style.cssText=`
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
        `,n.addEventListener("mouseenter",()=>{n.style.background="#27272a",n.style.borderColor="#3f3f46",n.style.color="#fafafa"}),n.addEventListener("mouseleave",()=>{n.style.background="#18181b",n.style.borderColor="#27272a",n.style.color="#d4d4d8"}),n.addEventListener("click",async()=>{await oe(e)}),i.prepend(n)}};setInterval(t,1000),t()}};async function oe(e){let t=document.getElementById("ytmd-remote-modal");if(!t)t=document.createElement("div"),t.id="ytmd-remote-modal",t.style.cssText=`
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
  `;let i=document.getElementById("ytmd-remote-close-btn");if(i)i.addEventListener("click",()=>{if(t)t.style.display="none"});try{let n=await e.invoke("get_remote_info"),o=document.getElementById("ytmd-qr-container"),r=document.getElementById("ytmd-remote-url");if(o&&n.qr_svg){o.innerHTML=n.qr_svg;let l=o.querySelector("svg");if(l)l.style.width="180px",l.style.height="180px",l.style.display="block"}if(r)r.textContent=n.url}catch(n){console.error("[YTMD Remote] Failed to load remote info:",n)}}async function Z(){console.log("[YTMD] Initializing YouTube Music Desktop integration bridge...");let e=async(a,d={})=>{try{let c=window.__TAURI_INTERNALS__;if(c&&typeof c.invoke==="function")return await c.invoke(a,d);let u=window.__TAURI__;if(u?.core&&typeof u.core.invoke==="function")return await u.core.invoke(a,d);console.warn(`[YTMD] Tauri IPC bridge not ready for '${a}'`)}catch(c){console.error(`[YTMD] Failed to invoke '${a}':`,c)}return null},t={};try{let a=await e("get_config");if(a&&typeof a==="object")t=a}catch(a){console.warn("[YTMD] Could not load config from backend, using defaults:",a)}let n=new I({track:null,config:t,invoke:e,sendPlayerCommand:(a)=>{l(a)},getVideoElement:()=>p.getVideo()});n.register(B),n.register(R),n.register(V),n.register(z),n.register(Y),n.register(q),n.register(H),n.register(F),n.register(j),n.register(G),n.register(O),n.register(W),n.register(X),n.register(J),n.register(K),await n.initAll();let o=null,r=new E;r.onTrackChange(async(a)=>{o=a,n.handleTrackChange(a);try{await e("update_track_info",{track:{title:a.title,artist:a.artist,album:a.album||null,cover_url:a.coverUrl||null,duration_secs:a.durationSecs,current_time_secs:a.currentTimeSecs,is_playing:a.isPlaying,video_id:a.videoId||null}})}catch(d){console.error("[YTMD] Failed to sync track info to backend:",d)}}),r.onPlaybackChange(async(a)=>{n.handlePlaybackChange(a);let d=r.getCurrentTrack();if(d){d.isPlaying=a;try{await e("update_track_info",{track:{title:d.title,artist:d.artist,album:d.album||null,cover_url:d.coverUrl||null,duration_secs:d.durationSecs,current_time_secs:d.currentTimeSecs,is_playing:a,video_id:d.videoId||null}})}catch(c){console.error("[YTMD] Failed to sync playback status:",c)}}}),r.onTick((a)=>{n.handleTick(a)});function l(a){switch(a){case"play":p.play();break;case"pause":p.pause();break;case"play_pause":p.playPause();break;case"next":p.next();break;case"previous":p.previous();break;case"like":p.toggleLike();break;case"dislike":p.toggleDislike();break;case"mute":p.toggleMute();break}}let s=(a,d)=>{let c=window.__TAURI__;if(c?.event?.listen)c.event.listen(a,(u)=>d(u.payload))};s("player-command",(a)=>l(a)),s("tray-command",(a)=>l(a)),s("mpris-command",(a)=>l(a)),s("global-shortcut-event",(a)=>l(a)),s("player-seek",(a)=>p.seekTo(a)),s("mpris-command-seek",(a)=>p.seekTo(a)),s("player-volume",(a)=>p.setVolume(a)),window.addEventListener("keydown",(a)=>{if(a.ctrlKey&&a.key===","||a.key==="F2")a.preventDefault(),e("toggle_settings_window")});let m=()=>{if(document.getElementById("ytmd-burger-btn"))return;let a=document.querySelector("ytmusic-nav-bar"),d=document.querySelector("ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content");if(!a||!d)return;let c=document.createElement("button");c.id="ytmd-burger-btn",c.title="YTMD Menu",c.innerHTML=`
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
      </svg>
      <span style="font-size: 13px; font-weight: 700; letter-spacing: -0.2px;">YTMD</span>
    `,c.style.cssText=`
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      background: #18181b !important;
      color: #fafafa !important;
      border: 1px solid #27272a !important;
      padding: 6px 12px !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      font-family: inherit !important;
      margin-right: 12px !important;
      flex-shrink: 0 !important;
      z-index: 1000 !important;
      transition: background 0.15s ease, border-color 0.15s ease;
    `,c.addEventListener("mouseenter",()=>{c.style.background="#27272a",c.style.borderColor="#3f3f46"}),c.addEventListener("mouseleave",()=>{c.style.background="#18181b",c.style.borderColor="#27272a"});let u=document.getElementById("ytmd-burger-popover");if(!u){u=document.createElement("div"),u.id="ytmd-burger-popover",u.style.cssText=`
        position: fixed;
        top: 60px;
        right: 16px;
        width: 280px;
        background: #121215;
        border: 1px solid #27272a;
        border-radius: 12px;
        box-shadow: 0 16px 36px rgba(0,0,0,0.7);
        z-index: 999999;
        display: none;
        flex-direction: column;
        padding: 8px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #fafafa;
        backdrop-filter: blur(12px);
      `;let g=(y,k,x,w)=>{let f=document.createElement("button");return f.style.cssText=`
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: transparent;
          border: none;
          color: #e4e4e7;
          padding: 9px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-family: inherit;
          text-align: left;
          transition: background 0.12s ease, color 0.12s ease;
        `,f.innerHTML=`
          <span style="display:flex; align-items:center; gap:10px;">
            <span style="font-size: 15px;">${y}</span>
            <span style="font-weight: 500;">${k}</span>
          </span>
          <span style="font-size: 11px; color: #71717a; font-family: monospace;">${x}</span>
        `,f.addEventListener("mouseenter",()=>{f.style.background="#27272a",f.style.color="#ffffff"}),f.addEventListener("mouseleave",()=>{f.style.background="transparent",f.style.color="#e4e4e7"}),f.addEventListener("click",()=>{if(u)u.style.display="none";w()}),f},h=()=>{let y=document.createElement("div");return y.style.cssText="height: 1px; background: #27272a; margin: 6px 4px;",y};u.appendChild(g("⚙","Preferences & DSP EQ","Ctrl+,",()=>{e("toggle_settings_window")})),u.appendChild(g("\uD83C\uDFB5","Local Music Library","",()=>{e("toggle_local_library_window")})),u.appendChild(g("\uD83D\uDC65","Listen Together (Sync)","",()=>{e("toggle_sync_window")})),u.appendChild(g("\uD83D\uDCF1","Mobile Web Remote","",()=>{let y=document.getElementById("ytmd-remote-nav-btn");if(y)y.click();else e("toggle_settings_window")})),u.appendChild(g("\uD83D\uDDD6","Mini Player","",()=>{e("toggle_mini_player")})),u.appendChild(h()),u.appendChild(g("⬇","Download Current Track","",async()=>{if(!o||!o.videoId){alert("Please start playing a track to download.");return}try{await e("download_track",{request:{video_id:o.videoId,title:o.title,artist:o.artist,album:o.album||void 0,cover_url:o.coverUrl||void 0,format:t.download_format||"mp3",embed_lyrics:t.embed_lyrics!==!1}}),alert(`Download started for: ${o.title}`)}catch(y){console.error("[YTMD Download Error]:",y)}})),document.body.appendChild(u),document.addEventListener("click",(y)=>{if(u&&u.style.display==="flex"){if(!u.contains(y.target)&&!c.contains(y.target))u.style.display="none"}})}c.addEventListener("click",(g)=>{if(g.stopPropagation(),u)u.style.display=u.style.display==="flex"?"none":"flex"}),d.insertBefore(c,d.firstChild)};setInterval(m,1000),m(),console.log("[YTMD] Integration activated with Burger Menu.")}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>Z());else Z();
