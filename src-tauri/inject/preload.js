function c(_){let Y=_.trim().split(":").map(($)=>parseInt($,10));if(Y.some(($)=>isNaN($)))return 0;if(Y.length===2)return Y[0]*60+Y[1];else if(Y.length===3)return Y[0]*3600+Y[1]*60+Y[2];return 0}class g{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(_){this.onTrackChangeCallbacks.push(_)}onPlaybackChange(_){this.onPlaybackChangeCallbacks.push(_)}onTick(_){this.onTickCallbacks.push(_)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let z=navigator.mediaSession,D=z.metadata;try{Object.defineProperty(z,"metadata",{get:()=>D,set:(X)=>{D=X,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(X){}}let _=()=>{let z=document.querySelector("video");if(z)z.addEventListener("play",()=>this.handlePlaybackChange(!0)),z.addEventListener("playing",()=>this.handlePlaybackChange(!0)),z.addEventListener("pause",()=>this.handlePlaybackChange(!1)),z.addEventListener("ended",()=>this.handlePlaybackChange(!1)),z.addEventListener("timeupdate",()=>{let D=z.currentTime;this.onTickCallbacks.forEach((X)=>X(D))})},Y=!1,q=new MutationObserver(()=>{if(Y)return;Y=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),Y=!1})}),Z=document.querySelector("ytmusic-player-bar")||document.body;if(Z)q.observe(Z,{childList:!0,subtree:!0,characterData:!0});_(),this.tickInterval=window.setInterval(()=>{this.checkTrackUpdate();let z=document.querySelector("video");if(z&&!z.paused)this.onTickCallbacks.forEach((D)=>D(z.currentTime))},250)}extractTrackInfo(){let _=document.querySelector("video"),Y=document.getElementById("movie_player");if(Boolean(Y&&(typeof Y.getAdState==="function"&&Y.getAdState()===1||typeof Y.isAdPlaying==="function"&&Y.isAdPlaying()||Y.classList?.contains("ad-showing")||Y.classList?.contains("ad-interrupting"))))return null;let q=navigator.mediaSession?.metadata,Z=q?.title||"",z=q?.artist||"",D=q?.album||"",X="";if(q?.artwork&&q.artwork.length>0){let Q=q.artwork[q.artwork.length-1];if(Q&&Q.src)X=Q.src}if(!Z){let Q=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(Q)Z=Q.textContent?.trim()||""}if(!z){let Q=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(Q){let w=(Q.textContent?.trim()||"").split("•").map((W)=>W.trim());if(z=w[0]||"",w.length>1)D=w[1]}}if(!X){let Q=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(Q&&Q.src)X=Q.src}if(X.startsWith("//"))X=`https:${X}`;if(X.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(X))X=X.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let h=new URLSearchParams(window.location.search).get("v")||void 0,V=0,F=0;if(Y&&typeof Y.getDuration==="function"){let Q=Y.getDuration();if(typeof Q==="number"&&Number.isFinite(Q)&&Q>0)V=Math.floor(Q)}if(Y&&typeof Y.getCurrentTime==="function"){let Q=Y.getCurrentTime();if(typeof Q==="number"&&Number.isFinite(Q)&&Q>=0)F=Math.floor(Q)}if(!V&&_&&Number.isFinite(_.duration)&&_.duration>0)V=Math.floor(_.duration);if(!F&&_&&Number.isFinite(_.currentTime)&&_.currentTime>=0)F=Math.floor(_.currentTime);let G=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(G&&G.textContent){let Q=G.textContent.split("/").map((U)=>U.trim());if(Q.length===2){if(!F)F=c(Q[0]);if(!V)V=c(Q[1])}}if(!V){let U=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(U){let w=parseInt(U,10);if(!isNaN(w)&&w>0)V=w}}let N=_?!_.paused&&!_.ended:!1;if(!Z)return null;return{title:Z,artist:z||"Unknown Artist",album:D||void 0,coverUrl:X||void 0,durationSecs:V,currentTimeSecs:F,isPlaying:N,videoId:h}}checkTrackUpdate(){let _=this.extractTrackInfo();if(!_)return;let Y=!this.currentTrack||this.currentTrack.title!==_.title||this.currentTrack.artist!==_.artist||this.currentTrack.videoId!==_.videoId,$=this.currentTrack!==null&&(!this.currentTrack.durationSecs&&_.durationSecs>0||!this.currentTrack.coverUrl&&!!_.coverUrl||!this.currentTrack.album&&!!_.album||!this.currentTrack.videoId&&!!_.videoId),q=this.currentTrack!==null&&this.currentTrack.isPlaying!==_.isPlaying;if(this.currentTrack=_,Y||$){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((Z)=>Z(_))}if(q)this.onPlaybackChangeCallbacks.forEach((Z)=>Z(_.isPlaying))}handlePlaybackChange(_){if(_){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((Y)=>Y(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((Y)=>Y(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null}}class H{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let _=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(_){_.click();return}let Y=this.getVideo();if(Y)if(Y.paused)Y.play();else Y.pause()}static play(){let _=this.getVideo();if(_&&_.paused)this.playPause()}static pause(){let _=this.getVideo();if(_&&!_.paused)this.playPause()}static next(){let _=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(_)_.click()}static previous(){let _=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(_)_.click()}static seekTo(_){let Y=this.getVideo();if(Y&&!isNaN(_))Y.currentTime=Math.max(0,Math.min(_,Y.duration||_))}static setVolume(_){let Y=this.getVideo();if(Y)Y.volume=Math.max(0,Math.min(1,_))}static toggleLike(){let _=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(_)_.click()}static toggleDislike(){let _=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(_)_.click()}static toggleMute(){let _=document.querySelector("ytmusic-player-bar #volume-slider"),Y=this.getVideo();if(Y)Y.muted=!Y.muted;if(_){let $=_.parentElement?.querySelector("paper-icon-button, #button");if($)$.click()}}}class p{plugins=new Map;enabledPlugins=new Set;context;constructor(_){this.context=_}register(_){if(this.plugins.set(_.id,_),_.defaultEnabled)this.enabledPlugins.add(_.id)}async initAll(_){for(let[Y,$]of this.plugins)if(_?.[Y]!==void 0?_[Y]:$.defaultEnabled){if(this.enabledPlugins.add(Y),$.onInit)try{await $.onInit(this.context)}catch(Z){console.error(`[YTMD] Failed to init plugin ${Y}:`,Z)}}else this.enabledPlugins.delete(Y)}async enable(_){let Y=this.plugins.get(_);if(Y&&!this.enabledPlugins.has(_)){if(this.enabledPlugins.add(_),Y.onInit)await Y.onInit(this.context)}}async disable(_){let Y=this.plugins.get(_);if(Y&&this.enabledPlugins.has(_)){if(this.enabledPlugins.delete(_),Y.onDestroy)await Y.onDestroy()}}handleTrackChange(_){this.context.track=_;for(let Y of this.enabledPlugins){let $=this.plugins.get(Y);if($?.onTrackChange)try{$.onTrackChange(_,this.context)}catch(q){console.error(`[YTMD] Error in plugin ${Y} onTrackChange:`,q)}}}handlePlaybackChange(_){for(let Y of this.enabledPlugins){let $=this.plugins.get(Y);if($?.onPlaybackChange)try{$.onPlaybackChange(_,this.context)}catch(q){console.error(`[YTMD] Error in plugin ${Y} onPlaybackChange:`,q)}}}handleTick(_){for(let Y of this.enabledPlugins){let $=this.plugins.get(Y);if($?.onTick)try{$.onTick(_,this.context)}catch(q){console.error(`[YTMD] Error in plugin ${Y} onTick:`,q)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(_){return this.enabledPlugins.has(_)}}var r={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Blocks audio/video ads, auto-skips pre-rolls, and dismisses premium upsell banners",defaultEnabled:!0,onInit(_){if(typeof document>"u")return;let Y=null,$=!1,q=!1,Z=()=>{let X=_.getVideoElement(),J=document.getElementById("movie_player");if(Boolean(J&&(typeof J.getAdState==="function"&&J.getAdState()===1||typeof J.isAdPlaying==="function"&&J.isAdPlaying()||J.classList?.contains("ad-showing")||J.classList?.contains("ad-interrupting")))){try{if(J&&typeof J.skipAd==="function")J.skipAd(!0)}catch(G){}if(document.querySelectorAll(".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button, .ytp-ad-overlay-close-button").forEach((G)=>G.click()),X){if(!$)q=X.muted;X.muted=!0,$=!0}}else if($){if(X)X.muted=q;$=!1}document.querySelectorAll("ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)").forEach((F)=>{F.style.display="none";let G=F.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(G)G.click()})},z=document.createElement("style");z.id="ytmd-adblock-styles",z.textContent=`
      .ad-showing video,
      .ad-interrupting video,
      .ytp-ad-player-overlay,
      .ytp-ad-overlay-container,
      .ytp-ad-module,
      ytmusic-mealbar-promo-renderer,
      ytmusic-upsell-dialog-renderer,
      .ytmusic-popup-container:has(ytmusic-upsell-dialog-renderer),
      ytmusic-guide-entry-renderer:has(path[d*="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93"]),
      #premium-badge,
      .companion-ad-container {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }
    `,document.head.appendChild(z),(()=>{let X=_.getVideoElement();if(X)X.addEventListener("timeupdate",Z),X.addEventListener("play",Z),X.addEventListener("loadedmetadata",Z)})(),Y=window.setInterval(Z,100),this._cleanup=()=>{if(Y)clearInterval(Y);let X=document.getElementById("ytmd-adblock-styles");if(X)X.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var e={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){this._segments=[],this._lastVideoId="",this._skippedSegments=new Set},onTrackChange(_){if(!_.videoId||_.videoId===this._lastVideoId)return;let Y=_.videoId;this._lastVideoId=Y,this._segments=[],this._skippedSegments=new Set;let $=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),q=`https://sponsor.ajay.app/api/skipSegments?videoID=${Y}&categories=${encodeURIComponent($)}`;fetch(q,{signal:AbortSignal.timeout(3000)}).then(async(Z)=>{if(Z.ok&&this._lastVideoId===Y){let z=await Z.json();this._segments=z,console.log(`[YTMD SponsorBlock] Loaded ${z.length} segments for ${Y}`)}}).catch(()=>{})},onTick(_,Y){let $=this._segments;if(!$||$.length===0)return;let q=this._skippedSegments;for(let Z of $){let[z,D]=Z.segment;if(_>=z&&_<D-0.5&&!q.has(Z.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${Z.category}): ${z}s -> ${D}s`);let X=Y.getVideoElement();if(X)X.currentTime=D,q.add(Z.UUID);break}}}};function T(_,Y=18,$=18,q="0 0 24 24"){let Z=document.createElementNS("http://www.w3.org/2000/svg","svg");Z.setAttribute("width",String(Y)),Z.setAttribute("height",String($)),Z.setAttribute("viewBox",q),Z.setAttribute("fill","currentColor");let z=document.createElementNS("http://www.w3.org/2000/svg","path");return z.setAttribute("d",_),Z.appendChild(z),Z}var _0="http://www.w3.org/2000/svg",I0="circle|path|rect|line|polyline|polygon|g|ellipse";function Y0(_){let Y=document.createElementNS(_0,"svg"),$=(z,D)=>{for(let X of D.matchAll(/([\w:-]+)="([^"]*)"/g))z.setAttribute(X[1],X[2])},q=_.match(/^<svg([^>]*)>/);if(q)$(Y,q[1]);let Z=new RegExp(`<(${I0})([^>]*)\\/?>`,"g");for(let z of _.matchAll(Z)){let D=document.createElementNS(_0,z[1]);$(D,z[2]),Y.appendChild(D)}return Y}function M(_,Y){let $=document.createElement(_);if(Y?.id)$.id=Y.id;if(Y?.className)$.className=Y.className;if(Y?.text!==void 0)$.textContent=Y.text;if(Y?.title)$.title=Y.title;if(Y?.style)$.style.cssText=Y.style;return $}var I=[],P=-1,E=null,C="",u="",z0={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(_){I=[],P=-1,E=null,C="",u="";let Y=document.createElement("style");Y.id="ytmd-native-lyrics-styles",Y.textContent=`
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
    `,document.head.appendChild(Y);let $=()=>{B(),$0(_)},q=()=>{setTimeout(()=>{B(),n()},50),setTimeout(()=>{n()},250)};document.addEventListener("click",q,!0);let Z=window.setInterval($,600);$(),this._cleanup=()=>{clearInterval(Z),document.removeEventListener("click",q,!0),Y.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((D)=>D.remove())}},async onTrackChange(_,Y){let $=`${_.title} - ${_.artist}`;if(C===$&&I.length>0||u===$)return;C=$,u=$,I=[],P=-1,E=null,B();let q=document.getElementById("ytmd-native-lyrics-wrapper");if(q)q.replaceChildren(M("div",{className:"ytmd-native-lyrics-status",text:"Loading synchronized lyrics..."}));try{let Z=await Y.invoke("fetch_lyrics",{artist:_.artist,title:_.title,albumName:_.album||null,duration:_.durationSecs||null});if(C!==$)return;if(E=Z,Z?.syncedLyrics)I=K0(Z.syncedLyrics);B(),$0(Y),J0(Y)}catch{if(C===$&&q)q.replaceChildren(M("div",{className:"ytmd-native-lyrics-status",text:"No lyrics available for this track."}))}finally{if(u===$)u=""}},onTick(_){if(!I||I.length===0)return;let Y=f(C),$=_+Y,q=-1;for(let Z=0;Z<I.length;Z++)if($>=I[Z].timeSecs)q=Z;else break;if(q!==P&&q>=0){P=q;let Z=document.getElementById("ytmd-native-lyrics-wrapper");if(Z){let z=Z.querySelectorAll(".ytmd-native-lyric-line");z.forEach((X,J)=>{if(J===q)X.classList.add("active");else X.classList.remove("active")});let D=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(D&&b0(D)){let X=z[q];if(X)X.scrollIntoView({behavior:"smooth",block:"nearest"})}}}},onDestroy(){if(this._cleanup)this._cleanup()}},q0=new Map;function f(_){return q0.get(_)||0}function d(_,Y){q0.set(_,Y)}function b0(_){if(!_||_.offsetParent===null||_.hasAttribute("hidden"))return!1;let Y=window.getComputedStyle(_);return Y.display!=="none"&&Y.visibility!=="hidden"&&Y.opacity!=="0"}function B(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((Y)=>{let $=Y.textContent?.toLowerCase()||"";if($.includes("tekst")||$.includes("lyrics")||$.includes("paroles")||$.includes("letras")){Y.disabled=!1,Y.removeAttribute("disabled"),Y.removeAttribute("aria-disabled"),Y.classList.remove("disabled"),Y.classList.add("ytmd-lyrics-tab-unlocked"),Y.style.pointerEvents="auto",Y.style.cursor="pointer";let q={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!Y.endpoint)Y.endpoint=q;if(Y.data&&!Y.data.endpoint)Y.data.endpoint=q}})}function O0(){let _=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let $ of Array.from(_)){let q=$.textContent?.toLowerCase()||"";if(q.includes("tekst")||q.includes("lyrics")||q.includes("paroles")||q.includes("letras")){if($.classList.contains("iron-selected")||$.getAttribute("aria-selected")==="true"||$.classList.contains("selected"))return!0}}let Y=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(Y){if((Y.classList.contains("iron-selected")||!Y.hasAttribute("hidden"))&&Y.getAttribute("aria-hidden")!=="true")return!0}return!1}function n(){let _=document.getElementById("ytmd-native-lyrics-wrapper");if(!_)return;let Y=O0();_.style.setProperty("display",Y?"flex":"none","important")}function $0(_){let Y=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!Y)return;let $=document.getElementById("ytmd-native-lyrics-wrapper");if(!$||!Y.contains($)){if(!$)$=M("div",{id:"ytmd-native-lyrics-wrapper"});Y.appendChild($),J0(_)}n()}function J0(_){let Y=document.getElementById("ytmd-native-lyrics-wrapper");if(!Y)return;if(I&&I.length>0){let $=f(C),q=M("div",{className:"ytmd-native-lyrics-sync-bar"}),Z=M("span",{className:"ytmd-sync-label",text:"Sync:"}),z=M("button",{className:"ytmd-sync-btn",text:"-0.5s",title:"Shift lyrics 0.5s earlier"}),D=M("span",{className:"ytmd-sync-val",text:`${$>=0?"+":""}${$.toFixed(1)}s`}),X=M("button",{className:"ytmd-sync-btn",text:"+0.5s",title:"Shift lyrics 0.5s later"}),J=M("button",{className:"ytmd-sync-btn",text:"Reset",title:"Reset offset to 0.0s"});z.addEventListener("click",()=>{let h=Math.round((f(C)-0.5)*10)/10;d(C,h),D.textContent=`${h>=0?"+":""}${h.toFixed(1)}s`}),X.addEventListener("click",()=>{let h=Math.round((f(C)+0.5)*10)/10;d(C,h),D.textContent=`${h>=0?"+":""}${h.toFixed(1)}s`}),J.addEventListener("click",()=>{d(C,0),D.textContent="+0.0s"}),q.appendChild(Z),q.appendChild(z),q.appendChild(D),q.appendChild(X),q.appendChild(J),Y.replaceChildren(...I.map((h,V)=>{let F=M("div",{className:`ytmd-native-lyric-line${V===P?" active":""}`,text:h.text});return F.addEventListener("click",()=>{let G=_.getVideoElement();if(G){let N=f(C);G.currentTime=Math.max(0,h.timeSecs-N)}}),F}),q,M("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else if(E?.plainLyrics){let $=E.plainLyrics.split(`
`);Y.replaceChildren(...$.map((q)=>M("div",{className:"ytmd-native-lyric-line active",text:q,style:"cursor: default;"})),M("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else Y.replaceChildren(M("div",{className:"ytmd-native-lyrics-status",text:"Synced lyrics unavailable for this track."}))}function K0(_){let Y=_.split(`
`),$=[],q=0,Z=/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g,z=/\[offset:\s*([+-]?\d+)\s*\]/i;for(let D of Y){let X=D.trim();if(!X)continue;let J=z.exec(X);if(J){let F=parseInt(J[1],10);if(!isNaN(F))q=F/1000;continue}let h=[],V;Z.lastIndex=0;while((V=Z.exec(X))!==null){let F=parseInt(V[1],10),G=parseInt(V[2],10),N=0;if(V[3])N=parseInt(V[3].padEnd(3,"0").slice(0,3),10);h.push(F*60+G+N/1000)}if(h.length>0){let F=X.replace(Z,"").trim();if(F)for(let G of h)$.push({timeSecs:Math.max(0,G-q),text:F})}}return $.sort((D,X)=>D.timeSecs-X.timeSecs)}var X0={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit(_){let Y=($)=>{let q=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!q)return;let Z=q.getBoundingClientRect();if($.clientX>=Z.left&&$.clientX<=Z.right&&$.clientY>=Z.top&&$.clientY<=Z.bottom){$.preventDefault();let z=_.getVideoElement();if(z){let D=_.config.wheel_volume_step||0.05,X=$.deltaY<0?D:-D,J=Math.max(0,Math.min(1,z.volume+X));z.volume=J}}};window.addEventListener("wheel",Y,{passive:!1}),this._cleanup=()=>{window.removeEventListener("wheel",Y)}},onDestroy(){if(this._cleanup)this._cleanup()}};var Z0={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(_,Y){if(!Y.config?.notifications_enabled)return;if(!_.title||_.title==="No Track Playing")return;try{await Y.invoke("notify_track_change",{title:_.title,artist:_.artist})}catch($){console.warn("[YTMD] Notification dispatch failed:",$)}}};var D0={id:"visualizer",name:"Modern Clean Theme & Custom CSS",description:"Applies sleek dark aesthetics, subtle scrollbars, and user-defined custom CSS",defaultEnabled:!0,onInit(_){let Y=document.createElement("style");Y.id="ytmd-theme-styles";let $=_.config.custom_css||"",q=`
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
    `;Y.textContent=`${q}
${$}`,document.head.appendChild(Y),this._cleanup=()=>{Y.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var v=[32,64,125,250,500,1000,2000,4000,8000,16000],l={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function x(_){return Math.max(-12,Math.min(12,_))}class j{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;static getInstance(){if(!j.instance)j.instance=new j;return j.instance}init(_){if(this.isInitialized&&this.hookedVideo===_){this.resumeContext();return}try{let Y=window.AudioContext||window.webkitAudioContext;if(!Y){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new Y,this.hookedVideo=_,this.sourceNode=this.audioCtx.createMediaElementSource(_),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=v.map((q,Z)=>{if(!this.audioCtx)throw Error("AudioContext missing");let z=this.audioCtx.createBiquadFilter();if(Z===0)z.type="lowshelf";else if(Z===v.length-1)z.type="highshelf";else z.type="peaking",z.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return z.frequency.setValueAtTime(q,this.audioCtx.currentTime),z.gain.setValueAtTime(0,this.audioCtx.currentTime),z}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph();let $=()=>this.resumeContext();_.addEventListener("play",$),_.addEventListener("playing",$),document.addEventListener("click",$,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(Y){console.error("[YTMD DSP] Failed to initialize AudioEngine:",Y)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((Y)=>Y.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let _=this.sourceNode;if(this.isNormalizing)_.connect(this.compressorNode),_=this.compressorNode;for(let Y of this.filters)_.connect(Y),_=Y;_.connect(this.preampNode),_=this.preampNode,_.connect(this.fadeNode),_=this.fadeNode,_.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(_){console.error("[YTMD DSP] Graph rebuild error:",_)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(_,Y){if(_<0||_>=this.filters.length||!this.audioCtx)return;let $=x(Y);this.filters[_].gain.setValueAtTime($,this.audioCtx.currentTime)}setAllGains(_){if(!this.audioCtx)return;_.forEach((Y,$)=>{if($<this.filters.length)this.filters[$].gain.setValueAtTime(x(Y),this.audioCtx.currentTime)})}setPreamp(_){if(!this.preampNode||!this.audioCtx)return;let Y=Math.pow(10,x(_)/20);this.preampNode.gain.setValueAtTime(Y,this.audioCtx.currentTime)}setLoudnessNormalization(_){if(this.isNormalizing!==_)this.isNormalizing=_,this.rebuildGraph()}applyPreset(_){let Y=l[_]||l.flat;if(this.setAllGains(Y.gains),Y.preamp!==void 0)this.setPreamp(Y.preamp);return Y.gains}fadeIn(_){if(!this.fadeNode||!this.audioCtx||_<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let Y=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(Y),this.fadeNode.gain.setValueAtTime(0.001,Y),this.fadeNode.gain.linearRampToValueAtTime(1,Y+_)}fadeOut(_){if(!this.fadeNode||!this.audioCtx||_<=0)return;let Y=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(Y),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,Y),this.fadeNode.gain.linearRampToValueAtTime(0.001,Y+_)}resetFade(){if(this.fadeNode&&this.audioCtx){let _=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(_),this.fadeNode.gain.setValueAtTime(1,_)}}getAudioPowerDb(){if(!this.analyserNode)return-100;let _=new Float32Array(this.analyserNode.fftSize);this.analyserNode.getFloatTimeDomainData(_);let Y=0;for(let q=0;q<_.length;q++)Y+=_[q]*_[q];let $=Math.sqrt(Y/_.length);if($<=0.00001)return-100;return 20*Math.log10($)}getFrequencyData(){if(!this.analyserNode)return null;let _=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(_),_}setPlaybackRate(_){let Y=Math.max(0.5,Math.min(2,_));if(this.hookedVideo)this.hookedVideo.playbackRate=Y}setPreservesPitch(_){if(this.hookedVideo)this.hookedVideo.preservesPitch=_,this.hookedVideo.mozPreservesPitch=_,this.hookedVideo.webkitPreservesPitch=_}}class o{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";setCrossfadeSeconds(_){this.crossfadeSeconds=Math.max(0,Math.min(12,_))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(_){if(this.fadeOutTriggered=!1,this.currentTrackId=_.videoId||`${_.title}-${_.artist}`,this.crossfadeSeconds>0)j.getInstance().fadeIn(this.crossfadeSeconds);else j.getInstance().resetFade()}onTick(_,Y){if(!Y||this.crossfadeSeconds<=0||Y.durationSecs<=0)return;let $=Y.durationSecs-_;if($<=this.crossfadeSeconds&&!this.fadeOutTriggered&&$>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${$.toFixed(1)}s remaining)...`),j.getInstance().fadeOut($),setTimeout(()=>{let q=Y.videoId||`${Y.title}-${Y.artist}`;if(this.currentTrackId===q)console.log("[YTMD Crossfade] Advancing to next track..."),H.next()},Math.max(100,($-0.2)*1000))}}class s{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(_){this.enabled=_}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(_,Y,$){if(!this.enabled||!Y||!$||$.paused||$.ended)return;let q=j.getInstance().getAudioPowerDb();if(!this.checkedIntro&&_<15)if(q<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&_<12)console.log(`[YTMD Skip Silence] Intro silence detected (${q.toFixed(1)} dB). Fast forwarding...`),$.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(Y.durationSecs>15&&_>Y.durationSecs-10)if(q<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${q.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,H.next()}else this.consecutiveSilentTicks=0}}var h0={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(_){let Y=_.getVideoElement(),$=j.getInstance(),q=new o,Z=new s;this._crossfade=q,this._skipSilence=Z;let z=_.config;if(Boolean(z.equalizer_enabled||z.loudness_normalization||z.equalizer_gains&&Array.isArray(z.equalizer_gains)&&z.equalizer_gains.some((X)=>X!==0)))if(Y)$.init(Y);else{let X=setInterval(()=>{let J=_.getVideoElement();if(J)clearInterval(X),$.init(J)},500)}if(z.equalizer_gains&&Array.isArray(z.equalizer_gains))$.setAllGains(z.equalizer_gains);else if(z.equalizer_preset&&typeof z.equalizer_preset==="string")$.applyPreset(z.equalizer_preset);if(z.preamp_gain!==void 0)$.setPreamp(z.preamp_gain);if(z.loudness_normalization!==void 0)$.setLoudnessNormalization(Boolean(z.loudness_normalization));if(z.crossfade_seconds!==void 0)q.setCrossfadeSeconds(z.crossfade_seconds);if(z.skip_silence_enabled!==void 0)Z.setEnabled(Boolean(z.skip_silence_enabled));if(z.playback_speed!==void 0)$.setPlaybackRate(z.playback_speed);if(z.preserve_pitch!==void 0)$.setPreservesPitch(Boolean(z.preserve_pitch));if(window.__TAURI__?.event){let{listen:X}=window.__TAURI__.event;X("set-eq-band",(J)=>{$.setBandGain(J.payload.bandIndex,J.payload.gain)}),X("set-eq-all",(J)=>{$.setAllGains(J.payload.gains)}),X("set-eq-preset",(J)=>{$.applyPreset(J.payload)}),X("set-preamp",(J)=>{$.setPreamp(J.payload)}),X("set-loudness-normalization",(J)=>{$.setLoudnessNormalization(J.payload)}),X("set-crossfade-seconds",(J)=>{q.setCrossfadeSeconds(J.payload)}),X("set-skip-silence",(J)=>{Z.setEnabled(J.payload)}),X("set-playback-rate",(J)=>{$.setPlaybackRate(J.payload)}),X("set-preserves-pitch",(J)=>{$.setPreservesPitch(J.payload)})}console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(_){let Y=this._crossfade,$=this._skipSilence;if(Y)Y.onTrackChange(_);if($)$.onTrackChange()},onTick(_,Y){let $=this._crossfade,q=this._skipSilence;if($)$.onTick(_,Y.track);if(q)q.onTick(_,Y.track,Y.getVideoElement())}};async function F0(_){return new Promise((Y)=>{let $={primary:"#18181b",secondary:"#09090b",accent:"#dc2626"};if(!_){Y($);return}let q=new Image;q.crossOrigin="anonymous",q.onload=()=>{try{let Z=document.createElement("canvas");Z.width=16,Z.height=16;let z=Z.getContext("2d");if(!z){Y($);return}z.drawImage(q,0,0,16,16);let D=z.getImageData(0,0,16,16).data,X=0,J=0,h=0,V=0,F=0,G=0,N=0,Q=0;for(let O=0;O<D.length;O+=4){let y=D[O],k=D[O+1],S=D[O+2];if(D[O+3]<128)continue;let t=(y+k+S)/3;if(t<20||t>240)continue;if(O<D.length/2)X+=y,J+=k,h+=S,V++;else F+=y,G+=k,N+=S,Q++}if(V===0&&Q===0){Y($);return}let U=V>0?Math.round(X/V):220,w=V>0?Math.round(J/V):38,W=V>0?Math.round(h/V):38,L=Q>0?Math.round(F/Q):24,R=Q>0?Math.round(G/Q):24,m=Q>0?Math.round(N/Q):27;Y({primary:`rgb(${U}, ${w}, ${W})`,secondary:`rgb(${L}, ${R}, ${m})`,accent:`rgb(${Math.min(255,U+30)}, ${Math.min(255,w+30)}, ${Math.min(255,W+30)})`})}catch{Y($)}},q.onerror=()=>Y($),q.src=_})}var M0={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Smoothly diffuses dynamic, reactive ambient colors from the active album cover behind the player",defaultEnabled:!0,onInit(_){let Y=document.getElementById("ytmd-ambient-backdrop");if(!Y)Y=document.createElement("div"),Y.id="ytmd-ambient-backdrop",document.body.prepend(Y);let $=typeof _.config.ambient_intensity==="number"?_.config.ambient_intensity:0.6,q=_.config.ambient_lighting_enabled!==!1,Z=document.createElement("style");Z.id="ytmd-ambient-styles",Z.textContent=`
      #ytmd-ambient-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 0;
        opacity: ${q?$:0};
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
    `,document.head.appendChild(Z);let z=M("div",{id:"ytmd-orb-1",className:"ytmd-ambient-orb"}),D=M("div",{id:"ytmd-orb-2",className:"ytmd-ambient-orb"});if(Y.appendChild(z),Y.appendChild(D),this._setIntensity=(X)=>{if(Y)Y.style.opacity=String(X)},window.__TAURI__?.event)window.__TAURI__.event.listen("set-ambient-intensity",(X)=>{this._setIntensity(X.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(X)=>{this._setIntensity(X.payload?0.6:0)});if(_.track)this.onTrackChange(_.track,_)},async onTrackChange(_){if(!_.coverUrl)return;try{let Y=await F0(_.coverUrl),$=document.getElementById("ytmd-ambient-backdrop");if($)$.style.background=`
          radial-gradient(circle at 80% 20%, ${Y.primary}66 0%, transparent 60%),
          radial-gradient(circle at 20% 80%, ${Y.secondary}66 0%, transparent 60%)
        `}catch{}}};function R0(_){return`
      html {
        --ytmusic-background: ${_.background} !important;
        --yt-sys-color-baseline--base-background: ${_.background} !important;

        --ytmusic-brand-background-solid: ${_.surface} !important;
        --yt-sys-color-baseline--raised-background: ${_.surface} !important;
        --yt-sys-color-baseline--menu-background: ${_.surface} !important;
        --paper-menu-background-color: ${_.surface} !important;
        --paper-dialog-background-color: ${_.surface} !important;
        --yt-live-chat-dialog-background-color: ${_.surface} !important;
        --ytmusic-badge-chip-background: ${_.surface} !important;
        --ytmusic-explore-chip-background: ${_.surface} !important;

        --ytmusic-call-to-action: ${_.accent} !important;
        --yt-sys-color-baseline--call-to-action: ${_.accent} !important;
        --yt-sys-color-baseline--call-to-action-inverse: ${_.accent} !important;
        --yt-sys-color-baseline--overlay-call-to-action: ${_.accent} !important;
        --yt-sys-color-baseline--call-to-action-hover: ${_.accentHover} !important;
        --yt-sys-color-baseline--overlay-call-to-action-hover: ${_.accentHover} !important;
        --paper-input-container-focus-color: ${_.accent} !important;
      }

      /* Only the true root canvas is forced opaque here. ytmusic-app-layout,
         #browse-page and ytmusic-browse-response are transparent by default
         in YouTube Music's own CSS (they already show html/body through), and
         forcing them opaque here would fight the ambient lighting plugin's
         own transparency rule for those same selectors and block the glow. */
      html, body {
        background-color: ${_.background} !important;
      }
      ytmusic-nav-bar, ytmusic-player-bar, ytmusic-player-page {
        background: ${_.surface} !important;
        border-color: ${_.border} !important;
      }
      ytmusic-guide-renderer {
        background-color: ${_.background} !important;
        border-right: 1px solid ${_.border} !important;
      }
      tp-yt-paper-slider #primaryProgress.tp-yt-paper-slider {
        background-color: ${_.accent} !important;
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

    `}var T0=[{id:"default",name:"Modern Dark",background:"#0f0f0f",surface:"#121215",border:"#27272a",accent:"#3ea6ff",accentHover:"#65b8ff"},{id:"oled",name:"Pure OLED Black",background:"#000000",surface:"#0a0a0a",border:"#1a1a1a",accent:"#3ea6ff",accentHover:"#65b8ff"},{id:"nord",name:"Nord Arctic",background:"#2e3440",surface:"#3b4252",border:"#434c5e",accent:"#88c0d0",accentHover:"#a3d0dd"},{id:"catppuccin",name:"Catppuccin Mocha",background:"#1e1e2e",surface:"#181825",border:"#313244",accent:"#cba6f7",accentHover:"#dbc2fa"},{id:"gruvbox",name:"Gruvbox Dark",background:"#282828",surface:"#1d2021",border:"#3c3836",accent:"#fe8019",accentHover:"#fe9a4d"},{id:"tokyo_night",name:"Tokyo Night",background:"#1a1b26",surface:"#16161e",border:"#292e42",accent:"#7aa2f7",accentHover:"#9ab8f9"},{id:"dracula",name:"Dracula",background:"#282a36",surface:"#21222c",border:"#44475a",accent:"#bd93f9",accentHover:"#cfb0fb"},{id:"rose_pine",name:"Rosé Pine",background:"#191724",surface:"#1f1d2e",border:"#26233a",accent:"#eb6f92",accentHover:"#f08daa"}],A=Object.fromEntries(T0.map((_)=>[_.id,{id:_.id,name:_.name,css:R0(_)}]));var Q0={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Applies curated aesthetic themes and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(_){let Y=()=>document.head||document.documentElement,$=(X)=>{let J=document.getElementById(X);if(!J){J=document.createElement("style"),J.id=X;let h=Y();if(h)h.appendChild(J)}return J},q=(X)=>{let J=A[X]||A.default,h=$("ytmd-active-theme");if(h)h.textContent=J.css},Z=(X)=>{let J=$("ytmd-custom-css");if(J)J.textContent=X},z=_.config.theme_preset||_.config.theme||"default";q(z);let D=_.config.custom_css||"";if(Z(D),window.__TAURI__?.event)window.__TAURI__.event.listen("set-theme-preset",(X)=>{q(X.payload)}),window.__TAURI__.event.listen("set-custom-css",(X)=>{Z(X.payload)});console.log("[YTMD] Theme engine active.")}};var V0={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(_){let Y=()=>{if(document.getElementById("ytmd-pip-btn"))return;let $=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if($){let q=M("button",{id:"ytmd-pip-btn",title:"Picture-in-Picture (Float Video)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),Z=T("M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",20,20);q.appendChild(Z),q.style.cssText=`
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
        `,q.addEventListener("mouseenter",()=>{q.style.color="#fafafa",q.style.backgroundColor="#27272a"}),q.addEventListener("mouseleave",()=>{q.style.color="#a1a1aa",q.style.backgroundColor="transparent"}),q.addEventListener("click",async()=>{let z=_.getVideoElement();if(!z)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await z.requestPictureInPicture();else await _.invoke("toggle_mini_player")}catch(D){console.warn("[YTMD PiP] Could not enter PiP:",D),await _.invoke("toggle_mini_player")}}),$.appendChild(q)}};setInterval(Y,1000),Y()}};var G0={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(_){let Y=null,$=!1,q=()=>{if(document.getElementById("ytmd-download-btn"))return;let Z=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(Z){let z=M("button",{id:"ytmd-download-btn",title:"Download Track (MP3/FLAC with ID3 Tags & Lyrics)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),D=T("M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z",20,20);z.appendChild(D),z.style.cssText=`
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
        `,z.addEventListener("mouseenter",()=>{if(!$)z.style.color="#fafafa",z.style.backgroundColor="#27272a"}),z.addEventListener("mouseleave",()=>{if(!$)z.style.color="#a1a1aa",z.style.backgroundColor="transparent"}),z.addEventListener("click",async()=>{if(!Y||!Y.videoId||$)return;$=!0,z.style.color="#38bdf8",z.title="Downloading...";try{let X=_.config.download_format||"mp3",J=_.config.embed_lyrics!==!1;await _.invoke("download_track",{request:{video_id:Y.videoId,title:Y.title,artist:Y.artist,album:Y.album||void 0,cover_url:Y.coverUrl||void 0,format:X,embed_lyrics:J}}),z.style.color="#22c55e",z.title="Downloaded!",setTimeout(()=>{$=!1,z.style.color="#a1a1aa",z.title="Download Track"},3000)}catch(X){console.error("[YTMD Downloader] Download failed:",X),z.style.color="#ef4444",setTimeout(()=>{$=!1,z.style.color="#a1a1aa",z.title="Download Track"},3000)}}),Z.appendChild(z)}};setInterval(q,1000),q(),this._setCurrentTrack=(Z)=>{Y=Z}},onTrackChange(_){if(this._setCurrentTrack)this._setCurrentTrack(_)}};var H0={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(_){console.log("[YTMD] Local files module ready.")}};class N0{isHost=!1;inRoom=!1;lastAppliedTimestamp=0;setRoomState(_,Y){this.inRoom=_,this.isHost=Y}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback(_,Y){if(!this.inRoom||this.isHost||!Y)return;let $=Date.now(),q=($-_.timestamp_ms)/1000,Z=_.is_playing?_.current_time_secs+Math.max(0,q):_.current_time_secs;this.lastAppliedTimestamp=$;let z=new URLSearchParams(window.location.search).get("v");if(_.video_id&&z!==_.video_id){console.log(`[YTMD Room Sync] Switching to track: ${_.video_id}`),window.location.href=`https://music.youtube.com/watch?v=${_.video_id}`;return}if(_.is_playing&&Y.paused)H.play();else if(!_.is_playing&&!Y.paused)H.pause();let D=Math.abs(Y.currentTime-Z);if(D>1.5)console.log(`[YTMD Room Sync] Drift detected (${D.toFixed(2)}s). Resyncing to ${Z.toFixed(1)}s...`),H.seekTo(Z)}broadcastLocalState(_,Y,$){if(!this.inRoom||!this.isHost||!_||!_.videoId||!Y)return;if(Date.now()-this.lastAppliedTimestamp<1000)return;$("broadcast_sync_state",{playback:{video_id:_.videoId,title:_.title,artist:_.artist,current_time_secs:Y.currentTime,is_playing:!Y.paused,timestamp_ms:Date.now()}}).catch(()=>{})}}var W0={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(_){let Y=new N0;if(this._controller=Y,window.__TAURI__?.event)window.__TAURI__.event.listen("sync-room-updated",($)=>{Y.setRoomState(!0,$.payload.is_host)}),window.__TAURI__.event.listen("sync-room-left",()=>{Y.setRoomState(!1,!1)}),window.__TAURI__.event.listen("sync-playback-remote",($)=>{Y.handleRemotePlayback($.payload,_.getVideoElement())})},onTick(_,Y){let $=this._controller;if($&&$.isInRoom()&&$.isRoomHost())$.broadcastLocalState(Y.track,Y.getVideoElement(),Y.invoke)}};var U0={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Inhibits system sleep during active playback and auto-pauses when screen is locked",defaultEnabled:!0,onInit(_){let Y=null,$=_.config.inhibit_sleep!==!1,q=async()=>{if(!$||Y!==null)return;try{if("wakeLock"in navigator)Y=await navigator.wakeLock.request("screen"),Y.addEventListener("release",()=>{Y=null});await _.invoke("set_inhibit_sleep",{inhibit:!0})}catch{}},Z=async()=>{if(Y!==null)try{await Y.release(),Y=null}catch{}await _.invoke("set_inhibit_sleep",{inhibit:!1})},z=_.getVideoElement();if(z)z.addEventListener("play",q),z.addEventListener("playing",q),z.addEventListener("pause",Z),z.addEventListener("ended",Z);else{let D=setInterval(()=>{let X=_.getVideoElement();if(X)clearInterval(D),X.addEventListener("play",q),X.addEventListener("playing",q),X.addEventListener("pause",Z),X.addEventListener("ended",Z)},1000)}if(_.config.pause_on_lock)document.addEventListener("visibilitychange",()=>{if(document.hidden&&_.config.pause_on_lock);})}};var C0={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(_){window.__ytmd_show_remote_qr=()=>i(_),console.log("[YTMD] Mobile remote module ready.")}};async function i(_){document.getElementById("ytmd-remote-modal")?.remove();let Y=M("div",{id:"ytmd-remote-modal",style:`
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
    `}),$=()=>{document.removeEventListener("keydown",q),Y.remove()},q=(F)=>{if(F.key==="Escape")$()};document.addEventListener("keydown",q);let Z=M("div",{style:`
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
    `}),z=M("h3",{text:"Mobile Web Remote",style:"margin: 0 0 6px 0; font-size: 18px; font-weight: 700;"}),D=M("p",{text:"Scan with your phone camera on the same Wi-Fi network:",style:"font-size: 13px; color: #a1a1aa; margin: 0 0 16px 0;"}),X=M("div",{id:"ytmd-qr-container",style:`
      background: #ffffff;
      padding: 14px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      min-width: 180px;
      min-height: 180px;
    `}),J=M("span",{text:"Generating QR code...",style:"color: #52525b; font-size: 12px; font-weight: 500;"});X.appendChild(J);let h=M("div",{id:"ytmd-remote-url",style:"font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all; font-weight: 600;"}),V=M("button",{id:"ytmd-remote-close-btn",text:"Close",style:"background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 24px; font-weight: 600; cursor: pointer; font-size: 13px;"});V.addEventListener("click",$),Y.addEventListener("click",(F)=>{if(F.target===Y)$()}),Z.appendChild(z),Z.appendChild(D),Z.appendChild(X),Z.appendChild(h),Z.appendChild(V),Y.appendChild(Z),document.body.appendChild(Y);try{let F=await _.invoke("get_remote_info");if(!Y.isConnected)return;if(F&&F.qr_svg){let G=M("img");G.src=`data:image/svg+xml;utf8,${encodeURIComponent(F.qr_svg)}`,G.width=180,G.height=180,G.style.display="block",G.alt="Mobile Remote QR Code",X.replaceChildren(G)}else X.replaceChildren(M("span",{text:"Remote server starting...",style:"color: #71717a; font-size: 12px;"}));if(F&&F.url)h.textContent=F.url}catch(F){console.error("[YTMD Remote] Error fetching remote info:",F)}}var K=null,a=null,b=(_,Y={})=>{return new Promise(($)=>{let q=window.__TAURI__;if(!q?.event?.emit){$(null);return}let Z=Math.random().toString(36).slice(2)+Date.now().toString(36),z=null,D=setTimeout(()=>{if(z)z();$(null)},4000);q.event.listen(`ytmd-response-${Z}`,(X)=>{if(clearTimeout(D),z)z();$(X.payload)}).then((X)=>{z=X,q.event.emit("ytmd-invoke",{id:Z,cmd:_,args:Y})}).catch(()=>{clearTimeout(D),$(null)})})};function j0(_){if(document.getElementById("ytmd-burger-btn"))return;let Y=document.querySelector("ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content"),$=document.querySelector("ytmusic-nav-bar .left-content, ytmusic-nav-bar #left-content"),q=document.querySelector("ytmusic-nav-bar"),Z=document.body||document.documentElement;if(!Y&&!$&&!Z)return;let z=M("button",{id:"ytmd-burger-btn",title:"YouTube Music Desktop Menu (Ctrl+,)",style:`
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
    `}),D=T("M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",15,15),X=M("span",{text:"YTMD",style:"font-size: 12px; font-weight: 700; letter-spacing: 0.2px;"});z.appendChild(D),z.appendChild(X),z.addEventListener("mouseenter",()=>{z.style.background="#333333",z.style.borderColor="rgba(255, 255, 255, 0.3)",z.style.color="#ffffff"}),z.addEventListener("mouseleave",()=>{z.style.background="#212121",z.style.borderColor="rgba(255, 255, 255, 0.15)",z.style.color="#f4f4f5"});let J=document.getElementById("ytmd-burger-popover");if(!J){J=M("div",{id:"ytmd-burger-popover",style:`
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
      `});let h=(N,Q,U,w)=>{let W=M("button",{style:`
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
        `}),L=M("span",{style:"display:flex; align-items:center; gap:10px;"}),R=M("span",{style:"display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; color:#a1a1aa;"});R.appendChild(Y0(N));let m=M("span",{text:Q,style:"font-weight: 500;"});L.appendChild(R),L.appendChild(m);let O=M("span",{text:U,style:"font-size: 11px; color: #71717a; font-family: monospace;"});return W.appendChild(L),W.appendChild(O),W.addEventListener("mouseenter",()=>{W.style.background="#27272a",W.style.color="#ffffff",R.style.color="#ffffff"}),W.addEventListener("mouseleave",()=>{W.style.background="transparent",W.style.color="#e4e4e7",R.style.color="#a1a1aa"}),W.addEventListener("click",()=>{if(J)J.style.display="none";w()}),W},V=()=>{return M("div",{style:"height: 1px !important; background: #27272a !important; margin: 6px 4px !important;"})};J.appendChild(h('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',"Preferences & DSP EQ","Ctrl+,",()=>{b("toggle_settings_window")})),J.appendChild(h('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',"Local Music Library","",()=>{b("toggle_local_library_window")})),J.appendChild(h('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',"Listen Together (Sync)","",()=>{b("toggle_sync_window")})),J.appendChild(h('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',"Mobile Web Remote","",()=>{if(a)i(a)})),J.appendChild(h('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><rect x="12" y="9" width="8" height="6" rx="1"/></svg>',"Mini Player","",()=>{b("toggle_mini_player")})),J.appendChild(V()),J.appendChild(h('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',"Download Current Track","",async()=>{if(!K||!K.videoId){alert("Please play a track first to download.");return}try{await b("download_track",{request:{video_id:K.videoId,title:K.title,artist:K.artist,album:K.album||void 0,cover_url:K.coverUrl||void 0,format:_.download_format||"mp3",embed_lyrics:_.embed_lyrics!==!1}}),alert(`Download started for: ${K.title}`)}catch(N){console.error("[YTMD Download Error]:",N)}}));let F=M("div",{style:"display: flex; gap: 4px; padding: 6px 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;"}),G=M("span",{text:"Theme:",style:"font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase;"});F.appendChild(G),["oled","nord","catppuccin","tokyo_night","gruvbox"].forEach((N)=>{let Q=M("button",{text:N.toUpperCase(),style:`
          background: #1c1c20;
          border: 1px solid #27272a;
          color: #a1a1aa;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        `});Q.addEventListener("click",()=>{let U=document.getElementById("ytmd-active-theme");if(U&&A[N])U.textContent=A[N].css}),F.appendChild(Q)}),J.appendChild(F),document.body.appendChild(J),document.addEventListener("click",(N)=>{if(J&&J.style.display==="flex"){if(!J.contains(N.target)&&!z.contains(N.target))J.style.display="none"}})}if(z.addEventListener("click",(h)=>{if(h.stopPropagation(),J){let V=z.getBoundingClientRect();J.style.top=`${V.bottom+8}px`,J.style.right=`${Math.max(16,window.innerWidth-V.right)}px`,J.style.left="auto",J.style.display=J.style.display==="flex"?"none":"flex"}}),Y)Y.prepend(z);else if($)$.appendChild(z);else if(q)q.prepend(z);else z.style.position="fixed",z.style.top="12px",z.style.right="16px",Z.appendChild(z)}async function w0(){console.log("[YTMD] Initializing YouTube Music Desktop integration bridge...");let _={};j0(_),setInterval(()=>j0(_),1000),b("get_config").then((J)=>{if(J&&typeof J==="object")_=J});let Y={track:null,config:_,invoke:b,sendPlayerCommand:(J)=>{D(J)},getVideoElement:()=>H.getVideo()};a=Y;let $=new p(Y);$.register(r),$.register(e),$.register(z0),$.register(X0),$.register(Z0),$.register(D0),$.register(h0),$.register(M0),$.register(Q0),$.register(V0),$.register(G0),$.register(H0),$.register(W0),$.register(U0),$.register(C0);try{await $.initAll()}catch(J){console.error("[YTMD] Registry init error:",J)}let q=new g,Z=0,z=Date.now();q.onTrackChange(async(J)=>{K=J,Z=J.currentTimeSecs||0,z=Date.now(),$.handleTrackChange(J);try{await b("update_track_info",{track:{title:J.title,artist:J.artist,album:J.album||null,cover_url:J.coverUrl||null,duration_secs:Math.round(J.durationSecs||0),current_time_secs:Math.round(J.currentTimeSecs||0),is_playing:J.isPlaying,video_id:J.videoId||null}})}catch(h){console.error("[YTMD] Failed to sync track info to backend:",h)}}),q.onPlaybackChange(async(J)=>{$.handlePlaybackChange(J);let h=q.getCurrentTrack();if(h){h.isPlaying=J,Z=h.currentTimeSecs||0,z=Date.now();try{await b("update_track_info",{track:{title:h.title,artist:h.artist,album:h.album||null,cover_url:h.coverUrl||null,duration_secs:Math.round(h.durationSecs||0),current_time_secs:Math.round(h.currentTimeSecs||0),is_playing:J,video_id:h.videoId||null}})}catch(V){console.error("[YTMD] Failed to sync playback status:",V)}}}),q.onTick((J)=>{$.handleTick(J);let h=q.getCurrentTrack();if(!h||!h.isPlaying)return;let V=Date.now(),F=(V-z)/1000,G=Z+F;if(Math.abs(J-G)>2||F>=15)Z=J,z=V,h.currentTimeSecs=Math.round(J),b("update_track_info",{track:{title:h.title,artist:h.artist,album:h.album||null,cover_url:h.coverUrl||null,duration_secs:Math.round(h.durationSecs||0),current_time_secs:Math.round(J),is_playing:!0,video_id:h.videoId||null}}).catch((Q)=>console.error("[YTMD] Failed to sync seek/progress to backend:",Q))});function D(J){switch(J){case"play":H.play();break;case"pause":H.pause();break;case"play_pause":H.playPause();break;case"next":H.next();break;case"previous":H.previous();break;case"like":H.toggleLike();break;case"dislike":H.toggleDislike();break;case"mute":H.toggleMute();break}}let X=(J,h)=>{let V=window.__TAURI__;if(V?.event?.listen)V.event.listen(J,(F)=>h(F.payload))};X("player-command",(J)=>D(J)),X("tray-command",(J)=>D(J)),X("mpris-command",(J)=>D(J)),X("global-shortcut-event",(J)=>D(J)),X("player-seek",(J)=>H.seekTo(J)),X("mpris-command-seek",(J)=>H.seekTo(J)),X("player-volume",(J)=>H.setVolume(J)),window.addEventListener("keydown",(J)=>{if(J.ctrlKey&&J.key===","||J.key==="F2")J.preventDefault(),b("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var A0=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(A0)if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>w0());else w0();
