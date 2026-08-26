class K{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if("mediaSession"in navigator);let e=()=>{let i=document.querySelector("video");if(i)i.addEventListener("play",()=>this.handlePlaybackChange(!0)),i.addEventListener("pause",()=>this.handlePlaybackChange(!1)),i.addEventListener("ended",()=>this.handlePlaybackChange(!1)),i.addEventListener("timeupdate",()=>{let r=i.currentTime;this.onTickCallbacks.forEach((s)=>s(r))})},t=!1,o=new MutationObserver(()=>{if(t)return;t=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),t=!1})}),a=document.querySelector("ytmusic-player-bar")||document.body;if(a)o.observe(a,{childList:!0,subtree:!0,characterData:!0});e(),this.tickInterval=window.setInterval(()=>{this.checkTrackUpdate();let i=document.querySelector("video");if(i&&!i.paused)this.onTickCallbacks.forEach((r)=>r(i.currentTime))},250)}extractTrackInfo(){let e=document.querySelector("video");if(Boolean(document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-text")||e?.closest(".ad-showing")))return null;let n=navigator.mediaSession?.metadata,o=n?.title||"",a=n?.artist||"",i=n?.album||"",r=n?.artwork?.[n.artwork.length-1]?.src||"";if(!o){let y=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(y)o=y.textContent?.trim()||""}if(!a){let y=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(y){let m=(y.textContent?.trim()||"").split("•").map((k)=>k.trim());if(a=m[0]||"",m.length>1)i=m[1]}}if(!r){let y=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(y)r=y.src}let l=new URLSearchParams(window.location.search).get("v")||void 0,d=e?Math.floor(e.duration||0):0,p=e?Math.floor(e.currentTime||0):0,C=e?!e.paused&&!e.ended:!1;if(!o)return null;return{title:o,artist:a||"Unknown Artist",album:i||void 0,coverUrl:r||void 0,durationSecs:d,currentTimeSecs:p,isPlaying:C,videoId:l}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=!this.currentTrack||this.currentTrack.title!==e.title||this.currentTrack.artist!==e.artist||this.currentTrack.videoId!==e.videoId,n=this.currentTrack&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t)this.onTrackChangeCallbacks.forEach((o)=>o(e));if(n)this.onPlaybackChangeCallbacks.forEach((o)=>o(e.isPlaying))}handlePlaybackChange(e){if(this.currentTrack)this.currentTrack.isPlaying=e;this.onPlaybackChangeCallbacks.forEach((t)=>t(e))}destroy(){if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null}}class u{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)t.volume=Math.max(0,Math.min(1,e))}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}class j{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(a){console.error(`[YTMD] Failed to init plugin ${t}:`,a)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(o){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,o)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(o){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,o)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(o){console.error(`[YTMD] Error in plugin ${t} onTick:`,o)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var V=null,P={adWasShowing:!1,preAdMuted:!1},Q=new WeakSet,I=null,pe=null,Ye=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",Ve="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)",Be=`
  .ad-showing video,
  .ad-interrupting video,
  .ytp-ad-player-overlay,
  .ytp-ad-overlay-container,
  .ytp-ad-module,
  ytmusic-mealbar-promo-renderer,
  ytmusic-upsell-dialog-renderer,
  .ytmusic-popup-container:has(ytmusic-upsell-dialog-renderer),
  #premium-badge,
  .companion-ad-container {
    display: none !important;
    opacity: 0 !important;
    pointer-events: none !important;
    visibility: hidden !important;
  }
`,qe=(e)=>{let t=new Set(e);return t.has("ad-showing")||t.has("ad-interrupting")},ze=(e,t,n)=>{if(e&&!t.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:n},setMutedTo:!0};if(!e&&t.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:t.preAdMuted},setMutedTo:t.preAdMuted};return{nextState:t,setMutedTo:null}},J=()=>document.getElementById("movie_player"),Oe=()=>{let e=J();if(!e)return!1;return qe(e.classList)},X=(e)=>{let t=e.getVideoElement();if(!t)return;let{nextState:n,setMutedTo:o}=ze(Oe(),P,t.muted);if(P=n,o!==null)t.muted=o},de=(e)=>{if(Q.has(e))return;Q.add(e),e.click()},B=()=>{document.querySelectorAll(Ye).forEach(de),document.querySelectorAll(Ve).forEach((e)=>{e.style.display="none";let t=e.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(t)de(t)})},ue=(e)=>{let t=J();if(pe=t,!t)return;I?.disconnect(),I=new MutationObserver(()=>{X(e),B()}),I.observe(t,{attributes:!0,attributeFilter:["class"]})},me={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Mutes/hides audio & video ads and dismisses premium upsell banners without touching playback timing",defaultEnabled:!0,onInit(e){P={adWasShowing:!1,preAdMuted:!1},Q=new WeakSet;let t=document.createElement("style");t.id="ytmd-adblock-styles",t.textContent=Be,document.head.appendChild(t);let n=!1,o=new MutationObserver(()=>{if(n)return;n=!0,requestAnimationFrame(()=>{n=!1,B()})});o.observe(document.body,{childList:!0,subtree:!0}),ue(e),B(),X(e),V=()=>{I?.disconnect(),I=null,o.disconnect(),document.getElementById("ytmd-adblock-styles")?.remove();let a=e.getVideoElement();if(a&&P.adWasShowing)a.muted=P.preAdMuted;P={adWasShowing:!1,preAdMuted:!1}}},onTick(e,t){if(J()!==pe)ue(t);X(t),B()},onDestroy(){if(V)V(),V=null}};var _=[],Z="",ge={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){_=[],Z=""},async onTrackChange(e){if(!e.videoId||e.videoId===Z)return;Z=e.videoId,_=[];try{let t=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),n=`https://sponsor.ajay.app/api/skipSegments?videoID=${e.videoId}&categories=${encodeURIComponent(t)}`,o=await fetch(n);if(o.ok){let a=await o.json();_=a,console.log(`[YTMD SponsorBlock] Loaded ${a.length} segments for ${e.videoId}`)}}catch(t){}},onTick(e,t){if(!_||_.length===0)return;for(let n of _){let[o,a]=n.segment;if(e>=o&&e<a-0.5){console.log(`[YTMD SponsorBlock] Skipping segment (${n.category}): ${o}s -> ${a}s`);let i=t.getVideoElement();if(i)i.currentTime=a;break}}}};function E(e,t=18,n=18,o="0 0 24 24"){let a=document.createElementNS("http://www.w3.org/2000/svg","svg");a.setAttribute("width",String(t)),a.setAttribute("height",String(n)),a.setAttribute("viewBox",o),a.setAttribute("fill","currentColor");let i=document.createElementNS("http://www.w3.org/2000/svg","path");return i.setAttribute("d",e),a.appendChild(i),a}function ye(e){try{let o=new DOMParser().parseFromString(e,"image/svg+xml").querySelector("svg");if(o)return document.importNode(o,!0)}catch{}return document.createElementNS("http://www.w3.org/2000/svg","svg")}function c(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var f=[],L=-1,A=null,ee="",q=null,he={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(e){f=[],L=-1,A=null,ee="";let t=document.createElement("style");t.id="ytmd-native-lyrics-styles",t.textContent=`
      /* Force enable TEKST / LYRICS tab header (2nd tab) */
      #tabsContent > .tab-header:nth-of-type(2)[disabled],
      #tabsContent > .tab-header:nth-of-type(2)[aria-disabled="true"],
      tp-yt-paper-tab:nth-of-type(2)[disabled],
      tp-yt-paper-tab:nth-of-type(2)[aria-disabled="true"],
      ytmusic-tab-header-renderer:nth-of-type(2)[disabled] {
        pointer-events: auto !important;
        cursor: pointer !important;
        opacity: 1 !important;
        color: #d4d4d8 !important;
      }

      /* Hide default un-synced text and unavailable messages inside lyrics tab ONLY */
      #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer,
      #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer {
        display: none !important;
      }

      #ytmd-native-lyrics-wrapper {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 40px 24px 160px 24px;
        max-width: 760px;
        margin: 0 auto;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        width: 100%;
      }
      .ytmd-native-lyric-line {
        font-size: 22px;
        font-weight: 700;
        line-height: 1.45;
        color: rgba(255, 255, 255, 0.32);
        cursor: pointer;
        padding: 6px 12px;
        border-radius: 8px;
        transition: color 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), font-size 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        user-select: none;
        word-break: break-word;
        letter-spacing: -0.2px;
      }
      .ytmd-native-lyric-line:hover {
        color: rgba(255, 255, 255, 0.8);
        background: rgba(255, 255, 255, 0.04);
      }
      .ytmd-native-lyric-line.active {
        color: #ffffff !important;
        font-size: 25px !important;
        font-weight: 800 !important;
        transform: scale(1.02);
        transform-origin: left center;
        opacity: 1 !important;
      }
      .ytmd-native-lyrics-footer {
        margin-top: 48px;
        padding: 16px 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 11px;
        color: #71717a;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        font-weight: 600;
      }
      .ytmd-native-lyrics-status {
        padding: 60px 20px;
        color: #71717a;
        font-size: 14px;
        font-weight: 500;
        text-align: center;
      }
    `,document.head.appendChild(t);let n=()=>{te(),be(e)},o=window.setInterval(n,600);n(),q=()=>{clearInterval(o),t.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((i)=>i.remove())}},async onTrackChange(e,t){let n=`${e.title} - ${e.artist}`;if(ee===n&&f.length>0)return;ee=n,f=[],L=-1,A=null,te();let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o)o.replaceChildren(c("div",{className:"ytmd-native-lyrics-status",text:"Loading synchronized lyrics..."}));try{let a=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(A=a,a?.syncedLyrics)f=$e(a.syncedLyrics);te(),be(t),fe(t)}catch{if(o)o.replaceChildren(c("div",{className:"ytmd-native-lyrics-status",text:"No lyrics available for this track."}))}},onTick(e){if(!f||f.length===0)return;let t=-1;for(let n=0;n<f.length;n++)if(e>=f[n].timeSecs)t=n;else break;if(t!==L&&t>=0){L=t;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(n){let o=n.querySelectorAll(".ytmd-native-lyric-line");o.forEach((i,r)=>{if(r===t)i.classList.add("active");else i.classList.remove("active")});let a=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(a&&He(a)){let i=o[t];if(i)i.scrollIntoView({behavior:"smooth",block:"center"})}}}},onDestroy(){if(q)q(),q=null}};function He(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function te(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t,n)=>{let o=t.textContent?.toLowerCase()||"";if(n===1||o.includes("tekst")||o.includes("lyrics")||o.includes("paroles")||o.includes("letras"))t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.style.pointerEvents="auto",t.style.cursor="pointer"})}function be(e){let t=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=t.querySelector("ytmusic-description-shelf-renderer, ytmusic-message-renderer");if(n)n.style.display="none";let o=document.getElementById("ytmd-native-lyrics-wrapper");if(!o||!t.contains(o)){if(o)o.remove();o=c("div",{id:"ytmd-native-lyrics-wrapper"}),t.appendChild(o),fe(e)}}function fe(e){let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(f&&f.length>0)t.replaceChildren(...f.map((n,o)=>{let a=c("div",{className:`ytmd-native-lyric-line${o===L?" active":""}`,text:n.text});return a.addEventListener("click",()=>{let i=e.getVideoElement();if(i)i.currentTime=n.timeSecs}),a}),c("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}));else if(A?.plainLyrics){let n=A.plainLyrics.split(`
`);t.replaceChildren(...n.map((o)=>c("div",{className:"ytmd-native-lyric-line active",text:o,style:"cursor: default;"})),c("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else t.replaceChildren(c("div",{className:"ytmd-native-lyrics-status",text:"Synced lyrics unavailable for this track."}))}function $e(e){let t=e.split(`
`),n=[],o=/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;for(let a of t){let i=o.exec(a.trim());if(i){let r=parseInt(i[1],10),s=parseInt(i[2],10),l=parseInt(i[3].padEnd(3,"0").slice(0,3),10),d=r*60+s+l/1000,p=i[4].trim();if(p)n.push({timeSecs:d,text:p})}}return n.sort((a,i)=>a.timeSecs-i.timeSecs)}var z=null,ve={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit(e){let t=(n)=>{let o=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!o)return;let a=o.getBoundingClientRect();if(n.clientX>=a.left&&n.clientX<=a.right&&n.clientY>=a.top&&n.clientY<=a.bottom){n.preventDefault();let i=e.getVideoElement();if(i){let r=e.config.wheel_volume_step||0.05,s=n.deltaY<0?r:-r,l=Math.max(0,Math.min(1,i.volume+s));i.volume=l}}};window.addEventListener("wheel",t,{passive:!1}),z=()=>{window.removeEventListener("wheel",t)}},onDestroy(){if(z)z(),z=null}};var ke={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var O=null,xe={id:"visualizer",name:"Modern Clean Theme & Custom CSS",description:"Applies sleek dark aesthetics, subtle scrollbars, and user-defined custom CSS",defaultEnabled:!0,onInit(e){let t=document.createElement("style");t.id="ytmd-theme-styles";let n=e.config.custom_css||"",o=`
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

      /* Ensure artwork and thumbnails are always visible and transparent */
      yt-img-shadow,
      yt-img-shadow #content,
      yt-img-shadow img,
      ytmusic-player-page #song-image,
      ytmusic-player-page #song-image #image,
      ytmusic-player-page #song-image #content,
      ytmusic-thumbnail-renderer,
      ytmusic-thumbnail-renderer #content,
      ytmusic-thumbnail-renderer img,
      #thumbnail,
      #thumbnail img,
      #song-image,
      #song-image img {
        background-color: transparent !important;
      }
    `;t.textContent=`${o}
${n}`,document.head.appendChild(t),O=()=>{t.remove()}},onDestroy(){if(O)O(),O=null}};var ne=[32,64,125,250,500,1000,2000,4000,8000,16000],ie={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function H(e){return Math.max(-12,Math.min(12,e))}class h{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;static getInstance(){if(!h.instance)h.instance=new h;return h.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=ne.map((o,a)=>{if(!this.audioCtx)throw Error("AudioContext missing");let i=this.audioCtx.createBiquadFilter();if(a===0)i.type="lowshelf";else if(a===ne.length-1)i.type="highshelf";else i.type="peaking",i.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return i.frequency.setValueAtTime(o,this.audioCtx.currentTime),i.gain.setValueAtTime(0,this.audioCtx.currentTime),i}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.filters.length||!this.audioCtx)return;let n=H(t);this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){if(!this.audioCtx)return;e.forEach((t,n)=>{if(n<this.filters.length)this.filters[n].gain.setValueAtTime(H(t),this.audioCtx.currentTime)})}setPreamp(e){if(!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,H(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=ie[e]||ie.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return-100;let e=new Float32Array(this.analyserNode.fftSize);this.analyserNode.getFloatTimeDomainData(e);let t=0;for(let o=0;o<e.length;o++)t+=e[o]*e[o];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){let t=Math.max(0.5,Math.min(2,e));if(this.hookedVideo)this.hookedVideo.playbackRate=t}setPreservesPitch(e){if(this.hookedVideo){this.hookedVideo.preservesPitch=e;let t=this.hookedVideo;t.mozPreservesPitch=e,t.webkitPreservesPitch=e}}}class oe{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)h.getInstance().fadeIn(this.crossfadeSeconds);else h.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),h.getInstance().fadeOut(n),setTimeout(()=>{let o=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===o)console.log("[YTMD Crossfade] Advancing to next track..."),u.next()},Math.max(100,(n-0.2)*1000))}}class re{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let o=h.getInstance().getAudioPowerDb();if(!this.checkedIntro&&e<15)if(o<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${o.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(o<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${o.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,u.next()}else this.consecutiveSilentTicks=0}}var D=null,R=null,Te={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=e.getVideoElement(),n=h.getInstance(),o=new oe,a=new re;if(D=o,R=a,t)n.init(t);else{let r=setInterval(()=>{let s=e.getVideoElement();if(s)clearInterval(r),n.init(s)},500)}let i=e.config;if(i.equalizer_gains&&Array.isArray(i.equalizer_gains))n.setAllGains(i.equalizer_gains);else if(i.equalizer_preset&&typeof i.equalizer_preset==="string")n.applyPreset(i.equalizer_preset);if(i.preamp_gain!==void 0)n.setPreamp(i.preamp_gain);if(i.loudness_normalization!==void 0)n.setLoudnessNormalization(Boolean(i.loudness_normalization));if(i.crossfade_seconds!==void 0)o.setCrossfadeSeconds(i.crossfade_seconds);if(i.skip_silence_enabled!==void 0)a.setEnabled(Boolean(i.skip_silence_enabled));if(i.playback_speed!==void 0)n.setPlaybackRate(i.playback_speed);if(i.preserve_pitch!==void 0)n.setPreservesPitch(Boolean(i.preserve_pitch));if(window.__TAURI__?.event){let{listen:r}=window.__TAURI__.event;r("set-eq-band",(s)=>{n.setBandGain(s.payload.bandIndex,s.payload.gain)}),r("set-eq-all",(s)=>{n.setAllGains(s.payload.gains)}),r("set-eq-preset",(s)=>{n.applyPreset(s.payload)}),r("set-preamp",(s)=>{n.setPreamp(s.payload)}),r("set-loudness-normalization",(s)=>{n.setLoudnessNormalization(s.payload)}),r("set-crossfade-seconds",(s)=>{o.setCrossfadeSeconds(s.payload)}),r("set-skip-silence",(s)=>{a.setEnabled(s.payload)}),r("set-playback-rate",(s)=>{n.setPlaybackRate(s.payload)}),r("set-preserves-pitch",(s)=>{n.setPreservesPitch(s.payload)})}console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(D)D.onTrackChange(e);if(R)R.onTrackChange()},onTick(e,t){if(D)D.onTick(e,t.track);if(R)R.onTick(e,t.track,t.getVideoElement())}};async function Ce(e){return new Promise((t)=>{let n={primary:"#18181b",secondary:"#09090b",accent:"#dc2626"};if(!e){t(n);return}let o=new Image;o.crossOrigin="anonymous",o.onload=()=>{try{let a=document.createElement("canvas");a.width=16,a.height=16;let i=a.getContext("2d");if(!i){t(n);return}i.drawImage(o,0,0,16,16);let r=i.getImageData(0,0,16,16).data,s=0,l=0,d=0,p=0,C=0,y=0,g=0,m=0;for(let x=0;x<r.length;x+=4){let F=r[x],W=r[x+1],G=r[x+2];if(r[x+3]<128)continue;let ce=(F+W+G)/3;if(ce<20||ce>240)continue;if(x<r.length/2)s+=F,l+=W,d+=G,p++;else C+=F,y+=W,g+=G,m++}if(p===0&&m===0){t(n);return}let k=p>0?Math.round(s/p):220,Y=p>0?Math.round(l/p):38,b=p>0?Math.round(d/p):38,M=m>0?Math.round(C/m):24,w=m>0?Math.round(y/m):24,U=m>0?Math.round(g/m):27;t({primary:`rgb(${k}, ${Y}, ${b})`,secondary:`rgb(${M}, ${w}, ${U})`,accent:`rgb(${Math.min(255,k+30)}, ${Math.min(255,Y+30)}, ${Math.min(255,b+30)})`})}catch{t(n)}},o.onerror=()=>t(n),o.src=e})}var ae=null,we={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Smoothly diffuses dynamic, reactive ambient colors from the active album cover behind the player",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=document.createElement("div"),t.id="ytmd-ambient-backdrop",document.body.prepend(t);let n=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,o=e.config.ambient_lighting_enabled!==!1,a=document.createElement("style");a.id="ytmd-ambient-styles",a.textContent=`
      #ytmd-ambient-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 0;
        opacity: ${o?n:0};
        transition: opacity 0.8s ease;
        overflow: hidden;
        background: radial-gradient(circle at 80% 20%, rgba(24, 24, 27, 0.4) 0%, transparent 60%),
                    radial-gradient(circle at 20% 80%, rgba(9, 9, 11, 0.4) 0%, transparent 60%);
        will-change: opacity;
      }
      .ytmd-ambient-orb {
        display: none;
      }
      /* Ensure YouTube Music transparent backgrounds let ambient glow pass through subtly */
      ytmusic-app-layout, #browse-page, ytmusic-browse-response {
        background-color: transparent !important;
      }
    `,document.head.appendChild(a);let i=c("div",{id:"ytmd-orb-1",className:"ytmd-ambient-orb"}),r=c("div",{id:"ytmd-orb-2",className:"ytmd-ambient-orb"});if(t.appendChild(i),t.appendChild(r),ae=(s)=>{if(t)t.style.opacity=String(s)},window.__TAURI__?.event)window.__TAURI__.event.listen("set-ambient-intensity",(s)=>{ae?.(s.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(s)=>{ae?.(s.payload?0.6:0)});if(e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){if(!e.coverUrl)return;try{let t=await Ce(e.coverUrl),n=document.getElementById("ytmd-ambient-backdrop");if(n)n.style.background=`
          radial-gradient(circle at 80% 20%, ${t.primary}66 0%, transparent 60%),
          radial-gradient(circle at 20% 80%, ${t.secondary}66 0%, transparent 60%)
        `}catch{}}};var S={default:{id:"default",name:"Modern Dark",css:`
      /* Clean Dark Minimal */
      ytmusic-nav-bar { background: rgba(18, 18, 21, 0.94) !important; border-bottom: 1px solid #27272a !important; }
      ytmusic-player-bar { background: rgba(18, 18, 21, 0.96) !important; border-top: 1px solid #27272a !important; }
      
  /* Protect album artwork, thumbnails and player cover images from background overrides */
  yt-img-shadow,
  yt-img-shadow #content,
  yt-img-shadow img,
  ytmusic-player-page #song-image,
  ytmusic-player-page #song-image #image,
  ytmusic-player-page #song-image #content,
  ytmusic-thumbnail-renderer,
  ytmusic-thumbnail-renderer #content,
  ytmusic-thumbnail-renderer img,
  ytmusic-two-row-item-renderer #content,
  ytmusic-responsive-list-item-renderer #content,
  #thumbnail,
  #thumbnail img,
  #image,
  #image img,
  #song-image,
  #song-image img,
  img.ytmusic-player-page,
  img.ytmusic-img-shadow {
    background-color: transparent !important;
  }

    `},oled:{id:"oled",name:"Pure OLED Black",css:`
      html, body, ytmusic-app, ytmusic-app-layout, #browse-page, ytmusic-browse-response, ytmusic-search-page, ytmusic-tab-renderer {
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
      
  /* Protect album artwork, thumbnails and player cover images from background overrides */
  yt-img-shadow,
  yt-img-shadow #content,
  yt-img-shadow img,
  ytmusic-player-page #song-image,
  ytmusic-player-page #song-image #image,
  ytmusic-player-page #song-image #content,
  ytmusic-thumbnail-renderer,
  ytmusic-thumbnail-renderer #content,
  ytmusic-thumbnail-renderer img,
  ytmusic-two-row-item-renderer #content,
  ytmusic-responsive-list-item-renderer #content,
  #thumbnail,
  #thumbnail img,
  #image,
  #image img,
  #song-image,
  #song-image img,
  img.ytmusic-player-page,
  img.ytmusic-img-shadow {
    background-color: transparent !important;
  }

    `},nord:{id:"nord",name:"Nord Arctic",css:`
      html, body, ytmusic-app, ytmusic-app-layout, #browse-page, ytmusic-browse-response, ytmusic-search-page, ytmusic-tab-renderer {
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
      
  /* Protect album artwork, thumbnails and player cover images from background overrides */
  yt-img-shadow,
  yt-img-shadow #content,
  yt-img-shadow img,
  ytmusic-player-page #song-image,
  ytmusic-player-page #song-image #image,
  ytmusic-player-page #song-image #content,
  ytmusic-thumbnail-renderer,
  ytmusic-thumbnail-renderer #content,
  ytmusic-thumbnail-renderer img,
  ytmusic-two-row-item-renderer #content,
  ytmusic-responsive-list-item-renderer #content,
  #thumbnail,
  #thumbnail img,
  #image,
  #image img,
  #song-image,
  #song-image img,
  img.ytmusic-player-page,
  img.ytmusic-img-shadow {
    background-color: transparent !important;
  }

    `},catppuccin:{id:"catppuccin",name:"Catppuccin Mocha",css:`
      html, body, ytmusic-app, ytmusic-app-layout, #browse-page, ytmusic-browse-response, ytmusic-search-page, ytmusic-tab-renderer {
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
      
  /* Protect album artwork, thumbnails and player cover images from background overrides */
  yt-img-shadow,
  yt-img-shadow #content,
  yt-img-shadow img,
  ytmusic-player-page #song-image,
  ytmusic-player-page #song-image #image,
  ytmusic-player-page #song-image #content,
  ytmusic-thumbnail-renderer,
  ytmusic-thumbnail-renderer #content,
  ytmusic-thumbnail-renderer img,
  ytmusic-two-row-item-renderer #content,
  ytmusic-responsive-list-item-renderer #content,
  #thumbnail,
  #thumbnail img,
  #image,
  #image img,
  #song-image,
  #song-image img,
  img.ytmusic-player-page,
  img.ytmusic-img-shadow {
    background-color: transparent !important;
  }

    `},gruvbox:{id:"gruvbox",name:"Gruvbox Dark",css:`
      html, body, ytmusic-app, ytmusic-app-layout, #browse-page, ytmusic-browse-response, ytmusic-search-page, ytmusic-tab-renderer {
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
      
  /* Protect album artwork, thumbnails and player cover images from background overrides */
  yt-img-shadow,
  yt-img-shadow #content,
  yt-img-shadow img,
  ytmusic-player-page #song-image,
  ytmusic-player-page #song-image #image,
  ytmusic-player-page #song-image #content,
  ytmusic-thumbnail-renderer,
  ytmusic-thumbnail-renderer #content,
  ytmusic-thumbnail-renderer img,
  ytmusic-two-row-item-renderer #content,
  ytmusic-responsive-list-item-renderer #content,
  #thumbnail,
  #thumbnail img,
  #image,
  #image img,
  #song-image,
  #song-image img,
  img.ytmusic-player-page,
  img.ytmusic-img-shadow {
    background-color: transparent !important;
  }

    `},tokyo_night:{id:"tokyo_night",name:"Tokyo Night",css:`
      html, body, ytmusic-app, ytmusic-app-layout, #browse-page, ytmusic-browse-response, ytmusic-search-page, ytmusic-tab-renderer {
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
      
  /* Protect album artwork, thumbnails and player cover images from background overrides */
  yt-img-shadow,
  yt-img-shadow #content,
  yt-img-shadow img,
  ytmusic-player-page #song-image,
  ytmusic-player-page #song-image #image,
  ytmusic-player-page #song-image #content,
  ytmusic-thumbnail-renderer,
  ytmusic-thumbnail-renderer #content,
  ytmusic-thumbnail-renderer img,
  ytmusic-two-row-item-renderer #content,
  ytmusic-responsive-list-item-renderer #content,
  #thumbnail,
  #thumbnail img,
  #image,
  #image img,
  #song-image,
  #song-image img,
  img.ytmusic-player-page,
  img.ytmusic-img-shadow {
    background-color: transparent !important;
  }

    `},dracula:{id:"dracula",name:"Dracula",css:`
      html, body, ytmusic-app, ytmusic-app-layout, #browse-page, ytmusic-browse-response, ytmusic-search-page, ytmusic-tab-renderer {
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
      
  /* Protect album artwork, thumbnails and player cover images from background overrides */
  yt-img-shadow,
  yt-img-shadow #content,
  yt-img-shadow img,
  ytmusic-player-page #song-image,
  ytmusic-player-page #song-image #image,
  ytmusic-player-page #song-image #content,
  ytmusic-thumbnail-renderer,
  ytmusic-thumbnail-renderer #content,
  ytmusic-thumbnail-renderer img,
  ytmusic-two-row-item-renderer #content,
  ytmusic-responsive-list-item-renderer #content,
  #thumbnail,
  #thumbnail img,
  #image,
  #image img,
  #song-image,
  #song-image img,
  img.ytmusic-player-page,
  img.ytmusic-img-shadow {
    background-color: transparent !important;
  }

    `},rose_pine:{id:"rose_pine",name:"Rosé Pine",css:`
      html, body, ytmusic-app, ytmusic-app-layout, #browse-page, ytmusic-browse-response, ytmusic-search-page, ytmusic-tab-renderer {
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
      
  /* Protect album artwork, thumbnails and player cover images from background overrides */
  yt-img-shadow,
  yt-img-shadow #content,
  yt-img-shadow img,
  ytmusic-player-page #song-image,
  ytmusic-player-page #song-image #image,
  ytmusic-player-page #song-image #content,
  ytmusic-thumbnail-renderer,
  ytmusic-thumbnail-renderer #content,
  ytmusic-thumbnail-renderer img,
  ytmusic-two-row-item-renderer #content,
  ytmusic-responsive-list-item-renderer #content,
  #thumbnail,
  #thumbnail img,
  #image,
  #image img,
  #song-image,
  #song-image img,
  img.ytmusic-player-page,
  img.ytmusic-img-shadow {
    background-color: transparent !important;
  }

    `}};var Pe={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Applies curated aesthetic themes and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(s)=>{let l=document.getElementById(s);if(!l){l=document.createElement("style"),l.id=s;let d=t();if(d)d.appendChild(l)}return l},o=(s)=>{let l=S[s]||S.default,d=n("ytmd-active-theme");if(d)d.textContent=l.css},a=(s)=>{let l=n("ytmd-custom-css");if(l)l.textContent=s},i=e.config.theme_preset||e.config.theme||"default";o(i);let r=e.config.custom_css||"";if(a(r),window.__TAURI__?.event)window.__TAURI__.event.listen("set-theme-preset",(s)=>{o(s.payload)}),window.__TAURI__.event.listen("set-custom-css",(s)=>{a(s.payload)});console.log("[YTMD] Theme engine active.")}};var _e={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let n=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(n){let o=c("button",{id:"ytmd-pip-btn",title:"Picture-in-Picture (Float Video)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),a=E("M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",20,20);o.appendChild(a),o.style.cssText=`
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
        `,o.addEventListener("mouseenter",()=>{o.style.color="#fafafa",o.style.backgroundColor="#27272a"}),o.addEventListener("mouseleave",()=>{o.style.color="#a1a1aa",o.style.backgroundColor="transparent"}),o.addEventListener("click",async()=>{let i=e.getVideoElement();if(!i)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await i.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(r){console.warn("[YTMD PiP] Could not enter PiP:",r),await e.invoke("toggle_mini_player")}}),n.appendChild(o)}};setInterval(t,1000),t()}};var Ee=null,Se={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){let t=null,n=!1,o=()=>{if(document.getElementById("ytmd-download-btn"))return;let a=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(a){let i=c("button",{id:"ytmd-download-btn",title:"Download Track (MP3/FLAC with ID3 Tags & Lyrics)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),r=E("M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z",20,20);i.appendChild(r),i.style.cssText=`
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
        `,i.addEventListener("mouseenter",()=>{if(!n)i.style.color="#fafafa",i.style.backgroundColor="#27272a"}),i.addEventListener("mouseleave",()=>{if(!n)i.style.color="#a1a1aa",i.style.backgroundColor="transparent"}),i.addEventListener("click",async()=>{if(!t||!t.videoId||n)return;n=!0,i.style.color="#38bdf8",i.title="Downloading...";try{let s=e.config.download_format||"mp3",l=e.config.embed_lyrics!==!1;await e.invoke("download_track",{request:{video_id:t.videoId,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:s,embed_lyrics:l}}),i.style.color="#22c55e",i.title="Downloaded!",setTimeout(()=>{n=!1,i.style.color="#a1a1aa",i.title="Download Track"},3000)}catch(s){console.error("[YTMD Downloader] Download failed:",s),i.style.color="#ef4444",setTimeout(()=>{n=!1,i.style.color="#a1a1aa",i.title="Download Track"},3000)}}),a.appendChild(i)}};setInterval(o,1000),o(),Ee=(a)=>{t=a}},onTrackChange(e){Ee?.(e)}};var Me={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};class Ie{isHost=!1;inRoom=!1;lastAppliedTimestamp=0;setRoomState(e,t){this.inRoom=e,this.isHost=t}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback(e,t){if(!this.inRoom||this.isHost||!t)return;let n=Date.now(),o=(n-e.timestamp_ms)/1000,a=e.is_playing?e.current_time_secs+Math.max(0,o):e.current_time_secs;this.lastAppliedTimestamp=n;let i=new URLSearchParams(window.location.search).get("v");if(e.video_id&&i!==e.video_id){console.log(`[YTMD Room Sync] Switching to track: ${e.video_id}`),window.location.href=`https://music.youtube.com/watch?v=${e.video_id}`;return}if(e.is_playing&&t.paused)u.play();else if(!e.is_playing&&!t.paused)u.pause();let r=Math.abs(t.currentTime-a);if(r>1.5)console.log(`[YTMD Room Sync] Drift detected (${r.toFixed(2)}s). Resyncing to ${a.toFixed(1)}s...`),u.seekTo(a)}broadcastLocalState(e,t,n){if(!this.inRoom||!this.isHost||!e||!e.videoId||!t)return;if(Date.now()-this.lastAppliedTimestamp<1000)return;n("broadcast_sync_state",{playback:{video_id:e.videoId,title:e.title,artist:e.artist,current_time_secs:t.currentTime,is_playing:!t.paused,timestamp_ms:Date.now()}}).catch(()=>{})}}var N=null,Le={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new Ie;if(N=t,window.__TAURI__?.event)window.__TAURI__.event.listen("sync-room-updated",(n)=>{t.setRoomState(!0,n.payload.is_host)}),window.__TAURI__.event.listen("sync-room-left",()=>{t.setRoomState(!1,!1)}),window.__TAURI__.event.listen("sync-playback-remote",(n)=>{t.handleRemotePlayback(n.payload,e.getVideoElement())})},onTick(e,t){if(N&&N.isInRoom()&&N.isRoomHost())N.broadcastLocalState(t.track,t.getVideoElement(),t.invoke)}};var Ae={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Inhibits system sleep during active playback and auto-pauses when screen is locked",defaultEnabled:!0,onInit(e){let t=null,n=e.config.inhibit_sleep!==!1,o=async()=>{if(!n||t!==null)return;try{if("wakeLock"in navigator)t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null});await e.invoke("set_inhibit_sleep",{inhibit:!0})}catch{}},a=async()=>{if(t!==null)try{await t.release(),t=null}catch{}await e.invoke("set_inhibit_sleep",{inhibit:!1})},i=e.getVideoElement();if(i)i.addEventListener("play",o),i.addEventListener("playing",o),i.addEventListener("pause",a),i.addEventListener("ended",a);else{let r=setInterval(()=>{let s=e.getVideoElement();if(s)clearInterval(r),s.addEventListener("play",o),s.addEventListener("playing",o),s.addEventListener("pause",a),s.addEventListener("ended",a)},1000)}if(e.config.pause_on_lock)document.addEventListener("visibilitychange",()=>{if(document.hidden&&e.config.pause_on_lock);})}};var De={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>se(e),console.log("[YTMD] Mobile remote module ready.")}};async function se(e){let t=document.getElementById("ytmd-remote-modal");if(!t){t=c("div",{id:"ytmd-remote-modal",style:`
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
      `}),o=c("h3",{text:"Mobile Web Remote",style:"margin: 0 0 6px 0; font-size: 18px; font-weight: 700;"}),a=c("p",{text:"Scan with your phone camera on the same Wi-Fi network:",style:"font-size: 13px; color: #a1a1aa; margin: 0 0 16px 0;"}),i=c("div",{id:"ytmd-qr-container",style:`
        background: #ffffff;
        padding: 14px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 14px;
        min-width: 180px;
        min-height: 180px;
      `}),r=c("span",{text:"Generating QR code...",style:"color: #52525b; font-size: 12px; font-weight: 500;"});i.appendChild(r);let s=c("div",{id:"ytmd-remote-url",style:"font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all; font-weight: 600;"}),l=c("button",{id:"ytmd-remote-close-btn",text:"Close",style:"background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 24px; font-weight: 600; cursor: pointer; font-size: 13px;"}),d=t;l.addEventListener("click",()=>{d.style.display="none"}),t.addEventListener("click",(p)=>{if(p.target===d)d.style.display="none"}),n.appendChild(o),n.appendChild(a),n.appendChild(i),n.appendChild(s),n.appendChild(l),t.appendChild(n),document.body.appendChild(t)}t.style.display="flex";try{let n=await e.invoke("get_remote_info"),o=document.getElementById("ytmd-qr-container"),a=document.getElementById("ytmd-remote-url");if(n&&n.qr_svg&&o){let i=c("img");i.src=`data:image/svg+xml;utf8,${encodeURIComponent(n.qr_svg)}`,i.width=180,i.height=180,i.style.display="block",i.alt="Mobile Remote QR Code",o.replaceChildren(i)}else if(o)o.replaceChildren(c("span",{text:"Remote server starting...",style:"color: #71717a; font-size: 12px;"}));if(n&&n.url&&a)a.textContent=n.url}catch(n){console.error("[YTMD Remote] Error fetching remote info:",n)}}var T=null,le=null,v=(e,t={})=>new Promise((n)=>{let o=window.__TAURI__;if(!o?.event?.emit){n(null);return}let a=Math.random().toString(36).slice(2)+Date.now().toString(36),i=null,r=setTimeout(()=>{if(i)i();n(null)},4000);o.event.listen(`ytmd-response-${a}`,(s)=>{if(clearTimeout(r),i)i();n(s.payload)}).then((s)=>{i=s,o.event.emit("ytmd-invoke",{id:a,cmd:e,args:t})}).catch(()=>{clearTimeout(r),n(null)})});function Re(e){if(document.getElementById("ytmd-burger-btn"))return;let t=document.querySelector("ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content"),n=document.querySelector("ytmusic-nav-bar .left-content, ytmusic-nav-bar #left-content"),o=document.querySelector("ytmusic-nav-bar"),a=document.body||document.documentElement;if(!t&&!n&&!a)return;let i=c("button",{id:"ytmd-burger-btn",title:"YouTube Music Desktop Menu (Ctrl+,)",style:`
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
    `}),r=E("M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",15,15),s=c("span",{text:"YTMD",style:"font-size: 12px; font-weight: 700; letter-spacing: 0.2px;"});i.appendChild(r),i.appendChild(s),i.addEventListener("mouseenter",()=>{i.style.background="#333333",i.style.borderColor="rgba(255, 255, 255, 0.3)",i.style.color="#ffffff"}),i.addEventListener("mouseleave",()=>{i.style.background="#212121",i.style.borderColor="rgba(255, 255, 255, 0.15)",i.style.color="#f4f4f5"});let l=document.getElementById("ytmd-burger-popover");if(!l){l=c("div",{id:"ytmd-burger-popover",style:`
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
      `});let d=(g,m,k,Y)=>{let b=c("button",{style:`
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          width: 100% !important;
          padding: 8px 10px !important;
          background: transparent !important;
          border: none !important;
          border-radius: 6px !important;
          color: #e4e4e7 !important;
          font-size: 13px !important;
          cursor: pointer !important;
          font-family: inherit !important;
          text-align: left !important;
          transition: background 0.12s ease, color 0.12s ease !important;
        `}),M=c("span",{style:"display:flex; align-items:center; gap:10px;"}),w=c("span",{style:"display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; color:#a1a1aa;"});w.appendChild(ye(g));let U=c("span",{text:m,style:"font-weight: 500;"});M.appendChild(w),M.appendChild(U);let x=c("span",{text:k,style:"font-size: 11px; color: #71717a; font-family: monospace;"});return b.appendChild(M),b.appendChild(x),b.addEventListener("mouseenter",()=>{b.style.background="#27272a",b.style.color="#ffffff",w.style.color="#ffffff"}),b.addEventListener("mouseleave",()=>{b.style.background="transparent",b.style.color="#e4e4e7",w.style.color="#a1a1aa"}),b.addEventListener("click",()=>{if(l)l.style.display="none";Y()}),b},p=()=>c("div",{style:"height: 1px !important; background: #27272a !important; margin: 6px 4px !important;"});l.appendChild(d('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',"Preferences & DSP EQ","Ctrl+,",()=>{v("toggle_settings_window")})),l.appendChild(d('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',"Local Music Library","",()=>{v("toggle_local_library_window")})),l.appendChild(d('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',"Listen Together (Sync)","",()=>{v("toggle_sync_window")})),l.appendChild(d('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',"Mobile Web Remote","",()=>{if(le)se(le)})),l.appendChild(d('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><rect x="12" y="9" width="8" height="6" rx="1"/></svg>',"Mini Player","",()=>{v("toggle_mini_player")})),l.appendChild(p()),l.appendChild(d('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',"Download Current Track","",async()=>{if(!T||!T.videoId){alert("Please play a track first to download.");return}try{await v("download_track",{request:{video_id:T.videoId,title:T.title,artist:T.artist,album:T.album||void 0,cover_url:T.coverUrl||void 0,format:e.download_format||"mp3",embed_lyrics:e.embed_lyrics!==!1}}),alert(`Download started for: ${T.title}`)}catch(g){console.error("[YTMD Download Error]:",g)}}));let C=c("div",{style:"display: flex; gap: 4px; padding: 6px 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;"}),y=c("span",{text:"Theme:",style:"font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase;"});C.appendChild(y),["oled","nord","catppuccin","tokyo_night","gruvbox"].forEach((g)=>{let m=c("button",{text:g.toUpperCase(),style:`
          background: #1c1c20;
          border: 1px solid #27272a;
          color: #a1a1aa;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        `});m.addEventListener("click",()=>{let k=document.getElementById("ytmd-active-theme");if(k&&S[g])k.textContent=S[g].css}),C.appendChild(m)}),l.appendChild(C),document.body.appendChild(l),document.addEventListener("click",(g)=>{if(l&&l.style.display==="flex"){if(!l.contains(g.target)&&!i.contains(g.target))l.style.display="none"}})}if(i.addEventListener("click",(d)=>{if(d.stopPropagation(),l){let p=i.getBoundingClientRect();l.style.top=`${p.bottom+8}px`,l.style.right=`${Math.max(16,window.innerWidth-p.right)}px`,l.style.left="auto",l.style.display=l.style.display==="flex"?"none":"flex"}}),t)t.prepend(i);else if(n)n.appendChild(i);else if(o)o.prepend(i);else i.style.position="fixed",i.style.top="12px",i.style.right="16px",a.appendChild(i)}async function Ne(){console.log("[YTMD] Initializing YouTube Music Desktop integration bridge...");let e={};Re(e),setInterval(()=>Re(e),1000),v("get_config").then((r)=>{if(r&&typeof r==="object")e=r});let t={track:null,config:e,invoke:v,sendPlayerCommand:(r)=>{a(r)},getVideoElement:()=>u.getVideo()};le=t;let n=new j(t);n.register(me),n.register(ge),n.register(he),n.register(ve),n.register(ke),n.register(xe),n.register(Te),n.register(we),n.register(Pe),n.register(_e),n.register(Se),n.register(Me),n.register(Le),n.register(Ae),n.register(De);try{await n.initAll()}catch(r){console.error("[YTMD] Registry init error:",r)}let o=new K;o.onTrackChange(async(r)=>{T=r,n.handleTrackChange(r);try{await v("update_track_info",{track:{title:r.title,artist:r.artist,album:r.album||null,cover_url:r.coverUrl||null,duration_secs:r.durationSecs,current_time_secs:r.currentTimeSecs,is_playing:r.isPlaying,video_id:r.videoId||null}})}catch(s){console.error("[YTMD] Failed to sync track info to backend:",s)}}),o.onPlaybackChange(async(r)=>{n.handlePlaybackChange(r);let s=o.getCurrentTrack();if(s){s.isPlaying=r;try{await v("update_track_info",{track:{title:s.title,artist:s.artist,album:s.album||null,cover_url:s.coverUrl||null,duration_secs:s.durationSecs,current_time_secs:s.currentTimeSecs,is_playing:r,video_id:s.videoId||null}})}catch(l){console.error("[YTMD] Failed to sync playback status:",l)}}}),o.onTick((r)=>{n.handleTick(r)});function a(r){switch(r){case"play":u.play();break;case"pause":u.pause();break;case"play_pause":u.playPause();break;case"next":u.next();break;case"previous":u.previous();break;case"like":u.toggleLike();break;case"dislike":u.toggleDislike();break;case"mute":u.toggleMute();break}}let i=(r,s)=>{let l=window.__TAURI__;if(l?.event?.listen)l.event.listen(r,(d)=>s(d.payload))};i("player-command",(r)=>a(r)),i("tray-command",(r)=>a(r)),i("mpris-command",(r)=>a(r)),i("global-shortcut-event",(r)=>a(r)),i("player-seek",(r)=>u.seekTo(r)),i("mpris-command-seek",(r)=>u.seekTo(r)),i("player-volume",(r)=>u.setVolume(r)),window.addEventListener("keydown",(r)=>{if(r.ctrlKey&&r.key===","||r.key==="F2")r.preventDefault(),v("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>Ne());else Ne();
