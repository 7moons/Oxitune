function w1($){let b=$.trim().split(":").map((Y)=>parseInt(Y,10));if(b.some((Y)=>isNaN(Y)))return 0;if(b.length===2)return b[0]*60+b[1];else if(b.length===3)return b[0]*3600+b[1]*60+b[2];return 0}class z1{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;mutationObserver=null;attachedVideo=null;handleVideoPlay=()=>this.handlePlaybackChange(!0);handleVideoPause=()=>this.handlePlaybackChange(!1);handleVideoTimeUpdate=()=>{if(!this.attachedVideo)return;let $=this.attachedVideo.currentTime;this.onTickCallbacks.forEach((b)=>b($))};constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange($){this.onTrackChangeCallbacks.push($)}onPlaybackChange($){this.onPlaybackChangeCallbacks.push($)}onTick($){this.onTickCallbacks.push($)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let h=navigator.mediaSession,z=h.metadata;try{Object.defineProperty(h,"metadata",{get:()=>z,set:(X)=>{z=X,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(X){}}this.syncVideoListeners();let $=!1,Y=new MutationObserver(()=>{if($)return;$=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),$=!1})}),_=document.querySelector("ytmusic-player-bar")||document.body;if(_)Y.observe(_,{childList:!0,subtree:!0,characterData:!0});this.mutationObserver=Y,this.tickInterval=window.setInterval(()=>{this.syncVideoListeners(),this.checkTrackUpdate();let h=document.querySelector("video");if(h&&!h.paused)this.onTickCallbacks.forEach((z)=>z(h.currentTime))},250)}attachVideoListeners($){$.addEventListener("play",this.handleVideoPlay),$.addEventListener("playing",this.handleVideoPlay),$.addEventListener("pause",this.handleVideoPause),$.addEventListener("ended",this.handleVideoPause),$.addEventListener("timeupdate",this.handleVideoTimeUpdate),this.attachedVideo=$}detachVideoListeners($){$.removeEventListener("play",this.handleVideoPlay),$.removeEventListener("playing",this.handleVideoPlay),$.removeEventListener("pause",this.handleVideoPause),$.removeEventListener("ended",this.handleVideoPause),$.removeEventListener("timeupdate",this.handleVideoTimeUpdate)}syncVideoListeners(){let $=document.querySelector("video");if($&&$!==this.attachedVideo){if(this.attachedVideo)this.detachVideoListeners(this.attachedVideo);this.attachVideoListeners($)}}extractTrackInfo(){let $=document.querySelector("video"),b=document.getElementById("movie_player");if(Boolean(b&&(typeof b.getAdState==="function"&&b.getAdState()===1||typeof b.isAdPlaying==="function"&&b.isAdPlaying()||b.classList?.contains("ad-showing")||b.classList?.contains("ad-interrupting"))))return null;let _=navigator.mediaSession?.metadata,h=_?.title||"",z=_?.artist||"",X=_?.album||"",H="";if(_?.artwork&&_.artwork.length>0){let D=_.artwork[_.artwork.length-1];if(D&&D.src)H=D.src}if(!h){let D=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(D)h=D.textContent?.trim()||""}if(!z){let D=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(D){let F=(D.textContent?.trim()||"").split("•").map((U)=>U.trim());if(z=F[0]||"",F.length>1)X=F[1]}}if(!H){let D=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(D&&D.src)H=D.src}if(H.startsWith("//"))H=`https:${H}`;if(H.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(H))H=H.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let q=new URLSearchParams(window.location.search).get("v")||void 0,J=0,Z=0;if(b&&typeof b.getDuration==="function"){let D=b.getDuration();if(typeof D==="number"&&Number.isFinite(D)&&D>0)J=Math.floor(D)}if(b&&typeof b.getCurrentTime==="function"){let D=b.getCurrentTime();if(typeof D==="number"&&Number.isFinite(D)&&D>=0)Z=Math.floor(D)}if(!J&&$&&Number.isFinite($.duration)&&$.duration>0)J=Math.floor($.duration);if(!Z&&$&&Number.isFinite($.currentTime)&&$.currentTime>=0)Z=Math.floor($.currentTime);let j=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(j&&j.textContent){let D=j.textContent.split("/").map((G)=>G.trim());if(D.length===2){if(!Z)Z=w1(D[0]);if(!J)J=w1(D[1])}}if(!J){let G=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(G){let F=parseInt(G,10);if(!isNaN(F)&&F>0)J=F}}let C=$?!$.paused&&!$.ended:!1;if(!h)return null;return{title:h,artist:z||"Unknown Artist",album:X||void 0,coverUrl:H||void 0,durationSecs:J,currentTimeSecs:Z,isPlaying:C,videoId:q}}checkTrackUpdate(){let $=this.extractTrackInfo();if(!$)return;let b=!this.currentTrack||this.currentTrack.title!==$.title||this.currentTrack.artist!==$.artist||this.currentTrack.videoId!==$.videoId,Y=this.currentTrack!==null&&(!this.currentTrack.durationSecs&&$.durationSecs>0||!this.currentTrack.coverUrl&&!!$.coverUrl||!this.currentTrack.album&&!!$.album||!this.currentTrack.videoId&&!!$.videoId),_=this.currentTrack!==null&&this.currentTrack.isPlaying!==$.isPlaying;if(this.currentTrack=$,b||Y){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((h)=>h($))}if(_)this.onPlaybackChangeCallbacks.forEach((h)=>h($.isPlaying))}handlePlaybackChange($){if($){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((b)=>b(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((b)=>b(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null;if(this.mutationObserver!==null)this.mutationObserver.disconnect(),this.mutationObserver=null;if(this.attachedVideo!==null)this.detachVideoListeners(this.attachedVideo),this.attachedVideo=null}}class W{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let $=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if($){$.click();return}let b=this.getVideo();if(b)if(b.paused)b.play();else b.pause()}static play(){let $=this.getVideo();if($&&$.paused)this.playPause()}static pause(){let $=this.getVideo();if($&&!$.paused)this.playPause()}static next(){let $=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if($)$.click()}static previous(){let $=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if($)$.click()}static seekTo($){let b=this.getVideo();if(b&&!isNaN($))b.currentTime=Math.max(0,Math.min($,b.duration||$))}static setVolume($){let b=this.getVideo();if(b)b.volume=Math.max(0,Math.min(1,$))}static toggleLike(){let $=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if($)$.click()}static toggleDislike(){let $=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if($)$.click()}static toggleMute(){let $=document.querySelector("ytmusic-player-bar #volume-slider"),b=this.getVideo();if(b)b.muted=!b.muted;if($){let Y=$.parentElement?.querySelector("paper-icon-button, #button");if(Y)Y.click()}}}class J1{plugins=new Map;enabledPlugins=new Set;context;constructor($){this.context=$}register($){if(this.plugins.set($.id,$),$.defaultEnabled)this.enabledPlugins.add($.id)}async initAll($){for(let[b,Y]of this.plugins)if($?.[b]!==void 0?$[b]:Y.defaultEnabled){if(this.enabledPlugins.add(b),Y.onInit)try{await Y.onInit(this.context)}catch(h){console.error(`[YTMD] Failed to init plugin ${b}:`,h)}}else this.enabledPlugins.delete(b)}async enable($){let b=this.plugins.get($);if(b&&!this.enabledPlugins.has($)){if(this.enabledPlugins.add($),b.onInit)await b.onInit(this.context)}}async disable($){let b=this.plugins.get($);if(b&&this.enabledPlugins.has($)){if(this.enabledPlugins.delete($),b.onDestroy)await b.onDestroy()}}handleTrackChange($){this.context.track=$;for(let b of this.enabledPlugins){let Y=this.plugins.get(b);if(Y?.onTrackChange)try{Y.onTrackChange($,this.context)}catch(_){console.error(`[YTMD] Error in plugin ${b} onTrackChange:`,_)}}}handlePlaybackChange($){for(let b of this.enabledPlugins){let Y=this.plugins.get(b);if(Y?.onPlaybackChange)try{Y.onPlaybackChange($,this.context)}catch(_){console.error(`[YTMD] Error in plugin ${b} onPlaybackChange:`,_)}}}handleTick($){for(let b of this.enabledPlugins){let Y=this.plugins.get(b);if(Y?.onTick)try{Y.onTick($,this.context)}catch(_){console.error(`[YTMD] Error in plugin ${b} onTick:`,_)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled($){return this.enabledPlugins.has($)}}var S=null,R={adWasShowing:!1,preAdMuted:!1},Z1=new WeakSet,P=null,E1=null,X1=0,B=!0,X0=1000,Z0=($,b,Y)=>$-b>=Y,H0=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",N0="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)",q0=`
  .ad-showing video,
  .ad-interrupting video {
    opacity: 0 !important;
    pointer-events: none !important;
  }
`,D0=`
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
`,Q0=q0+D0,j0=["/youtubei/v1/player","/youtubei/v1/next","/youtubei/v1/get_watch","/youtubei/v1/browse","/youtubei/v1/guide"],W0=["adPlacements","adSlots","playerAds","adBreakHeartbeatParams","playerResponse.adPlacements","playerResponse.adSlots","playerResponse.playerAds","playerResponse.adBreakHeartbeatParams","playerResponse.auxiliaryUi.messageRenderers.upsellDialogRenderer","auxiliaryUi.messageRenderers.upsellDialogRenderer"],C0=($)=>j0.some((b)=>$.includes(b)),F0=($,b)=>{let Y=b.split("."),_=$;for(let z=0;z<Y.length-1;z++){if(_===null||typeof _!=="object")return!1;_=_[Y[z]]}let h=Y[Y.length-1];if(_!==null&&typeof _==="object"&&Object.prototype.hasOwnProperty.call(_,h))return delete _[h],!0;return!1},N1=($)=>{if($===null||typeof $!=="object")return!1;let b=!1;for(let Y of W0)if(F0($,Y))b=!0;return b},G0=($)=>{if(typeof $==="string")return $;if($ instanceof URL)return $.href;return $.url},K1=!1,M0=()=>{if(K1)return;K1=!0;let $=window.fetch,b=$.bind(window),Y=async(..._)=>{let h=await b(..._);if(!B||!C0(G0(_[0])))return h;let z;try{z=await h.clone().json()}catch{return h}if(!N1(z))return h;let X=new Headers(h.headers);return X.delete("content-length"),X.delete("content-encoding"),new Response(JSON.stringify(z),{status:h.status,statusText:h.statusText,headers:X})};window.fetch=Object.assign(Y,$)},R1=!1,T0=()=>{if(R1)return;R1=!0;let $=JSON.parse;JSON.parse=(...b)=>{let Y=$(...b);if(B)N1(Y);return Y}},V1=!1,A0=()=>{if(V1)return;V1=!0;let $;Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get:()=>$,set:(b)=>{if(B)N1(b);$=b}})};if(typeof window<"u")M0(),T0(),A0();var O0=($)=>{let b=new Set($);return b.has("ad-showing")||b.has("ad-interrupting")},m0=($,b,Y)=>{if($&&!b.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:Y},setMutedTo:!0};if(!$&&b.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:b.preAdMuted},setMutedTo:b.preAdMuted};return{nextState:b,setMutedTo:null}},q1=()=>document.getElementById("movie_player"),U0=()=>{let $=q1();if(!$)return!1;return O0($.classList)},H1=($)=>{let b=$.getVideoElement();if(!b)return;let{nextState:Y,setMutedTo:_}=m0(U0(),R,b.muted);if(R=Y,_!==null)b.muted=_},I1=($)=>{if(Z1.has($))return;Z1.add($),$.click()},k=()=>{document.querySelectorAll(H0).forEach(I1),document.querySelectorAll(N0).forEach(($)=>{$.style.display="none";let b=$.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(b)I1(b)})},L1=($)=>{let b=q1();if(E1=b,!b)return;P?.disconnect(),P=new MutationObserver(()=>{H1($),k()}),P.observe(b,{attributes:!0,attributeFilter:["class"]})},P1={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Strips ad scheduling data from YTM API responses so ads are never scheduled, and mutes/hides anything that slips through, without touching playback timing",defaultEnabled:!0,onInit($){B=!0,R={adWasShowing:!1,preAdMuted:!1},Z1=new WeakSet,X1=0;let b=document.createElement("style");b.id="ytmd-adblock-styles",b.textContent=Q0,document.head.appendChild(b);let Y=!1,_=new MutationObserver(()=>{if(Y)return;Y=!0,requestAnimationFrame(()=>{Y=!1,k()})});_.observe(document.body,{childList:!0,subtree:!0}),L1($),k(),H1($),S=()=>{B=!1,P?.disconnect(),P=null,_.disconnect(),document.getElementById("ytmd-adblock-styles")?.remove();let h=$.getVideoElement();if(h&&R.adWasShowing)h.muted=R.preAdMuted;R={adWasShowing:!1,preAdMuted:!1}}},onTick($,b){if(q1()!==E1)L1(b);H1(b);let Y=Date.now();if(Z0(Y,X1,X0))X1=Y,k()},onDestroy(){if(S)S(),S=null}};var V=[],o="",D1=new Set,w0=($,b)=>$===b,B1={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){V=[],o="",D1=new Set},onTrackChange($){if(!$.videoId||$.videoId===o)return;let b=$.videoId;o=b,V=[],D1=new Set;let Y=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),_=`https://sponsor.ajay.app/api/skipSegments?videoID=${b}&categories=${encodeURIComponent(Y)}`;fetch(_,{signal:AbortSignal.timeout(3000)}).then(async(h)=>{if(!h.ok)return;let z=await h.json();if(!w0(b,o))return;V=z,console.log(`[YTMD SponsorBlock] Loaded ${z.length} segments for ${b}`)}).catch(()=>{})},onTick($,b){if(!V||V.length===0)return;let Y=D1;for(let _ of V){let[h,z]=_.segment;if($>=h&&$<z-0.5&&!Y.has(_.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${_.category}): ${h}s -> ${z}s`);let X=b.getVideoElement();if(X)X.currentTime=z,Y.add(_.UUID);break}}}};function I($,b=18,Y=18,_="0 0 24 24"){let h=document.createElementNS("http://www.w3.org/2000/svg","svg");h.setAttribute("width",String(b)),h.setAttribute("height",String(Y)),h.setAttribute("viewBox",_),h.setAttribute("fill","currentColor");let z=document.createElementNS("http://www.w3.org/2000/svg","path");return z.setAttribute("d",$),h.appendChild(z),h}var f1="http://www.w3.org/2000/svg",K0="circle|path|rect|line|polyline|polygon|g|ellipse";function u1($){let b=document.createElementNS(f1,"svg"),Y=(z,X)=>{for(let H of X.matchAll(/([\w:-]+)="([^"]*)"/g))z.setAttribute(H[1],H[2])},_=$.match(/^<svg([^>]*)>/);if(_)Y(b,_[1]);let h=new RegExp(`<(${K0})([^>]*)\\/?>`,"g");for(let z of $.matchAll(h)){let X=document.createElementNS(f1,z[1]);Y(X,z[2]),b.appendChild(X)}return b}function Q($,b){let Y=document.createElement($);if(b?.id)Y.id=b.id;if(b?.className)Y.className=b.className;if(b?.text!==void 0)Y.textContent=b.text;if(b?.title)Y.title=b.title;if(b?.style)Y.style.cssText=b.style;return Y}var A=[],u=-1,x=null,M="",g=null,f="",y1=($,b)=>$===b,S1={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit($){A=[],u=-1,x=null,M="",f="";let b=document.createElement("style");b.id="ytmd-native-lyrics-styles",b.textContent=`
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
    `,document.head.appendChild(b);let Y=()=>{p(),x1($)},_=()=>{setTimeout(()=>{p(),j1()},50),setTimeout(()=>{j1()},250)};document.addEventListener("click",_,!0);let h=window.setInterval(Y,600);Y(),g=()=>{clearInterval(h),document.removeEventListener("click",_,!0),b.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((X)=>X.remove())}},async onTrackChange($,b){let Y=`${$.title} - ${$.artist}`;if(M===Y&&A.length>0||f===Y)return;M=Y,f=Y,A=[],u=-1,x=null,p();let _=document.getElementById("ytmd-native-lyrics-wrapper");if(_)_.replaceChildren(Q("div",{className:"ytmd-native-lyrics-status",text:"Loading synchronized lyrics..."}));try{let h=await b.invoke("fetch_lyrics",{artist:$.artist,title:$.title,albumName:$.album||null,duration:$.durationSecs||null});if(!y1(Y,M))return;if(x=h,h?.syncedLyrics)A=I0(h.syncedLyrics);p(),x1(b),o1(b)}catch{if(!y1(Y,M))return;let h=document.getElementById("ytmd-native-lyrics-wrapper");if(h)h.replaceChildren(Q("div",{className:"ytmd-native-lyrics-status",text:"No lyrics available for this track."}))}finally{if(f===Y)f=""}},onTick($){if(!A||A.length===0)return;let b=y(M),Y=$+b,_=-1;for(let h=0;h<A.length;h++)if(Y>=A[h].timeSecs)_=h;else break;if(_!==u&&_>=0){u=_;let h=document.getElementById("ytmd-native-lyrics-wrapper");if(h){let z=h.querySelectorAll(".ytmd-native-lyric-line");z.forEach((H,N)=>{if(N===_)H.classList.add("active");else H.classList.remove("active")});let X=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(X&&R0(X)){let H=z[_];if(H)H.scrollIntoView({behavior:"smooth",block:"nearest"})}}}},onDestroy(){if(g)g(),g=null}},k1=new Map;function y($){return k1.get($)||0}function Q1($,b){k1.set($,b)}function R0($){if(!$||$.offsetParent===null||$.hasAttribute("hidden"))return!1;let b=window.getComputedStyle($);return b.display!=="none"&&b.visibility!=="hidden"&&b.opacity!=="0"}function p(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((b)=>{let Y=b.textContent?.toLowerCase()||"";if(Y.includes("tekst")||Y.includes("lyrics")||Y.includes("paroles")||Y.includes("letras")){b.disabled=!1,b.removeAttribute("disabled"),b.removeAttribute("aria-disabled"),b.classList.remove("disabled"),b.classList.add("ytmd-lyrics-tab-unlocked"),b.style.pointerEvents="auto",b.style.cursor="pointer";let _={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!b.endpoint)b.endpoint=_;if(b.data&&!b.data.endpoint)b.data.endpoint=_}})}function V0(){let $=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let Y of Array.from($)){let _=Y.textContent?.toLowerCase()||"";if(_.includes("tekst")||_.includes("lyrics")||_.includes("paroles")||_.includes("letras")){if(Y.classList.contains("iron-selected")||Y.getAttribute("aria-selected")==="true"||Y.classList.contains("selected"))return!0}}let b=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(b){if((b.classList.contains("iron-selected")||!b.hasAttribute("hidden"))&&b.getAttribute("aria-hidden")!=="true")return!0}return!1}function j1(){let $=document.getElementById("ytmd-native-lyrics-wrapper");if(!$)return;let b=V0();$.style.setProperty("display",b?"flex":"none","important")}function x1($){let b=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!b)return;let Y=document.getElementById("ytmd-native-lyrics-wrapper");if(!Y||!b.contains(Y)){if(!Y)Y=Q("div",{id:"ytmd-native-lyrics-wrapper"});b.appendChild(Y),o1($)}j1()}function o1($){let b=document.getElementById("ytmd-native-lyrics-wrapper");if(!b)return;if(A&&A.length>0){let Y=y(M),_=Q("div",{className:"ytmd-native-lyrics-sync-bar"}),h=Q("span",{className:"ytmd-sync-label",text:"Sync:"}),z=Q("button",{className:"ytmd-sync-btn",text:"-0.5s",title:"Shift lyrics 0.5s earlier"}),X=Q("span",{className:"ytmd-sync-val",text:`${Y>=0?"+":""}${Y.toFixed(1)}s`}),H=Q("button",{className:"ytmd-sync-btn",text:"+0.5s",title:"Shift lyrics 0.5s later"}),N=Q("button",{className:"ytmd-sync-btn",text:"Reset",title:"Reset offset to 0.0s"});z.addEventListener("click",()=>{let q=Math.round((y(M)-0.5)*10)/10;Q1(M,q),X.textContent=`${q>=0?"+":""}${q.toFixed(1)}s`}),H.addEventListener("click",()=>{let q=Math.round((y(M)+0.5)*10)/10;Q1(M,q),X.textContent=`${q>=0?"+":""}${q.toFixed(1)}s`}),N.addEventListener("click",()=>{Q1(M,0),X.textContent="+0.0s"}),_.appendChild(h),_.appendChild(z),_.appendChild(X),_.appendChild(H),_.appendChild(N),b.replaceChildren(...A.map((q,J)=>{let Z=Q("div",{className:`ytmd-native-lyric-line${J===u?" active":""}`,text:q.text});return Z.addEventListener("click",()=>{let j=$.getVideoElement();if(j){let C=y(M);j.currentTime=Math.max(0,q.timeSecs-C)}}),Z}),_,Q("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else if(x?.plainLyrics){let Y=x.plainLyrics.split(`
`);b.replaceChildren(...Y.map((_)=>Q("div",{className:"ytmd-native-lyric-line active",text:_,style:"cursor: default;"})),Q("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else b.replaceChildren(Q("div",{className:"ytmd-native-lyrics-status",text:"Synced lyrics unavailable for this track."}))}function I0($){let b=$.split(`
`),Y=[],_=0,h=/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g,z=/\[offset:\s*([+-]?\d+)\s*\]/i;for(let X of b){let H=X.trim();if(!H)continue;let N=z.exec(H);if(N){let Z=parseInt(N[1],10);if(!isNaN(Z))_=Z/1000;continue}let q=[],J;h.lastIndex=0;while((J=h.exec(H))!==null){let Z=parseInt(J[1],10),j=parseInt(J[2],10),C=0;if(J[3])C=parseInt(J[3].padEnd(3,"0").slice(0,3),10);q.push(Z*60+j+C/1000)}if(q.length>0){let Z=H.replace(h,"").trim();if(Z)for(let j of q)Y.push({timeSecs:Math.max(0,j-_),text:Z})}}return Y.sort((X,H)=>X.timeSecs-H.timeSecs)}var v=null,g1={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit($){let b=(Y)=>{let _=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!_)return;let h=_.getBoundingClientRect();if(Y.clientX>=h.left&&Y.clientX<=h.right&&Y.clientY>=h.top&&Y.clientY<=h.bottom){Y.preventDefault();let z=$.getVideoElement();if(z){let X=$.config.wheel_volume_step||0.05,H=Y.deltaY<0?X:-X,N=Math.max(0,Math.min(1,z.volume+H));z.volume=N}}};window.addEventListener("wheel",b,{passive:!1}),v=()=>{window.removeEventListener("wheel",b)}},onDestroy(){if(v)v(),v=null}};var p1={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange($,b){if(!b.config?.notifications_enabled)return;if(!$.title||$.title==="No Track Playing")return;try{await b.invoke("notify_track_change",{title:$.title,artist:$.artist})}catch(Y){console.warn("[YTMD] Notification dispatch failed:",Y)}}};var d=null,v1={id:"visualizer",name:"Sleek Scrollbars",description:"Applies subtle, low-contrast scrollbar colors",defaultEnabled:!0,onInit($){let b=document.getElementById("ytmd-theme-styles");if(!b)b=document.createElement("style"),b.id="ytmd-theme-styles";if(b.textContent=`
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
    `,!b.isConnected)document.head.appendChild(b);d=()=>{b?.remove()}},onDestroy(){if(d)d(),d=null}};var W1=[32,64,125,250,500,1000,2000,4000,8000,16000],C1={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function l($){return Math.max(-12,Math.min(12,$))}class T{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;powerBuffer=null;static getInstance(){if(!T.instance)T.instance=new T;return T.instance}init($){if(this.isInitialized&&this.hookedVideo===$){this.resumeContext();return}try{let b=window.AudioContext||window.webkitAudioContext;if(!b){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new b,this.hookedVideo=$,this.sourceNode=this.audioCtx.createMediaElementSource($),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=W1.map((_,h)=>{if(!this.audioCtx)throw Error("AudioContext missing");let z=this.audioCtx.createBiquadFilter();if(h===0)z.type="lowshelf";else if(h===W1.length-1)z.type="highshelf";else z.type="peaking",z.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return z.frequency.setValueAtTime(_,this.audioCtx.currentTime),z.gain.setValueAtTime(0,this.audioCtx.currentTime),z}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph();let Y=()=>this.resumeContext();$.addEventListener("play",Y),$.addEventListener("playing",Y),document.addEventListener("click",Y,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(b){console.error("[YTMD DSP] Failed to initialize AudioEngine:",b)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((b)=>b.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let $=this.sourceNode;if(this.isNormalizing)$.connect(this.compressorNode),$=this.compressorNode;for(let b of this.filters)$.connect(b),$=b;$.connect(this.preampNode),$=this.preampNode,$.connect(this.fadeNode),$=this.fadeNode,$.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch($){console.error("[YTMD DSP] Graph rebuild error:",$)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain($,b){if($<0||$>=this.filters.length||!this.audioCtx)return;let Y=l(b);this.filters[$].gain.setValueAtTime(Y,this.audioCtx.currentTime)}setAllGains($){if(!this.audioCtx)return;$.forEach((b,Y)=>{if(Y<this.filters.length)this.filters[Y].gain.setValueAtTime(l(b),this.audioCtx.currentTime)})}setPreamp($){if(!this.preampNode||!this.audioCtx)return;let b=Math.pow(10,l($)/20);this.preampNode.gain.setValueAtTime(b,this.audioCtx.currentTime)}setLoudnessNormalization($){if(this.isNormalizing!==$)this.isNormalizing=$,this.rebuildGraph()}applyPreset($){let b=C1[$]||C1.flat;if(this.setAllGains(b.gains),b.preamp!==void 0)this.setPreamp(b.preamp);return b.gains}fadeIn($){if(!this.fadeNode||!this.audioCtx||$<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let b=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(b),this.fadeNode.gain.setValueAtTime(0.001,b),this.fadeNode.gain.linearRampToValueAtTime(1,b+$)}fadeOut($){if(!this.fadeNode||!this.audioCtx||$<=0)return;let b=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(b),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,b),this.fadeNode.gain.linearRampToValueAtTime(0.001,b+$)}resetFade(){if(this.fadeNode&&this.audioCtx){let $=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues($),this.fadeNode.gain.setValueAtTime(1,$)}}getAudioPowerDb(){if(!this.analyserNode)return-100;if(!this.powerBuffer||this.powerBuffer.length!==this.analyserNode.fftSize)this.powerBuffer=new Float32Array(this.analyserNode.fftSize);let $=this.powerBuffer;this.analyserNode.getFloatTimeDomainData($);let b=0;for(let _=0;_<$.length;_++)b+=$[_]*$[_];let Y=Math.sqrt(b/$.length);if(Y<=0.00001)return-100;return 20*Math.log10(Y)}getFrequencyData(){if(!this.analyserNode)return null;let $=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData($),$}setPlaybackRate($){let b=Math.max(0.5,Math.min(2,$));if(this.hookedVideo)this.hookedVideo.playbackRate=b}setPreservesPitch($){if(this.hookedVideo){this.hookedVideo.preservesPitch=$;let b=this.hookedVideo;b.mozPreservesPitch=$,b.webkitPreservesPitch=$}}}class F1{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";pendingAdvanceTimeout=null;setCrossfadeSeconds($){this.crossfadeSeconds=Math.max(0,Math.min(12,$))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange($){if(this.clearPendingAdvance(),this.fadeOutTriggered=!1,this.currentTrackId=$.videoId||`${$.title}-${$.artist}`,this.crossfadeSeconds>0)T.getInstance().fadeIn(this.crossfadeSeconds);else T.getInstance().resetFade()}onTick($,b){if(!b||this.crossfadeSeconds<=0||b.durationSecs<=0)return;let Y=b.durationSecs-$;if(Y<=this.crossfadeSeconds&&!this.fadeOutTriggered&&Y>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${Y.toFixed(1)}s remaining)...`),T.getInstance().fadeOut(Y),this.clearPendingAdvance(),this.pendingAdvanceTimeout=setTimeout(()=>{this.pendingAdvanceTimeout=null;let _=b.videoId||`${b.title}-${b.artist}`;if(this.currentTrackId===_)console.log("[YTMD Crossfade] Advancing to next track..."),W.next()},Math.max(100,(Y-0.2)*1000))}clearPendingAdvance(){if(this.pendingAdvanceTimeout!==null)clearTimeout(this.pendingAdvanceTimeout),this.pendingAdvanceTimeout=null}destroy(){this.clearPendingAdvance()}}class G1{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled($){this.enabled=$}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick($,b,Y){if(!this.enabled||!b||!Y||Y.paused||Y.ended)return;let _=T.getInstance().getAudioPowerDb();if(!this.checkedIntro&&$<15)if(_<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&$<12)console.log(`[YTMD Skip Silence] Intro silence detected (${_.toFixed(1)} dB). Fast forwarding...`),Y.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(b.durationSecs>15&&$>b.durationSecs-10)if(_<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${_.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,W.next()}else this.consecutiveSilentTicks=0}}var K=null,L=null,n=null,d1={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit($){let b=$.getVideoElement(),Y=T.getInstance(),_=new F1,h=new G1;K=_,L=h;let z=$.config,X=Boolean(z.equalizer_enabled||z.loudness_normalization||z.equalizer_gains&&Array.isArray(z.equalizer_gains)&&z.equalizer_gains.some((q)=>q!==0)),H=null;if(X)if(b)Y.init(b);else H=window.setInterval(()=>{let q=$.getVideoElement();if(q){if(H!==null)clearInterval(H);H=null,Y.init(q)}},500);if(z.equalizer_gains&&Array.isArray(z.equalizer_gains))Y.setAllGains(z.equalizer_gains);else if(z.equalizer_preset&&typeof z.equalizer_preset==="string")Y.applyPreset(z.equalizer_preset);if(z.preamp_gain!==void 0)Y.setPreamp(z.preamp_gain);if(z.loudness_normalization!==void 0)Y.setLoudnessNormalization(Boolean(z.loudness_normalization));if(z.crossfade_seconds!==void 0)_.setCrossfadeSeconds(z.crossfade_seconds);if(z.skip_silence_enabled!==void 0)h.setEnabled(Boolean(z.skip_silence_enabled));if(z.playback_speed!==void 0)Y.setPlaybackRate(z.playback_speed);if(z.preserve_pitch!==void 0)Y.setPreservesPitch(Boolean(z.preserve_pitch));let N=[];if(window.__TAURI__?.event){let{listen:q}=window.__TAURI__.event;N.push(q("set-eq-band",(J)=>{Y.setBandGain(J.payload.bandIndex,J.payload.gain)}),q("set-eq-all",(J)=>{Y.setAllGains(J.payload.gains)}),q("set-eq-preset",(J)=>{Y.applyPreset(J.payload)}),q("set-preamp",(J)=>{Y.setPreamp(J.payload)}),q("set-loudness-normalization",(J)=>{Y.setLoudnessNormalization(J.payload)}),q("set-crossfade-seconds",(J)=>{_.setCrossfadeSeconds(J.payload)}),q("set-skip-silence",(J)=>{h.setEnabled(J.payload)}),q("set-playback-rate",(J)=>{Y.setPlaybackRate(J.payload)}),q("set-preserves-pitch",(J)=>{Y.setPreservesPitch(J.payload)}))}n=()=>{if(H!==null)clearInterval(H),H=null;N.forEach((q)=>q.then((J)=>J())),K?.destroy(),K=null,L=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange($){if(K)K.onTrackChange($);if(L)L.onTrackChange()},onTick($,b){if(K)K.onTick($,b.track);if(L)L.onTick($,b.track,b.getVideoElement())},onDestroy(){if(n)n(),n=null}};var M1=($,b,Y)=>{let _=(z)=>Math.max(0,Math.min(255,Math.round(z))),h=(z)=>_(z).toString(16).padStart(2,"0");return`#${h($)}${h(b)}${h(Y)}`};async function l1($){return new Promise((b)=>{let Y={primary:"#3a2f1f",secondary:"#0e0c11",accent:"#e8b06b"};if(!$){b(Y);return}let _=new Image;_.crossOrigin="anonymous",_.onload=()=>{try{let h=document.createElement("canvas");h.width=16,h.height=16;let z=h.getContext("2d");if(!z){b(Y);return}z.drawImage(_,0,0,16,16);let X=z.getImageData(0,0,16,16).data,H=0,N=0,q=0,J=0,Z=0,j=0,C=0,D=0;for(let w=0;w<X.length;w+=4){let Y1=X[w],_1=X[w+1],h1=X[w+2];if(X[w+3]<128)continue;let U1=(Y1+_1+h1)/3;if(U1<20||U1>240)continue;if(w<X.length/2)H+=Y1,N+=_1,q+=h1,J++;else Z+=Y1,j+=_1,C+=h1,D++}if(J===0&&D===0){b(Y);return}let G=J>0?Math.round(H/J):220,F=J>0?Math.round(N/J):38,U=J>0?Math.round(q/J):38,$1=D>0?Math.round(Z/D):24,b1=D>0?Math.round(j/D):24,J0=D>0?Math.round(C/D):27;b({primary:M1(G,F,U),secondary:M1($1,b1,J0),accent:M1(G+30,F+30,U+30)})}catch{b(Y)}},_.onerror=()=>b(Y),_.src=$})}var i=null,s=null,T1,n1={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Fills the page behind the translucent chrome with a blurred, color-extracted wash of the active album cover — the same treatment the companion windows use",defaultEnabled:!0,onInit($){let b=document.getElementById("ytmd-ambient-backdrop");if(!b)b=Q("div",{id:"ytmd-ambient-backdrop"}),document.body.prepend(b);b.replaceChildren();let Y=Q("img",{id:"ytmd-ambient-cover"});Y.alt="";let _=Q("div",{id:"ytmd-ambient-veil"});b.appendChild(Y),b.appendChild(_);let h=typeof $.config.ambient_intensity==="number"?$.config.ambient_intensity:0.6,z=$.config.ambient_lighting_enabled!==!1,X=document.createElement("style");X.id="ytmd-ambient-styles",X.textContent=`
      #ytmd-ambient-backdrop {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
        opacity: ${z?h:0};
        transition: opacity 0.8s ease;
        will-change: opacity;
      }
      /* Full-bleed blurred cover — the same #ambient-cover technique the
         companion windows use (src/ui/styles.css), so nav bar/player bar/
         sidebar going translucent (theme_engine's Ambient CSS) actually
         reveals something rich instead of a faint two-corner gradient. */
      #ytmd-ambient-cover {
        position: absolute;
        inset: -12%;
        width: 124%;
        height: 124%;
        object-fit: cover;
        object-position: center;
        filter: blur(64px) saturate(165%) brightness(0.55);
        opacity: 0;
        transition: opacity 1.1s ease;
      }
      body.ytmd-is-playing #ytmd-ambient-cover {
        animation: ytmd-ambient-breathe 16s ease-in-out infinite alternate;
      }
      @keyframes ytmd-ambient-breathe {
        from { transform: scale(1) rotate(0deg); }
        to { transform: scale(1.07) rotate(0.6deg); }
      }
      @media (prefers-reduced-motion: reduce) {
        body.ytmd-is-playing #ytmd-ambient-cover { animation: none; }
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
    `,document.head.appendChild(X),i=(N)=>{if(b)b.style.opacity=String(N)};let H=[];if(window.__TAURI__?.event)H.push(window.__TAURI__.event.listen("set-ambient-intensity",(N)=>{i?.(N.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(N)=>{i?.(N.payload?0.6:0)}));if(s=()=>{H.forEach((N)=>N.then((q)=>q())),i=null,T1=void 0,document.body.classList.remove("ytmd-is-playing"),document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},$.track)this.onTrackChange($.track,$)},async onTrackChange($){document.body.classList.toggle("ytmd-is-playing",!!$.isPlaying);let b=$.coverUrl||null;if(b===T1)return;T1=b;let Y=document.getElementById("ytmd-ambient-cover");if(Y){if(Y.style.opacity=b?"1":"0",b)Y.src=b}try{let _=await l1(b||""),h=document.documentElement.style;h.setProperty("--ytmd-accent",_.accent),h.setProperty("--ytmd-accent-primary",_.primary),h.setProperty("--ytmd-accent-secondary",_.secondary)}catch{}},onDestroy(){if(s)s(),s=null}};var i1=`
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
  ytmusic-nav-bar, ytmusic-player-bar, ytmusic-player-page {
    background: color-mix(in srgb, #0c0a10 62%, transparent) !important;
    backdrop-filter: blur(26px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(26px) saturate(160%) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  ytmusic-guide-renderer {
    background: color-mix(in srgb, #0a0910 55%, transparent) !important;
    backdrop-filter: blur(26px) saturate(160%) !important;
    -webkit-backdrop-filter: blur(26px) saturate(160%) !important;
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

`,s1=`
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

`;var a=null,a1={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Switches YouTube Music's chrome between the Ambient and Base looks, and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit($){let b=()=>document.head||document.documentElement,Y=(H)=>{let N=document.getElementById(H);if(!N){N=document.createElement("style"),N.id=H;let q=b();if(q)q.appendChild(N)}return N},_=(H)=>{let N=Y("ytmd-active-theme");N.textContent=H?i1:s1},h=(H)=>{let N=Y("ytmd-custom-css");if(N)N.textContent=H};_($.config.ambient_lighting_enabled!==!1);let z=$.config.custom_css||"";h(z);let X=[];if(window.__TAURI__?.event)X.push(window.__TAURI__.event.listen("set-ambient-enabled",(H)=>{_(H.payload)}),window.__TAURI__.event.listen("set-custom-css",(H)=>{h(H.payload)}));a=()=>{X.forEach((H)=>H.then((N)=>N()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(a)a(),a=null}};var c=null,c1={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit($){let b=()=>{if(document.getElementById("ytmd-pip-btn"))return;let _=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(_){let h=Q("button",{id:"ytmd-pip-btn",title:"Picture-in-Picture (Float Video)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),z=I("M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",20,20);h.appendChild(z),h.style.cssText=`
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
        `,h.addEventListener("mouseenter",()=>{h.style.color="#fafafa",h.style.backgroundColor="#27272a"}),h.addEventListener("mouseleave",()=>{h.style.color="#a1a1aa",h.style.backgroundColor="transparent"}),h.addEventListener("click",async()=>{let X=$.getVideoElement();if(!X)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await X.requestPictureInPicture();else await $.invoke("toggle_mini_player")}catch(H){console.warn("[YTMD PiP] Could not enter PiP:",H),await $.invoke("toggle_mini_player")}}),_.appendChild(h)}},Y=window.setInterval(b,1000);b(),c=()=>{clearInterval(Y),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(c)c(),c=null}};var A1=null,t=null,t1={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit($){let b=null,Y=!1,_=()=>{if(document.getElementById("ytmd-download-btn"))return;let z=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(z){let X=Q("button",{id:"ytmd-download-btn",title:"Download Track (MP3/FLAC with ID3 Tags & Lyrics)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),H=I("M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z",20,20);X.appendChild(H),X.style.cssText=`
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
        `,X.addEventListener("mouseenter",()=>{if(!Y)X.style.color="#fafafa",X.style.backgroundColor="#27272a"}),X.addEventListener("mouseleave",()=>{if(!Y)X.style.color="#a1a1aa",X.style.backgroundColor="transparent"}),X.addEventListener("click",async()=>{if(!b||!b.videoId||Y)return;Y=!0,X.style.color="#38bdf8",X.title="Downloading...";try{let N=$.config.download_format||"mp3",q=$.config.embed_lyrics!==!1;await $.invoke("download_track",{request:{video_id:b.videoId,title:b.title,artist:b.artist,album:b.album||void 0,cover_url:b.coverUrl||void 0,format:N,embed_lyrics:q}}),X.style.color="#22c55e",X.title="Downloaded!",setTimeout(()=>{Y=!1,X.style.color="#a1a1aa",X.title="Download Track"},3000)}catch(N){console.error("[YTMD Downloader] Download failed:",N),X.style.color="#ef4444",setTimeout(()=>{Y=!1,X.style.color="#a1a1aa",X.title="Download Track"},3000)}}),z.appendChild(X)}},h=window.setInterval(_,1000);_(),A1=(z)=>{b=z},t=()=>{clearInterval(h),document.getElementById("ytmd-download-btn")?.remove(),A1=null}},onTrackChange($){A1?.($)},onDestroy(){if(t)t(),t=null}};var r1={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit($){console.log("[YTMD] Local files module ready.")}};class e1{isHost=!1;inRoom=!1;lastBroadcastTimestamp=0;setRoomState($,b){this.inRoom=$,this.isHost=b}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback($,b){if(!this.inRoom||this.isHost||!b)return;let _=(Date.now()-$.timestamp_ms)/1000,h=$.is_playing?$.current_time_secs+Math.max(0,_):$.current_time_secs,z=new URLSearchParams(window.location.search).get("v");if($.video_id&&/^[A-Za-z0-9_-]{11}$/.test($.video_id)&&z!==$.video_id){console.log(`[YTMD Room Sync] Switching to track: ${$.video_id}`),window.location.href=`https://music.youtube.com/watch?v=${$.video_id}`;return}if($.is_playing&&b.paused)W.play();else if(!$.is_playing&&!b.paused)W.pause();let X=Math.abs(b.currentTime-h);if(X>1.5)console.log(`[YTMD Room Sync] Drift detected (${X.toFixed(2)}s). Resyncing to ${h.toFixed(1)}s...`),W.seekTo(h)}broadcastLocalState($,b,Y){if(!this.inRoom||!this.isHost||!$||!$.videoId||!b)return;let _=Date.now();if(_-this.lastBroadcastTimestamp<1000)return;this.lastBroadcastTimestamp=_,Y("broadcast_sync_state",{playback:{video_id:$.videoId,title:$.title,artist:$.artist,current_time_secs:b.currentTime,is_playing:!b.paused,timestamp_ms:Date.now()}}).catch(()=>{})}}var E=null,r=null,$0={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit($){let b=new e1;E=b;let Y=[];if(window.__TAURI__?.event)Y.push(window.__TAURI__.event.listen("sync-room-updated",(_)=>{b.setRoomState(!0,_.payload.is_host)}),window.__TAURI__.event.listen("sync-room-left",()=>{b.setRoomState(!1,!1)}),window.__TAURI__.event.listen("sync-playback-remote",(_)=>{b.handleRemotePlayback(_.payload,$.getVideoElement())}));r=()=>{Y.forEach((_)=>_.then((h)=>h())),E=null}},onTick($,b){if(E&&E.isInRoom()&&E.isRoomHost())E.broadcastLocalState(b.track,b.getVideoElement(),b.invoke)},onDestroy(){if(r)r(),r=null}};var e=null,L0=($,b,Y)=>$&&b&&!Y,b0={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Inhibits system sleep during active playback and auto-pauses when screen is locked",defaultEnabled:!0,onInit($){let b=null,Y=null,_=null,h=$.config.inhibit_sleep!==!1,z=async()=>{if(!h||b!==null)return;try{if("wakeLock"in navigator)b=await navigator.wakeLock.request("screen"),b.addEventListener("release",()=>{b=null});await $.invoke("set_inhibit_sleep",{inhibit:!0})}catch{}},X=async()=>{if(b!==null)try{await b.release(),b=null}catch{}await $.invoke("set_inhibit_sleep",{inhibit:!1})},H=(Z)=>{Z.addEventListener("play",z),Z.addEventListener("playing",z),Z.addEventListener("pause",X),Z.addEventListener("ended",X),_=Z},N=(Z)=>{Z.removeEventListener("play",z),Z.removeEventListener("playing",z),Z.removeEventListener("pause",X),Z.removeEventListener("ended",X)},q=$.getVideoElement();if(q)H(q);Y=window.setInterval(()=>{let Z=$.getVideoElement();if(Z&&Z!==_){if(_)N(_);H(Z)}},1000);let J=()=>{let Z=$.getVideoElement();if(!Z)return;if(L0(document.hidden,Boolean($.config.pause_on_lock),Z.paused))$.sendPlayerCommand("pause")};document.addEventListener("visibilitychange",J),e=()=>{if(Y!==null)clearInterval(Y),Y=null;if(_)N(_),_=null;document.removeEventListener("visibilitychange",J),X()}},onDestroy(){if(e)e(),e=null}};var Y0={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit($){window.__ytmd_show_remote_qr=()=>O1($),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}};async function O1($){document.getElementById("ytmd-remote-modal")?.remove();let b=Q("div",{id:"ytmd-remote-modal",style:`
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
    `}),Y=()=>{document.removeEventListener("keydown",_),b.remove()},_=(Z)=>{if(Z.key==="Escape")Y()};document.addEventListener("keydown",_);let h=Q("div",{style:`
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
    `}),z=Q("h3",{text:"Mobile Web Remote",style:"margin: 0 0 6px 0; font-size: 18px; font-weight: 700;"}),X=Q("p",{text:"Scan with your phone camera on the same Wi-Fi network:",style:"font-size: 13px; color: #a1a1aa; margin: 0 0 16px 0;"}),H=Q("div",{id:"ytmd-qr-container",style:`
      background: #ffffff;
      padding: 14px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      min-width: 180px;
      min-height: 180px;
    `}),N=Q("span",{text:"Generating QR code...",style:"color: #52525b; font-size: 12px; font-weight: 500;"});H.appendChild(N);let q=Q("div",{id:"ytmd-remote-url",style:"font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all; font-weight: 600;"}),J=Q("button",{id:"ytmd-remote-close-btn",text:"Close",style:"background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 24px; font-weight: 600; cursor: pointer; font-size: 13px;"});J.addEventListener("click",Y),b.addEventListener("click",(Z)=>{if(Z.target===b)Y()}),h.appendChild(z),h.appendChild(X),h.appendChild(H),h.appendChild(q),h.appendChild(J),b.appendChild(h),document.body.appendChild(b);try{let Z=await $.invoke("get_remote_info");if(!b.isConnected)return;if(Z&&Z.qr_svg){let j=Q("img");j.src=`data:image/svg+xml;utf8,${encodeURIComponent(Z.qr_svg)}`,j.width=180,j.height=180,j.style.display="block",j.alt="Mobile Remote QR Code",H.replaceChildren(j)}else H.replaceChildren(Q("span",{text:"Remote server starting...",style:"color: #71717a; font-size: 12px;"}));if(Z&&Z.url)q.textContent=Z.url}catch(Z){console.error("[YTMD Remote] Error fetching remote info:",Z)}}var m=null,m1=null,O=($,b={})=>{return new Promise((Y)=>{let _=window.__TAURI__;if(!_?.event?.emit){Y(null);return}let h=Math.random().toString(36).slice(2)+Date.now().toString(36),z=null,X=setTimeout(()=>{if(z)z();Y(null)},4000);_.event.listen(`ytmd-response-${h}`,(H)=>{if(clearTimeout(X),z)z();Y(H.payload)}).then((H)=>{z=H,_.event.emit("ytmd-invoke",{id:h,cmd:$,args:b})}).catch(()=>{clearTimeout(X),Y(null)})})};function E0(){if(document.getElementById("ytmd-burger-styles"))return;let $=document.createElement("style");$.id="ytmd-burger-styles",$.textContent=`
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
  `,document.head.appendChild($)}function _0($){if(document.getElementById("ytmd-burger-btn"))return;let b=document.querySelector("ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content"),Y=document.querySelector("ytmusic-nav-bar .left-content, ytmusic-nav-bar #left-content"),_=document.querySelector("ytmusic-nav-bar"),h=document.body||document.documentElement;if(!b&&!Y&&!h)return;E0();let z=Q("button",{id:"ytmd-burger-btn",title:"YTMD Menu (Ctrl+,)"}),X=I("M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",15,15),H=Q("span",{text:"YTMD"});z.appendChild(X),z.appendChild(H);let N=document.getElementById("ytmd-burger-popover");if(!N){N=Q("div",{id:"ytmd-burger-popover"});let q=(Z,j,C,D)=>{let G=Q("button",{className:"ytmd-burger-item"}),F=Q("span",{className:"ytmd-burger-item-left"}),U=Q("span",{className:"ytmd-burger-item-icon"});U.appendChild(u1(Z));let $1=Q("span",{text:j,className:"ytmd-burger-item-label"});F.appendChild(U),F.appendChild($1);let b1=Q("span",{text:C,className:"ytmd-burger-item-shortcut"});return G.appendChild(F),G.appendChild(b1),G.addEventListener("click",()=>{N?.classList.remove("ytmd-open"),D()}),G},J=()=>Q("div",{className:"ytmd-burger-divider"});N.appendChild(q('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',"Preferences & DSP EQ","Ctrl+,",()=>{O("toggle_settings_window")})),N.appendChild(q('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',"Local Music Library","",()=>{O("toggle_local_library_window")})),N.appendChild(q('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',"Listen Together (Sync)","",()=>{O("toggle_sync_window")})),N.appendChild(q('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',"Mobile Web Remote","",()=>{if(m1)O1(m1)})),N.appendChild(q('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><rect x="12" y="9" width="8" height="6" rx="1"/></svg>',"Mini Player","",()=>{O("toggle_mini_player")})),N.appendChild(J()),N.appendChild(q('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',"Download Current Track","",async()=>{if(!m||!m.videoId){alert("Please play a track first to download.");return}try{await O("download_track",{request:{video_id:m.videoId,title:m.title,artist:m.artist,album:m.album||void 0,cover_url:m.coverUrl||void 0,format:$.download_format||"mp3",embed_lyrics:$.embed_lyrics!==!1}}),alert(`Download started for: ${m.title}`)}catch(Z){console.error("[YTMD Download Error]:",Z)}})),document.body.appendChild(N),document.addEventListener("click",(Z)=>{if(N&&N.classList.contains("ytmd-open")){if(!N.contains(Z.target)&&!z.contains(Z.target))N.classList.remove("ytmd-open")}})}if(z.addEventListener("click",(q)=>{if(q.stopPropagation(),N){let J=z.getBoundingClientRect();N.style.top=`${J.bottom+8}px`,N.style.right=`${Math.max(16,window.innerWidth-J.right)}px`,N.style.left="auto",N.classList.toggle("ytmd-open")}}),b)b.prepend(z);else if(Y)Y.appendChild(z);else if(_)_.prepend(z);else z.style.position="fixed",z.style.top="12px",z.style.right="16px",h.appendChild(z)}var P0={adblock:["adblock_enabled",!0],sponsorblock:["sponsorblock_enabled",!0],lyrics:["lyrics_enabled",!0],notifications:["notifications_enabled",!1],web_remote:["remote_enabled",!0]};function h0($){let b={};for(let[Y,[_,h]]of Object.entries(P0)){let z=$[_];b[Y]=typeof z==="boolean"?z:h}return b}async function z0(){console.log("[YTMD] Initializing desktop integration bridge...");let $={};_0($);let b=setInterval(()=>_0($),1000);window.addEventListener("pagehide",()=>clearInterval(b));let Y=await O("get_config");if(Y&&typeof Y==="object")Object.assign($,Y);let _={track:null,config:$,invoke:O,sendPlayerCommand:(J)=>{N(J)},getVideoElement:()=>W.getVideo()};m1=_;let h=new J1(_);h.register(P1),h.register(B1),h.register(S1),h.register(g1),h.register(p1),h.register(v1),h.register(d1),h.register(n1),h.register(a1),h.register(c1),h.register(t1),h.register(r1),h.register($0),h.register(b0),h.register(Y0);try{await h.initAll(h0($))}catch(J){console.error("[YTMD] Registry init error:",J)}let z=new z1,X=0,H=Date.now();z.onTrackChange(async(J)=>{m=J,X=J.currentTimeSecs||0,H=Date.now(),h.handleTrackChange(J);try{await O("update_track_info",{track:{title:J.title,artist:J.artist,album:J.album||null,cover_url:J.coverUrl||null,duration_secs:Math.round(J.durationSecs||0),current_time_secs:Math.round(J.currentTimeSecs||0),is_playing:J.isPlaying,video_id:J.videoId||null}})}catch(Z){console.error("[YTMD] Failed to sync track info to backend:",Z)}}),z.onPlaybackChange(async(J)=>{h.handlePlaybackChange(J);let Z=z.getCurrentTrack();if(Z){Z.isPlaying=J,X=Z.currentTimeSecs||0,H=Date.now();try{await O("update_track_info",{track:{title:Z.title,artist:Z.artist,album:Z.album||null,cover_url:Z.coverUrl||null,duration_secs:Math.round(Z.durationSecs||0),current_time_secs:Math.round(Z.currentTimeSecs||0),is_playing:J,video_id:Z.videoId||null}})}catch(j){console.error("[YTMD] Failed to sync playback status:",j)}}}),z.onTick((J)=>{h.handleTick(J);let Z=z.getCurrentTrack();if(!Z||!Z.isPlaying)return;let j=Date.now(),C=(j-H)/1000,D=X+C;if(Math.abs(J-D)>2||C>=15)X=J,H=j,Z.currentTimeSecs=Math.round(J),O("update_track_info",{track:{title:Z.title,artist:Z.artist,album:Z.album||null,cover_url:Z.coverUrl||null,duration_secs:Math.round(Z.durationSecs||0),current_time_secs:Math.round(J),is_playing:!0,video_id:Z.videoId||null}}).catch((F)=>console.error("[YTMD] Failed to sync seek/progress to backend:",F))});function N(J){switch(J){case"play":W.play();break;case"pause":W.pause();break;case"play_pause":W.playPause();break;case"next":W.next();break;case"previous":W.previous();break;case"like":W.toggleLike();break;case"dislike":W.toggleDislike();break;case"mute":W.toggleMute();break}}let q=(J,Z)=>{let j=window.__TAURI__;if(j?.event?.listen)j.event.listen(J,(C)=>Z(C.payload))};q("player-command",(J)=>N(J)),q("tray-command",(J)=>N(J)),q("mpris-command",(J)=>N(J)),q("global-shortcut-event",(J)=>N(J)),q("player-seek",(J)=>W.seekTo(J)),q("mpris-command-seek",(J)=>W.seekTo(J)),q("player-volume",(J)=>W.setVolume(J)),q("config-updated",(J)=>{if(!J||typeof J!=="object")return;Object.assign($,J);let Z=h0($);for(let[j,C]of Object.entries(Z))if(C)h.enable(j).catch((D)=>console.error(`[YTMD] Failed to enable plugin ${j}:`,D));else h.disable(j).catch((D)=>console.error(`[YTMD] Failed to disable plugin ${j}:`,D))}),window.addEventListener("keydown",(J)=>{if(J.ctrlKey&&J.key===","||J.key==="F2")J.preventDefault(),O("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var B0=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(B0)if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>z0());else z0();
