class Y{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if("mediaSession"in navigator);let e=()=>{let o=document.querySelector("video");if(o)o.addEventListener("play",()=>this.handlePlaybackChange(!0)),o.addEventListener("pause",()=>this.handlePlaybackChange(!1)),o.addEventListener("ended",()=>this.handlePlaybackChange(!1)),o.addEventListener("timeupdate",()=>{let r=o.currentTime;this.onTickCallbacks.forEach((i)=>i(r))})},t=new MutationObserver(()=>{this.checkTrackUpdate()}),n=document.body;if(n)t.observe(n,{childList:!0,subtree:!0});e(),this.tickInterval=window.setInterval(()=>{this.checkTrackUpdate();let o=document.querySelector("video");if(o&&!o.paused)this.onTickCallbacks.forEach((r)=>r(o.currentTime))},250)}extractTrackInfo(){let e=document.querySelector("video");if(Boolean(document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-text")||e?.closest(".ad-showing")))return null;let n=navigator.mediaSession?.metadata,o=n?.title||"",r=n?.artist||"",i=n?.album||"",a=n?.artwork?.[n.artwork.length-1]?.src||"";if(!o){let y=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(y)o=y.textContent?.trim()||""}if(!r){let y=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(y){let m=(y.textContent?.trim()||"").split("•").map((v)=>v.trim());if(r=m[0]||"",m.length>1)i=m[1]}}if(!a){let y=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(y)a=y.src}let l=new URLSearchParams(window.location.search).get("v")||void 0,d=e?Math.floor(e.duration||0):0,p=e?Math.floor(e.currentTime||0):0,C=e?!e.paused&&!e.ended:!1;if(!o)return null;return{title:o,artist:r||"Unknown Artist",album:i||void 0,coverUrl:a||void 0,durationSecs:d,currentTimeSecs:p,isPlaying:C,videoId:l}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=!this.currentTrack||this.currentTrack.title!==e.title||this.currentTrack.artist!==e.artist||this.currentTrack.videoId!==e.videoId,n=this.currentTrack&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t)this.onTrackChangeCallbacks.forEach((o)=>o(e));if(n)this.onPlaybackChangeCallbacks.forEach((o)=>o(e.isPlaying))}handlePlaybackChange(e){if(this.currentTrack)this.currentTrack.isPlaying=e;this.onPlaybackChangeCallbacks.forEach((t)=>t(e))}destroy(){if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null}}class u{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)t.volume=Math.max(0,Math.min(1,e))}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}class V{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(r){console.error(`[YTMD] Failed to init plugin ${t}:`,r)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(o){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,o)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(o){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,o)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(o){console.error(`[YTMD] Error in plugin ${t} onTick:`,o)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var Q={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Blocks audio/video ads, auto-skips pre-rolls, and dismisses premium upsell banners",defaultEnabled:!0,onInit(e){let t=null,n=()=>{let r=e.getVideoElement();if(document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-player-overlay")&&r)if(r.muted=!0,r.playbackRate=16,r.duration&&isFinite(r.duration))r.currentTime=r.duration;else r.currentTime=99999;document.querySelectorAll(".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button").forEach((l)=>l.click()),document.querySelectorAll("ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)").forEach((l)=>{l.style.display="none";let d=l.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(d)d.click()})},o=document.createElement("style");o.id="ytmd-adblock-styles",o.textContent=`
      ytmusic-mealbar-promo-renderer,
      ytmusic-upsell-dialog-renderer,
      .ytmusic-popup-container:has(ytmusic-upsell-dialog-renderer),
      ytmusic-guide-entry-renderer:has(path[d*="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93"]),
      #premium-badge,
      .companion-ad-container,
      .ytp-ad-overlay-container {
        display: none !important;
      }
    `,document.head.appendChild(o),t=window.setInterval(n,100),this._cleanup=()=>{if(t)clearInterval(t);let r=document.getElementById("ytmd-adblock-styles");if(r)r.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var W={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){this._segments=[],this._lastVideoId=""},async onTrackChange(e){if(!e.videoId||e.videoId===this._lastVideoId)return;this._lastVideoId=e.videoId,this._segments=[];try{let t=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),n=`https://sponsor.ajay.app/api/skipSegments?videoID=${e.videoId}&categories=${encodeURIComponent(t)}`,o=await fetch(n);if(o.ok){let r=await o.json();this._segments=r,console.log(`[YTMD SponsorBlock] Loaded ${r.length} segments for ${e.videoId}`)}}catch(t){}},onTick(e,t){let n=this._segments;if(!n||n.length===0)return;for(let o of n){let[r,i]=o.segment;if(e>=r&&e<i-0.5){console.log(`[YTMD SponsorBlock] Skipping segment (${o.category}): ${r}s -> ${i}s`);let a=t.getVideoElement();if(a)a.currentTime=i;break}}}};function w(e,t=18,n=18,o="0 0 24 24"){let r=document.createElementNS("http://www.w3.org/2000/svg","svg");r.setAttribute("width",String(t)),r.setAttribute("height",String(n)),r.setAttribute("viewBox",o),r.setAttribute("fill","currentColor");let i=document.createElementNS("http://www.w3.org/2000/svg","path");return i.setAttribute("d",e),r.appendChild(i),r}function c(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var h=[],E=-1,S=null,B="",K={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(e){h=[],E=-1,S=null,B="";let t=document.createElement("style");t.id="ytmd-native-lyrics-styles",t.textContent=`
      #ytmd-native-lyrics-wrapper {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 36px 24px 140px 24px;
        max-width: 760px;
        margin: 0 auto;
        box-sizing: border-box;
        font-family: inherit;
      }
      .ytmd-native-lyric-line {
        font-size: 22px;
        font-weight: 700;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.25);
        cursor: pointer;
        padding: 6px 12px;
        border-radius: 8px;
        transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), font-size 0.2s ease;
        user-select: none;
        word-break: break-word;
      }
      .ytmd-native-lyric-line:hover {
        color: rgba(255, 255, 255, 0.8);
        background: rgba(255, 255, 255, 0.04);
      }
      .ytmd-native-lyric-line.active {
        color: #ffffff !important;
        font-size: 26px !important;
        transform: scale(1.02);
        transform-origin: left center;
        text-shadow: 0 0 28px rgba(255, 255, 255, 0.4);
      }
      .ytmd-native-lyrics-footer {
        margin-top: 48px;
        padding: 16px 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 11px;
        color: #71717a;
        text-transform: uppercase;
        letter-spacing: 0.8px;
      }
      .ytmd-native-lyrics-status {
        padding: 48px 20px;
        color: #71717a;
        font-size: 15px;
        font-weight: 500;
        text-align: center;
      }
      /* Hide default un-synced text when our synced lyrics wrapper is active */
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] #description,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] .description {
        display: none !important;
      }
    `,document.head.appendChild(t),document.addEventListener("click",(o)=>{if(o.target?.closest("tp-yt-paper-tab, ytmusic-tab-header-renderer, .tab-header, ytmusic-player-page"))setTimeout(()=>z(e),100)});let n=window.setInterval(()=>{z(e)},1000);this._cleanup=()=>{clearInterval(n),t.remove();let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o)o.remove()}},async onTrackChange(e,t){let n=`${e.title} - ${e.artist}`;if(B===n&&h.length>0)return;B=n,h=[],E=-1,S=null;let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o)o.replaceChildren(c("div",{className:"ytmd-native-lyrics-status",text:"Loading synchronized lyrics..."}));try{let r=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(S=r,r?.syncedLyrics)h=ye(r.syncedLyrics);z(t),X(t)}catch{if(o)o.replaceChildren(c("div",{className:"ytmd-native-lyrics-status",text:"No lyrics available for this track."}))}},onTick(e){if(!h||h.length===0)return;let t=-1;for(let n=0;n<h.length;n++)if(e>=h[n].timeSecs)t=n;else break;if(t!==E&&t>=0){E=t;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(n)n.querySelectorAll(".ytmd-native-lyric-line").forEach((r,i)=>{if(i===t)r.classList.add("active"),r.scrollIntoView({behavior:"smooth",block:"center"});else r.classList.remove("active")})}},onDestroy(){if(this._cleanup)this._cleanup()}};function z(e){let t=ge();if(!t)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n||!t.contains(n)){if(n)n.remove();n=c("div",{id:"ytmd-native-lyrics-wrapper"}),t.appendChild(n),X(e)}}function X(e){let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(h&&h.length>0)t.replaceChildren(...h.map((n,o)=>{let r=c("div",{className:`ytmd-native-lyric-line${o===E?" active":""}`,text:n.text});return r.addEventListener("click",()=>{let i=e.getVideoElement();if(i)i.currentTime=n.timeSecs}),r}),c("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}));else if(S?.plainLyrics){let n=S.plainLyrics.split(`
`);t.replaceChildren(...n.map((o)=>c("div",{className:"ytmd-native-lyric-line active",text:o,style:"cursor: default;"})),c("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else t.replaceChildren(c("div",{className:"ytmd-native-lyrics-status",text:"Synced lyrics unavailable for this track."}))}function ge(){let e=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] #contents, ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(e)return e;let t=document.querySelector("ytmusic-player-page ytmusic-description-shelf-renderer, ytmusic-description-shelf-renderer");if(t)return t;let n=document.querySelectorAll("ytmusic-player-page ytmusic-tab-renderer");if(n.length>=2)return n[1];return null}function ye(e){let t=e.split(`
`),n=[],o=/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;for(let r of t){let i=o.exec(r.trim());if(i){let a=parseInt(i[1],10),s=parseInt(i[2],10),l=parseInt(i[3].padEnd(3,"0").slice(0,3),10),d=a*60+s+l/1000,p=i[4].trim();if(p)n.push({timeSecs:d,text:p})}}return n.sort((r,i)=>r.timeSecs-i.timeSecs)}var J={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit(e){let t=(n)=>{let o=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!o)return;let r=o.getBoundingClientRect();if(n.clientX>=r.left&&n.clientX<=r.right&&n.clientY>=r.top&&n.clientY<=r.bottom){n.preventDefault();let i=e.getVideoElement();if(i){let a=e.config.wheel_volume_step||0.05,s=n.deltaY<0?a:-a,l=Math.max(0,Math.min(1,i.volume+s));i.volume=l}}};window.addEventListener("wheel",t,{passive:!1}),this._cleanup=()=>{window.removeEventListener("wheel",t)}},onDestroy(){if(this._cleanup)this._cleanup()}};var Z={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var ee={id:"visualizer",name:"Modern Clean Theme & Custom CSS",description:"Applies sleek dark aesthetics, subtle scrollbars, and user-defined custom CSS",defaultEnabled:!0,onInit(e){let t=document.createElement("style");t.id="ytmd-theme-styles";let n=e.config.custom_css||"",o=e.config.theme||"default-dark",r=`
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
    `;if(o==="oled")r+=`
        body, #content, ytmusic-app-layout, #background.ytmusic-item-section-renderer {
          background-color: #000000 !important;
        }
        ytmusic-nav-bar, ytmusic-player-bar {
          background: #000000 !important;
          border-color: #1a1a1a !important;
        }
      `;t.textContent=`${r}
${n}`,document.head.appendChild(t),this._cleanup=()=>{t.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var q=[32,64,125,250,500,1000,2000,4000,8000,16000],H={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function M(e){return Math.max(-12,Math.min(12,e))}class f{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;static getInstance(){if(!f.instance)f.instance=new f;return f.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=q.map((o,r)=>{if(!this.audioCtx)throw Error("AudioContext missing");let i=this.audioCtx.createBiquadFilter();if(r===0)i.type="lowshelf";else if(r===q.length-1)i.type="highshelf";else i.type="peaking",i.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return i.frequency.setValueAtTime(o,this.audioCtx.currentTime),i.gain.setValueAtTime(0,this.audioCtx.currentTime),i}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.filters.length||!this.audioCtx)return;let n=M(t);this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){if(!this.audioCtx)return;e.forEach((t,n)=>{if(n<this.filters.length)this.filters[n].gain.setValueAtTime(M(t),this.audioCtx.currentTime)})}setPreamp(e){if(!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,M(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=H[e]||H.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return-100;let e=new Float32Array(this.analyserNode.fftSize);this.analyserNode.getFloatTimeDomainData(e);let t=0;for(let o=0;o<e.length;o++)t+=e[o]*e[o];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){let t=Math.max(0.5,Math.min(2,e));if(this.hookedVideo)this.hookedVideo.playbackRate=t}setPreservesPitch(e){if(this.hookedVideo)this.hookedVideo.preservesPitch=e,this.hookedVideo.mozPreservesPitch=e,this.hookedVideo.webkitPreservesPitch=e}}class U{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)f.getInstance().fadeIn(this.crossfadeSeconds);else f.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),f.getInstance().fadeOut(n),setTimeout(()=>{let o=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===o)console.log("[YTMD Crossfade] Advancing to next track..."),u.next()},Math.max(100,(n-0.2)*1000))}}class F{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let o=f.getInstance().getAudioPowerDb();if(!this.checkedIntro&&e<15)if(o<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${o.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(o<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${o.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,u.next()}else this.consecutiveSilentTicks=0}}var te={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=e.getVideoElement(),n=f.getInstance(),o=new U,r=new F;if(this._crossfade=o,this._skipSilence=r,t)n.init(t);else{let a=setInterval(()=>{let s=e.getVideoElement();if(s)clearInterval(a),n.init(s)},500)}let i=e.config;if(i.equalizer_gains&&Array.isArray(i.equalizer_gains))n.setAllGains(i.equalizer_gains);else if(i.equalizer_preset&&typeof i.equalizer_preset==="string")n.applyPreset(i.equalizer_preset);if(i.preamp_gain!==void 0)n.setPreamp(i.preamp_gain);if(i.loudness_normalization!==void 0)n.setLoudnessNormalization(Boolean(i.loudness_normalization));if(i.crossfade_seconds!==void 0)o.setCrossfadeSeconds(i.crossfade_seconds);if(i.skip_silence_enabled!==void 0)r.setEnabled(Boolean(i.skip_silence_enabled));if(i.playback_speed!==void 0)n.setPlaybackRate(i.playback_speed);if(i.preserve_pitch!==void 0)n.setPreservesPitch(Boolean(i.preserve_pitch));if(window.__TAURI__?.event){let{listen:a}=window.__TAURI__.event;a("set-eq-band",(s)=>{n.setBandGain(s.payload.bandIndex,s.payload.gain)}),a("set-eq-all",(s)=>{n.setAllGains(s.payload.gains)}),a("set-eq-preset",(s)=>{n.applyPreset(s.payload)}),a("set-preamp",(s)=>{n.setPreamp(s.payload)}),a("set-loudness-normalization",(s)=>{n.setLoudnessNormalization(s.payload)}),a("set-crossfade-seconds",(s)=>{o.setCrossfadeSeconds(s.payload)}),a("set-skip-silence",(s)=>{r.setEnabled(s.payload)}),a("set-playback-rate",(s)=>{n.setPlaybackRate(s.payload)}),a("set-preserves-pitch",(s)=>{n.setPreservesPitch(s.payload)})}console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){let t=this._crossfade,n=this._skipSilence;if(t)t.onTrackChange(e);if(n)n.onTrackChange()},onTick(e,t){let n=this._crossfade,o=this._skipSilence;if(n)n.onTick(e,t.track);if(o)o.onTick(e,t.track,t.getVideoElement())}};async function ne(e){return new Promise((t)=>{let n={primary:"#18181b",secondary:"#09090b",accent:"#dc2626"};if(!e){t(n);return}let o=new Image;o.crossOrigin="anonymous",o.onload=()=>{try{let r=document.createElement("canvas");r.width=16,r.height=16;let i=r.getContext("2d");if(!i){t(n);return}i.drawImage(o,0,0,16,16);let a=i.getImageData(0,0,16,16).data,s=0,l=0,d=0,p=0,C=0,y=0,g=0,m=0;for(let x=0;x<a.length;x+=4){let A=a[x],N=a[x+1],R=a[x+2];if(a[x+3]<128)continue;let O=(A+N+R)/3;if(O<20||O>240)continue;if(x<a.length/2)s+=A,l+=N,d+=R,p++;else C+=A,y+=N,g+=R,m++}if(p===0&&m===0){t(n);return}let v=p>0?Math.round(s/p):220,I=p>0?Math.round(l/p):38,b=p>0?Math.round(d/p):38,_=m>0?Math.round(C/m):24,L=m>0?Math.round(y/m):24,D=m>0?Math.round(g/m):27;t({primary:`rgb(${v}, ${I}, ${b})`,secondary:`rgb(${_}, ${L}, ${D})`,accent:`rgb(${Math.min(255,v+30)}, ${Math.min(255,I+30)}, ${Math.min(255,b+30)})`})}catch{t(n)}},o.onerror=()=>t(n),o.src=e})}var ie={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Smoothly diffuses dynamic, reactive ambient colors from the active album cover behind the player",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=document.createElement("div"),t.id="ytmd-ambient-backdrop",document.body.prepend(t);let n=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,o=e.config.ambient_lighting_enabled!==!1,r=document.createElement("style");r.id="ytmd-ambient-styles",r.textContent=`
      #ytmd-ambient-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 0;
        opacity: ${o?n:0};
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
    `,document.head.appendChild(r);let i=c("div",{id:"ytmd-orb-1",className:"ytmd-ambient-orb"}),a=c("div",{id:"ytmd-orb-2",className:"ytmd-ambient-orb"});if(t.appendChild(i),t.appendChild(a),this._setIntensity=(s)=>{if(t)t.style.opacity=String(s)},window.__TAURI__?.event)window.__TAURI__.event.listen("set-ambient-intensity",(s)=>{this._setIntensity(s.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(s)=>{this._setIntensity(s.payload?0.6:0)});if(e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){if(!e.coverUrl)return;try{let t=await ne(e.coverUrl),n=document.getElementById("ytmd-orb-1"),o=document.getElementById("ytmd-orb-2");if(n)n.style.background=t.primary;if(o)o.style.background=t.secondary}catch{}}};var P={default:{id:"default",name:"Modern Dark",css:`
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
    `}};var oe={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Applies curated aesthetic themes and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(s)=>{let l=document.getElementById(s);if(!l){l=document.createElement("style"),l.id=s;let d=t();if(d)d.appendChild(l)}return l},o=(s)=>{let l=P[s]||P.default,d=n("ytmd-active-theme");if(d)d.textContent=l.css},r=(s)=>{let l=n("ytmd-custom-css");if(l)l.textContent=s},i=e.config.theme_preset||e.config.theme||"default";o(i);let a=e.config.custom_css||"";if(r(a),window.__TAURI__?.event)window.__TAURI__.event.listen("set-theme-preset",(s)=>{o(s.payload)}),window.__TAURI__.event.listen("set-custom-css",(s)=>{r(s.payload)});console.log("[YTMD] Theme engine active.")}};var re={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let n=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(n){let o=c("button",{id:"ytmd-pip-btn",title:"Picture-in-Picture (Float Video)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),r=w("M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",20,20);o.appendChild(r),o.style.cssText=`
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
        `,o.addEventListener("mouseenter",()=>{o.style.color="#fafafa",o.style.backgroundColor="#27272a"}),o.addEventListener("mouseleave",()=>{o.style.color="#a1a1aa",o.style.backgroundColor="transparent"}),o.addEventListener("click",async()=>{let i=e.getVideoElement();if(!i)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await i.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(a){console.warn("[YTMD PiP] Could not enter PiP:",a),await e.invoke("toggle_mini_player")}}),n.appendChild(o)}};setInterval(t,1000),t()}};var ae={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){let t=null,n=!1,o=()=>{if(document.getElementById("ytmd-download-btn"))return;let r=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(r){let i=c("button",{id:"ytmd-download-btn",title:"Download Track (MP3/FLAC with ID3 Tags & Lyrics)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),a=w("M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z",20,20);i.appendChild(a),i.style.cssText=`
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
        `,i.addEventListener("mouseenter",()=>{if(!n)i.style.color="#fafafa",i.style.backgroundColor="#27272a"}),i.addEventListener("mouseleave",()=>{if(!n)i.style.color="#a1a1aa",i.style.backgroundColor="transparent"}),i.addEventListener("click",async()=>{if(!t||!t.videoId||n)return;n=!0,i.style.color="#38bdf8",i.title="Downloading...";try{let s=e.config.download_format||"mp3",l=e.config.embed_lyrics!==!1;await e.invoke("download_track",{request:{video_id:t.videoId,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:s,embed_lyrics:l}}),i.style.color="#22c55e",i.title="Downloaded!",setTimeout(()=>{n=!1,i.style.color="#a1a1aa",i.title="Download Track"},3000)}catch(s){console.error("[YTMD Downloader] Download failed:",s),i.style.color="#ef4444",setTimeout(()=>{n=!1,i.style.color="#a1a1aa",i.title="Download Track"},3000)}}),r.appendChild(i)}};setInterval(o,1000),o(),this._setCurrentTrack=(r)=>{t=r}},onTrackChange(e){if(this._setCurrentTrack)this._setCurrentTrack(e)}};var se={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};class le{isHost=!1;inRoom=!1;lastAppliedTimestamp=0;setRoomState(e,t){this.inRoom=e,this.isHost=t}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback(e,t){if(!this.inRoom||this.isHost||!t)return;let n=Date.now(),o=(n-e.timestamp_ms)/1000,r=e.is_playing?e.current_time_secs+Math.max(0,o):e.current_time_secs;this.lastAppliedTimestamp=n;let i=new URLSearchParams(window.location.search).get("v");if(e.video_id&&i!==e.video_id){console.log(`[YTMD Room Sync] Switching to track: ${e.video_id}`),window.location.href=`https://music.youtube.com/watch?v=${e.video_id}`;return}if(e.is_playing&&t.paused)u.play();else if(!e.is_playing&&!t.paused)u.pause();let a=Math.abs(t.currentTime-r);if(a>1.5)console.log(`[YTMD Room Sync] Drift detected (${a.toFixed(2)}s). Resyncing to ${r.toFixed(1)}s...`),u.seekTo(r)}broadcastLocalState(e,t,n){if(!this.inRoom||!this.isHost||!e||!e.videoId||!t)return;if(Date.now()-this.lastAppliedTimestamp<1000)return;n("broadcast_sync_state",{playback:{video_id:e.videoId,title:e.title,artist:e.artist,current_time_secs:t.currentTime,is_playing:!t.paused,timestamp_ms:Date.now()}}).catch(()=>{})}}var ce={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new le;if(this._controller=t,window.__TAURI__?.event)window.__TAURI__.event.listen("sync-room-updated",(n)=>{t.setRoomState(!0,n.payload.is_host)}),window.__TAURI__.event.listen("sync-room-left",()=>{t.setRoomState(!1,!1)}),window.__TAURI__.event.listen("sync-playback-remote",(n)=>{t.handleRemotePlayback(n.payload,e.getVideoElement())})},onTick(e,t){let n=this._controller;if(n&&n.isInRoom()&&n.isRoomHost())n.broadcastLocalState(t.track,t.getVideoElement(),t.invoke)}};var de={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Inhibits system sleep during active playback and auto-pauses when screen is locked",defaultEnabled:!0,onInit(e){let t=null,n=e.config.inhibit_sleep!==!1,o=async()=>{if(!n||t!==null)return;try{if("wakeLock"in navigator)t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null});await e.invoke("set_inhibit_sleep",{inhibit:!0})}catch{}},r=async()=>{if(t!==null)try{await t.release(),t=null}catch{}await e.invoke("set_inhibit_sleep",{inhibit:!1})},i=e.getVideoElement();if(i)i.addEventListener("play",o),i.addEventListener("playing",o),i.addEventListener("pause",r),i.addEventListener("ended",r);else{let a=setInterval(()=>{let s=e.getVideoElement();if(s)clearInterval(a),s.addEventListener("play",o),s.addEventListener("playing",o),s.addEventListener("pause",r),s.addEventListener("ended",r)},1000)}if(e.config.pause_on_lock)document.addEventListener("visibilitychange",()=>{if(document.hidden&&e.config.pause_on_lock);})}};var ue={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>G(e),console.log("[YTMD] Mobile remote module ready.")}};async function G(e){let t=document.getElementById("ytmd-remote-modal");if(!t){t=c("div",{id:"ytmd-remote-modal",style:`
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
      `});let n=c("div",{style:`
        background: #18181b;
        border: 1px solid #27272a;
        border-radius: 14px;
        padding: 24px;
        max-width: 360px;
        width: 90%;
        text-align: center;
        color: #fafafa;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 24px 48px rgba(0,0,0,0.85);
      `}),o=c("h3",{text:"Mobile Web Remote",style:"margin: 0 0 6px 0; font-size: 18px; font-weight: 700;"}),r=c("p",{text:"Scan with your phone camera on the same Wi-Fi network:",style:"font-size: 13px; color: #a1a1aa; margin: 0 0 16px 0;"}),i=c("div",{id:"ytmd-qr-container",style:`
        background: #ffffff;
        padding: 14px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 14px;
        min-width: 180px;
        min-height: 180px;
      `}),a=c("span",{text:"Generating QR code...",style:"color: #52525b; font-size: 12px; font-weight: 500;"});i.appendChild(a);let s=c("div",{id:"ytmd-remote-url",style:"font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all; font-weight: 600;"}),l=c("button",{id:"ytmd-remote-close-btn",text:"Close",style:"background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 24px; font-weight: 600; cursor: pointer; font-size: 13px;"}),d=t;l.addEventListener("click",()=>{d.style.display="none"}),t.addEventListener("click",(p)=>{if(p.target===d)d.style.display="none"}),n.appendChild(o),n.appendChild(r),n.appendChild(i),n.appendChild(s),n.appendChild(l),t.appendChild(n),document.body.appendChild(t)}t.style.display="flex";try{let n=await e.invoke("get_remote_info"),o=document.getElementById("ytmd-qr-container"),r=document.getElementById("ytmd-remote-url");if(n&&n.qr_svg&&o){let i=c("img");i.src=`data:image/svg+xml;utf8,${encodeURIComponent(n.qr_svg)}`,i.width=180,i.height=180,i.style.display="block",i.alt="Mobile Remote QR Code",o.replaceChildren(i)}else if(o)o.replaceChildren(c("span",{text:"Remote server starting...",style:"color: #71717a; font-size: 12px;"}));if(n&&n.url&&r)r.textContent=n.url}catch(n){console.error("[YTMD Remote] Error fetching remote info:",n)}}var T=null,j=null,k=(e,t={})=>new Promise((n)=>{let o=window.__TAURI__;if(!o?.event?.emit){n(null);return}let r=Math.random().toString(36).slice(2)+Date.now().toString(36),i=null,a=setTimeout(()=>{if(i)i();n(null)},4000);o.event.listen(`ytmd-response-${r}`,(s)=>{if(clearTimeout(a),i)i();n(s.payload)}).then((s)=>{i=s,o.event.emit("ytmd-invoke",{id:r,cmd:e,args:t})}).catch(()=>{clearTimeout(a),n(null)})});function pe(e){if(document.getElementById("ytmd-burger-btn"))return;let t=document.querySelector("ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content"),n=document.querySelector("ytmusic-nav-bar .left-content, ytmusic-nav-bar #left-content"),o=document.querySelector("ytmusic-nav-bar"),r=document.body||document.documentElement;if(!t&&!n&&!r)return;let i=c("button",{id:"ytmd-burger-btn",title:"YouTube Music Desktop Menu (Ctrl+,)",style:`
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      background: #212121 !important;
      color: #f4f4f5 !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      padding: 6px 12px !important;
      border-radius: 18px !important;
      cursor: pointer !important;
      font-family: inherit !important;
      margin: 0 8px !important;
      flex-shrink: 0 !important;
      z-index: 1000 !important;
      transition: background 0.15s ease, border-color 0.15s ease !important;
    `}),a=w("M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",15,15),s=c("span",{text:"YTMD",style:"font-size: 12px; font-weight: 700; letter-spacing: 0.2px;"});i.appendChild(a),i.appendChild(s),i.addEventListener("mouseenter",()=>{i.style.background="#333333",i.style.borderColor="rgba(255, 255, 255, 0.3)",i.style.color="#ffffff"}),i.addEventListener("mouseleave",()=>{i.style.background="#212121",i.style.borderColor="rgba(255, 255, 255, 0.15)",i.style.color="#f4f4f5"});let l=document.getElementById("ytmd-burger-popover");if(!l){l=c("div",{id:"ytmd-burger-popover",style:`
        position: fixed !important;
        top: 56px !important;
        right: 16px !important;
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
      `});let d=(g,m,v,I)=>{let b=c("button",{style:`
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
        `}),_=c("span",{style:"display:flex; align-items:center; gap:10px;"}),L=c("span",{text:g,style:"font-size: 15px;"}),D=c("span",{text:m,style:"font-weight: 500;"});_.appendChild(L),_.appendChild(D);let x=c("span",{text:v,style:"font-size: 11px; color: #71717a; font-family: monospace;"});return b.appendChild(_),b.appendChild(x),b.addEventListener("mouseenter",()=>{b.style.background="#27272a",b.style.color="#ffffff"}),b.addEventListener("mouseleave",()=>{b.style.background="transparent",b.style.color="#e4e4e7"}),b.addEventListener("click",()=>{if(l)l.style.display="none";I()}),b},p=()=>c("div",{style:"height: 1px !important; background: #27272a !important; margin: 6px 4px !important;"});l.appendChild(d("⚙","Preferences & DSP EQ","Ctrl+,",()=>{k("toggle_settings_window")})),l.appendChild(d("\uD83C\uDFB5","Local Music Library","",()=>{k("toggle_local_library_window")})),l.appendChild(d("\uD83D\uDC65","Listen Together (Sync)","",()=>{k("toggle_sync_window")})),l.appendChild(d("\uD83D\uDCF1","Mobile Web Remote","",()=>{if(j)G(j)})),l.appendChild(d("\uD83D\uDDD6","Mini Player","",()=>{k("toggle_mini_player")})),l.appendChild(p()),l.appendChild(d("⬇","Download Current Track","",async()=>{if(!T||!T.videoId){alert("Please play a track first to download.");return}try{await k("download_track",{request:{video_id:T.videoId,title:T.title,artist:T.artist,album:T.album||void 0,cover_url:T.coverUrl||void 0,format:e.download_format||"mp3",embed_lyrics:e.embed_lyrics!==!1}}),alert(`Download started for: ${T.title}`)}catch(g){console.error("[YTMD Download Error]:",g)}}));let C=c("div",{style:"display: flex; gap: 4px; padding: 6px 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;"}),y=c("span",{text:"Theme:",style:"font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase;"});C.appendChild(y),["oled","nord","catppuccin","tokyo_night","gruvbox"].forEach((g)=>{let m=c("button",{text:g.toUpperCase(),style:`
          background: #1c1c20;
          border: 1px solid #27272a;
          color: #a1a1aa;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        `});m.addEventListener("click",()=>{let v=document.getElementById("ytmd-active-theme");if(v&&P[g])v.textContent=P[g].css}),C.appendChild(m)}),l.appendChild(C),document.body.appendChild(l),document.addEventListener("click",(g)=>{if(l&&l.style.display==="flex"){if(!l.contains(g.target)&&!i.contains(g.target))l.style.display="none"}})}if(i.addEventListener("click",(d)=>{if(d.stopPropagation(),l){let p=i.getBoundingClientRect();l.style.top=`${p.bottom+8}px`,l.style.right=`${Math.max(16,window.innerWidth-p.right)}px`,l.style.left="auto",l.style.display=l.style.display==="flex"?"none":"flex"}}),t)t.prepend(i);else if(n)n.appendChild(i);else if(o)o.prepend(i);else i.style.position="fixed",i.style.top="12px",i.style.right="16px",r.appendChild(i)}async function me(){console.log("[YTMD] Initializing YouTube Music Desktop integration bridge...");let e={};pe(e),setInterval(()=>pe(e),1000),k("get_config").then((a)=>{if(a&&typeof a==="object")e=a});let t={track:null,config:e,invoke:k,sendPlayerCommand:(a)=>{r(a)},getVideoElement:()=>u.getVideo()};j=t;let n=new V(t);n.register(Q),n.register(W),n.register(K),n.register(J),n.register(Z),n.register(ee),n.register(te),n.register(ie),n.register(oe),n.register(re),n.register(ae),n.register(se),n.register(ce),n.register(de),n.register(ue);try{await n.initAll()}catch(a){console.error("[YTMD] Registry init error:",a)}let o=new Y;o.onTrackChange(async(a)=>{T=a,n.handleTrackChange(a);try{await k("update_track_info",{track:{title:a.title,artist:a.artist,album:a.album||null,cover_url:a.coverUrl||null,duration_secs:a.durationSecs,current_time_secs:a.currentTimeSecs,is_playing:a.isPlaying,video_id:a.videoId||null}})}catch(s){console.error("[YTMD] Failed to sync track info to backend:",s)}}),o.onPlaybackChange(async(a)=>{n.handlePlaybackChange(a);let s=o.getCurrentTrack();if(s){s.isPlaying=a;try{await k("update_track_info",{track:{title:s.title,artist:s.artist,album:s.album||null,cover_url:s.coverUrl||null,duration_secs:s.durationSecs,current_time_secs:s.currentTimeSecs,is_playing:a,video_id:s.videoId||null}})}catch(l){console.error("[YTMD] Failed to sync playback status:",l)}}}),o.onTick((a)=>{n.handleTick(a)});function r(a){switch(a){case"play":u.play();break;case"pause":u.pause();break;case"play_pause":u.playPause();break;case"next":u.next();break;case"previous":u.previous();break;case"like":u.toggleLike();break;case"dislike":u.toggleDislike();break;case"mute":u.toggleMute();break}}let i=(a,s)=>{let l=window.__TAURI__;if(l?.event?.listen)l.event.listen(a,(d)=>s(d.payload))};i("player-command",(a)=>r(a)),i("tray-command",(a)=>r(a)),i("mpris-command",(a)=>r(a)),i("global-shortcut-event",(a)=>r(a)),i("player-seek",(a)=>u.seekTo(a)),i("mpris-command-seek",(a)=>u.seekTo(a)),i("player-volume",(a)=>u.setVolume(a)),window.addEventListener("keydown",(a)=>{if(a.ctrlKey&&a.key===","||a.key==="F2")a.preventDefault(),k("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>me());else me();
