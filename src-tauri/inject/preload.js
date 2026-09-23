function Ee(e){let t=e.trim().split(":").map((n)=>parseInt(n,10));if(t.some((n)=>isNaN(n)))return 0;if(t.length===2)return t[0]*60+t[1];else if(t.length===3)return t[0]*3600+t[1]*60+t[2];return 0}var ut=400;function mt(e,t){return e-t>=ut}class ce{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;observedTarget=null;lastTickMs=0;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;this.emitTick(this.attachedVideo.currentTime)};emitTick(e){this.lastTickMs=Date.now(),this.onTickCallbacks.forEach((t)=>t(e))}constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let n=navigator.mediaSession,i=n.metadata;try{Object.defineProperty(n,"metadata",{get:()=>i,set:(o)=>{i=o,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(o){}}this.syncVideoListeners();let e=!1,t=()=>{if(e)return;e=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),e=!1})};this.mutationObserver=new MutationObserver(t),this.syncMutationTarget(),this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.syncMutationTarget(),this.checkTrackUpdate();let n=document.querySelector("video");if(n&&!n.paused&&mt(Date.now(),this.lastTickMs))this.emitTick(n.currentTime)},250)}syncMutationTarget(){if(!this.mutationObserver)return;let e=document.querySelector("ytmusic-player-bar")||document.body;if(!e||e===this.observedTarget)return;this.mutationObserver.disconnect(),this.mutationObserver.observe(e,{childList:!0,subtree:!0,characterData:!0}),this.observedTarget=e}attachVideoListeners(e){e.addEventListener("play",this.handleVideoPlay),e.addEventListener("playing",this.handleVideoPlay),e.addEventListener("pause",this.handleVideoPause),e.addEventListener("ended",this.handleVideoPause),e.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=e}detachVideoListeners(e){e.removeEventListener("play",this.handleVideoPlay),e.removeEventListener("playing",this.handleVideoPlay),e.removeEventListener("pause",this.handleVideoPause),e.removeEventListener("ended",this.handleVideoPause),e.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let e=document.querySelector("video");if(e&&e!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners(e)}}extractTrackInfo(){let e=document.querySelector("video"),t=document.getElementById("movie_player");if(Boolean(t&&(typeof t.getAdState==="function"&&t.getAdState()===1||typeof t.isAdPlaying==="function"&&t.isAdPlaying()||t.classList?.contains("ad-showing")||t.classList?.contains("ad-interrupting"))))return null;let i=navigator.mediaSession?.metadata,o=i?.title||"",r=i?.artist||"",a=i?.album||"",d="";if(i?.artwork&&i.artwork.length>0){let m=i.artwork[i.artwork.length-1];if(m&&m.src)d=m.src}if(!o){let m=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(m)o=m.textContent?.trim()||""}if(!r){let m=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(m){let h=(m.textContent?.trim()||"").split("•").map((T)=>T.trim());if(r=h[0]||"",h.length>1)a=h[1]}}if(!d){let m=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(m&&m.src)d=m.src}if(d.startsWith("//"))d=`https:${d}`;if(d.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(d))d=d.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let u=new URLSearchParams(window.location.search).get("v")||void 0,s=0,l=0;if(t&&typeof t.getDuration==="function"){let m=t.getDuration();if(typeof m==="number"&&Number.isFinite(m)&&m>0)s=Math.floor(m)}if(t&&typeof t.getCurrentTime==="function"){let m=t.getCurrentTime();if(typeof m==="number"&&Number.isFinite(m)&&m>=0)l=Math.floor(m)}if(!s&&e&&Number.isFinite(e.duration)&&e.duration>0)s=Math.floor(e.duration);if(!l&&e&&Number.isFinite(e.currentTime)&&e.currentTime>=0)l=Math.floor(e.currentTime);let g=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(g&&g.textContent){let m=g.textContent.split("/").map((f)=>f.trim());if(m.length===2){if(!l)l=Ee(m[0]);if(!s)s=Ee(m[1])}}if(!s){let f=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(f){let h=parseInt(f,10);if(!isNaN(h)&&h>0)s=h}}let y=e?!e.paused&&!e.ended:!1;if(!o)return null;return{title:o,artist:r||"Unknown Artist",album:a||void 0,coverUrl:d||void 0,durationSecs:s,currentTimeSecs:l,isPlaying:y,videoId:u}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=!this.currentTrack||this.currentTrack.title!==e.title||this.currentTrack.artist!==e.artist||this.currentTrack.videoId!==e.videoId,n=this.currentTrack!==null&&(!this.currentTrack.durationSecs&&e.durationSecs>0||!this.currentTrack.coverUrl&&!!e.coverUrl||!this.currentTrack.album&&!!e.album||!this.currentTrack.videoId&&!!e.videoId),i=this.currentTrack!==null&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t||n){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((o)=>o(e))}if(i)this.onPlaybackChangeCallbacks.forEach((o)=>o(e.isPlaying))}handlePlaybackChange(e){if(e){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((t)=>t(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((t)=>t(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null,this.observedTarget=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}class b{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)t.volume=Math.max(0,Math.min(1,e))}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}class de{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(o){console.error(`[YTMD] Failed to init plugin ${t}:`,o)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,i)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,i)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTick:`,i)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var U=null,S={adWasShowing:!1,preAdMuted:!1},me=new WeakSet,R=null,De=null,ue=0,N=!0,pt=1000,gt=(e,t,n)=>e-t>=n,yt=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",bt="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer",ht=300,ft=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,vt=`
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
`,kt=ft+vt,Tt=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],wt=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],xt=(e)=>Tt.some((t)=>e.includes(t)),Ct=(e,t)=>{let n=t.split("."),i=e;for(let r=0;r<n.length-1;r++){if(i===null||typeof i!=="object")return!1;i=i[n[r]]}let o=n[n.length-1];if(i!==null&&typeof i==="object"&&Object.prototype.hasOwnProperty.call(i,o))return delete i[o],!0;return!1},ge=(e)=>{if(e===null||typeof e!=="object")return!1;let t=!1;for(let n of wt)if(Ct(e,n))t=!0;return t},Pt=(e)=>{if(typeof e==="string")return e;if(e instanceof URL)return e.href;return e.url},Se=!1,_t=()=>{if(Se)return;Se=!0;let e=window.fetch,t=e.bind(window),n=async(...i)=>{let o=await t(...i);if(!N||!xt(Pt(i[0])))return o;let r;try{r=await o.clone().json()}catch{return o}if(!ge(r))return o;let a=new Headers(o.headers);return a.delete("content-length"),a.delete("content-encoding"),new Response(JSON.stringify(r),{status:o.status,statusText:o.statusText,headers:a})};window.fetch=Object.assign(n,e)},Me=!1,Et=()=>{if(Me)return;Me=!0;let e=JSON.parse;JSON.parse=(...t)=>{let n=e(...t);if(N)ge(n);return n}},Ie=!1,St=()=>{if(Ie)return;Ie=!0;let e;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>e,set:(t)=>{if(N)ge(t);e=t}})};if(typeof window<"u")_t(),Et(),St();var Mt=(e)=>{let t=new Set(e);return t.has("ad-showing")||t.has("ad-interrupting")},It=(e,t,n)=>{if(e&&!t.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:n},setMutedTo:!0};if(!e&&t.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:t.preAdMuted},setMutedTo:t.preAdMuted};return{nextState:t,setMutedTo:null}},ye=()=>document.getElementById("movie_player"),At=()=>{let e=ye();if(!e)return!1;return Mt(e.classList)},pe=(e)=>{let t=e.getVideoElement();if(!t)return;let{nextState:n,setMutedTo:i}=It(At(),S,t.muted);if(S=n,i!==null)t.muted=i},Ae=(e)=>{if(me.has(e))return;me.add(e),e.click()},q=()=>{document.querySelectorAll(yt).forEach(Ae),document.querySelectorAll(bt).forEach((e)=>{let t=e.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(t)Ae(t)})},Le=(e)=>{let t=ye();if(De=t,!t)return;R?.disconnect(),R=new MutationObserver(()=>{pe(e),q()}),R.observe(t,{attributes:!0,attributeFilter:["class"]})},Re={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit(e){N=!0,S={adWasShowing:!1,preAdMuted:!1},me=new WeakSet,ue=0;let t=document.createElement("style");t.id="ytmd-adblock-styles",t.textContent=kt,document.head.appendChild(t);let n=null,i=new MutationObserver(()=>{if(n!==null)return;n=setTimeout(()=>{n=null,q()},ht)});i.observe(document.body,{childList:!0,subtree:!0}),Le(e),q(),pe(e),U=()=>{if(N=!1,R?.disconnect(),R=null,i.disconnect(),n!==null)clearTimeout(n);document.getElementById("ytmd-adblock-styles")?.remove();let o=e.getVideoElement();if(o&&S.adWasShowing)o.muted=S.preAdMuted;S={adWasShowing:!1,preAdMuted:!1}}},onTick(e,t){if(ye()!==De)Le(t);pe(t);let n=Date.now();if(gt(n,ue,pt))ue=n,q()},onDestroy(){if(U)U(),U=null}};var M=[],z="",be=new Set,Lt=(e,t)=>e===t,Ne={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){M=[],z="",be=new Set},onTrackChange(e){if(!e.videoId||e.videoId===z)return;let t=e.videoId;z=t,M=[],be=new Set;let n=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),i=`https://sponsor.ajay.app/api/skipSegments?videoID=${t}&categories=${encodeURIComponent(n)}`;fetch(i,{signal:AbortSignal.timeout(3000)}).then(async(o)=>{if(!o.ok)return;let r=await o.json();if(!Lt(t,z))return;M=r,console.log(`[YTMD SponsorBlock] Loaded ${r.length} segments for ${t}`)}).catch(()=>{})},onTick(e,t){if(!M||M.length===0)return;let n=be;for(let i of M){let[o,r]=i.segment;if(e>=o&&e<r-0.5&&!n.has(i.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${i.category}): ${o}s -> ${r}s`);let a=t.getVideoElement();if(a)a.currentTime=r,n.add(i.UUID);break}}}};function I(e,t=18,n=18,i="0 0 24 24"){let o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.setAttribute("width",String(t)),o.setAttribute("height",String(n)),o.setAttribute("viewBox",i),o.setAttribute("fill","currentColor");let r=document.createElementNS("http://www.w3.org/2000/svg","path");return r.setAttribute("d",e),o.appendChild(r),o}var Ve="http://www.w3.org/2000/svg",Dt="circle|path|rect|line|polyline|polygon|g|ellipse";function Be(e){let t=document.createElementNS(Ve,"svg"),n=(r,a)=>{for(let d of a.matchAll(/([\w:-]+)="([^"]*)"/g))r.setAttribute(d[1],d[2])},i=e.match(/^<svg([^>]*)>/);if(i)n(t,i[1]);let o=new RegExp(`<(${Dt})([^>]*)\\/?>`,"g");for(let r of e.matchAll(o)){let a=document.createElementNS(Ve,r[1]);n(a,r[2]),t.appendChild(a)}return t}function p(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var w=[],B=-1,O=null,k="",F=null,V="",Ye=(e,t)=>e===t,He={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(e){w=[],B=-1,O=null,k="",V="";let t=document.createElement("style");t.id="ytmd-native-lyrics-styles",t.textContent=`
      /* Scoped to tabs unlockLyricsTabHeader() has explicitly matched by
         label — NOT blind tab position (nth-of-type), since a layout where
         "Tekst"/"Lyrics" isn't the 2nd tab would otherwise force
         pointer-events:auto on some unrelated tab. */
      .ytmd-lyrics-tab-unlocked {
        pointer-events: auto !important;
        cursor: pointer !important;
      }
      .ytmd-lyrics-tab-unlocked[disabled],
      .ytmd-lyrics-tab-unlocked[aria-disabled="true"] {
        opacity: 1 !important;
        color: #d4d4d8 !important;
      }

      /* Hide default un-synced text, spinners and unavailable messages inside lyrics tab ONLY */
      #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer,
      #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer,
      #tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] tp-yt-paper-spinner,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] tp-yt-paper-spinner {
        display: none !important;
      }

      #ytmd-native-lyrics-wrapper {
        display: none !important;
        flex-direction: column;
        gap: 14px;
        padding: 40px 24px 160px 24px;
        max-width: 760px;
        margin: 0 auto;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        width: 100%;
      }

      /* Strict visibility: show ONLY inside the active lyrics tab renderer */
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"].iron-selected #ytmd-native-lyrics-wrapper,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]:not([hidden]):not([aria-hidden="true"]) #ytmd-native-lyrics-wrapper {
        display: flex !important;
      }

      /* Never show inside queue / related / hidden tabs */
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"][hidden] #ytmd-native-lyrics-wrapper,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"][aria-hidden="true"] #ytmd-native-lyrics-wrapper,
      ytmusic-tab-renderer:not([page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]) #ytmd-native-lyrics-wrapper,
      ytmusic-player-page ytmusic-tab-renderer:not(.iron-selected) #ytmd-native-lyrics-wrapper {
        display: none !important;
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
      .ytmd-native-lyrics-sync-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-top: 24px;
        padding: 10px 16px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        width: fit-content;
        margin-left: auto;
        margin-right: auto;
      }
      .ytmd-sync-label {
        font-size: 11px;
        color: #a1a1aa;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .ytmd-sync-btn {
        background: #27272a;
        color: #f4f4f5;
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s ease, transform 0.1s ease;
      }
      .ytmd-sync-btn:hover {
        background: #3f3f46;
        transform: scale(1.05);
      }
      .ytmd-sync-val {
        font-size: 12px;
        font-weight: 700;
        color: #38bdf8;
        min-width: 42px;
        text-align: center;
      }
    `,document.head.appendChild(t);let n=()=>{G(),Oe(e)},i=()=>{setTimeout(()=>{G(),fe()},50),setTimeout(()=>{fe()},250)};document.addEventListener("click",i,!0);let o=window.setInterval(n,600);n(),F=()=>{clearInterval(o),document.removeEventListener("click",i,!0),t.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((a)=>a.remove())}},async onTrackChange(e,t){let n=`${e.title} - ${e.artist}`;if(k===n&&w.length>0||V===n)return;k=n,V=n,w=[],B=-1,O=null,G();let i=document.getElementById("ytmd-native-lyrics-wrapper");if(i)i.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:"Loading synchronized lyrics..."}));try{let o=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(!Ye(n,k))return;if(O=o,o?.syncedLyrics)w=Bt(o.syncedLyrics);G(),Oe(t),qe(t)}catch{if(!Ye(n,k))return;let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o)o.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:"No lyrics available for this track."}))}finally{if(V===n)V=""}},onTick(e){if(!w||w.length===0)return;let t=Y(k),n=e+t,i=-1;for(let o=0;o<w.length;o++)if(n>=w[o].timeSecs)i=o;else break;if(i!==B&&i>=0){B=i;let o=document.getElementById("ytmd-native-lyrics-wrapper");if(o){let r=o.querySelectorAll(".ytmd-native-lyric-line");r.forEach((d,c)=>{if(c===i)d.classList.add("active");else d.classList.remove("active")});let a=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(a&&Rt(a)){let d=r[i];if(d)d.scrollIntoView({behavior:"smooth",block:"nearest"})}}}},onDestroy(){if(F)F(),F=null}},Ue=new Map;function Y(e){return Ue.get(e)||0}function he(e,t){Ue.set(e,t)}function Rt(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function Nt(e){return e.disabled!==!0&&!e.hasAttribute("disabled")&&e.getAttribute("aria-disabled")!=="true"&&!e.classList.contains("disabled")&&e.classList.contains("ytmd-lyrics-tab-unlocked")}function G(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras")){if(Nt(t))return;t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.classList.add("ytmd-lyrics-tab-unlocked");let i={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!t.endpoint)t.endpoint=i;if(t.data&&!t.data.endpoint)t.data.endpoint=i}})}function Vt(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let n of Array.from(e)){let i=n.textContent?.toLowerCase()||"";if(i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras")){if(n.classList.contains("iron-selected")||n.getAttribute("aria-selected")==="true"||n.classList.contains("selected"))return!0}}let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t){if((t.classList.contains("iron-selected")||!t.hasAttribute("hidden"))&&t.getAttribute("aria-hidden")!=="true")return!0}return!1}function fe(){let e=document.getElementById("ytmd-native-lyrics-wrapper");if(!e)return;let t=Vt();e.style.setProperty("display",t?"flex":"none","important")}function Oe(e){let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n||!t.contains(n)){if(!n)n=p("div",{id:"ytmd-native-lyrics-wrapper"});t.appendChild(n),qe(e)}fe()}function qe(e){let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(w&&w.length>0){let n=Y(k),i=p("div",{className:"ytmd-native-lyrics-sync-bar"}),o=p("span",{className:"ytmd-sync-label",text:"Sync:"}),r=p("button",{className:"ytmd-sync-btn",text:"-0.5s",title:"Shift lyrics 0.5s earlier"}),a=p("span",{className:"ytmd-sync-val",text:`${n>=0?"+":""}${n.toFixed(1)}s`}),d=p("button",{className:"ytmd-sync-btn",text:"+0.5s",title:"Shift lyrics 0.5s later"}),c=p("button",{className:"ytmd-sync-btn",text:"Reset",title:"Reset offset to 0.0s"});r.addEventListener("click",()=>{let u=Math.round((Y(k)-0.5)*10)/10;he(k,u),a.textContent=`${u>=0?"+":""}${u.toFixed(1)}s`}),d.addEventListener("click",()=>{let u=Math.round((Y(k)+0.5)*10)/10;he(k,u),a.textContent=`${u>=0?"+":""}${u.toFixed(1)}s`}),c.addEventListener("click",()=>{he(k,0),a.textContent="+0.0s"}),i.appendChild(o),i.appendChild(r),i.appendChild(a),i.appendChild(d),i.appendChild(c),t.replaceChildren(...w.map((u,s)=>{let l=p("div",{className:`ytmd-native-lyric-line${s===B?" active":""}`,text:u.text});return l.addEventListener("click",()=>{let g=e.getVideoElement();if(g){let y=Y(k);g.currentTime=Math.max(0,u.timeSecs-y)}}),l}),i,p("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else if(O?.plainLyrics){let n=O.plainLyrics.split(`
`);t.replaceChildren(...n.map((i)=>p("div",{className:"ytmd-native-lyric-line active",text:i,style:"cursor: default;"})),p("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else t.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:"Synced lyrics unavailable for this track."}))}function Bt(e){let t=e.split(`
`),n=[],i=0,o=/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g,r=/\[offset:\s*([+-]?\d+)\s*\]/i;for(let a of t){let d=a.trim();if(!d)continue;let c=r.exec(d);if(c){let l=parseInt(c[1],10);if(!isNaN(l))i=l/1000;continue}let u=[],s;o.lastIndex=0;while((s=o.exec(d))!==null){let l=parseInt(s[1],10),g=parseInt(s[2],10),y=0;if(s[3])y=parseInt(s[3].padEnd(3,"0").slice(0,3),10);u.push(l*60+g+y/1000)}if(u.length>0){let l=d.replace(o,"").trim();if(l)for(let g of u)n.push({timeSecs:Math.max(0,g-i),text:l})}}return n.sort((a,d)=>a.timeSecs-d.timeSecs)}var W=null,ze={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit(e){let t=(n)=>{let i=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!i)return;let o=i.getBoundingClientRect();if(n.clientX>=o.left&&n.clientX<=o.right&&n.clientY>=o.top&&n.clientY<=o.bottom){n.preventDefault();let r=e.getVideoElement();if(r){let a=e.config.wheel_volume_step||0.05,d=n.deltaY<0?a:-a,c=Math.max(0,Math.min(1,r.volume+d));r.volume=c}}};window.addEventListener("wheel",t,{passive:!1}),W=()=>{window.removeEventListener("wheel",t)}},onDestroy(){if(W)W(),W=null}};var Fe={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var j=null,Ge={id:"visualizer",name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-theme-styles");if(!t)t=document.createElement("style"),t.id="ytmd-theme-styles";if(t.textContent=`
      /* Deliberately NOT overriding ::-webkit-scrollbar width/height.
         YouTube Music's own layout code reserves gutter space sized for the
         native (wider) scrollbar; shrinking the rendered scrollbar to a
         custom width leaves a stale gap the size of the difference wherever
         that reserved space gets exposed (e.g. when focusing/expanding the
         now-playing view triggers a layout recalc) — seen as empty space
         where the scrollbar used to be. */
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
    `,!t.isConnected)document.head.appendChild(t);j=()=>{t?.remove()}},onDestroy(){if(j)j(),j=null}};var K=[32,64,125,250,500,1000,2000,4000,8000,16000],ve={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function H(e){return Math.max(-12,Math.min(12,e))}class v{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;playbackRate=1;preservesPitch=!0;gains=K.map(()=>0);preampDb=0;isInitializedFor(e){return this.isInitialized&&this.hookedVideo===e}static getInstance(){if(!v.instance)v.instance=new v;return v.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=K.map((i,o)=>{if(!this.audioCtx)throw Error("AudioContext missing");let r=this.audioCtx.createBiquadFilter();if(o===0)r.type="lowshelf";else if(o===K.length-1)r.type="highshelf";else r.type="peaking",r.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return r.frequency.setValueAtTime(i,this.audioCtx.currentTime),r.gain.setValueAtTime(0,this.audioCtx.currentTime),r}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph(),this.setAllGains(this.gains),this.setPreamp(this.preampDb),this.applyRateAndPitch();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.gains.length)return;let n=H(t);if(this.gains[e]=n,!this.audioCtx||e>=this.filters.length)return;this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){e.forEach((n,i)=>{if(i<this.gains.length)this.gains[i]=H(n)});let t=this.audioCtx;if(!t)return;this.gains.forEach((n,i)=>{if(i<this.filters.length)this.filters[i].gain.setValueAtTime(n,t.currentTime)})}setPreamp(e){if(this.preampDb=H(e),!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,H(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=ve[e]||ve.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return null;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);let e=this.powerBuffer;this.analyserNode.getFloatTimeDomainData(e);let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){this.playbackRate=Math.max(0.5,Math.min(2,e)),this.applyRateAndPitch()}setPreservesPitch(e){this.preservesPitch=e,this.applyRateAndPitch()}applyRateAndPitch(){let e=this.hookedVideo??b.getVideo();if(!e)return;if(e.playbackRate!==this.playbackRate)e.playbackRate=this.playbackRate;if(e.preservesPitch!==this.preservesPitch){e.preservesPitch=this.preservesPitch;let t=e;t.webkitPreservesPitch=this.preservesPitch}}}class ke{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)v.getInstance().fadeIn(this.crossfadeSeconds);else v.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(this.fadeOutTriggered&&n>this.crossfadeSeconds+1){this.fadeOutTriggered=!1,this.clearPendingAdvance(),v.getInstance().resetFade();return}if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),v.getInstance().fadeOut(n),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[YTMD Crossfade] Advancing to next track..."),b.next()},Math.max(100,(n-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class Te{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=v.getInstance().getAudioPowerDb();if(i===null)return;if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,b.next()}else this.consecutiveSilentTicks=0}}var E=null,A=null,Q=null;function Yt(e){let t=e.equalizer_gains;return Boolean(e.equalizer_enabled||e.loudness_normalization||e.skip_silence_enabled||typeof e.crossfade_seconds==="number"&&e.crossfade_seconds>0||typeof e.preamp_gain==="number"&&e.preamp_gain!==0||Array.isArray(t)&&t.some((n)=>n!==0))}var $e={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=v.getInstance(),n=new ke,i=new Te;E=n,A=i;let o=e.config,r=null,a=()=>{if(r!==null)return;let c=e.getVideoElement();if(c){if(!t.isInitializedFor(c))t.init(c);return}r=window.setInterval(()=>{let u=e.getVideoElement();if(u){if(r!==null)clearInterval(r);r=null,t.init(u)}},500)};if(Yt(o))a();if(o.equalizer_gains&&Array.isArray(o.equalizer_gains))t.setAllGains(o.equalizer_gains);else if(o.equalizer_preset&&typeof o.equalizer_preset==="string")t.applyPreset(o.equalizer_preset);if(o.preamp_gain!==void 0)t.setPreamp(o.preamp_gain);if(o.loudness_normalization!==void 0)t.setLoudnessNormalization(Boolean(o.loudness_normalization));if(o.crossfade_seconds!==void 0)n.setCrossfadeSeconds(o.crossfade_seconds);if(o.skip_silence_enabled!==void 0)i.setEnabled(Boolean(o.skip_silence_enabled));if(o.playback_speed!==void 0)t.setPlaybackRate(o.playback_speed);if(o.preserve_pitch!==void 0)t.setPreservesPitch(Boolean(o.preserve_pitch));let d=[];if(window.__TAURI__?.event){let{listen:c}=window.__TAURI__.event;d.push(c("set-eq-band",(u)=>{a(),t.setBandGain(u.payload.bandIndex,u.payload.gain)}),c("set-eq-all",(u)=>{a(),t.setAllGains(u.payload.gains)}),c("set-eq-preset",(u)=>{a(),t.applyPreset(u.payload)}),c("set-preamp",(u)=>{a(),t.setPreamp(u.payload)}),c("set-loudness-normalization",(u)=>{if(u.payload)a();t.setLoudnessNormalization(u.payload)}),c("set-crossfade-seconds",(u)=>{if(u.payload>0)a();n.setCrossfadeSeconds(u.payload)}),c("set-skip-silence",(u)=>{if(u.payload)a();i.setEnabled(u.payload)}),c("set-playback-rate",(u)=>{t.setPlaybackRate(u.payload)}),c("set-preserves-pitch",(u)=>{t.setPreservesPitch(u.payload)}))}Q=()=>{if(r!==null)clearInterval(r),r=null;d.forEach((c)=>c.then((u)=>u())),E?.destroy(),E=null,A=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(v.getInstance().applyRateAndPitch(),E)E.onTrackChange(e);if(A)A.onTrackChange()},onTick(e,t){if(E)E.onTick(e,t.track);if(A)A.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(Q)Q(),Q=null}};var we=(e,t,n)=>{let i=(r)=>Math.max(0,Math.min(255,Math.round(r))),o=(r)=>i(r).toString(16).padStart(2,"0");return`#${o(e)}${o(t)}${o(n)}`};async function We(e){return new Promise((t)=>{let n={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=16,o.height=16;let r=o.getContext("2d");if(!r){t(n);return}r.drawImage(i,0,0,16,16);let a=r.getImageData(0,0,16,16).data,d=0,c=0,u=0,s=0,l=0,g=0,y=0,m=0;for(let _=0;_<a.length;_+=4){let ae=a[_],se=a[_+1],le=a[_+2];if(a[_+3]<128)continue;let _e=(ae+se+le)/3;if(_e<20||_e>240)continue;if(_<a.length/2)d+=ae,c+=se,u+=le,s++;else l+=ae,g+=se,y+=le,m++}if(s===0&&m===0){t(n);return}let f=s>0?Math.round(d/s):220,h=s>0?Math.round(c/s):38,T=s>0?Math.round(u/s):38,D=m>0?Math.round(l/m):24,re=m>0?Math.round(g/m):24,dt=m>0?Math.round(y/m):27;t({primary:we(f,h,T),secondary:we(D,re,dt),accent:we(f+30,h+30,T+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var P=48,Ot=3,Ht=3,Ut=1.65,qt=0.55;function zt(e,t,n,i){let o=new Float32Array(e.length),r=(a,d,c)=>{let u=c?n:t,s=c?t:n;for(let l=0;l<u;l++)for(let g=0;g<4;g++)for(let y=0;y<s;y++){let m=0,f=0;for(let T=Math.max(0,y-i);T<=Math.min(s-1,y+i);T++){let D=c?(l*t+T)*4+g:(T*t+l)*4+g;m+=a[D],f++}let h=c?(l*t+y)*4+g:(y*t+l)*4+g;d[h]=m/f}};r(e,o,!0),r(o,e,!1)}function Ft(e,t,n){for(let i=0;i<e.length;i+=4){let o=e[i],r=e[i+1],a=e[i+2],d=0.2126*o+0.7152*r+0.0722*a;e[i]=(d+(o-d)*t)*n,e[i+1]=(d+(r-d)*t)*n,e[i+2]=(d+(a-d)*t)*n}}async function je(e,t=qt){if(!e)return null;return new Promise((n)=>{let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let o=document.createElement("canvas");o.width=P,o.height=P;let r=o.getContext("2d");if(!r)return n(null);r.imageSmoothingQuality="high",r.drawImage(i,0,0,P,P);let a=r.getImageData(0,0,P,P);for(let d=0;d<Ht;d++)zt(a.data,P,P,Ot);Ft(a.data,Ut,t),r.putImageData(a,0,0),n(o.toDataURL("image/png"))}catch{n(null)}},i.onerror=()=>n(null),i.src=e})}var J=null,X=null,Z,Ke={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=p("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(t);t.replaceChildren();let n=p("img",{id:"ytmd-ambient-cover"});n.alt="";let i=p("div",{id:"ytmd-ambient-veil"});t.appendChild(n),t.appendChild(i);let o=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,r=e.config.ambient_lighting_enabled!==!1,a=document.createElement("style");a.id="ytmd-ambient-styles",a.textContent=`
      #ytmd-ambient-backdrop {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
        opacity: ${r?o:0};
        transition: opacity 0.8s ease;
      }
      /* Full-bleed blurred cover, so nav bar/player bar/sidebar going
         translucent (theme_engine's Ambient CSS) reveals something rich.
         The src is a small bitmap blurred once per track in JS
         (renderAmbientWash) and stretched here — deliberately no CSS
         filter and no animation: a live blur(64px) on a full-window layer
         plus an infinite transform animation made WebKit re-blur the whole
         window every frame, which stuttered scrolling and playback. */
      #ytmd-ambient-cover {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        opacity: 0;
        transition: opacity 1.1s ease;
      }
      #ytmd-ambient-veil {
        position: absolute;
        inset: 0;
        background:
          radial-gradient(ellipse 70% 55% at 20% 0%, color-mix(in srgb, var(--ytmd-accent-primary, #3a2f1f) 45%, transparent) 0%, transparent 60%),
          radial-gradient(ellipse 65% 60% at 100% 100%, color-mix(in srgb, var(--ytmd-accent-secondary, #0e0c11) 40%, transparent) 0%, transparent 65%),
          linear-gradient(180deg, rgba(7, 6, 10, 0.35) 0%, rgba(7, 6, 10, 0.75) 100%);
      }
      /* Ensure YouTube Music transparent backgrounds let the wash pass through */
      ytmusic-app-layout, #browse-page, ytmusic-browse-response {
        background-color: transparent !important;
      }
    `,document.head.appendChild(a),J=(c)=>{if(t)t.style.opacity=String(c)};let d=[];if(window.__TAURI__?.event)d.push(window.__TAURI__.event.listen("set-ambient-intensity",(c)=>{J?.(c.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(c)=>{J?.(c.payload?0.6:0)}));if(X=()=>{d.forEach((c)=>c.then((u)=>u())),J=null,Z=void 0,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){let t=e.coverUrl||null;if(t===Z)return;Z=t;let n=document.getElementById("ytmd-ambient-cover");if(n){let i=t?await je(t):null;if(t!==Z)return;if(n.style.opacity=i?"1":"0",i)n.src=i}try{let i=await We(t||""),o=document.documentElement.style;o.setProperty("--ytmd-accent",i.accent),o.setProperty("--ytmd-accent-primary",i.primary),o.setProperty("--ytmd-accent-secondary",i.secondary)}catch{}},onDestroy(){if(X)X(),X=null}};var Qe=`
  html {
    --ytmusic-call-to-action: var(--ytmd-accent, #e8b06b) !important;
    --yt-sys-color-baseline--call-to-action: var(--ytmd-accent, #e8b06b) !important;
    --yt-sys-color-baseline--call-to-action-inverse: var(--ytmd-accent, #e8b06b) !important;
    --yt-sys-color-baseline--overlay-call-to-action: var(--ytmd-accent, #e8b06b) !important;
    --yt-sys-color-baseline--call-to-action-hover: color-mix(in srgb, var(--ytmd-accent, #e8b06b) 100%, white 18%) !important;
    --yt-sys-color-baseline--overlay-call-to-action-hover: color-mix(in srgb, var(--ytmd-accent, #e8b06b) 100%, white 18%) !important;
    --paper-input-container-focus-color: ${"var(--ytmd-accent, #e8b06b)"} !important;

    --ytmusic-brand-background-solid: color-mix(in srgb, #121016 70%, transparent) !important;
    --yt-sys-color-baseline--raised-background: color-mix(in srgb, #121016 78%, transparent) !important;
    --yt-sys-color-baseline--menu-background: color-mix(in srgb, #121016 90%, transparent) !important;
    --paper-menu-background-color: color-mix(in srgb, #121016 90%, transparent) !important;
    --paper-dialog-background-color: color-mix(in srgb, #121016 90%, transparent) !important;
    --yt-live-chat-dialog-background-color: color-mix(in srgb, #121016 90%, transparent) !important;
    --ytmusic-badge-chip-background: color-mix(in srgb, white 7%, transparent) !important;
    --ytmusic-explore-chip-background: color-mix(in srgb, white 7%, transparent) !important;
  }

  /* Only the true root canvas is forced opaque here. ytmusic-app-layout,
     #browse-page and ytmusic-browse-response are transparent by default in
     YouTube Music's own CSS (they already show html/body through), and
     AmbientLightingPlugin owns keeping them that way so the glow orb behind
     them is visible — forcing it here too would just be a second,
     redundant source of truth for the same rule. */
  html, body {
    background-color: #08070b !important;
  }

  /* The chrome users look at constantly — nav bar, player bar, sidebar —
     goes translucent glass instead of a flat opaque box, so the ambient
     wash actually shows through it instead of stopping at its edges. */
  ytmusic-nav-bar, ytmusic-player-bar {
    background: color-mix(in srgb, #0c0a10 62%, transparent) !important;
    backdrop-filter: blur(20px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  /* Large surfaces get a denser tint instead of a live backdrop blur.
     WebKit recomputes a backdrop-filter every frame the content under it
     repaints; over the full-height sidebar and the full-window player
     page (lyrics scrolling, progress, queue) that was a steady per-frame
     GPU cost. What's behind them is the already-blurred ambient wash, so
     a tint reads nearly the same. */
  ytmusic-player-page {
    background: color-mix(in srgb, #0c0a10 84%, transparent) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  ytmusic-guide-renderer {
    background: color-mix(in srgb, #0a0910 62%, transparent) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
  }
  tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
    background-color: ${"var(--ytmd-accent, #e8b06b)"} !important;
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

`,Je=`
  html {
    --ytmusic-background: #0d0c11 !important;
    --yt-sys-color-baseline--base-background: #0d0c11 !important;

    --ytmusic-brand-background-solid: #141319 !important;
    --yt-sys-color-baseline--raised-background: #141319 !important;
    --yt-sys-color-baseline--menu-background: #17151d !important;
    --paper-menu-background-color: #17151d !important;
    --paper-dialog-background-color: #17151d !important;
    --yt-live-chat-dialog-background-color: #17151d !important;
    --ytmusic-badge-chip-background: #1c1a22 !important;
    --ytmusic-explore-chip-background: #1c1a22 !important;

    --ytmusic-call-to-action: #e8b06b !important;
    --yt-sys-color-baseline--call-to-action: #e8b06b !important;
    --yt-sys-color-baseline--call-to-action-inverse: #e8b06b !important;
    --yt-sys-color-baseline--overlay-call-to-action: #e8b06b !important;
    --yt-sys-color-baseline--call-to-action-hover: #f0bd85 !important;
    --yt-sys-color-baseline--overlay-call-to-action-hover: #f0bd85 !important;
    --paper-input-container-focus-color: #e8b06b !important;
  }
  html, body {
    background-color: #0d0c11 !important;
  }
  ytmusic-nav-bar, ytmusic-player-bar, ytmusic-player-page {
    background: #141319 !important;
    border-color: #242229 !important;
  }
  ytmusic-guide-renderer {
    background-color: #0d0c11 !important;
    border-right: 1px solid #242229 !important;
  }
  tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
    background-color: #e8b06b !important;
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

`;var ee=null,Xe={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(d)=>{let c=document.getElementById(d);if(!c){c=document.createElement("style"),c.id=d;let u=t();if(u)u.appendChild(c)}return c},i=(d)=>{let c=n("ytmd-active-theme");c.textContent=d?Qe:Je},o=(d)=>{let c=n("ytmd-custom-css");if(c)c.textContent=d};i(e.config.ambient_lighting_enabled!==!1);let r=e.config.custom_css||"";o(r);let a=[];if(window.__TAURI__?.event)a.push(window.__TAURI__.event.listen("set-ambient-enabled",(d)=>{i(d.payload)}),window.__TAURI__.event.listen("set-custom-css",(d)=>{o(d.payload)}));ee=()=>{a.forEach((d)=>d.then((c)=>c()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(ee)ee(),ee=null}};var te=null,Ze={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let o=p("button",{id:"ytmd-pip-btn",title:"Picture-in-Picture (Float Video)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),r=I("M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",20,20);o.appendChild(r),o.style.cssText=`
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
        `,o.addEventListener("mouseenter",()=>{o.style.color="#fafafa",o.style.backgroundColor="#27272a"}),o.addEventListener("mouseleave",()=>{o.style.color="#a1a1aa",o.style.backgroundColor="transparent"}),o.addEventListener("click",async()=>{let a=e.getVideoElement();if(!a)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await a.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(d){console.warn("[YTMD PiP] Could not enter PiP:",d),await e.invoke("toggle_mini_player")}}),i.appendChild(o)}},n=window.setInterval(t,1000);t(),te=()=>{clearInterval(n),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(te)te(),te=null}};var xe=null,ne=null,et={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=()=>{if(document.getElementById("ytmd-download-btn"))return;let r=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(r){let a=p("button",{id:"ytmd-download-btn",title:"Download Track (MP3/FLAC with ID3 Tags & Lyrics)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),d=I("M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z",20,20);a.appendChild(d),a.style.cssText=`
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
        `,a.addEventListener("mouseenter",()=>{if(!n)a.style.color="#fafafa",a.style.backgroundColor="#27272a"}),a.addEventListener("mouseleave",()=>{if(!n)a.style.color="#a1a1aa",a.style.backgroundColor="transparent"}),a.addEventListener("click",async()=>{if(!t||!t.videoId||n)return;n=!0,a.style.color="#38bdf8",a.title="Downloading...";try{let c=e.config.download_format||"mp3",u=e.config.embed_lyrics!==!1;await e.invoke("download_track",{request:{video_id:t.videoId,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:c,embed_lyrics:u}}),a.style.color="#22c55e",a.title="Downloaded!",setTimeout(()=>{n=!1,a.style.color="#a1a1aa",a.title="Download Track"},3000)}catch(c){console.error("[YTMD Downloader] Download failed:",c),a.style.color="#ef4444",setTimeout(()=>{n=!1,a.style.color="#a1a1aa",a.title="Download Track"},3000)}}),r.appendChild(a)}},o=window.setInterval(i,1000);i(),xe=(r)=>{t=r},ne=()=>{clearInterval(o),document.getElementById("ytmd-download-btn")?.remove(),xe=null}},onTrackChange(e){xe?.(e)},onDestroy(){if(ne)ne(),ne=null}};var tt={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};var Gt=/^[A-Za-z0-9_-]{11}$/,$t=1.5,Wt=1,jt=1000,Kt=5000;function Qt(e,t,n){let i={navigateTo:null,setPlaying:null,seekTo:null};if(Gt.test(e.video_id)&&t.videoId!==e.video_id)return i.navigateTo=e.video_id,i;if(e.is_playing===t.paused)i.setPlaying=e.is_playing;let o=Math.min(Wt,Math.max(0,(n-e.timestamp_ms)/1000)),r=e.is_playing?e.current_time_secs+o:e.current_time_secs;if(Math.abs(t.currentTime-r)>$t)i.seekTo=r;return i}function Jt(){return new URLSearchParams(window.location.search).get("v")}function nt(){let e=document.getElementById("movie_player");return!!e&&(e.classList.contains("ad-showing")||e.classList.contains("ad-interrupting"))}function Xt(e){let t=document.querySelector("ytmusic-app");if(!t){window.location.href=`https://music.youtube.com/watch?v=${e}`;return}t.dispatchEvent(new CustomEvent("yt-navigate",{bubbles:!0,composed:!0,detail:{endpoint:{watchEndpoint:{videoId:e}}}}))}class it{isHost=!1;inRoom=!1;lastBroadcastMs=0;pendingNav=null;setRoomState(e,t){if(this.inRoom=e,this.isHost=t,!e)this.pendingNav=null}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback(e,t){if(!this.inRoom||this.isHost||nt())return;let n=Date.now(),i={videoId:Jt(),paused:t?t.paused:!0,currentTime:t?t.currentTime:0},o=Qt(e,i,n);if(o.navigateTo){let r=this.pendingNav;if(r&&r.videoId===o.navigateTo&&n-r.atMs<Kt)return;let a=r&&r.videoId===o.navigateTo?r.attempts+1:1;if(this.pendingNav={videoId:o.navigateTo,atMs:n,attempts:a},a>1)window.location.href=`https://music.youtube.com/watch?v=${o.navigateTo}`;else Xt(o.navigateTo);return}if(this.pendingNav=null,!t)return;if(o.setPlaying===!0)b.play();else if(o.setPlaying===!1)b.pause();if(o.seekTo!==null)b.seekTo(o.seekTo)}broadcastLocalState(e,t,n,i=!1){if(!this.inRoom||!this.isHost||!e||!e.videoId||!t||nt())return;let o=Date.now();if(!i&&o-this.lastBroadcastMs<jt)return;this.lastBroadcastMs=o,n("broadcast_sync_state",{playback:{video_id:e.videoId,title:e.title,artist:e.artist,current_time_secs:t.currentTime,is_playing:!t.paused,timestamp_ms:o}}).catch((r)=>console.error("[YTMD Room Sync] broadcast failed:",r))}}var L=null,ie=null,ot={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new it;L=t;let n=[];if(window.__TAURI__?.event)n.push(window.__TAURI__.event.listen("sync-room-updated",(i)=>{t.setRoomState(!0,i.payload.is_host)}),window.__TAURI__.event.listen("sync-room-left",()=>{t.setRoomState(!1,!1)}),window.__TAURI__.event.listen("sync-playback-remote",(i)=>{t.handleRemotePlayback(i.payload,e.getVideoElement())}));e.invoke("get_sync_room_state").then((i)=>{if(L!==t||!i||typeof i!=="object")return;let o=i;if(t.setRoomState(!0,o.is_host),!o.is_host&&o.playback_state)t.handleRemotePlayback(o.playback_state,e.getVideoElement())}).catch((i)=>console.error("[YTMD Room Sync] failed to restore room state:",i)),ie=()=>{n.forEach((i)=>i.then((o)=>o())),L=null}},onTrackChange(e,t){L?.broadcastLocalState(e,t.getVideoElement(),t.invoke,!0)},onPlaybackChange(e,t){L?.broadcastLocalState(t.track,t.getVideoElement(),t.invoke,!0)},onTick(e,t){L?.broadcastLocalState(t.track,t.getVideoElement(),t.invoke)},onDestroy(){if(ie)ie(),ie=null}};var oe=null,Zt=(e,t,n)=>e&&t&&!n,rt={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Inhibits system sleep during active playback and auto-pauses when screen is locked",defaultEnabled:!0,onInit(e){let t=null,n=null,i=null,o=e.config.inhibit_sleep!==!1,r=async()=>{if(!o||t!==null)return;try{if("wakeLock"in navigator)t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null});await e.invoke("set_inhibit_sleep",{inhibit:!0})}catch{}},a=async()=>{if(t!==null)try{await t.release(),t=null}catch{}await e.invoke("set_inhibit_sleep",{inhibit:!1})},d=(l)=>{l.addEventListener("play",r),l.addEventListener("playing",r),l.addEventListener("pause",a),l.addEventListener("ended",a),i=l},c=(l)=>{l.removeEventListener("play",r),l.removeEventListener("playing",r),l.removeEventListener("pause",a),l.removeEventListener("ended",a)},u=e.getVideoElement();if(u)d(u);n=window.setInterval(()=>{let l=e.getVideoElement();if(l&&l!==i){if(i)c(i);d(l)}},1000);let s=()=>{let l=e.getVideoElement();if(!l)return;if(Zt(document.hidden,Boolean(e.config.pause_on_lock),l.paused))e.sendPlayerCommand("pause")};document.addEventListener("visibilitychange",s),oe=()=>{if(n!==null)clearInterval(n),n=null;if(i)c(i),i=null;document.removeEventListener("visibilitychange",s),a()}},onDestroy(){if(oe)oe(),oe=null}};var at={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>Ce(e),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}};async function Ce(e){document.getElementById("ytmd-remote-modal")?.remove();let t=p("div",{id:"ytmd-remote-modal",style:`
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.85);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
    `}),n=()=>{document.removeEventListener("keydown",i),t.remove()},i=(l)=>{if(l.key==="Escape")n()};document.addEventListener("keydown",i);let o=p("div",{style:`
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
    `}),r=p("h3",{text:"Mobile Web Remote",style:"margin: 0 0 6px 0; font-size: 18px; font-weight: 700;"}),a=p("p",{text:"Scan with your phone camera on the same Wi-Fi network:",style:"font-size: 13px; color: #a1a1aa; margin: 0 0 16px 0;"}),d=p("div",{id:"ytmd-qr-container",style:`
      background: #ffffff;
      padding: 14px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      min-width: 180px;
      min-height: 180px;
    `}),c=p("span",{text:"Generating QR code...",style:"color: #52525b; font-size: 12px; font-weight: 500;"});d.appendChild(c);let u=p("div",{id:"ytmd-remote-url",style:"font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all; font-weight: 600;"}),s=p("button",{id:"ytmd-remote-close-btn",text:"Close",style:"background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 24px; font-weight: 600; cursor: pointer; font-size: 13px;"});s.addEventListener("click",n),t.addEventListener("click",(l)=>{if(l.target===t)n()}),o.appendChild(r),o.appendChild(a),o.appendChild(d),o.appendChild(u),o.appendChild(s),t.appendChild(o),document.body.appendChild(t);try{let l=await e.invoke("get_remote_info");if(!t.isConnected)return;if(l&&l.qr_svg){let g=p("img");g.src=`data:image/svg+xml;utf8,${encodeURIComponent(l.qr_svg)}`,g.width=180,g.height=180,g.style.display="block",g.alt="Mobile Remote QR Code",d.replaceChildren(g)}else d.replaceChildren(p("span",{text:"Remote server starting...",style:"color: #71717a; font-size: 12px;"}));if(l&&l.url)u.textContent=l.url}catch(l){console.error("[YTMD Remote] Error fetching remote info:",l)}}var C=null,Pe=null,x=(e,t={})=>new Promise((n)=>{let i=window.__TAURI__;if(!i?.event?.emit){n(null);return}let o=Math.random().toString(36).slice(2)+Date.now().toString(36),r=null,a=setTimeout(()=>{if(r)r();n(null)},4000);i.event.listen(`ytmd-response-${o}`,(d)=>{if(clearTimeout(a),r)r();n(d.payload)}).then((d)=>{r=d,i.event.emit("ytmd-invoke",{id:o,cmd:e,args:t})}).catch(()=>{clearTimeout(a),n(null)})});function en(){if(document.getElementById("ytmd-burger-styles"))return;let e=document.createElement("style");e.id="ytmd-burger-styles",e.textContent=`
    #ytmd-burger-btn {
      display: inline-flex !important;
      align-items: center !important;
      gap: 7px !important;
      background: color-mix(in srgb, black 55%, transparent) !important;
      backdrop-filter: blur(16px) saturate(160%) !important;
      -webkit-backdrop-filter: blur(16px) saturate(160%) !important;
      color: #f3f1ee !important;
      border: 1px solid rgba(255, 255, 255, 0.14) !important;
      padding: 6px 14px 6px 10px !important;
      border-radius: 20px !important;
      cursor: pointer !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      margin: 0 8px !important;
      flex-shrink: 0 !important;
      z-index: 1000 !important;
      transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.2s ease !important;
    }
    #ytmd-burger-btn:hover {
      border-color: rgba(255, 255, 255, 0.3) !important;
      box-shadow: 0 8px 20px -8px color-mix(in srgb, var(--ytmd-accent, #e8b06b) 55%, transparent) !important;
    }
    #ytmd-burger-btn svg {
      color: var(--ytmd-accent, #e8b06b) !important;
      transition: color 0.6s ease !important;
      flex-shrink: 0 !important;
    }
    #ytmd-burger-btn span {
      font-size: 12px !important;
      font-weight: 700 !important;
      letter-spacing: 0.3px !important;
    }
    #ytmd-burger-popover {
      position: fixed !important;
      width: 292px !important;
      background: color-mix(in srgb, #0c0a10 78%, transparent) !important;
      backdrop-filter: blur(28px) saturate(170%) !important;
      -webkit-backdrop-filter: blur(28px) saturate(170%) !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      border-radius: 16px !important;
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 24px 56px -20px rgba(0, 0, 0, 0.85) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 8px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      color: #f3f1ee !important;
      opacity: 0 !important;
      transform: translateY(-6px) scale(0.98) !important;
      pointer-events: none !important;
      transition: opacity 0.14s ease, transform 0.14s ease !important;
    }
    #ytmd-burger-popover.ytmd-open {
      opacity: 1 !important;
      transform: translateY(0) scale(1) !important;
      pointer-events: auto !important;
    }
    .ytmd-burger-item {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      width: 100% !important;
      padding: 9px 10px !important;
      background: transparent !important;
      border: none !important;
      border-radius: 9px !important;
      color: #e7e5e2 !important;
      font-size: 13px !important;
      cursor: pointer !important;
      font-family: inherit !important;
      text-align: left !important;
      transition: background-color 0.12s ease, color 0.12s ease !important;
    }
    .ytmd-burger-item:hover, .ytmd-burger-item:focus-visible {
      background: color-mix(in srgb, var(--ytmd-accent, #e8b06b) 14%, white 4%) !important;
      color: #ffffff !important;
      outline: none !important;
    }
    .ytmd-burger-item:hover .ytmd-burger-item-icon, .ytmd-burger-item:focus-visible .ytmd-burger-item-icon {
      color: var(--ytmd-accent, #e8b06b) !important;
    }
    .ytmd-burger-item-left { display: flex !important; align-items: center !important; gap: 10px !important; }
    .ytmd-burger-item-icon {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 16px !important;
      height: 16px !important;
      color: #8f8c95 !important;
      transition: color 0.12s ease !important;
    }
    .ytmd-burger-item-label { font-weight: 500 !important; }
    .ytmd-burger-item-shortcut { font-size: 11px !important; color: #75727a !important; font-family: ui-monospace, monospace !important; }
    .ytmd-burger-divider { height: 1px !important; background: rgba(255, 255, 255, 0.09) !important; margin: 6px 4px !important; }
    @media (prefers-reduced-motion: reduce) {
      #ytmd-burger-popover { transition: opacity 0.1s linear !important; transform: none !important; }
    }
  `,document.head.appendChild(e)}function st(e){if(document.getElementById("ytmd-burger-btn"))return;let t=document.querySelector("ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content"),n=document.querySelector("ytmusic-nav-bar .left-content, ytmusic-nav-bar #left-content"),i=document.querySelector("ytmusic-nav-bar"),o=document.body||document.documentElement;if(!t&&!n&&!o)return;en();let r=p("button",{id:"ytmd-burger-btn",title:"YTMD Menu (Ctrl+,)"}),a=I("M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",15,15),d=p("span",{text:"YTMD"});r.appendChild(a),r.appendChild(d);let c=document.getElementById("ytmd-burger-popover");if(!c){c=p("div",{id:"ytmd-burger-popover"});let u=(l,g,y,m)=>{let f=p("button",{className:"ytmd-burger-item"}),h=p("span",{className:"ytmd-burger-item-left"}),T=p("span",{className:"ytmd-burger-item-icon"});T.appendChild(Be(l));let D=p("span",{text:g,className:"ytmd-burger-item-label"});h.appendChild(T),h.appendChild(D);let re=p("span",{text:y,className:"ytmd-burger-item-shortcut"});return f.appendChild(h),f.appendChild(re),f.addEventListener("click",()=>{c?.classList.remove("ytmd-open"),m()}),f},s=()=>p("div",{className:"ytmd-burger-divider"});c.appendChild(u('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',"Preferences & DSP EQ","Ctrl+,",()=>{x("toggle_settings_window")})),c.appendChild(u('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',"Local Music Library","",()=>{x("toggle_local_library_window")})),c.appendChild(u('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',"Listen Together (Sync)","",()=>{x("toggle_sync_window")})),c.appendChild(u('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',"Mobile Web Remote","",()=>{if(Pe)Ce(Pe)})),c.appendChild(u('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><rect x="12" y="9" width="8" height="6" rx="1"/></svg>',"Mini Player","",()=>{x("toggle_mini_player")})),c.appendChild(s()),c.appendChild(u('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',"Download Current Track","",async()=>{if(!C||!C.videoId){alert("Please play a track first to download.");return}try{await x("download_track",{request:{video_id:C.videoId,title:C.title,artist:C.artist,album:C.album||void 0,cover_url:C.coverUrl||void 0,format:e.download_format||"mp3",embed_lyrics:e.embed_lyrics!==!1}}),alert(`Download started for: ${C.title}`)}catch(l){console.error("[YTMD Download Error]:",l)}})),document.body.appendChild(c),document.addEventListener("click",(l)=>{if(c&&c.classList.contains("ytmd-open")){if(!c.contains(l.target)&&!r.contains(l.target))c.classList.remove("ytmd-open")}})}if(r.addEventListener("click",(u)=>{if(u.stopPropagation(),c){let s=r.getBoundingClientRect();c.style.top=`${s.bottom+8}px`,c.style.right=`${Math.max(16,window.innerWidth-s.right)}px`,c.style.left="auto",c.classList.toggle("ytmd-open")}}),t)t.prepend(r);else if(n)n.appendChild(r);else if(i)i.prepend(r);else r.style.position="fixed",r.style.top="12px",r.style.right="16px",o.appendChild(r)}var tn={adblock:["adblock_enabled",!0],sponsorblock:["sponsorblock_enabled",!0],lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!0]};function lt(e){let t={};for(let[n,[i,o]]of Object.entries(tn)){let r=e[i];t[n]=typeof r==="boolean"?r:o}return t}async function ct(){console.log("[YTMD] Initializing desktop integration bridge...");let e={};st(e);let t=setInterval(()=>st(e),1000);window.addEventListener("pagehide",()=>clearInterval(t));let n=await x("get_config");if(n&&typeof n==="object")Object.assign(e,n);let i={track:null,config:e,invoke:x,sendPlayerCommand:(s)=>{c(s)},getVideoElement:()=>b.getVideo()};Pe=i;let o=new de(i);o.register(Re),o.register(Ne),o.register(He),o.register(ze),o.register(Fe),o.register(Ge),o.register($e),o.register(Ke),o.register(Xe),o.register(Ze),o.register(et),o.register(tt),o.register(ot),o.register(rt),o.register(at);try{await o.initAll(lt(e))}catch(s){console.error("[YTMD] Registry init error:",s)}let r=new ce,a=0,d=Date.now();r.onTrackChange(async(s)=>{C=s,a=s.currentTimeSecs||0,d=Date.now(),o.handleTrackChange(s);try{await x("update_track_info",{track:{title:s.title,artist:s.artist,album:s.album||null,cover_url:s.coverUrl||null,duration_secs:Math.round(s.durationSecs||0),current_time_secs:Math.round(s.currentTimeSecs||0),is_playing:s.isPlaying,video_id:s.videoId||null}})}catch(l){console.error("[YTMD] Failed to sync track info to backend:",l)}}),r.onPlaybackChange(async(s)=>{o.handlePlaybackChange(s);let l=r.getCurrentTrack();if(l){l.isPlaying=s,a=l.currentTimeSecs||0,d=Date.now();try{await x("update_track_info",{track:{title:l.title,artist:l.artist,album:l.album||null,cover_url:l.coverUrl||null,duration_secs:Math.round(l.durationSecs||0),current_time_secs:Math.round(l.currentTimeSecs||0),is_playing:s,video_id:l.videoId||null}})}catch(g){console.error("[YTMD] Failed to sync playback status:",g)}}}),r.onTick((s)=>{o.handleTick(s);let l=r.getCurrentTrack();if(!l||!l.isPlaying)return;let g=Date.now(),y=(g-d)/1000,m=a+y;if(Math.abs(s-m)>2||y>=15)a=s,d=g,l.currentTimeSecs=Math.round(s),x("update_track_info",{track:{title:l.title,artist:l.artist,album:l.album||null,cover_url:l.coverUrl||null,duration_secs:Math.round(l.durationSecs||0),current_time_secs:Math.round(s),is_playing:!0,video_id:l.videoId||null}}).catch((h)=>console.error("[YTMD] Failed to sync seek/progress to backend:",h))});function c(s){switch(s){case"play":b.play();break;case"pause":b.pause();break;case"play_pause":b.playPause();break;case"next":b.next();break;case"previous":b.previous();break;case"like":b.toggleLike();break;case"dislike":b.toggleDislike();break;case"mute":b.toggleMute();break}}let u=(s,l)=>{let g=window.__TAURI__;if(g?.event?.listen)g.event.listen(s,(y)=>l(y.payload))};u("player-command",(s)=>c(s)),u("tray-command",(s)=>c(s)),u("mpris-command",(s)=>c(s)),u("global-shortcut-event",(s)=>c(s)),u("player-seek",(s)=>b.seekTo(s)),u("mpris-command-seek",(s)=>b.seekTo(s)),u("player-volume",(s)=>b.setVolume(s)),u("config-updated",(s)=>{if(!s||typeof s!=="object")return;Object.assign(e,s);let l=lt(e);for(let[g,y]of Object.entries(l))if(y)o.enable(g).catch((m)=>console.error(`[YTMD] Failed to enable plugin ${g}:`,m));else o.disable(g).catch((m)=>console.error(`[YTMD] Failed to disable plugin ${g}:`,m))}),window.addEventListener("keydown",(s)=>{if(s.ctrlKey&&s.key===","||s.key==="F2")s.preventDefault(),x("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var nn=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(nn)if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>ct());else ct();
