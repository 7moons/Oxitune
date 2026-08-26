function Ce(e){let t=e.trim().split(":").map((n)=>parseInt(n,10));if(t.some((n)=>isNaN(n)))return 0;if(t.length===2)return t[0]*60+t[1];else if(t.length===3)return t[0]*3600+t[1]*60+t[2];return 0}class se{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;pauseDebounceTimeout=null;constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if(typeof navigator<"u"&&"mediaSession"in navigator&&navigator.mediaSession){let o=navigator.mediaSession,l=o.metadata;try{Object.defineProperty(o,"metadata",{get:()=>l,set:(c)=>{l=c,setTimeout(()=>this.checkTrackUpdate(),0)},configurable:!0,enumerable:!0})}catch(c){}}let e=()=>{let o=document.querySelector("video");if(o)o.addEventListener("play",()=>this.handlePlaybackChange(!0)),o.addEventListener("playing",()=>this.handlePlaybackChange(!0)),o.addEventListener("pause",()=>this.handlePlaybackChange(!1)),o.addEventListener("ended",()=>this.handlePlaybackChange(!1)),o.addEventListener("timeupdate",()=>{let l=o.currentTime;this.onTickCallbacks.forEach((c)=>c(l))})},t=!1,i=new MutationObserver(()=>{if(t)return;t=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),t=!1})}),a=document.querySelector("ytmusic-player-bar")||document.body;if(a)i.observe(a,{childList:!0,subtree:!0,characterData:!0});e(),this.tickInterval=window.setInterval(()=>{this.checkTrackUpdate();let o=document.querySelector("video");if(o&&!o.paused)this.onTickCallbacks.forEach((l)=>l(o.currentTime))},250)}extractTrackInfo(){let e=document.querySelector("video"),t=document.getElementById("movie_player");if(Boolean(t&&(typeof t.getAdState==="function"&&t.getAdState()===1||typeof t.isAdPlaying==="function"&&t.isAdPlaying()||t.classList?.contains("ad-showing")||t.classList?.contains("ad-interrupting"))))return null;let i=navigator.mediaSession?.metadata,a=i?.title||"",o=i?.artist||"",l=i?.album||"",c="";if(i?.artwork&&i.artwork.length>0){let p=i.artwork[i.artwork.length-1];if(p&&p.src)c=p.src}if(!a){let p=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(p)a=p.textContent?.trim()||""}if(!o){let p=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(p){let T=(p.textContent?.trim()||"").split("•").map((h)=>h.trim());if(o=T[0]||"",T.length>1)l=T[1]}}if(!c){let p=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(p&&p.src)c=p.src}if(c.startsWith("//"))c=`https:${c}`;if(c.includes("googleusercontent.com")&&/=w\d+-h\d+/.test(c))c=c.replace(/=w\d+-h\d+[^=]*/,"=w512-h512-l90-rj");let s=new URLSearchParams(window.location.search).get("v")||void 0,d=0,u=0;if(t&&typeof t.getDuration==="function"){let p=t.getDuration();if(typeof p==="number"&&Number.isFinite(p)&&p>0)d=Math.floor(p)}if(t&&typeof t.getCurrentTime==="function"){let p=t.getCurrentTime();if(typeof p==="number"&&Number.isFinite(p)&&p>=0)u=Math.floor(p)}if(!d&&e&&Number.isFinite(e.duration)&&e.duration>0)d=Math.floor(e.duration);if(!u&&e&&Number.isFinite(e.currentTime)&&e.currentTime>=0)u=Math.floor(e.currentTime);let g=document.querySelector("ytmusic-player-bar .time-info, ytmusic-player-bar #time-info, .ytmusic-player-bar.time-info");if(g&&g.textContent){let p=g.textContent.split("/").map((b)=>b.trim());if(p.length===2){if(!u)u=Ce(p[0]);if(!d)d=Ce(p[1])}}if(!d){let b=document.querySelector("ytmusic-player-bar #progress-bar, #progress-bar")?.getAttribute("aria-valuemax");if(b){let T=parseInt(b,10);if(!isNaN(T)&&T>0)d=T}}let y=e?!e.paused&&!e.ended:!1;if(!a)return null;return{title:a,artist:o||"Unknown Artist",album:l||void 0,coverUrl:c||void 0,durationSecs:d,currentTimeSecs:u,isPlaying:y,videoId:s}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=!this.currentTrack||this.currentTrack.title!==e.title||this.currentTrack.artist!==e.artist||this.currentTrack.videoId!==e.videoId,n=this.currentTrack!==null&&(!this.currentTrack.durationSecs&&e.durationSecs>0||!this.currentTrack.coverUrl&&!!e.coverUrl||!this.currentTrack.album&&!!e.album||!this.currentTrack.videoId&&!!e.videoId),i=this.currentTrack!==null&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t||n){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;this.onTrackChangeCallbacks.forEach((a)=>a(e))}if(i)this.onPlaybackChangeCallbacks.forEach((a)=>a(e.isPlaying))}handlePlaybackChange(e){if(e){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.currentTrack)this.currentTrack.isPlaying=!0;this.checkTrackUpdate(),this.onPlaybackChangeCallbacks.forEach((t)=>t(!0))}else{if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout);this.pauseDebounceTimeout=setTimeout(()=>{if(this.pauseDebounceTimeout=null,this.currentTrack)this.currentTrack.isPlaying=!1;this.onPlaybackChangeCallbacks.forEach((t)=>t(!1))},400)}}destroy(){if(this.pauseDebounceTimeout!==null)clearTimeout(this.pauseDebounceTimeout),this.pauseDebounceTimeout=null;if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null}}class f{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)t.volume=Math.max(0,Math.min(1,e))}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}class le{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(a){console.error(`[YTMD] Failed to init plugin ${t}:`,a)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,i)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,i)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(i){console.error(`[YTMD] Error in plugin ${t} onTick:`,i)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var z=null,_={adWasShowing:!1,preAdMuted:!1},ce=new WeakSet,N=null,_e=null,Ze=".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button",et="ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)",tt=`
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
`,nt=(e)=>{let t=new Set(e);return t.has("ad-showing")||t.has("ad-interrupting")},it=(e,t,n)=>{if(e&&!t.adWasShowing)return{nextState:{adWasShowing:!0,preAdMuted:n},setMutedTo:!0};if(!e&&t.adWasShowing)return{nextState:{adWasShowing:!1,preAdMuted:t.preAdMuted},setMutedTo:t.preAdMuted};return{nextState:t,setMutedTo:null}},ue=()=>document.getElementById("movie_player"),ot=()=>{let e=ue();if(!e)return!1;return nt(e.classList)},de=(e)=>{let t=e.getVideoElement();if(!t)return;let{nextState:n,setMutedTo:i}=it(ot(),_,t.muted);if(_=n,i!==null)t.muted=i},Pe=(e)=>{if(ce.has(e))return;ce.add(e),e.click()},H=()=>{document.querySelectorAll(Ze).forEach(Pe),document.querySelectorAll(et).forEach((e)=>{e.style.display="none";let t=e.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(t)Pe(t)})},Ee=(e)=>{let t=ue();if(_e=t,!t)return;N?.disconnect(),N=new MutationObserver(()=>{de(e),H()}),N.observe(t,{attributes:!0,attributeFilter:["class"]})},Se={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Mutes/hides audio & video ads and dismisses premium upsell banners without touching playback timing",defaultEnabled:!0,onInit(e){_={adWasShowing:!1,preAdMuted:!1},ce=new WeakSet;let t=document.createElement("style");t.id="ytmd-adblock-styles",t.textContent=tt,document.head.appendChild(t);let n=!1,i=new MutationObserver(()=>{if(n)return;n=!0,requestAnimationFrame(()=>{n=!1,H()})});i.observe(document.body,{childList:!0,subtree:!0}),Ee(e),H(),de(e),z=()=>{N?.disconnect(),N=null,i.disconnect(),document.getElementById("ytmd-adblock-styles")?.remove();let a=e.getVideoElement();if(a&&_.adWasShowing)a.muted=_.preAdMuted;_={adWasShowing:!1,preAdMuted:!1}}},onTick(e,t){if(ue()!==_e)Ee(t);de(t),H()},onDestroy(){if(z)z(),z=null}};var S=[],U="",me=new Set,rt=(e,t)=>e===t,Me={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){S=[],U="",me=new Set},onTrackChange(e){if(!e.videoId||e.videoId===U)return;let t=e.videoId;U=t,S=[],me=new Set;let n=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),i=`https://sponsor.ajay.app/api/skipSegments?videoID=${t}&categories=${encodeURIComponent(n)}`;fetch(i,{signal:AbortSignal.timeout(3000)}).then(async(a)=>{if(!a.ok)return;let o=await a.json();if(!rt(t,U))return;S=o,console.log(`[YTMD SponsorBlock] Loaded ${o.length} segments for ${t}`)}).catch(()=>{})},onTick(e,t){if(!S||S.length===0)return;let n=me;for(let i of S){let[a,o]=i.segment;if(e>=a&&e<o-0.5&&!n.has(i.UUID)){console.log(`[YTMD SponsorBlock] Skipping segment (${i.category}): ${a}s -> ${o}s`);let l=t.getVideoElement();if(l)l.currentTime=o,n.add(i.UUID);break}}}};function M(e,t=18,n=18,i="0 0 24 24"){let a=document.createElementNS("http://www.w3.org/2000/svg","svg");a.setAttribute("width",String(t)),a.setAttribute("height",String(n)),a.setAttribute("viewBox",i),a.setAttribute("fill","currentColor");let o=document.createElementNS("http://www.w3.org/2000/svg","path");return o.setAttribute("d",e),a.appendChild(o),a}var Ie="http://www.w3.org/2000/svg",at="circle|path|rect|line|polyline|polygon|g|ellipse";function Le(e){let t=document.createElementNS(Ie,"svg"),n=(o,l)=>{for(let c of l.matchAll(/([\w:-]+)="([^"]*)"/g))o.setAttribute(c[1],c[2])},i=e.match(/^<svg([^>]*)>/);if(i)n(t,i[1]);let a=new RegExp(`<(${at})([^>]*)\\/?>`,"g");for(let o of e.matchAll(a)){let l=document.createElementNS(Ie,o[1]);n(l,o[2]),t.appendChild(l)}return t}function m(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var x=[],V=-1,q=null,v="",O=null,Y="",Ae=(e,t)=>e===t,Re={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(e){x=[],V=-1,q=null,v="",Y="";let t=document.createElement("style");t.id="ytmd-native-lyrics-styles",t.textContent=`
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
    `,document.head.appendChild(t);let n=()=>{F(),De(e)},i=()=>{setTimeout(()=>{F(),ge()},50),setTimeout(()=>{ge()},250)};document.addEventListener("click",i,!0);let a=window.setInterval(n,600);n(),O=()=>{clearInterval(a),document.removeEventListener("click",i,!0),t.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((l)=>l.remove())}},async onTrackChange(e,t){let n=`${e.title} - ${e.artist}`;if(v===n&&x.length>0||Y===n)return;v=n,Y=n,x=[],V=-1,q=null,F();let i=document.getElementById("ytmd-native-lyrics-wrapper");if(i)i.replaceChildren(m("div",{className:"ytmd-native-lyrics-status",text:"Loading synchronized lyrics..."}));try{let a=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(!Ae(n,v))return;if(q=a,a?.syncedLyrics)x=ct(a.syncedLyrics);F(),De(t),Ye(t)}catch{if(!Ae(n,v))return;let a=document.getElementById("ytmd-native-lyrics-wrapper");if(a)a.replaceChildren(m("div",{className:"ytmd-native-lyrics-status",text:"No lyrics available for this track."}))}finally{if(Y===n)Y=""}},onTick(e){if(!x||x.length===0)return;let t=B(v),n=e+t,i=-1;for(let a=0;a<x.length;a++)if(n>=x[a].timeSecs)i=a;else break;if(i!==V&&i>=0){V=i;let a=document.getElementById("ytmd-native-lyrics-wrapper");if(a){let o=a.querySelectorAll(".ytmd-native-lyric-line");o.forEach((c,r)=>{if(r===i)c.classList.add("active");else c.classList.remove("active")});let l=document.querySelector('#tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"], ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(l&&st(l)){let c=o[i];if(c)c.scrollIntoView({behavior:"smooth",block:"nearest"})}}}},onDestroy(){if(O)O(),O=null}},Ne=new Map;function B(e){return Ne.get(e)||0}function pe(e,t){Ne.set(e,t)}function st(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function F(){document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras")){t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.classList.add("ytmd-lyrics-tab-unlocked"),t.style.pointerEvents="auto",t.style.cursor="pointer";let i={toCommand:()=>({}),browseEndpoint:{browseId:"FEmusic_lyrics"}};if(!t.endpoint)t.endpoint=i;if(t.data&&!t.data.endpoint)t.data.endpoint=i}})}function lt(){let e=document.querySelectorAll("#tabsContent > .tab-header, ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer");for(let n of Array.from(e)){let i=n.textContent?.toLowerCase()||"";if(i.includes("tekst")||i.includes("lyrics")||i.includes("paroles")||i.includes("letras")){if(n.classList.contains("iron-selected")||n.getAttribute("aria-selected")==="true"||n.classList.contains("selected"))return!0}}let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(t){if((t.classList.contains("iron-selected")||!t.hasAttribute("hidden"))&&t.getAttribute("aria-hidden")!=="true")return!0}return!1}function ge(){let e=document.getElementById("ytmd-native-lyrics-wrapper");if(!e)return;let t=lt();e.style.setProperty("display",t?"flex":"none","important")}function De(e){let t=document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(!t)return;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(!n||!t.contains(n)){if(!n)n=m("div",{id:"ytmd-native-lyrics-wrapper"});t.appendChild(n),Ye(e)}ge()}function Ye(e){let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(x&&x.length>0){let n=B(v),i=m("div",{className:"ytmd-native-lyrics-sync-bar"}),a=m("span",{className:"ytmd-sync-label",text:"Sync:"}),o=m("button",{className:"ytmd-sync-btn",text:"-0.5s",title:"Shift lyrics 0.5s earlier"}),l=m("span",{className:"ytmd-sync-val",text:`${n>=0?"+":""}${n.toFixed(1)}s`}),c=m("button",{className:"ytmd-sync-btn",text:"+0.5s",title:"Shift lyrics 0.5s later"}),r=m("button",{className:"ytmd-sync-btn",text:"Reset",title:"Reset offset to 0.0s"});o.addEventListener("click",()=>{let s=Math.round((B(v)-0.5)*10)/10;pe(v,s),l.textContent=`${s>=0?"+":""}${s.toFixed(1)}s`}),c.addEventListener("click",()=>{let s=Math.round((B(v)+0.5)*10)/10;pe(v,s),l.textContent=`${s>=0?"+":""}${s.toFixed(1)}s`}),r.addEventListener("click",()=>{pe(v,0),l.textContent="+0.0s"}),i.appendChild(a),i.appendChild(o),i.appendChild(l),i.appendChild(c),i.appendChild(r),t.replaceChildren(...x.map((s,d)=>{let u=m("div",{className:`ytmd-native-lyric-line${d===V?" active":""}`,text:s.text});return u.addEventListener("click",()=>{let g=e.getVideoElement();if(g){let y=B(v);g.currentTime=Math.max(0,s.timeSecs-y)}}),u}),i,m("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else if(q?.plainLyrics){let n=q.plainLyrics.split(`
`);t.replaceChildren(...n.map((i)=>m("div",{className:"ytmd-native-lyric-line active",text:i,style:"cursor: default;"})),m("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else t.replaceChildren(m("div",{className:"ytmd-native-lyrics-status",text:"Synced lyrics unavailable for this track."}))}function ct(e){let t=e.split(`
`),n=[],i=0,a=/\[(\d{1,2}):(\d{2})(?:[.:](\d{2,3}))?\]/g,o=/\[offset:\s*([+-]?\d+)\s*\]/i;for(let l of t){let c=l.trim();if(!c)continue;let r=o.exec(c);if(r){let u=parseInt(r[1],10);if(!isNaN(u))i=u/1000;continue}let s=[],d;a.lastIndex=0;while((d=a.exec(c))!==null){let u=parseInt(d[1],10),g=parseInt(d[2],10),y=0;if(d[3])y=parseInt(d[3].padEnd(3,"0").slice(0,3),10);s.push(u*60+g+y/1000)}if(s.length>0){let u=c.replace(a,"").trim();if(u)for(let g of s)n.push({timeSecs:Math.max(0,g-i),text:u})}}return n.sort((l,c)=>l.timeSecs-c.timeSecs)}var G=null,Ve={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit(e){let t=(n)=>{let i=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!i)return;let a=i.getBoundingClientRect();if(n.clientX>=a.left&&n.clientX<=a.right&&n.clientY>=a.top&&n.clientY<=a.bottom){n.preventDefault();let o=e.getVideoElement();if(o){let l=e.config.wheel_volume_step||0.05,c=n.deltaY<0?l:-l,r=Math.max(0,Math.min(1,o.volume+c));o.volume=r}}};window.addEventListener("wheel",t,{passive:!1}),G=()=>{window.removeEventListener("wheel",t)}},onDestroy(){if(G)G(),G=null}};var Be={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var W=null,qe={id:"visualizer",name:"Modern Clean Theme & Custom CSS",description:"Applies sleek dark aesthetics, subtle scrollbars, and user-defined custom CSS",defaultEnabled:!0,onInit(e){let t=document.createElement("style");t.id="ytmd-theme-styles";let n=e.config.custom_css||"",i=`
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
    `;t.textContent=`${i}
${n}`,document.head.appendChild(t),W=()=>{t.remove()}},onDestroy(){if(W)W(),W=null}};var fe=[32,64,125,250,500,1000,2000,4000,8000,16000],ye={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function j(e){return Math.max(-12,Math.min(12,e))}class k{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;static getInstance(){if(!k.instance)k.instance=new k;return k.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=fe.map((i,a)=>{if(!this.audioCtx)throw Error("AudioContext missing");let o=this.audioCtx.createBiquadFilter();if(a===0)o.type="lowshelf";else if(a===fe.length-1)o.type="highshelf";else o.type="peaking",o.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return o.frequency.setValueAtTime(i,this.audioCtx.currentTime),o.gain.setValueAtTime(0,this.audioCtx.currentTime),o}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.filters.length||!this.audioCtx)return;let n=j(t);this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){if(!this.audioCtx)return;e.forEach((t,n)=>{if(n<this.filters.length)this.filters[n].gain.setValueAtTime(j(t),this.audioCtx.currentTime)})}setPreamp(e){if(!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,j(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=ye[e]||ye.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return-100;let e=new Float32Array(this.analyserNode.fftSize);this.analyserNode.getFloatTimeDomainData(e);let t=0;for(let i=0;i<e.length;i++)t+=e[i]*e[i];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){let t=Math.max(0.5,Math.min(2,e));if(this.hookedVideo)this.hookedVideo.playbackRate=t}setPreservesPitch(e){if(this.hookedVideo){this.hookedVideo.preservesPitch=e;let t=this.hookedVideo;t.mozPreservesPitch=e,t.webkitPreservesPitch=e}}}class he{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)k.getInstance().fadeIn(this.crossfadeSeconds);else k.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),k.getInstance().fadeOut(n),setTimeout(()=>{let i=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===i)console.log("[YTMD Crossfade] Advancing to next track..."),f.next()},Math.max(100,(n-0.2)*1000))}}class be{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let i=k.getInstance().getAudioPowerDb();if(!this.checkedIntro&&e<15)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${i.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(i<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${i.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,f.next()}else this.consecutiveSilentTicks=0}}var I=null,L=null,K=null,ze={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=e.getVideoElement(),n=k.getInstance(),i=new he,a=new be;I=i,L=a;let o=e.config,l=Boolean(o.equalizer_enabled||o.loudness_normalization||o.equalizer_gains&&Array.isArray(o.equalizer_gains)&&o.equalizer_gains.some((s)=>s!==0)),c=null;if(l)if(t)n.init(t);else c=window.setInterval(()=>{let s=e.getVideoElement();if(s){if(c!==null)clearInterval(c);c=null,n.init(s)}},500);if(o.equalizer_gains&&Array.isArray(o.equalizer_gains))n.setAllGains(o.equalizer_gains);else if(o.equalizer_preset&&typeof o.equalizer_preset==="string")n.applyPreset(o.equalizer_preset);if(o.preamp_gain!==void 0)n.setPreamp(o.preamp_gain);if(o.loudness_normalization!==void 0)n.setLoudnessNormalization(Boolean(o.loudness_normalization));if(o.crossfade_seconds!==void 0)i.setCrossfadeSeconds(o.crossfade_seconds);if(o.skip_silence_enabled!==void 0)a.setEnabled(Boolean(o.skip_silence_enabled));if(o.playback_speed!==void 0)n.setPlaybackRate(o.playback_speed);if(o.preserve_pitch!==void 0)n.setPreservesPitch(Boolean(o.preserve_pitch));let r=[];if(window.__TAURI__?.event){let{listen:s}=window.__TAURI__.event;r.push(s("set-eq-band",(d)=>{n.setBandGain(d.payload.bandIndex,d.payload.gain)}),s("set-eq-all",(d)=>{n.setAllGains(d.payload.gains)}),s("set-eq-preset",(d)=>{n.applyPreset(d.payload)}),s("set-preamp",(d)=>{n.setPreamp(d.payload)}),s("set-loudness-normalization",(d)=>{n.setLoudnessNormalization(d.payload)}),s("set-crossfade-seconds",(d)=>{i.setCrossfadeSeconds(d.payload)}),s("set-skip-silence",(d)=>{a.setEnabled(d.payload)}),s("set-playback-rate",(d)=>{n.setPlaybackRate(d.payload)}),s("set-preserves-pitch",(d)=>{n.setPreservesPitch(d.payload)}))}K=()=>{if(c!==null)clearInterval(c),c=null;r.forEach((s)=>s.then((d)=>d())),I=null,L=null},console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){if(I)I.onTrackChange(e);if(L)L.onTrackChange()},onTick(e,t){if(I)I.onTick(e,t.track);if(L)L.onTick(e,t.track,t.getVideoElement())},onDestroy(){if(K)K(),K=null}};var ve=(e,t,n)=>{let i=(o)=>Math.max(0,Math.min(255,Math.round(o))),a=(o)=>i(o).toString(16).padStart(2,"0");return`#${a(e)}${a(t)}${a(n)}`};async function He(e){return new Promise((t)=>{let n={primary:"#18181b",secondary:"#09090b",accent:"#dc2626"};if(!e){t(n);return}let i=new Image;i.crossOrigin="anonymous",i.onload=()=>{try{let a=document.createElement("canvas");a.width=16,a.height=16;let o=a.getContext("2d");if(!o){t(n);return}o.drawImage(i,0,0,16,16);let l=o.getImageData(0,0,16,16).data,c=0,r=0,s=0,d=0,u=0,g=0,y=0,p=0;for(let C=0;C<l.length;C+=4){let oe=l[C],re=l[C+1],ae=l[C+2];if(l[C+3]<128)continue;let we=(oe+re+ae)/3;if(we<20||we>240)continue;if(C<l.length/2)c+=oe,r+=re,s+=ae,d++;else u+=oe,g+=re,y+=ae,p++}if(d===0&&p===0){t(n);return}let b=d>0?Math.round(c/d):220,T=d>0?Math.round(r/d):38,h=d>0?Math.round(s/d):38,R=p>0?Math.round(u/p):24,E=p>0?Math.round(g/p):24,ie=p>0?Math.round(y/p):27;t({primary:ve(b,T,h),secondary:ve(R,E,ie),accent:ve(b+30,T+30,h+30)})}catch{t(n)}},i.onerror=()=>t(n),i.src=e})}var Q=null,X=null,$e={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Smoothly diffuses dynamic, reactive ambient colors from the active album cover behind the player",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=document.createElement("div"),t.id="ytmd-ambient-backdrop",document.body.prepend(t);let n=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,i=e.config.ambient_lighting_enabled!==!1,a=document.createElement("style");a.id="ytmd-ambient-styles",a.textContent=`
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
    `,document.head.appendChild(a);let o=m("div",{id:"ytmd-orb-1",className:"ytmd-ambient-orb"}),l=m("div",{id:"ytmd-orb-2",className:"ytmd-ambient-orb"});t.appendChild(o),t.appendChild(l),Q=(r)=>{if(t)t.style.opacity=String(r)};let c=[];if(window.__TAURI__?.event)c.push(window.__TAURI__.event.listen("set-ambient-intensity",(r)=>{Q?.(r.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(r)=>{Q?.(r.payload?0.6:0)}));if(X=()=>{c.forEach((r)=>r.then((s)=>s())),Q=null,document.getElementById("ytmd-ambient-styles")?.remove(),document.getElementById("ytmd-ambient-backdrop")?.remove()},e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){if(!e.coverUrl)return;try{let t=await He(e.coverUrl),n=document.getElementById("ytmd-ambient-backdrop");if(n)n.style.background=`
          radial-gradient(circle at 80% 20%, ${t.primary}66 0%, transparent 60%),
          radial-gradient(circle at 20% 80%, ${t.secondary}66 0%, transparent 60%)
        `}catch{}},onDestroy(){if(X)X(),X=null}};function dt(e){return`
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

    `}var ut=[{id:"default",name:"Modern Dark",background:"#0f0f0f",surface:"#121215",border:"#27272a",accent:"#3ea6ff",accentHover:"#65b8ff"},{id:"oled",name:"Pure OLED Black",background:"#000000",surface:"#0a0a0a",border:"#1a1a1a",accent:"#3ea6ff",accentHover:"#65b8ff"},{id:"nord",name:"Nord Arctic",background:"#2e3440",surface:"#3b4252",border:"#434c5e",accent:"#88c0d0",accentHover:"#a3d0dd"},{id:"catppuccin",name:"Catppuccin Mocha",background:"#1e1e2e",surface:"#181825",border:"#313244",accent:"#cba6f7",accentHover:"#dbc2fa"},{id:"gruvbox",name:"Gruvbox Dark",background:"#282828",surface:"#1d2021",border:"#3c3836",accent:"#fe8019",accentHover:"#fe9a4d"},{id:"tokyo_night",name:"Tokyo Night",background:"#1a1b26",surface:"#16161e",border:"#292e42",accent:"#7aa2f7",accentHover:"#9ab8f9"},{id:"dracula",name:"Dracula",background:"#282a36",surface:"#21222c",border:"#44475a",accent:"#bd93f9",accentHover:"#cfb0fb"},{id:"rose_pine",name:"Rosé Pine",background:"#191724",surface:"#1f1d2e",border:"#26233a",accent:"#eb6f92",accentHover:"#f08daa"}],A=Object.fromEntries(ut.map((e)=>[e.id,{id:e.id,name:e.name,css:dt(e)}]));var J=null,Ue={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Applies curated aesthetic themes and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(r)=>{let s=document.getElementById(r);if(!s){s=document.createElement("style"),s.id=r;let d=t();if(d)d.appendChild(s)}return s},i=(r)=>{let s=A[r]||A.default,d=n("ytmd-active-theme");if(d)d.textContent=s.css},a=(r)=>{let s=n("ytmd-custom-css");if(s)s.textContent=r},o=e.config.theme_preset||e.config.theme||"default";i(o);let l=e.config.custom_css||"";a(l);let c=[];if(window.__TAURI__?.event)c.push(window.__TAURI__.event.listen("set-theme-preset",(r)=>{i(r.payload)}),window.__TAURI__.event.listen("set-custom-css",(r)=>{a(r.payload)}));J=()=>{c.forEach((r)=>r.then((s)=>s()))},console.log("[YTMD] Theme engine active.")},onDestroy(){if(J)J(),J=null}};var Z=null,Oe={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let i=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(i){let a=m("button",{id:"ytmd-pip-btn",title:"Picture-in-Picture (Float Video)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),o=M("M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",20,20);a.appendChild(o),a.style.cssText=`
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
        `,a.addEventListener("mouseenter",()=>{a.style.color="#fafafa",a.style.backgroundColor="#27272a"}),a.addEventListener("mouseleave",()=>{a.style.color="#a1a1aa",a.style.backgroundColor="transparent"}),a.addEventListener("click",async()=>{let l=e.getVideoElement();if(!l)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await l.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(c){console.warn("[YTMD PiP] Could not enter PiP:",c),await e.invoke("toggle_mini_player")}}),i.appendChild(a)}},n=window.setInterval(t,1000);t(),Z=()=>{clearInterval(n),document.getElementById("ytmd-pip-btn")?.remove()}},onDestroy(){if(Z)Z(),Z=null}};var ke=null,ee=null,Fe={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){let t=null,n=!1,i=()=>{if(document.getElementById("ytmd-download-btn"))return;let o=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(o){let l=m("button",{id:"ytmd-download-btn",title:"Download Track (MP3/FLAC with ID3 Tags & Lyrics)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),c=M("M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z",20,20);l.appendChild(c),l.style.cssText=`
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
        `,l.addEventListener("mouseenter",()=>{if(!n)l.style.color="#fafafa",l.style.backgroundColor="#27272a"}),l.addEventListener("mouseleave",()=>{if(!n)l.style.color="#a1a1aa",l.style.backgroundColor="transparent"}),l.addEventListener("click",async()=>{if(!t||!t.videoId||n)return;n=!0,l.style.color="#38bdf8",l.title="Downloading...";try{let r=e.config.download_format||"mp3",s=e.config.embed_lyrics!==!1;await e.invoke("download_track",{request:{video_id:t.videoId,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:r,embed_lyrics:s}}),l.style.color="#22c55e",l.title="Downloaded!",setTimeout(()=>{n=!1,l.style.color="#a1a1aa",l.title="Download Track"},3000)}catch(r){console.error("[YTMD Downloader] Download failed:",r),l.style.color="#ef4444",setTimeout(()=>{n=!1,l.style.color="#a1a1aa",l.title="Download Track"},3000)}}),o.appendChild(l)}},a=window.setInterval(i,1000);i(),ke=(o)=>{t=o},ee=()=>{clearInterval(a),document.getElementById("ytmd-download-btn")?.remove(),ke=null}},onTrackChange(e){ke?.(e)},onDestroy(){if(ee)ee(),ee=null}};var Ge={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};class We{isHost=!1;inRoom=!1;lastAppliedTimestamp=0;setRoomState(e,t){this.inRoom=e,this.isHost=t}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback(e,t){if(!this.inRoom||this.isHost||!t)return;let n=Date.now(),i=(n-e.timestamp_ms)/1000,a=e.is_playing?e.current_time_secs+Math.max(0,i):e.current_time_secs;this.lastAppliedTimestamp=n;let o=new URLSearchParams(window.location.search).get("v");if(e.video_id&&o!==e.video_id){console.log(`[YTMD Room Sync] Switching to track: ${e.video_id}`),window.location.href=`https://music.youtube.com/watch?v=${e.video_id}`;return}if(e.is_playing&&t.paused)f.play();else if(!e.is_playing&&!t.paused)f.pause();let l=Math.abs(t.currentTime-a);if(l>1.5)console.log(`[YTMD Room Sync] Drift detected (${l.toFixed(2)}s). Resyncing to ${a.toFixed(1)}s...`),f.seekTo(a)}broadcastLocalState(e,t,n){if(!this.inRoom||!this.isHost||!e||!e.videoId||!t)return;if(Date.now()-this.lastAppliedTimestamp<1000)return;n("broadcast_sync_state",{playback:{video_id:e.videoId,title:e.title,artist:e.artist,current_time_secs:t.currentTime,is_playing:!t.paused,timestamp_ms:Date.now()}}).catch(()=>{})}}var D=null,te=null,je={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new We;D=t;let n=[];if(window.__TAURI__?.event)n.push(window.__TAURI__.event.listen("sync-room-updated",(i)=>{t.setRoomState(!0,i.payload.is_host)}),window.__TAURI__.event.listen("sync-room-left",()=>{t.setRoomState(!1,!1)}),window.__TAURI__.event.listen("sync-playback-remote",(i)=>{t.handleRemotePlayback(i.payload,e.getVideoElement())}));te=()=>{n.forEach((i)=>i.then((a)=>a())),D=null}},onTick(e,t){if(D&&D.isInRoom()&&D.isRoomHost())D.broadcastLocalState(t.track,t.getVideoElement(),t.invoke)},onDestroy(){if(te)te(),te=null}};var ne=null,mt=(e,t,n)=>e&&t&&!n,Ke={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Inhibits system sleep during active playback and auto-pauses when screen is locked",defaultEnabled:!0,onInit(e){let t=null,n=null,i=null,a=e.config.inhibit_sleep!==!1,o=async()=>{if(!a||t!==null)return;try{if("wakeLock"in navigator)t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null});await e.invoke("set_inhibit_sleep",{inhibit:!0})}catch{}},l=async()=>{if(t!==null)try{await t.release(),t=null}catch{}await e.invoke("set_inhibit_sleep",{inhibit:!1})},c=(u)=>{u.addEventListener("play",o),u.addEventListener("playing",o),u.addEventListener("pause",l),u.addEventListener("ended",l),i=u},r=(u)=>{u.removeEventListener("play",o),u.removeEventListener("playing",o),u.removeEventListener("pause",l),u.removeEventListener("ended",l)},s=e.getVideoElement();if(s)c(s);else n=window.setInterval(()=>{let u=e.getVideoElement();if(u){if(n!==null)clearInterval(n);n=null,c(u)}},1000);let d=()=>{let u=e.getVideoElement();if(!u)return;if(mt(document.hidden,Boolean(e.config.pause_on_lock),u.paused))e.sendPlayerCommand("pause")};document.addEventListener("visibilitychange",d),ne=()=>{if(n!==null)clearInterval(n),n=null;if(i)r(i),i=null;document.removeEventListener("visibilitychange",d),l()}},onDestroy(){if(ne)ne(),ne=null}};var Qe={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>Te(e),console.log("[YTMD] Mobile remote module ready.")},onDestroy(){window.__ytmd_show_remote_qr=void 0,document.getElementById("ytmd-remote-modal")?.remove()}};async function Te(e){document.getElementById("ytmd-remote-modal")?.remove();let t=m("div",{id:"ytmd-remote-modal",style:`
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
    `}),n=()=>{document.removeEventListener("keydown",i),t.remove()},i=(u)=>{if(u.key==="Escape")n()};document.addEventListener("keydown",i);let a=m("div",{style:`
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
    `}),o=m("h3",{text:"Mobile Web Remote",style:"margin: 0 0 6px 0; font-size: 18px; font-weight: 700;"}),l=m("p",{text:"Scan with your phone camera on the same Wi-Fi network:",style:"font-size: 13px; color: #a1a1aa; margin: 0 0 16px 0;"}),c=m("div",{id:"ytmd-qr-container",style:`
      background: #ffffff;
      padding: 14px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      min-width: 180px;
      min-height: 180px;
    `}),r=m("span",{text:"Generating QR code...",style:"color: #52525b; font-size: 12px; font-weight: 500;"});c.appendChild(r);let s=m("div",{id:"ytmd-remote-url",style:"font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all; font-weight: 600;"}),d=m("button",{id:"ytmd-remote-close-btn",text:"Close",style:"background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 24px; font-weight: 600; cursor: pointer; font-size: 13px;"});d.addEventListener("click",n),t.addEventListener("click",(u)=>{if(u.target===t)n()}),a.appendChild(o),a.appendChild(l),a.appendChild(c),a.appendChild(s),a.appendChild(d),t.appendChild(a),document.body.appendChild(t);try{let u=await e.invoke("get_remote_info");if(!t.isConnected)return;if(u&&u.qr_svg){let g=m("img");g.src=`data:image/svg+xml;utf8,${encodeURIComponent(u.qr_svg)}`,g.width=180,g.height=180,g.style.display="block",g.alt="Mobile Remote QR Code",c.replaceChildren(g)}else c.replaceChildren(m("span",{text:"Remote server starting...",style:"color: #71717a; font-size: 12px;"}));if(u&&u.url)s.textContent=u.url}catch(u){console.error("[YTMD Remote] Error fetching remote info:",u)}}var P=null,xe=null,w=(e,t={})=>new Promise((n)=>{let i=window.__TAURI__;if(!i?.event?.emit){n(null);return}let a=Math.random().toString(36).slice(2)+Date.now().toString(36),o=null,l=setTimeout(()=>{if(o)o();n(null)},4000);i.event.listen(`ytmd-response-${a}`,(c)=>{if(clearTimeout(l),o)o();n(c.payload)}).then((c)=>{o=c,i.event.emit("ytmd-invoke",{id:a,cmd:e,args:t})}).catch(()=>{clearTimeout(l),n(null)})});function Xe(e){if(document.getElementById("ytmd-burger-btn"))return;let t=document.querySelector("ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content"),n=document.querySelector("ytmusic-nav-bar .left-content, ytmusic-nav-bar #left-content"),i=document.querySelector("ytmusic-nav-bar"),a=document.body||document.documentElement;if(!t&&!n&&!a)return;let o=m("button",{id:"ytmd-burger-btn",title:"YTMD Menu (Ctrl+,)",style:`
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
    `}),l=M("M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",15,15),c=m("span",{text:"YTMD",style:"font-size: 12px; font-weight: 700; letter-spacing: 0.2px;"});o.appendChild(l),o.appendChild(c),o.addEventListener("mouseenter",()=>{o.style.background="#333333",o.style.borderColor="rgba(255, 255, 255, 0.3)",o.style.color="#ffffff"}),o.addEventListener("mouseleave",()=>{o.style.background="#212121",o.style.borderColor="rgba(255, 255, 255, 0.15)",o.style.color="#f4f4f5"});let r=document.getElementById("ytmd-burger-popover");if(!r){r=m("div",{id:"ytmd-burger-popover",style:`
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
      `});let s=(y,p,b,T)=>{let h=m("button",{style:`
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
        `}),R=m("span",{style:"display:flex; align-items:center; gap:10px;"}),E=m("span",{style:"display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; color:#a1a1aa;"});E.appendChild(Le(y));let ie=m("span",{text:p,style:"font-weight: 500;"});R.appendChild(E),R.appendChild(ie);let C=m("span",{text:b,style:"font-size: 11px; color: #71717a; font-family: monospace;"});return h.appendChild(R),h.appendChild(C),h.addEventListener("mouseenter",()=>{h.style.background="#27272a",h.style.color="#ffffff",E.style.color="#ffffff"}),h.addEventListener("mouseleave",()=>{h.style.background="transparent",h.style.color="#e4e4e7",E.style.color="#a1a1aa"}),h.addEventListener("click",()=>{if(r)r.style.display="none";T()}),h},d=()=>m("div",{style:"height: 1px !important; background: #27272a !important; margin: 6px 4px !important;"});r.appendChild(s('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',"Preferences & DSP EQ","Ctrl+,",()=>{w("toggle_settings_window")})),r.appendChild(s('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',"Local Music Library","",()=>{w("toggle_local_library_window")})),r.appendChild(s('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',"Listen Together (Sync)","",()=>{w("toggle_sync_window")})),r.appendChild(s('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',"Mobile Web Remote","",()=>{if(xe)Te(xe)})),r.appendChild(s('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><rect x="12" y="9" width="8" height="6" rx="1"/></svg>',"Mini Player","",()=>{w("toggle_mini_player")})),r.appendChild(d()),r.appendChild(s('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',"Download Current Track","",async()=>{if(!P||!P.videoId){alert("Please play a track first to download.");return}try{await w("download_track",{request:{video_id:P.videoId,title:P.title,artist:P.artist,album:P.album||void 0,cover_url:P.coverUrl||void 0,format:e.download_format||"mp3",embed_lyrics:e.embed_lyrics!==!1}}),alert(`Download started for: ${P.title}`)}catch(y){console.error("[YTMD Download Error]:",y)}}));let u=m("div",{style:"display: flex; gap: 4px; padding: 6px 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;"}),g=m("span",{text:"Theme:",style:"font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase;"});u.appendChild(g),["oled","nord","catppuccin","tokyo_night","gruvbox"].forEach((y)=>{let p=m("button",{text:y.toUpperCase(),style:`
          background: #1c1c20;
          border: 1px solid #27272a;
          color: #a1a1aa;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        `});p.addEventListener("click",()=>{let b=document.getElementById("ytmd-active-theme");if(b&&A[y])b.textContent=A[y].css}),u.appendChild(p)}),r.appendChild(u),document.body.appendChild(r),document.addEventListener("click",(y)=>{if(r&&r.style.display==="flex"){if(!r.contains(y.target)&&!o.contains(y.target))r.style.display="none"}})}if(o.addEventListener("click",(s)=>{if(s.stopPropagation(),r){let d=o.getBoundingClientRect();r.style.top=`${d.bottom+8}px`,r.style.right=`${Math.max(16,window.innerWidth-d.right)}px`,r.style.left="auto",r.style.display=r.style.display==="flex"?"none":"flex"}}),t)t.prepend(o);else if(n)n.appendChild(o);else if(i)i.prepend(o);else o.style.position="fixed",o.style.top="12px",o.style.right="16px",a.appendChild(o)}async function Je(){console.log("[YTMD] Initializing desktop integration bridge...");let e={};Xe(e),setInterval(()=>Xe(e),1000),w("get_config").then((r)=>{if(r&&typeof r==="object")e=r});let t={track:null,config:e,invoke:w,sendPlayerCommand:(r)=>{l(r)},getVideoElement:()=>f.getVideo()};xe=t;let n=new le(t);n.register(Se),n.register(Me),n.register(Re),n.register(Ve),n.register(Be),n.register(qe),n.register(ze),n.register($e),n.register(Ue),n.register(Oe),n.register(Fe),n.register(Ge),n.register(je),n.register(Ke),n.register(Qe);try{await n.initAll()}catch(r){console.error("[YTMD] Registry init error:",r)}let i=new se,a=0,o=Date.now();i.onTrackChange(async(r)=>{P=r,a=r.currentTimeSecs||0,o=Date.now(),n.handleTrackChange(r);try{await w("update_track_info",{track:{title:r.title,artist:r.artist,album:r.album||null,cover_url:r.coverUrl||null,duration_secs:Math.round(r.durationSecs||0),current_time_secs:Math.round(r.currentTimeSecs||0),is_playing:r.isPlaying,video_id:r.videoId||null}})}catch(s){console.error("[YTMD] Failed to sync track info to backend:",s)}}),i.onPlaybackChange(async(r)=>{n.handlePlaybackChange(r);let s=i.getCurrentTrack();if(s){s.isPlaying=r,a=s.currentTimeSecs||0,o=Date.now();try{await w("update_track_info",{track:{title:s.title,artist:s.artist,album:s.album||null,cover_url:s.coverUrl||null,duration_secs:Math.round(s.durationSecs||0),current_time_secs:Math.round(s.currentTimeSecs||0),is_playing:r,video_id:s.videoId||null}})}catch(d){console.error("[YTMD] Failed to sync playback status:",d)}}}),i.onTick((r)=>{n.handleTick(r);let s=i.getCurrentTrack();if(!s||!s.isPlaying)return;let d=Date.now(),u=(d-o)/1000,g=a+u;if(Math.abs(r-g)>2||u>=15)a=r,o=d,s.currentTimeSecs=Math.round(r),w("update_track_info",{track:{title:s.title,artist:s.artist,album:s.album||null,cover_url:s.coverUrl||null,duration_secs:Math.round(s.durationSecs||0),current_time_secs:Math.round(r),is_playing:!0,video_id:s.videoId||null}}).catch((p)=>console.error("[YTMD] Failed to sync seek/progress to backend:",p))});function l(r){switch(r){case"play":f.play();break;case"pause":f.pause();break;case"play_pause":f.playPause();break;case"next":f.next();break;case"previous":f.previous();break;case"like":f.toggleLike();break;case"dislike":f.toggleDislike();break;case"mute":f.toggleMute();break}}let c=(r,s)=>{let d=window.__TAURI__;if(d?.event?.listen)d.event.listen(r,(u)=>s(u.payload))};c("player-command",(r)=>l(r)),c("tray-command",(r)=>l(r)),c("mpris-command",(r)=>l(r)),c("global-shortcut-event",(r)=>l(r)),c("player-seek",(r)=>f.seekTo(r)),c("mpris-command-seek",(r)=>f.seekTo(r)),c("player-volume",(r)=>f.setVolume(r)),window.addEventListener("keydown",(r)=>{if(r.ctrlKey&&r.key===","||r.key==="F2")r.preventDefault(),w("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}var pt=window.self===window.top&&/(^|\.)music\.youtube\.com$/.test(location.hostname);if(pt)if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>Je());else Je();
