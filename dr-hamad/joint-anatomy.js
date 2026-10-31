/* Lazy, browser-local 3D joint explorer. No patient data or remote requests. */
(() => {
  'use strict';
  const root = document.querySelector('[data-anatomy-root]');
  if (!root) return;
  const $ = key => root.querySelector(`[data-anatomy-${key}]`);
  const action = name => root.querySelector(`[data-anatomy-action="${name}"]`);
  const viewport = $('viewport'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let THREE, content, buildJoint, disposeJoint, renderer, camera, scene, controls, model;
  let current = 'knee', selected = null, isolated = false, quiz = null;
  let ready = false, visible = false, loadPromise = null, frame = 0, dirty = true, software = false;
  let resizeObserver, markers = new Map(), leaders = new Map(), pointerStart = null;

  function schedule() {
    dirty = true;
    if (ready && visible && !document.hidden && !frame) frame = requestAnimationFrame(draw);
  }
  function draw() {
    frame = 0;
    if (!ready || !visible || document.hidden) return;
    const changed = controls.update();
    if (dirty || changed || controls.autoRotate) {
      renderer.render(scene, camera);
      positionMarkers(); dirty = false;
    }
    if (changed || controls.autoRotate) schedule();
  }
  function positionMarkers() {
    const occupied = [];
    const offsets = current === 'knee'
      ? { patella: [50, -40], cartilage: [70, 28], meniscus: [-65, 18], ligaments: [-55, -50] }
      : { socket: [50, -40], head: [-55, -20], cartilage: [55, 35], capsule: [-65, 45] };
    for (const [id, element] of markers) {
      const group = model.parts.get(id);
      const point = group.localToWorld(group.userData.anchor.clone()).project(camera);
      element.hidden = !group.visible || point.z < -1 || point.z > 1 || Math.abs(point.x) > 1 || Math.abs(point.y) > 1;
      const x = (point.x + 1) * viewport.clientWidth / 2, y = (1 - point.y) * viewport.clientHeight / 2;
      const [dx, dy] = offsets[id] || [0, 0];
      let labelX = THREE.MathUtils.clamp(x + dx, 22, viewport.clientWidth - 22);
      let labelY = THREE.MathUtils.clamp(y + dy, 35, viewport.clientHeight - 45);
      if (!element.hidden) {
        for (const [shiftX, shiftY] of [[0, 0], [0, -44], [0, 44], [44, 0], [-44, 0], [44, -44], [-44, 44], [0, -88], [0, 88]]) {
          const nextX = THREE.MathUtils.clamp(labelX + shiftX, 22, viewport.clientWidth - 22);
          const nextY = THREE.MathUtils.clamp(labelY + shiftY, 35, viewport.clientHeight - 45);
          if (occupied.every(([px, py]) => Math.hypot(nextX - px, nextY - py) >= 41)) { labelX = nextX; labelY = nextY; break; }
        }
        occupied.push([labelX, labelY]);
      }
      element.style.transform = `translate(${labelX}px,${labelY}px) translate(-50%,-50%)`;
      const line = leaders.get(id); line.hidden = element.hidden;
      line.style.width = `${Math.hypot(labelX - x, labelY - y)}px`;
      line.style.transform = `translate(${x}px,${y}px) rotate(${Math.atan2(labelY - y, labelX - x)}rad)`;
    }
  }
  function resize() {
    if (!ready || !viewport.clientWidth || !viewport.clientHeight) return;
    renderer.setSize(viewport.clientWidth, viewport.clientHeight, false);
    camera.aspect = viewport.clientWidth / viewport.clientHeight;
    camera.updateProjectionMatrix(); schedule();
  }
  function resetCamera() {
    const distance = viewport.clientWidth < 500 ? 1.15 : 1;
    camera.position.set((current === 'knee' ? 5.5 : -5.8) * distance, 2.5 * distance, 8.3 * distance);
    controls.target.set(current === 'knee' ? 0 : .25, .15, 0);
    controls.autoRotate = false;
    action('rotate').setAttribute('aria-pressed', 'false');
    controls.update(); schedule();
  }
  function showFallback() {
    ready = false; cancelAnimationFrame(frame); frame = 0;
    resizeObserver?.disconnect(); controls?.dispose();
    renderer?.dispose?.(); renderer?.domElement.remove();
    if (model) disposeJoint?.(model.root);
    model = null; renderer = null; loadPromise = null;
    $('markers').replaceChildren(); markers.clear(); leaders.clear();
    $('loading').hidden = true; $('fallback').hidden = false;
    root.dataset.state = 'fallback';
  }
  async function boot() {
    if (ready) return true;
    if (loadPromise) return loadPromise;
    $('fallback').hidden = true; $('loading').hidden = false;
    root.dataset.state = 'loading';
    loadPromise = (async () => {
      try {
        const [three, models, orbit] = await Promise.all([
          import('./vendor/three/three.module.min.js'),
          import('./joint-anatomy-models.js'),
          import('./vendor/three/OrbitControls.js'),
        ]);
        THREE = three; content = models.anatomy; buildJoint = models.buildJoint; disposeJoint = models.disposeJoint;
        // Keep real 3D interaction on devices without an available WebGL context.
        const probe = document.createElement('canvas');
        const context = probe.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'low-power' });
        software = !context;
        if (context) renderer = new THREE.WebGLRenderer({ canvas: probe, context, antialias: true, alpha: true });
        else { const { SVGRenderer } = await import('./vendor/three/SVGRenderer.js'); renderer = new SVGRenderer(); renderer.setQuality('high'); }
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
        renderer.setClearColor(0xf6f9f9, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
        if (renderer.shadowMap) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
        const canvas = renderer.domElement;
        canvas.tabIndex = 0; canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'نموذج مفصل ثلاثي الأبعاد. استخدم الأسهم للتدوير، وزرّي الجمع والطرح للتكبير والتصغير، أو اختر الأجزاء من القائمة.');
        canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); showFallback(); });
        viewport.prepend(canvas);
        scene = new THREE.Scene();
        if (software) scene.add(new THREE.AmbientLight(0xffffff, .35));
        camera = new THREE.PerspectiveCamera(39, 1, .1, 80);
        if (!software) scene.add(new THREE.HemisphereLight(0xffffff, 0x7b939e, 2.5));
        const key = new THREE.DirectionalLight(0xfff7e9, software ? .65 : 3.7);
        key.position.set(-4, 7, 7); key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024); key.shadow.normalBias = .045;
        Object.assign(key.shadow.camera, { left: -5, right: 5, top: 6, bottom: -6, far: 25 });
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xd0edf1, software ? .25 : 2); fill.position.set(5, 1, -3); scene.add(fill);
        if (!software) {
          const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.ShadowMaterial({ opacity: .12 }));
          floor.rotation.x = -Math.PI / 2; floor.position.y = -3.45; floor.receiveShadow = true; scene.add(floor);
        }
        controls = new orbit.OrbitControls(camera, canvas);
        controls.enableDamping = true; controls.dampingFactor = .09; controls.enablePan = false;
        controls.minDistance = 6.5; controls.maxDistance = 17; controls.autoRotateSpeed = .7;
        controls.minPolarAngle = .2; controls.maxPolarAngle = Math.PI - .2;
        controls.addEventListener('change', schedule);
        canvas.addEventListener('pointerdown', event => { if (event.isPrimary) pointerStart = [event.clientX, event.clientY]; });
        canvas.addEventListener('pointerup', event => {
          if (!ready || !event.isPrimary || !pointerStart || Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 6) return;
          pointerStart = null;
          const rect = canvas.getBoundingClientRect(), ray = new THREE.Raycaster();
          ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
          const hit = ray.intersectObjects([...model.parts.values()].filter(group => group.visible), true).find(item => item.object.userData.part);
          if (hit) selectPart(hit.object.userData.part);
        });
        canvas.addEventListener('keydown', event => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return;
          event.preventDefault();
          if (event.key === 'Home') { resetCamera(); return; }
          if (['+', '=', '-'].includes(event.key)) { zoom(event.key === '-' ? 1.12 : .88); return; }
          const offset = camera.position.clone().sub(controls.target), spherical = new THREE.Spherical().setFromVector3(offset);
          spherical.theta += event.key === 'ArrowLeft' ? .12 : event.key === 'ArrowRight' ? -.12 : 0;
          spherical.phi = THREE.MathUtils.clamp(spherical.phi + (event.key === 'ArrowUp' ? -.12 : event.key === 'ArrowDown' ? .12 : 0), .2, Math.PI - .2);
          camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); controls.update(); schedule();
        });
        ready = true; switchJoint(current);
        resizeObserver = new ResizeObserver(resize); resizeObserver.observe(viewport); resize();
        root.dataset.state = 'ready'; $('loading').hidden = true; schedule(); return true;
      } catch (error) {
        console.warn('Joint explorer unavailable:', error.message); showFallback(); return false;
      }
    })();
    return loadPromise;
  }
  function switchJoint(id) {
    if (!content[id]) return;
    endQuiz(); current = id; selected = null; isolated = false;
    if (model) { scene.remove(model.root); disposeJoint(model.root); }
    model = buildJoint(id, { simplified: software }); scene.add(model.root);
    const data = content[id];
    $('name').textContent = data.name; $('latin').textContent = data.latin;
    $('intro').textContent = data.intro; $('source').href = data.source;
    $('specimen').textContent = id === 'knee' ? '01 / KNEE' : '02 / HIP';
    root.querySelectorAll('[data-anatomy-joint]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.anatomyJoint === id)));
    $('parts').replaceChildren(); $('markers').replaceChildren(); markers.clear(); leaders.clear();
    data.parts.forEach(([key, name], index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'anatomy-part';
      button.dataset.anatomyPart = key; button.setAttribute('aria-pressed', 'false');
      const number = document.createElement('span'); number.textContent = String(index + 1);
      const label = document.createElement('span'); label.textContent = name;
      button.append(number, label); button.addEventListener('click', () => selectPart(key)); $('parts').append(button);
      const marker = document.createElement('button'); marker.type = 'button'; marker.className = 'anatomy-marker';
      marker.textContent = String(index + 1); marker.setAttribute('aria-label', name); marker.title = name;
      marker.setAttribute('aria-pressed', 'false'); marker.addEventListener('click', () => selectPart(key));
      const line = document.createElement('span'); line.className = 'anatomy-leader'; line.setAttribute('aria-hidden', 'true');
      $('markers').append(line, marker); markers.set(key, marker); leaders.set(key, line);
    });
    resetSettings(); resetCamera(); describe(null);
    renderer.domElement.setAttribute('aria-label', `نموذج ${data.name} ثلاثي الأبعاد. اسحب أو استخدم الأسهم للتدوير، أو اختر جزءًا من القائمة.`);
  }
  function describe(id) {
    const entry = content[current].parts.find(part => part[0] === id);
    $('term').textContent = entry?.[2] || 'EXPLORE THE JOINT';
    $('part-title').textContent = entry?.[1] || 'كل جزء له دور.';
    $('part-detail').textContent = entry?.[3] || 'اضغط اسم الجزء أو رقمه على النموذج لقراءة وصفه.';
  }
  function selectPart(id) {
    if (!ready) return;
    if (quiz) { answerQuiz(id); return; }
    selected = selected === id ? null : id;
    if (selected) {
      const kind = content[current].parts.find(entry => entry[0] === selected)[4];
      root.querySelector(`[data-anatomy-layer="${kind}"]`).checked = true;
    } else isolated = false;
    describe(selected); updateSelection(); updateVisibility();
  }
  function updateSelection() {
    root.querySelectorAll('[data-anatomy-part]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.anatomyPart === selected)));
    for (const [id, element] of markers) element.setAttribute('aria-pressed', String(id === selected));
    action('isolate').disabled = !selected || Boolean(quiz); action('isolate').setAttribute('aria-pressed', String(isolated));
    action('isolate').textContent = isolated ? 'كل الأجزاء' : 'عزل الجزء';
    for (const [id, group] of model.parts) group.traverse(item => {
      if (item.material) { item.material.emissive.setHex(id === selected ? 0x0d535c : 0x000000); item.material.emissiveIntensity = .16; }
    });
    schedule();
  }
  function updateVisibility() {
    if (!model) return;
    for (const [id, , , , kind] of content[current].parts) {
      const shown = root.querySelector(`[data-anatomy-layer="${kind}"]`).checked;
      model.parts.get(id).visible = shown && (!isolated || selected === id);
      root.querySelector(`[data-anatomy-part="${id}"]`).classList.toggle('is-hidden', !shown);
    }
    schedule();
  }
  function separate() {
    if (!ready) return;
    const amount = Number($('separation').value) / 100;
    for (const group of model.parts.values()) group.position.copy(group.userData.explode).multiplyScalar(amount);
    root.querySelector('#anatomy-separation-value').textContent = `${Math.round(amount * 100)}%`; schedule();
  }
  function resetSettings() {
    isolated = false; selected = null;
    root.querySelectorAll('[data-anatomy-layer]').forEach(input => { input.checked = true; input.disabled = false; });
    $('separation').value = '0'; $('separation').disabled = false;
    separate(); updateSelection(); updateVisibility();
  }
  function zoom(factor) {
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
    camera.position.copy(controls.target).add(offset); controls.update(); schedule();
  }
  function startQuiz() {
    resetSettings(); resetCamera();
    const entries = content[current].parts.slice();
    for (let i = entries.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [entries[i], entries[j]] = [entries[j], entries[i]]; }
    quiz = { entries: entries.slice(0, 4), index: 0, score: 0, answered: false };
    $('quiz').hidden = false; $('parts').hidden = true; root.querySelector('.anatomy-description').hidden = true;
    root.querySelectorAll('[data-anatomy-layer]').forEach(input => { input.disabled = true; });
    $('separation').disabled = true; action('rotate').disabled = true; action('isolate').disabled = true;
    action('quiz').setAttribute('aria-pressed', 'true'); action('quiz').textContent = 'إنهاء الاختبار';
    content[current].parts.forEach(([id], index) => { const marker = markers.get(id); marker.title = `النقطة ${index + 1}`; marker.setAttribute('aria-label', marker.title); });
    showQuestion();
  }
  function showQuestion() {
    quiz.answered = false;
    for (const element of markers.values()) element.classList.remove('is-answer');
    $('quiz-progress').textContent = `السؤال ${quiz.index + 1} من ${quiz.entries.length}`;
    $('question').textContent = `أين ${quiz.entries[quiz.index][1]}؟`;
    $('feedback').textContent = 'اضغط رقم الجزء الصحيح على النموذج.'; action('next').hidden = true;
    schedule();
  }
  function answerQuiz(id) {
    if (quiz.answered || quiz.index >= quiz.entries.length) return;
    const expected = quiz.entries[quiz.index], correct = expected[0] === id;
    quiz.answered = true; if (correct) quiz.score++;
    markers.get(expected[0]).classList.add('is-answer');
    const number = content[current].parts.findIndex(entry => entry[0] === expected[0]) + 1;
    $('feedback').textContent = `${correct ? 'إجابة صحيحة.' : 'ليست هذه الإجابة.'} الجزء رقم ${number} المعلّم بالأخضر: ${expected[1]}. ${expected[3]}`;
    action('next').hidden = false;
    action('next').textContent = quiz.index === quiz.entries.length - 1 ? 'عرض النتيجة ←' : 'السؤال التالي ←'; schedule();
  }
  function nextQuestion() {
    if (!quiz || !quiz.answered) return;
    if (quiz.index >= quiz.entries.length) { startQuiz(); return; }
    quiz.index++;
    if (quiz.index < quiz.entries.length) { showQuestion(); return; }
    $('quiz-progress').textContent = 'انتهى الاختبار'; $('question').textContent = `${quiz.score} من ${quiz.entries.length} إجابات صحيحة`;
    $('feedback').textContent = 'يمكنك العودة للاستكشاف أو بدء جولة جديدة.'; action('next').textContent = 'جولة جديدة ↻';
  }
  function endQuiz() {
    quiz = null; $('quiz').hidden = true; $('parts').hidden = false;
    root.querySelector('.anatomy-description').hidden = false;
    action('quiz').setAttribute('aria-pressed', 'false'); action('quiz').textContent = 'اختبر فهمك ↗';
    action('rotate').disabled = false;
    root.querySelectorAll('[data-anatomy-layer]').forEach(input => { input.disabled = false; });
    $('separation').disabled = false;
    if (content) content[current].parts.forEach(([id, name]) => {
      const marker = markers.get(id); if (!marker) return;
      marker.title = name; marker.setAttribute('aria-label', name); marker.classList.remove('is-answer');
    });
    if (model) updateSelection();
  }

  root.addEventListener('click', async event => {
    const jointButton = event.target.closest('[data-anatomy-joint]'), button = event.target.closest('[data-anatomy-action]');
    if (!jointButton && !button) return;
    if (!(await boot())) return;
    if (jointButton) { switchJoint(jointButton.dataset.anatomyJoint); return; }
    const name = button.dataset.anatomyAction;
    if (name === 'retry') return;
    if (name === 'rotate') { controls.autoRotate = !controls.autoRotate; button.setAttribute('aria-pressed', String(controls.autoRotate)); schedule(); }
    if (name === 'isolate' && selected) { isolated = !isolated; updateSelection(); updateVisibility(); }
    if (name === 'reset') { endQuiz(); resetSettings(); resetCamera(); describe(null); }
    if (name === 'zoom-in') zoom(.88);
    if (name === 'zoom-out') zoom(1.12);
    if (name === 'quiz') { if (quiz) endQuiz(); else startQuiz(); }
    if (name === 'next') nextQuestion();
  });
  root.addEventListener('change', event => {
    if (!event.target.matches('[data-anatomy-layer]')) return;
    if (!ready) return;
    if (selected && !root.querySelector(`[data-anatomy-layer="${content[current].parts.find(entry => entry[0] === selected)[4]}"]`).checked) {
      selected = null; isolated = false; describe(null); updateSelection();
    }
    updateVisibility();
  });
  $('separation').addEventListener('input', separate);
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) { void boot().then(schedule); } else { cancelAnimationFrame(frame); frame = 0; }
  }, { rootMargin: '120px' });
  observer.observe(viewport);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else schedule(); });
  reduced.addEventListener('change', () => { if (controls) { controls.autoRotate = false; action('rotate').setAttribute('aria-pressed', 'false'); schedule(); } });
  window.addEventListener('pageshow', schedule);
})();
