class E{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if("mediaSession"in navigator);let e=()=>{let i=document.querySelector("video");if(i)i.addEventListener("play",()=>this.handlePlaybackChange(!0)),i.addEventListener("pause",()=>this.handlePlaybackChange(!1)),i.addEventListener("ended",()=>this.handlePlaybackChange(!1)),i.addEventListener("timeupdate",()=>{let a=Math.floor(i.currentTime);this.onTickCallbacks.forEach((o)=>o(a))})},t=new MutationObserver(()=>{this.checkTrackUpdate()}),n=document.body;if(n)t.observe(n,{childList:!0,subtree:!0});e(),this.tickInterval=window.setInterval(()=>{this.checkTrackUpdate();let i=document.querySelector("video");if(i&&!i.paused)this.onTickCallbacks.forEach((a)=>a(Math.floor(i.currentTime)))},1000)}extractTrackInfo(){let e=document.querySelector("video"),t=navigator.mediaSession?.metadata,n=t?.title||"",i=t?.artist||"",a=t?.album||"",o=t?.artwork?.[t.artwork.length-1]?.src||"";if(!n){let c=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(c)n=c.textContent?.trim()||""}if(!i){let c=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(c){let h=(c.textContent?.trim()||"").split("•").map((f)=>f.trim());if(i=h[0]||"",h.length>1)a=h[1]}}if(!o){let c=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(c)o=c.src}let s=new URLSearchParams(window.location.search).get("v")||void 0,l=e?Math.floor(e.duration||0):0,d=e?Math.floor(e.currentTime||0):0,p=e?!e.paused&&!e.ended:!1;if(!n)return null;return{title:n,artist:i||"Unknown Artist",album:a||void 0,coverUrl:o||void 0,durationSecs:l,currentTimeSecs:d,isPlaying:p,videoId:s}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=!this.currentTrack||this.currentTrack.title!==e.title||this.currentTrack.artist!==e.artist||this.currentTrack.videoId!==e.videoId,n=this.currentTrack&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t)this.onTrackChangeCallbacks.forEach((i)=>i(e));if(n)this.onPlaybackChangeCallbacks.forEach((i)=>i(e.isPlaying))}handlePlaybackChange(e){if(this.currentTrack)this.currentTrack.isPlaying=e;this.onPlaybackChangeCallbacks.forEach((t)=>t(e))}destroy(){if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null}}class u{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)t.volume=Math.max(0,Math.min(1,e))}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}class S{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(a){console.error(`[YTMD] Failed to init plugin ${t}:`,a)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,i)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,i)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTick:`,i)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var z={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Blocks audio/video ads, auto-skips pre-rolls, and dismisses premium upsell banners",defaultEnabled:!0,onInit(e){let t=null,n=()=>{let a=e.getVideoElement();if(document.querySelector(".ad-showing, .ad-interrupting")&&a)a.muted=!0,a.currentTime=a.duration||99999;document.querySelectorAll(".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button").forEach((l)=>l.click()),document.querySelectorAll("ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)").forEach((l)=>{l.style.display="none";let d=l.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(d)d.click()})},i=document.createElement("style");i.id="ytmd-adblock-styles",i.textContent=`
      ytmusic-mealbar-promo-renderer,
      ytmusic-upsell-dialog-renderer,
      .ytmusic-popup-container:has(ytmusic-upsell-dialog-renderer),
      ytmusic-guide-entry-renderer:has(path[d*="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93"]),
      #premium-badge,
      .companion-ad-container {
        display: none !important;
      }
    `,document.head.appendChild(i),t=window.setInterval(n,500),this._cleanup=()=>{if(t)clearInterval(t);let a=document.getElementById("ytmd-adblock-styles");if(a)a.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var q={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){this._segments=[],this._lastVideoId=""},async onTrackChange(e){if(!e.videoId||e.videoId===this._lastVideoId)return;this._lastVideoId=e.videoId,this._segments=[];try{let t=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),n=`https://sponsor.ajay.app/api/skipSegments?videoID=${e.videoId}&categories=${encodeURIComponent(t)}`,i=await fetch(n);if(i.ok){let a=await i.json();this._segments=a,console.log(`[YTMD SponsorBlock] Loaded ${a.length} segments for ${e.videoId}`)}}catch(t){}},onTick(e,t){let n=this._segments;if(!n||n.length===0)return;for(let i of n){let[a,o]=i.segment;if(e>=a&&e<o-0.5){console.log(`[YTMD SponsorBlock] Skipping segment (${i.category}): ${a}s -> ${o}s`);let r=t.getVideoElement();if(r)r.currentTime=o;break}}}};var I=null;if(typeof window<"u"&&window.trustedTypes?.createPolicy)try{I=window.trustedTypes.createPolicy("ytmd-default",{createHTML:(e)=>e,createScriptURL:(e)=>e,createScript:(e)=>e})}catch{}function m(e,t){if(I)try{e.innerHTML=I.createHTML(t);return}catch{}try{let i=new DOMParser().parseFromString(t,"text/html");e.replaceChildren(...Array.from(i.body.childNodes))}catch{try{e.innerHTML=t}catch(n){console.warn("[YTMD] Could not set HTML:",n)}}}var H={id:"lyrics",name:"Synchronized Lyrics (LRCLIB)",description:"Fetches synchronized scrolling lyrics and displays them with real-time highlighting and seek-on-click",defaultEnabled:!0,onInit(){this._lines=[],this._currentActiveIdx=-1;let e=document.createElement("div");e.id="ytmd-lyrics-container",m(e,`
      <div class="ytmd-lyrics-header">
        <span class="ytmd-lyrics-title">Synchronized Lyrics</span>
        <button id="ytmd-lyrics-close">✕</button>
      </div>
      <div class="ytmd-lyrics-body" id="ytmd-lyrics-body">
        <div class="ytmd-lyrics-placeholder">Play a song to load lyrics</div>
      </div>
    `);let t=document.createElement("style");t.id="ytmd-lyrics-styles",t.textContent=`
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
    `,document.head.appendChild(t),document.body.appendChild(e);let n=document.getElementById("ytmd-lyrics-close");if(n)n.addEventListener("click",()=>{e.classList.toggle("hidden")});this._cleanup=()=>{t.remove(),e.remove()}},async onTrackChange(e,t){let n=document.getElementById("ytmd-lyrics-body");if(n)m(n,'<div class="ytmd-lyrics-placeholder">Loading synced lyrics...</div>');this._lines=[],this._currentActiveIdx=-1;try{let i=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(i?.syncedLyrics){let a=le(i.syncedLyrics);this._lines=a,ce(a,t)}else if(i?.plainLyrics){if(n){let a=i.plainLyrics.split(`
`);n.replaceChildren(...a.map((o)=>{let r=document.createElement("div");return r.className="ytmd-lyric-line",r.textContent=o,r}))}}else if(n)m(n,'<div class="ytmd-lyrics-placeholder">No lyrics available for this song.</div>')}catch{if(n)m(n,'<div class="ytmd-lyrics-placeholder">Lyrics not found.</div>')}},onTick(e){let t=this._lines;if(!t||t.length===0)return;let n=-1;for(let i=0;i<t.length;i++)if(e>=t[i].timeSecs)n=i;else break;if(n!==this._currentActiveIdx)this._currentActiveIdx=n,document.querySelectorAll(".ytmd-lyric-line").forEach((a,o)=>{if(o===n)a.classList.add("active"),a.scrollIntoView({behavior:"smooth",block:"center"});else a.classList.remove("active")})},onDestroy(){if(this._cleanup)this._cleanup()}};function le(e){let t=e.split(`
`),n=[],i=/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;for(let a of t){let o=a.match(i);if(o){let r=parseInt(o[1],10),s=parseInt(o[2],10),l=parseInt(o[3].padEnd(3,"0").slice(0,3),10),d=r*60+s+l/1000,p=o[4].trim();if(p)n.push({timeSecs:d,text:p})}}return n.sort((a,o)=>a.timeSecs-o.timeSecs)}function ce(e,t){let n=document.getElementById("ytmd-lyrics-body");if(!n)return;n.replaceChildren(),e.forEach((i)=>{let a=document.createElement("div");a.className="ytmd-lyric-line",a.textContent=i.text,a.addEventListener("click",()=>{let o=t.getVideoElement();if(o)o.currentTime=i.timeSecs}),n.appendChild(a)})}var U={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit(e){let t=(n)=>{let i=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!i)return;let a=i.getBoundingClientRect();if(n.clientX>=a.left&&n.clientX<=a.right&&n.clientY>=a.top&&n.clientY<=a.bottom){n.preventDefault();let o=e.getVideoElement();if(o){let r=e.config.wheel_volume_step||0.05,s=n.deltaY<0?r:-r,l=Math.max(0,Math.min(1,o.volume+s));o.volume=l}}};window.addEventListener("wheel",t,{passive:!1}),this._cleanup=()=>{window.removeEventListener("wheel",t)}},onDestroy(){if(this._cleanup)this._cleanup()}};var F={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!0,async onTrackChange(e,t){try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var G={id:"visualizer",name:"Modern Clean Theme & Custom CSS",description:"Applies sleek dark aesthetics, subtle scrollbars, and user-defined custom CSS",defaultEnabled:!0,onInit(e){let t=document.createElement("style");t.id="ytmd-theme-styles";let n=e.config.custom_css||"",i=e.config.theme||"default-dark",a=`
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
    `;if(i==="oled")a+=`
        body, #content, ytmusic-app-layout, #background.ytmusic-item-section-renderer {
          background-color: #000000 !important;
        }
        ytmusic-nav-bar, ytmusic-player-bar {
          background: #000000 !important;
          border-color: #1a1a1a !important;
        }
      `;t.textContent=`${a}
${n}`,document.head.appendChild(t),this._cleanup=()=>{t.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var M=[32,64,125,250,500,1000,2000,4000,8000,16000],L={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function w(e){return Math.max(-12,Math.min(12,e))}class y{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;static getInstance(){if(!y.instance)y.instance=new y;return y.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=M.map((i,a)=>{if(!this.audioCtx)throw Error("AudioContext missing");let o=this.audioCtx.createBiquadFilter();if(a===0)o.type="lowshelf";else if(a===M.length-1)o.type="highshelf";else o.type="peaking",o.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return o.frequency.setValueAtTime(i,this.audioCtx.currentTime),o.gain.setValueAtTime(0,this.audioCtx.currentTime),o}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.filters.length||!this.audioCtx)return;let n=w(t);this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){if(!this.audioCtx)return;e.forEach((t,n)=>{if(n<this.filters.length)this.filters[n].gain.setValueAtTime(w(t),this.audioCtx.currentTime)})}setPreamp(e){if(!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,w(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=L[e]||L.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return-100;let e=new Float32Array(this.analyserNode.fftSize);this.analyserNode.getFloatTimeDomainData(e);let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){let t=Math.max(0.5,Math.min(2,e));if(this.hookedVideo)this.hookedVideo.playbackRate=t}setPreservesPitch(e){if(this.hookedVideo)this.hookedVideo.preservesPitch=e,this.hookedVideo.mozPreservesPitch=e,this.hookedVideo.webkitPreservesPitch=e}}class D{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)y.getInstance().fadeIn(this.crossfadeSeconds);else y.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),y.getInstance().fadeOut(n),setTimeout(()=>{let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[YTMD Crossfade] Advancing to next track..."),u.next()},Math.max(100,(n-0.2)*1000))}}class A{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=y.getInstance().getAudioPowerDb();if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,u.next()}else this.consecutiveSilentTicks=0}}var O={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=e.getVideoElement(),n=y.getInstance(),i=new D,a=new A;if(this._crossfade=i,this._skipSilence=a,t)n.init(t);else{let r=setInterval(()=>{let s=e.getVideoElement();if(s)clearInterval(r),n.init(s)},500)}let o=e.config;if(o.equalizer_gains&&Array.isArray(o.equalizer_gains))n.setAllGains(o.equalizer_gains);else if(o.equalizer_preset&&typeof o.equalizer_preset==="string")n.applyPreset(o.equalizer_preset);if(o.preamp_gain!==void 0)n.setPreamp(o.preamp_gain);if(o.loudness_normalization!==void 0)n.setLoudnessNormalization(Boolean(o.loudness_normalization));if(o.crossfade_seconds!==void 0)i.setCrossfadeSeconds(o.crossfade_seconds);if(o.skip_silence_enabled!==void 0)a.setEnabled(Boolean(o.skip_silence_enabled));if(o.playback_speed!==void 0)n.setPlaybackRate(o.playback_speed);if(o.preserve_pitch!==void 0)n.setPreservesPitch(Boolean(o.preserve_pitch));if(window.__TAURI__?.event){let{listen:r}=window.__TAURI__.event;r("set-eq-band",(s)=>{n.setBandGain(s.payload.bandIndex,s.payload.gain)}),r("set-eq-all",(s)=>{n.setAllGains(s.payload.gains)}),r("set-eq-preset",(s)=>{n.applyPreset(s.payload)}),r("set-preamp",(s)=>{n.setPreamp(s.payload)}),r("set-loudness-normalization",(s)=>{n.setLoudnessNormalization(s.payload)}),r("set-crossfade-seconds",(s)=>{i.setCrossfadeSeconds(s.payload)}),r("set-skip-silence",(s)=>{a.setEnabled(s.payload)}),r("set-playback-rate",(s)=>{n.setPlaybackRate(s.payload)}),r("set-preserves-pitch",(s)=>{n.setPreservesPitch(s.payload)})}console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){let t=this._crossfade,n=this._skipSilence;if(t)t.onTrackChange(e);if(n)n.onTrackChange()},onTick(e,t){let n=this._crossfade,i=this._skipSilence;if(n)n.onTick(e,t.track);if(i)i.onTick(e,t.track,t.getVideoElement())}};async function j(e){return new Promise((t)=>{let n={primary:"#18181b",secondary:"#09090b",accent:"#dc2626"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let a=document.createElement("canvas");a.width=16,a.height=16;let o=a.getContext("2d");if(!o){t(n);return}o.drawImage(i,0,0,16,16);let r=o.getImageData(0,0,16,16).data,s=0,l=0,d=0,p=0,c=0,b=0,h=0,f=0;for(let x=0;x<r.length;x+=4){let C=r[x],P=r[x+1],_=r[x+2];if(r[x+3]<128)continue;let Y=(C+P+_)/3;if(Y<20||Y>240)continue;if(x<r.length/2)s+=C,l+=P,d+=_,p++;else c+=C,b+=P,h+=_,f++}if(p===0&&f===0){t(n);return}let g=p>0?Math.round(s/p):220,V=p>0?Math.round(l/p):38,B=p>0?Math.round(d/p):38,re=f>0?Math.round(c/f):24,ae=f>0?Math.round(b/f):24,se=f>0?Math.round(h/f):27;t({primary:`rgb(${g}, ${V}, ${B})`,secondary:`rgb(${re}, ${ae}, ${se})`,accent:`rgb(${Math.min(255,g+30)}, ${Math.min(255,V+30)}, ${Math.min(255,B+30)})`})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var Q={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Smoothly diffuses dynamic, reactive ambient colors from the active album cover behind the player",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=document.createElement("div"),t.id="ytmd-ambient-backdrop",document.body.prepend(t);let n=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,i=e.config.ambient_lighting_enabled!==!1,a=document.createElement("style");if(a.id="ytmd-ambient-styles",a.textContent=`
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
    `,document.head.appendChild(a),m(t,`
      <div id="ytmd-orb-1" class="ytmd-ambient-orb"></div>
      <div id="ytmd-orb-2" class="ytmd-ambient-orb"></div>
    `),this._setIntensity=(o)=>{if(t)t.style.opacity=String(o)},window.__TAURI__?.event)window.__TAURI__.event.listen("set-ambient-intensity",(o)=>{this._setIntensity(o.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(o)=>{this._setIntensity(o.payload?0.6:0)});if(e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){if(!e.coverUrl)return;try{let t=await j(e.coverUrl),n=document.getElementById("ytmd-orb-1"),i=document.getElementById("ytmd-orb-2");if(n)n.style.background=t.primary;if(i)i.style.background=t.secondary}catch{}}};var T={default:{id:"default",name:"Modern Dark",css:`
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
    `}};var W={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Applies curated aesthetic themes and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(s)=>{let l=document.getElementById(s);if(!l){l=document.createElement("style"),l.id=s;let d=t();if(d)d.appendChild(l)}return l},i=(s)=>{let l=T[s]||T.default,d=n("ytmd-active-theme");if(d)d.textContent=l.css},a=(s)=>{let l=n("ytmd-custom-css");if(l)l.textContent=s},o=e.config.theme_preset||e.config.theme||"default";i(o);let r=e.config.custom_css||"";if(a(r),window.__TAURI__?.event)window.__TAURI__.event.listen("set-theme-preset",(s)=>{i(s.payload)}),window.__TAURI__.event.listen("set-custom-css",(s)=>{a(s.payload)});console.log("[YTMD] Theme engine active.")}};var X={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let n=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(n){let i=document.createElement("button");i.id="ytmd-pip-btn",i.title="Picture-in-Picture (Float Video)",m(i,`
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/>
          </svg>
        `),i.style.cssText=`
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
        `,i.addEventListener("mouseenter",()=>{i.style.color="#fafafa",i.style.backgroundColor="#27272a"}),i.addEventListener("mouseleave",()=>{i.style.color="#a1a1aa",i.style.backgroundColor="transparent"}),i.addEventListener("click",async()=>{let a=e.getVideoElement();if(!a)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await a.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(o){console.warn("[YTMD PiP] Could not enter PiP:",o),await e.invoke("toggle_mini_player")}}),n.appendChild(i)}};setInterval(t,1000),t()}};var J={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=()=>{if(document.getElementById("ytmd-download-btn"))return;let a=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(a){let o=document.createElement("button");o.id="ytmd-download-btn",o.title="Download Track (MP3/FLAC with ID3 Tags & Lyrics)",m(o,`
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
          </svg>
        `),o.style.cssText=`
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
        `,o.addEventListener("mouseenter",()=>{if(!n)o.style.color="#fafafa",o.style.backgroundColor="#27272a"}),o.addEventListener("mouseleave",()=>{if(!n)o.style.color="#a1a1aa",o.style.backgroundColor="transparent"}),o.addEventListener("click",async()=>{if(!t||!t.videoId||n)return;n=!0,o.style.color="#38bdf8",o.title="Downloading...";try{let r=e.config.download_format||"mp3",s=e.config.embed_lyrics!==!1;await e.invoke("download_track",{request:{video_id:t.videoId,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:r,embed_lyrics:s}}),o.style.color="#22c55e",o.title="Downloaded!",setTimeout(()=>{n=!1,o.style.color="#a1a1aa",o.title="Download Track"},3000)}catch(r){console.error("[YTMD Downloader] Download failed:",r),o.style.color="#ef4444",setTimeout(()=>{n=!1,o.style.color="#a1a1aa",o.title="Download Track"},3000)}}),a.appendChild(o)}};setInterval(i,1000),i(),this._setCurrentTrack=(a)=>{t=a}},onTrackChange(e){if(this._setCurrentTrack)this._setCurrentTrack(e)}};var K={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};class Z{isHost=!1;inRoom=!1;lastAppliedTimestamp=0;setRoomState(e,t){this.inRoom=e,this.isHost=t}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback(e,t){if(!this.inRoom||this.isHost||!t)return;let n=Date.now(),i=(n-e.timestamp_ms)/1000,a=e.is_playing?e.current_time_secs+Math.max(0,i):e.current_time_secs;this.lastAppliedTimestamp=n;let o=new URLSearchParams(window.location.search).get("v");if(e.video_id&&o!==e.video_id){console.log(`[YTMD Room Sync] Switching to track: ${e.video_id}`),window.location.href=`https://music.youtube.com/watch?v=${e.video_id}`;return}if(e.is_playing&&t.paused)u.play();else if(!e.is_playing&&!t.paused)u.pause();let r=Math.abs(t.currentTime-a);if(r>1.5)console.log(`[YTMD Room Sync] Drift detected (${r.toFixed(2)}s). Resyncing to ${a.toFixed(1)}s...`),u.seekTo(a)}broadcastLocalState(e,t,n){if(!this.inRoom||!this.isHost||!e||!e.videoId||!t)return;if(Date.now()-this.lastAppliedTimestamp<1000)return;n("broadcast_sync_state",{playback:{video_id:e.videoId,title:e.title,artist:e.artist,current_time_secs:t.currentTime,is_playing:!t.paused,timestamp_ms:Date.now()}}).catch(()=>{})}}var ee={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new Z;if(this._controller=t,window.__TAURI__?.event)window.__TAURI__.event.listen("sync-room-updated",(n)=>{t.setRoomState(!0,n.payload.is_host)}),window.__TAURI__.event.listen("sync-room-left",()=>{t.setRoomState(!1,!1)}),window.__TAURI__.event.listen("sync-playback-remote",(n)=>{t.handleRemotePlayback(n.payload,e.getVideoElement())})},onTick(e,t){let n=this._controller;if(n&&n.isInRoom()&&n.isRoomHost())n.broadcastLocalState(t.track,t.getVideoElement(),t.invoke)}};var te={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Inhibits system sleep during active playback and auto-pauses when screen is locked",defaultEnabled:!0,onInit(e){let t=null,n=e.config.inhibit_sleep!==!1,i=async()=>{if(!n||t!==null)return;try{if("wakeLock"in navigator)t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null});await e.invoke("set_inhibit_sleep",{inhibit:!0})}catch{}},a=async()=>{if(t!==null)try{await t.release(),t=null}catch{}await e.invoke("set_inhibit_sleep",{inhibit:!1})},o=e.getVideoElement();if(o)o.addEventListener("play",i),o.addEventListener("playing",i),o.addEventListener("pause",a),o.addEventListener("ended",a);else{let r=setInterval(()=>{let s=e.getVideoElement();if(s)clearInterval(r),s.addEventListener("play",i),s.addEventListener("playing",i),s.addEventListener("pause",a),s.addEventListener("ended",a)},1000)}if(e.config.pause_on_lock)document.addEventListener("visibilitychange",()=>{if(document.hidden&&e.config.pause_on_lock);})}};var ne={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>N(e),console.log("[YTMD] Mobile remote module ready.")}};async function N(e){let t=document.getElementById("ytmd-remote-modal");if(!t)t=document.createElement("div"),t.id="ytmd-remote-modal",t.style.cssText=`
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.8);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(12px);
    `,document.body.appendChild(t);t.style.display="flex",m(t,`
    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 14px; padding: 24px; max-width: 360px; width: 90%; text-align: center; color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 24px 48px rgba(0,0,0,0.85);">
      <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 700;">Mobile Web Remote</h3>
      <p style="font-size: 13px; color: #a1a1aa; margin: 0 0 16px 0;">Scan with your phone camera on the same Wi-Fi network:</p>
      <div id="ytmd-qr-container" style="background: #ffffff; padding: 14px; border-radius: 10px; display: inline-block; margin-bottom: 14px; min-width: 180px; min-height: 180px; display: flex; align-items: center; justify-content: center;">
        <span style="color: #52525b; font-size: 12px; font-weight: 500;">Generating QR code...</span>
      </div>
      <div id="ytmd-remote-url" style="font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all; font-weight: 600;"></div>
      <button id="ytmd-remote-close-btn" style="background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 24px; font-weight: 600; cursor: pointer; font-size: 13px; transition: background 0.15s ease;">Close</button>
    </div>
  `);let n=document.getElementById("ytmd-remote-close-btn");if(n)n.addEventListener("click",()=>{if(t)t.style.display="none"});t.addEventListener("click",(i)=>{if(i.target===t)t.style.display="none"});try{let i=await e.invoke("get_remote_info"),a=document.getElementById("ytmd-qr-container"),o=document.getElementById("ytmd-remote-url");if(i&&i.qr_svg&&a){m(a,i.qr_svg);let r=a.querySelector("svg");if(r)r.style.width="180px",r.style.height="180px",r.style.display="block"}else if(a)a.innerHTML='<span style="color: #71717a; font-size: 12px;">Remote server starting...</span>';if(i&&i.url&&o)o.textContent=i.url}catch(i){console.error("[YTMD Remote] Error fetching remote info:",i)}}var v=null,R=null,k=async(e,t={})=>{try{let n=window.__TAURI_INTERNALS__;if(n&&typeof n.invoke==="function")return await n.invoke(e,t);let i=window.__TAURI__;if(i?.core&&typeof i.core.invoke==="function")return await i.core.invoke(e,t)}catch{}return null};function ie(e){if(document.getElementById("ytmd-burger-btn"))return;let t=document.querySelector("ytmusic-nav-bar .left-content, ytmusic-nav-bar #left-content"),n=document.querySelector("ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content"),i=document.querySelector("ytmusic-nav-bar"),a=document.body||document.documentElement;if(!t&&!n&&!a)return;let o=document.createElement("button");o.id="ytmd-burger-btn",o.title="YTMD Desktop Menu (Ctrl+,)",m(o,`
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
    </svg>
    <span style="font-size: 12px; font-weight: 700; letter-spacing: 0.3px;">YTMD</span>
  `),o.style.cssText=`
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;
    background: rgba(255, 255, 255, 0.08) !important;
    color: #f4f4f5 !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    padding: 5px 12px !important;
    border-radius: 16px !important;
    cursor: pointer !important;
    font-family: inherit !important;
    margin-left: 12px !important;
    flex-shrink: 0 !important;
    z-index: 1000 !important;
    transition: all 0.15s ease !important;
  `,o.addEventListener("mouseenter",()=>{o.style.background="rgba(255, 255, 255, 0.16)",o.style.borderColor="rgba(255, 255, 255, 0.25)",o.style.color="#ffffff"}),o.addEventListener("mouseleave",()=>{o.style.background="rgba(255, 255, 255, 0.08)",o.style.borderColor="rgba(255, 255, 255, 0.12)",o.style.color="#f4f4f5"});let r=document.getElementById("ytmd-burger-popover");if(!r){r=document.createElement("div"),r.id="ytmd-burger-popover",r.style.cssText=`
      position: fixed !important;
      top: 56px !important;
      left: 16px !important;
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
    `;let s=(c,b,h,f)=>{let g=document.createElement("button");return g.style.cssText=`
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
      `,m(g,`
        <span style="display:flex; align-items:center; gap:10px;">
          <span style="font-size: 15px;">${c}</span>
          <span style="font-weight: 500;">${b}</span>
        </span>
        <span style="font-size: 11px; color: #71717a; font-family: monospace;">${h}</span>
      `),g.addEventListener("mouseenter",()=>{g.style.background="#27272a",g.style.color="#ffffff"}),g.addEventListener("mouseleave",()=>{g.style.background="transparent",g.style.color="#e4e4e7"}),g.addEventListener("click",()=>{if(r)r.style.display="none";f()}),g},l=()=>{let c=document.createElement("div");return c.style.cssText="height: 1px !important; background: #27272a !important; margin: 6px 4px !important;",c};r.appendChild(s("⚙","Preferences & DSP EQ","Ctrl+,",()=>{k("toggle_settings_window")})),r.appendChild(s("\uD83C\uDFB5","Local Music Library","",()=>{k("toggle_local_library_window")})),r.appendChild(s("\uD83D\uDC65","Listen Together (Sync)","",()=>{k("toggle_sync_window")})),r.appendChild(s("\uD83D\uDCF1","Mobile Web Remote","",()=>{if(R)N(R)})),r.appendChild(s("\uD83D\uDDD6","Mini Player","",()=>{k("toggle_mini_player")})),r.appendChild(l()),r.appendChild(s("⬇","Download Current Track","",async()=>{if(!v||!v.videoId){alert("Please play a track first to download.");return}try{await k("download_track",{request:{video_id:v.videoId,title:v.title,artist:v.artist,album:v.album||void 0,cover_url:v.coverUrl||void 0,format:e.download_format||"mp3",embed_lyrics:e.embed_lyrics!==!1}}),alert(`Download started for: ${v.title}`)}catch(c){console.error("[YTMD Download Error]:",c)}}));let d=document.createElement("div");d.style.cssText="display: flex; gap: 4px; padding: 6px 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;";let p=document.createElement("span");p.textContent="Theme:",p.style.cssText="font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase;",d.appendChild(p),["oled","nord","catppuccin","tokyo_night","gruvbox"].forEach((c)=>{let b=document.createElement("button");b.textContent=c.toUpperCase(),b.style.cssText=`
        background: #1c1c20;
        border: 1px solid #27272a;
        color: #a1a1aa;
        padding: 3px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
      `,b.addEventListener("click",()=>{let h=document.getElementById("ytmd-active-theme");if(h&&T[c])h.textContent=T[c].css}),d.appendChild(b)}),r.appendChild(d),document.body.appendChild(r),document.addEventListener("click",(c)=>{if(r&&r.style.display==="flex"){if(!r.contains(c.target)&&!o.contains(c.target))r.style.display="none"}})}if(o.addEventListener("click",(s)=>{if(s.stopPropagation(),r){let l=o.getBoundingClientRect();r.style.top=`${l.bottom+8}px`,r.style.left=`${Math.max(12,l.left)}px`,r.style.display=r.style.display==="flex"?"none":"flex"}}),t)t.appendChild(o);else if(n)n.prepend(o);else if(i)i.prepend(o);else o.style.position="fixed",o.style.top="10px",o.style.left="16px",a.appendChild(o)}async function oe(){console.log("[YTMD] Initializing YouTube Music Desktop integration bridge...");let e={};ie(e),setInterval(()=>ie(e),1000),k("get_config").then((r)=>{if(r&&typeof r==="object")e=r});let t={track:null,config:e,invoke:k,sendPlayerCommand:(r)=>{a(r)},getVideoElement:()=>u.getVideo()};R=t;let n=new S(t);n.register(z),n.register(q),n.register(H),n.register(U),n.register(F),n.register(G),n.register(O),n.register(Q),n.register(W),n.register(X),n.register(J),n.register(K),n.register(ee),n.register(te),n.register(ne);try{await n.initAll()}catch(r){console.error("[YTMD] Registry init error:",r)}let i=new E;i.onTrackChange(async(r)=>{v=r,n.handleTrackChange(r);try{await k("update_track_info",{track:{title:r.title,artist:r.artist,album:r.album||null,cover_url:r.coverUrl||null,duration_secs:r.durationSecs,current_time_secs:r.currentTimeSecs,is_playing:r.isPlaying,video_id:r.videoId||null}})}catch(s){console.error("[YTMD] Failed to sync track info to backend:",s)}}),i.onPlaybackChange(async(r)=>{n.handlePlaybackChange(r);let s=i.getCurrentTrack();if(s){s.isPlaying=r;try{await k("update_track_info",{track:{title:s.title,artist:s.artist,album:s.album||null,cover_url:s.coverUrl||null,duration_secs:s.durationSecs,current_time_secs:s.currentTimeSecs,is_playing:r,video_id:s.videoId||null}})}catch(l){console.error("[YTMD] Failed to sync playback status:",l)}}}),i.onTick((r)=>{n.handleTick(r)});function a(r){switch(r){case"play":u.play();break;case"pause":u.pause();break;case"play_pause":u.playPause();break;case"next":u.next();break;case"previous":u.previous();break;case"like":u.toggleLike();break;case"dislike":u.toggleDislike();break;case"mute":u.toggleMute();break}}let o=(r,s)=>{let l=window.__TAURI__;if(l?.event?.listen)l.event.listen(r,(d)=>s(d.payload))};o("player-command",(r)=>a(r)),o("tray-command",(r)=>a(r)),o("mpris-command",(r)=>a(r)),o("global-shortcut-event",(r)=>a(r)),o("player-seek",(r)=>u.seekTo(r)),o("mpris-command-seek",(r)=>u.seekTo(r)),o("player-volume",(r)=>u.setVolume(r)),window.addEventListener("keydown",(r)=>{if(r.ctrlKey&&r.key===","||r.key==="F2")r.preventDefault(),k("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>oe());else oe();
