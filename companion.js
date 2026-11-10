(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const toggle = $('#companion-toggle');
  const chat = $('#companion-chat');
  const messages = $('#companion-messages');
  const form = $('#companion-form');
  const input = $('#companion-input');
  const prompts = $('#companion-prompts');
  const greetingBubble = $('#companion-greeting');
  if (!toggle || !chat || !messages || !form || !input || !greetingBubble) return;

  const destinations = [
    {id:'studio',label:'Practice studio',keys:['studio','practice studio','reference','compare','comparison','record a take']},
    {id:'singing',label:'Western Notes Visualiser',keys:['western','visualiser','visualizer','song playback','compare notes','note graph']},
    {id:'monitor',label:'Live Pitch Monitor',keys:['pitch monitor','live pitch','pitch tracker','monitor']},
    {id:'warmups',label:'Warm-up sessions',keys:['warm up','warm-up','warmup']},
    {id:'exercises',label:'Exercise library',keys:['exercise','practice exercise','siren','honey voice']},
    {id:'ear',label:'Ear training',keys:['ear training','interval','train my ear']},
    {id:'progress',label:'Progress & schedule',keys:['schedule','calendar','progress','artist goal','practice plan']},
    {id:'rewards',label:'Streaks & rewards',keys:['reward','scratch card','streak','star coin','badge']}
  ];
  const greetings = [
    'Heyyy babe! I’m Seok Woo — ready to give those vocals a little sparkle?',
    'Jaga! I’m Seok Woo. You’re back, and your practice space missed your voice.',
    'Hey babe, Seok Woo here! What are we working on today?',
    'Jaga, I’m Seok Woo! Warm up or jump into a song?',
    'Babe, it’s Seok Woo! Another little music moment? I’m cheering for you already.',
    'Jaga, Seok Woo’s here — let’s make a take that feels like you.',
    'Heyyy babe! I’m Seok Woo — what’s first on today’s setlist?',
    'Jaga!! I’m Seok Woo! The mic is all yours whenever you’re ready. ✨'
  ];
  let greeted = false;
  let greetingInChat = false;
  let currentGreeting = '';
  let isOpen = false;
  let closeTimer = 0;
  let addressCount = 0;

  function selectGreeting() {
    const key = 'vocal-studio-companion-last-greeting';
    let previous = -1;
    try { previous = Number(localStorage.getItem(key)); } catch (_) {}
    let index = Math.floor(Math.random() * greetings.length);
    if (greetings.length > 1 && Number.isInteger(previous) && previous >= 0 && index === previous) index = (index + 1 + Math.floor(Math.random() * (greetings.length - 1))) % greetings.length;
    try { localStorage.setItem(key, String(index)); } catch (_) {}
    return greetings[index];
  }

  function addMessage(text, from='buddy', actions=[], personalize=true) {
    if (from === 'buddy' && text !== currentGreeting && personalize) {
      const name = addressCount++ % 2 === 0 ? 'Babe' : 'Jaga';
      text = `${name}, ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    }
    const row = document.createElement('div');
    row.className = `companion-message ${from === 'you' ? 'from-you' : 'from-buddy'}`;
    const bubble = document.createElement('p');
    bubble.textContent = text;
    row.appendChild(bubble);
    if (actions.length) {
      const links = document.createElement('div');
      links.className = 'companion-actions';
      for (const item of actions) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = item.label;
        button.addEventListener('click', () => openDestination(item.id));
        links.appendChild(button);
      }
      row.appendChild(links);
    }
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function openDestination(id) {
    const nav = [...document.querySelectorAll('.nav-item[data-view]')].find(item => item.dataset.view === id);
    if (nav) nav.click();
    const destination = destinations.find(item => item.id === id);
    addMessage(destination ? `Here you go — ${destination.label} is open. What would you like to try?` : 'I couldn’t find that page. Try one of the navigation buttons.', 'buddy');
  }

  function matchingDestinations(text) {
    const normalized = text.toLowerCase();
    return destinations.filter(item => item.keys.some(key => normalized.includes(key)));
  }

  function replyTo(raw) {
    const text = raw.trim();
    const normalized = text.toLowerCase();
    if (!text) return;
    addMessage(text, 'you');

    if (/\b(?:i\s*)?(?:love|luv)\s+(?:you|ya|u)(?:\s+(?:so\s+much|lots|forever))?\b|\bily\b|\b(?:i\s+)?adore\s+you\b/.test(normalized)) {
      const lovingReplies = [
        'I love you too, Jaga!! ❤️',
        'Love you too, babe!! 💖',
        'Awww, Jaga! Sending you lots of love! ❤️',
        'I love you too! Now, shall we practise? ✨'
      ];
      const key = 'vocal-studio-seokwoo-love-reply';
      let previous = -1;
      try { const saved = localStorage.getItem(key); if (saved !== null) previous = Number(saved); } catch (_) {}
      let index = previous < 0 ? 0 : Math.floor(Math.random() * lovingReplies.length);
      if (lovingReplies.length > 1 && index === previous) index = (index + 1) % lovingReplies.length;
      try { localStorage.setItem(key, String(index)); } catch (_) {}
      addMessage(lovingReplies[index], 'buddy', [], false);
      return;
    }

    const matches = matchingDestinations(normalized);
    const wantsNavigation = /\b(open|go to|show|take me|navigate|bring me|switch to)\b/.test(normalized);
    if (wantsNavigation && matches.length) {
      const destination = matches[0];
      addMessage(`On it — opening ${destination.label}.`, 'buddy');
      openDestination(destination.id);
      return;
    }

    if (/\b(hi|hello|hey|good morning|good evening)\b/.test(normalized)) {
      addMessage('Aha, hello! I can help with pitch practice, recordings, exercises, and your progress. What are we warming up first?', 'buddy', destinations.slice(1,4));
      return;
    }
    if (/\b(microphone|mic|permission|allow access)\b/.test(normalized)) {
      addMessage('For live pitch tracking, open Live Pitch Monitor or the Western Notes Visualiser and tap Start monitoring. Allow microphone access when your browser asks. Your pitch is analyzed right here in this browser; if the mic option is missing, open the app on localhost or a secure connection.', 'buddy', [{id:'monitor',label:'Open Live Pitch Monitor'},{id:'singing',label:'Open Western Visualiser'}]);
      return;
    }
    if (/\b(pitch|note|cents|frequency|monitor|visuali[sz]er)\b/.test(normalized)) {
      addMessage('Ooh, pitch time! Live Pitch Monitor follows your voice on a scrolling note grid and shows note, frequency, cents, and stability. Western Notes Visualiser has live singing, song playback, and compare modes. Tap Start monitoring to use your mic.', 'buddy', [{id:'monitor',label:'Live Pitch Monitor'},{id:'singing',label:'Western Notes Visualiser'}]);
      return;
    }
    if (/\b(song|reference|compare|recording|record|take|playback)\b/.test(normalized)) {
      addMessage('In Practice Studio, load a reference song and record or upload your take, then choose Analyze both performances. You’ll get pitch alignment and moments to try again. The monitor pages can record audio and its pitch contour together, too — tiny home-studio magic.', 'buddy', [{id:'studio',label:'Open Practice Studio'},{id:'singing',label:'Open song visualiser'}]);
      return;
    }
    if (/\b(ear|interval|hearing|listen)\b/.test(normalized)) {
      addMessage('Ear Training plays two notes and asks you to name their interval. Hum along softly if it helps, then choose an answer. No timer, no pressure — just your ears doing their little detective thing.', 'buddy', [{id:'ear',label:'Open Ear Training'}]);
      return;
    }
    if (/\b(warm.?up|warmup|voice strain|strained|tired voice)\b/.test(normalized)) {
      addMessage('There are three 30-minute warm-up sessions with gentle exercises. Keep notes comfy, take breaks, and stop if your voice feels strained. Want a shorter session? The Exercise Library has bite-size practices.', 'buddy', [{id:'warmups',label:'Choose a warm-up'},{id:'exercises',label:'Browse exercises'}]);
      return;
    }
    if (/\b(exercise|siren|honey|range|practice)\b/.test(normalized)) {
      addMessage('The Exercise Library has short practices for range, control, and style, plus a mic check on supported exercises. Pick something comfy for today and mark it complete when you finish. Small wins count!', 'buddy', [{id:'exercises',label:'Open Exercise Library'},{id:'warmups',label:'See warm-up sessions'}]);
      return;
    }
    if (/\b(streak|reward|scratch|coin|badge)\b/.test(normalized)) {
      addMessage('Your streak counts qualifying practice once per local calendar day. Scratch cards and milestone keepsakes come from practicing, and your streak and collection stay saved in this browser. Look at you, collecting progress!', 'buddy', [{id:'rewards',label:'See streaks & rewards'}]);
      return;
    }
    if (/\b(schedule|calendar|goal|progress|analytics)\b/.test(normalized)) {
      addMessage('Progress & Schedule shows your practice history and achievements. Add an artist goal, pick practice days that fit real life, then save your plan on this device.', 'buddy', [{id:'progress',label:'Open Progress & Schedule'}]);
      return;
    }
    if (/\b(encourage|motivat|nervous|scared|can i|i can.t|i cannot|bad singer|not good)\b/.test(normalized)) {
      addMessage('You don’t need a perfect take to make progress. Try one small phrase, notice one thing you like, and let yourself repeat it gently. Showing up is already part of the work — I’m your tiny hype crew. ✨', 'buddy', [{id:'exercises',label:'Pick a gentle exercise'},{id:'ear',label:'Try a listening round'}]);
      return;
    }
    if (/\b(help|what can you do|features|where is|how do i)\b/.test(normalized)) {
      addMessage('I can point you to a feature and explain how to get started. Choose a destination below, or ask me about pitch monitoring, song comparison, ear training, exercises, warm-ups, your schedule, or rewards.', 'buddy', destinations.map(({id,label}) => ({id,label})));
      return;
    }
    addMessage('I’m best at helping you find and use Vocal Studio features. Ask about pitch monitoring, song comparison, ear training, warm-ups, exercises, your schedule, or streak rewards — and I’ll point you there.', 'buddy', destinations.slice(1));
  }

  function setOpen(open) {
    clearTimeout(closeTimer);
    isOpen = open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close chat with Seok Woo' : 'Open chat with Seok Woo');
    if (open) {
      chat.hidden = false;
      requestAnimationFrame(() => chat.classList.add('is-open'));
      greetingBubble.hidden = true;
      if (!greetingInChat && currentGreeting) {
        addMessage(currentGreeting, 'buddy');
        greetingInChat = true;
        greeted = true;
      }
      input.focus();
    } else {
      chat.classList.remove('is-open');
      closeTimer = window.setTimeout(() => { if (!isOpen) chat.hidden = true; }, 190);
    }
  }

  toggle.addEventListener('click', () => setOpen(!isOpen));
  $('#companion-close').addEventListener('click', () => setOpen(false));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value;
    input.value = '';
    replyTo(text);
  });
  prompts.addEventListener('click', event => {
    const button = event.target.closest('[data-prompt]');
    if (!button) return;
    replyTo(button.dataset.prompt);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen) setOpen(false);
  });

  function greetAfterSplash() {
    if (greeted) return;
    currentGreeting = selectGreeting();
    greetingBubble.textContent = currentGreeting;
    greetingBubble.hidden = false;
    greeted = true;
  }

  const splash = $('#launch-splash');
  if (splash && !splash.hidden) {
    const splashObserver = new MutationObserver(() => {
      if (splash.hidden) {
        splashObserver.disconnect();
        greetAfterSplash();
      }
    });
    splashObserver.observe(splash, {attributes:true, attributeFilter:['hidden']});
  } else {
    greetAfterSplash();
  }
})();
