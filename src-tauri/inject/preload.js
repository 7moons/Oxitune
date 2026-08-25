class x{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(_){this.onTrackChangeCallbacks.push(_)}onPlaybackChange(_){this.onPlaybackChangeCallbacks.push(_)}onTick(_){this.onTickCallbacks.push(_)}initObservers(){if("mediaSession"in navigator);let _=()=>{let $=document.querySelector("video");if($)$.addEventListener("play",()=>this.handlePlaybackChange(!0)),$.addEventListener("pause",()=>this.handlePlaybackChange(!1)),$.addEventListener("ended",()=>this.handlePlaybackChange(!1)),$.addEventListener("timeupdate",()=>{let h=$.currentTime;this.onTickCallbacks.forEach((D)=>D(h))})},f=!1,b=new MutationObserver(()=>{if(f)return;f=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),f=!1})}),q=document.querySelector("ytmusic-player-bar")||document.body;if(q)b.observe(q,{childList:!0,subtree:!0,characterData:!0});_(),this.tickInterval=window.setInterval(()=>{this.checkTrackUpdate();let $=document.querySelector("video");if($&&!$.paused)this.onTickCallbacks.forEach((h)=>h($.currentTime))},250)}extractTrackInfo(){let _=document.querySelector("video");if(Boolean(document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-text")||_?.closest(".ad-showing")))return null;let Y=navigator.mediaSession?.metadata,b=Y?.title||"",q=Y?.artist||"",$=Y?.album||"",h=Y?.artwork?.[Y.artwork.length-1]?.src||"";if(!b){let z=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(z)b=z.textContent?.trim()||""}if(!q){let z=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(z){let Q=(z.textContent?.trim()||"").split("•").map((H)=>H.trim());if(q=Q[0]||"",Q.length>1)$=Q[1]}}if(!h){let z=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(z)h=z.src}let J=new URLSearchParams(window.location.search).get("v")||void 0,Z=_?Math.floor(_.duration||0):0,M=_?Math.floor(_.currentTime||0):0,V=_?!_.paused&&!_.ended:!1;if(!b)return null;return{title:b,artist:q||"Unknown Artist",album:$||void 0,coverUrl:h||void 0,durationSecs:Z,currentTimeSecs:M,isPlaying:V,videoId:J}}checkTrackUpdate(){let _=this.extractTrackInfo();if(!_)return;let f=!this.currentTrack||this.currentTrack.title!==_.title||this.currentTrack.artist!==_.artist||this.currentTrack.videoId!==_.videoId,Y=this.currentTrack&&this.currentTrack.isPlaying!==_.isPlaying;if(this.currentTrack=_,f)this.onTrackChangeCallbacks.forEach((b)=>b(_));if(Y)this.onPlaybackChangeCallbacks.forEach((b)=>b(_.isPlaying))}handlePlaybackChange(_){if(this.currentTrack)this.currentTrack.isPlaying=_;this.onPlaybackChangeCallbacks.forEach((f)=>f(_))}destroy(){if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null}}class U{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let _=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(_){_.click();return}let f=this.getVideo();if(f)if(f.paused)f.play();else f.pause()}static play(){let _=this.getVideo();if(_&&_.paused)this.playPause()}static pause(){let _=this.getVideo();if(_&&!_.paused)this.playPause()}static next(){let _=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(_)_.click()}static previous(){let _=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(_)_.click()}static seekTo(_){let f=this.getVideo();if(f&&!isNaN(_))f.currentTime=Math.max(0,Math.min(_,f.duration||_))}static setVolume(_){let f=this.getVideo();if(f)f.volume=Math.max(0,Math.min(1,_))}static toggleLike(){let _=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(_)_.click()}static toggleDislike(){let _=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(_)_.click()}static toggleMute(){let _=document.querySelector("ytmusic-player-bar #volume-slider"),f=this.getVideo();if(f)f.muted=!f.muted;if(_){let Y=_.parentElement?.querySelector("paper-icon-button, #button");if(Y)Y.click()}}}class S{plugins=new Map;enabledPlugins=new Set;context;constructor(_){this.context=_}register(_){if(this.plugins.set(_.id,_),_.defaultEnabled)this.enabledPlugins.add(_.id)}async initAll(_){for(let[f,Y]of this.plugins)if(_?.[f]!==void 0?_[f]:Y.defaultEnabled){if(this.enabledPlugins.add(f),Y.onInit)try{await Y.onInit(this.context)}catch(q){console.error(`[YTMD] Failed to init plugin ${f}:`,q)}}else this.enabledPlugins.delete(f)}async enable(_){let f=this.plugins.get(_);if(f&&!this.enabledPlugins.has(_)){if(this.enabledPlugins.add(_),f.onInit)await f.onInit(this.context)}}async disable(_){let f=this.plugins.get(_);if(f&&this.enabledPlugins.has(_)){if(this.enabledPlugins.delete(_),f.onDestroy)await f.onDestroy()}}handleTrackChange(_){this.context.track=_;for(let f of this.enabledPlugins){let Y=this.plugins.get(f);if(Y?.onTrackChange)try{Y.onTrackChange(_,this.context)}catch(b){console.error(`[YTMD] Error in plugin ${f} onTrackChange:`,b)}}}handlePlaybackChange(_){for(let f of this.enabledPlugins){let Y=this.plugins.get(f);if(Y?.onPlaybackChange)try{Y.onPlaybackChange(_,this.context)}catch(b){console.error(`[YTMD] Error in plugin ${f} onPlaybackChange:`,b)}}}handleTick(_){for(let f of this.enabledPlugins){let Y=this.plugins.get(f);if(Y?.onTick)try{Y.onTick(_,this.context)}catch(b){console.error(`[YTMD] Error in plugin ${f} onTick:`,b)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(_){return this.enabledPlugins.has(_)}}function I(_){if(!_||typeof _!=="object")return _;let f=_;if(Array.isArray(f)){for(let b=0;b<f.length;b++)I(f[b]);return _}let Y=["adPlacements","playerAds","adSlots","adBreakHeartbeatParams","adBreakParams","adTimeout","instreamAdPlayerConfig","adParams","adTagUrl"];for(let b of Y)if(b in f)delete f[b];if(f.playerResponse&&typeof f.playerResponse==="object")I(f.playerResponse);return _}function k(){if(typeof window>"u")return;if(window.__ytmd_network_hooks_installed)return;window.__ytmd_network_hooks_installed=!0;try{let b=window.ytInitialPlayerResponse;if(b)I(b);Object.defineProperty(window,"ytInitialPlayerResponse",{configurable:!0,enumerable:!0,get(){return b},set(q){b=I(q)}})}catch(b){}let _=window.fetch;if(typeof _==="function")window.fetch=async function(b,q){let $=typeof b==="string"?b:b instanceof URL?b.href:b.url;if($&&($.includes("doubleclick.net")||$.includes("googleads")||$.includes("googlesyndication.com")||$.includes("/pagead/")))return new Response("{}",{status:200,statusText:"OK",headers:{"Content-Type":"application/json"}});let h=await _.call(this,b,q);if($&&($.includes("/youtubei/v1/player")||$.includes("/youtubei/v1/next")||$.includes("/youtubei/v1/browse")))try{let J=await h.clone().json();I(J);let Z=JSON.stringify(J);return new Response(Z,{status:h.status,statusText:h.statusText,headers:h.headers})}catch(D){return h}return h};let f=XMLHttpRequest.prototype.open,Y=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.open=function(b,q){return this._ytmd_url=typeof q==="string"?q:q.href,f.apply(this,arguments)},XMLHttpRequest.prototype.send=function(b){let q=this._ytmd_url||"";if(q.includes("doubleclick.net")||q.includes("googleads")||q.includes("googlesyndication.com")||q.includes("/pagead/")){setTimeout(()=>{try{Object.defineProperty(this,"readyState",{value:4,configurable:!0}),Object.defineProperty(this,"status",{value:200,configurable:!0}),Object.defineProperty(this,"statusText",{value:"OK",configurable:!0}),Object.defineProperty(this,"responseText",{value:"{}",configurable:!0}),Object.defineProperty(this,"response",{value:"{}",configurable:!0}),this.dispatchEvent(new Event("readystatechange")),this.dispatchEvent(new Event("load")),this.dispatchEvent(new Event("loadend"))}catch($){}},0);return}if(q.includes("/youtubei/v1/player")||q.includes("/youtubei/v1/next")||q.includes("/youtubei/v1/browse"))this.addEventListener("readystatechange",()=>{if(this.readyState===4&&this.status===200)try{let $=this.responseText;if($){let h=JSON.parse($);I(h);let D=JSON.stringify(h);Object.defineProperty(this,"responseText",{value:D,configurable:!0}),Object.defineProperty(this,"response",{value:D,configurable:!0})}}catch($){}});return Y.apply(this,arguments)}}var t={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Blocks audio/video ads, auto-skips pre-rolls, and dismisses premium upsell banners",defaultEnabled:!0,onInit(_){if(k(),typeof document>"u")return;let f=null,Y=!1,b=1,q=!1,$=()=>{let J=_.getVideoElement(),Z=document.getElementById("movie_player");if(Z){if(typeof Z.getAdState==="function"&&Z.getAdState()===1)try{Z.skipAd?.()}catch(K){}if(typeof Z.isAdPlaying==="function"&&Z.isAdPlaying())try{Z.skipAd?.()}catch(K){}}let M=Boolean(document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-module")!==null||Z?.classList?.contains("ad-showing")||Z?.classList?.contains("ad-interrupting"));if(M&&J){if(!Y)b=J.playbackRate,q=J.muted;if(J.muted=!0,J.playbackRate=16,J.duration&&isFinite(J.duration))J.currentTime=J.duration;else J.currentTime=99999;Y=!0}else if(!M&&Y){if(J)J.muted=q,J.playbackRate=b;Y=!1}document.querySelectorAll(".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button, .ytp-ad-overlay-close-button").forEach((K)=>K.click()),document.querySelectorAll("ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)").forEach((K)=>{K.style.display="none";let Q=K.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(Q)Q.click()})},h=document.createElement("style");h.id="ytmd-adblock-styles",h.textContent=`
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
    `,document.head.appendChild(h),(()=>{let J=_.getVideoElement();if(J)J.addEventListener("timeupdate",$),J.addEventListener("play",$),J.addEventListener("loadedmetadata",$)})(),f=window.setInterval($,100),this._cleanup=()=>{if(f)clearInterval(f);let J=document.getElementById("ytmd-adblock-styles");if(J)J.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var a={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){this._segments=[],this._lastVideoId="",this._skippedSegments=new Set},async onTrackChange(_){if(!_.videoId||_.videoId===this._lastVideoId)return;this._lastVideoId=_.videoId,this._segments=[],this._skippedSegments=new Set;try{let f=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),Y=`https://sponsor.ajay.app/api/skipSegments?videoID=${_.videoId}&categories=${encodeURIComponent(f)}`,b=await fetch(Y);if(b.ok){let q=await b.json();this._segments=q,console.log(`[YTMD SponsorBlock] Loaded ${q.length} segments for ${_.videoId}`)}}catch(f){}},onTick(_,f){let Y=this._segments;if(!Y||Y.length===0)return;let b=this._skippedSegments;for(let q of Y){let[$,h]=q.segment;if(_>=$&&_<h-0.5&&!b.has(q.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${q.category}): ${$}s -> ${h}s`);let D=f.getVideoElement();if(D)D.currentTime=h,b.add(q.UUID);break}}}};function j(_,f=18,Y=18,b="0 0 24 24"){let q=document.createElementNS("http://www.w3.org/2000/svg","svg");q.setAttribute("width",String(f)),q.setAttribute("height",String(Y)),q.setAttribute("viewBox",b),q.setAttribute("fill","currentColor");let $=document.createElementNS("http://www.w3.org/2000/svg","path");return $.setAttribute("d",_),q.appendChild($),q}var c="http://www.w3.org/2000/svg",G0="circle|path|rect|line|polyline|polygon|g|ellipse";function r(_){let f=document.createElementNS(c,"svg"),Y=($,h)=>{for(let D of h.matchAll(/([\w:-]+)="([^"]*)"/g))$.setAttribute(D[1],D[2])},b=_.match(/^<svg([^>]*)>/);if(b)Y(f,b[1]);let q=new RegExp(`<(${G0})([^>]*)\\/?>`,"g");for(let $ of _.matchAll(q)){let h=document.createElementNS(c,$[1]);Y(h,$[2]),f.appendChild(h)}return f}function X(_,f){let Y=document.createElement(_);if(f?.id)Y.id=f.id;if(f?.className)Y.className=f.className;if(f?.text!==void 0)Y.textContent=f.text;if(f?.title)Y.title=f.title;if(f?.style)Y.style.cssText=f.style;return Y}var O=[],P=-1,R=null,g="",_0={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(_){O=[],P=-1,R=null,g="";let f=document.createElement("style");f.id="ytmd-native-lyrics-styles",f.textContent=`
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
    `,document.head.appendChild(f);let Y=()=>{n(),e(_)},b=window.setInterval(Y,600);Y();let q=($)=>{let h=$.message||"";if(h.includes("toCommand")||h.includes("no longer a child of this node")||typeof $.error?.stack==="string"&&$.error.stack.includes("onCurrentTabIndexChanged"))Y()};window.addEventListener("error",q),this._cleanup=()=>{clearInterval(b),window.removeEventListener("error",q),f.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((h)=>h.remove())}},async onTrackChange(_,f){let Y=`${_.title} - ${_.artist}`;if(g===Y&&O.length>0)return;g=Y,O=[],P=-1,R=null,n();let b=document.getElementById("ytmd-native-lyrics-wrapper");if(b)b.replaceChildren(X("div",{className:"ytmd-native-lyrics-status",text:"Loading synchronized lyrics..."}));try{let q=await f.invoke("fetch_lyrics",{artist:_.artist,title:_.title,albumName:_.album||null,duration:_.durationSecs||null});if(R=q,q?.syncedLyrics)O=F0(q.syncedLyrics);n(),e(f),f0(f)}catch{if(b)b.replaceChildren(X("div",{className:"ytmd-native-lyrics-status",text:"No lyrics available for this track."}))}},onTick(_){if(!O||O.length===0)return;let f=-1;for(let Y=0;Y<O.length;Y++)if(_>=O[Y].timeSecs)f=Y;else break;if(f!==P&&f>=0){P=f;let Y=document.getElementById("ytmd-native-lyrics-wrapper");if(Y){let b=Y.querySelectorAll(".ytmd-native-lyric-line");b.forEach(($,h)=>{if(h===f)$.classList.add("active");else $.classList.remove("active")});let q=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(q&&O0(q)){let $=b[f];if($)$.scrollIntoView({behavior:"smooth",block:"nearest"})}}}},onDestroy(){if(this._cleanup)this._cleanup()}};function O0(_){if(!_||_.offsetParent===null||_.hasAttribute("hidden"))return!1;let f=window.getComputedStyle(_);return f.display!=="none"&&f.visibility!=="hidden"&&f.opacity!=="0"}function n(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((f)=>{let Y=f.textContent?.toLowerCase()||"";if(Y.includes("tekst")||Y.includes("lyrics")||Y.includes("paroles")||Y.includes("letras"))f.disabled=!1,f.removeAttribute("disabled"),f.removeAttribute("aria-disabled"),f.classList.remove("disabled"),f.classList.add("ytmd-lyrics-tab-unlocked"),f.style.pointerEvents="auto",f.style.cursor="pointer"})}function e(_){let f=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!f){document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((q)=>q.remove());return}let Y=f.querySelector("ytmusic-description-shelf-renderer, ytmusic-message-renderer");if(Y)Y.style.display="none";let b=document.getElementById("ytmd-native-lyrics-wrapper");if(!b||!f.contains(b)){if(b)b.remove();b=X("div",{id:"ytmd-native-lyrics-wrapper"}),f.appendChild(b),f0(_)}}function f0(_){let f=document.getElementById("ytmd-native-lyrics-wrapper");if(!f)return;if(O&&O.length>0)f.replaceChildren(...O.map((Y,b)=>{let q=X("div",{className:`ytmd-native-lyric-line${b===P?" active":""}`,text:Y.text});return q.addEventListener("click",()=>{let $=_.getVideoElement();if($)$.currentTime=Y.timeSecs}),q}),X("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}));else if(R?.plainLyrics){let Y=R.plainLyrics.split(`
`);f.replaceChildren(...Y.map((b)=>X("div",{className:"ytmd-native-lyric-line active",text:b,style:"cursor: default;"})),X("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else f.replaceChildren(X("div",{className:"ytmd-native-lyrics-status",text:"Synced lyrics unavailable for this track."}))}function F0(_){let f=_.split(`
`),Y=[],b=/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;for(let q of f){let $=b.exec(q.trim());if($){let h=parseInt($[1],10),D=parseInt($[2],10),J=parseInt($[3].padEnd(3,"0").slice(0,3),10),Z=h*60+D+J/1000,M=$[4].trim();if(M)Y.push({timeSecs:Z,text:M})}}return Y.sort((q,$)=>q.timeSecs-$.timeSecs)}var Y0={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit(_){let f=(Y)=>{let b=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!b)return;let q=b.getBoundingClientRect();if(Y.clientX>=q.left&&Y.clientX<=q.right&&Y.clientY>=q.top&&Y.clientY<=q.bottom){Y.preventDefault();let $=_.getVideoElement();if($){let h=_.config.wheel_volume_step||0.05,D=Y.deltaY<0?h:-h,J=Math.max(0,Math.min(1,$.volume+D));$.volume=J}}};window.addEventListener("wheel",f,{passive:!1}),this._cleanup=()=>{window.removeEventListener("wheel",f)}},onDestroy(){if(this._cleanup)this._cleanup()}};var $0={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(_,f){if(!f.config?.notifications_enabled)return;if(!_.title||_.title==="No Track Playing")return;try{await f.invoke("notify_track_change",{title:_.title,artist:_.artist})}catch(Y){console.warn("[YTMD] Notification dispatch failed:",Y)}}};var b0={id:"visualizer",name:"Modern Clean Theme & Custom CSS",description:"Applies sleek dark aesthetics, subtle scrollbars, and user-defined custom CSS",defaultEnabled:!0,onInit(_){let f=document.createElement("style");f.id="ytmd-theme-styles";let Y=_.config.custom_css||"",b=`
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
    `;f.textContent=`${b}
${Y}`,document.head.appendChild(f),this._cleanup=()=>{f.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var p=[32,64,125,250,500,1000,2000,4000,8000,16000],o={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function u(_){return Math.max(-12,Math.min(12,_))}class G{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;static getInstance(){if(!G.instance)G.instance=new G;return G.instance}init(_){if(this.isInitialized&&this.hookedVideo===_){this.resumeContext();return}try{let f=window.AudioContext||window.webkitAudioContext;if(!f){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new f,this.hookedVideo=_,this.sourceNode=this.audioCtx.createMediaElementSource(_),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=p.map((b,q)=>{if(!this.audioCtx)throw Error("AudioContext missing");let $=this.audioCtx.createBiquadFilter();if(q===0)$.type="lowshelf";else if(q===p.length-1)$.type="highshelf";else $.type="peaking",$.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return $.frequency.setValueAtTime(b,this.audioCtx.currentTime),$.gain.setValueAtTime(0,this.audioCtx.currentTime),$}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph();let Y=()=>this.resumeContext();_.addEventListener("play",Y),_.addEventListener("playing",Y),document.addEventListener("click",Y,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(f){console.error("[YTMD DSP] Failed to initialize AudioEngine:",f)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((f)=>f.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let _=this.sourceNode;if(this.isNormalizing)_.connect(this.compressorNode),_=this.compressorNode;for(let f of this.filters)_.connect(f),_=f;_.connect(this.preampNode),_=this.preampNode,_.connect(this.fadeNode),_=this.fadeNode,_.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(_){console.error("[YTMD DSP] Graph rebuild error:",_)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(_,f){if(_<0||_>=this.filters.length||!this.audioCtx)return;let Y=u(f);this.filters[_].gain.setValueAtTime(Y,this.audioCtx.currentTime)}setAllGains(_){if(!this.audioCtx)return;_.forEach((f,Y)=>{if(Y<this.filters.length)this.filters[Y].gain.setValueAtTime(u(f),this.audioCtx.currentTime)})}setPreamp(_){if(!this.preampNode||!this.audioCtx)return;let f=Math.pow(10,u(_)/20);this.preampNode.gain.setValueAtTime(f,this.audioCtx.currentTime)}setLoudnessNormalization(_){if(this.isNormalizing!==_)this.isNormalizing=_,this.rebuildGraph()}applyPreset(_){let f=o[_]||o.flat;if(this.setAllGains(f.gains),f.preamp!==void 0)this.setPreamp(f.preamp);return f.gains}fadeIn(_){if(!this.fadeNode||!this.audioCtx||_<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let f=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(f),this.fadeNode.gain.setValueAtTime(0.001,f),this.fadeNode.gain.linearRampToValueAtTime(1,f+_)}fadeOut(_){if(!this.fadeNode||!this.audioCtx||_<=0)return;let f=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(f),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,f),this.fadeNode.gain.linearRampToValueAtTime(0.001,f+_)}resetFade(){if(this.fadeNode&&this.audioCtx){let _=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(_),this.fadeNode.gain.setValueAtTime(1,_)}}getAudioPowerDb(){if(!this.analyserNode)return-100;let _=new Float32Array(this.analyserNode.fftSize);this.analyserNode.getFloatTimeDomainData(_);let f=0;for(let b=0;b<_.length;b++)f+=_[b]*_[b];let Y=Math.sqrt(f/_.length);if(Y<=0.00001)return-100;return 20*Math.log10(Y)}getFrequencyData(){if(!this.analyserNode)return null;let _=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(_),_}setPlaybackRate(_){let f=Math.max(0.5,Math.min(2,_));if(this.hookedVideo)this.hookedVideo.playbackRate=f}setPreservesPitch(_){if(this.hookedVideo)this.hookedVideo.preservesPitch=_,this.hookedVideo.mozPreservesPitch=_,this.hookedVideo.webkitPreservesPitch=_}}class d{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";setCrossfadeSeconds(_){this.crossfadeSeconds=Math.max(0,Math.min(12,_))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(_){if(this.fadeOutTriggered=!1,this.currentTrackId=_.videoId||`${_.title}-${_.artist}`,this.crossfadeSeconds>0)G.getInstance().fadeIn(this.crossfadeSeconds);else G.getInstance().resetFade()}onTick(_,f){if(!f||this.crossfadeSeconds<=0||f.durationSecs<=0)return;let Y=f.durationSecs-_;if(Y<=this.crossfadeSeconds&&!this.fadeOutTriggered&&Y>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${Y.toFixed(1)}s remaining)...`),G.getInstance().fadeOut(Y),setTimeout(()=>{let b=f.videoId||`${f.title}-${f.artist}`;if(this.currentTrackId===b)console.log("[YTMD Crossfade] Advancing to next track..."),U.next()},Math.max(100,(Y-0.2)*1000))}}class s{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(_){this.enabled=_}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(_,f,Y){if(!this.enabled||!f||!Y||Y.paused||Y.ended)return;let b=G.getInstance().getAudioPowerDb();if(!this.checkedIntro&&_<15)if(b<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&_<12)console.log(`[YTMD Skip Silence] Intro silence detected (${b.toFixed(1)} dB). Fast forwarding...`),Y.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(f.durationSecs>15&&_>f.durationSecs-10)if(b<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${b.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,U.next()}else this.consecutiveSilentTicks=0}}var h0={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(_){let f=_.getVideoElement(),Y=G.getInstance(),b=new d,q=new s;if(this._crossfade=b,this._skipSilence=q,f)Y.init(f);else{let h=setInterval(()=>{let D=_.getVideoElement();if(D)clearInterval(h),Y.init(D)},500)}let $=_.config;if($.equalizer_gains&&Array.isArray($.equalizer_gains))Y.setAllGains($.equalizer_gains);else if($.equalizer_preset&&typeof $.equalizer_preset==="string")Y.applyPreset($.equalizer_preset);if($.preamp_gain!==void 0)Y.setPreamp($.preamp_gain);if($.loudness_normalization!==void 0)Y.setLoudnessNormalization(Boolean($.loudness_normalization));if($.crossfade_seconds!==void 0)b.setCrossfadeSeconds($.crossfade_seconds);if($.skip_silence_enabled!==void 0)q.setEnabled(Boolean($.skip_silence_enabled));if($.playback_speed!==void 0)Y.setPlaybackRate($.playback_speed);if($.preserve_pitch!==void 0)Y.setPreservesPitch(Boolean($.preserve_pitch));if(window.__TAURI__?.event){let{listen:h}=window.__TAURI__.event;h("set-eq-band",(D)=>{Y.setBandGain(D.payload.bandIndex,D.payload.gain)}),h("set-eq-all",(D)=>{Y.setAllGains(D.payload.gains)}),h("set-eq-preset",(D)=>{Y.applyPreset(D.payload)}),h("set-preamp",(D)=>{Y.setPreamp(D.payload)}),h("set-loudness-normalization",(D)=>{Y.setLoudnessNormalization(D.payload)}),h("set-crossfade-seconds",(D)=>{b.setCrossfadeSeconds(D.payload)}),h("set-skip-silence",(D)=>{q.setEnabled(D.payload)}),h("set-playback-rate",(D)=>{Y.setPlaybackRate(D.payload)}),h("set-preserves-pitch",(D)=>{Y.setPreservesPitch(D.payload)})}console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(_){let f=this._crossfade,Y=this._skipSilence;if(f)f.onTrackChange(_);if(Y)Y.onTrackChange()},onTick(_,f){let Y=this._crossfade,b=this._skipSilence;if(Y)Y.onTick(_,f.track);if(b)b.onTick(_,f.track,f.getVideoElement())}};async function q0(_){return new Promise((f)=>{let Y={primary:"#18181b",secondary:"#09090b",accent:"#dc2626"};if(!_){f(Y);return}let b=new Image;b.crossOrigin="anonymous",b.onload=()=>{try{let q=document.createElement("canvas");q.width=16,q.height=16;let $=q.getContext("2d");if(!$){f(Y);return}$.drawImage(b,0,0,16,16);let h=$.getImageData(0,0,16,16).data,D=0,J=0,Z=0,M=0,V=0,z=0,K=0,Q=0;for(let N=0;N<h.length;N+=4){let y=h[N],E=h[N+1],B=h[N+2];if(h[N+3]<128)continue;let i=(y+E+B)/3;if(i<20||i>240)continue;if(N<h.length/2)D+=y,J+=E,Z+=B,M++;else V+=y,z+=E,K+=B,Q++}if(M===0&&Q===0){f(Y);return}let H=M>0?Math.round(D/M):220,L=M>0?Math.round(J/M):38,T=M>0?Math.round(Z/M):38,A=Q>0?Math.round(V/Q):24,C=Q>0?Math.round(z/Q):24,m=Q>0?Math.round(K/Q):27;f({primary:`rgb(${H}, ${L}, ${T})`,secondary:`rgb(${A}, ${C}, ${m})`,accent:`rgb(${Math.min(255,H+30)}, ${Math.min(255,L+30)}, ${Math.min(255,T+30)})`})}catch{f(Y)}},b.onerror=()=>f(Y),b.src=_})}var D0={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Smoothly diffuses dynamic, reactive ambient colors from the active album cover behind the player",defaultEnabled:!0,onInit(_){let f=document.getElementById("ytmd-ambient-backdrop");if(!f)f=document.createElement("div"),f.id="ytmd-ambient-backdrop",document.body.prepend(f);let Y=typeof _.config.ambient_intensity==="number"?_.config.ambient_intensity:0.6,b=_.config.ambient_lighting_enabled!==!1,q=document.createElement("style");q.id="ytmd-ambient-styles",q.textContent=`
      #ytmd-ambient-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 0;
        opacity: ${b?Y:0};
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
    `,document.head.appendChild(q);let $=X("div",{id:"ytmd-orb-1",className:"ytmd-ambient-orb"}),h=X("div",{id:"ytmd-orb-2",className:"ytmd-ambient-orb"});if(f.appendChild($),f.appendChild(h),this._setIntensity=(D)=>{if(f)f.style.opacity=String(D)},window.__TAURI__?.event)window.__TAURI__.event.listen("set-ambient-intensity",(D)=>{this._setIntensity(D.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(D)=>{this._setIntensity(D.payload?0.6:0)});if(_.track)this.onTrackChange(_.track,_)},async onTrackChange(_){if(!_.coverUrl)return;try{let f=await q0(_.coverUrl),Y=document.getElementById("ytmd-ambient-backdrop");if(Y)Y.style.background=`
          radial-gradient(circle at 80% 20%, ${f.primary}66 0%, transparent 60%),
          radial-gradient(circle at 20% 80%, ${f.secondary}66 0%, transparent 60%)
        `}catch{}}};function H0(_){return`
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

    `}var N0=[{id:"default",name:"Modern Dark",background:"#0f0f0f",surface:"#121215",border:"#27272a",accent:"#3ea6ff",accentHover:"#65b8ff"},{id:"oled",name:"Pure OLED Black",background:"#000000",surface:"#0a0a0a",border:"#1a1a1a",accent:"#3ea6ff",accentHover:"#65b8ff"},{id:"nord",name:"Nord Arctic",background:"#2e3440",surface:"#3b4252",border:"#434c5e",accent:"#88c0d0",accentHover:"#a3d0dd"},{id:"catppuccin",name:"Catppuccin Mocha",background:"#1e1e2e",surface:"#181825",border:"#313244",accent:"#cba6f7",accentHover:"#dbc2fa"},{id:"gruvbox",name:"Gruvbox Dark",background:"#282828",surface:"#1d2021",border:"#3c3836",accent:"#fe8019",accentHover:"#fe9a4d"},{id:"tokyo_night",name:"Tokyo Night",background:"#1a1b26",surface:"#16161e",border:"#292e42",accent:"#7aa2f7",accentHover:"#9ab8f9"},{id:"dracula",name:"Dracula",background:"#282a36",surface:"#21222c",border:"#44475a",accent:"#bd93f9",accentHover:"#cfb0fb"},{id:"rose_pine",name:"Rosé Pine",background:"#191724",surface:"#1f1d2e",border:"#26233a",accent:"#eb6f92",accentHover:"#f08daa"}],w=Object.fromEntries(N0.map((_)=>[_.id,{id:_.id,name:_.name,css:H0(_)}]));var J0={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Applies curated aesthetic themes and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(_){let f=()=>document.head||document.documentElement,Y=(D)=>{let J=document.getElementById(D);if(!J){J=document.createElement("style"),J.id=D;let Z=f();if(Z)Z.appendChild(J)}return J},b=(D)=>{let J=w[D]||w.default,Z=Y("ytmd-active-theme");if(Z)Z.textContent=J.css},q=(D)=>{let J=Y("ytmd-custom-css");if(J)J.textContent=D},$=_.config.theme_preset||_.config.theme||"default";b($);let h=_.config.custom_css||"";if(q(h),window.__TAURI__?.event)window.__TAURI__.event.listen("set-theme-preset",(D)=>{b(D.payload)}),window.__TAURI__.event.listen("set-custom-css",(D)=>{q(D.payload)});console.log("[YTMD] Theme engine active.")}};var X0={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(_){let f=()=>{if(document.getElementById("ytmd-pip-btn"))return;let Y=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(Y){let b=X("button",{id:"ytmd-pip-btn",title:"Picture-in-Picture (Float Video)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),q=j("M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",20,20);b.appendChild(q),b.style.cssText=`
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
        `,b.addEventListener("mouseenter",()=>{b.style.color="#fafafa",b.style.backgroundColor="#27272a"}),b.addEventListener("mouseleave",()=>{b.style.color="#a1a1aa",b.style.backgroundColor="transparent"}),b.addEventListener("click",async()=>{let $=_.getVideoElement();if(!$)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await $.requestPictureInPicture();else await _.invoke("toggle_mini_player")}catch(h){console.warn("[YTMD PiP] Could not enter PiP:",h),await _.invoke("toggle_mini_player")}}),Y.appendChild(b)}};setInterval(f,1000),f()}};var Z0={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(_){let f=null,Y=!1,b=()=>{if(document.getElementById("ytmd-download-btn"))return;let q=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(q){let $=X("button",{id:"ytmd-download-btn",title:"Download Track (MP3/FLAC with ID3 Tags & Lyrics)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),h=j("M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z",20,20);$.appendChild(h),$.style.cssText=`
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
        `,$.addEventListener("mouseenter",()=>{if(!Y)$.style.color="#fafafa",$.style.backgroundColor="#27272a"}),$.addEventListener("mouseleave",()=>{if(!Y)$.style.color="#a1a1aa",$.style.backgroundColor="transparent"}),$.addEventListener("click",async()=>{if(!f||!f.videoId||Y)return;Y=!0,$.style.color="#38bdf8",$.title="Downloading...";try{let D=_.config.download_format||"mp3",J=_.config.embed_lyrics!==!1;await _.invoke("download_track",{request:{video_id:f.videoId,title:f.title,artist:f.artist,album:f.album||void 0,cover_url:f.coverUrl||void 0,format:D,embed_lyrics:J}}),$.style.color="#22c55e",$.title="Downloaded!",setTimeout(()=>{Y=!1,$.style.color="#a1a1aa",$.title="Download Track"},3000)}catch(D){console.error("[YTMD Downloader] Download failed:",D),$.style.color="#ef4444",setTimeout(()=>{Y=!1,$.style.color="#a1a1aa",$.title="Download Track"},3000)}}),q.appendChild($)}};setInterval(b,1000),b(),this._setCurrentTrack=(q)=>{f=q}},onTrackChange(_){if(this._setCurrentTrack)this._setCurrentTrack(_)}};var M0={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(_){console.log("[YTMD] Local files module ready.")}};class V0{isHost=!1;inRoom=!1;lastAppliedTimestamp=0;setRoomState(_,f){this.inRoom=_,this.isHost=f}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback(_,f){if(!this.inRoom||this.isHost||!f)return;let Y=Date.now(),b=(Y-_.timestamp_ms)/1000,q=_.is_playing?_.current_time_secs+Math.max(0,b):_.current_time_secs;this.lastAppliedTimestamp=Y;let $=new URLSearchParams(window.location.search).get("v");if(_.video_id&&$!==_.video_id){console.log(`[YTMD Room Sync] Switching to track: ${_.video_id}`),window.location.href=`https://music.youtube.com/watch?v=${_.video_id}`;return}if(_.is_playing&&f.paused)U.play();else if(!_.is_playing&&!f.paused)U.pause();let h=Math.abs(f.currentTime-q);if(h>1.5)console.log(`[YTMD Room Sync] Drift detected (${h.toFixed(2)}s). Resyncing to ${q.toFixed(1)}s...`),U.seekTo(q)}broadcastLocalState(_,f,Y){if(!this.inRoom||!this.isHost||!_||!_.videoId||!f)return;if(Date.now()-this.lastAppliedTimestamp<1000)return;Y("broadcast_sync_state",{playback:{video_id:_.videoId,title:_.title,artist:_.artist,current_time_secs:f.currentTime,is_playing:!f.paused,timestamp_ms:Date.now()}}).catch(()=>{})}}var U0={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(_){let f=new V0;if(this._controller=f,window.__TAURI__?.event)window.__TAURI__.event.listen("sync-room-updated",(Y)=>{f.setRoomState(!0,Y.payload.is_host)}),window.__TAURI__.event.listen("sync-room-left",()=>{f.setRoomState(!1,!1)}),window.__TAURI__.event.listen("sync-playback-remote",(Y)=>{f.handleRemotePlayback(Y.payload,_.getVideoElement())})},onTick(_,f){let Y=this._controller;if(Y&&Y.isInRoom()&&Y.isRoomHost())Y.broadcastLocalState(f.track,f.getVideoElement(),f.invoke)}};var z0={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Inhibits system sleep during active playback and auto-pauses when screen is locked",defaultEnabled:!0,onInit(_){let f=null,Y=_.config.inhibit_sleep!==!1,b=async()=>{if(!Y||f!==null)return;try{if("wakeLock"in navigator)f=await navigator.wakeLock.request("screen"),f.addEventListener("release",()=>{f=null});await _.invoke("set_inhibit_sleep",{inhibit:!0})}catch{}},q=async()=>{if(f!==null)try{await f.release(),f=null}catch{}await _.invoke("set_inhibit_sleep",{inhibit:!1})},$=_.getVideoElement();if($)$.addEventListener("play",b),$.addEventListener("playing",b),$.addEventListener("pause",q),$.addEventListener("ended",q);else{let h=setInterval(()=>{let D=_.getVideoElement();if(D)clearInterval(h),D.addEventListener("play",b),D.addEventListener("playing",b),D.addEventListener("pause",q),D.addEventListener("ended",q)},1000)}if(_.config.pause_on_lock)document.addEventListener("visibilitychange",()=>{if(document.hidden&&_.config.pause_on_lock);})}};var K0={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(_){window.__ytmd_show_remote_qr=()=>v(_),console.log("[YTMD] Mobile remote module ready.")}};async function v(_){document.getElementById("ytmd-remote-modal")?.remove();let f=X("div",{id:"ytmd-remote-modal",style:`
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
    `}),Y=()=>{document.removeEventListener("keydown",b),f.remove()},b=(V)=>{if(V.key==="Escape")Y()};document.addEventListener("keydown",b);let q=X("div",{style:`
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
    `}),$=X("h3",{text:"Mobile Web Remote",style:"margin: 0 0 6px 0; font-size: 18px; font-weight: 700;"}),h=X("p",{text:"Scan with your phone camera on the same Wi-Fi network:",style:"font-size: 13px; color: #a1a1aa; margin: 0 0 16px 0;"}),D=X("div",{id:"ytmd-qr-container",style:`
      background: #ffffff;
      padding: 14px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      min-width: 180px;
      min-height: 180px;
    `}),J=X("span",{text:"Generating QR code...",style:"color: #52525b; font-size: 12px; font-weight: 500;"});D.appendChild(J);let Z=X("div",{id:"ytmd-remote-url",style:"font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all; font-weight: 600;"}),M=X("button",{id:"ytmd-remote-close-btn",text:"Close",style:"background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 24px; font-weight: 600; cursor: pointer; font-size: 13px;"});M.addEventListener("click",Y),f.addEventListener("click",(V)=>{if(V.target===f)Y()}),q.appendChild($),q.appendChild(h),q.appendChild(D),q.appendChild(Z),q.appendChild(M),f.appendChild(q),document.body.appendChild(f);try{let V=await _.invoke("get_remote_info");if(!f.isConnected)return;if(V&&V.qr_svg){let z=X("img");z.src=`data:image/svg+xml;utf8,${encodeURIComponent(V.qr_svg)}`,z.width=180,z.height=180,z.style.display="block",z.alt="Mobile Remote QR Code",D.replaceChildren(z)}else D.replaceChildren(X("span",{text:"Remote server starting...",style:"color: #71717a; font-size: 12px;"}));if(V&&V.url)Z.textContent=V.url}catch(V){console.error("[YTMD Remote] Error fetching remote info:",V)}}var W=null,l=null,F=(_,f={})=>{return new Promise((Y)=>{let b=window.__TAURI__;if(!b?.event?.emit){Y(null);return}let q=Math.random().toString(36).slice(2)+Date.now().toString(36),$=null,h=setTimeout(()=>{if($)$();Y(null)},4000);b.event.listen(`ytmd-response-${q}`,(D)=>{if(clearTimeout(h),$)$();Y(D.payload)}).then((D)=>{$=D,b.event.emit("ytmd-invoke",{id:q,cmd:_,args:f})}).catch(()=>{clearTimeout(h),Y(null)})})};function Q0(_){if(document.getElementById("ytmd-burger-btn"))return;let f=document.querySelector("ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content"),Y=document.querySelector("ytmusic-nav-bar .left-content, ytmusic-nav-bar #left-content"),b=document.querySelector("ytmusic-nav-bar"),q=document.body||document.documentElement;if(!f&&!Y&&!q)return;let $=X("button",{id:"ytmd-burger-btn",title:"YouTube Music Desktop Menu (Ctrl+,)",style:`
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
    `}),h=j("M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",15,15),D=X("span",{text:"YTMD",style:"font-size: 12px; font-weight: 700; letter-spacing: 0.2px;"});$.appendChild(h),$.appendChild(D),$.addEventListener("mouseenter",()=>{$.style.background="#333333",$.style.borderColor="rgba(255, 255, 255, 0.3)",$.style.color="#ffffff"}),$.addEventListener("mouseleave",()=>{$.style.background="#212121",$.style.borderColor="rgba(255, 255, 255, 0.15)",$.style.color="#f4f4f5"});let J=document.getElementById("ytmd-burger-popover");if(!J){J=X("div",{id:"ytmd-burger-popover",style:`
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
      `});let Z=(K,Q,H,L)=>{let T=X("button",{style:`
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
        `}),A=X("span",{style:"display:flex; align-items:center; gap:10px;"}),C=X("span",{style:"display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; color:#a1a1aa;"});C.appendChild(r(K));let m=X("span",{text:Q,style:"font-weight: 500;"});A.appendChild(C),A.appendChild(m);let N=X("span",{text:H,style:"font-size: 11px; color: #71717a; font-family: monospace;"});return T.appendChild(A),T.appendChild(N),T.addEventListener("mouseenter",()=>{T.style.background="#27272a",T.style.color="#ffffff",C.style.color="#ffffff"}),T.addEventListener("mouseleave",()=>{T.style.background="transparent",T.style.color="#e4e4e7",C.style.color="#a1a1aa"}),T.addEventListener("click",()=>{if(J)J.style.display="none";L()}),T},M=()=>{return X("div",{style:"height: 1px !important; background: #27272a !important; margin: 6px 4px !important;"})};J.appendChild(Z('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',"Preferences & DSP EQ","Ctrl+,",()=>{F("toggle_settings_window")})),J.appendChild(Z('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',"Local Music Library","",()=>{F("toggle_local_library_window")})),J.appendChild(Z('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',"Listen Together (Sync)","",()=>{F("toggle_sync_window")})),J.appendChild(Z('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',"Mobile Web Remote","",()=>{if(l)v(l)})),J.appendChild(Z('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><rect x="12" y="9" width="8" height="6" rx="1"/></svg>',"Mini Player","",()=>{F("toggle_mini_player")})),J.appendChild(M()),J.appendChild(Z('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',"Download Current Track","",async()=>{if(!W||!W.videoId){alert("Please play a track first to download.");return}try{await F("download_track",{request:{video_id:W.videoId,title:W.title,artist:W.artist,album:W.album||void 0,cover_url:W.coverUrl||void 0,format:_.download_format||"mp3",embed_lyrics:_.embed_lyrics!==!1}}),alert(`Download started for: ${W.title}`)}catch(K){console.error("[YTMD Download Error]:",K)}}));let V=X("div",{style:"display: flex; gap: 4px; padding: 6px 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;"}),z=X("span",{text:"Theme:",style:"font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase;"});V.appendChild(z),["oled","nord","catppuccin","tokyo_night","gruvbox"].forEach((K)=>{let Q=X("button",{text:K.toUpperCase(),style:`
          background: #1c1c20;
          border: 1px solid #27272a;
          color: #a1a1aa;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        `});Q.addEventListener("click",()=>{let H=document.getElementById("ytmd-active-theme");if(H&&w[K])H.textContent=w[K].css}),V.appendChild(Q)}),J.appendChild(V),document.body.appendChild(J),document.addEventListener("click",(K)=>{if(J&&J.style.display==="flex"){if(!J.contains(K.target)&&!$.contains(K.target))J.style.display="none"}})}if($.addEventListener("click",(Z)=>{if(Z.stopPropagation(),J){let M=$.getBoundingClientRect();J.style.top=`${M.bottom+8}px`,J.style.right=`${Math.max(16,window.innerWidth-M.right)}px`,J.style.left="auto",J.style.display=J.style.display==="flex"?"none":"flex"}}),f)f.prepend($);else if(Y)Y.appendChild($);else if(b)b.prepend($);else $.style.position="fixed",$.style.top="12px",$.style.right="16px",q.appendChild($)}async function T0(){console.log("[YTMD] Initializing YouTube Music Desktop integration bridge...");let _={};Q0(_),setInterval(()=>Q0(_),1000),F("get_config").then((h)=>{if(h&&typeof h==="object")_=h});let f={track:null,config:_,invoke:F,sendPlayerCommand:(h)=>{q(h)},getVideoElement:()=>U.getVideo()};l=f;let Y=new S(f);Y.register(t),Y.register(a),Y.register(_0),Y.register(Y0),Y.register($0),Y.register(b0),Y.register(h0),Y.register(D0),Y.register(J0),Y.register(X0),Y.register(Z0),Y.register(M0),Y.register(U0),Y.register(z0),Y.register(K0);try{await Y.initAll()}catch(h){console.error("[YTMD] Registry init error:",h)}let b=new x;b.onTrackChange(async(h)=>{W=h,Y.handleTrackChange(h);try{await F("update_track_info",{track:{title:h.title,artist:h.artist,album:h.album||null,cover_url:h.coverUrl||null,duration_secs:h.durationSecs,current_time_secs:h.currentTimeSecs,is_playing:h.isPlaying,video_id:h.videoId||null}})}catch(D){console.error("[YTMD] Failed to sync track info to backend:",D)}}),b.onPlaybackChange(async(h)=>{Y.handlePlaybackChange(h);let D=b.getCurrentTrack();if(D){D.isPlaying=h;try{await F("update_track_info",{track:{title:D.title,artist:D.artist,album:D.album||null,cover_url:D.coverUrl||null,duration_secs:D.durationSecs,current_time_secs:D.currentTimeSecs,is_playing:h,video_id:D.videoId||null}})}catch(J){console.error("[YTMD] Failed to sync playback status:",J)}}}),b.onTick((h)=>{Y.handleTick(h)});function q(h){switch(h){case"play":U.play();break;case"pause":U.pause();break;case"play_pause":U.playPause();break;case"next":U.next();break;case"previous":U.previous();break;case"like":U.toggleLike();break;case"dislike":U.toggleDislike();break;case"mute":U.toggleMute();break}}let $=(h,D)=>{let J=window.__TAURI__;if(J?.event?.listen)J.event.listen(h,(Z)=>D(Z.payload))};$("player-command",(h)=>q(h)),$("tray-command",(h)=>q(h)),$("mpris-command",(h)=>q(h)),$("global-shortcut-event",(h)=>q(h)),$("player-seek",(h)=>U.seekTo(h)),$("mpris-command-seek",(h)=>U.seekTo(h)),$("player-volume",(h)=>U.setVolume(h)),window.addEventListener("keydown",(h)=>{if(h.ctrlKey&&h.key===","||h.key==="F2")h.preventDefault(),F("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var W0=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(W0)if(k(),document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>T0());else T0();
