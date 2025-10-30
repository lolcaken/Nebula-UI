class NebulaUI {
    constructor() {
        this.window = undefined;
        this.document = undefined;
        this.iFrame = undefined;
        this.pages = [{ name: 'default_no_content_set', content: '<p>No content added</p>' }];
        this.settings = {
            window: { title: 'NebulaUI', width: 400, height: 300, centered: true, external: false },
            gui: { centeredItems: false, darkCloseButton: false }
        };
    }

    addPage(name, html) {
        if (this.pages[0].name === 'default_no_content_set') this.pages = [];
        this.pages.push({ name, content: html });
    }

    async open(callback) {
        if (this.settings.window.external) await this.#openExternal(callback);
        else await this.#openInternal(callback);
    }

    async #openExternal(callback) {
        if (!this.window || this.window.closed) {
            let pos = '';
            if (this.settings.window.centered) {
                const x = (screen.width - this.settings.window.width)/2;
                const y = (screen.height - this.settings.window.height)/2;
                pos = `left=${x},top=${y}`;
            }
            this.window = window.open('', this.settings.window.title, `width=${this.settings.window.width},height=${this.settings.window.height},${pos}`);
            if (!this.window) return alert('Popups blocked');
            this.window.document.write(await this.#createDocument());
            this.window.document.close();
            this.document = this.window.document;
            this.#initTabs();
            if (callback) callback();
        } else this.window.focus();
    }

    async #openInternal(callback) {
        if (this.iFrame) return;
        const iframe = document.createElement('iframe');
        iframe.srcdoc = await this.#createDocument();
        iframe.style = `position:fixed;top:50px;left:50px;width:${this.settings.window.width}px;height:${this.settings.window.height}px;border:0;z-index:2147483647;`; 
        document.body.prepend(iframe);
        iframe.onload = () => {
            this.window = iframe.contentWindow;
            this.document = iframe.contentDocument;
            this.iFrame = iframe;
            this.#initInternalEvents(iframe);
            this.#initTabs();
            if (callback) callback();
        };
    }

    async #createDocument() {
        const tabs = this.pages.length > 1 ? `<ul>${this.pages.map(p=>`<li>${p.name}</li>`).join('')}</ul>` : '';
        const content = this.pages.map(p=>`<div>${p.content}</div>`).join('');
        return `<html><head><style>body{margin:0;font-family:sans-serif;}button{cursor:pointer;} #header{cursor:move;background:#2196f3;color:#fff;padding:5px;} #close-btn{float:right;}</style></head><body><div id='header'>${this.settings.window.title}<button id='close-btn'>X</button></div>${tabs}${content}</body></html>`;
    }

    #initTabs() {
        // minimal tab switching for multiple pages
        if (this.pages.length <= 1) return;
        const buttons = [...this.document.querySelectorAll('ul li')];
        const contents = [...this.document.querySelectorAll('div > div')];
        buttons.forEach((btn,i)=>{
            btn.addEventListener('click',()=>{
                contents.forEach(c=>c.style.display='none');
                contents[i].style.display='block';
            });
        });
        contents.forEach((c,i)=>c.style.display=i===0?'block':'none');
    }

    #initInternalEvents(iframe) {
        const header = this.document.querySelector('#header');
        const closeBtn = this.document.querySelector('#close-btn');
        let dragging = false, offsetX=0, offsetY=0;
        header.addEventListener('mousedown', e => { dragging = true; offsetX = e.clientX - iframe.offsetLeft; offsetY = e.clientY - iframe.offsetTop; });
        document.addEventListener('mouseup', ()=>dragging=false);
        document.addEventListener('mousemove', e => { if(dragging){ iframe.style.left = `${e.clientX-offsetX}px`; iframe.style.top = `${e.clientY-offsetY}px`; } });
        closeBtn.addEventListener('click', ()=>{ iframe.remove(); this.iFrame=undefined; });
    }
}
