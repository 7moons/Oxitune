class Y{currentTrack=null;onTrackChangeCallbacks=[];onPlaybackChangeCallbacks=[];onTickCallbacks=[];tickInterval=null;constructor(){this.initObservers()}getCurrentTrack(){return this.currentTrack}onTrackChange(e){this.onTrackChangeCallbacks.push(e)}onPlaybackChange(e){this.onPlaybackChangeCallbacks.push(e)}onTick(e){this.onTickCallbacks.push(e)}initObservers(){if("mediaSession"in navigator);let e=()=>{let i=document.querySelector("video");if(i)i.addEventListener("play",()=>this.handlePlaybackChange(!0)),i.addEventListener("pause",()=>this.handlePlaybackChange(!1)),i.addEventListener("ended",()=>this.handlePlaybackChange(!1)),i.addEventListener("timeupdate",()=>{let o=i.currentTime;this.onTickCallbacks.forEach((s)=>s(o))})},t=!1,r=new MutationObserver(()=>{if(t)return;t=!0,requestAnimationFrame(()=>{this.checkTrackUpdate(),t=!1})}),a=document.querySelector("ytmusic-player-bar")||document.body;if(a)r.observe(a,{childList:!0,subtree:!0,characterData:!0});e(),this.tickInterval=window.setInterval(()=>{this.checkTrackUpdate();let i=document.querySelector("video");if(i&&!i.paused)this.onTickCallbacks.forEach((o)=>o(i.currentTime))},250)}extractTrackInfo(){let e=document.querySelector("video");if(Boolean(document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-player-overlay, .ytp-ad-text")||e?.closest(".ad-showing")))return null;let n=navigator.mediaSession?.metadata,r=n?.title||"",a=n?.artist||"",i=n?.album||"",o=n?.artwork?.[n.artwork.length-1]?.src||"";if(!r){let g=document.querySelector("ytmusic-player-bar .title, yt-formatted-string.title, .ytmusic-player-bar.title");if(g)r=g.textContent?.trim()||""}if(!a){let g=document.querySelector("ytmusic-player-bar .byline, yt-formatted-string.byline, .ytmusic-player-bar.subtitle");if(g){let y=(g.textContent?.trim()||"").split("•").map((T)=>T.trim());if(a=y[0]||"",y.length>1)i=y[1]}}if(!o){let g=document.querySelector("ytmusic-player-bar .image, ytmusic-player-bar img#img, .thumbnail-image-wrapper img");if(g)o=g.src}let c=new URLSearchParams(window.location.search).get("v")||void 0,u=e?Math.floor(e.duration||0):0,l=e?Math.floor(e.currentTime||0):0,p=e?!e.paused&&!e.ended:!1;if(!r)return null;return{title:r,artist:a||"Unknown Artist",album:i||void 0,coverUrl:o||void 0,durationSecs:u,currentTimeSecs:l,isPlaying:p,videoId:c}}checkTrackUpdate(){let e=this.extractTrackInfo();if(!e)return;let t=!this.currentTrack||this.currentTrack.title!==e.title||this.currentTrack.artist!==e.artist||this.currentTrack.videoId!==e.videoId,n=this.currentTrack&&this.currentTrack.isPlaying!==e.isPlaying;if(this.currentTrack=e,t)this.onTrackChangeCallbacks.forEach((r)=>r(e));if(n)this.onPlaybackChangeCallbacks.forEach((r)=>r(e.isPlaying))}handlePlaybackChange(e){if(this.currentTrack)this.currentTrack.isPlaying=e;this.onPlaybackChangeCallbacks.forEach((t)=>t(e))}destroy(){if(this.tickInterval!==null)clearInterval(this.tickInterval),this.tickInterval=null}}class m{static getVideo(){return document.querySelector("video")||document.querySelector(".html5-main-video")}static getPlayerBar(){return document.querySelector("ytmusic-player-bar")}static playPause(){let e=document.querySelector("#play-pause-button, ytmusic-player-bar #play-pause-button");if(e){e.click();return}let t=this.getVideo();if(t)if(t.paused)t.play();else t.pause()}static play(){let e=this.getVideo();if(e&&e.paused)this.playPause()}static pause(){let e=this.getVideo();if(e&&!e.paused)this.playPause()}static next(){let e=document.querySelector("ytmusic-player-bar .next-button, #player-bar-background .next-button, .next-button");if(e)e.click()}static previous(){let e=document.querySelector("ytmusic-player-bar .previous-button, #player-bar-background .previous-button, .previous-button");if(e)e.click()}static seekTo(e){let t=this.getVideo();if(t&&!isNaN(e))t.currentTime=Math.max(0,Math.min(e,t.duration||e))}static setVolume(e){let t=this.getVideo();if(t)t.volume=Math.max(0,Math.min(1,e))}static toggleLike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Like"], ytmusic-like-button-renderer #button[aria-label*="Like"]');if(e)e.click()}static toggleDislike(){let e=document.querySelector('ytmusic-player-bar #like-button-renderer #button[aria-label*="Dislike"], ytmusic-like-button-renderer #button[aria-label*="Dislike"]');if(e)e.click()}static toggleMute(){let e=document.querySelector("ytmusic-player-bar #volume-slider"),t=this.getVideo();if(t)t.muted=!t.muted;if(e){let n=e.parentElement?.querySelector("paper-icon-button, #button");if(n)n.click()}}}class V{plugins=new Map;enabledPlugins=new Set;context;constructor(e){this.context=e}register(e){if(this.plugins.set(e.id,e),e.defaultEnabled)this.enabledPlugins.add(e.id)}async initAll(e){for(let[t,n]of this.plugins)if(e?.[t]!==void 0?e[t]:n.defaultEnabled){if(this.enabledPlugins.add(t),n.onInit)try{await n.onInit(this.context)}catch(a){console.error(`[YTMD] Failed to init plugin ${t}:`,a)}}else this.enabledPlugins.delete(t)}async enable(e){let t=this.plugins.get(e);if(t&&!this.enabledPlugins.has(e)){if(this.enabledPlugins.add(e),t.onInit)await t.onInit(this.context)}}async disable(e){let t=this.plugins.get(e);if(t&&this.enabledPlugins.has(e)){if(this.enabledPlugins.delete(e),t.onDestroy)await t.onDestroy()}}handleTrackChange(e){this.context.track=e;for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTrackChange)try{n.onTrackChange(e,this.context)}catch(r){console.error(`[YTMD] Error in plugin ${t} onTrackChange:`,r)}}}handlePlaybackChange(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onPlaybackChange)try{n.onPlaybackChange(e,this.context)}catch(r){console.error(`[YTMD] Error in plugin ${t} onPlaybackChange:`,r)}}}handleTick(e){for(let t of this.enabledPlugins){let n=this.plugins.get(t);if(n?.onTick)try{n.onTick(e,this.context)}catch(r){console.error(`[YTMD] Error in plugin ${t} onTick:`,r)}}}getRegisteredPlugins(){return Array.from(this.plugins.values())}isEnabled(e){return this.enabledPlugins.has(e)}}var W={id:"adblock",name:"Ad Blocker & Anti-Nag",description:"Blocks audio/video ads, auto-skips pre-rolls, and dismisses premium upsell banners",defaultEnabled:!0,onInit(e){let t=null,n=()=>{let i=e.getVideoElement(),o=document.getElementById("movie_player");if((document.querySelector(".ad-showing, .ad-interrupting, .ytp-ad-player-overlay")!==null||o?.classList.contains("ad-showing")||o?.classList.contains("ad-interrupting"))&&i)if(i.muted=!0,i.playbackRate=16,i.duration&&isFinite(i.duration))i.currentTime=i.duration;else i.currentTime=99999;document.querySelectorAll(".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button.ytp-ad-skip-button, .ytp-ad-skip-button-container button, .ytp-ad-skip-button-slot button").forEach((l)=>l.click()),document.querySelectorAll("ytmusic-mealbar-promo-renderer, ytmusic-upsell-dialog-renderer, ytd-popup-container ytmusic-mealbar-promo-renderer, tp-yt-paper-dialog:has(ytmusic-upsell-dialog-renderer)").forEach((l)=>{l.style.display="none";let p=l.querySelector('#dismiss-button, button[aria-label*="Dismiss"], #secondary-button');if(p)p.click()})},r=document.createElement("style");r.id="ytmd-adblock-styles",r.textContent=`
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
    `,document.head.appendChild(r),(()=>{let i=e.getVideoElement();if(i)i.addEventListener("timeupdate",n),i.addEventListener("play",n),i.addEventListener("loadedmetadata",n)})(),t=window.setInterval(n,100),this._cleanup=()=>{if(t)clearInterval(t);let i=document.getElementById("ytmd-adblock-styles");if(i)i.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var Q={id:"sponsorblock",name:"SponsorBlock for Music",description:"Automatically skips non-music portions, music video intros/outros and sponsorships",defaultEnabled:!0,onInit(){this._segments=[],this._lastVideoId=""},async onTrackChange(e){if(!e.videoId||e.videoId===this._lastVideoId)return;this._lastVideoId=e.videoId,this._segments=[];try{let t=JSON.stringify(["music_offtopic","intro","outro","sponsor","selfpromo"]),n=`https://sponsor.ajay.app/api/skipSegments?videoID=${e.videoId}&categories=${encodeURIComponent(t)}`,r=await fetch(n);if(r.ok){let a=await r.json();this._segments=a,console.log(`[YTMD SponsorBlock] Loaded ${a.length} segments for ${e.videoId}`)}}catch(t){}},onTick(e,t){let n=this._segments;if(!n||n.length===0)return;for(let r of n){let[a,i]=r.segment;if(e>=a&&e<i-0.5){console.log(`[YTMD SponsorBlock] Skipping segment (${r.category}): ${a}s -> ${i}s`);let o=t.getVideoElement();if(o)o.currentTime=i;break}}}};function _(e,t=18,n=18,r="0 0 24 24"){let a=document.createElementNS("http://www.w3.org/2000/svg","svg");a.setAttribute("width",String(t)),a.setAttribute("height",String(n)),a.setAttribute("viewBox",r),a.setAttribute("fill","currentColor");let i=document.createElementNS("http://www.w3.org/2000/svg","path");return i.setAttribute("d",e),a.appendChild(i),a}function d(e,t){let n=document.createElement(e);if(t?.id)n.id=t.id;if(t?.className)n.className=t.className;if(t?.text!==void 0)n.textContent=t.text;if(t?.title)n.title=t.title;if(t?.style)n.style.cssText=t.style;return n}var v=[],E=-1,S=null,q="",X={id:"lyrics",name:"Native Synced Lyrics (LRCLIB)",description:"Injects synchronized scrolling lyrics directly into YouTube Music native Lyrics tab with active highlighting and seek-on-click",defaultEnabled:!0,onInit(e){v=[],E=-1,S=null,q="";let t=document.createElement("style");t.id="ytmd-native-lyrics-styles",t.textContent=`
      /* Force enable TEKST / LYRICS tab button so it is always clickable and bright */
      tp-yt-paper-tab[disabled],
      tp-yt-paper-tab[aria-disabled="true"],
      ytmusic-tab-header-renderer[disabled],
      ytmusic-tab-header-renderer[aria-disabled="true"],
      .tab-header[disabled] {
        pointer-events: auto !important;
        cursor: pointer !important;
        opacity: 1 !important;
        color: #d4d4d8 !important;
      }
      tp-yt-paper-tab[disabled]:hover,
      ytmusic-tab-header-renderer[disabled]:hover {
        color: #ffffff !important;
      }

      #ytmd-native-lyrics-wrapper {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 32px 20px 140px 20px;
        max-width: 760px;
        margin: 0 auto;
        box-sizing: border-box;
        font-family: inherit;
        width: 100%;
      }
      .ytmd-native-lyric-line {
        font-size: 22px;
        font-weight: 700;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.28);
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 8px;
        transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), font-size 0.2s ease;
        user-select: none;
        word-break: break-word;
      }
      .ytmd-native-lyric-line:hover {
        color: rgba(255, 255, 255, 0.85);
        background: rgba(255, 255, 255, 0.05);
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
        border-top: 1px solid rgba(255, 255, 255, 0.1);
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
      /* Hide default un-synced text and unavailable messages inside lyrics tab */
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer #text,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-message-renderer #subtext,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer #description,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer .description,
      ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"] ytmusic-description-shelf-renderer yt-formatted-string.description {
        display: none !important;
      }
    `,document.head.appendChild(t),document.addEventListener("click",(a)=>{let i=a.target?.closest("tp-yt-paper-tab, ytmusic-tab-header-renderer");if(!i)return;let o=i.textContent?.toLowerCase()||"";if(o.includes("tekst")||o.includes("lyrics")||o.includes("paroles")||o.includes("letras")){let s=document.querySelector("ytmusic-player-page tp-yt-paper-tabs, ytmusic-tab-header-shelf-renderer tp-yt-paper-tabs");if(s)s.selected=1;document.querySelectorAll("ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-shelf-renderer tp-yt-paper-tab").forEach((l,p)=>{if(p===1||l===i)l.classList.add("iron-selected"),l.setAttribute("aria-selected","true");else l.classList.remove("iron-selected"),l.setAttribute("aria-selected","false")}),document.querySelectorAll("ytmusic-player-page ytmusic-tab-renderer").forEach((l,p)=>{if(l.getAttribute("page-type")==="MUSIC_PAGE_TYPE_TRACK_LYRICS"||p===1&&l.getAttribute("page-type")!=="MUSIC_PAGE_TYPE_TRACK_UP_NEXT")l.removeAttribute("hidden"),l.style.display="block";else l.setAttribute("hidden",""),l.style.display="none"}),setTimeout(()=>{z(e)},50)}else if(o.includes("następn")||o.includes("up next")||o.includes("kolejk")||o.includes("queue")){let s=document.querySelector("ytmusic-player-page tp-yt-paper-tabs, ytmusic-tab-header-shelf-renderer tp-yt-paper-tabs");if(s)s.selected=0;document.querySelectorAll("ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-shelf-renderer tp-yt-paper-tab").forEach((l,p)=>{if(p===0||l===i)l.classList.add("iron-selected"),l.setAttribute("aria-selected","true");else l.classList.remove("iron-selected"),l.setAttribute("aria-selected","false")}),document.querySelectorAll("ytmusic-player-page ytmusic-tab-renderer").forEach((l,p)=>{if(l.getAttribute("page-type")==="MUSIC_PAGE_TYPE_TRACK_UP_NEXT"||p===0)l.removeAttribute("hidden"),l.style.display="block";else l.setAttribute("hidden",""),l.style.display="none"})}else if(o.includes("podobn")||o.includes("related")){let s=document.querySelector("ytmusic-player-page tp-yt-paper-tabs, ytmusic-tab-header-shelf-renderer tp-yt-paper-tabs");if(s)s.selected=2;document.querySelectorAll("ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-shelf-renderer tp-yt-paper-tab").forEach((l,p)=>{if(p===2||l===i)l.classList.add("iron-selected"),l.setAttribute("aria-selected","true");else l.classList.remove("iron-selected"),l.setAttribute("aria-selected","false")}),document.querySelectorAll("ytmusic-player-page ytmusic-tab-renderer").forEach((l,p)=>{if(l.getAttribute("page-type")==="MUSIC_PAGE_TYPE_TRACK_RELATED"||p===2)l.removeAttribute("hidden"),l.style.display="block";else l.setAttribute("hidden",""),l.style.display="none"})}},!0);let n=()=>{B(),z(e)},r=window.setInterval(n,800);n(),this._cleanup=()=>{clearInterval(r),t.remove(),document.querySelectorAll("#ytmd-native-lyrics-wrapper").forEach((i)=>i.remove())}},async onTrackChange(e,t){let n=`${e.title} - ${e.artist}`;if(q===n&&v.length>0)return;q=n,v=[],E=-1,S=null,B();let r=document.getElementById("ytmd-native-lyrics-wrapper");if(r)r.replaceChildren(d("div",{className:"ytmd-native-lyrics-status",text:"Loading synchronized lyrics..."}));try{let a=await t.invoke("fetch_lyrics",{artist:e.artist,title:e.title,albumName:e.album||null,duration:e.durationSecs||null});if(S=a,a?.syncedLyrics)v=he(a.syncedLyrics);B(),z(t),Z(t)}catch{if(r)r.replaceChildren(d("div",{className:"ytmd-native-lyrics-status",text:"No lyrics available for this track."}))}},onTick(e){if(!v||v.length===0)return;let t=-1;for(let n=0;n<v.length;n++)if(e>=v[n].timeSecs)t=n;else break;if(t!==E&&t>=0){E=t;let n=document.getElementById("ytmd-native-lyrics-wrapper");if(n){let r=n.querySelectorAll(".ytmd-native-lyric-line");r.forEach((i,o)=>{if(o===t)i.classList.add("active");else i.classList.remove("active")});let a=J();if(a&&be(a)){let i=r[t];if(i)i.scrollIntoView({behavior:"smooth",block:"center"})}}}},onDestroy(){if(this._cleanup)this._cleanup()}};function be(e){if(!e||e.offsetParent===null||e.hasAttribute("hidden"))return!1;let t=window.getComputedStyle(e);return t.display!=="none"&&t.visibility!=="hidden"&&t.opacity!=="0"}function B(){document.querySelectorAll("ytmusic-player-page tp-yt-paper-tab, ytmusic-tab-header-renderer, .tab-header, tp-yt-paper-tab").forEach((t)=>{let n=t.textContent?.toLowerCase()||"";if(n.includes("tekst")||n.includes("lyrics")||n.includes("paroles")||n.includes("letras"))t.disabled=!1,t.removeAttribute("disabled"),t.removeAttribute("aria-disabled"),t.classList.remove("disabled"),t.style.pointerEvents="auto",t.style.cursor="pointer",t.style.opacity="1",t.style.color="#d4d4d8"})}function J(){let e=document.querySelector('ytmusic-player-page ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');if(e)return e;let t=Array.from(document.querySelectorAll("ytmusic-player-page ytmusic-tab-renderer"));if(t.length>=2){let n=t[1];if(n.getAttribute("page-type")!=="MUSIC_PAGE_TYPE_TRACK_UP_NEXT")return n}return null}function fe(){let e=J();if(!e)return null;return e.querySelector("#contents")||e}function z(e){document.querySelectorAll('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_UP_NEXT"] #ytmd-native-lyrics-wrapper, ytmusic-player-page ytmusic-tab-renderer:first-child #ytmd-native-lyrics-wrapper').forEach((o)=>o.remove());let n=fe();if(!n)return;let r=n.closest("ytmusic-tab-renderer");if(r){if(r.getAttribute("page-type")==="MUSIC_PAGE_TYPE_TRACK_UP_NEXT")return;if(Array.from(document.querySelectorAll("ytmusic-player-page ytmusic-tab-renderer")).indexOf(r)===0)return}let a=n.querySelector("ytmusic-message-renderer");if(a)a.style.display="none";let i=document.getElementById("ytmd-native-lyrics-wrapper");if(!i||!n.contains(i)){if(i)i.remove();i=d("div",{id:"ytmd-native-lyrics-wrapper"}),n.prepend(i),Z(e)}}function Z(e){let t=document.getElementById("ytmd-native-lyrics-wrapper");if(!t)return;if(v&&v.length>0)t.replaceChildren(...v.map((n,r)=>{let a=d("div",{className:`ytmd-native-lyric-line${r===E?" active":""}`,text:n.text});return a.addEventListener("click",()=>{let i=e.getVideoElement();if(i)i.currentTime=n.timeSecs}),a}),d("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}));else if(S?.plainLyrics){let n=S.plainLyrics.split(`
`);t.replaceChildren(...n.map((r)=>d("div",{className:"ytmd-native-lyric-line active",text:r,style:"cursor: default;"})),d("div",{className:"ytmd-native-lyrics-footer",text:"Lyrics provided by LRCLIB"}))}else t.replaceChildren(d("div",{className:"ytmd-native-lyrics-status",text:"Synced lyrics unavailable for this track."}))}function he(e){let t=e.split(`
`),n=[],r=/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;for(let a of t){let i=r.exec(a.trim());if(i){let o=parseInt(i[1],10),s=parseInt(i[2],10),c=parseInt(i[3].padEnd(3,"0").slice(0,3),10),u=o*60+s+c/1000,l=i[4].trim();if(l)n.push({timeSecs:u,text:l})}}return n.sort((a,i)=>a.timeSecs-i.timeSecs)}var ee={id:"volume",name:"Wheel Volume Controller",description:"Adjust volume smoothly by scrolling the mouse wheel anywhere over the player bar",defaultEnabled:!0,onInit(e){let t=(n)=>{let r=document.querySelector("ytmusic-player-bar, #player-bar-background");if(!r)return;let a=r.getBoundingClientRect();if(n.clientX>=a.left&&n.clientX<=a.right&&n.clientY>=a.top&&n.clientY<=a.bottom){n.preventDefault();let i=e.getVideoElement();if(i){let o=e.config.wheel_volume_step||0.05,s=n.deltaY<0?o:-o,c=Math.max(0,Math.min(1,i.volume+s));i.volume=c}}};window.addEventListener("wheel",t,{passive:!1}),this._cleanup=()=>{window.removeEventListener("wheel",t)}},onDestroy(){if(this._cleanup)this._cleanup()}};var te={id:"notifications",name:"Track Change Notifications",description:"Displays native desktop notifications when songs change",defaultEnabled:!1,async onTrackChange(e,t){if(!t.config?.notifications_enabled)return;if(!e.title||e.title==="No Track Playing")return;try{await t.invoke("notify_track_change",{title:e.title,artist:e.artist})}catch(n){console.warn("[YTMD] Notification dispatch failed:",n)}}};var ne={id:"visualizer",name:"Modern Clean Theme & Custom CSS",description:"Applies sleek dark aesthetics, subtle scrollbars, and user-defined custom CSS",defaultEnabled:!0,onInit(e){let t=document.createElement("style");t.id="ytmd-theme-styles";let n=e.config.custom_css||"",r=e.config.theme||"default-dark",a=`
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
    `;if(r==="oled")a+=`
        body, #content, ytmusic-app-layout, #background.ytmusic-item-section-renderer {
          background-color: #000000 !important;
        }
        ytmusic-nav-bar, ytmusic-player-bar {
          background: #000000 !important;
          border-color: #1a1a1a !important;
        }
      `;t.textContent=`${a}
${n}`,document.head.appendChild(t),this._cleanup=()=>{t.remove()}},onDestroy(){if(this._cleanup)this._cleanup()}};var U=[32,64,125,250,500,1000,2000,4000,8000,16000],H={flat:{id:"flat",name:"Flat (Default)",gains:[0,0,0,0,0,0,0,0,0,0],preamp:0},bass_boost:{id:"bass_boost",name:"Bass Boost",gains:[7,6,5,3,1,0,0,0,0,0],preamp:-2},bass_reducer:{id:"bass_reducer",name:"Bass Reducer",gains:[-6,-5,-4,-2,0,0,0,0,0,0],preamp:0},treble_boost:{id:"treble_boost",name:"Treble Boost",gains:[0,0,0,0,0,1,2,4,6,7],preamp:-1},vocal_clarity:{id:"vocal_clarity",name:"Vocal Clarity & Podcasts",gains:[-2,-2,0,2,4,4,3,1,0,-1],preamp:0},electronic:{id:"electronic",name:"Electronic / EDM",gains:[5.5,4.5,2,0,-1.5,2,1,2.5,4.5,5],preamp:-1.5},rock:{id:"rock",name:"Rock / Metal",gains:[5,3.5,2,0.5,-1,-0.5,1.5,3,4,4.5],preamp:-1},classical:{id:"classical",name:"Classical / Acoustic",gains:[4,3,2,1.5,-1,-1,0,2,3,3.5],preamp:0},pop:{id:"pop",name:"Pop",gains:[-1,1.5,3,3.5,2,-1,-1.5,-1,1.5,2.5],preamp:0}};function M(e){return Math.max(-12,Math.min(12,e))}class h{static instance=null;audioCtx=null;sourceNode=null;compressorNode=null;filters=[];preampNode=null;fadeNode=null;analyserNode=null;isInitialized=!1;isNormalizing=!1;hookedVideo=null;static getInstance(){if(!h.instance)h.instance=new h;return h.instance}init(e){if(this.isInitialized&&this.hookedVideo===e){this.resumeContext();return}try{let t=window.AudioContext||window.webkitAudioContext;if(!t){console.warn("[YTMD DSP] Web Audio API is not supported in this environment");return}this.audioCtx=new t,this.hookedVideo=e,this.sourceNode=this.audioCtx.createMediaElementSource(e),this.compressorNode=this.audioCtx.createDynamicsCompressor(),this.compressorNode.threshold.setValueAtTime(-24,this.audioCtx.currentTime),this.compressorNode.knee.setValueAtTime(30,this.audioCtx.currentTime),this.compressorNode.ratio.setValueAtTime(12,this.audioCtx.currentTime),this.compressorNode.attack.setValueAtTime(0.003,this.audioCtx.currentTime),this.compressorNode.release.setValueAtTime(0.25,this.audioCtx.currentTime),this.filters=U.map((r,a)=>{if(!this.audioCtx)throw Error("AudioContext missing");let i=this.audioCtx.createBiquadFilter();if(a===0)i.type="lowshelf";else if(a===U.length-1)i.type="highshelf";else i.type="peaking",i.Q.setValueAtTime(1.4,this.audioCtx.currentTime);return i.frequency.setValueAtTime(r,this.audioCtx.currentTime),i.gain.setValueAtTime(0,this.audioCtx.currentTime),i}),this.preampNode=this.audioCtx.createGain(),this.preampNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.fadeNode=this.audioCtx.createGain(),this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime),this.analyserNode=this.audioCtx.createAnalyser(),this.analyserNode.fftSize=256,this.analyserNode.smoothingTimeConstant=0.8,this.rebuildGraph();let n=()=>this.resumeContext();e.addEventListener("play",n),e.addEventListener("playing",n),document.addEventListener("click",n,{once:!0}),this.isInitialized=!0,console.log("[YTMD DSP] AudioEngine & DSP pipeline initialized successfully.")}catch(t){console.error("[YTMD DSP] Failed to initialize AudioEngine:",t)}}rebuildGraph(){if(!this.audioCtx||!this.sourceNode||!this.preampNode||!this.fadeNode||!this.analyserNode||!this.compressorNode)return;try{this.sourceNode.disconnect(),this.compressorNode.disconnect(),this.filters.forEach((t)=>t.disconnect()),this.preampNode.disconnect(),this.fadeNode.disconnect(),this.analyserNode.disconnect();let e=this.sourceNode;if(this.isNormalizing)e.connect(this.compressorNode),e=this.compressorNode;for(let t of this.filters)e.connect(t),e=t;e.connect(this.preampNode),e=this.preampNode,e.connect(this.fadeNode),e=this.fadeNode,e.connect(this.analyserNode),this.analyserNode.connect(this.audioCtx.destination)}catch(e){console.error("[YTMD DSP] Graph rebuild error:",e)}}resumeContext(){if(this.audioCtx&&this.audioCtx.state==="suspended")this.audioCtx.resume()}setBandGain(e,t){if(e<0||e>=this.filters.length||!this.audioCtx)return;let n=M(t);this.filters[e].gain.setValueAtTime(n,this.audioCtx.currentTime)}setAllGains(e){if(!this.audioCtx)return;e.forEach((t,n)=>{if(n<this.filters.length)this.filters[n].gain.setValueAtTime(M(t),this.audioCtx.currentTime)})}setPreamp(e){if(!this.preampNode||!this.audioCtx)return;let t=Math.pow(10,M(e)/20);this.preampNode.gain.setValueAtTime(t,this.audioCtx.currentTime)}setLoudnessNormalization(e){if(this.isNormalizing!==e)this.isNormalizing=e,this.rebuildGraph()}applyPreset(e){let t=H[e]||H.flat;if(this.setAllGains(t.gains),t.preamp!==void 0)this.setPreamp(t.preamp);return t.gains}fadeIn(e){if(!this.fadeNode||!this.audioCtx||e<=0){if(this.fadeNode&&this.audioCtx)this.fadeNode.gain.setValueAtTime(1,this.audioCtx.currentTime);return}let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(0.001,t),this.fadeNode.gain.linearRampToValueAtTime(1,t+e)}fadeOut(e){if(!this.fadeNode||!this.audioCtx||e<=0)return;let t=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(t),this.fadeNode.gain.setValueAtTime(this.fadeNode.gain.value,t),this.fadeNode.gain.linearRampToValueAtTime(0.001,t+e)}resetFade(){if(this.fadeNode&&this.audioCtx){let e=this.audioCtx.currentTime;this.fadeNode.gain.cancelScheduledValues(e),this.fadeNode.gain.setValueAtTime(1,e)}}getAudioPowerDb(){if(!this.analyserNode)return-100;let e=new Float32Array(this.analyserNode.fftSize);this.analyserNode.getFloatTimeDomainData(e);let t=0;for(let r=0;r<e.length;r++)t+=e[r]*e[r];let n=Math.sqrt(t/e.length);if(n<=0.00001)return-100;return 20*Math.log10(n)}getFrequencyData(){if(!this.analyserNode)return null;let e=new Uint8Array(this.analyserNode.frequencyBinCount);return this.analyserNode.getByteFrequencyData(e),e}setPlaybackRate(e){let t=Math.max(0.5,Math.min(2,e));if(this.hookedVideo)this.hookedVideo.playbackRate=t}setPreservesPitch(e){if(this.hookedVideo)this.hookedVideo.preservesPitch=e,this.hookedVideo.mozPreservesPitch=e,this.hookedVideo.webkitPreservesPitch=e}}class F{crossfadeSeconds=0;fadeOutTriggered=!1;currentTrackId="";setCrossfadeSeconds(e){this.crossfadeSeconds=Math.max(0,Math.min(12,e))}getCrossfadeSeconds(){return this.crossfadeSeconds}onTrackChange(e){if(this.fadeOutTriggered=!1,this.currentTrackId=e.videoId||`${e.title}-${e.artist}`,this.crossfadeSeconds>0)h.getInstance().fadeIn(this.crossfadeSeconds);else h.getInstance().resetFade()}onTick(e,t){if(!t||this.crossfadeSeconds<=0||t.durationSecs<=0)return;let n=t.durationSecs-e;if(n<=this.crossfadeSeconds&&!this.fadeOutTriggered&&n>0)this.fadeOutTriggered=!0,console.log(`[YTMD Crossfade] Fading out (${n.toFixed(1)}s remaining)...`),h.getInstance().fadeOut(n),setTimeout(()=>{let r=t.videoId||`${t.title}-${t.artist}`;if(this.currentTrackId===r)console.log("[YTMD Crossfade] Advancing to next track..."),m.next()},Math.max(100,(n-0.2)*1000))}}class G{enabled=!1;silenceThresholdDb=-50;consecutiveSilentTicks=0;checkedIntro=!1;setEnabled(e){this.enabled=e}isEnabled(){return this.enabled}onTrackChange(){this.checkedIntro=!1,this.consecutiveSilentTicks=0}onTick(e,t,n){if(!this.enabled||!t||!n||n.paused||n.ended)return;let r=h.getInstance().getAudioPowerDb();if(!this.checkedIntro&&e<15)if(r<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=2&&e<12)console.log(`[YTMD Skip Silence] Intro silence detected (${r.toFixed(1)} dB). Fast forwarding...`),n.currentTime+=1,this.consecutiveSilentTicks=0}else this.checkedIntro=!0,this.consecutiveSilentTicks=0;else this.checkedIntro=!0;if(t.durationSecs>15&&e>t.durationSecs-10)if(r<this.silenceThresholdDb){if(this.consecutiveSilentTicks++,this.consecutiveSilentTicks>=3)console.log(`[YTMD Skip Silence] Outro silence detected (${r.toFixed(1)} dB). Advancing to next track...`),this.consecutiveSilentTicks=0,m.next()}else this.consecutiveSilentTicks=0}}var ie={id:"audio_dsp",name:"Audio DSP & 10-Band Equalizer",description:"Parametric 10-band equalizer, loudness normalization, crossfade, silence skipping, and speed/pitch control",defaultEnabled:!0,onInit(e){let t=e.getVideoElement(),n=h.getInstance(),r=new F,a=new G;if(this._crossfade=r,this._skipSilence=a,t)n.init(t);else{let o=setInterval(()=>{let s=e.getVideoElement();if(s)clearInterval(o),n.init(s)},500)}let i=e.config;if(i.equalizer_gains&&Array.isArray(i.equalizer_gains))n.setAllGains(i.equalizer_gains);else if(i.equalizer_preset&&typeof i.equalizer_preset==="string")n.applyPreset(i.equalizer_preset);if(i.preamp_gain!==void 0)n.setPreamp(i.preamp_gain);if(i.loudness_normalization!==void 0)n.setLoudnessNormalization(Boolean(i.loudness_normalization));if(i.crossfade_seconds!==void 0)r.setCrossfadeSeconds(i.crossfade_seconds);if(i.skip_silence_enabled!==void 0)a.setEnabled(Boolean(i.skip_silence_enabled));if(i.playback_speed!==void 0)n.setPlaybackRate(i.playback_speed);if(i.preserve_pitch!==void 0)n.setPreservesPitch(Boolean(i.preserve_pitch));if(window.__TAURI__?.event){let{listen:o}=window.__TAURI__.event;o("set-eq-band",(s)=>{n.setBandGain(s.payload.bandIndex,s.payload.gain)}),o("set-eq-all",(s)=>{n.setAllGains(s.payload.gains)}),o("set-eq-preset",(s)=>{n.applyPreset(s.payload)}),o("set-preamp",(s)=>{n.setPreamp(s.payload)}),o("set-loudness-normalization",(s)=>{n.setLoudnessNormalization(s.payload)}),o("set-crossfade-seconds",(s)=>{r.setCrossfadeSeconds(s.payload)}),o("set-skip-silence",(s)=>{a.setEnabled(s.payload)}),o("set-playback-rate",(s)=>{n.setPlaybackRate(s.payload)}),o("set-preserves-pitch",(s)=>{n.setPreservesPitch(s.payload)})}console.log("[YTMD] Audio DSP, Equalizer, Crossfade & Speed controls active.")},onTrackChange(e){let t=this._crossfade,n=this._skipSilence;if(t)t.onTrackChange(e);if(n)n.onTrackChange()},onTick(e,t){let n=this._crossfade,r=this._skipSilence;if(n)n.onTick(e,t.track);if(r)r.onTick(e,t.track,t.getVideoElement())}};async function re(e){return new Promise((t)=>{let n={primary:"#18181b",secondary:"#09090b",accent:"#dc2626"};if(!e){t(n);return}let r=new Image;r.crossOrigin="anonymous",r.onload=()=>{try{let a=document.createElement("canvas");a.width=16,a.height=16;let i=a.getContext("2d");if(!i){t(n);return}i.drawImage(r,0,0,16,16);let o=i.getImageData(0,0,16,16).data,s=0,c=0,u=0,l=0,p=0,g=0,b=0,y=0;for(let x=0;x<o.length;x+=4){let D=o[x],R=o[x+1],N=o[x+2];if(o[x+3]<128)continue;let O=(D+R+N)/3;if(O<20||O>240)continue;if(x<o.length/2)s+=D,c+=R,u+=N,l++;else p+=D,g+=R,b+=N,y++}if(l===0&&y===0){t(n);return}let T=l>0?Math.round(s/l):220,I=l>0?Math.round(c/l):38,f=l>0?Math.round(u/l):38,w=y>0?Math.round(p/y):24,L=y>0?Math.round(g/y):24,A=y>0?Math.round(b/y):27;t({primary:`rgb(${T}, ${I}, ${f})`,secondary:`rgb(${w}, ${L}, ${A})`,accent:`rgb(${Math.min(255,T+30)}, ${Math.min(255,I+30)}, ${Math.min(255,f+30)})`})}catch{t(n)}},r.onerror=()=>t(n),r.src=e})}var oe={id:"ambient_lighting",name:"Dynamic Ambient Lighting",description:"Smoothly diffuses dynamic, reactive ambient colors from the active album cover behind the player",defaultEnabled:!0,onInit(e){let t=document.getElementById("ytmd-ambient-backdrop");if(!t)t=document.createElement("div"),t.id="ytmd-ambient-backdrop",document.body.prepend(t);let n=typeof e.config.ambient_intensity==="number"?e.config.ambient_intensity:0.6,r=e.config.ambient_lighting_enabled!==!1,a=document.createElement("style");a.id="ytmd-ambient-styles",a.textContent=`
      #ytmd-ambient-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 0;
        opacity: ${r?n:0};
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
    `,document.head.appendChild(a);let i=d("div",{id:"ytmd-orb-1",className:"ytmd-ambient-orb"}),o=d("div",{id:"ytmd-orb-2",className:"ytmd-ambient-orb"});if(t.appendChild(i),t.appendChild(o),this._setIntensity=(s)=>{if(t)t.style.opacity=String(s)},window.__TAURI__?.event)window.__TAURI__.event.listen("set-ambient-intensity",(s)=>{this._setIntensity(s.payload)}),window.__TAURI__.event.listen("set-ambient-enabled",(s)=>{this._setIntensity(s.payload?0.6:0)});if(e.track)this.onTrackChange(e.track,e)},async onTrackChange(e){if(!e.coverUrl)return;try{let t=await re(e.coverUrl),n=document.getElementById("ytmd-ambient-backdrop");if(n)n.style.background=`
          radial-gradient(circle at 80% 20%, ${t.primary}66 0%, transparent 60%),
          radial-gradient(circle at 20% 80%, ${t.secondary}66 0%, transparent 60%)
        `}catch{}}};var P={default:{id:"default",name:"Modern Dark",css:`
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
    `}};var ae={id:"theme_engine",name:"Theme Engine & Live CSS",description:"Applies curated aesthetic themes and injects user custom CSS with instant hot-reload",defaultEnabled:!0,onInit(e){let t=()=>document.head||document.documentElement,n=(s)=>{let c=document.getElementById(s);if(!c){c=document.createElement("style"),c.id=s;let u=t();if(u)u.appendChild(c)}return c},r=(s)=>{let c=P[s]||P.default,u=n("ytmd-active-theme");if(u)u.textContent=c.css},a=(s)=>{let c=n("ytmd-custom-css");if(c)c.textContent=s},i=e.config.theme_preset||e.config.theme||"default";r(i);let o=e.config.custom_css||"";if(a(o),window.__TAURI__?.event)window.__TAURI__.event.listen("set-theme-preset",(s)=>{r(s.payload)}),window.__TAURI__.event.listen("set-custom-css",(s)=>{a(s.payload)});console.log("[YTMD] Theme engine active.")}};var se={id:"pip",name:"Floating Picture-in-Picture",description:"Detachable floating always-on-top video window for watching music videos while browsing",defaultEnabled:!0,onInit(e){let t=()=>{if(document.getElementById("ytmd-pip-btn"))return;let n=document.querySelector("ytmusic-player-bar .right-controls-buttons, #player-bar-background .right-controls-buttons, ytmusic-player-bar .middle-controls-buttons");if(n){let r=d("button",{id:"ytmd-pip-btn",title:"Picture-in-Picture (Float Video)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),a=_("M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z",20,20);r.appendChild(a),r.style.cssText=`
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
        `,r.addEventListener("mouseenter",()=>{r.style.color="#fafafa",r.style.backgroundColor="#27272a"}),r.addEventListener("mouseleave",()=>{r.style.color="#a1a1aa",r.style.backgroundColor="transparent"}),r.addEventListener("click",async()=>{let i=e.getVideoElement();if(!i)return;try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await i.requestPictureInPicture();else await e.invoke("toggle_mini_player")}catch(o){console.warn("[YTMD PiP] Could not enter PiP:",o),await e.invoke("toggle_mini_player")}}),n.appendChild(r)}};setInterval(t,1000),t()}};var le={id:"downloader",name:"Built-in Audio Downloader",description:"Download tracks or albums to MP3/FLAC/Opus with metadata, lyrics and 1080p artwork",defaultEnabled:!0,onInit(e){let t=null,n=!1,r=()=>{if(document.getElementById("ytmd-download-btn"))return;let a=document.querySelector("ytmusic-player-bar .middle-controls-buttons, ytmusic-player-bar .right-controls-buttons");if(a){let i=d("button",{id:"ytmd-download-btn",title:"Download Track (MP3/FLAC with ID3 Tags & Lyrics)",style:"background:none; border:none; color:#a1a1aa; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; margin:0 4px; transition:color 0.15s ease, background-color 0.15s ease;"}),o=_("M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z",20,20);i.appendChild(o),i.style.cssText=`
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
        `,i.addEventListener("mouseenter",()=>{if(!n)i.style.color="#fafafa",i.style.backgroundColor="#27272a"}),i.addEventListener("mouseleave",()=>{if(!n)i.style.color="#a1a1aa",i.style.backgroundColor="transparent"}),i.addEventListener("click",async()=>{if(!t||!t.videoId||n)return;n=!0,i.style.color="#38bdf8",i.title="Downloading...";try{let s=e.config.download_format||"mp3",c=e.config.embed_lyrics!==!1;await e.invoke("download_track",{request:{video_id:t.videoId,title:t.title,artist:t.artist,album:t.album||void 0,cover_url:t.coverUrl||void 0,format:s,embed_lyrics:c}}),i.style.color="#22c55e",i.title="Downloaded!",setTimeout(()=>{n=!1,i.style.color="#a1a1aa",i.title="Download Track"},3000)}catch(s){console.error("[YTMD Downloader] Download failed:",s),i.style.color="#ef4444",setTimeout(()=>{n=!1,i.style.color="#a1a1aa",i.title="Download Track"},3000)}}),a.appendChild(i)}};setInterval(r,1000),r(),this._setCurrentTrack=(a)=>{t=a}},onTrackChange(e){if(this._setCurrentTrack)this._setCurrentTrack(e)}};var ce={id:"local_files",name:"Local Music Library",description:"Play local offline audio files alongside YouTube Music streaming",defaultEnabled:!0,onInit(e){console.log("[YTMD] Local files module ready.")}};class de{isHost=!1;inRoom=!1;lastAppliedTimestamp=0;setRoomState(e,t){this.inRoom=e,this.isHost=t}isInRoom(){return this.inRoom}isRoomHost(){return this.isHost}handleRemotePlayback(e,t){if(!this.inRoom||this.isHost||!t)return;let n=Date.now(),r=(n-e.timestamp_ms)/1000,a=e.is_playing?e.current_time_secs+Math.max(0,r):e.current_time_secs;this.lastAppliedTimestamp=n;let i=new URLSearchParams(window.location.search).get("v");if(e.video_id&&i!==e.video_id){console.log(`[YTMD Room Sync] Switching to track: ${e.video_id}`),window.location.href=`https://music.youtube.com/watch?v=${e.video_id}`;return}if(e.is_playing&&t.paused)m.play();else if(!e.is_playing&&!t.paused)m.pause();let o=Math.abs(t.currentTime-a);if(o>1.5)console.log(`[YTMD Room Sync] Drift detected (${o.toFixed(2)}s). Resyncing to ${a.toFixed(1)}s...`),m.seekTo(a)}broadcastLocalState(e,t,n){if(!this.inRoom||!this.isHost||!e||!e.videoId||!t)return;if(Date.now()-this.lastAppliedTimestamp<1000)return;n("broadcast_sync_state",{playback:{video_id:e.videoId,title:e.title,artist:e.artist,current_time_secs:t.currentTime,is_playing:!t.paused,timestamp_ms:Date.now()}}).catch(()=>{})}}var ue={id:"sync_room",name:"P2P Room Sync",description:"Listen together with friends in real-time synchronized listening rooms",defaultEnabled:!0,onInit(e){let t=new de;if(this._controller=t,window.__TAURI__?.event)window.__TAURI__.event.listen("sync-room-updated",(n)=>{t.setRoomState(!0,n.payload.is_host)}),window.__TAURI__.event.listen("sync-room-left",()=>{t.setRoomState(!1,!1)}),window.__TAURI__.event.listen("sync-playback-remote",(n)=>{t.handleRemotePlayback(n.payload,e.getVideoElement())})},onTick(e,t){let n=this._controller;if(n&&n.isInRoom()&&n.isRoomHost())n.broadcastLocalState(t.track,t.getVideoElement(),t.invoke)}};var pe={id:"power_watchdog",name:"Smart Power & Audio Watchdog",description:"Inhibits system sleep during active playback and auto-pauses when screen is locked",defaultEnabled:!0,onInit(e){let t=null,n=e.config.inhibit_sleep!==!1,r=async()=>{if(!n||t!==null)return;try{if("wakeLock"in navigator)t=await navigator.wakeLock.request("screen"),t.addEventListener("release",()=>{t=null});await e.invoke("set_inhibit_sleep",{inhibit:!0})}catch{}},a=async()=>{if(t!==null)try{await t.release(),t=null}catch{}await e.invoke("set_inhibit_sleep",{inhibit:!1})},i=e.getVideoElement();if(i)i.addEventListener("play",r),i.addEventListener("playing",r),i.addEventListener("pause",a),i.addEventListener("ended",a);else{let o=setInterval(()=>{let s=e.getVideoElement();if(s)clearInterval(o),s.addEventListener("play",r),s.addEventListener("playing",r),s.addEventListener("pause",a),s.addEventListener("ended",a)},1000)}if(e.config.pause_on_lock)document.addEventListener("visibilitychange",()=>{if(document.hidden&&e.config.pause_on_lock);})}};var me={id:"web_remote",name:"Mobile Web Remote",description:"Control playback from phone or tablet over Wi-Fi with QR code pairing",defaultEnabled:!0,onInit(e){window.__ytmd_show_remote_qr=()=>K(e),console.log("[YTMD] Mobile remote module ready.")}};async function K(e){let t=document.getElementById("ytmd-remote-modal");if(!t){t=d("div",{id:"ytmd-remote-modal",style:`
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
      `}),r=d("h3",{text:"Mobile Web Remote",style:"margin: 0 0 6px 0; font-size: 18px; font-weight: 700;"}),a=d("p",{text:"Scan with your phone camera on the same Wi-Fi network:",style:"font-size: 13px; color: #a1a1aa; margin: 0 0 16px 0;"}),i=d("div",{id:"ytmd-qr-container",style:`
        background: #ffffff;
        padding: 14px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 14px;
        min-width: 180px;
        min-height: 180px;
      `}),o=d("span",{text:"Generating QR code...",style:"color: #52525b; font-size: 12px; font-weight: 500;"});i.appendChild(o);let s=d("div",{id:"ytmd-remote-url",style:"font-family: monospace; font-size: 13px; color: #38bdf8; margin-bottom: 20px; word-break: break-all; font-weight: 600;"}),c=d("button",{id:"ytmd-remote-close-btn",text:"Close",style:"background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; padding: 8px 24px; font-weight: 600; cursor: pointer; font-size: 13px;"}),u=t;c.addEventListener("click",()=>{u.style.display="none"}),t.addEventListener("click",(l)=>{if(l.target===u)u.style.display="none"}),n.appendChild(r),n.appendChild(a),n.appendChild(i),n.appendChild(s),n.appendChild(c),t.appendChild(n),document.body.appendChild(t)}t.style.display="flex";try{let n=await e.invoke("get_remote_info"),r=document.getElementById("ytmd-qr-container"),a=document.getElementById("ytmd-remote-url");if(n&&n.qr_svg&&r){let i=d("img");i.src=`data:image/svg+xml;utf8,${encodeURIComponent(n.qr_svg)}`,i.width=180,i.height=180,i.style.display="block",i.alt="Mobile Remote QR Code",r.replaceChildren(i)}else if(r)r.replaceChildren(d("span",{text:"Remote server starting...",style:"color: #71717a; font-size: 12px;"}));if(n&&n.url&&a)a.textContent=n.url}catch(n){console.error("[YTMD Remote] Error fetching remote info:",n)}}var C=null,j=null,k=(e,t={})=>new Promise((n)=>{let r=window.__TAURI__;if(!r?.event?.emit){n(null);return}let a=Math.random().toString(36).slice(2)+Date.now().toString(36),i=null,o=setTimeout(()=>{if(i)i();n(null)},4000);r.event.listen(`ytmd-response-${a}`,(s)=>{if(clearTimeout(o),i)i();n(s.payload)}).then((s)=>{i=s,r.event.emit("ytmd-invoke",{id:a,cmd:e,args:t})}).catch(()=>{clearTimeout(o),n(null)})});function ye(e){if(document.getElementById("ytmd-burger-btn"))return;let t=document.querySelector("ytmusic-nav-bar .right-content, ytmusic-nav-bar #right-content"),n=document.querySelector("ytmusic-nav-bar .left-content, ytmusic-nav-bar #left-content"),r=document.querySelector("ytmusic-nav-bar"),a=document.body||document.documentElement;if(!t&&!n&&!a)return;let i=d("button",{id:"ytmd-burger-btn",title:"YouTube Music Desktop Menu (Ctrl+,)",style:`
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
    `}),o=_("M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",15,15),s=d("span",{text:"YTMD",style:"font-size: 12px; font-weight: 700; letter-spacing: 0.2px;"});i.appendChild(o),i.appendChild(s),i.addEventListener("mouseenter",()=>{i.style.background="#333333",i.style.borderColor="rgba(255, 255, 255, 0.3)",i.style.color="#ffffff"}),i.addEventListener("mouseleave",()=>{i.style.background="#212121",i.style.borderColor="rgba(255, 255, 255, 0.15)",i.style.color="#f4f4f5"});let c=document.getElementById("ytmd-burger-popover");if(!c){c=d("div",{id:"ytmd-burger-popover",style:`
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
      `});let u=(b,y,T,I)=>{let f=d("button",{style:`
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
        `}),w=d("span",{style:"display:flex; align-items:center; gap:10px;"}),L=d("span",{text:b,style:"font-size: 15px;"}),A=d("span",{text:y,style:"font-weight: 500;"});w.appendChild(L),w.appendChild(A);let x=d("span",{text:T,style:"font-size: 11px; color: #71717a; font-family: monospace;"});return f.appendChild(w),f.appendChild(x),f.addEventListener("mouseenter",()=>{f.style.background="#27272a",f.style.color="#ffffff"}),f.addEventListener("mouseleave",()=>{f.style.background="transparent",f.style.color="#e4e4e7"}),f.addEventListener("click",()=>{if(c)c.style.display="none";I()}),f},l=()=>d("div",{style:"height: 1px !important; background: #27272a !important; margin: 6px 4px !important;"});c.appendChild(u("⚙","Preferences & DSP EQ","Ctrl+,",()=>{k("toggle_settings_window")})),c.appendChild(u("\uD83C\uDFB5","Local Music Library","",()=>{k("toggle_local_library_window")})),c.appendChild(u("\uD83D\uDC65","Listen Together (Sync)","",()=>{k("toggle_sync_window")})),c.appendChild(u("\uD83D\uDCF1","Mobile Web Remote","",()=>{if(j)K(j)})),c.appendChild(u("\uD83D\uDDD6","Mini Player","",()=>{k("toggle_mini_player")})),c.appendChild(l()),c.appendChild(u("⬇","Download Current Track","",async()=>{if(!C||!C.videoId){alert("Please play a track first to download.");return}try{await k("download_track",{request:{video_id:C.videoId,title:C.title,artist:C.artist,album:C.album||void 0,cover_url:C.coverUrl||void 0,format:e.download_format||"mp3",embed_lyrics:e.embed_lyrics!==!1}}),alert(`Download started for: ${C.title}`)}catch(b){console.error("[YTMD Download Error]:",b)}}));let p=d("div",{style:"display: flex; gap: 4px; padding: 6px 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;"}),g=d("span",{text:"Theme:",style:"font-size: 11px; color: #71717a; font-weight: 600; text-transform: uppercase;"});p.appendChild(g),["oled","nord","catppuccin","tokyo_night","gruvbox"].forEach((b)=>{let y=d("button",{text:b.toUpperCase(),style:`
          background: #1c1c20;
          border: 1px solid #27272a;
          color: #a1a1aa;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
        `});y.addEventListener("click",()=>{let T=document.getElementById("ytmd-active-theme");if(T&&P[b])T.textContent=P[b].css}),p.appendChild(y)}),c.appendChild(p),document.body.appendChild(c),document.addEventListener("click",(b)=>{if(c&&c.style.display==="flex"){if(!c.contains(b.target)&&!i.contains(b.target))c.style.display="none"}})}if(i.addEventListener("click",(u)=>{if(u.stopPropagation(),c){let l=i.getBoundingClientRect();c.style.top=`${l.bottom+8}px`,c.style.right=`${Math.max(16,window.innerWidth-l.right)}px`,c.style.left="auto",c.style.display=c.style.display==="flex"?"none":"flex"}}),t)t.prepend(i);else if(n)n.appendChild(i);else if(r)r.prepend(i);else i.style.position="fixed",i.style.top="12px",i.style.right="16px",a.appendChild(i)}async function ge(){console.log("[YTMD] Initializing YouTube Music Desktop integration bridge...");let e={};ye(e),setInterval(()=>ye(e),1000),k("get_config").then((o)=>{if(o&&typeof o==="object")e=o});let t={track:null,config:e,invoke:k,sendPlayerCommand:(o)=>{a(o)},getVideoElement:()=>m.getVideo()};j=t;let n=new V(t);n.register(W),n.register(Q),n.register(X),n.register(ee),n.register(te),n.register(ne),n.register(ie),n.register(oe),n.register(ae),n.register(se),n.register(le),n.register(ce),n.register(ue),n.register(pe),n.register(me);try{await n.initAll()}catch(o){console.error("[YTMD] Registry init error:",o)}let r=new Y;r.onTrackChange(async(o)=>{C=o,n.handleTrackChange(o);try{await k("update_track_info",{track:{title:o.title,artist:o.artist,album:o.album||null,cover_url:o.coverUrl||null,duration_secs:o.durationSecs,current_time_secs:o.currentTimeSecs,is_playing:o.isPlaying,video_id:o.videoId||null}})}catch(s){console.error("[YTMD] Failed to sync track info to backend:",s)}}),r.onPlaybackChange(async(o)=>{n.handlePlaybackChange(o);let s=r.getCurrentTrack();if(s){s.isPlaying=o;try{await k("update_track_info",{track:{title:s.title,artist:s.artist,album:s.album||null,cover_url:s.coverUrl||null,duration_secs:s.durationSecs,current_time_secs:s.currentTimeSecs,is_playing:o,video_id:s.videoId||null}})}catch(c){console.error("[YTMD] Failed to sync playback status:",c)}}}),r.onTick((o)=>{n.handleTick(o)});function a(o){switch(o){case"play":m.play();break;case"pause":m.pause();break;case"play_pause":m.playPause();break;case"next":m.next();break;case"previous":m.previous();break;case"like":m.toggleLike();break;case"dislike":m.toggleDislike();break;case"mute":m.toggleMute();break}}let i=(o,s)=>{let c=window.__TAURI__;if(c?.event?.listen)c.event.listen(o,(u)=>s(u.payload))};i("player-command",(o)=>a(o)),i("tray-command",(o)=>a(o)),i("mpris-command",(o)=>a(o)),i("global-shortcut-event",(o)=>a(o)),i("player-seek",(o)=>m.seekTo(o)),i("mpris-command-seek",(o)=>m.seekTo(o)),i("player-volume",(o)=>m.setVolume(o)),window.addEventListener("keydown",(o)=>{if(o.ctrlKey&&o.key===","||o.key==="F2")o.preventDefault(),k("toggle_settings_window")}),console.log("[YTMD] Integration successfully activated.")}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>ge());else ge();
