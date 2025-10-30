// NebulaUI Lib v0.1 — for normal js usage (not userscript)  
;(function(global){
  const STYLE_ID = 'nebula-ui‑style';
  if(document.getElementById(STYLE_ID)) return; // already loaded

  // --- inject styles ---
  const css = `
    .nebula-ui-root { position: fixed; top: 20px; left: 20px; z‑index: 999999; font‑family: Inter, Roboto, Arial, sans‑serif; color:#e6eef8; }
    .nebula‑ui-toggle { width: 40px; height: 40px; background: #0b1220; color: #cfe8ff; display: flex; align‑items: center; justify‑content: center; cursor: pointer; border‑radius: 8px; box‑shadow: 0 2px 10px rgba(0,0,0,0.5); }
    .nebula‑ui-window { width: 400px; min‑height: 250px; background: #07101a; border‑radius: 12px; box‑shadow: 0 10px 30px rgba(0,0,0,0.7); overflow: hidden; position: fixed; top: 80px; left: 20px; transform: scale(0); transition: transform .3s ease; }
    .nebula‑ui-window.active { transform: scale(1); }
    .nebula‑ui-header { background: #0e1a2a; padding: 10px 14px; display: flex; justify‑content: space‑between; align‑items: center; cursor: move; }
    .nebula‑ui-content { padding: 14px; overflow: auto; flex: 1; }
    .nebula‑ui-tab‑bar { display: flex; gap: 8px; margin‑bottom: 12px; }
    .nebula‑ui-tab { padding: 6px 12px; background: linear‑gradient(180deg, #16334a, #0f2a3a); border‑radius: 8px; cursor: pointer; font‑size: 13px; color: #ddf0ff; }
    .nebula‑ui-tab.active { background: linear‑gradient(180deg, #2b6cb0, #1b3b5a); }
    .nebula‑ui-btn { padding: 6px 10px; border‑radius: 8px; cursor: pointer; background: linear‑gradient(180deg, #16334a, #0f2a3a); font‑size: 13px; color: #ddf0ff; border: 1px solid rgba(255,255,255,0.03); }
    .nebula‑ui-notif { position: fixed; bottom: 20px; right: 20px; background: #2b6cb0; color: #ffffff; padding: 12px 18px; border‑radius: 10px; box‑shadow: 0 5px 15px rgba(0,0,0,0.5); opacity: 0; transform: translateY(20px); transition: all .3s ease; pointer‑events: none; }
    .nebula‑ui-notif.show { opacity: 1; transform: translateY(0); }
  `;
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // --- main class ---
  class NebulaUI {
    constructor(options = {}) {
      this.root = document.createElement('div');
      this.root.className = 'nebula-ui-root';
      document.body.appendChild(this.root);

      this.toggle = document.createElement('div');
      this.toggle.className = 'nebula-ui-toggle';
      this.toggle.textContent = options.toggleIcon || '🛠';
      this.root.appendChild(this.toggle);
      this.toggle.addEventListener('click', ()=> this._toggleWindow());

      this.window = document.createElement('div');
      this.window.className = 'nebula-ui-window';
      // header + content
      const header = document.createElement('div');
      header.className = 'nebula-ui-header';
      header.innerHTML = `<span class="nebula-ui-title">${ options.title || 'NebulaUI Window' }</span><button class="nebula-ui-btn close-btn">✖</button>`;
      this.window.appendChild(header);

      const content = document.createElement('div');
      content.className = 'nebula-ui-content';
      // inside content we will put tabs and content area
      this.content = content;
      this.window.appendChild(content);

      this.root.appendChild(this.window);

      // close button
      header.querySelector('.close-btn').addEventListener('click', ()=> this.hideWindow());

      // tabs container
      this.tabBar = document.createElement('div');
      this.tabBar.className = 'nebula-ui-tab‑bar';
      content.appendChild(this.tabBar);

      // container for tab contents
      this.tabContents = document.createElement('div');
      this.tabContents.className = 'nebula-ui-tab‑contents';
      content.appendChild(this.tabContents);

      this.tabs = [];
      this.activeTab = null;

      // notifications container
      this._notifContainer = document.createElement('div');
      this.root.appendChild(this._notifContainer);

      // start with hidden window
      this.hideWindow();
    }

    _toggleWindow(){
      if(this.window.classList.contains('active')) this.hideWindow();
      else this.showWindow();
    }

    showWindow(){
      this.window.classList.add('active');
    }
    hideWindow(){
      this.window.classList.remove('active');
    }

    addTab(name, contentEl){
      const tabIndex = this.tabs.length;
      const tabBtn = document.createElement('div');
      tabBtn.className = 'nebula-ui-tab';
      tabBtn.textContent = name;
      this.tabBar.appendChild(tabBtn);

      const tabContent = document.createElement('div');
      tabContent.className = 'nebula-ui‑tab‑content';
      tabContent.style.display = 'none';
      tabContent.appendChild(contentEl);
      this.tabContents.appendChild(tabContent);

      this.tabs.push({ name, tabBtn, tabContent });

      tabBtn.addEventListener('click', () => {
        this._activateTab(tabIndex);
      });

      // if first tab, activate it
      if(this.tabs.length === 1) {
        this._activateTab(0);
      }
    }

    _activateTab(index){
      this.tabs.forEach((t,i)=>{
        if(i === index){
          t.tabBtn.classList.add('active');
          t.tabContent.style.display = '';
        } else {
          t.tabBtn.classList.remove('active');
          t.tabContent.style.display = 'none';
        }
      });
      this.activeTab = index;
    }

    notify(message, duration = 3000) {
      const notif = document.createElement('div');
      notif.className = 'nebula‑ui-notif';
      notif.textContent = message;
      this.root.appendChild(notif);
      // show
      setTimeout(()=>notif.classList.add('show'), 20);
      // hide after duration
      setTimeout(()=>{
        notif.classList.remove('show');
        setTimeout(()=>notif.remove(), 300);
      }, duration);
    }

    // example UI elements you can add inside tabs:
    // addButton, addInput, addCheckbox, addSlider, addDropdown ...
    addButton(tabIndex, label, onClick) {
      const btn = document.createElement('button');
      btn.className = 'nebula-ui-btn';
      btn.textContent = label;
      btn.addEventListener('click', onClick);
      this.tabs[tabIndex].tabContent.appendChild(btn);
      return btn;
    }

    addInput(tabIndex, placeholder, onChange) {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.placeholder = placeholder;
      inp.style.margin = '6px 0';
      inp.style.padding = '6px';
      inp.style.borderRadius = '6px';
      inp.style.border = '1px solid rgba(255,255,255,0.2)';
      inp.style.width = '100%';
      this.tabs[tabIndex].tabContent.appendChild(inp);
      inp.addEventListener('input', (e)=> onChange(e.target.value));
      return inp;
    }

    addCheckbox(tabIndex, label, onChange) {
      const wrap = document.createElement('div');
      wrap.style.margin = '6px 0';
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      const lbl = document.createElement('label');
      lbl.textContent = label;
      lbl.style.marginLeft = '6px';
      wrap.appendChild(chk);
      wrap.appendChild(lbl);
      this.tabs[tabIndex].tabContent.appendChild(wrap);
      chk.addEventListener('change', (e)=> onChange(e.target.checked));
      return chk;
    }

    addDropdown(tabIndex, options, onChange) {
      const sel = document.createElement('select');
      sel.style.margin = '6px 0';
      sel.style.padding = '6px';
      sel.style.borderRadius = '6px';
      sel.style.border = '1px solid rgba(255,255,255,0.2)';
      options.forEach(opt=>{
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        sel.appendChild(o);
      });
      this.tabs[tabIndex].tabContent.appendChild(sel);
      sel.addEventListener('change', (e)=> onChange(e.target.value));
      return sel;
    }

    addSlider(tabIndex, min, max, initial, onChange) {
      const wrap = document.createElement('div');
      wrap.style.margin = '6px 0';
      const slide = document.createElement('input');
      slide.type = 'range';
      slide.min = min;
      slide.max = max;
      slide.value = initial;
      wrap.appendChild(slide);
      this.tabs[tabIndex].tabContent.appendChild(wrap);
      slide.addEventListener('input', (e)=> onChange(e.target.value));
      return slide;
    }

  }

  // expose to global
  global.NebulaUI = NebulaUI;

})(window);
