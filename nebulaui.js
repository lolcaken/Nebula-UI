/*
* DevToolsUI.js
* v1.0.0
* https://github.com/yourusername/DevToolsUI
* Apache 2.0 licensed
*/

class DevToolsUI {
    constructor() {
        const grantArr = GM_info?.script?.grant;
    
        if(typeof grantArr == "object") {
            if(!grantArr.includes("GM_xmlhttpRequest")) {
                prompt(`${this.#projectName} needs GM_xmlhttpRequest!\n\nPlease add this to your userscript's header...`, "// @grant       GM_xmlhttpRequest");
            }

            if(!grantArr.includes("GM_getValue")) {
                prompt(`${this.#projectName} needs GM_getValue!\n\nPlease add this to your userscript's header...`, "// @grant       GM_getValue");
            }

            if(!grantArr.includes("GM_setValue")) {
                prompt(`${this.#projectName} needs GM_setValue!\n\nPlease add this to your userscript's header...`, "// @grant       GM_setValue");
            }
        }
        
        this.#initializeState();
        this.#injectCSS();
        this.#createUI();
        this.#setupEventListeners();
        this.#scanExistingScripts();
    }
    
    #projectName = "DevToolsUI";
    #sidebar = null;
    #modal = null;
    #toggle = null;
    #editor = null;
    #mutationObserver = null;
    
    #initializeState() {
        this.state = {
            scripts: [], // {id, node, src, inline, content, size, async, defer, category, score, status}
            categories: ['analytics','ads','fingerprinting','cdn','inline','unknown'],
            blocked: new Set(this.#GM.get('blocked_scripts', [])),
            prefs: Object.assign({
                showInline: true,
                autoFetch: true,
                maxScriptSizeKB: 2048
            }, this.#GM.get('prefs', {})),
            editorInstances: {},
            currentScriptId: null,
            pages: [
                {
                    "name": "Scripts",
                    "content": this.#createScriptsPage()
                }
            ]
        };
        
        // Pattern-based categorizer
        this.patterns = [
            { cat: 'analytics', re: /google-analytics|googletagmanager|gtag|analytics|mixpanel|heap|segment|matomo|amplitude/i, score: 10 },
            { cat: 'ads', re: /ads|doubleclick|adservice|adroll|googlesyndication|adsbygoogle/i, score: 10 },
            { cat: 'fingerprinting', re: /fingerprint|fingerprintjs|devicepixelratio|canvas|webrtc/i, score: 8 },
            { cat: 'cdn', re: /cdn\./i, score: 3 },
            { cat: 'inline', re: /.*/, score: 0 } // fallback
        ];
    }
    
    #GM = {
        get: (k, def = null) => {
            try { return GM_getValue(k, def); }
            catch (e) { console.error('GM.get error', e); return def; }
        },
        set: (k, v) => {
            try { return GM_setValue(k, v); }
            catch (e) { console.error('GM.set error', e); }
        },
        xhr: (details) => {
            try { return GM_xmlhttpRequest(details); }
            catch (e) { console.error('GM.xhr error', e); if (details.onerror) details.onerror(e); }
        },
        notify: (text, title='DevToolsUI') => {
            try { GM_notification({title, text}); }
            catch (e) { console.log(title + ': ' + text); }
        }
    };
    
    #injectCSS() {
        // Load CodeMirror CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/codemirror@5.65.13/lib/codemirror.css';
        document.head.appendChild(link);
        
        // Inject custom CSS
        GM_addStyle(`
            /* Main UI */
            #devtoolsui_sidebar {
                position: fixed;
                top: 40px;
                left: 0;
                width: 340px;
                max-width: 60%;
                height: calc(100% - 80px);
                background: #0f1720;
                color: #e6eef8;
                box-shadow: 2px 2px 14px rgba(0,0,0,0.6);
                border-right: 1px solid rgba(255,255,255,0.04);
                z-index: 999999999;
                font-family: Inter, Roboto, Arial, sans-serif;
                display: flex;
                flex-direction: column;
                transition: transform .18s ease;
            }
            #devtoolsui_sidebar.collapsed { transform: translateX(-300px); width: 48px; }
            #devtoolsui_sidebar .header {
                display:flex; align-items:center; gap:8px; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,0.03);
            }
            #devtoolsui_toggle {
                position: fixed;
                top: 48px;
                left: 0;
                width: 48px;
                height: 48px;
                background: linear-gradient(180deg,#0b1220,#0e1a2a);
                color: #cfe8ff;
                border-radius: 0 8px 8px 0;
                z-index:999999999;
                display:flex;align-items:center;justify-content:center;
                cursor:pointer; box-shadow:2px 2px 10px rgba(0,0,0,0.6);
            }
            #devtoolsui_search {flex:1; background:transparent; border:1px solid rgba(255,255,255,0.03); color:inherit; padding:6px 8px; border-radius:6px;}
            #devtoolsui_list {overflow:auto; padding:8px; flex:1;}
            .script-entry { padding:8px; margin:6px 0; background:linear-gradient(180deg, rgba(255,255,255,0.01), transparent); border-radius:8px; cursor:pointer; display:flex; gap:8px; align-items:flex-start; }
            .script-entry .meta {font-size:12px; opacity:0.9}
            .badge { padding:2px 6px; border-radius:6px; font-size:11px; margin-left:6px;}
            .badge.cat-analytics{background:#2b6cb0;color:#fff}
            .badge.cat-ads{background:#b83232;color:#fff}
            .badge.cat-fingerprint{background:#b36b00;color:#fff}
            .script-entry .title {font-weight:600; font-size:13px; color:#e8f4ff}
            #devtoolsui_footer {padding:8px; border-top:1px solid rgba(255,255,255,0.02); font-size:12px; opacity:0.9; display:flex; gap:8px; align-items:center}
            /* Modal editor */
            #devtoolsui_modal {
                position: fixed;
                left: 50%;
                top: 50%;
                transform: translate(-50%,-50%);
                width: 960px;
                max-width: calc(100% - 48px);
                height: 640px;
                max-height: calc(100% - 48px);
                background: linear-gradient(180deg,#07101a,#0d1722);
                color: #e9f3ff;
                border-radius:12px;
                box-shadow:0 10px 40px rgba(0,0,0,0.7);
                z-index: 1000000000;
                display:none;
                flex-direction:column;
                resize: both;
                overflow: hidden;
                border:1px solid rgba(255,255,255,0.04);
            }
            #devtoolsui_modal .modal-header {display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid rgba(255,255,255,0.03)}
            #devtoolsui_editor {flex:1; display:flex; gap:8px; padding:10px; min-height:200px}
            #devtoolsui_sidebar .cat-header{font-weight:700; margin-top:8px; color:#bfe3ff}
            .controls {display:flex; gap:8px; align-items:center}
            .btn { background: linear-gradient(180deg,#16334a,#0f2a3a); color:#ddf0ff; padding:6px 10px; border-radius:8px; cursor:pointer; border:1px solid rgba(255,255,255,0.03); font-size:13px }
            .btn.ghost { background:transparent; border:1px dashed rgba(255,255,255,0.04) }
            .small { font-size:12px; padding:4px 8px; border-radius:6px }
            .status-blocked { color:#ffb4b4; }
            .status-ok { color:#bffcc6; }
            .category-pill{ padding:3px 6px; border-radius:6px; font-size:11px; margin-right:6px; }
            .muted { opacity:0.8; font-size:12px }
            code { font-family: source-code-pro, Menlo, Monaco, monospace; font-size:12px; }
            /* responsive tweaks */
            @media (max-width: 800px) {
                #devtoolsui_sidebar { width: 280px }
                #devtoolsui_modal { width: calc(100% - 18px); height: calc(100% - 18px) }
            }
            /* Tab navigation */
            .tab-nav {
                display: flex;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                padding: 0 8px;
            }
            .tab-nav-item {
                padding: 8px 12px;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            .tab-nav-item.active {
                opacity: 1;
                border-bottom: 2px solid #2b6cb0;
            }
            .tab-content {
                display: none;
                flex: 1;
                overflow: auto;
                padding: 8px;
            }
            .tab-content.active {
                display: block;
            }
        `);
    }
    
    #createUI() {
        // Create sidebar
        this.#sidebar = document.createElement('div');
        this.#sidebar.id = 'devtoolsui_sidebar';
        
        // Create toggle button
        this.#toggle = document.createElement('div');
        this.#toggle.id = 'devtoolsui_toggle';
        this.#toggle.title = 'Open DevToolsUI';
        this.#toggle.innerHTML = '🛠';
        
        // Create modal
        this.#modal = document.createElement('div');
        this.#modal.id = 'devtoolsui_modal';
        
        // Add to document
        document.body.appendChild(this.#sidebar);
        document.body.appendChild(this.#toggle);
        document.body.appendChild(this.#modal);
        
        // Build sidebar content
        this.#buildSidebar();
        
        // Build modal content
        this.#buildModal();
    }
    
    #buildSidebar() {
        this.#sidebar.innerHTML = '';
        
        // Header
        const header = document.createElement('div');
        header.className = 'header';
        header.innerHTML = `<strong>DevToolsUI</strong> <span class="muted">Live Editor</span>`;
        
        // Search
        const search = document.createElement('input');
        search.id = 'devtoolsui_search';
        search.placeholder = 'search scripts or patterns...';
        header.appendChild(search);
        
        this.#sidebar.appendChild(header);
        
        // Tab navigation
        const tabNav = document.createElement('div');
        tabNav.className = 'tab-nav';
        
        this.state.pages.forEach((page, index) => {
            const tabItem = document.createElement('div');
            tabItem.className = `tab-nav-item ${index === 0 ? 'active' : ''}`;
            tabItem.textContent = page.name;
            tabItem.dataset.index = index;
            tabNav.appendChild(tabItem);
        });
        
        this.#sidebar.appendChild(tabNav);
        
        // Tab content container
        const tabContentContainer = document.createElement('div');
        tabContentContainer.id = 'devtoolsui_tab_container';
        
        this.state.pages.forEach((page, index) => {
            const tabContent = document.createElement('div');
            tabContent.className = `tab-content ${index === 0 ? 'active' : ''}`;
            tabContent.dataset.index = index;
            tabContent.innerHTML = page.content;
            tabContentContainer.appendChild(tabContent);
        });
        
        this.#sidebar.appendChild(tabContentContainer);
        
        // Footer
        const footer = document.createElement('div');
        footer.id = 'devtoolsui_footer';
        footer.innerHTML = `<div class="muted">Scripts: <span id="devtoolsui_count">0</span></div>`;
        
        const btnScan = document.createElement('button');
        btnScan.className = 'btn small';
        btnScan.textContent = 'Rescan';
        btnScan.onclick = () => { 
            this.#scanExistingScripts(); 
            this.#GM.notify('Rescanned scripts'); 
        };
        footer.appendChild(btnScan);
        
        const btnPrefs = document.createElement('button');
        btnPrefs.className = 'btn ghost small';
        btnPrefs.textContent = 'Prefs';
        btnPrefs.onclick = () => { this.#openPrefs(); };
        footer.appendChild(btnPrefs);
        
        this.#sidebar.appendChild(footer);
    }
    
    #buildModal() {
        this.#modal.innerHTML = `
            <div class="modal-header">
                <div style="flex:1"><strong id="devtoolsui_modal_title">Editor</strong></div>
                <div class="controls">
                    <button id="btn_beautify" class="btn small">Beautify</button>
                    <button id="btn_minify" class="btn small">Minify</button>
                    <button id="btn_diff" class="btn ghost small">Diff</button>
                    <button id="btn_inject" class="btn small">Inject</button>
                    <button id="btn_export" class="btn ghost small">Export</button>
                    <button id="btn_close" class="btn small">Close</button>
                </div>
            </div>
            <div id="devtoolsui_editor">
                <div style="flex:1;display:flex;flex-direction:column">
                    <div style="flex:1; border-radius:8px; overflow:hidden" id="editor_container"></div>
                    <div style="padding-top:8px; display:flex; gap:8px; align-items:center">
                        <label class="muted">Go to line:</label><input id="goto_line" class="small" style="width:80px"/>
                        <button id="btn_goto" class="btn small">Go</button>
                        <label class="muted" style="margin-left:12px">Search:</label><input id="editor_search" class="small" style="width:180px"/>
                        <button id="btn_find" class="btn small ghost">Find</button>
                    </div>
                </div>
                <div style="width:360px; max-width:45%; display:flex;flex-direction:column">
                    <div style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.03)">
                        <div id="script_meta" class="muted"></div>
                        <div id="script_stats" class="muted"></div>
                    </div>
                    <div style="padding:8px; overflow:auto; flex:1" id="function_outline"></div>
                </div>
            </div>
        `;
    }
    
    #setupEventListeners() {
        // Toggle sidebar
        this.#toggle.onclick = () => this.#sidebar.classList.toggle('collapsed');
        
        // Tab navigation
        this.#sidebar.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-nav-item')) {
                const index = parseInt(e.target.dataset.index);
                
                // Update active tab
                document.querySelectorAll('.tab-nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Update active content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.querySelector(`.tab-content[data-index="${index}"]`).classList.add('active');
            }
        });
        
        // Search functionality
        const searchInput = document.getElementById('devtoolsui_search');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.#renderScriptList(searchInput.value.trim()));
        }
        
        // Sidebar hover behavior
        this.#sidebar.addEventListener('mouseenter', () => this.#sidebar.classList.remove('collapsed'));
        this.#sidebar.addEventListener('mouseleave', () => { 
            if (!this.#sidebar.classList.contains('pinned')) 
                this.#sidebar.classList.add('collapsed'); 
        });
        
        // Modal button listeners
        document.getElementById('btn_close').onclick = () => this.#closeModal();
        
        // Setup mutation observer for dynamic script detection
        this.#mutationObserver = new MutationObserver(mutations => {
            for (const m of mutations) {
                for (const n of Array.from(m.addedNodes || [])) {
                    if (n.tagName && n.tagName.toLowerCase() === 'script') {
                        // if blocked, prevent execution by changing type
                        if (n.src && this.state.blocked.has(n.src)) {
                            try { 
                                n.type = 'javascript/blocked'; 
                                n.setAttribute('data-devtoolsui-blocked','true'); 
                            } catch(e){}
                        }
                        this.#registerScriptNode(n);
                    }
                }
            }
        });
        
        this.#mutationObserver.observe(document.documentElement || document.body, { 
            childList: true, 
            subtree: true 
        });
        
        // Listen for page->userscript messages
        window.addEventListener('message', e => {
            const d = e.data || {};
            if (d && d.__devtoolsui_bridge) {
                // handle messages: show notifications or keep log
                if (d.type === 'network') {
                    console.debug('DevToolsUI Network:', d);
                } else if (d.type === 'console' || d.type === undefined) {
                    console.debug('DevToolsUI Console:', d);
                }
            }
        });
    }
    
    #createScriptsPage() {
        return `
            <div id="devtoolsui_list"></div>
        `;
    }
    
    #scanExistingScripts() {
        const tags = Array.from(document.querySelectorAll('script'));
        tags.forEach(node => this.#registerScriptNode(node));
    }
    
    #registerScriptNode(node) {
        // Avoid duplicates
        if (this.state.scripts.some(s => s.node === node)) return;
        
        const isInline = !node.src;
        const src = node.src || null;
        const async = !!node.async;
        const defer = !!node.defer;
        const idv = this.#id();
        
        const meta = {
            id: idv,
            node,
            src,
            inline: isInline,
            content: isInline ? (node.textContent || '') : null,
            size: isInline ? (node.textContent || '').length : undefined,
            async, defer,
            attrs: { type: node.type || null, dataset: {...node.dataset } },
            addedAt: Date.now(),
            status: 'loaded'
        };
        
        // categorize
        const analysis = this.#analyzeScriptMeta(src || '', meta.content || '', meta.attrs);
        meta.category = analysis.category;
        meta.score = analysis.score;
        
        if (meta.src && this.state.blocked.has(meta.src)) meta.status = 'blocked';
        
        this.state.scripts.push(meta);
        this.#renderScriptList();
    }
    
    #analyzeScriptMeta(src, content, attributes) {
        let scoreMap = {};
        let totalScore = 0;
        
        this.patterns.forEach(p => {
            try {
                if (p.re.test(src || '') || p.re.test(content || '') || 
                    (attributes && p.re.test(JSON.stringify(attributes)))) {
                    scoreMap[p.cat] = (scoreMap[p.cat] || 0) + p.score;
                    totalScore += p.score;
                }
            } catch(e) {}
        });
        
        // choose highest scoring category
        let cat = 'unknown';
        let max = 0;
        
        for (const k in scoreMap) {
            if (scoreMap[k] > max) { 
                max = scoreMap[k]; 
                cat = k; 
            }
        }
        
        const finalScore = totalScore;
        return { category: cat, score: finalScore };
    }
    
    #renderScriptList(filter = '') {
        const listEl = document.getElementById('devtoolsui_list');
        if (!listEl) return;
        
        listEl.innerHTML = '';
        
        // categorize grouped lists
        const groups = {};
        for (const s of this.state.scripts) {
            const cat = s.category || 'unknown';
            groups[cat] = groups[cat] || [];
            groups[cat].push(s);
        }
        
        let total = 0;
        Object.keys(groups).sort().forEach(cat => {
            const header = document.createElement('div');
            header.className = 'cat-header';
            header.textContent = cat.toUpperCase();
            listEl.appendChild(header);
            
            groups[cat].forEach(s => {
                if (filter) {
                    const txt = (s.src || '') + ' ' + (s.content || '').slice(0,200);
                    if (!txt.toLowerCase().includes(filter.toLowerCase())) return;
                }
                
                total++;
                const ent = document.createElement('div');
                ent.className = 'script-entry';
                ent.dataset.id = s.id;
                
                const left = document.createElement('div');
                left.innerHTML = `<div class="title">${this.#escapeHtml(s.src ? s.src : '(inline script)')}</div>
                    <div class="meta">${this.#escapeHtml(s.inline ? 'inline' : s.src)} • ${this.#formatBytes(s.size || (s.src ? 0 : (s.content || '').length))} • ${s.async ? 'async' : ''} ${s.defer ? 'defer' : ''}</div>`;
                
                const right = document.createElement('div');
                right.innerHTML = `<div class="meta">${s.status === 'blocked' ? '<span class="status-blocked">blocked</span>' : '<span class="status-ok">loaded</span>'}</div>`;
                
                // category badge
                const badge = document.createElement('span');
                badge.className = `badge cat-${cat}`;
                badge.textContent = cat;
                left.querySelector('.title').appendChild(badge);
                
                // action buttons
                const actions = document.createElement('div');
                actions.style = 'margin-top:6px;display:flex;gap:6px';
                
                const btnOpen = document.createElement('button');
                btnOpen.className = 'btn small';
                btnOpen.textContent = 'Open';
                btnOpen.onclick = (e) => { 
                    e.stopPropagation(); 
                    this.#openEditorForScript(s.id); 
                };
                actions.appendChild(btnOpen);
                
                const btnBlock = document.createElement('button');
                btnBlock.className = 'btn small';
                btnBlock.textContent = this.state.blocked.has(s.src) ? 'Unblock' : 'Block';
                btnBlock.onclick = (e) => { 
                    e.stopPropagation(); 
                    this.#toggleBlockScript(s); 
                };
                actions.appendChild(btnBlock);
                
                const btnFetch = document.createElement('button');
                btnFetch.className = 'btn small ghost';
                btnFetch.textContent = 'Fetch';
                btnFetch.onclick = (e) => { 
                    e.stopPropagation(); 
                    this.#fetchScriptSource(s); 
                };
                actions.appendChild(btnFetch);
                
                left.appendChild(actions);
                ent.appendChild(left);
                ent.appendChild(right);
                ent.onclick = () => this.#openEditorForScript(s.id);
                listEl.appendChild(ent);
            });
        });
        
        document.getElementById('devtoolsui_count').textContent = total;
    }
    
    #toggleBlockScript(scriptMeta) {
        if (!scriptMeta) return;
        
        const src = scriptMeta.src;
        if (!src) {
            this.#GM.notify('Only external scripts (with src) can be persisted as blocked.');
            return;
        }
        
        if (this.state.blocked.has(src)) {
            this.state.blocked.delete(src);
            
            // attempt to re-enable any blocked nodes on page
            document.querySelectorAll(`script[data-devtoolsui-blocked][src="${src}"]`).forEach(n => {
                try {
                    n.type = n.getAttribute('data-original-type') || 'text/javascript';
                    n.removeAttribute('data-devtoolsui-blocked');
                } catch(e) {}
            });
            
            this.#GM.notify('Unblocked: ' + src);
        } else {
            this.state.blocked.add(src);
            
            // find nodes and prevent execution
            document.querySelectorAll(`script[src="${src}"]`).forEach(n => {
                try { 
                    n.setAttribute('data-original-type', n.type || 'text/javascript'); 
                    n.type = 'javascript/blocked'; 
                    n.setAttribute('data-devtoolsui-blocked','true'); 
                } catch(e) {}
            });
            
            this.#GM.notify('Blocked: ' + src);
        }
        
        this.#saveBlocked();
        this.#renderScriptList();
    }
    
    #saveBlocked() {
        this.#GM.set('blocked_scripts', Array.from(this.state.blocked));
    }
    
    #fetchScriptSource(scriptMeta, opts = {}) {
        if (!scriptMeta) return;
        
        if (scriptMeta.inline) {
            this.#openEditorWithContent(scriptMeta, scriptMeta.content || '');
            return;
        }
        
        const url = scriptMeta.src;
        if (!url) return this.#GM.notify('No src to fetch.');
        
        // try fetch first (may be blocked)
        return fetch(url, { credentials: 'include' }).then(r => {
            if (!r.ok) throw new Error('Fetch failed: ' + r.status);
            return r.text().then(text => {
                scriptMeta.content = text;
                scriptMeta.size = text.length;
                this.#openEditorWithContent(scriptMeta, text);
            });
        }).catch(err => {
            // fallback to GM_xmlhttpRequest (cross-origin allowed if @connect present)
            console.warn('Fetch failed for', url, err, 'Falling back to GM_xhr');
            
            this.#GM.xhr({
                method: "GET",
                url,
                onload: res => {
                    try {
                        const text = res.responseText;
                        scriptMeta.content = text;
                        scriptMeta.size = text.length;
                        this.#openEditorWithContent(scriptMeta, text);
                    } catch (e) { 
                        this.#GM.notify('Failed to read response: ' + e.message); 
                    }
                },
                onerror: e => this.#GM.notify('GM.xhr fetch failed: ' + e.message)
            });
        });
    }
    
    #openModal(title) {
        this.#modal.style.display = 'flex';
        document.getElementById('devtoolsui_modal_title').textContent = title || 'Editor';
    }
    
    #closeModal() {
        this.#modal.style.display = 'none';
        this.state.currentScriptId = null;
    }
    
    #initEditorIfNeeded() {
        if (this.#editor) return this.#editor;
        
        const editorContainer = document.getElementById('editor_container');
        editorContainer.innerHTML = '<textarea id="cm_area"></textarea>';
        
        this.#editor = CodeMirror.fromTextArea(document.getElementById('cm_area'), {
            mode: 'javascript',
            theme: 'default',
            lineNumbers: true,
            lineWrapping: false,
            autofocus: true,
            indentUnit: 2,
            tabSize: 2
        });
        
        // simple search
        document.getElementById('btn_find').onclick = () => {
            const q = document.getElementById('editor_search').value.trim();
            if (!q) return;
            
            const cursor = this.#editor.getSearchCursor(q, null, { caseFold: true, multiline: true });
            if (cursor.findNext()) this.#editor.setSelection(cursor.from(), cursor.to());
            else this.#GM.notify('Not found');
        };
        
        document.getElementById('btn_goto').onclick = () => {
            const l = parseInt(document.getElementById('goto_line').value);
            if (!isNaN(l) && l > 0) this.#editor.setCursor(l-1, 0);
        };
        
        return this.#editor;
    }
    
    #openEditorWithContent(scriptMeta, content) {
        this.state.currentScriptId = scriptMeta.id;
        this.#openModal(scriptMeta.src || '(inline script)');
        
        const editor = this.#initEditorIfNeeded();
        editor.setValue(content || '');
        
        // populate meta
        document.getElementById('script_meta').innerHTML = 
            `<div><strong>Source:</strong> ${this.#escapeHtml(scriptMeta.src || '(inline)')}</div>
            <div><strong>Category:</strong> <span class="category-pill">${this.#escapeHtml(scriptMeta.category || 'unknown')}</span> <strong>Score:</strong> ${scriptMeta.score || 0}</div>`;
        
        document.getElementById('script_stats').innerHTML = 
            `<div>Size: ${this.#formatBytes(scriptMeta.size)}</div>
            <div>Attributes: ${this.#escapeHtml(JSON.stringify(scriptMeta.attrs || {}))}</div>`;
        
        // outline functions
        this.#buildFunctionOutline(scriptMeta, content);
        
        // hook buttons
        document.getElementById('btn_beautify').onclick = () => {
            try {
                const beaut = js_beautify(editor.getValue(), { indent_size: 2 });
                editor.setValue(beaut);
                this.#GM.notify('Beautified');
            } catch (e) { 
                this.#GM.notify('Beautify failed: ' + e.message); 
            }
        };
        
        document.getElementById('btn_minify').onclick = async () => {
            try {
                const r = await Terser.minify(editor.getValue(), { compress: true, mangle: true });
                if (r.error) throw r.error;
                editor.setValue(r.code);
                this.#GM.notify('Minified');
            } catch (e) { 
                this.#GM.notify('Minify failed: ' + e.message); 
            }
        };
        
        document.getElementById('btn_diff').onclick = () => {
            const original = scriptMeta.content || '';
            const modified = editor.getValue();
            this.#openDiffViewer(original, modified);
        };
        
        document.getElementById('btn_inject').onclick = () => {
            const modified = editor.getValue();
            this.#injectModifiedScript(scriptMeta, modified);
        };
        
        document.getElementById('btn_export').onclick = () => {
            const blob = new Blob([editor.getValue()], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (scriptMeta.src ? scriptMeta.src.split('/').pop() : 'script.js');
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            this.#GM.notify('Exported file');
        };
    }
    
    #buildFunctionOutline(scriptMeta, content) {
        const outlineEl = document.getElementById('function_outline');
        outlineEl.innerHTML = '';
        
        try {
            const ast = esprima.parseScript(content || '', { range: true, tolerant: true });
            const items = [];
            
            function walk(node) {
                if (!node) return;
                
                if (node.type === 'FunctionDeclaration' && node.id) {
                    items.push({ name: node.id.name, pos: node.range[0] });
                } else if (node.type === 'VariableDeclaration') {
                    for (const d of node.declarations || []) {
                        if (d.init && (d.init.type === 'FunctionExpression' || d.init.type === 'ArrowFunctionExpression')) {
                            items.push({ name: d.id.name, pos: d.range[0] });
                        }
                    }
                }
                
                for (const k in node) {
                    if (node[k] && typeof node[k] === 'object' && k !== 'parent') {
                        const c = node[k];
                        if (Array.isArray(c)) c.forEach(walk); 
                        else walk(c);
                    }
                }
            }
            
            walk(ast);
            
            if (!items.length) {
                outlineEl.innerHTML = '<div class="muted">No functions found</div>';
            } else {
                items.slice(0,200).forEach(it => {
                    const el = document.createElement('div');
                    el.style = 'padding:6px; border-radius:6px; cursor:pointer';
                    el.textContent = this.#escapeHtml(it.name);
                    
                    el.onclick = () => {
                        const editor = this.#initEditorIfNeeded();
                        if (!editor) return;
                        
                        // move cursor approximate using position -> convert to line
                        const pos = it.pos || 0;
                        const doc = editor.getDoc();
                        const loc = editor.posFromIndex ? editor.posFromIndex(pos) : {line:0,ch:0};
                        if (loc) editor.setCursor(loc);
                    };
                    
                    outlineEl.appendChild(el);
                });
            }
        } catch (e) {
            outlineEl.innerHTML = '<div class="muted">Outline unavailable: parse error</div>';
        }
    }
    
    #openDiffViewer(original, modified) {
        const dmodal = document.createElement('div');
        dmodal.style = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:80%;height:70%;background:#071018;color:#eaf6ff;border-radius:10px;padding:12px;z-index:1000000001;overflow:auto';
        
        const header = document.createElement('div');
        header.style = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px';
        header.innerHTML = `<strong>Diff viewer</strong>`;
        
        const close = document.createElement('button');
        close.className = 'btn small';
        close.textContent = 'Close';
        close.onclick = () => dmodal.remove();
        
        header.appendChild(close);
        dmodal.appendChild(header);
        
        // compute diff line-by-line
        const diff = Diff.createPatch('script.js', original, modified, '', '');
        const pre = document.createElement('pre');
        pre.style = 'white-space:pre-wrap;font-size:12px;line-height:1.3;padding:8px;background:#021018;border-radius:8px;overflow:auto;max-height:85%';
        pre.textContent = this.#escapeHtml(diff);
        
        dmodal.appendChild(pre);
        document.body.appendChild(dmodal);
    }
    
    #injectModifiedScript(scriptMeta, code) {
        try {
            if (!scriptMeta) return;
            
            const isExternal = !!scriptMeta.src;
            
            // Create blob URL
            const blob = new Blob([code], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            
            if (isExternal) {
                // Replace existing node with new tag referencing blob
                const node = scriptMeta.node;
                const newScript = document.createElement('script');
                newScript.src = blobUrl;
                newScript.async = !!scriptMeta.async;
                newScript.defer = !!scriptMeta.defer;
                newScript.setAttribute('data-devtoolsui-injected', 'true');
                
                // insert after old node, then remove old
                node.parentNode.insertBefore(newScript, node.nextSibling);
                
                // optionally remove/disable old
                try { 
                    node.type = 'javascript/blocked'; 
                    node.setAttribute('data-devtoolsui-replaced','true'); 
                } catch(e) {}
                
                this.#GM.notify('Injected modified script (external).');
            } else {
                // For inline: replace content of original node
                const node = scriptMeta.node;
                const newNode = document.createElement('script');
                newNode.textContent = code;
                newNode.setAttribute('data-devtoolsui-injected','true');
                node.parentNode.replaceChild(newNode, node);
                this.#GM.notify('Injected modified inline script.');
            }
            
            // update stored content and size
            scriptMeta.content = code;
            scriptMeta.size = code.length;
            this.#renderScriptList();
            this.#closeModal();
        } catch (e) {
            this.#GM.notify('Injection failed: ' + e.message);
        }
    }
    
    #openEditorForScript(sid) {
        const scriptMeta = this.state.scripts.find(s => s.id === sid);
        if (!scriptMeta) return;
        
        if ((scriptMeta.content && scriptMeta.content.length > 0) || scriptMeta.inline) {
            this.#openEditorWithContent(scriptMeta, scriptMeta.content || scriptMeta.node.textContent || '');
            return;
        }
        
        // attempt fetch if it's external
        this.#fetchScriptSource(scriptMeta);
    }
    
    #openPrefs() {
        const pmodal = document.createElement('div');
        pmodal.style = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:420px;background:#071018;color:#eaf6ff;border-radius:10px;padding:12px;z-index:1000000001';
        
        pmodal.innerHTML = `
            <div style="display:flex;justify-content:space-between">
                <strong>Preferences</strong>
                <button id="p_close" class="btn small">Close</button>
            </div>
            <div style="padding-top:8px">
                <label>
                    <input type="checkbox" id="p_showInline"> 
                    Show inline scripts in list
                </label><br/>
                <label>
                    <input type="checkbox" id="p_autoFetch"> 
                    Auto fetch remote scripts when opening editor
                </label><br/>
                <label>
                    Max script size (KB): 
                    <input id="p_maxsize" class="small" style="width:80px"/>
                </label><br/>
                <div style="margin-top:8px">
                    <button id="p_save" class="btn small">Save</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(pmodal);
        
        document.getElementById('p_showInline').checked = this.state.prefs.showInline;
        document.getElementById('p_autoFetch').checked = this.state.prefs.autoFetch;
        document.getElementById('p_maxsize').value = this.state.prefs.maxScriptSizeKB;
        
        document.getElementById('p_save').onclick = () => {
            this.state.prefs.showInline = document.getElementById('p_showInline').checked;
            this.state.prefs.autoFetch = document.getElementById('p_autoFetch').checked;
            this.state.prefs.maxScriptSizeKB = parseInt(document.getElementById('p_maxsize').value) || 2048;
            
            this.#savePrefs();
            this.#GM.notify('Preferences saved');
            pmodal.remove();
        };
        
        document.getElementById('p_close').onclick = () => pmodal.remove();
    }
    
    #savePrefs() {
        this.#GM.set('prefs', this.state.prefs);
    }
    
    #injectRuntimeMonitor() {
        // We must inject into page context (not userscript sandbox) to observe page script console outputs and fetch/XHR.
        const code = `
            (function(){
                if (window.__devtoolsui_monkeypatched) return; 
                window.__devtoolsui_monkeypatched = true;
                
                const origConsole = window.console;
                
                function send(msg, level='log') {
                    window.postMessage({ __devtoolsui_bridge: true, level, payload: msg }, '*');
                }
                
                ['log','warn','error','info','debug'].forEach(k => {
                    const orig = origConsole[k].bind(origConsole);
                    console[k] = function(...args) { 
                        try { 
                            send({type:'console', method:k, args: args}); 
                        } catch(e){}; 
                        orig(...args); 
                    };
                });
                
                // patch fetch
                const origFetch = window.fetch;
                window.fetch = function(input, init) {
                    try {
                        const url = (typeof input === 'string') ? input : (input && input.url) || '';
                        window.postMessage({ 
                            __devtoolsui_bridge: true, 
                            type:'network', 
                            method:'fetch', 
                            url, 
                            init 
                        }, '*');
                    } catch(e){}
                    return origFetch.apply(this, arguments);
                };
                
                // patch XHR
                const origX = window.XMLHttpRequest;
                
                function XHRWrapper() {
                    const xhr = new origX();
                    xhr.addEventListener('load', function() { 
                        try { 
                            window.postMessage({ 
                                __devtoolsui_bridge: true, 
                                type:'network', 
                                method:'xhr', 
                                url: xhr.responseURL, 
                                status: xhr.status 
                            }, '*'); 
                        } catch(e){} 
                    });
                    return xhr;
                }
                
                try { 
                    window.XMLHttpRequest = XHRWrapper; 
                } catch(e){}
            })();
        `;
        
        const s = document.createElement('script');
        s.textContent = code;
        s.setAttribute('data-devtoolsui-monitor','true');
        (document.head||document.documentElement).appendChild(s);
        
        setTimeout(() => s.remove(), 3000);
    }
    
    #id() { 
        return 's_' + Math.random().toString(36).slice(2,9); 
    }
    
    #escapeHtml(s) { 
        if(!s) return ''; 
        return s.replace(/[&<>"']/g, c => ({ 
            '&':'&amp;',
            '<':'&lt;',
            '>':'&gt;',
            '"':'&quot;',
            "'":'&#39;' 
        }[c])); 
    }
    
    #formatBytes(bytes) {
        if (bytes === undefined || bytes === null) return '—';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
        return (bytes/1024/1024).toFixed(2) + ' MB';
    }
    
    // Public API methods
    
    /**
     * Add a new page/tab to the UI
     * @param {string} tabName - The name of the tab
     * @param {string} htmlString - The HTML content for the tab
     */
    addPage(tabName, htmlString) {
        this.state.pages.push({
            "name": tabName,
            "content": htmlString
        });
        
        // Rebuild the sidebar to include the new tab
        this.#buildSidebar();
    }
    
    /**
     * Open the DevToolsUI sidebar
     */
    open() {
        this.#sidebar.classList.remove('collapsed');
    }
    
    /**
     * Close the DevToolsUI sidebar
     */
    close() {
        this.#sidebar.classList.add('collapsed');
    }
    
    /**
     * Toggle the visibility of the DevToolsUI sidebar
     */
    toggle() {
        this.#sidebar.classList.toggle('collapsed');
    }
    
    /**
     * Get the list of scripts
     * @returns {Array} Array of script objects
     */
    getScripts() {
        return this.state.scripts.map(s => ({ 
            id: s.id, 
            src: s.src, 
            inline: s.inline, 
            category: s.category, 
            status: s.status 
        }));
    }
    
    /**
     * Block a script by its source URL
     * @param {string} src - The source URL of the script to block
     */
    blockScript(src) {
        this.state.blocked.add(src);
        this.#saveBlocked();
        this.#renderScriptList();
    }
    
    /**
     * Unblock a script by its source URL
     * @param {string} src - The source URL of the script to unblock
     */
    unblockScript(src) {
        this.state.blocked.delete(src);
        this.#saveBlocked();
        this.#renderScriptList();
    }
    
    /**
     * Fetch the source of a script
     * @param {string} idOrSrc - The ID or source URL of the script
     */
    fetchScript(idOrSrc) {
        let s = this.state.scripts.find(x => x.id === idOrSrc || x.src === idOrSrc);
        if (!s) { 
            console.warn('script not found'); 
            return; 
        }
        return this.#fetchScriptSource(s);
    }
    
    /**
     * Set the primary color of the UI
     * @param {string} hex - The hex color code
     */
    setPrimaryColor(hex) {
        const styles = `
            #devtoolsui_sidebar .header {
                background-color: ${hex} !important;
            }
            .tab-nav-item.active {
                border-bottom: 2px solid ${hex} !important;
            }
            .category-pill {
                background-color: ${hex} !important;
            }
        `;
        
        const styleSheet = document.createElement("style");
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
    }
    
    /**
     * Add a custom event listener to an element in the UI
     * @param {string} selector - CSS selector for the element
     * @param {string} event - Event type (e.g., 'click', 'change')
     * @param {Function} callback - Callback function
     */
    addEventListener(selector, event, callback) {
        const element = document.querySelector(selector);
        if (element) {
            element.addEventListener(event, callback);
        } else {
            console.warn(`Element with selector "${selector}" not found`);
        }
    }
    
    /**
     * Execute a function when the UI is ready
     * @param {Function} callback - Callback function
     */
    onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }
}

// Expose the DevToolsUI class globally
window.DevToolsUI = DevToolsUI;