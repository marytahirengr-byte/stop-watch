
  // --- Build the tick marks around the dial ---
  const ticksGroup = document.getElementById('ticks');
  const CENTER = 160;
  for (let i = 0; i < 60; i++) {
    const angle = i * 6; // 60 ticks around the circle
    const isMajor = i % 5 === 0;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', CENTER);
    line.setAttribute('x2', CENTER);
    line.setAttribute('y1', 16);
    line.setAttribute('y2', isMajor ? 32 : 26);
    line.setAttribute('class', 'tick' + (isMajor ? ' major' : ''));
    line.setAttribute('transform', `rotate(${angle} ${CENTER} ${CENTER})`);
    ticksGroup.appendChild(line);
  }

  // --- State ---
  let running = false;
  let startTimestamp = 0;   // performance.now() when current run started
  let elapsed = 0;          // accumulated ms before the current run
  let rafId = null;
  let laps = [];             // total elapsed ms at each lap

  // --- Elements ---
  const timeEl = document.getElementById('time');
  const stateEl = document.getElementById('state');
  const startPauseBtn = document.getElementById('startPauseBtn');
  const lapResetBtn = document.getElementById('lapResetBtn');
  const lapsEl = document.getElementById('laps');
  const progressEl = document.querySelector('.progress');

  const CIRCUMFERENCE = 2 * Math.PI * 140; // ~879.6

  function format(ms) {
    const totalCs = Math.floor(ms / 10);
    const cs = totalCs % 100;
    const totalSec = Math.floor(totalCs / 100);
    const sec = totalSec % 60;
    const min = Math.floor(totalSec / 60);
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return { main: `${pad(min)}:${pad(sec)}`, cs: pad(cs) };
  }

  function render(ms) {
    const { main, cs } = format(ms);
    timeEl.innerHTML = `${main}<span class="cs">.${cs}</span>`;

    const fraction = (ms % 60000) / 60000;
    progressEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);
  }

  function tick() {
    const now = performance.now();
    const currentElapsed = elapsed + (now - startTimestamp);
    render(currentElapsed);
    rafId = requestAnimationFrame(tick);
  }

  function getElapsed() {
    return running ? elapsed + (performance.now() - startTimestamp) : elapsed;
  }

  function start() {
    running = true;
    startTimestamp = performance.now();
    rafId = requestAnimationFrame(tick);

    startPauseBtn.textContent = 'Pause';
    startPauseBtn.classList.add('running');
    stateEl.textContent = 'Running';
    stateEl.className = 'state running';

    lapResetBtn.disabled = false;
    lapResetBtn.textContent = 'Lap';
  }

  function pause() {
    running = false;
    elapsed = getElapsed();
    cancelAnimationFrame(rafId);
    render(elapsed);

    startPauseBtn.textContent = 'Resume';
    startPauseBtn.classList.remove('running');
    stateEl.textContent = 'Paused';
    stateEl.className = 'state paused';

    lapResetBtn.textContent = 'Reset';
  }

  function reset() {
    running = false;
    elapsed = 0;
    laps = [];
    cancelAnimationFrame(rafId);
    render(0);

    startPauseBtn.textContent = 'Start';
    startPauseBtn.classList.remove('running');
    stateEl.textContent = 'Ready';
    stateEl.className = 'state';

    lapResetBtn.disabled = true;
    lapResetBtn.textContent = 'Lap';
    lapsEl.innerHTML = '';
  }

  function recordLap() {
    const total = getElapsed();
    const previousTotal = laps.length ? laps[laps.length - 1] : 0;
    const split = total - previousTotal;
    laps.push(total);
    renderLaps();
  }

  function renderLaps() {
    // Find fastest / slowest splits (only meaningful with 2+ laps)
    const splits = laps.map((t, i) => (i === 0 ? t : t - laps[i - 1]));
    let fastestIdx = -1, slowestIdx = -1;
    if (splits.length > 1) {
      fastestIdx = splits.indexOf(Math.min(...splits));
      slowestIdx = splits.indexOf(Math.max(...splits));
    }

    lapsEl.innerHTML = '';
    for (let i = laps.length - 1; i >= 0; i--) {
      const split = format(splits[i]);
      const total = format(laps[i]);
      const li = document.createElement('li');

      let splitClass = 'lap-split';
      if (fastestIdx !== -1 && i === fastestIdx) splitClass += ' fastest';
      else if (slowestIdx !== -1 && i === slowestIdx) splitClass += ' slowest';

      li.innerHTML = `
        <span class="lap-num">Lap ${i + 1}</span>
        <span class="${splitClass}">${split.main}.${split.cs}</span>
        <span class="lap-total">${total.main}.${total.cs}</span>
      `;
      lapsEl.appendChild(li);
    }
  }

  // --- Controls ---
  startPauseBtn.addEventListener('click', () => {
    if (running) pause();
    else start();
  });

  lapResetBtn.addEventListener('click', () => {
    if (running) recordLap();
    else reset();
  });

  render(0);
