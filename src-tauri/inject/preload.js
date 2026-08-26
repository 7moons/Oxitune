function _e(e){let t=e.trim().split(":").map((n)=>parseInt(n,10));if(t.some((n)=>isNaN(n)))return 0;if(t.length===2)return t[0]*60+t[1];else if(t.length===3)return t[0]*3600+t[1]*60+t[2];return 0}class le{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;let e=this.attachedVideo.currentTime;this.onTickCallbacks.forEach((t)=>t(e))};constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let r=navigator.mediaSession,o=r.metadata;try{Object.defineProperty(r,"metadata",{get:()=>o,set:(s)=>{o=s,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(s){}}this.syncVideoListeners();let e=!1,n=new MutationObserver(()=>{if(e)return;e=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),e=!1})}),i=document.querySelector("ytmusic-player-bar")||document.body;if(i)n.observe(i,{childList:!0,subtree:!0,characterData:!0});this.mutationObserver=n,this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.checkTrackUpdate();let r=document.querySelector("video");if(r&&!r.paused)this.onTickCallbacks.forEach((o)=>o(r.currentTime))},250)}attachVideoListeners(e){e.addEventListener("play",this.handleVideoPlay),e.addEventListener("playing",this.handleVideoPlay),e.addEventListener("pause",this.handleVideoPause),e.addEventListener("ended",this.handleVideoPause),e.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=e}detachVideoListeners(e){e.removeEventListener("play",this.handleVideoPlay),e.removeEventListener("playing",this.handleVideoPlay),e.removeEventListener("pause",this.handleVideoPause),e.removeEventListener("ended",this.handleVideoPause),e.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let e=document.querySelector("video");if(e&&e!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners(e)}}extractTrackInfo(){let e=document.querySelector("video"),t=document.getElementById("movie_player");if(Boolean(t&&(typeof t.getAdState==="function"&&t.getAdState()===1||typeof t.isAdPlaying==="function"&&t.isAdPlaying()||t.classList?.contains("ad-showing")||t.classList?.contains("ad-interrupting"))))return null;let i=navigator.mediaSession?.metadata,r=i?.title||"",o=i?.artist||"",s=i?.album||"",d="";if(i?.artwork&&i.artwork.length>0){let m=i.artwork[i.artwork.length-1];if(m&&m.src)d=m.src}if(!r){let m=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(m)r=m.textContent?.trim()||""}if(!o){let m=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(m){let T=(m.textContent?.trim()||"").split("•").map((b)=>b.trim());if(o=T[0]||"",T.length>1)s=T[1]}}if(!d){let m=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(m&&m.src)d=m.src}if(d.startsWith("//"))d=`https:${d}`;if(d.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(d))d=d.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let a=new URLSearchParams(window.location.search).get("v")||void 0,l=0,u=0;if(t&&typeof t.getDuration==="function"){let m=t.getDuration();if(typeof m==="number"&&Number.isFinite(m)&&m>0)l=Math.floor(m)}if(t&&typeof t.getCurrentTime==="function"){let m=t.getCurrentTime();if(typeof m==="number"&&Number.isFinite(m)&&m>=0)u=Math.floor(m)}if(!l&&e&&Number.isFinite(e.duration)&&e.duration>0)l=Math.floor(e.duration);if(!u&&e&&Number.isFinite(e.currentTime)&&e.currentTime>=0)u=Math.floor(e.currentTime);let g=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(g&&g.textContent){let m=g.textContent.split("/").map((h)=>h.trim());if(m.length===2){if(!u)u=_e(m[0]);if(!l)l=_e(m[1])}}if(!l){let h=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(h){let T=parseInt(h,10);if(!isNaN(T)&&T>0)l=T}}let f=e?!e.paused&&!e.ended:!1;if(!r)return null;return{title:r,artist:o||"Unknown Artist",album:s||void 0,coverUrl:d||void 0,durationSecs:l,currentTimeSecs:u,isPlaying:f,videoId:a}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=!this.currentTrack||this.currentTrack.title!==e.title||this.currentTrack.artist!==e.artist||this.currentTrack.videoId!==e.videoId,n=this.currentTrack!==null&&(!this.currentTrack.durationSecs&&e.durationSecs>0||!this.currentTrack.coverUrl&&!!e.coverUrl||!this.currentTrack.album&&!!e.album||!this.currentTrack.videoId&&!!e.videoId),i=this.currentTrack!==null&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t||n){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((r)=>r(e))}if(i)this.onPlaybackChangeCallbacks.forEach((r)=>r(e.isPlaying))}handlePlaybackChange(e){if(e){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((t)=>t(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((t)=>t(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}class y{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)t.volume=Math.max(0,Math.min(1,e))}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}class ce{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(r){console.error(`[YTMD] Failed to init plugin ${t}:`,r)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,i)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,i)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTick:`,i)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var q=null,S={adWasShowing:!1,preAdMuted:!1},ue=new WeakSet,N=null,De=null,de=0,V=!0,rt=1000,at=(e,t,n)=>e-t>=n,st=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",lt="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)",ct=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,dt=`
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
`,ut=ct+dt,pt=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],mt=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],gt=(e)=>pt.some((t)=>e.includes(t)),ft=(e,t)=>{let n=t.split("."),i=e;for(let o=0;o<n.length-1;o++){if(i===null||typeof i!=="object")return!1;i=i[n[o]]}let r=n[n.length-1];if(i!==null&&typeof i==="object"&&Object.prototype.hasOwnProperty.call(i,r))return delete i[r],!0;return!1},me=(e)=>{if(e===null||typeof e!=="object")return!1;let t=!1;for(let n of mt)if(ft(e,n))t=!0;return t},yt=(e)=>{if(typeof e==="string")return e;if(e instanceof URL)return e.href;return e.url},Se=!1,ht=()=>{if(Se)return;Se=!0;let e=window.fetch,t=e.bind(window),n=async(...i)=>{let r=await t(...i);if(!V||!gt(yt(i[0])))return r;let o;try{o=await r.clone().json()}catch{return r}if(!me(o))return r;let s=new Headers(r.headers);return s.delete("content-length"),s.delete("content-encoding"),new Response(JSON.stringify(o),{status:r.status,statusText:r.statusText,headers:s})};window.fetch=Object.assign(n,e)},Me=!1,bt=()=>{if(Me)return;Me=!0;let e=JSON.parse;JSON.parse=(...t)=>{let n=e(...t);if(V)me(n);return n}},Ie=!1,vt=()=>{if(Ie)return;Ie=!0;let e;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>e,set:(t)=>{if(V)me(t);e=t}})};if(typeof window<"u")ht(),bt(),vt();var kt=(e)=>{let t=new Set(e);return t.has("ad-showing")||t.has("ad-interrupting")},Tt=(e,t,n)=>{if(e&&!t.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:n},setMutedTo:!0};if(!e&&t.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:t.preAdMuted},setMutedTo:t.preAdMuted};return{nextState:t,setMutedTo:null}},ge=()=>document.getElementById("movie_player"),wt=()=>{let e=ge();if(!e)return!1;return kt(e.classList)},pe=(e)=>{let t=e.getVideoElement();if(!t)return;let{nextState:n,setMutedTo:i}=Tt(wt(),S,t.muted);if(S=n,i!==null)t.muted=i},Le=(e)=>{if(ue.has(e))return;ue.add(e),e.click()},U=()=>{document.querySelectorAll(st).forEach(Le),document.querySelectorAll(lt).forEach((e)=>{e.style.display="none";let t=e.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(t)Le(t)})},Ae=(e)=>{let t=ge();if(De=t,!t)return;N?.disconnect(),N=new MutationObserver(()=>{pe(e),U()}),N.observe(t,{attributes:!0,attributeFilter:["class"]})},Re={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit(e){V=!0,S={adWasShowing:!1,preAdMuted:!1},ue=new WeakSet,de=0;let t=document.createElement("style");t.id="ytmd-adblock-styles",t.textContent=ut,document.head.appendChild(t);let n=!1,i=new MutationObserver(()=>{if(n)return;n=!0,requestAnimationFrame(()=>{n=!1,U()})});i.observe(document.body,{childList:!0,subtree:!0}),Ae(e),U(),pe(e),q=()=>{V=!1,N?.disconnect(),N=null,i.disconnect(),document.getElementById("ytmd-adblock-styles")?.remove();let r=e.getVideoElement();if(r&&S.adWasShowing)r.muted=S.preAdMuted;S={adWasShowing:!1,preAdMuted:!1}}},onTick(e,t){if(ge()!==De)Ae(t);pe(t);let n=Date.now();if(at(n,de,rt))de=n,U()},onDestroy(){if(q)q(),q=null}};var M=[],O="",fe=new Set,xt=(e,t)=>e===t,Ne={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){M=[],O="",fe=new Set},onTrackChange(e){if(!e.videoId||e.videoId===O)return;let t=e.videoId;O=t,M=[],fe=new Set;let n=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),i=`https://sponsor.ajay.app/api/skipSegments?videoID=${t}&categories=${encodeURIComponent(n)}`;fetch(i,{signal:AbortSignal.timeout(3000)}).then(async(r)=>{if(!r.ok)return;let o=await r.json();if(!xt(t,O))return;M=o,console.log(`[YTMD SponsorBlock] Loaded ${o.length} segments for ${t}`)}).catch(()=>{})},onTick(e,t){if(!M||M.length===0)return;let n=fe;for(let i of M){let[r,o]=i.segment;if(e>=r&&e<o-0.5&&!n.has(i.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${i.category}): ${r}s -> ${o}s`);let s=t.getVideoElement();if(s)s.currentTime=o,n.add(i.UUID);break}}}};function I(e,t=18,n=18,i="0 0 24 24"){let r=document.createElementNS("http://www.w3.org/2000/svg","svg");r.setAttribute("width",String(t)),r.setAttribute("height",String(n)),r.setAttribute("viewBox",i),r.setAttribute("fill","currentColor");let o=document.createElementNS("http://www.w3.org/2000/svg","path");return o.setAttribute("d",e),r.appendChild(o),r}var Ve="http://www.w3.org/2000/svg",Ct="circle|path|rect|line|polyline|polygon|g|ellipse";function Ye(e){let t=document.createElementNS(Ve,"svg"),n=(o,s)=>{for(let d of s.matchAll(/([\w:-]+)="([^"]*)"/g))o.setAttribute(d[1],d[2])},i=e.match(/^<svg([^>]*)>/);if(i)n(t,i[1]);let r=new RegExp(`<(${Ct})([^>]*)\\/?>`,"g");for(let o of e.matchAll(r)){let s=document.createElementNS(Ve,o[1]);n(s,o[2]),t.appendChild(s)}return t}function p(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var w=[],B=-1,z=null,v="",F=null,Y="",Be=(e,t)=>e===t,ze={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(e){w=[],B=-1,z=null,v="",Y="";let t=document.createElement("style");t.id="ytmd-native-lyrics-styles",t.textContent=`
      /* Scoped to tabs unlockLyricsTabHeader() has explicitly matched by
         label — NOT blind tab position (nth-of-type), since a layout where
         "Tekst"/"Lyrics" isn't the 2nd tab would otherwise force
         pointer-events:auto on some unrelated tab. */
      .ytmd-lyrics-tab-unlocked[disabled],
      .ytmd-lyrics-tab-unlocked[aria-disabled="true"] {
        pointer-events: auto !important;
        cursor: pointer !important;
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
    `,document.head.appendChild(t);let n=()=>{G(),He(e)},i=()=>{setTimeout(()=>{G(),he()},50),setTimeout(()=>{he()},250)};document.addEventListener("click",i,!0);let r=window.setInterval(n,600);n(),F=()=>{clearInterval(r),document.removeEventListener("click",i,!0),t.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((s)=>s.remove())}},async onTrackChange(e,t){let n=`${e.title} - ${e.artist}`;if(v===n&&w.length>0||Y===n)return;v=n,Y=n,w=[],B=-1,z=null,G();let i=document.getElementById("ytmd-native-lyrics-wrapper");if(i)i.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:"Loading synchronized lyrics..."}));try{let r=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(!Be(n,v))return;if(z=r,r?.syncedLyrics)w=_t(r.syncedLyrics);G(),He(t),Ue(t)}catch{if(!Be(n,v))return;let r=document.getElementById("ytmd-native-lyrics-wrapper");if(r)r.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:"No lyrics available for this track."}))}finally{if(Y===n)Y=""}},onTick(e){if(!w||w.length===0)return;let t=H(v),n=e+t,i=-1;for(let r=0;r<w.length;r++)if(n>=w[r].timeSecs)i=r;else break;if(i!==B&&i>=0){B=i;let r=document.getElementById("ytmd-native-lyrics-wrapper");if(r){let o=r.querySelectorAll(".ytmd-native-lyric-line");o.forEach((d,c)=>{if(c===i)d.classList.add("active");else d.classList.remove("active")});let s=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(s&&Pt(s)){let d=o[i];if(d)d.scrollIntoView({behavior:"smooth",block:"nearest"})}}}},onDestroy(){if(F)F(),F=null}},qe=new Map;function H(e){return qe.get(e)||0}function ye(e,t){qe.set(e,t)}function Pt(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function G(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras")){t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.classList.add("ytmd-lyrics-tab-unlocked"),t.style.pointerEvents="auto",t.style.cursor="pointer";let i={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!t.endpoint)t.endpoint=i;if(t.data&&!t.data.endpoint)t.data.endpoint=i}})}function Et(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let n of Array.from(e)){let i=n.textContent?.toLowerCase()||"";if(i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras")){if(n.classList.contains("iron-selected")||n.getAttribute("aria-selected")==="true"||n.classList.contains("selected"))return!0}}let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t){if((t.classList.contains("iron-selected")||!t.hasAttribute("hidden"))&&t.getAttribute("aria-hidden")!=="true")return!0}return!1}function he(){let e=document.getElementById("ytmd-native-lyrics-wrapper");if(!e)return;let t=Et();e.style.setProperty("display",t?"flex":"none","important")}function He(e){let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n||!t.contains(n)){if(!n)n=p("div",{id:"ytmd-native-lyrics-wrapper"});t.appendChild(n),Ue(e)}he()}function Ue(e){let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(w&&w.length>0){let n=H(v),i=p("div",{className:"ytmd-native-lyrics-sync-bar"}),r=p("span",{className:"ytmd-sync-label",text:"Sync:"}),o=p("button",{className:"ytmd-sync-btn",text:"-0.5s",title:"Shift lyrics 0.5s earlier"}),s=p("span",{className:"ytmd-sync-val",text:`${n>=0?"+":""}${n.toFixed(1)}s`}),d=p("button",{className:"ytmd-sync-btn",text:"+0.5s",title:"Shift lyrics 0.5s later"}),c=p("button",{className:"ytmd-sync-btn",text:"Reset",title:"Reset offset to 0.0s"});o.addEventListener("click",()=>{let a=Math.round((H(v)-0.5)*10)/10;ye(v,a),s.textContent=`${a>=0?"+":""}${a.toFixed(1)}s`}),d.addEventListener("click",()=>{let a=Math.round((H(v)+0.5)*10)/10;ye(v,a),s.textContent=`${a>=0?"+":""}${a.toFixed(1)}s`}),c.addEventListener("click",()=>{ye(v,0),s.textContent="+0.0s"}),i.appendChild(r),i.appendChild(o),i.appendChild(s),i.appendChild(d),i.appendChild(c),t.replaceChildren(...w.map((a,l)=>{let u=p("div",{className:`ytmd-native-lyric-line${l===B?" active":""}`,text:a.text});return u.addEventListener("click",()=>{let g=e.getVideoElement();if(g){let f=H(v);g.currentTime=Math.max(0,a.timeSecs-f)}}),u}),i,p("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else if(z?.plainLyrics){let n=z.plainLyrics.split(`
`);t.replaceChildren(...n.map((i)=>p("div",{className:"ytmd-native-lyric-line active",text:i,style:"cursor: default;"})),p("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else t.replaceChildren(p("div",{className:"ytmd-native-lyrics-status",text:"Synced lyrics unavailable for this track."}))}function _t(e){let t=e.split(`
`),n=[],i=0,r=/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g,o=/\[offset:\s*([+-]?\d+)\s*\]/i;for(let s of t){let d=s.trim();if(!d)continue;let c=o.exec(d);if(c){let u=parseInt(c[1],10);if(!isNaN(u))i=u/1000;continue}let a=[],l;r.lastIndex=0;while((l=r.exec(d))!==null){let u=parseInt(l[1],10),g=parseInt(l[2],10),f=0;if(l[3])f=parseInt(l[3].padEnd(3,"0").slice(0,3),10);a.push(u*60+g+f/1000)}if(a.length>0){let u=d.replace(r,"").trim();if(u)for(let g of a)n.push({timeSecs:Math.max(0,g-i),text:u})}}return n.sort((s,d)=>s.timeSecs-d.timeSecs)}var j=null,Oe={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit(e){let t=(n)=>{let i=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!i)return;let r=i.getBoundingClientRect();if(n.clientX>=r.left&&n.clientX<=r.right&&n.clientY>=r.top&&n.clientY<=r.bottom){n.preventDefault();let o=e.getVideoElement();if(o){let s=e.config.wheel_volume_step||0.05,d=n.deltaY<0?s:-s,c=Math.max(0,Math.min(1,o.volume+d));o.volume=c}}};window.addEventListener("wheel",t,{passive:!1}),j=()=>{window.removeEventListener("wheel",t)}},onDestroy(){if(j)j(),j=null}};var $e={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var K=null,Fe={id:"visualizer",name:"Modern Clean Theme & Custom CSS",description:"Applies sleek dark aesthetics, subtle scrollbars, and user-defined custom CSS",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-theme-styles");if(!t)t=document.createElement("style"),t.id="ytmd-theme-styles";let n=`
      /* Clean subtle scrollbar colors only — deliberately NOT overriding
         ::-webkit-scrollbar width/height. YouTube Music's own layout code
         reserves gutter space sized for the native (wider) scrollbar; shrinking
         the rendered scrollbar to a custom width leaves a stale gap the size of
         the difference wherever that reserved space gets exposed (e.g. when
         focusing/expanding the now-playing view triggers a layout recalc) —
         seen as empty space where the scrollbar used to be. */
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
    `;if(t.textContent=n,!t.isConnected)document.head.appendChild(t);K=()=>{t?.remove()}},onDestroy(){if(K)K(),K=null}};var be=[32,64,125,250,500,1000,2000,4000,8000,16000],ve={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function W(e){return Math.max(-12,Math.min(12,e))}class k{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;static getInstance(){if(!k.instance)k.instance=new k;return k.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=be.map((i,r)=>{if(!this.audioCtx)throw Error("AudioContext missing");let o=this.audioCtx.createBiquadFilter();if(r===0)o.type="lowshelf";else if(r===be.length-1)o.type="highshelf";else o.type="peaking",o.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return o.frequency.setValueAtTime(i,this.audioCtx.currentTime),o.gain.setValueAtTime(0,this.audioCtx.currentTime),o}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.filters.length||!this.audioCtx)return;let n=W(t);this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){if(!this.audioCtx)return;e.forEach((t,n)=>{if(n<this.filters.length)this.filters[n].gain.setValueAtTime(W(t),this.audioCtx.currentTime)})}setPreamp(e){if(!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,W(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=ve[e]||ve.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return-100;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);let e=this.powerBuffer;this.analyserNode.getFloatTimeDomainData(e);let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){let t=Math.max(0.5,Math.min(2,e));if(this.hookedVideo)this.hookedVideo.playbackRate=t}setPreservesPitch(e){if(this.hookedVideo){this.hookedVideo.preservesPitch=e;let t=this.hookedVideo;t.mozPreservesPitch=e,t.webkitPreservesPitch=e}}}class ke{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)k.getInstance().fadeIn(this.crossfadeSeconds);else k.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),k.getInstance().fadeOut(n),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[YTMD Crossfade] Advancing to next track..."),y.next()},Math.max(100,(n-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class Te{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=k.getInstance().getAudioPowerDb();if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,y.next()}else this.consecutiveSilentTicks=0}}var E=null,L=null,Q=null,Ge={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=e.getVideoElement(),n=k.getInstance(),i=new ke,r=new Te;E=i,L=r;let o=e.config,s=Boolean(o.equalizer_enabled||o.loudness_normalization||o.equalizer_gains&&Array.isArray(o.equalizer_gains)&&o.equalizer_gains.some((a)=>a!==0)),d=null;if(s)if(t)n.init(t);else d=window.setInterval(()=>{let a=e.getVideoElement();if(a){if(d!==null)clearInterval(d);d=null,n.init(a)}},500);if(o.equalizer_gains&&Array.isArray(o.equalizer_gains))n.setAllGains(o.equalizer_gains);else if(o.equalizer_preset&&typeof o.equalizer_preset==="string")n.applyPreset(o.equalizer_preset);if(o.preamp_gain!==void 0)n.setPreamp(o.preamp_gain);if(o.loudness_normalization!==void 0)n.setLoudnessNormalization(Boolean(o.loudness_normalization));if(o.crossfade_seconds!==void 0)i.setCrossfadeSeconds(o.crossfade_seconds);if(o.skip_silence_enabled!==void 0)r.setEnabled(Boolean(o.skip_silence_enabled));if(o.playback_speed!==void 0)n.setPlaybackRate(o.playback_speed);if(o.preserve_pitch!==void 0)n.setPreservesPitch(Boolean(o.preserve_pitch));let c=[];if(window.__TAURI__?.event){let{listen:a}=window.__TAURI__.event;c.push(a("set-eq-band",(l)=>{n.setBandGain(l.payload.bandIndex,l.payload.gain)}),a("set-eq-all",(l)=>{n.setAllGains(l.payload.gains)}),a("set-eq-preset",(l)=>{n.applyPreset(l.payload)}),a("set-preamp",(l)=>{n.setPreamp(l.payload)}),a("set-loudness-normalization",(l)=>{n.setLoudnessNormalization(l.payload)}),a("set-crossfade-seconds",(l)=>{i.setCrossfadeSeconds(l.payload)}),a("set-skip-silence",(l)=>{r.setEnabled(l.payload)}),a("set-playback-rate",(l)=>{n.setPlaybackRate(l.payload)}),a("set-preserves-pitch",(l)=>{n.setPreservesPitch(l.payload)}))}Q=()=>{if(d!==null)clearInterval(d),d=null;c.forEach((a)=>a.then((l)=>l())),E?.destroy(),E=null,L=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(E)E.onTrackChange(e);if(L)L.onTrackChange()},onTick(e,t){if(E)E.onTick(e,t.track);if(L)L.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(Q)Q(),Q=null}};var we=(e,t,n)=>{let i=(o)=>Math.max(0,Math.min(255,Math.round(o))),r=(o)=>i(o).toString(16).padStart(2,"0");return`#${r(e)}${r(t)}${r(n)}`};async function je(e){return new Promise((t)=>{let n={primary:"#18181b",secondary:"#09090b",accent:"#dc2626"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let r=document.createElement("canvas");r.width=16,r.height=16;let o=r.getContext("2d");if(!o){t(n);return}o.drawImage(i,0,0,16,16);let s=o.getImageData(0,0,16,16).data,d=0,c=0,a=0,l=0,u=0,g=0,f=0,m=0;for(let C=0;C<s.length;C+=4){let re=s[C],ae=s[C+1],se=s[C+2];if(s[C+3]<128)continue;let Ee=(re+ae+se)/3;if(Ee<20||Ee>240)continue;if(C<s.length/2)d+=re,c+=ae,a+=se,l++;else u+=re,g+=ae,f+=se,m++}if(l===0&&m===0){t(n);return}let h=l>0?Math.round(d/l):220,T=l>0?Math.round(c/l):38,b=l>0?Math.round(a/l):38,R=m>0?Math.round(u/m):24,_=m>0?Math.round(g/m):24,oe=m>0?Math.round(f/m):27;t({primary:we(h,T,b),secondary:we(R,_,oe),accent:we(h+30,T+30,b+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var J=null,X=null,Ke={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Smoothly diffuses dynamic, reactive ambient colors from the active album cover behind the player",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=document.createElement("div"),t.id="ytmd-ambient-backdrop",document.body.prepend(t);let n=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,i=e.config.ambient_lighting_enabled!==!1,r=document.createElement("style");r.id="ytmd-ambient-styles",r.textContent=`
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
    `,document.head.appendChild(r);let o=p("div",{id:"ytmd-orb-1",className:"ytmd-ambient-orb"}),s=p("div",{id:"ytmd-orb-2",className:"ytmd-ambient-orb"});t.appendChild(o),t.appendChild(s),J=(c)=>{if(t)t.style.opacity=String(c)};let d=[];if(window.__TAURI__?.event)d.push(window.__TAURI__.event.listen("set-ambient-intensity",(c)=>{J?.(c.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(c)=>{J?.(c.payload?0.6:0)}));if(X=()=>{d.forEach((c)=>c.then((a)=>a())),J=null,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){if(!e.coverUrl)return;try{let t=await je(e.coverUrl),n=document.getElementById("ytmd-ambient-backdrop");if(n)n.style.background=`
          radial-gradient(circle at 80% 20%, ${t.primary}66 0%, transparent 60%),
          radial-gradient(circle at 20% 80%, ${t.secondary}66 0%, transparent 60%)
        `}catch{}},onDestroy(){if(X)X(),X=null}};function St(e){return`
      html {
        --ytmusic-background: ${e.background} !important;
        --yt-sys-color-baseline--base-background: ${e.background} !important;

        --ytmusic-brand-background-solid: ${e.surface} !important;
        --yt-sys-color-baseline--raised-background: ${e.surface} !important;
        --yt-sys-color-baseline--menu-background: ${e.surface} !important;
        --paper-menu-background-color: ${e.surface} !important;
        --paper-dialog-background-color: ${e.surface} !important;
        --yt-live-chat-dialog-background-color: ${e.surface} !important;
        --ytmusic-badge-chip-background: ${e.surface} !important;
        --ytmusic-explore-chip-background: ${e.surface} !important;

        --ytmusic-call-to-action: ${e.accent} !important;
        --yt-sys-color-baseline--call-to-action: ${e.accent} !important;
        --yt-sys-color-baseline--call-to-action-inverse: ${e.accent} !important;
        --yt-sys-color-baseline--overlay-call-to-action: ${e.accent} !important;
        --yt-sys-color-baseline--call-to-action-hover: ${e.accentHover} !important;
        --yt-sys-color-baseline--overlay-call-to-action-hover: ${e.accentHover} !important;
        --paper-input-container-focus-color: ${e.accent} !important;
      }

      /* Only the true root canvas is forced opaque here. ytmusic-app-layout,
         #browse-page and ytmusic-browse-response are transparent by default
         in YouTube Music's own CSS (they already show html/body through), and
         forcing them opaque here would fight the ambient lighting plugin's
         own transparency rule for those same selectors and block the glow. */
      html, body {
        background-color: ${e.background} !important;
      }
      ytmusic-nav-bar, ytmusic-player-bar, ytmusic-player-page {
        background: ${e.surface} !important;
        border-color: ${e.border} !important;
      }
      ytmusic-guide-renderer {
        background-color: ${e.background} !important;
        border-right: 1px solid ${e.border} !important;
      }
      tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
        background-color: ${e.accent} !important;
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

    `}var Mt=[{id:"default",name:"Modern Dark",background:"#0f0f0f",surface:"#121215",border:"#27272a",accent:"#3ea6ff",accentHover:"#65b8ff"},{id:"oled",name:"Pure OLED Black",background:"#000000",surface:"#0a0a0a",border:"#1a1a1a",accent:"#3ea6ff",accentHover:"#65b8ff"},{id:"nord",name:"Nord Arctic",background:"#2e3440",surface:"#3b4252",border:"#434c5e",accent:"#88c0d0",accentHover:"#a3d0dd"},{id:"catppuccin",name:"Catppuccin Mocha",background:"#1e1e2e",surface:"#181825",border:"#313244",accent:"#cba6f7",accentHover:"#dbc2fa"},{id:"gruvbox",name:"Gruvbox Dark",background:"#282828",surface:"#1d2021",border:"#3c3836",accent:"#fe8019",accentHover:"#fe9a4d"},{id:"tokyo_night",name:"Tokyo Night",background:"#1a1b26",surface:"#16161e",border:"#292e42",accent:"#7aa2f7",accentHover:"#9ab8f9"},{id:"dracula",name:"Dracula",background:"#282a36",surface:"#21222c",border:"#44475a",accent:"#bd93f9",accentHover:"#cfb0fb"},{id:"rose_pine",name:"Rosé Pine",background:"#191724",surface:"#1f1d2e",border:"#26233a",accent:"#eb6f92",accentHover:"#f08daa"}],A=Object.fromEntries(Mt.map((e)=>[e.id,{id:e.id,name:e.name,css:St(e)}]));var Z=null,We={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Applies curated aesthetic themes and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(c)=>{let a=document.getElementById(c);if(!a){a=document.createElement("style"),a.id=c;let l=t();if(l)l.appendChild(a)}return a},i=(c)=>{let a=A[c]||A.default,l=n("ytmd-active-theme");if(l)l.textContent=a.css},r=(c)=>{let a=n("ytmd-custom-css");if(a)a.textContent=c},o=e.config.theme_preset||e.config.theme||"default";i(o);let s=e.config.custom_css||"";r(s);let d=[];if(window.__TAURI__?.event)d.push(window.__TAURI__.event.listen("set-theme-preset",(c)=>{i(c.payload)}),window.__TAURI__.event.listen("set-custom-css",(c)=>{r(c.payload)}));Z=()=>{d.forEach((c)=>c.then((a)=>a()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(Z)Z(),Z=null}};var ee=null,Qe={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let r=p("button",{id:"ytmd-pip-btn",title:"Picture-in-Picture (Float Video)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),o=I("M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",20,20);r.appendChild(o),r.style.cssText=`
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
        `,r.addEventListener("mouseenter",()=>{r.style.color="#fafafa",r.style.backgroundColor="#27272a"}),r.addEventListener("mouseleave",()=>{r.style.color="#a1a1aa",r.style.backgroundColor="transparent"}),r.addEventListener("click",async()=>{let s=e.getVideoElement();if(!s)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await s.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(d){console.warn("[YTMD PiP] Could not enter PiP:",d),await e.invoke("toggle_mini_player")}}),i.appendChild(r)}},n=window.setInterval(t,1000);t(),ee=()=>{clearInterval(n),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(ee)ee(),ee=null}};var xe=null,te=null,Je={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=()=>{if(document.getElementById("ytmd-download-btn"))return;let o=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(o){let s=p("button",{id:"ytmd-download-btn",title:"Download Track (MP3/FLAC with ID3 Tags & Lyrics)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),d=I("M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z",20,20);s.appendChild(d),s.style.cssText=`
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
        `,s.addEventListener("mouseenter",()=>{if(!n)s.style.color="#fafafa",s.style.backgroundColor="#27272a"}),s.addEventListener("mouseleave",()=>{if(!n)s.style.color="#a1a1aa",s.style.backgroundColor="transparent"}),s.addEventListener("click",async()=>{if(!t||!t.videoId||n)return;n=!0,s.style.color="#38bdf8",s.title="Downloading...";try{let c=e.config.download_format||"mp3",a=e.config.embed_lyrics!==!1;await e.invoke("download_track",{request:{video_id:t.videoId,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:c,embed_lyrics:a}}),s.style.color="#22c55e",s.title="Downloaded!",setTimeout(()=>{n=!1,s.style.color="#a1a1aa",s.title="Download Track"},3000)}catch(c){console.error("[YTMD Downloader] Download failed:",c),s.style.color="#ef4444",setTimeout(()=>{n=!1,s.style.color="#a1a1aa",s.title="Download Track"},3000)}}),o.appendChild(s)}},r=window.setInterval(i,1000);i(),xe=(o)=>{t=o},te=()=>{clearInterval(r),document.getElementById("ytmd-download-btn")?.remove(),xe=null}},onTrackChange(e){xe?.(e)},onDestroy(){if(te)te(),te=null}};var Xe={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};class Ze{isHost=!1;inRoom=!1;lastBroadcastTimestamp=0;setRoomState(e,t){this.inRoom=e,this.isHost=t}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback(e,t){if(!this.inRoom||this.isHost||!t)return;let i=(Date.now()-e.timestamp_ms)/1000,r=e.is_playing?e.current_time_secs+Math.max(0,i):e.current_time_secs,o=new URLSearchParams(window.location.search).get("v");if(e.video_id&&/^[A-Za-z0-9_-]{11}$/.test(e.video_id)&&o!==e.video_id){console.log(`[YTMD Room Sync] Switching to track: ${e.video_id}`),window.location.href=`https://music.youtube.com/watch?v=${e.video_id}`;return}if(e.is_playing&&t.paused)y.play();else if(!e.is_playing&&!t.paused)y.pause();let s=Math.abs(t.currentTime-r);if(s>1.5)console.log(`[YTMD Room Sync] Drift detected (${s.toFixed(2)}s). Resyncing to ${r.toFixed(1)}s...`),y.seekTo(r)}broadcastLocalState(e,t,n){if(!this.inRoom||!this.isHost||!e||!e.videoId||!t)return;let i=Date.now();if(i-this.lastBroadcastTimestamp<1000)return;this.lastBroadcastTimestamp=i,n("broadcast_sync_state",{playback:{video_id:e.videoId,title:e.title,artist:e.artist,current_time_secs:t.currentTime,is_playing:!t.paused,timestamp_ms:Date.now()}}).catch(()=>{})}}var D=null,ne=null,et={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new Ze;D=t;let n=[];if(window.__TAURI__?.event)n.push(window.__TAURI__.event.listen("sync-room-updated",(i)=>{t.setRoomState(!0,i.payload.is_host)}),window.__TAURI__.event.listen("sync-room-left",()=>{t.setRoomState(!1,!1)}),window.__TAURI__.event.listen("sync-playback-remote",(i)=>{t.handleRemotePlayback(i.payload,e.getVideoElement())}));ne=()=>{n.forEach((i)=>i.then((r)=>r())),D=null}},onTick(e,t){if(D&&D.isInRoom()&&D.isRoomHost())D.broadcastLocalState(t.track,t.getVideoElement(),t.invoke)},onDestroy(){if(ne)ne(),ne=null}};var ie=null,It=(e,t,n)=>e&&t&&!n,tt={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Inhibits system sleep during active playback and auto-pauses when screen is locked",defaultEnabled:!0,onInit(e){let t=null,n=null,i=null,r=e.config.inhibit_sleep!==!1,o=async()=>{if(!r||t!==null)return;try{if("wakeLock"in navigator)t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null});await e.invoke("set_inhibit_sleep",{inhibit:!0})}catch{}},s=async()=>{if(t!==null)try{await t.release(),t=null}catch{}await e.invoke("set_inhibit_sleep",{inhibit:!1})},d=(u)=>{u.addEventListener("play",o),u.addEventListener("playing",o),u.addEventListener("pause",s),u.addEventListener("ended",s),i=u},c=(u)=>{u.removeEventListener("play",o),u.removeEventListener("playing",o),u.removeEventListener("pause",s),u.removeEventListener("ended",s)},a=e.getVideoElement();if(a)d(a);n=window.setInterval(()=>{let u=e.getVideoElement();if(u&&u!==i){if(i)c(i);d(u)}},1000);let l=()=>{let u=e.getVideoElement();if(!u)return;if(It(document.hidden,Boolean(e.config.pause_on_lock),u.paused))e.sendPlayerCommand("pause")};document.addEventListener("visibilitychange",l),ie=()=>{if(n!==null)clearInterval(n),n=null;if(i)c(i),i=null;document.removeEventListener("visibilitychange",l),s()}},onDestroy(){if(ie)ie(),ie=null}};var nt={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>Ce(e),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}};async function Ce(e){document.getElementById("ytmd-remote-modal")?.remove();let t=p("div",{id:"ytmd-remote-modal",style:`
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
    `}),n=()=>{document.removeEventListener("keydown",i),t.remove()},i=(u)=>{if(u.key==="Escape")n()};document.addEventListener("keydown",i);let r=p("div",{style:`
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
    `}),o=p("h3",{text:"Mobile Web Remote",style:"margin: 0 0 6px 0; font-size: 18px; font-weight: 700;"}),s=p("p",{text:"Scan with your phone camera on the same Wi-Fi network:",style:"font-size: 13px; color: #a1a1aa; margin: 0 0 16px 0;"}),d=p("div",{id:"ytmd-qr-container",style:`
      background: #ffffff;
      padding: 14px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      min-width: 180px;
      min-height: 180px;
    `}),c=p("span",{text:"Generating QR code...",style:"color: #52525b; font-size: 12px; font-weight: 500;"});d.appendChild(c);let a=p("div",{id:"ytmd-remote-url",style:"font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all; font-weight: 600;"}),l=p("button",{id:"ytmd-remote-close-btn",text:"Close",style:"background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 24px; font-weight: 600; cursor: pointer; font-size: 13px;"});l.addEventListener("click",n),t.addEventListener("click",(u)=>{if(u.target===t)n()}),r.appendChild(o),r.appendChild(s),r.appendChild(d),r.appendChild(a),r.appendChild(l),t.appendChild(r),document.body.appendChild(t);try{let u=await e.invoke("get_remote_info");if(!t.isConnected)return;if(u&&u.qr_svg){let g=p("img");g.src=`data:image/svg+xml;utf8,${encodeURIComponent(u.qr_svg)}`,g.width=180,g.height=180,g.style.display="block",g.alt="Mobile Remote QR Code",d.replaceChildren(g)}else d.replaceChildren(p("span",{text:"Remote server starting...",style:"color: #71717a; font-size: 12px;"}));if(u&&u.url)a.textContent=u.url}catch(u){console.error("[YTMD Remote] Error fetching remote info:",u)}}var P=null,Pe=null,x=(e,t={})=>new Promise((n)=>{let i=window.__TAURI__;if(!i?.event?.emit){n(null);return}let r=Math.random().toString(36).slice(2)+Date.now().toString(36),o=null,s=setTimeout(()=>{if(o)o();n(null)},4000);i.event.listen(`ytmd-response-${r}`,(d)=>{if(clearTimeout(s),o)o();n(d.payload)}).then((d)=>{o=d,i.event.emit("ytmd-invoke",{id:r,cmd:e,args:t})}).catch(()=>{clearTimeout(s),n(null)})});function it(e){if(document.getElementById("ytmd-burger-btn"))return;let t=document.querySelector("ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content"),n=document.querySelector("ytmusic-nav-bar .left-content, ytmusic-nav-bar #left-content"),i=document.querySelector("ytmusic-nav-bar"),r=document.body||document.documentElement;if(!t&&!n&&!r)return;let o=p("button",{id:"ytmd-burger-btn",title:"YTMD Menu (Ctrl+,)",style:`
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
    `}),s=I("M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",15,15),d=p("span",{text:"YTMD",style:"font-size: 12px; font-weight: 700; letter-spacing: 0.2px;"});o.appendChild(s),o.appendChild(d),o.addEventListener("mouseenter",()=>{o.style.background="#333333",o.style.borderColor="rgba(255, 255, 255, 0.3)",o.style.color="#ffffff"}),o.addEventListener("mouseleave",()=>{o.style.background="#212121",o.style.borderColor="rgba(255, 255, 255, 0.15)",o.style.color="#f4f4f5"});let c=document.getElementById("ytmd-burger-popover");if(!c){c=p("div",{id:"ytmd-burger-popover",style:`
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
      `});let a=(f,m,h,T)=>{let b=p("button",{style:`
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
        `}),R=p("span",{style:"display:flex; align-items:center; gap:10px;"}),_=p("span",{style:"display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; color:#a1a1aa;"});_.appendChild(Ye(f));let oe=p("span",{text:m,style:"font-weight: 500;"});R.appendChild(_),R.appendChild(oe);let C=p("span",{text:h,style:"font-size: 11px; color: #71717a; font-family: monospace;"});return b.appendChild(R),b.appendChild(C),b.addEventListener("mouseenter",()=>{b.style.background="#27272a",b.style.color="#ffffff",_.style.color="#ffffff"}),b.addEventListener("mouseleave",()=>{b.style.background="transparent",b.style.color="#e4e4e7",_.style.color="#a1a1aa"}),b.addEventListener("click",()=>{if(c)c.style.display="none";T()}),b},l=()=>p("div",{style:"height: 1px !important; background: #27272a !important; margin: 6px 4px !important;"});c.appendChild(a('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',"Preferences & DSP EQ","Ctrl+,",()=>{x("toggle_settings_window")})),c.appendChild(a('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',"Local Music Library","",()=>{x("toggle_local_library_window")})),c.appendChild(a('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',"Listen Together (Sync)","",()=>{x("toggle_sync_window")})),c.appendChild(a('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',"Mobile Web Remote","",()=>{if(Pe)Ce(Pe)})),c.appendChild(a('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><rect x="12" y="9" width="8" height="6" rx="1"/></svg>',"Mini Player","",()=>{x("toggle_mini_player")})),c.appendChild(l()),c.appendChild(a('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',"Download Current Track","",async()=>{if(!P||!P.videoId){alert("Please play a track first to download.");return}try{await x("download_track",{request:{video_id:P.videoId,title:P.title,artist:P.artist,album:P.album||void 0,cover_url:P.coverUrl||void 0,format:e.download_format||"mp3",embed_lyrics:e.embed_lyrics!==!1}}),alert(`Download started for: ${P.title}`)}catch(f){console.error("[YTMD Download Error]:",f)}}));let u=p("div",{style:"display: flex; gap: 4px; padding: 6px 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;"}),g=p("span",{text:"Theme:",style:"font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase;"});u.appendChild(g),["oled","nord","catppuccin","tokyo_night","gruvbox"].forEach((f)=>{let m=p("button",{text:f.toUpperCase(),style:`
          background: #1c1c20;
          border: 1px solid #27272a;
          color: #a1a1aa;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        `});m.addEventListener("click",()=>{let h=document.getElementById("ytmd-active-theme");if(h&&A[f])h.textContent=A[f].css}),u.appendChild(m)}),c.appendChild(u),document.body.appendChild(c),document.addEventListener("click",(f)=>{if(c&&c.style.display==="flex"){if(!c.contains(f.target)&&!o.contains(f.target))c.style.display="none"}})}if(o.addEventListener("click",(a)=>{if(a.stopPropagation(),c){let l=o.getBoundingClientRect();c.style.top=`${l.bottom+8}px`,c.style.right=`${Math.max(16,window.innerWidth-l.right)}px`,c.style.left="auto",c.style.display=c.style.display==="flex"?"none":"flex"}}),t)t.prepend(o);else if(n)n.appendChild(o);else if(i)i.prepend(o);else o.style.position="fixed",o.style.top="12px",o.style.right="16px",r.appendChild(o)}async function ot(){console.log("[YTMD] Initializing desktop integration bridge...");let e={};it(e);let t=setInterval(()=>it(e),1000);window.addEventListener("pagehide",()=>clearInterval(t)),x("get_config").then((a)=>{if(a&&typeof a==="object")e=a});let n={track:null,config:e,invoke:x,sendPlayerCommand:(a)=>{d(a)},getVideoElement:()=>y.getVideo()};Pe=n;let i=new ce(n);i.register(Re),i.register(Ne),i.register(ze),i.register(Oe),i.register($e),i.register(Fe),i.register(Ge),i.register(Ke),i.register(We),i.register(Qe),i.register(Je),i.register(Xe),i.register(et),i.register(tt),i.register(nt);try{await i.initAll()}catch(a){console.error("[YTMD] Registry init error:",a)}let r=new le,o=0,s=Date.now();r.onTrackChange(async(a)=>{P=a,o=a.currentTimeSecs||0,s=Date.now(),i.handleTrackChange(a);try{await x("update_track_info",{track:{title:a.title,artist:a.artist,album:a.album||null,cover_url:a.coverUrl||null,duration_secs:Math.round(a.durationSecs||0),current_time_secs:Math.round(a.currentTimeSecs||0),is_playing:a.isPlaying,video_id:a.videoId||null}})}catch(l){console.error("[YTMD] Failed to sync track info to backend:",l)}}),r.onPlaybackChange(async(a)=>{i.handlePlaybackChange(a);let l=r.getCurrentTrack();if(l){l.isPlaying=a,o=l.currentTimeSecs||0,s=Date.now();try{await x("update_track_info",{track:{title:l.title,artist:l.artist,album:l.album||null,cover_url:l.coverUrl||null,duration_secs:Math.round(l.durationSecs||0),current_time_secs:Math.round(l.currentTimeSecs||0),is_playing:a,video_id:l.videoId||null}})}catch(u){console.error("[YTMD] Failed to sync playback status:",u)}}}),r.onTick((a)=>{i.handleTick(a);let l=r.getCurrentTrack();if(!l||!l.isPlaying)return;let u=Date.now(),g=(u-s)/1000,f=o+g;if(Math.abs(a-f)>2||g>=15)o=a,s=u,l.currentTimeSecs=Math.round(a),x("update_track_info",{track:{title:l.title,artist:l.artist,album:l.album||null,cover_url:l.coverUrl||null,duration_secs:Math.round(l.durationSecs||0),current_time_secs:Math.round(a),is_playing:!0,video_id:l.videoId||null}}).catch((h)=>console.error("[YTMD] Failed to sync seek/progress to backend:",h))});function d(a){switch(a){case"play":y.play();break;case"pause":y.pause();break;case"play_pause":y.playPause();break;case"next":y.next();break;case"previous":y.previous();break;case"like":y.toggleLike();break;case"dislike":y.toggleDislike();break;case"mute":y.toggleMute();break}}let c=(a,l)=>{let u=window.__TAURI__;if(u?.event?.listen)u.event.listen(a,(g)=>l(g.payload))};c("player-command",(a)=>d(a)),c("tray-command",(a)=>d(a)),c("mpris-command",(a)=>d(a)),c("global-shortcut-event",(a)=>d(a)),c("player-seek",(a)=>y.seekTo(a)),c("mpris-command-seek",(a)=>y.seekTo(a)),c("player-volume",(a)=>y.setVolume(a)),window.addEventListener("keydown",(a)=>{if(a.ctrlKey&&a.key===","||a.key==="F2")a.preventDefault(),x("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var Lt=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(Lt)if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>ot());else ot();
