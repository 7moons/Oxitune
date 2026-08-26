class oe{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if("mediaSession"in navigator);let e=()=>{let o=document.querySelector("video");if(o)o.addEventListener("play",()=>this.handlePlaybackChange(!0)),o.addEventListener("pause",()=>this.handlePlaybackChange(!1)),o.addEventListener("ended",()=>this.handlePlaybackChange(!1)),o.addEventListener("timeupdate",()=>{let r=o.currentTime;this.onTickCallbacks.forEach((c)=>c(r))})},t=!1,i=new MutationObserver(()=>{if(t)return;t=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),t=!1})}),a=document.querySelector("ytmusic-player-bar")||document.body;if(a)i.observe(a,{childList:!0,subtree:!0,characterData:!0});e(),this.tickInterval=window.setInterval(()=>{this.checkTrackUpdate();let o=document.querySelector("video");if(o&&!o.paused)this.onTickCallbacks.forEach((r)=>r(o.currentTime))},250)}extractTrackInfo(){let e=document.querySelector("video");if(Boolean(document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-text")||e?.closest(".ad-showing")))return null;let n=navigator.mediaSession?.metadata,i=n?.title||"",a=n?.artist||"",o=n?.album||"",r=n?.artwork?.[n.artwork.length-1]?.src||"";if(!i){let b=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(b)i=b.textContent?.trim()||""}if(!a){let b=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(b){let g=(b.textContent?.trim()||"").split("•").map((x)=>x.trim());if(a=g[0]||"",g.length>1)o=g[1]}}if(!r){let b=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(b)r=b.src}let s=new URLSearchParams(window.location.search).get("v")||void 0,l=e?Math.floor(e.duration||0):0,u=e?Math.floor(e.currentTime||0):0,p=e?!e.paused&&!e.ended:!1;if(!i)return null;return{title:i,artist:a||"Unknown Artist",album:o||void 0,coverUrl:r||void 0,durationSecs:l,currentTimeSecs:u,isPlaying:p,videoId:s}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=!this.currentTrack||this.currentTrack.title!==e.title||this.currentTrack.artist!==e.artist||this.currentTrack.videoId!==e.videoId,n=this.currentTrack&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t)this.onTrackChangeCallbacks.forEach((i)=>i(e));if(n)this.onPlaybackChangeCallbacks.forEach((i)=>i(e.isPlaying))}handlePlaybackChange(e){if(this.currentTrack)this.currentTrack.isPlaying=e;this.onPlaybackChangeCallbacks.forEach((t)=>t(e))}destroy(){if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null}}class m{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)t.volume=Math.max(0,Math.min(1,e))}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}class re{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(a){console.error(`[YTMD] Failed to init plugin ${t}:`,a)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,i)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,i)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTick:`,i)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var B=null,P={adWasShowing:!1,preAdMuted:!1},ae=new WeakSet,A=null,xe=null,Fe=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",We="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)",Ge=`
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
`,Ke=(e)=>{let t=new Set(e);return t.has("ad-showing")||t.has("ad-interrupting")},je=(e,t,n)=>{if(e&&!t.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:n},setMutedTo:!0};if(!e&&t.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:t.preAdMuted},setMutedTo:t.preAdMuted};return{nextState:t,setMutedTo:null}},le=()=>document.getElementById("movie_player"),Qe=()=>{let e=le();if(!e)return!1;return Ke(e.classList)},se=(e)=>{let t=e.getVideoElement();if(!t)return;let{nextState:n,setMutedTo:i}=je(Qe(),P,t.muted);if(P=n,i!==null)t.muted=i},ve=(e)=>{if(ae.has(e))return;ae.add(e),e.click()},q=()=>{document.querySelectorAll(Fe).forEach(ve),document.querySelectorAll(We).forEach((e)=>{e.style.display="none";let t=e.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(t)ve(t)})},ke=(e)=>{let t=le();if(xe=t,!t)return;A?.disconnect(),A=new MutationObserver(()=>{se(e),q()}),A.observe(t,{attributes:!0,attributeFilter:["class"]})},Te={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Mutes/hides audio & video ads and dismisses premium upsell banners without touching playback timing",defaultEnabled:!0,onInit(e){P={adWasShowing:!1,preAdMuted:!1},ae=new WeakSet;let t=document.createElement("style");t.id="ytmd-adblock-styles",t.textContent=Ge,document.head.appendChild(t);let n=!1,i=new MutationObserver(()=>{if(n)return;n=!0,requestAnimationFrame(()=>{n=!1,q()})});i.observe(document.body,{childList:!0,subtree:!0}),ke(e),q(),se(e),B=()=>{A?.disconnect(),A=null,i.disconnect(),document.getElementById("ytmd-adblock-styles")?.remove();let a=e.getVideoElement();if(a&&P.adWasShowing)a.muted=P.preAdMuted;P={adWasShowing:!1,preAdMuted:!1}}},onTick(e,t){if(le()!==xe)ke(t);se(t),q()},onDestroy(){if(B)B(),B=null}};var E=[],z="",Xe=(e,t)=>e===t,we={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){E=[],z=""},async onTrackChange(e){if(!e.videoId||e.videoId===z)return;let t=e.videoId;z=t,E=[];try{let n=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),i=`https://sponsor.ajay.app/api/skipSegments?videoID=${t}&categories=${encodeURIComponent(n)}`,a=await fetch(i);if(a.ok){let o=await a.json();if(!Xe(t,z))return;E=o,console.log(`[YTMD SponsorBlock] Loaded ${o.length} segments for ${t}`)}}catch(n){}},onTick(e,t){if(!E||E.length===0)return;for(let n of E){let[i,a]=n.segment;if(e>=i&&e<a-0.5){console.log(`[YTMD SponsorBlock] Skipping segment (${n.category}): ${i}s -> ${a}s`);let o=t.getVideoElement();if(o)o.currentTime=a;break}}}};function _(e,t=18,n=18,i="0 0 24 24"){let a=document.createElementNS("http://www.w3.org/2000/svg","svg");a.setAttribute("width",String(t)),a.setAttribute("height",String(n)),a.setAttribute("viewBox",i),a.setAttribute("fill","currentColor");let o=document.createElementNS("http://www.w3.org/2000/svg","path");return o.setAttribute("d",e),a.appendChild(o),a}function Ce(e){try{let i=new DOMParser().parseFromString(e,"image/svg+xml").querySelector("svg");if(i)return document.importNode(i,!0)}catch{}return document.createElementNS("http://www.w3.org/2000/svg","svg")}function d(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var v=[],N=-1,V=null,R="",O=null,Pe=(e,t)=>e===t,_e={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(e){v=[],N=-1,V=null,R="";let t=document.createElement("style");t.id="ytmd-native-lyrics-styles",t.textContent=`
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
    `,document.head.appendChild(t);let n=()=>{ce(),Ee(e)},i=window.setInterval(n,600);n(),O=()=>{clearInterval(i),t.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((o)=>o.remove())}},async onTrackChange(e,t){let n=`${e.title} - ${e.artist}`;if(R===n&&v.length>0)return;R=n,v=[],N=-1,V=null,ce();let i=document.getElementById("ytmd-native-lyrics-wrapper");if(i)i.replaceChildren(d("div",{className:"ytmd-native-lyrics-status",text:"Loading synchronized lyrics..."}));try{let a=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(!Pe(n,R))return;if(V=a,a?.syncedLyrics)v=Ze(a.syncedLyrics);ce(),Ee(t),Se(t)}catch{if(!Pe(n,R))return;let a=document.getElementById("ytmd-native-lyrics-wrapper");if(a)a.replaceChildren(d("div",{className:"ytmd-native-lyrics-status",text:"No lyrics available for this track."}))}},onTick(e){if(!v||v.length===0)return;let t=-1;for(let n=0;n<v.length;n++)if(e>=v[n].timeSecs)t=n;else break;if(t!==N&&t>=0){N=t;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(n){let i=n.querySelectorAll(".ytmd-native-lyric-line");i.forEach((o,r)=>{if(r===t)o.classList.add("active");else o.classList.remove("active")});let a=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(a&&Je(a)){let o=i[t];if(o)o.scrollIntoView({behavior:"smooth",block:"center"})}}}},onDestroy(){if(O)O(),O=null}};function Je(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function ce(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t,n)=>{let i=t.textContent?.toLowerCase()||"";if(n===1||i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras"))t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.style.pointerEvents="auto",t.style.cursor="pointer"})}function Ee(e){let t=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=t.querySelector("ytmusic-description-shelf-renderer, ytmusic-message-renderer");if(n)n.style.display="none";let i=document.getElementById("ytmd-native-lyrics-wrapper");if(!i||!t.contains(i)){if(i)i.remove();i=d("div",{id:"ytmd-native-lyrics-wrapper"}),t.appendChild(i),Se(e)}}function Se(e){let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(v&&v.length>0)t.replaceChildren(...v.map((n,i)=>{let a=d("div",{className:`ytmd-native-lyric-line${i===N?" active":""}`,text:n.text});return a.addEventListener("click",()=>{let o=e.getVideoElement();if(o)o.currentTime=n.timeSecs}),a}),d("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}));else if(V?.plainLyrics){let n=V.plainLyrics.split(`
`);t.replaceChildren(...n.map((i)=>d("div",{className:"ytmd-native-lyric-line active",text:i,style:"cursor: default;"})),d("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else t.replaceChildren(d("div",{className:"ytmd-native-lyrics-status",text:"Synced lyrics unavailable for this track."}))}function Ze(e){let t=e.split(`
`),n=[],i=/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;for(let a of t){let o=i.exec(a.trim());if(o){let r=parseInt(o[1],10),c=parseInt(o[2],10),s=parseInt(o[3].padEnd(3,"0").slice(0,3),10),l=r*60+c+s/1000,u=o[4].trim();if(u)n.push({timeSecs:l,text:u})}}return n.sort((a,o)=>a.timeSecs-o.timeSecs)}var H=null,Me={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit(e){let t=(n)=>{let i=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!i)return;let a=i.getBoundingClientRect();if(n.clientX>=a.left&&n.clientX<=a.right&&n.clientY>=a.top&&n.clientY<=a.bottom){n.preventDefault();let o=e.getVideoElement();if(o){let r=e.config.wheel_volume_step||0.05,c=n.deltaY<0?r:-r,s=Math.max(0,Math.min(1,o.volume+c));o.volume=s}}};window.addEventListener("wheel",t,{passive:!1}),H=()=>{window.removeEventListener("wheel",t)}},onDestroy(){if(H)H(),H=null}};var Ie={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var U=null,Le={id:"visualizer",name:"Modern Clean Theme & Custom CSS",description:"Applies sleek dark aesthetics, subtle scrollbars, and user-defined custom CSS",defaultEnabled:!0,onInit(e){let t=document.createElement("style");t.id="ytmd-theme-styles";let n=e.config.custom_css||"",i=`
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
    `;t.textContent=`${i}
${n}`,document.head.appendChild(t),U=()=>{t.remove()}},onDestroy(){if(U)U(),U=null}};var de=[32,64,125,250,500,1000,2000,4000,8000,16000],ue={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function F(e){return Math.max(-12,Math.min(12,e))}class f{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;static getInstance(){if(!f.instance)f.instance=new f;return f.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=de.map((i,a)=>{if(!this.audioCtx)throw Error("AudioContext missing");let o=this.audioCtx.createBiquadFilter();if(a===0)o.type="lowshelf";else if(a===de.length-1)o.type="highshelf";else o.type="peaking",o.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return o.frequency.setValueAtTime(i,this.audioCtx.currentTime),o.gain.setValueAtTime(0,this.audioCtx.currentTime),o}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.filters.length||!this.audioCtx)return;let n=F(t);this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){if(!this.audioCtx)return;e.forEach((t,n)=>{if(n<this.filters.length)this.filters[n].gain.setValueAtTime(F(t),this.audioCtx.currentTime)})}setPreamp(e){if(!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,F(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=ue[e]||ue.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return-100;let e=new Float32Array(this.analyserNode.fftSize);this.analyserNode.getFloatTimeDomainData(e);let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){let t=Math.max(0.5,Math.min(2,e));if(this.hookedVideo)this.hookedVideo.playbackRate=t}setPreservesPitch(e){if(this.hookedVideo){this.hookedVideo.preservesPitch=e;let t=this.hookedVideo;t.mozPreservesPitch=e,t.webkitPreservesPitch=e}}}class pe{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)f.getInstance().fadeIn(this.crossfadeSeconds);else f.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),f.getInstance().fadeOut(n),setTimeout(()=>{let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[YTMD Crossfade] Advancing to next track..."),m.next()},Math.max(100,(n-0.2)*1000))}}class me{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=f.getInstance().getAudioPowerDb();if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,m.next()}else this.consecutiveSilentTicks=0}}var S=null,M=null,W=null,De={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=e.getVideoElement(),n=f.getInstance(),i=new pe,a=new me;S=i,M=a;let o=null;if(t)n.init(t);else o=window.setInterval(()=>{let s=e.getVideoElement();if(s){if(o!==null)clearInterval(o);o=null,n.init(s)}},500);let r=e.config;if(r.equalizer_gains&&Array.isArray(r.equalizer_gains))n.setAllGains(r.equalizer_gains);else if(r.equalizer_preset&&typeof r.equalizer_preset==="string")n.applyPreset(r.equalizer_preset);if(r.preamp_gain!==void 0)n.setPreamp(r.preamp_gain);if(r.loudness_normalization!==void 0)n.setLoudnessNormalization(Boolean(r.loudness_normalization));if(r.crossfade_seconds!==void 0)i.setCrossfadeSeconds(r.crossfade_seconds);if(r.skip_silence_enabled!==void 0)a.setEnabled(Boolean(r.skip_silence_enabled));if(r.playback_speed!==void 0)n.setPlaybackRate(r.playback_speed);if(r.preserve_pitch!==void 0)n.setPreservesPitch(Boolean(r.preserve_pitch));let c=[];if(window.__TAURI__?.event){let{listen:s}=window.__TAURI__.event;c.push(s("set-eq-band",(l)=>{n.setBandGain(l.payload.bandIndex,l.payload.gain)}),s("set-eq-all",(l)=>{n.setAllGains(l.payload.gains)}),s("set-eq-preset",(l)=>{n.applyPreset(l.payload)}),s("set-preamp",(l)=>{n.setPreamp(l.payload)}),s("set-loudness-normalization",(l)=>{n.setLoudnessNormalization(l.payload)}),s("set-crossfade-seconds",(l)=>{i.setCrossfadeSeconds(l.payload)}),s("set-skip-silence",(l)=>{a.setEnabled(l.payload)}),s("set-playback-rate",(l)=>{n.setPlaybackRate(l.payload)}),s("set-preserves-pitch",(l)=>{n.setPreservesPitch(l.payload)}))}W=()=>{if(o!==null)clearInterval(o),o=null;c.forEach((s)=>s.then((l)=>l())),S=null,M=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(S)S.onTrackChange(e);if(M)M.onTrackChange()},onTick(e,t){if(S)S.onTick(e,t.track);if(M)M.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(W)W(),W=null}};var ge=(e,t,n)=>{let i=(o)=>Math.max(0,Math.min(255,Math.round(o))),a=(o)=>i(o).toString(16).padStart(2,"0");return`#${a(e)}${a(t)}${a(n)}`};async function Ae(e){return new Promise((t)=>{let n={primary:"#18181b",secondary:"#09090b",accent:"#dc2626"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let a=document.createElement("canvas");a.width=16,a.height=16;let o=a.getContext("2d");if(!o){t(n);return}o.drawImage(i,0,0,16,16);let r=o.getImageData(0,0,16,16).data,c=0,s=0,l=0,u=0,p=0,b=0,y=0,g=0;for(let T=0;T<r.length;T+=4){let te=r[T],ne=r[T+1],ie=r[T+2];if(r[T+3]<128)continue;let fe=(te+ne+ie)/3;if(fe<20||fe>240)continue;if(T<r.length/2)c+=te,s+=ne,l+=ie,u++;else p+=te,b+=ne,y+=ie,g++}if(u===0&&g===0){t(n);return}let x=u>0?Math.round(c/u):220,Y=u>0?Math.round(s/u):38,h=u>0?Math.round(l/u):38,D=g>0?Math.round(p/g):24,C=g>0?Math.round(b/g):24,ee=g>0?Math.round(y/g):27;t({primary:ge(x,Y,h),secondary:ge(D,C,ee),accent:ge(x+30,Y+30,h+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var G=null,K=null,Re={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Smoothly diffuses dynamic, reactive ambient colors from the active album cover behind the player",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=document.createElement("div"),t.id="ytmd-ambient-backdrop",document.body.prepend(t);let n=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,i=e.config.ambient_lighting_enabled!==!1,a=document.createElement("style");a.id="ytmd-ambient-styles",a.textContent=`
      #ytmd-ambient-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 0;
        opacity: ${i?n:0};
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
    `,document.head.appendChild(a);let o=d("div",{id:"ytmd-orb-1",className:"ytmd-ambient-orb"}),r=d("div",{id:"ytmd-orb-2",className:"ytmd-ambient-orb"});t.appendChild(o),t.appendChild(r),G=(s)=>{if(t)t.style.opacity=String(s)};let c=[];if(window.__TAURI__?.event)c.push(window.__TAURI__.event.listen("set-ambient-intensity",(s)=>{G?.(s.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(s)=>{G?.(s.payload?0.6:0)}));if(K=()=>{c.forEach((s)=>s.then((l)=>l())),G=null,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){if(!e.coverUrl)return;try{let t=await Ae(e.coverUrl),n=document.getElementById("ytmd-ambient-backdrop");if(n)n.style.background=`
          radial-gradient(circle at 80% 20%, ${t.primary}66 0%, transparent 60%),
          radial-gradient(circle at 20% 80%, ${t.secondary}66 0%, transparent 60%)
        `}catch{}},onDestroy(){if(K)K(),K=null}};var I={default:{id:"default",name:"Modern Dark",css:`
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

    `}};var j=null,Ne={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Applies curated aesthetic themes and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(s)=>{let l=document.getElementById(s);if(!l){l=document.createElement("style"),l.id=s;let u=t();if(u)u.appendChild(l)}return l},i=(s)=>{let l=I[s]||I.default,u=n("ytmd-active-theme");if(u)u.textContent=l.css},a=(s)=>{let l=n("ytmd-custom-css");if(l)l.textContent=s},o=e.config.theme_preset||e.config.theme||"default";i(o);let r=e.config.custom_css||"";a(r);let c=[];if(window.__TAURI__?.event)c.push(window.__TAURI__.event.listen("set-theme-preset",(s)=>{i(s.payload)}),window.__TAURI__.event.listen("set-custom-css",(s)=>{a(s.payload)}));j=()=>{c.forEach((s)=>s.then((l)=>l()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(j)j(),j=null}};var Q=null,Ve={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let a=d("button",{id:"ytmd-pip-btn",title:"Picture-in-Picture (Float Video)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),o=_("M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",20,20);a.appendChild(o),a.style.cssText=`
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
        `,a.addEventListener("mouseenter",()=>{a.style.color="#fafafa",a.style.backgroundColor="#27272a"}),a.addEventListener("mouseleave",()=>{a.style.color="#a1a1aa",a.style.backgroundColor="transparent"}),a.addEventListener("click",async()=>{let r=e.getVideoElement();if(!r)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await r.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(c){console.warn("[YTMD PiP] Could not enter PiP:",c),await e.invoke("toggle_mini_player")}}),i.appendChild(a)}},n=window.setInterval(t,1000);t(),Q=()=>{clearInterval(n),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(Q)Q(),Q=null}};var ye=null,X=null,Ye={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=()=>{if(document.getElementById("ytmd-download-btn"))return;let o=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(o){let r=d("button",{id:"ytmd-download-btn",title:"Download Track (MP3/FLAC with ID3 Tags & Lyrics)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),c=_("M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z",20,20);r.appendChild(c),r.style.cssText=`
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
        `,r.addEventListener("mouseenter",()=>{if(!n)r.style.color="#fafafa",r.style.backgroundColor="#27272a"}),r.addEventListener("mouseleave",()=>{if(!n)r.style.color="#a1a1aa",r.style.backgroundColor="transparent"}),r.addEventListener("click",async()=>{if(!t||!t.videoId||n)return;n=!0,r.style.color="#38bdf8",r.title="Downloading...";try{let s=e.config.download_format||"mp3",l=e.config.embed_lyrics!==!1;await e.invoke("download_track",{request:{video_id:t.videoId,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:s,embed_lyrics:l}}),r.style.color="#22c55e",r.title="Downloaded!",setTimeout(()=>{n=!1,r.style.color="#a1a1aa",r.title="Download Track"},3000)}catch(s){console.error("[YTMD Downloader] Download failed:",s),r.style.color="#ef4444",setTimeout(()=>{n=!1,r.style.color="#a1a1aa",r.title="Download Track"},3000)}}),o.appendChild(r)}},a=window.setInterval(i,1000);i(),ye=(o)=>{t=o},X=()=>{clearInterval(a),document.getElementById("ytmd-download-btn")?.remove(),ye=null}},onTrackChange(e){ye?.(e)},onDestroy(){if(X)X(),X=null}};var Be={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};class qe{isHost=!1;inRoom=!1;lastAppliedTimestamp=0;setRoomState(e,t){this.inRoom=e,this.isHost=t}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback(e,t){if(!this.inRoom||this.isHost||!t)return;let n=Date.now(),i=(n-e.timestamp_ms)/1000,a=e.is_playing?e.current_time_secs+Math.max(0,i):e.current_time_secs;this.lastAppliedTimestamp=n;let o=new URLSearchParams(window.location.search).get("v");if(e.video_id&&o!==e.video_id){console.log(`[YTMD Room Sync] Switching to track: ${e.video_id}`),window.location.href=`https://music.youtube.com/watch?v=${e.video_id}`;return}if(e.is_playing&&t.paused)m.play();else if(!e.is_playing&&!t.paused)m.pause();let r=Math.abs(t.currentTime-a);if(r>1.5)console.log(`[YTMD Room Sync] Drift detected (${r.toFixed(2)}s). Resyncing to ${a.toFixed(1)}s...`),m.seekTo(a)}broadcastLocalState(e,t,n){if(!this.inRoom||!this.isHost||!e||!e.videoId||!t)return;if(Date.now()-this.lastAppliedTimestamp<1000)return;n("broadcast_sync_state",{playback:{video_id:e.videoId,title:e.title,artist:e.artist,current_time_secs:t.currentTime,is_playing:!t.paused,timestamp_ms:Date.now()}}).catch(()=>{})}}var L=null,J=null,ze={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new qe;L=t;let n=[];if(window.__TAURI__?.event)n.push(window.__TAURI__.event.listen("sync-room-updated",(i)=>{t.setRoomState(!0,i.payload.is_host)}),window.__TAURI__.event.listen("sync-room-left",()=>{t.setRoomState(!1,!1)}),window.__TAURI__.event.listen("sync-playback-remote",(i)=>{t.handleRemotePlayback(i.payload,e.getVideoElement())}));J=()=>{n.forEach((i)=>i.then((a)=>a())),L=null}},onTick(e,t){if(L&&L.isInRoom()&&L.isRoomHost())L.broadcastLocalState(t.track,t.getVideoElement(),t.invoke)},onDestroy(){if(J)J(),J=null}};var Z=null,et=(e,t,n)=>e&&t&&!n,Oe={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Inhibits system sleep during active playback and auto-pauses when screen is locked",defaultEnabled:!0,onInit(e){let t=null,n=null,i=null,a=e.config.inhibit_sleep!==!1,o=async()=>{if(!a||t!==null)return;try{if("wakeLock"in navigator)t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null});await e.invoke("set_inhibit_sleep",{inhibit:!0})}catch{}},r=async()=>{if(t!==null)try{await t.release(),t=null}catch{}await e.invoke("set_inhibit_sleep",{inhibit:!1})},c=(p)=>{p.addEventListener("play",o),p.addEventListener("playing",o),p.addEventListener("pause",r),p.addEventListener("ended",r),i=p},s=(p)=>{p.removeEventListener("play",o),p.removeEventListener("playing",o),p.removeEventListener("pause",r),p.removeEventListener("ended",r)},l=e.getVideoElement();if(l)c(l);else n=window.setInterval(()=>{let p=e.getVideoElement();if(p){if(n!==null)clearInterval(n);n=null,c(p)}},1000);let u=()=>{let p=e.getVideoElement();if(!p)return;if(et(document.hidden,Boolean(e.config.pause_on_lock),p.paused))e.sendPlayerCommand("pause")};document.addEventListener("visibilitychange",u),Z=()=>{if(n!==null)clearInterval(n),n=null;if(i)s(i),i=null;document.removeEventListener("visibilitychange",u),r()}},onDestroy(){if(Z)Z(),Z=null}};var He={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>be(e),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}};async function be(e){let t=document.getElementById("ytmd-remote-modal");if(!t){t=d("div",{id:"ytmd-remote-modal",style:`
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
      `});let n=d("div",{style:`
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
      `}),i=d("h3",{text:"Mobile Web Remote",style:"margin: 0 0 6px 0; font-size: 18px; font-weight: 700;"}),a=d("p",{text:"Scan with your phone camera on the same Wi-Fi network:",style:"font-size: 13px; color: #a1a1aa; margin: 0 0 16px 0;"}),o=d("div",{id:"ytmd-qr-container",style:`
        background: #ffffff;
        padding: 14px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 14px;
        min-width: 180px;
        min-height: 180px;
      `}),r=d("span",{text:"Generating QR code...",style:"color: #52525b; font-size: 12px; font-weight: 500;"});o.appendChild(r);let c=d("div",{id:"ytmd-remote-url",style:"font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all; font-weight: 600;"}),s=d("button",{id:"ytmd-remote-close-btn",text:"Close",style:"background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 24px; font-weight: 600; cursor: pointer; font-size: 13px;"}),l=t;s.addEventListener("click",()=>{l.style.display="none"}),t.addEventListener("click",(u)=>{if(u.target===l)l.style.display="none"}),n.appendChild(i),n.appendChild(a),n.appendChild(o),n.appendChild(c),n.appendChild(s),t.appendChild(n),document.body.appendChild(t)}t.style.display="flex";try{let n=await e.invoke("get_remote_info"),i=document.getElementById("ytmd-qr-container"),a=document.getElementById("ytmd-remote-url");if(n&&n.qr_svg&&i){let o=d("img");o.src=`data:image/svg+xml;utf8,${encodeURIComponent(n.qr_svg)}`,o.width=180,o.height=180,o.style.display="block",o.alt="Mobile Remote QR Code",i.replaceChildren(o)}else if(i)i.replaceChildren(d("span",{text:"Remote server starting...",style:"color: #71717a; font-size: 12px;"}));if(n&&n.url&&a)a.textContent=n.url}catch(n){console.error("[YTMD Remote] Error fetching remote info:",n)}}var w=null,he=null,k=(e,t={})=>new Promise((n)=>{let i=window.__TAURI__;if(!i?.event?.emit){n(null);return}let a=Math.random().toString(36).slice(2)+Date.now().toString(36),o=null,r=setTimeout(()=>{if(o)o();n(null)},4000);i.event.listen(`ytmd-response-${a}`,(c)=>{if(clearTimeout(r),o)o();n(c.payload)}).then((c)=>{o=c,i.event.emit("ytmd-invoke",{id:a,cmd:e,args:t})}).catch(()=>{clearTimeout(r),n(null)})});function Ue(e){if(document.getElementById("ytmd-burger-btn"))return;let t=document.querySelector("ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content"),n=document.querySelector("ytmusic-nav-bar .left-content, ytmusic-nav-bar #left-content"),i=document.querySelector("ytmusic-nav-bar"),a=document.body||document.documentElement;if(!t&&!n&&!a)return;let o=d("button",{id:"ytmd-burger-btn",title:"YouTube Music Desktop Menu (Ctrl+,)",style:`
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
    `}),r=_("M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",15,15),c=d("span",{text:"YTMD",style:"font-size: 12px; font-weight: 700; letter-spacing: 0.2px;"});o.appendChild(r),o.appendChild(c),o.addEventListener("mouseenter",()=>{o.style.background="#333333",o.style.borderColor="rgba(255, 255, 255, 0.3)",o.style.color="#ffffff"}),o.addEventListener("mouseleave",()=>{o.style.background="#212121",o.style.borderColor="rgba(255, 255, 255, 0.15)",o.style.color="#f4f4f5"});let s=document.getElementById("ytmd-burger-popover");if(!s){s=d("div",{id:"ytmd-burger-popover",style:`
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
      `});let l=(y,g,x,Y)=>{let h=d("button",{style:`
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
        `}),D=d("span",{style:"display:flex; align-items:center; gap:10px;"}),C=d("span",{style:"display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; color:#a1a1aa;"});C.appendChild(Ce(y));let ee=d("span",{text:g,style:"font-weight: 500;"});D.appendChild(C),D.appendChild(ee);let T=d("span",{text:x,style:"font-size: 11px; color: #71717a; font-family: monospace;"});return h.appendChild(D),h.appendChild(T),h.addEventListener("mouseenter",()=>{h.style.background="#27272a",h.style.color="#ffffff",C.style.color="#ffffff"}),h.addEventListener("mouseleave",()=>{h.style.background="transparent",h.style.color="#e4e4e7",C.style.color="#a1a1aa"}),h.addEventListener("click",()=>{if(s)s.style.display="none";Y()}),h},u=()=>d("div",{style:"height: 1px !important; background: #27272a !important; margin: 6px 4px !important;"});s.appendChild(l('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',"Preferences & DSP EQ","Ctrl+,",()=>{k("toggle_settings_window")})),s.appendChild(l('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',"Local Music Library","",()=>{k("toggle_local_library_window")})),s.appendChild(l('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',"Listen Together (Sync)","",()=>{k("toggle_sync_window")})),s.appendChild(l('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',"Mobile Web Remote","",()=>{if(he)be(he)})),s.appendChild(l('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><rect x="12" y="9" width="8" height="6" rx="1"/></svg>',"Mini Player","",()=>{k("toggle_mini_player")})),s.appendChild(u()),s.appendChild(l('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',"Download Current Track","",async()=>{if(!w||!w.videoId){alert("Please play a track first to download.");return}try{await k("download_track",{request:{video_id:w.videoId,title:w.title,artist:w.artist,album:w.album||void 0,cover_url:w.coverUrl||void 0,format:e.download_format||"mp3",embed_lyrics:e.embed_lyrics!==!1}}),alert(`Download started for: ${w.title}`)}catch(y){console.error("[YTMD Download Error]:",y)}}));let p=d("div",{style:"display: flex; gap: 4px; padding: 6px 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;"}),b=d("span",{text:"Theme:",style:"font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase;"});p.appendChild(b),["oled","nord","catppuccin","tokyo_night","gruvbox"].forEach((y)=>{let g=d("button",{text:y.toUpperCase(),style:`
          background: #1c1c20;
          border: 1px solid #27272a;
          color: #a1a1aa;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        `});g.addEventListener("click",()=>{let x=document.getElementById("ytmd-active-theme");if(x&&I[y])x.textContent=I[y].css}),p.appendChild(g)}),s.appendChild(p),document.body.appendChild(s),document.addEventListener("click",(y)=>{if(s&&s.style.display==="flex"){if(!s.contains(y.target)&&!o.contains(y.target))s.style.display="none"}})}if(o.addEventListener("click",(l)=>{if(l.stopPropagation(),s){let u=o.getBoundingClientRect();s.style.top=`${u.bottom+8}px`,s.style.right=`${Math.max(16,window.innerWidth-u.right)}px`,s.style.left="auto",s.style.display=s.style.display==="flex"?"none":"flex"}}),t)t.prepend(o);else if(n)n.appendChild(o);else if(i)i.prepend(o);else o.style.position="fixed",o.style.top="12px",o.style.right="16px",a.appendChild(o)}async function $e(){console.log("[YTMD] Initializing YouTube Music Desktop integration bridge...");let e={};Ue(e),setInterval(()=>Ue(e),1000),k("get_config").then((r)=>{if(r&&typeof r==="object")e=r});let t={track:null,config:e,invoke:k,sendPlayerCommand:(r)=>{a(r)},getVideoElement:()=>m.getVideo()};he=t;let n=new re(t);n.register(Te),n.register(we),n.register(_e),n.register(Me),n.register(Ie),n.register(Le),n.register(De),n.register(Re),n.register(Ne),n.register(Ve),n.register(Ye),n.register(Be),n.register(ze),n.register(Oe),n.register(He);try{await n.initAll()}catch(r){console.error("[YTMD] Registry init error:",r)}let i=new oe;i.onTrackChange(async(r)=>{w=r,n.handleTrackChange(r);try{await k("update_track_info",{track:{title:r.title,artist:r.artist,album:r.album||null,cover_url:r.coverUrl||null,duration_secs:r.durationSecs,current_time_secs:r.currentTimeSecs,is_playing:r.isPlaying,video_id:r.videoId||null}})}catch(c){console.error("[YTMD] Failed to sync track info to backend:",c)}}),i.onPlaybackChange(async(r)=>{n.handlePlaybackChange(r);let c=i.getCurrentTrack();if(c){c.isPlaying=r;try{await k("update_track_info",{track:{title:c.title,artist:c.artist,album:c.album||null,cover_url:c.coverUrl||null,duration_secs:c.durationSecs,current_time_secs:c.currentTimeSecs,is_playing:r,video_id:c.videoId||null}})}catch(s){console.error("[YTMD] Failed to sync playback status:",s)}}}),i.onTick((r)=>{n.handleTick(r)});function a(r){switch(r){case"play":m.play();break;case"pause":m.pause();break;case"play_pause":m.playPause();break;case"next":m.next();break;case"previous":m.previous();break;case"like":m.toggleLike();break;case"dislike":m.toggleDislike();break;case"mute":m.toggleMute();break}}let o=(r,c)=>{let s=window.__TAURI__;if(s?.event?.listen)s.event.listen(r,(l)=>c(l.payload))};o("player-command",(r)=>a(r)),o("tray-command",(r)=>a(r)),o("mpris-command",(r)=>a(r)),o("global-shortcut-event",(r)=>a(r)),o("player-seek",(r)=>m.seekTo(r)),o("mpris-command-seek",(r)=>m.seekTo(r)),o("player-volume",(r)=>m.setVolume(r)),window.addEventListener("keydown",(r)=>{if(r.ctrlKey&&r.key===","||r.key==="F2")r.preventDefault(),k("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>$e());else $e();
