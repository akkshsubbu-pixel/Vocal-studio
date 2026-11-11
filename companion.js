.companion-dock{--h-bg:#170810;--h-bg-light:#70213e;--h-bg-secondary:#3e1428;--h-panel:#24101a;--h-panel-raised:#321421;--h-panel-tint:#2b1420;--h-text:#fff4f7;--h-muted:#c6afb9;--h-soft:#d0b9c3;--h-primary:#e33762;--h-primary-bright:#ff78a9;--h-primary-deep:#9c1744;--h-secondary:#ff91b7;--h-metal:#e4d8de;--h-edge:#ead4dc55;--h-edge-bright:#ff9dbd88;--h-glow:rgba(255,86,138,.28);--h-focus:#e5c98f;--h-reflection:rgba(255,120,169,.12);--h-button-text:#fff;position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));z-index:9990;font-family:var(--sans,'Nunito',sans-serif);color:var(--h-text);pointer-events:none}
.companion-dock button,.companion-chat{pointer-events:auto}
.companion-toggle{position:relative;display:grid;place-items:center;width:78px;height:78px;padding:4px;border:1px solid var(--h-edge-bright);border-radius:50%;overflow:visible;background:linear-gradient(145deg,var(--h-panel-raised),var(--h-panel) 54%,var(--h-primary-deep));box-shadow:inset 0 1px 0 #fff9,0 5px 24px #0007,0 0 22px var(--h-glow);cursor:pointer;animation:companion-float 4.2s ease-in-out infinite}
.companion-toggle:hover{transform:translateY(-2px);box-shadow:inset 0 1px 0 #fff9,0 8px 28px #0008,0 0 30px var(--h-glow)}
.companion-halo{position:absolute;inset:-5px;border-radius:50%;background:conic-gradient(from 35deg,var(--h-primary-bright),var(--h-metal),var(--h-secondary),var(--h-primary),var(--h-metal),var(--h-primary-bright));opacity:.72;filter:blur(8px);z-index:-1;pointer-events:none}
.companion-avatar,.companion-chat-avatar{display:block;object-fit:cover;object-position:50% 24%;background:#fffaf7;filter:none!important;mix-blend-mode:normal;border-radius:50%;user-select:none;-webkit-user-drag:none}
.companion-avatar{width:68px;height:68px;border:1px solid #fff9;box-shadow:inset 0 0 0 1px #fff5}
.companion-spark{position:absolute;color:var(--h-metal);text-shadow:0 0 12px var(--h-primary-bright),0 0 20px var(--h-glow);pointer-events:none;animation:companion-twinkle 2.6s ease-in-out infinite alternate}
.companion-spark-one{top:-7px;right:6px;font-size:16px}.companion-spark-two{bottom:5px;left:-7px;font-size:13px;animation-delay:1.1s}
.companion-chat{position:absolute;right:0;bottom:94px;display:flex;flex-direction:column;width:min(356px,calc(100vw - 26px));max-height:min(520px,calc(100dvh - 132px));overflow:hidden;border:1px solid var(--h-edge-bright);border-radius:21px;background:radial-gradient(ellipse at 4% 0%,var(--h-reflection),transparent 44%),linear-gradient(145deg,color-mix(in srgb,var(--h-panel-raised) 94%,#fff 6%),var(--h-panel) 60%,var(--h-bg-secondary));box-shadow:inset 0 1px 0 #fff2,0 18px 60px #0009,0 0 32px var(--h-glow);backdrop-filter:blur(22px);opacity:0;transform:translateY(9px) scale(.985);transition:opacity .18s ease,transform .18s ease;transform-origin:bottom right}
.companion-chat.is-open{opacity:1;transform:translateY(0) scale(1)}
.companion-chat[hidden]{display:none}
.companion-chat-head{display:flex;align-items:center;gap:10px;padding:13px 14px;border-bottom:1px solid var(--h-edge);background:linear-gradient(105deg,var(--h-panel-raised),color-mix(in srgb,var(--h-panel) 82%,var(--h-primary) 18%))}
.companion-chat-avatar{width:40px;height:40px;border:1px solid var(--h-edge-bright);box-shadow:0 0 12px var(--h-glow)}
.companion-chat-head>div{display:grid;gap:3px;min-width:0;flex:1}.companion-chat-head strong{font-size:15px;color:var(--h-text)}.companion-chat-head span{font-size:8px;letter-spacing:.12em;color:var(--h-secondary)}
.companion-close{display:grid;place-items:center;width:32px;height:32px;border:1px solid var(--h-edge);border-radius:50%;background:var(--h-panel);color:var(--h-text);font-size:22px;line-height:1;cursor:pointer}
.companion-messages{display:flex;flex:1;flex-direction:column;gap:10px;min-height:118px;padding:14px;overflow:auto;overscroll-behavior:contain;scrollbar-color:var(--h-primary-deep) transparent}
.companion-message{max-width:91%;animation:companion-message-in .2s ease both}.companion-message p{margin:0;padding:10px 12px;border:1px solid var(--h-edge);border-radius:14px 14px 14px 4px;background:linear-gradient(140deg,var(--h-panel-raised),var(--h-panel));color:var(--h-text);font-size:13px;line-height:1.5;overflow-wrap:anywhere}
.companion-message.from-you{align-self:flex-end}.companion-message.from-you p{border-color:var(--h-edge-bright);border-radius:14px 14px 4px 14px;background:linear-gradient(125deg,var(--h-primary-deep),var(--h-primary));color:var(--h-button-text,#fff)}
.companion-actions{display:flex;flex-wrap:wrap;gap:5px;margin:7px 0 0}.companion-actions button,.companion-prompts button{border:1px solid var(--h-edge);border-radius:999px;padding:6px 9px;background:linear-gradient(120deg,var(--h-panel-raised),var(--h-panel));color:var(--h-secondary);font:600 10px var(--sans,'Nunito',sans-serif);cursor:pointer}.companion-actions button:hover,.companion-prompts button:hover{border-color:var(--h-edge-bright);box-shadow:0 0 12px var(--h-glow);color:var(--h-text)}
.companion-prompts{display:flex;gap:6px;padding:0 12px 10px;overflow-x:auto;scrollbar-width:none}.companion-prompts::-webkit-scrollbar{display:none}.companion-prompts button{flex:none;font-size:9px}
.companion-form{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--h-edge);background:#0002}.companion-form input{min-width:0;flex:1;padding:10px 12px;border:1px solid var(--h-edge);border-radius:999px;background:var(--h-bg)!important;color:var(--h-text)!important;font:500 12px var(--sans,'Nunito',sans-serif)}.companion-form input::placeholder{color:var(--h-muted)}.companion-form button{width:38px;height:38px;border:1px solid var(--h-edge-bright);border-radius:50%;background:linear-gradient(140deg,var(--h-primary-deep),var(--h-primary),var(--h-primary-bright));color:var(--h-button-text,#fff);font-size:19px;font-weight:800;cursor:pointer;box-shadow:0 0 14px var(--h-glow)}
.companion-note{margin:0;padding:0 14px 9px;text-align:center;color:var(--h-muted);font-size:9px;letter-spacing:.02em}
.companion-greeting{position:absolute;right:1px;bottom:94px;width:min(290px,calc(100vw - 30px));padding:11px 14px;border:1px solid var(--h-edge-bright);border-radius:16px 16px 4px 16px;background:radial-gradient(ellipse at 0% 0%,var(--h-reflection),transparent 55%),linear-gradient(125deg,var(--h-panel-raised),var(--h-bg-secondary));box-shadow:inset 0 1px 0 #fff3,0 9px 28px #0008,0 0 22px var(--h-glow);color:var(--h-text);font-size:13px;font-weight:700;line-height:1.4;pointer-events:none;animation:companion-message-in .3s ease both}
.companion-greeting[hidden]{display:none}
.sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@keyframes companion-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes companion-twinkle{from{opacity:.45;transform:scale(.82) rotate(-8deg)}to{opacity:1;transform:scale(1.12) rotate(8deg)}}@keyframes companion-message-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:520px){.companion-dock{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom))}.companion-toggle{width:68px;height:68px}.companion-avatar{width:58px;height:58px}.companion-chat{bottom:82px;max-height:min(490px,calc(100dvh - 110px))}}
@media(prefers-reduced-motion:reduce){.companion-toggle,.companion-spark,.companion-message,.companion-greeting{animation:none}.companion-toggle,.companion-toggle:hover{transform:none}.companion-chat{transition:none}}

/* Seok Woo flying-bot hover animation */
.companion-toggle {
  transform-origin: 50% 55%;
  animation: seokwoo-flight 6.8s ease-in-out infinite;
  will-change: transform;
}
.companion-toggle .companion-halo {
  animation: seokwoo-aura 3.4s ease-in-out infinite;
}
.companion-toggle .companion-spark-one {
  animation: seokwoo-orbit-one 4.8s ease-in-out infinite;
}
.companion-toggle .companion-spark-two {
  animation: seokwoo-orbit-two 5.6s ease-in-out infinite;
}
.companion-toggle:hover {
  animation-play-state: paused;
  transform: translateY(-5px) scale(1.04);
}
@keyframes seokwoo-flight {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
  16% { transform: translate3d(-9px, -13px, 0) rotate(-4deg); }
  34% { transform: translate3d(-16px, -5px, 0) rotate(-2deg); }
  52% { transform: translate3d(-7px, -19px, 0) rotate(3deg); }
  70% { transform: translate3d(5px, -10px, 0) rotate(4deg); }
  86% { transform: translate3d(3px, -3px, 0) rotate(1deg); }
}
@keyframes seokwoo-aura {
  0%, 100% { opacity: .52; transform: scale(.94); filter: blur(8px); }
  50% { opacity: .95; transform: scale(1.12); filter: blur(12px); }
}
@keyframes seokwoo-orbit-one {
  0%, 100% { transform: translate(0, 0) scale(.85) rotate(-8deg); }
  50% { transform: translate(5px, -8px) scale(1.2) rotate(18deg); }
}
@keyframes seokwoo-orbit-two {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-6px, 5px) scale(.8); }
}
@media (prefers-reduced-motion: reduce) {
  .companion-toggle, .companion-toggle .companion-halo,
  .companion-toggle .companion-spark-one, .companion-toggle .companion-spark-two {
    animation: none !important;
    transform: none !important;
  }
}
