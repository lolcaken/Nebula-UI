class QuickUIv2 {
  constructor(opts = {}) {
    this.title = opts.title || 'QuickUI Window';
    this.width = opts.width || 400;
    this.height = opts.height || 300;
    this.tabs = [];
    this.activeTab = 0;
    this.container = null;
    this._injectStyle();
    this._buildWindow();
  }

  _injectStyle() {
    const css = `
      .qv2-root{position:fixed;top:50px;left:50px;width:${this.width}px;height:${this.height}px;background:#0d1722;color:#e6eef8;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.7);font-family:Inter,Roboto,Arial,sans-serif;z-index:99999999;display:flex;flex-direction:column;}
      .qv2-header{background:#16334a;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;cursor:move;}
      .qv2-header .title{font-size:14px;font-weight:600;}
      .qv2-header .close-btn{background:transparent;border:none;color:#e6eef8;font-size:16px;cursor:pointer;}
      .qv2-tab-bar{display:flex;gap:8px;padding:8px;background:#0f2a3a;}
      .qv2-tab-bar .tab-btn{padding:6px 10px;background:linear-gradient(180deg,#2b6cb0,#1b3b5a);border-radius:6px;cursor:pointer;font-size:13px;color:#ddf0ff;}
      .qv2-tab-bar .tab-btn.active{background:linear-gradient(180deg,#4a8cdf,#2b6cb0);}
      .qv2-content{flex:1;padding:12px;overflow:auto;}
      .qv2-element{margin:6px 0;}
      .qv2-element label{font-size:13px; margin-right:6px;}
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  _buildWindow() {
    const root = document.createElement('div'); root.className = 'qv2-root';
    const header = document.createElement('div'); header.className = 'qv2-header';
    header.innerHTML = `<span class="title">${this.title}</span><button class="close-btn">✖</button>`;
    root.appendChild(header);

    const tabBar = document.createElement('div'); tabBar.className = 'qv2-tab-bar'; root.appendChild(tabBar);
    const content = document.createElement('div'); content.className = 'qv2-content'; root.appendChild(content);
    document.body.appendChild(root);
    this.container = { root, header, tabBar, content };

    header.querySelector('.close-btn').addEventListener('click',()=>root.remove());
    this._makeDraggable(header, root);
  }

  _makeDraggable(dragHandle, element){
    let isDragging=false,startX=0,startY=0,origX=0,origY=0;
    dragHandle.addEventListener('mousedown', e => {
      isDragging=true; origX=element.offsetLeft; origY=element.offsetTop; startX=e.clientX; startY=e.clientY; e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if(!isDragging) return;
      element.style.left=(origX+e.clientX-startX)+'px';
      element.style.top=(origY+e.clientY-startY)+'px';
    });
    document.addEventListener('mouseup',()=>isDragging=false);
  }

  addTab(name){
    const idx = this.tabs.length;
    const btn = document.createElement('div'); btn.className='tab-btn'; btn.textContent=name;
    this.container.tabBar.appendChild(btn);
    const pane = document.createElement('div'); pane.style.display='none';
    this.container.content.appendChild(pane);
    btn.addEventListener('click',()=>this._activateTab(idx));
    this.tabs.push({name,btn,pane});
    if(this.tabs.length===1)this._activateTab(0);

    return {
      addButton: (text,cb)=>{
        const el = document.createElement('button'); el.className='qv2-element'; el.textContent=text; el.onclick=cb; pane.appendChild(el); return el;
      },
      addToggle: (text,val,cb)=>{
        const wrapper=document.createElement('div'); wrapper.className='qv2-element';
        const input=document.createElement('input'); input.type='checkbox'; input.checked=val;
        const label=document.createElement('label'); label.textContent=text;
        wrapper.appendChild(label); wrapper.appendChild(input); input.addEventListener('change',()=>cb(input.checked));
        pane.appendChild(wrapper); return input;
      },
      addSlider: (text,min,max,def,cb)=>{
        const wrapper=document.createElement('div'); wrapper.className='qv2-element';
        const label=document.createElement('label'); label.textContent=text;
        const valSpan=document.createElement('span'); valSpan.textContent=def;
        const input=document.createElement('input'); input.type='range'; input.min=min; input.max=max; input.value=def;
        input.addEventListener('input',()=>{valSpan.textContent=input.value; cb(input.value)});
        wrapper.appendChild(label); wrapper.appendChild(input); wrapper.appendChild(valSpan); pane.appendChild(wrapper); return input;
      },
      addDropdown: (text,options,cb)=>{
        const wrapper=document.createElement('div'); wrapper.className='qv2-element';
        const label=document.createElement('label'); label.textContent=text;
        const select=document.createElement('select'); options.forEach(o=>{const opt=document.createElement('option'); opt.value=o; opt.textContent=o; select.appendChild(opt);});
        select.addEventListener('change',()=>cb(select.value));
        wrapper.appendChild(label); wrapper.appendChild(select); pane.appendChild(wrapper); return select;
      },
      addTextBox: (text,cb)=>{
        const wrapper=document.createElement('div'); wrapper.className='qv2-element';
        const label=document.createElement('label'); label.textContent=text;
        const input=document.createElement('input'); input.type='text'; input.addEventListener('input',()=>cb(input.value));
        wrapper.appendChild(label); wrapper.appendChild(input); pane.appendChild(wrapper); return input;
      },
      addColorPicker: (text,cb)=>{
        const wrapper=document.createElement('div'); wrapper.className='qv2-element';
        const label=document.createElement('label'); label.textContent=text;
        const input=document.createElement('input'); input.type='color'; input.addEventListener('input',()=>cb(input.value));
        wrapper.appendChild(label); wrapper.appendChild(input); pane.appendChild(wrapper); return input;
      },
      addParagraph: (text)=>{
        const p=document.createElement('p'); p.textContent=text; p.className='qv2-element'; pane.appendChild(p); return p;
      }
    };
  }

  _activateTab(idx){
    this.tabs.forEach((t,i)=>{t.btn.classList.toggle('active',i===idx); t.pane.style.display=(i===idx?'':'none')});
    this.activeTab=idx;
  }

  notify(msg,duration=3000){
    const n=document.createElement('div'); n.style=`position:fixed;bottom:20px;right:20px;background:#4a8cdf;color:#fff;padding:10px 14px;border-radius:8px;box-shadow:0 5px 15px rgba(0,0,0,0.5);opacity:0;transition:opacity .3s, transform .3s;transform:translateY(20px);z-index:99999999;`; n.textContent=msg; document.body.appendChild(n);
    setTimeout(()=>{n.style.opacity='1'; n.style.transform='translateY(0)';},20);
    setTimeout(()=>{n.style.opacity='0'; n.style.transform='translateY(20px)'; setTimeout(()=>n.remove(),300);},duration);
  }
}
