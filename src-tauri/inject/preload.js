class g{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(_){this.onTrackChangeCallbacks.push(_)}onPlaybackChange(_){this.onPlaybackChangeCallbacks.push(_)}onTick(_){this.onTickCallbacks.push(_)}initObservers(){if("mediaSession"in navigator);let _=()=>{let X=document.querySelector("video");if(X)X.addEventListener("play",()=>this.handlePlaybackChange(!0)),X.addEventListener("pause",()=>this.handlePlaybackChange(!1)),X.addEventListener("ended",()=>this.handlePlaybackChange(!1)),X.addEventListener("timeupdate",()=>{let z=X.currentTime;this.onTickCallbacks.forEach((h)=>h(z))})},Y=!1,q=new MutationObserver(()=>{if(Y)return;Y=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),Y=!1})}),Z=document.querySelector("ytmusic-player-bar")||document.body;if(Z)q.observe(Z,{childList:!0,subtree:!0,characterData:!0});_(),this.tickInterval=window.setInterval(()=>{this.checkTrackUpdate();let X=document.querySelector("video");if(X&&!X.paused)this.onTickCallbacks.forEach((z)=>z(X.currentTime))},250)}extractTrackInfo(){let _=document.querySelector("video"),Y=document.getElementById("movie_player");if(Boolean(Y&&(typeof Y.getAdState==="function"&&Y.getAdState()===1||typeof Y.isAdPlaying==="function"&&Y.isAdPlaying()||Y.classList?.contains("ad-showing")||Y.classList?.contains("ad-interrupting"))))return null;let q=navigator.mediaSession?.metadata,Z=q?.title||"",X=q?.artist||"",z=q?.album||"",h=q?.artwork?.[q.artwork.length-1]?.src||"";if(!Z){let F=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(F)Z=F.textContent?.trim()||""}if(!X){let F=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(F){let j=(F.textContent?.trim()||"").split("•").map((I)=>I.trim());if(X=j[0]||"",j.length>1)z=j[1]}}if(!h){let F=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(F)h=F.src}let U=new URLSearchParams(window.location.search).get("v")||void 0,M=_?Math.floor(_.duration||0):0,V=_?Math.floor(_.currentTime||0):0,Q=_?!_.paused&&!_.ended:!1;if(!Z)return null;return{title:Z,artist:X||"Unknown Artist",album:z||void 0,coverUrl:h||void 0,durationSecs:M,currentTimeSecs:V,isPlaying:Q,videoId:U}}checkTrackUpdate(){let _=this.extractTrackInfo();if(!_)return;let Y=!this.currentTrack||this.currentTrack.title!==_.title||this.currentTrack.artist!==_.artist||this.currentTrack.videoId!==_.videoId,$=this.currentTrack&&this.currentTrack.isPlaying!==_.isPlaying;if(this.currentTrack=_,Y)this.onTrackChangeCallbacks.forEach((q)=>q(_));if($)this.onPlaybackChangeCallbacks.forEach((q)=>q(_.isPlaying))}handlePlaybackChange(_){if(this.currentTrack)this.currentTrack.isPlaying=_;this.onPlaybackChangeCallbacks.forEach((Y)=>Y(_))}destroy(){if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null}}class G{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let _=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(_){_.click();return}let Y=this.getVideo();if(Y)if(Y.paused)Y.play();else Y.pause()}static play(){let _=this.getVideo();if(_&&_.paused)this.playPause()}static pause(){let _=this.getVideo();if(_&&!_.paused)this.playPause()}static next(){let _=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(_)_.click()}static previous(){let _=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(_)_.click()}static seekTo(_){let Y=this.getVideo();if(Y&&!isNaN(_))Y.currentTime=Math.max(0,Math.min(_,Y.duration||_))}static setVolume(_){let Y=this.getVideo();if(Y)Y.volume=Math.max(0,Math.min(1,_))}static toggleLike(){let _=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(_)_.click()}static toggleDislike(){let _=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(_)_.click()}static toggleMute(){let _=document.querySelector("ytmusic-player-bar #volume-slider"),Y=this.getVideo();if(Y)Y.muted=!Y.muted;if(_){let $=_.parentElement?.querySelector("paper-icon-button, #button");if($)$.click()}}}class d{plugins=new Map;enabledPlugins=new Set;context;constructor(_){this.context=_}register(_){if(this.plugins.set(_.id,_),_.defaultEnabled)this.enabledPlugins.add(_.id)}async initAll(_){for(let[Y,$]of this.plugins)if(_?.[Y]!==void 0?_[Y]:$.defaultEnabled){if(this.enabledPlugins.add(Y),$.onInit)try{await $.onInit(this.context)}catch(Z){console.error(`[YTMD] Failed to init plugin ${Y}:`,Z)}}else this.enabledPlugins.delete(Y)}async enable(_){let Y=this.plugins.get(_);if(Y&&!this.enabledPlugins.has(_)){if(this.enabledPlugins.add(_),Y.onInit)await Y.onInit(this.context)}}async disable(_){let Y=this.plugins.get(_);if(Y&&this.enabledPlugins.has(_)){if(this.enabledPlugins.delete(_),Y.onDestroy)await Y.onDestroy()}}handleTrackChange(_){this.context.track=_;for(let Y of this.enabledPlugins){let $=this.plugins.get(Y);if($?.onTrackChange)try{$.onTrackChange(_,this.context)}catch(q){console.error(`[YTMD] Error in plugin ${Y} onTrackChange:`,q)}}}handlePlaybackChange(_){for(let Y of this.enabledPlugins){let $=this.plugins.get(Y);if($?.onPlaybackChange)try{$.onPlaybackChange(_,this.context)}catch(q){console.error(`[YTMD] Error in plugin ${Y} onPlaybackChange:`,q)}}}handleTick(_){for(let Y of this.enabledPlugins){let $=this.plugins.get(Y);if($?.onTick)try{$.onTick(_,this.context)}catch(q){console.error(`[YTMD] Error in plugin ${Y} onTick:`,q)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(_){return this.enabledPlugins.has(_)}}function A(_){if(!_||typeof _!=="object")return _;let Y=_;if(Array.isArray(Y)){for(let q=0;q<Y.length;q++)A(Y[q]);return _}let $=["adPlacements","playerAds","adSlots","adBreakHeartbeatParams","adBreakParams","adTimeout","instreamAdPlayerConfig","adParams","adTagUrl","adBreakConfig","instreamAdConfig"];for(let q of $)if(q in Y)delete Y[q];if(Y.playerResponse&&typeof Y.playerResponse==="object")A(Y.playerResponse);if(Y.playerConfig&&typeof Y.playerConfig==="object")delete Y.playerConfig.adBreakConfig,delete Y.playerConfig.instreamAdConfig;return _}var r=!1;function T0(){if(r||typeof window>"u")return;r=!0;try{let _=JSON.parse;if(JSON.parse=function($,q){let Z=_.call(this,$,q);if(Z&&typeof Z==="object"){if(Z.adPlacements||Z.playerAds||Z.adSlots||Z.playerResponse?.adPlacements)return A(Z)}return Z},typeof Response<"u"&&Response.prototype.json){let $=Response.prototype.json;Response.prototype.json=async function(){let q=await $.call(this);if(q&&typeof q==="object"){if(q.adPlacements||q.playerAds||q.adSlots||q.playerResponse?.adPlacements)return A(q)}return q}}let Y=window.ytInitialPlayerResponse;if(Object.defineProperty(window,"ytInitialPlayerResponse",{get(){return Y},set($){Y=A($)},configurable:!0,enumerable:!0}),Y)window.ytInitialPlayerResponse=A(Y)}catch(_){console.warn("[YTMD Adblock] Failed to install JSON interceptors:",_)}}var e={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Blocks audio/video ads, auto-skips pre-rolls, and dismisses premium upsell banners",defaultEnabled:!0,onInit(_){if(typeof document>"u")return;T0();let Y=null,$=!1,q=!1,Z=()=>{let h=_.getVideoElement(),D=document.getElementById("movie_player");if(Boolean(D&&(typeof D.getAdState==="function"&&D.getAdState()===1||typeof D.isAdPlaying==="function"&&D.isAdPlaying()||D.classList?.contains("ad-showing")||D.classList?.contains("ad-interrupting")))){try{if(D&&typeof D.skipAd==="function")D.skipAd(!0)}catch(Q){}if(document.querySelectorAll(".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button, .ytp-ad-overlay-close-button").forEach((Q)=>Q.click()),h){if(!$)q=h.muted;h.muted=!0,$=!0}}else if($){if(h)h.muted=q;$=!1}document.querySelectorAll("ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)").forEach((V)=>{V.style.display="none";let Q=V.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(Q)Q.click()})},X=document.createElement("style");X.id="ytmd-adblock-styles",X.textContent=`
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
    `,document.head.appendChild(X),(()=>{let h=_.getVideoElement();if(h)h.addEventListener("timeupdate",Z),h.addEventListener("play",Z),h.addEventListener("loadedmetadata",Z)})(),Y=window.setInterval(Z,100),this._cleanup=()=>{if(Y)clearInterval(Y);let h=document.getElementById("ytmd-adblock-styles");if(h)h.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var _0={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){this._segments=[],this._lastVideoId="",this._skippedSegments=new Set},async onTrackChange(_){if(!_.videoId||_.videoId===this._lastVideoId)return;this._lastVideoId=_.videoId,this._segments=[],this._skippedSegments=new Set;try{let Y=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),$=`https://sponsor.ajay.app/api/skipSegments?videoID=${_.videoId}&categories=${encodeURIComponent(Y)}`,q=await fetch($);if(q.ok){let Z=await q.json();this._segments=Z,console.log(`[YTMD SponsorBlock] Loaded ${Z.length} segments for ${_.videoId}`)}}catch(Y){}},onTick(_,Y){let $=this._segments;if(!$||$.length===0)return;let q=this._skippedSegments;for(let Z of $){let[X,z]=Z.segment;if(_>=X&&_<z-0.5&&!q.has(Z.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${Z.category}): ${X}s -> ${z}s`);let h=Y.getVideoElement();if(h)h.currentTime=z,q.add(Z.UUID);break}}}};function K(_,Y=18,$=18,q="0 0 24 24"){let Z=document.createElementNS("http://www.w3.org/2000/svg","svg");Z.setAttribute("width",String(Y)),Z.setAttribute("height",String($)),Z.setAttribute("viewBox",q),Z.setAttribute("fill","currentColor");let X=document.createElementNS("http://www.w3.org/2000/svg","path");return X.setAttribute("d",_),Z.appendChild(X),Z}var Y0="http://www.w3.org/2000/svg",u0="circle|path|rect|line|polyline|polygon|g|ellipse";function $0(_){let Y=document.createElementNS(Y0,"svg"),$=(X,z)=>{for(let h of z.matchAll(/([\w:-]+)="([^"]*)"/g))X.setAttribute(h[1],h[2])},q=_.match(/^<svg([^>]*)>/);if(q)$(Y,q[1]);let Z=new RegExp(`<(${u0})([^>]*)\\/?>`,"g");for(let X of _.matchAll(Z)){let z=document.createElementNS(Y0,X[1]);$(z,X[2]),Y.appendChild(z)}return Y}function J(_,Y){let $=document.createElement(_);if(Y?.id)$.id=Y.id;if(Y?.className)$.className=Y.className;if(Y?.text!==void 0)$.textContent=Y.text;if(Y?.title)$.title=Y.title;if(Y?.style)$.style.cssText=Y.style;return $}var b=[],f=-1,m=null,W="",P="",X0={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(_){b=[],f=-1,m=null,W="",P="";let Y=document.createElement("style");Y.id="ytmd-native-lyrics-styles",Y.textContent=`
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
    `,document.head.appendChild(Y);let $=()=>{B(),q0(_)},q=()=>{setTimeout(()=>{B(),n()},50),setTimeout(()=>{n()},250)};document.addEventListener("click",q,!0);let Z=window.setInterval($,600);$(),this._cleanup=()=>{clearInterval(Z),document.removeEventListener("click",q,!0),Y.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((z)=>z.remove())}},async onTrackChange(_,Y){let $=`${_.title} - ${_.artist}`;if(W===$&&b.length>0||P===$)return;W=$,P=$,b=[],f=-1,m=null,B();let q=document.getElementById("ytmd-native-lyrics-wrapper");if(q)q.replaceChildren(J("div",{className:"ytmd-native-lyrics-status",text:"Loading synchronized lyrics..."}));try{let Z=await Y.invoke("fetch_lyrics",{artist:_.artist,title:_.title,albumName:_.album||null,duration:_.durationSecs||null});if(W!==$)return;if(m=Z,Z?.syncedLyrics)b=A0(Z.syncedLyrics);B(),q0(Y),h0(Y)}catch{if(W===$&&q)q.replaceChildren(J("div",{className:"ytmd-native-lyrics-status",text:"No lyrics available for this track."}))}finally{if(P===$)P=""}},onTick(_){if(!b||b.length===0)return;let Y=E(W),$=_+Y,q=-1;for(let Z=0;Z<b.length;Z++)if($>=b[Z].timeSecs)q=Z;else break;if(q!==f&&q>=0){f=q;let Z=document.getElementById("ytmd-native-lyrics-wrapper");if(Z){let X=Z.querySelectorAll(".ytmd-native-lyric-line");X.forEach((h,D)=>{if(D===q)h.classList.add("active");else h.classList.remove("active")});let z=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(z&&I0(z)){let h=X[q];if(h)h.scrollIntoView({behavior:"smooth",block:"nearest"})}}}},onDestroy(){if(this._cleanup)this._cleanup()}},Z0=new Map;function E(_){return Z0.get(_)||0}function o(_,Y){Z0.set(_,Y)}function I0(_){if(!_||_.offsetParent===null||_.hasAttribute("hidden"))return!1;let Y=window.getComputedStyle(_);return Y.display!=="none"&&Y.visibility!=="hidden"&&Y.opacity!=="0"}function B(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((Y)=>{let $=Y.textContent?.toLowerCase()||"";if($.includes("tekst")||$.includes("lyrics")||$.includes("paroles")||$.includes("letras")){Y.disabled=!1,Y.removeAttribute("disabled"),Y.removeAttribute("aria-disabled"),Y.classList.remove("disabled"),Y.classList.add("ytmd-lyrics-tab-unlocked"),Y.style.pointerEvents="auto",Y.style.cursor="pointer";let q={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!Y.endpoint)Y.endpoint=q;if(Y.data&&!Y.data.endpoint)Y.data.endpoint=q}})}function O0(){let _=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let $ of Array.from(_)){let q=$.textContent?.toLowerCase()||"";if(q.includes("tekst")||q.includes("lyrics")||q.includes("paroles")||q.includes("letras")){if($.classList.contains("iron-selected")||$.getAttribute("aria-selected")==="true"||$.classList.contains("selected"))return!0}}let Y=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(Y){if((Y.classList.contains("iron-selected")||!Y.hasAttribute("hidden"))&&Y.getAttribute("aria-hidden")!=="true")return!0}return!1}function n(){let _=document.getElementById("ytmd-native-lyrics-wrapper");if(!_)return;let Y=O0();_.style.setProperty("display",Y?"flex":"none","important")}function q0(_){let Y=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!Y)return;let $=document.getElementById("ytmd-native-lyrics-wrapper");if(!$||!Y.contains($)){if(!$)$=J("div",{id:"ytmd-native-lyrics-wrapper"});Y.appendChild($),h0(_)}n()}function h0(_){let Y=document.getElementById("ytmd-native-lyrics-wrapper");if(!Y)return;if(b&&b.length>0){let $=E(W),q=J("div",{className:"ytmd-native-lyrics-sync-bar"}),Z=J("span",{className:"ytmd-sync-label",text:"Sync:"}),X=J("button",{className:"ytmd-sync-btn",text:"-0.5s",title:"Shift lyrics 0.5s earlier"}),z=J("span",{className:"ytmd-sync-val",text:`${$>=0?"+":""}${$.toFixed(1)}s`}),h=J("button",{className:"ytmd-sync-btn",text:"+0.5s",title:"Shift lyrics 0.5s later"}),D=J("button",{className:"ytmd-sync-btn",text:"Reset",title:"Reset offset to 0.0s"});X.addEventListener("click",()=>{let U=Math.round((E(W)-0.5)*10)/10;o(W,U),z.textContent=`${U>=0?"+":""}${U.toFixed(1)}s`}),h.addEventListener("click",()=>{let U=Math.round((E(W)+0.5)*10)/10;o(W,U),z.textContent=`${U>=0?"+":""}${U.toFixed(1)}s`}),D.addEventListener("click",()=>{o(W,0),z.textContent="+0.0s"}),q.appendChild(Z),q.appendChild(X),q.appendChild(z),q.appendChild(h),q.appendChild(D),Y.replaceChildren(...b.map((U,M)=>{let V=J("div",{className:`ytmd-native-lyric-line${M===f?" active":""}`,text:U.text});return V.addEventListener("click",()=>{let Q=_.getVideoElement();if(Q){let F=E(W);Q.currentTime=Math.max(0,U.timeSecs-F)}}),V}),q,J("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else if(m?.plainLyrics){let $=m.plainLyrics.split(`
`);Y.replaceChildren(...$.map((q)=>J("div",{className:"ytmd-native-lyric-line active",text:q,style:"cursor: default;"})),J("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else Y.replaceChildren(J("div",{className:"ytmd-native-lyrics-status",text:"Synced lyrics unavailable for this track."}))}function A0(_){let Y=_.split(`
`),$=[],q=0,Z=/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g,X=/\[offset:\s*([+-]?\d+)\s*\]/i;for(let z of Y){let h=z.trim();if(!h)continue;let D=X.exec(h);if(D){let V=parseInt(D[1],10);if(!isNaN(V))q=V/1000;continue}let U=[],M;Z.lastIndex=0;while((M=Z.exec(h))!==null){let V=parseInt(M[1],10),Q=parseInt(M[2],10),F=0;if(M[3])F=parseInt(M[3].padEnd(3,"0").slice(0,3),10);U.push(V*60+Q+F/1000)}if(U.length>0){let V=h.replace(Z,"").trim();if(V)for(let Q of U)$.push({timeSecs:Math.max(0,Q-q),text:V})}}return $.sort((z,h)=>z.timeSecs-h.timeSecs)}var z0={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit(_){let Y=($)=>{let q=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!q)return;let Z=q.getBoundingClientRect();if($.clientX>=Z.left&&$.clientX<=Z.right&&$.clientY>=Z.top&&$.clientY<=Z.bottom){$.preventDefault();let X=_.getVideoElement();if(X){let z=_.config.wheel_volume_step||0.05,h=$.deltaY<0?z:-z,D=Math.max(0,Math.min(1,X.volume+h));X.volume=D}}};window.addEventListener("wheel",Y,{passive:!1}),this._cleanup=()=>{window.removeEventListener("wheel",Y)}},onDestroy(){if(this._cleanup)this._cleanup()}};var D0={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(_,Y){if(!Y.config?.notifications_enabled)return;if(!_.title||_.title==="No Track Playing")return;try{await Y.invoke("notify_track_change",{title:_.title,artist:_.artist})}catch($){console.warn("[YTMD] Notification dispatch failed:",$)}}};var J0={id:"visualizer",name:"Modern Clean Theme & Custom CSS",description:"Applies sleek dark aesthetics, subtle scrollbars, and user-defined custom CSS",defaultEnabled:!0,onInit(_){let Y=document.createElement("style");Y.id="ytmd-theme-styles";let $=_.config.custom_css||"",q=`
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
${$}`,document.head.appendChild(Y),this._cleanup=()=>{Y.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var v=[32,64,125,250,500,1000,2000,4000,8000,16000],l={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function x(_){return Math.max(-12,Math.min(12,_))}class C{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;static getInstance(){if(!C.instance)C.instance=new C;return C.instance}init(_){if(this.isInitialized&&this.hookedVideo===_){this.resumeContext();return}try{let Y=window.AudioContext||window.webkitAudioContext;if(!Y){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new Y,this.hookedVideo=_,this.sourceNode=this.audioCtx.createMediaElementSource(_),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=v.map((q,Z)=>{if(!this.audioCtx)throw Error("AudioContext missing");let X=this.audioCtx.createBiquadFilter();if(Z===0)X.type="lowshelf";else if(Z===v.length-1)X.type="highshelf";else X.type="peaking",X.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return X.frequency.setValueAtTime(q,this.audioCtx.currentTime),X.gain.setValueAtTime(0,this.audioCtx.currentTime),X}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph();let $=()=>this.resumeContext();_.addEventListener("play",$),_.addEventListener("playing",$),document.addEventListener("click",$,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(Y){console.error("[YTMD DSP] Failed to initialize AudioEngine:",Y)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((Y)=>Y.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let _=this.sourceNode;if(this.isNormalizing)_.connect(this.compressorNode),_=this.compressorNode;for(let Y of this.filters)_.connect(Y),_=Y;_.connect(this.preampNode),_=this.preampNode,_.connect(this.fadeNode),_=this.fadeNode,_.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(_){console.error("[YTMD DSP] Graph rebuild error:",_)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(_,Y){if(_<0||_>=this.filters.length||!this.audioCtx)return;let $=x(Y);this.filters[_].gain.setValueAtTime($,this.audioCtx.currentTime)}setAllGains(_){if(!this.audioCtx)return;_.forEach((Y,$)=>{if($<this.filters.length)this.filters[$].gain.setValueAtTime(x(Y),this.audioCtx.currentTime)})}setPreamp(_){if(!this.preampNode||!this.audioCtx)return;let Y=Math.pow(10,x(_)/20);this.preampNode.gain.setValueAtTime(Y,this.audioCtx.currentTime)}setLoudnessNormalization(_){if(this.isNormalizing!==_)this.isNormalizing=_,this.rebuildGraph()}applyPreset(_){let Y=l[_]||l.flat;if(this.setAllGains(Y.gains),Y.preamp!==void 0)this.setPreamp(Y.preamp);return Y.gains}fadeIn(_){if(!this.fadeNode||!this.audioCtx||_<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let Y=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(Y),this.fadeNode.gain.setValueAtTime(0.001,Y),this.fadeNode.gain.linearRampToValueAtTime(1,Y+_)}fadeOut(_){if(!this.fadeNode||!this.audioCtx||_<=0)return;let Y=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(Y),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,Y),this.fadeNode.gain.linearRampToValueAtTime(0.001,Y+_)}resetFade(){if(this.fadeNode&&this.audioCtx){let _=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(_),this.fadeNode.gain.setValueAtTime(1,_)}}getAudioPowerDb(){if(!this.analyserNode)return-100;let _=new Float32Array(this.analyserNode.fftSize);this.analyserNode.getFloatTimeDomainData(_);let Y=0;for(let q=0;q<_.length;q++)Y+=_[q]*_[q];let $=Math.sqrt(Y/_.length);if($<=0.00001)return-100;return 20*Math.log10($)}getFrequencyData(){if(!this.analyserNode)return null;let _=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(_),_}setPlaybackRate(_){let Y=Math.max(0.5,Math.min(2,_));if(this.hookedVideo)this.hookedVideo.playbackRate=Y}setPreservesPitch(_){if(this.hookedVideo)this.hookedVideo.preservesPitch=_,this.hookedVideo.mozPreservesPitch=_,this.hookedVideo.webkitPreservesPitch=_}}class s{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";setCrossfadeSeconds(_){this.crossfadeSeconds=Math.max(0,Math.min(12,_))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(_){if(this.fadeOutTriggered=!1,this.currentTrackId=_.videoId||`${_.title}-${_.artist}`,this.crossfadeSeconds>0)C.getInstance().fadeIn(this.crossfadeSeconds);else C.getInstance().resetFade()}onTick(_,Y){if(!Y||this.crossfadeSeconds<=0||Y.durationSecs<=0)return;let $=Y.durationSecs-_;if($<=this.crossfadeSeconds&&!this.fadeOutTriggered&&$>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${$.toFixed(1)}s remaining)...`),C.getInstance().fadeOut($),setTimeout(()=>{let q=Y.videoId||`${Y.title}-${Y.artist}`;if(this.currentTrackId===q)console.log("[YTMD Crossfade] Advancing to next track..."),G.next()},Math.max(100,($-0.2)*1000))}}class i{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(_){this.enabled=_}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(_,Y,$){if(!this.enabled||!Y||!$||$.paused||$.ended)return;let q=C.getInstance().getAudioPowerDb();if(!this.checkedIntro&&_<15)if(q<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&_<12)console.log(`[YTMD Skip Silence] Intro silence detected (${q.toFixed(1)} dB). Fast forwarding...`),$.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(Y.durationSecs>15&&_>Y.durationSecs-10)if(q<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${q.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,G.next()}else this.consecutiveSilentTicks=0}}var U0={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(_){let Y=_.getVideoElement(),$=C.getInstance(),q=new s,Z=new i;this._crossfade=q,this._skipSilence=Z;let X=_.config;if(Boolean(X.equalizer_enabled||X.loudness_normalization||X.equalizer_gains&&Array.isArray(X.equalizer_gains)&&X.equalizer_gains.some((h)=>h!==0)))if(Y)$.init(Y);else{let h=setInterval(()=>{let D=_.getVideoElement();if(D)clearInterval(h),$.init(D)},500)}if(X.equalizer_gains&&Array.isArray(X.equalizer_gains))$.setAllGains(X.equalizer_gains);else if(X.equalizer_preset&&typeof X.equalizer_preset==="string")$.applyPreset(X.equalizer_preset);if(X.preamp_gain!==void 0)$.setPreamp(X.preamp_gain);if(X.loudness_normalization!==void 0)$.setLoudnessNormalization(Boolean(X.loudness_normalization));if(X.crossfade_seconds!==void 0)q.setCrossfadeSeconds(X.crossfade_seconds);if(X.skip_silence_enabled!==void 0)Z.setEnabled(Boolean(X.skip_silence_enabled));if(X.playback_speed!==void 0)$.setPlaybackRate(X.playback_speed);if(X.preserve_pitch!==void 0)$.setPreservesPitch(Boolean(X.preserve_pitch));if(window.__TAURI__?.event){let{listen:h}=window.__TAURI__.event;h("set-eq-band",(D)=>{$.setBandGain(D.payload.bandIndex,D.payload.gain)}),h("set-eq-all",(D)=>{$.setAllGains(D.payload.gains)}),h("set-eq-preset",(D)=>{$.applyPreset(D.payload)}),h("set-preamp",(D)=>{$.setPreamp(D.payload)}),h("set-loudness-normalization",(D)=>{$.setLoudnessNormalization(D.payload)}),h("set-crossfade-seconds",(D)=>{q.setCrossfadeSeconds(D.payload)}),h("set-skip-silence",(D)=>{Z.setEnabled(D.payload)}),h("set-playback-rate",(D)=>{$.setPlaybackRate(D.payload)}),h("set-preserves-pitch",(D)=>{$.setPreservesPitch(D.payload)})}console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(_){let Y=this._crossfade,$=this._skipSilence;if(Y)Y.onTrackChange(_);if($)$.onTrackChange()},onTick(_,Y){let $=this._crossfade,q=this._skipSilence;if($)$.onTick(_,Y.track);if(q)q.onTick(_,Y.track,Y.getVideoElement())}};async function V0(_){return new Promise((Y)=>{let $={primary:"#18181b",secondary:"#09090b",accent:"#dc2626"};if(!_){Y($);return}let q=new Image;q.crossOrigin="anonymous",q.onload=()=>{try{let Z=document.createElement("canvas");Z.width=16,Z.height=16;let X=Z.getContext("2d");if(!X){Y($);return}X.drawImage(q,0,0,16,16);let z=X.getImageData(0,0,16,16).data,h=0,D=0,U=0,M=0,V=0,Q=0,F=0,H=0;for(let T=0;T<z.length;T+=4){let S=z[T],k=z[T+1],p=z[T+2];if(z[T+3]<128)continue;let c=(S+k+p)/3;if(c<20||c>240)continue;if(T<z.length/2)h+=S,D+=k,U+=p,M++;else V+=S,Q+=k,F+=p,H++}if(M===0&&H===0){Y($);return}let j=M>0?Math.round(h/M):220,I=M>0?Math.round(D/M):38,N=M>0?Math.round(U/M):38,L=H>0?Math.round(V/H):24,O=H>0?Math.round(Q/H):24,y=H>0?Math.round(F/H):27;Y({primary:`rgb(${j}, ${I}, ${N})`,secondary:`rgb(${L}, ${O}, ${y})`,accent:`rgb(${Math.min(255,j+30)}, ${Math.min(255,I+30)}, ${Math.min(255,N+30)})`})}catch{Y($)}},q.onerror=()=>Y($),q.src=_})}var M0={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Smoothly diffuses dynamic, reactive ambient colors from the active album cover behind the player",defaultEnabled:!0,onInit(_){let Y=document.getElementById("ytmd-ambient-backdrop");if(!Y)Y=document.createElement("div"),Y.id="ytmd-ambient-backdrop",document.body.prepend(Y);let $=typeof _.config.ambient_intensity==="number"?_.config.ambient_intensity:0.6,q=_.config.ambient_lighting_enabled!==!1,Z=document.createElement("style");Z.id="ytmd-ambient-styles",Z.textContent=`
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
    `,document.head.appendChild(Z);let X=J("div",{id:"ytmd-orb-1",className:"ytmd-ambient-orb"}),z=J("div",{id:"ytmd-orb-2",className:"ytmd-ambient-orb"});if(Y.appendChild(X),Y.appendChild(z),this._setIntensity=(h)=>{if(Y)Y.style.opacity=String(h)},window.__TAURI__?.event)window.__TAURI__.event.listen("set-ambient-intensity",(h)=>{this._setIntensity(h.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(h)=>{this._setIntensity(h.payload?0.6:0)});if(_.track)this.onTrackChange(_.track,_)},async onTrackChange(_){if(!_.coverUrl)return;try{let Y=await V0(_.coverUrl),$=document.getElementById("ytmd-ambient-backdrop");if($)$.style.background=`
          radial-gradient(circle at 80% 20%, ${Y.primary}66 0%, transparent 60%),
          radial-gradient(circle at 20% 80%, ${Y.secondary}66 0%, transparent 60%)
        `}catch{}}};function K0(_){return`
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

    `}var R0=[{id:"default",name:"Modern Dark",background:"#0f0f0f",surface:"#121215",border:"#27272a",accent:"#3ea6ff",accentHover:"#65b8ff"},{id:"oled",name:"Pure OLED Black",background:"#000000",surface:"#0a0a0a",border:"#1a1a1a",accent:"#3ea6ff",accentHover:"#65b8ff"},{id:"nord",name:"Nord Arctic",background:"#2e3440",surface:"#3b4252",border:"#434c5e",accent:"#88c0d0",accentHover:"#a3d0dd"},{id:"catppuccin",name:"Catppuccin Mocha",background:"#1e1e2e",surface:"#181825",border:"#313244",accent:"#cba6f7",accentHover:"#dbc2fa"},{id:"gruvbox",name:"Gruvbox Dark",background:"#282828",surface:"#1d2021",border:"#3c3836",accent:"#fe8019",accentHover:"#fe9a4d"},{id:"tokyo_night",name:"Tokyo Night",background:"#1a1b26",surface:"#16161e",border:"#292e42",accent:"#7aa2f7",accentHover:"#9ab8f9"},{id:"dracula",name:"Dracula",background:"#282a36",surface:"#21222c",border:"#44475a",accent:"#bd93f9",accentHover:"#cfb0fb"},{id:"rose_pine",name:"Rosé Pine",background:"#191724",surface:"#1f1d2e",border:"#26233a",accent:"#eb6f92",accentHover:"#f08daa"}],R=Object.fromEntries(R0.map((_)=>[_.id,{id:_.id,name:_.name,css:K0(_)}]));var F0={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Applies curated aesthetic themes and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(_){let Y=()=>document.head||document.documentElement,$=(h)=>{let D=document.getElementById(h);if(!D){D=document.createElement("style"),D.id=h;let U=Y();if(U)U.appendChild(D)}return D},q=(h)=>{let D=R[h]||R.default,U=$("ytmd-active-theme");if(U)U.textContent=D.css},Z=(h)=>{let D=$("ytmd-custom-css");if(D)D.textContent=h},X=_.config.theme_preset||_.config.theme||"default";q(X);let z=_.config.custom_css||"";if(Z(z),window.__TAURI__?.event)window.__TAURI__.event.listen("set-theme-preset",(h)=>{q(h.payload)}),window.__TAURI__.event.listen("set-custom-css",(h)=>{Z(h.payload)});console.log("[YTMD] Theme engine active.")}};var Q0={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(_){let Y=()=>{if(document.getElementById("ytmd-pip-btn"))return;let $=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if($){let q=J("button",{id:"ytmd-pip-btn",title:"Picture-in-Picture (Float Video)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),Z=K("M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",20,20);q.appendChild(Z),q.style.cssText=`
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
        `,q.addEventListener("mouseenter",()=>{q.style.color="#fafafa",q.style.backgroundColor="#27272a"}),q.addEventListener("mouseleave",()=>{q.style.color="#a1a1aa",q.style.backgroundColor="transparent"}),q.addEventListener("click",async()=>{let X=_.getVideoElement();if(!X)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await X.requestPictureInPicture();else await _.invoke("toggle_mini_player")}catch(z){console.warn("[YTMD PiP] Could not enter PiP:",z),await _.invoke("toggle_mini_player")}}),$.appendChild(q)}};setInterval(Y,1000),Y()}};var G0={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(_){let Y=null,$=!1,q=()=>{if(document.getElementById("ytmd-download-btn"))return;let Z=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(Z){let X=J("button",{id:"ytmd-download-btn",title:"Download Track (MP3/FLAC with ID3 Tags & Lyrics)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),z=K("M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z",20,20);X.appendChild(z),X.style.cssText=`
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
        `,X.addEventListener("mouseenter",()=>{if(!$)X.style.color="#fafafa",X.style.backgroundColor="#27272a"}),X.addEventListener("mouseleave",()=>{if(!$)X.style.color="#a1a1aa",X.style.backgroundColor="transparent"}),X.addEventListener("click",async()=>{if(!Y||!Y.videoId||$)return;$=!0,X.style.color="#38bdf8",X.title="Downloading...";try{let h=_.config.download_format||"mp3",D=_.config.embed_lyrics!==!1;await _.invoke("download_track",{request:{video_id:Y.videoId,title:Y.title,artist:Y.artist,album:Y.album||void 0,cover_url:Y.coverUrl||void 0,format:h,embed_lyrics:D}}),X.style.color="#22c55e",X.title="Downloaded!",setTimeout(()=>{$=!1,X.style.color="#a1a1aa",X.title="Download Track"},3000)}catch(h){console.error("[YTMD Downloader] Download failed:",h),X.style.color="#ef4444",setTimeout(()=>{$=!1,X.style.color="#a1a1aa",X.title="Download Track"},3000)}}),Z.appendChild(X)}};setInterval(q,1000),q(),this._setCurrentTrack=(Z)=>{Y=Z}},onTrackChange(_){if(this._setCurrentTrack)this._setCurrentTrack(_)}};var H0={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(_){console.log("[YTMD] Local files module ready.")}};class N0{isHost=!1;inRoom=!1;lastAppliedTimestamp=0;setRoomState(_,Y){this.inRoom=_,this.isHost=Y}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback(_,Y){if(!this.inRoom||this.isHost||!Y)return;let $=Date.now(),q=($-_.timestamp_ms)/1000,Z=_.is_playing?_.current_time_secs+Math.max(0,q):_.current_time_secs;this.lastAppliedTimestamp=$;let X=new URLSearchParams(window.location.search).get("v");if(_.video_id&&X!==_.video_id){console.log(`[YTMD Room Sync] Switching to track: ${_.video_id}`),window.location.href=`https://music.youtube.com/watch?v=${_.video_id}`;return}if(_.is_playing&&Y.paused)G.play();else if(!_.is_playing&&!Y.paused)G.pause();let z=Math.abs(Y.currentTime-Z);if(z>1.5)console.log(`[YTMD Room Sync] Drift detected (${z.toFixed(2)}s). Resyncing to ${Z.toFixed(1)}s...`),G.seekTo(Z)}broadcastLocalState(_,Y,$){if(!this.inRoom||!this.isHost||!_||!_.videoId||!Y)return;if(Date.now()-this.lastAppliedTimestamp<1000)return;$("broadcast_sync_state",{playback:{video_id:_.videoId,title:_.title,artist:_.artist,current_time_secs:Y.currentTime,is_playing:!Y.paused,timestamp_ms:Date.now()}}).catch(()=>{})}}var W0={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(_){let Y=new N0;if(this._controller=Y,window.__TAURI__?.event)window.__TAURI__.event.listen("sync-room-updated",($)=>{Y.setRoomState(!0,$.payload.is_host)}),window.__TAURI__.event.listen("sync-room-left",()=>{Y.setRoomState(!1,!1)}),window.__TAURI__.event.listen("sync-playback-remote",($)=>{Y.handleRemotePlayback($.payload,_.getVideoElement())})},onTick(_,Y){let $=this._controller;if($&&$.isInRoom()&&$.isRoomHost())$.broadcastLocalState(Y.track,Y.getVideoElement(),Y.invoke)}};var C0={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Inhibits system sleep during active playback and auto-pauses when screen is locked",defaultEnabled:!0,onInit(_){let Y=null,$=_.config.inhibit_sleep!==!1,q=async()=>{if(!$||Y!==null)return;try{if("wakeLock"in navigator)Y=await navigator.wakeLock.request("screen"),Y.addEventListener("release",()=>{Y=null});await _.invoke("set_inhibit_sleep",{inhibit:!0})}catch{}},Z=async()=>{if(Y!==null)try{await Y.release(),Y=null}catch{}await _.invoke("set_inhibit_sleep",{inhibit:!1})},X=_.getVideoElement();if(X)X.addEventListener("play",q),X.addEventListener("playing",q),X.addEventListener("pause",Z),X.addEventListener("ended",Z);else{let z=setInterval(()=>{let h=_.getVideoElement();if(h)clearInterval(z),h.addEventListener("play",q),h.addEventListener("playing",q),h.addEventListener("pause",Z),h.addEventListener("ended",Z)},1000)}if(_.config.pause_on_lock)document.addEventListener("visibilitychange",()=>{if(document.hidden&&_.config.pause_on_lock);})}};var j0={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(_){window.__ytmd_show_remote_qr=()=>a(_),console.log("[YTMD] Mobile remote module ready.")}};async function a(_){document.getElementById("ytmd-remote-modal")?.remove();let Y=J("div",{id:"ytmd-remote-modal",style:`
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
    `}),$=()=>{document.removeEventListener("keydown",q),Y.remove()},q=(V)=>{if(V.key==="Escape")$()};document.addEventListener("keydown",q);let Z=J("div",{style:`
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
    `}),X=J("h3",{text:"Mobile Web Remote",style:"margin: 0 0 6px 0; font-size: 18px; font-weight: 700;"}),z=J("p",{text:"Scan with your phone camera on the same Wi-Fi network:",style:"font-size: 13px; color: #a1a1aa; margin: 0 0 16px 0;"}),h=J("div",{id:"ytmd-qr-container",style:`
      background: #ffffff;
      padding: 14px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      min-width: 180px;
      min-height: 180px;
    `}),D=J("span",{text:"Generating QR code...",style:"color: #52525b; font-size: 12px; font-weight: 500;"});h.appendChild(D);let U=J("div",{id:"ytmd-remote-url",style:"font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all; font-weight: 600;"}),M=J("button",{id:"ytmd-remote-close-btn",text:"Close",style:"background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 24px; font-weight: 600; cursor: pointer; font-size: 13px;"});M.addEventListener("click",$),Y.addEventListener("click",(V)=>{if(V.target===Y)$()}),Z.appendChild(X),Z.appendChild(z),Z.appendChild(h),Z.appendChild(U),Z.appendChild(M),Y.appendChild(Z),document.body.appendChild(Y);try{let V=await _.invoke("get_remote_info");if(!Y.isConnected)return;if(V&&V.qr_svg){let Q=J("img");Q.src=`data:image/svg+xml;utf8,${encodeURIComponent(V.qr_svg)}`,Q.width=180,Q.height=180,Q.style.display="block",Q.alt="Mobile Remote QR Code",h.replaceChildren(Q)}else h.replaceChildren(J("span",{text:"Remote server starting...",style:"color: #71717a; font-size: 12px;"}));if(V&&V.url)U.textContent=V.url}catch(V){console.error("[YTMD Remote] Error fetching remote info:",V)}}var u=null,t=null,w=(_,Y={})=>{return new Promise(($)=>{let q=window.__TAURI__;if(!q?.event?.emit){$(null);return}let Z=Math.random().toString(36).slice(2)+Date.now().toString(36),X=null,z=setTimeout(()=>{if(X)X();$(null)},4000);q.event.listen(`ytmd-response-${Z}`,(h)=>{if(clearTimeout(z),X)X();$(h.payload)}).then((h)=>{X=h,q.event.emit("ytmd-invoke",{id:Z,cmd:_,args:Y})}).catch(()=>{clearTimeout(z),$(null)})})};function b0(_){if(document.getElementById("ytmd-burger-btn"))return;let Y=document.querySelector("ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content"),$=document.querySelector("ytmusic-nav-bar .left-content, ytmusic-nav-bar #left-content"),q=document.querySelector("ytmusic-nav-bar"),Z=document.body||document.documentElement;if(!Y&&!$&&!Z)return;let X=J("button",{id:"ytmd-burger-btn",title:"YouTube Music Desktop Menu (Ctrl+,)",style:`
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
    `}),z=K("M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",15,15),h=J("span",{text:"YTMD",style:"font-size: 12px; font-weight: 700; letter-spacing: 0.2px;"});X.appendChild(z),X.appendChild(h),X.addEventListener("mouseenter",()=>{X.style.background="#333333",X.style.borderColor="rgba(255, 255, 255, 0.3)",X.style.color="#ffffff"}),X.addEventListener("mouseleave",()=>{X.style.background="#212121",X.style.borderColor="rgba(255, 255, 255, 0.15)",X.style.color="#f4f4f5"});let D=document.getElementById("ytmd-burger-popover");if(!D){D=J("div",{id:"ytmd-burger-popover",style:`
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
      `});let U=(F,H,j,I)=>{let N=J("button",{style:`
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
        `}),L=J("span",{style:"display:flex; align-items:center; gap:10px;"}),O=J("span",{style:"display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; color:#a1a1aa;"});O.appendChild($0(F));let y=J("span",{text:H,style:"font-weight: 500;"});L.appendChild(O),L.appendChild(y);let T=J("span",{text:j,style:"font-size: 11px; color: #71717a; font-family: monospace;"});return N.appendChild(L),N.appendChild(T),N.addEventListener("mouseenter",()=>{N.style.background="#27272a",N.style.color="#ffffff",O.style.color="#ffffff"}),N.addEventListener("mouseleave",()=>{N.style.background="transparent",N.style.color="#e4e4e7",O.style.color="#a1a1aa"}),N.addEventListener("click",()=>{if(D)D.style.display="none";I()}),N},M=()=>{return J("div",{style:"height: 1px !important; background: #27272a !important; margin: 6px 4px !important;"})};D.appendChild(U('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',"Preferences & DSP EQ","Ctrl+,",()=>{w("toggle_settings_window")})),D.appendChild(U('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',"Local Music Library","",()=>{w("toggle_local_library_window")})),D.appendChild(U('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',"Listen Together (Sync)","",()=>{w("toggle_sync_window")})),D.appendChild(U('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',"Mobile Web Remote","",()=>{if(t)a(t)})),D.appendChild(U('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><rect x="12" y="9" width="8" height="6" rx="1"/></svg>',"Mini Player","",()=>{w("toggle_mini_player")})),D.appendChild(M()),D.appendChild(U('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',"Download Current Track","",async()=>{if(!u||!u.videoId){alert("Please play a track first to download.");return}try{await w("download_track",{request:{video_id:u.videoId,title:u.title,artist:u.artist,album:u.album||void 0,cover_url:u.coverUrl||void 0,format:_.download_format||"mp3",embed_lyrics:_.embed_lyrics!==!1}}),alert(`Download started for: ${u.title}`)}catch(F){console.error("[YTMD Download Error]:",F)}}));let V=J("div",{style:"display: flex; gap: 4px; padding: 6px 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;"}),Q=J("span",{text:"Theme:",style:"font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase;"});V.appendChild(Q),["oled","nord","catppuccin","tokyo_night","gruvbox"].forEach((F)=>{let H=J("button",{text:F.toUpperCase(),style:`
          background: #1c1c20;
          border: 1px solid #27272a;
          color: #a1a1aa;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        `});H.addEventListener("click",()=>{let j=document.getElementById("ytmd-active-theme");if(j&&R[F])j.textContent=R[F].css}),V.appendChild(H)}),D.appendChild(V),document.body.appendChild(D),document.addEventListener("click",(F)=>{if(D&&D.style.display==="flex"){if(!D.contains(F.target)&&!X.contains(F.target))D.style.display="none"}})}if(X.addEventListener("click",(U)=>{if(U.stopPropagation(),D){let M=X.getBoundingClientRect();D.style.top=`${M.bottom+8}px`,D.style.right=`${Math.max(16,window.innerWidth-M.right)}px`,D.style.left="auto",D.style.display=D.style.display==="flex"?"none":"flex"}}),Y)Y.prepend(X);else if($)$.appendChild(X);else if(q)q.prepend(X);else X.style.position="fixed",X.style.top="12px",X.style.right="16px",Z.appendChild(X)}async function w0(){console.log("[YTMD] Initializing YouTube Music Desktop integration bridge...");let _={};b0(_),setInterval(()=>b0(_),1000),w("get_config").then((z)=>{if(z&&typeof z==="object")_=z});let Y={track:null,config:_,invoke:w,sendPlayerCommand:(z)=>{Z(z)},getVideoElement:()=>G.getVideo()};t=Y;let $=new d(Y);$.register(e),$.register(_0),$.register(X0),$.register(z0),$.register(D0),$.register(J0),$.register(U0),$.register(M0),$.register(F0),$.register(Q0),$.register(G0),$.register(H0),$.register(W0),$.register(C0),$.register(j0);try{await $.initAll()}catch(z){console.error("[YTMD] Registry init error:",z)}let q=new g;q.onTrackChange(async(z)=>{u=z,$.handleTrackChange(z);try{await w("update_track_info",{track:{title:z.title,artist:z.artist,album:z.album||null,cover_url:z.coverUrl||null,duration_secs:Math.round(z.durationSecs||0),current_time_secs:Math.round(z.currentTimeSecs||0),is_playing:z.isPlaying,video_id:z.videoId||null}})}catch(h){console.error("[YTMD] Failed to sync track info to backend:",h)}}),q.onPlaybackChange(async(z)=>{$.handlePlaybackChange(z);let h=q.getCurrentTrack();if(h){h.isPlaying=z;try{await w("update_track_info",{track:{title:h.title,artist:h.artist,album:h.album||null,cover_url:h.coverUrl||null,duration_secs:Math.round(h.durationSecs||0),current_time_secs:Math.round(h.currentTimeSecs||0),is_playing:z,video_id:h.videoId||null}})}catch(D){console.error("[YTMD] Failed to sync playback status:",D)}}}),q.onTick((z)=>{$.handleTick(z)});function Z(z){switch(z){case"play":G.play();break;case"pause":G.pause();break;case"play_pause":G.playPause();break;case"next":G.next();break;case"previous":G.previous();break;case"like":G.toggleLike();break;case"dislike":G.toggleDislike();break;case"mute":G.toggleMute();break}}let X=(z,h)=>{let D=window.__TAURI__;if(D?.event?.listen)D.event.listen(z,(U)=>h(U.payload))};X("player-command",(z)=>Z(z)),X("tray-command",(z)=>Z(z)),X("mpris-command",(z)=>Z(z)),X("global-shortcut-event",(z)=>Z(z)),X("player-seek",(z)=>G.seekTo(z)),X("mpris-command-seek",(z)=>G.seekTo(z)),X("player-volume",(z)=>G.setVolume(z)),window.addEventListener("keydown",(z)=>{if(z.ctrlKey&&z.key===","||z.key==="F2")z.preventDefault(),w("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var L0=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(L0)if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>w0());else w0();
