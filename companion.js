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
  const AI_ENDPOINT = 'https://seok-woo-ai.akksh-subbu.workers.dev/chat';
  const greetings = [
    'Hey! I’m Seok Woo (석우). Ready to work on your vocals?',
    'Welcome back! What are we practising today?',
    'Heyyy! Want to work on a song, technique, or a quick vocal exercise?',
    'Your studio is ready. What would you like help with today?'
  ];
  let greeted = false;
  let greetingInChat = false;
  let currentGreeting = '';
  let isOpen = false;
  let closeTimer = 0;
  let addressCount = 0;
  const conversation = [];

  function selectGreeting() {
    const key = 'vocal-studio-companion-last-greeting';
    let previous = -1;
    try { previous = Number(localStorage.getItem(key)); } catch (_) {}
    let index = Math.floor(Math.random() * greetings.length);
    if (greetings.length > 1 && Number.isInteger(previous) && previous >= 0 && index === previous) index = (index + 1 + Math.floor(Math.random() * (greetings.length - 1))) % greetings.length;
    try { localStorage.setItem(key, String(index)); } catch (_) {}
    return greetings[index];
  }

  function addMessage(text, from='buddy', actions=[]) {
    const row = document.createElement('div');
    row.className = 'companion-message ' + (from === 'you' ? 'from-you' : 'from-buddy');
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

  async function replyTo(raw) {
    const text = raw.trim();
    if (!text) return;
    addMessage(text, 'you');
    const matches = matchingDestinations(text);
    const wantsNavigation = /\b(open|go to|show|take me|navigate|bring me|switch to)\b/i.test(text);
    if (wantsNavigation && matches.length) {
      const destination = matches[0];
      addMessage('On it — opening ' + destination.label + '.');
      openDestination(destination.id);
      return;
    }
    if (!AI_ENDPOINT || AI_ENDPOINT.includes('YOUR-WORKER-NAME')) {
      addMessage('My AI connection is almost ready! The secure Cloudflare Worker needs to be deployed and its URL added to my settings.');
      return;
    }
    conversation.push({ role: 'user', content: text });
    const sendButton = form.querySelector('button[type="submit"]');
    if (sendButton) sendButton.disabled = true;
    input.disabled = true;
    try {
      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation.slice(-12) })
      });
      const data = await response.json();
      if (!response.ok || !data.reply) throw new Error(data.error || 'The AI service is unavailable.');
      conversation.push({ role: 'assistant', content: data.reply });
      if (conversation.length > 16) conversation.splice(0, conversation.length - 16);
      addMessage(data.reply, 'buddy');
    } catch (error) {
      conversation.pop();
      addMessage(error.message || 'I couldn’t connect just now. Please try again.');
    } finally {
      input.disabled = false;
      if (sendButton) sendButton.disabled = false;
      input.focus();
    }
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
