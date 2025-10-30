/*
* nebula-gui.js
* v1.0.0
* NebulaUI-inspired Userscript GUI Library
* Apache 2.0 licensed
*/

class NebulaGui {
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
    }
    
    #projectName = "NebulaGui";
    window = undefined;
    document = undefined;
    iFrame = undefined;
    notifications = [];
    settings = {
        "window" : {
            "title" : "Nebula GUI",
            "name" : "nebula-gui",
            "external" : false,
            "centered" : false,
            "size" : {
                "width" : 340,
                "height" : 500,
                "dynamicSize" : true
            }
        },
        "gui" : {
            "centeredItems" : false,
            "internal" : {
                "darkCloseButton" : true,
                "style" : `
                    body {
                        background: linear-gradient(180deg,#051023,#071328);
                        color: #e6eef8;
                        overflow: hidden;
                        width: 100% !important;
                        font-family: Inter, Roboto, Arial, sans-serif;
                    }

                    form {
                        padding: 10px;
                    }
            
                    #gui {
                        height: fit-content;
                        background: #0f1720;
                        border-radius: 8px;
                        box-shadow: 2px 2px 14px rgba(0,0,0,0.6);
                    }
            
                    .rendered-form {
                        padding: 10px;
                    }

                    #header {
                        padding: 12px 14px;
                        cursor: move;
                        z-index: 10;
                        background: linear-gradient(180deg,#0b1220,#0e1a2a);
                        color: #cfe8ff;
                        height: fit-content;
                        border-bottom: 1px solid rgba(255,255,255,0.03);
                    }

                    .header-item-container {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
            
                    .left-title {
                        font-size: 14px;
                        font-weight: bold;
                        padding: 0;
                        margin: 0;
                    }
                    
                    #button-close-gui {
                        vertical-align: middle;
                        color: #cfe8ff;
                    }

                    div .form-group {
                        margin-bottom: 15px;
                    }

                    #resizer {
                        width: 10px;
                        height: 10px;
                        cursor: se-resize;
                        position: absolute;
                        bottom: 0;
                        right: 0;
                    }

                    .formbuilder-button {
                        width: fit-content;
                    }

                    /* NebulaUI button styling */
                    .btn {
                        background: linear-gradient(180deg,#16334a,#0f2a3a);
                        color: #ddf0ff;
                        padding: 6px 10px;
                        border-radius: 8px;
                        cursor: pointer;
                        border: 1px solid rgba(255,255,255,0.03);
                        font-size: 13px;
                    }

                    .btn.ghost {
                        background: transparent;
                        border: 1px dashed rgba(255,255,255,0.04);
                    }

                    /* NebulaUI input styling */
                    input, select, textarea {
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        color: #e6eef8;
                        border-radius: 6px;
                        padding: 6px 8px;
                    }

                    /* NebulaUI tabs styling */
                    .nav-tabs {
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                    }

                    .nav-tabs .nav-link {
                        color: #cfe8ff;
                        border: none;
                        border-bottom: 2px solid transparent;
                        background: transparent;
                    }

                    .nav-tabs .nav-link.active {
                        color: #e8f4ff;
                        border-bottom: 2px solid #2b6cb0;
                        background: rgba(255,255,255,0.05);
                    }

                    /* NebulaUI notification styling */
                    .notification-container {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        z-index: 999999999;
                        max-width: 300px;
                    }

                    .notification {
                        background: linear-gradient(180deg,#0b1220,#0e1a2a);
                        color: #e6eef8;
                        padding: 12px 16px;
                        border-radius: 8px;
                        margin-bottom: 10px;
                        box-shadow: 2px 2px 10px rgba(0,0,0,0.5);
                        border-left: 4px solid #2b6cb0;
                        animation: slideIn 0.3s ease-out;
                    }

                    .notification.error {
                        border-left-color: #b83232;
                    }

                    .notification.warning {
                        border-left-color: #b36b00;
                    }

                    .notification.success {
                        border-left-color: #2b6cb0;
                    }

                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }

                    @keyframes slideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }

                    /* NebulaUI window management */
                    .window-list {
                        padding: 8px;
                        border-bottom: 1px solid rgba(255,255,255,0.03);
                    }

                    .window-item {
                        padding: 8px;
                        margin: 6px 0;
                        background: linear-gradient(180deg, rgba(255,255,255,0.01), transparent);
                        border-radius: 8px;
                        cursor: pointer;
                        display: flex;
                        gap: 8px;
                        align-items: center;
                    }

                    .window-item.active {
                        background: rgba(43, 108, 176, 0.2);
                    }

                    .window-title {
                        font-weight: 600;
                        font-size: 13px;
                        color: #e8f4ff;
                    }

                    .window-controls {
                        display: flex;
                        gap: 4px;
                        margin-left: auto;
                    }

                    .window-control-btn {
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        cursor: pointer;
                    }

                    .window-control-btn.minimize {
                        background: #b36b00;
                    }

                    .window-control-btn.maximize {
                        background: #2b6cb0;
                    }

                    .window-control-btn.close {
                        background: #b83232;
                    }
                `
            },
            "external" : {
                "popup" : true,
                "style" : `
                    body {
                        background: linear-gradient(180deg,#051023,#071328);
                        color: #e6eef8;
                        font-family: Inter, Roboto, Arial, sans-serif;
                    }

                    .rendered-form {
                        padding: 10px; 
                    }
                    div .form-group {
                        margin-bottom: 15px;
                    }

                    /* NebulaUI button styling */
                    .btn {
                        background: linear-gradient(180deg,#16334a,#0f2a3a);
                        color: #ddf0ff;
                        padding: 6px 10px;
                        border-radius: 8px;
                        cursor: pointer;
                        border: 1px solid rgba(255,255,255,0.03);
                        font-size: 13px;
                    }

                    .btn.ghost {
                        background: transparent;
                        border: 1px dashed rgba(255,255,255,0.04);
                    }

                    /* NebulaUI input styling */
                    input, select, textarea {
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        color: #e6eef8;
                        border-radius: 6px;
                        padding: 6px 8px;
                    }

                    /* NebulaUI tabs styling */
                    .nav-tabs {
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                    }

                    .nav-tabs .nav-link {
                        color: #cfe8ff;
                        border: none;
                        border-bottom: 2px solid transparent;
                        background: transparent;
                    }

                    .nav-tabs .nav-link.active {
                        color: #e8f4ff;
                        border-bottom: 2px solid #2b6cb0;
                        background: rgba(255,255,255,0.05);
                    }

                    /* NebulaUI notification styling */
                    .notification-container {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        z-index: 999999999;
                        max-width: 300px;
                    }

                    .notification {
                        background: linear-gradient(180deg,#0b1220,#0e1a2a);
                        color: #e6eef8;
                        padding: 12px 16px;
                        border-radius: 8px;
                        margin-bottom: 10px;
                        box-shadow: 2px 2px 10px rgba(0,0,0,0.5);
                        border-left: 4px solid #2b6cb0;
                        animation: slideIn 0.3s ease-out;
                    }

                    .notification.error {
                        border-left-color: #b83232;
                    }

                    .notification.warning {
                        border-left-color: #b36b00;
                    }

                    .notification.success {
                        border-left-color: #2b6cb0;
                    }

                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }

                    @keyframes slideOut {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }

                    /* NebulaUI window management */
                    .window-list {
                        padding: 8px;
                        border-bottom: 1px solid rgba(255,255,255,0.03);
                    }

                    .window-item {
                        padding: 8px;
                        margin: 6px 0;
                        background: linear-gradient(180deg, rgba(255,255,255,0.01), transparent);
                        border-radius: 8px;
                        cursor: pointer;
                        display: flex;
                        gap: 8px;
                        align-items: center;
                    }

                    .window-item.active {
                        background: rgba(43, 108, 176, 0.2);
                    }

                    .window-title {
                        font-weight: 600;
                        font-size: 13px;
                        color: #e8f4ff;
                    }

                    .window-controls {
                        display: flex;
                        gap: 4px;
                        margin-left: auto;
                    }

                    .window-control-btn {
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        cursor: pointer;
                    }

                    .window-control-btn.minimize {
                        background: #b36b00;
                    }

                    .window-control-btn.maximize {
                        background: #2b6cb0;
                    }

                    .window-control-btn.close {
                        background: #b83232;
                    }
                `
            }
        },
        "messages" : {
            "blockedPopups" : () => this.showNotification("The GUI (graphical user interface) failed to open!\n\nPossible reason: The popups are blocked.\n\nPlease allow popups for this site. (" + window.location.hostname + ")", "error")
        }
    };

    // This error page will be shown if the user has not added any pages
    #errorPage = (title, code) => `
        <style>
            .error-page {
                width: 100%;
                height: fit-content;
                background-color: #0f1720;
                display: flex;
                justify-content: center;
                align-items: center;
                text-align: center;
                padding: 25px
            }
            .error-page-text {
                font-family: Inter, Roboto, Arial, sans-serif;
                font-size: x-large;
                color: #e6eef8;
            }
            .error-page-tag {
                margin-top: 20px;
                font-size: 10px;
                color: #4a4a4a;
                font-style: italic;
                margin-bottom: 0px;
            }
        </style>
        <div class="error-page">
            <div>
                <p class="error-page-text">${title}</p>
                <code>${code}</code>
                <p class="error-page-tag">${this.#projectName} error message</p>
            </div>
        </div>`;

    // The user can add multiple pages to their GUI. The pages are stored in this array.
    #guiPages = [
        {
            "name" : "default_no_content_set",
            "content" : this.#errorPage("Content missing", "Gui.setContent(html, tabName);")
        }
    ];

    // Windows management
    #windows = [];
    #activeWindow = null;

    // The userscript manager's xmlHttpRequest is used to bypass CORS limitations (To load Bootstrap)
    async #bypassCors(externalFile) {
        const res = await new Promise(resolve => {
            GM_xmlhttpRequest({
            method: "GET",
            url: externalFile,
            onload: resolve
            });
        });

        return res.responseText;
    }

    // Returns one tab (as HTML) for the navigation tabs
    #createNavigationTab(page) {
        const name = page.name;

        if(name == undefined) {
            console.error(`[${this.#projectName}] Gui.addPage(html, name) <- name missing!`);
            return undefined;
        } else {
            const modifiedName = name.toLowerCase().replaceAll(' ', '').replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 1000000000);

            const content = page.content;
            const indexOnArray = this.#guiPages.map(x => x.name).indexOf(name);
            const firstItem = indexOnArray == 0 ? true : false;

            return {
                "listItem" : `
                    <li class="nav-item" role="presentation">
                        <button class="nav-link ${firstItem ? 'active' : ''}" id="${modifiedName}-tab" data-bs-toggle="tab" data-bs-target="#${modifiedName}" type="button" role="tab" aria-controls="${modifiedName}" aria-selected="${firstItem}">${name}</button>
                    </li>
                `,
                "panelItem" : `
                    <div class="tab-pane ${firstItem ? 'active' : ''}" id="${modifiedName}" role="tabpanel" aria-labelledby="${modifiedName}-tab">${content}</div>
                `
            };
        }
    }

    // Make tabs function without bootstrap.js (CSP might block bootstrap and make the GUI nonfunctional)
    #initializeTabs() {
        const handleTabClick = e => {
            const target = e.target;
            const contentID = target.getAttribute("data-bs-target");

            target.classList.add("active");
            this.document.querySelector(contentID).classList.add("active");
    
            [...this.document.querySelectorAll(".nav-link")].forEach(tab => {
                if(tab != target) {
                    const contentID = tab.getAttribute("data-bs-target");

                    tab.classList.remove("active");
                    this.document.querySelector(contentID).classList.remove("active");
                }
            });
        }

        [...this.document.querySelectorAll(".nav-link")].forEach(tab => {
            tab.addEventListener("click", handleTabClick);
        });
    }

    // Initialize notification system
    #initializeNotifications() {
        // Create notification container if it doesn't exist
        if (!this.document.querySelector('.notification-container')) {
            const container = this.document.createElement('div');
            container.className = 'notification-container';
            this.document.body.appendChild(container);
        }
    }

    // Initialize window management
    #initializeWindows() {
        // Create window list if it doesn't exist
        if (!this.document.querySelector('.window-list')) {
            const windowList = this.document.createElement('div');
            windowList.className = 'window-list';
            windowList.innerHTML = '<div class="muted" style="font-weight:700;margin-bottom:8px">WINDOWS</div>';
            
            // Insert after header
            const header = this.document.querySelector('#header');
            if (header) {
                header.parentNode.insertBefore(windowList, header.nextSibling);
            }
        }
    }

    // Will determine if a navbar is needed, returns either a regular GUI, or a GUI with a navbar
    #getContent() {
        // Only one page has been set, no navigation tabs will be created
        if(this.#guiPages.length == 1) {
            return this.#guiPages[0].content;
        }
        // Multiple pages has been set, dynamically creating the navigation tabs
        else if(this.#guiPages.length > 1) {
            const tabs = (list, panels) => `
                <ul class="nav nav-tabs" id="userscript-tab" role="tablist">
                    ${list}
                </ul>
                <div class="tab-content">
                    ${panels}
                </div>
            `;

            let list = ``;
            let panels = ``;

            this.#guiPages.forEach(page => {
                const data = this.#createNavigationTab(page);

                if(data != undefined) {
                    list += data.listItem + '\n';
                    panels += data.panelItem + '\n';
                }
            });

            return tabs(list, panels);
        }
    }

    // Returns the GUI's whole document as string
    async #createDocument() {
        const bootstrapStyling = await this.#bypassCors("https://raw.githubusercontent.com/AugmentedWeb/UserGui/main/resources/bootstrap.css");

        const externalDocument = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${this.settings.window.title}</title>
            <style>
            ${bootstrapStyling}
            ${this.settings.gui.external.style}
            ${
            this.settings.gui.centeredItems 
                ? `.form-group {
                        display: flex;
                        justify-content: center;
                    }`
                : ""
            }
            </style>
        </head>
        <body>
        ${this.#getContent()}
        </body>
        </html>
        `;

        const internalDocument = `
        <!doctype html>
        <html lang="en">
        <head>
            <style>
            ${bootstrapStyling}
            ${this.settings.gui.internal.style}
            ${
            this.settings.gui.centeredItems 
                ? `.form-group {
                        display: flex;
                        justify-content: center;
                    }`
                : ""
            }
            </style>
        </head>
        <body>
            <div id="gui">
                <div id="header">
                    <div class="header-item-container">
                        <h1 class="left-title">${this.settings.window.title}</h1>
                        <div class="right-buttons">
                            <button type="button" class="${this.settings.gui.internal.darkCloseButton ? "btn-close" : "btn-close btn-close-white"}" aria-label="Close" id="button-close-gui"></button>
                        </div>
                    </div>
                </div>
                <div id="content">
                ${this.#getContent()}
                </div>
                <div id="resizer"></div>
            </div>
        </body>
        </html>
        `;

        if(this.settings.window.external) {
            return externalDocument;
        } else {
            return internalDocument;
        }
    }

    // The user will use this function to add a page to their GUI, with their own HTML (Bootstrap 5)
    addPage(tabName, htmlString) {
        if(this.#guiPages[0].name == "default_no_content_set") {
            this.#guiPages = [];
        }

        this.#guiPages.push({
            "name" : tabName,
            "content" : htmlString
        });
    }

    // Create a new window
    createWindow(title, content, options = {}) {
        const windowId = 'window_' + Math.random().toString(36).slice(2,9);
        const windowObj = {
            id: windowId,
            title: title,
            content: content,
            minimized: options.minimized || false,
            maximized: options.maximized || false,
            active: false
        };

        this.#windows.push(windowObj);

        // If document is already initialized, update the window list
        if (this.document) {
            this.#updateWindowList();
        }

        return windowId;
    }

    // Update the window list in the UI
    #updateWindowList() {
        const windowList = this.document.querySelector('.window-list');
        if (!windowList) return;

        // Clear existing window items (except the title)
        const title = windowList.querySelector('.muted');
        windowList.innerHTML = '';
        if (title) windowList.appendChild(title);

        // Add window items
        this.#windows.forEach(window => {
            const windowItem = document.createElement('div');
            windowItem.className = `window-item ${window.active ? 'active' : ''}`;
            windowItem.dataset.windowId = window.id;

            const windowTitle = document.createElement('div');
            windowTitle.className = 'window-title';
            windowTitle.textContent = window.title;

            const windowControls = document.createElement('div');
            windowControls.className = 'window-controls';

            const minimizeBtn = document.createElement('div');
            minimizeBtn.className = 'window-control-btn minimize';
            minimizeBtn.title = 'Minimize';
            minimizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.minimizeWindow(window.id);
            });

            const maximizeBtn = document.createElement('div');
            maximizeBtn.className = 'window-control-btn maximize';
            maximizeBtn.title = 'Maximize';
            maximizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.maximizeWindow(window.id);
            });

            const closeBtn = document.createElement('div');
            closeBtn.className = 'window-control-btn close';
            closeBtn.title = 'Close';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeWindow(window.id);
            });

            windowControls.appendChild(minimizeBtn);
            windowControls.appendChild(maximizeBtn);
            windowControls.appendChild(closeBtn);

            windowItem.appendChild(windowTitle);
            windowItem.appendChild(windowControls);

            windowItem.addEventListener('click', () => {
                this.activateWindow(window.id);
            });

            windowList.appendChild(windowItem);
        });
    }

    // Activate a window
    activateWindow(windowId) {
        const window = this.#windows.find(w => w.id === windowId);
        if (!window) return;

        // Deactivate all windows
        this.#windows.forEach(w => w.active = false);

        // Activate the selected window
        window.active = true;
        this.#activeWindow = windowId;

        // Update the window list
        this.#updateWindowList();

        // Update the content area
        const contentArea = this.document.querySelector('#content');
        if (contentArea) {
            contentArea.innerHTML = window.content;
        }

        // Show notification
        this.showNotification(`Activated window: ${window.title}`, 'success');
    }

    // Minimize a window
    minimizeWindow(windowId) {
        const window = this.#windows.find(w => w.id === windowId);
        if (!window) return;

        window.minimized = true;
        this.showNotification(`Minimized window: ${window.title}`, 'success');
    }

    // Maximize a window
    maximizeWindow(windowId) {
        const window = this.#windows.find(w => w.id === windowId);
        if (!window) return;

        window.maximized = !window.maximized;
        this.showNotification(`${window.maximized ? 'Maximized' : 'Restored'} window: ${window.title}`, 'success');
    }

    // Close a window
    closeWindow(windowId) {
        const windowIndex = this.#windows.findIndex(w => w.id === windowId);
        if (windowIndex === -1) return;

        const window = this.#windows[windowIndex];
        this.#windows.splice(windowIndex, 1);

        // If this was the active window, activate another one
        if (this.#activeWindow === windowId) {
            if (this.#windows.length > 0) {
                this.activateWindow(this.#windows[0].id);
            } else {
                this.#activeWindow = null;
                const contentArea = this.document.querySelector('#content');
                if (contentArea) {
                    contentArea.innerHTML = this.#errorPage("No windows", "Create a window using createWindow()");
                }
            }
        }

        // Update the window list
        this.#updateWindowList();

        // Show notification
        this.showNotification(`Closed window: ${window.title}`, 'success');
    }

    // Show a notification
    showNotification(message, type = 'info', duration = 5000) {
        if (!this.document) {
            // If document is not ready, store the notification for later
            this.notifications.push({ message, type, duration });
            return;
        }

        // Initialize notification system if needed
        this.#initializeNotifications();

        const container = this.document.querySelector('.notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        container.appendChild(notification);

        // Auto-remove after duration
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    #getCenterScreenPosition() {
        const guiWidth = this.settings.window.size.width;
        const guiHeight = this.settings.window.size.height;

        const x = (screen.width - guiWidth) / 2;
        const y = (screen.height - guiHeight) / 2;
        
        return { "x" : x, "y": y };
    }

    #getCenterWindowPosition() {
        const guiWidth = this.settings.window.size.width;
        const guiHeight = this.settings.window.size.height;

        const x = (window.innerWidth - guiWidth) / 2;
        const y = (window.innerHeight - guiHeight) / 2;
        
        return { "x" : x, "y": y };
    }

    #initializeInternalGuiEvents(iFrame) {
        // - The code below will consist mostly of drag and resize implementations
        // - iFrame window <-> Main window interaction requires these to be done
        // - Basically, iFrame document's event listeners make the whole iFrame move on the main window

        // Sets the iFrame's size
        function setFrameSize(x, y) {
            iFrame.style.width = `${x}px`;
            iFrame.style.height = `${y}px`;
        }

        // Gets the iFrame's size
        function getFrameSize() {
            const frameBounds = iFrame.getBoundingClientRect();

            return { "width" : frameBounds.width, "height" : frameBounds.height };
        }

        // Sets the iFrame's position relative to the main window's document
        function setFramePos(x, y) {
            iFrame.style.left = `${x}px`;
            iFrame.style.top = `${y}px`;
        }

        // Gets the iFrame's position relative to the main document
        function getFramePos() {
            const frameBounds = iFrame.getBoundingClientRect();
            
            return { "x": frameBounds.x, "y" : frameBounds.y };
        }

        // Gets the frame body's offsetHeight
        function getInnerFrameSize() {
            const innerFrameElem = iFrame.contentDocument.querySelector("#gui");

            return { "x": innerFrameElem.offsetWidth, "y" : innerFrameElem.offsetHeight };
        }

        // Sets the frame's size to the innerframe's size
        const adjustFrameSize = () => {
            const innerFrameSize = getInnerFrameSize();

            setFrameSize(innerFrameSize.x, innerFrameSize.y);
        }

        // Variables for draggable header
        let dragging = false,
            dragStartPos = { "x" : 0, "y" : 0 };

        // Variables for resizer
        let resizing = false,
            mousePos = { "x" : undefined, "y" : undefined },
            lastFrame;

        function handleResize(isInsideFrame, e) {
            if(mousePos.x == undefined && mousePos.y == undefined) {
                mousePos.x = e.clientX;
                mousePos.y = e.clientY;

                lastFrame = isInsideFrame;
            }

            const deltaX = mousePos.x - e.clientX,
                  deltaY = mousePos.y - e.clientY;

            const frameSize = getFrameSize();
            const allowedSize = frameSize.width - deltaX > 160 && frameSize.height - deltaY > 90;

            if(isInsideFrame == lastFrame && allowedSize) {
                setFrameSize(frameSize.width - deltaX, frameSize.height - deltaY);
            }

            mousePos.x = e.clientX;
            mousePos.y = e.clientY;

            lastFrame = isInsideFrame;
        }

        function handleDrag(isInsideFrame, e) {
            const bR = iFrame.getBoundingClientRect();

            const windowWidth = window.innerWidth,
                windowHeight = window.innerHeight;

            let x, y;

            if(isInsideFrame) {
                x = getFramePos().x += e.clientX - dragStartPos.x;
                y = getFramePos().y += e.clientY - dragStartPos.y;
            } else {
                x = e.clientX - dragStartPos.x;
                y = e.clientY - dragStartPos.y;
            }

            // Check out of bounds: left
            if(x <= 0) {
                x = 0
            }

            // Check out of bounds: right
            if(x + bR.width >= windowWidth) {
                x = windowWidth - bR.width;
            }

            // Check out of bounds: top
            if(y <= 0) {
                y = 0;
            }

            // Check out of bounds: bottom
            if(y + bR.height >= windowHeight) {
                y = windowHeight - bR.height;
            }

            setFramePos(x, y);
        }

        // Dragging start (iFrame)
        this.document.querySelector("#header").addEventListener('mousedown', e => {
            e.preventDefault();

            dragging = true;

            dragStartPos.x = e.clientX;
            dragStartPos.y = e.clientY;
        });

        // Resizing start
        this.document.querySelector("#resizer").addEventListener('mousedown', e => {
            e.preventDefault();

            resizing = true;
        });

        // While dragging or resizing (iFrame)
        this.document.addEventListener('mousemove', e => {
            if(dragging)
                handleDrag(true, e);

            if(resizing) 
                handleResize(true, e);
        });

        // While dragging or resizing (Main window)
        document.addEventListener('mousemove', e => {
            if(dragging)
                handleDrag(false, e);

            if(resizing)
                handleResize(false, e);
        });

        // Stop dragging and resizing (iFrame)
        this.document.addEventListener('mouseup', e => {
            e.preventDefault();
            
            dragging = false;
            resizing = false;
        });

        // Stop dragging and resizing (Main window)
        document.addEventListener('mouseup', e => {
            dragging = false;
            resizing = false;
        });

        // Listener for the close button, closes the internal GUI
        this.document.querySelector("#button-close-gui").addEventListener('click', e => {
            e.preventDefault();

            this.close();
        });

        const guiObserver = new MutationObserver(adjustFrameSize);
        const guiElement = this.document.querySelector("#gui");

        guiObserver.observe(guiElement, {
            childList: true,
            subtree: true,
            attributes: true
        });
        
        adjustFrameSize();
    }

    async #openExternalGui(readyFunction) {
        const noWindow = this.window?.closed;

        if(noWindow || this.window == undefined) {
            let pos = "";
            let windowSettings = "";

            if(this.settings.window.centered && this.settings.gui.external.popup) {
                const centerPos = this.#getCenterScreenPosition();
                pos = `left=${centerPos.x}, top=${centerPos.y}`;
            }

            if(this.settings.gui.external.popup) {
                windowSettings = `width=${this.settings.window.size.width}, height=${this.settings.window.size.height}, ${pos}`;
            }

            // Create a new window for the GUI
            this.window = window.open("", this.settings.windowName, windowSettings);

            if(!this.window) {
                this.settings.messages.blockedPopups();
                return;
            }

            // Write the document to the new window
            this.window.document.open();
            this.window.document.write(await this.#createDocument());
            this.window.document.close();

            if(!this.settings.gui.external.popup) {
                this.window.document.body.style.width = `${this.settings.window.size.width}px`;

                if(this.settings.window.centered) {
                    const centerPos = this.#getCenterScreenPosition();

                    this.window.document.body.style.position = "absolute";
                    this.window.document.body.style.left = `${centerPos.x}px`;
                    this.window.document.body.style.top = `${centerPos.y}px`;
                }
            }

            // Dynamic sizing (only height & window.outerHeight no longer works on some browsers...)
            this.window.resizeTo(
                this.settings.window.size.width,
                this.settings.window.size.dynamicSize 
                    ? this.window.document.body.offsetHeight + (this.window.outerHeight - this.window.innerHeight)
                    : this.settings.window.size.height
            );

            this.document = this.window.document;

            this.#initializeTabs();
            this.#initializeNotifications();
            this.#initializeWindows();
            this.#updateWindowList();

            // Show any pending notifications
            this.notifications.forEach(notification => {
                this.showNotification(notification.message, notification.type, notification.duration);
            });
            this.notifications = [];

            // Call user's function
            if(typeof readyFunction == "function") {
                readyFunction();
            }

            window.onbeforeunload = () => {
                // Close the GUI if parent window closes
                this.close();
            }
        } 
        
        else {
            // Window was already opened, bring the window back to focus
            this.window.focus();
        }
    }

    async #openInternalGui(readyFunction) {
        if(this.iFrame) {
            return;
        }

        const fadeInSpeedMs = 250;

        let left = 0, top = 0;

        if(this.settings.window.centered) {
            const centerPos = this.#getCenterWindowPosition();

            left = centerPos.x;
            top = centerPos.y;
        }

        const iframe = document.createElement("iframe");
        iframe.srcdoc = await this.#createDocument();
        iframe.style = `
            position: fixed;
            top: ${top}px;
            left: ${left}px;
            width: ${this.settings.window.size.width};
            height: ${this.settings.window.size.height};
            border: 0;
            opacity: 0;
            transition: all ${fadeInSpeedMs/1000}s;
            border-radius: 5px;
            box-shadow: rgb(0 0 0 / 6%) 10px 10px 10px;
            z-index: 2147483647;
        `;

        const waitForBody = setInterval(() => {
            if(document?.body) {
                clearInterval(waitForBody);

                // Prepend the GUI to the document's body
                document.body.prepend(iframe);

                iframe.contentWindow.onload = () => {
                    // Fade-in implementation
                    setTimeout(() => iframe.style["opacity"] = "1", fadeInSpeedMs/2);
                    setTimeout(() => iframe.style["transition"] = "none", fadeInSpeedMs + 500);
        
                    this.window = iframe.contentWindow;
                    this.document = iframe.contentDocument;
                    this.iFrame = iframe;
        
                    this.#initializeInternalGuiEvents(iframe);
                    this.#initializeTabs();
                    this.#initializeNotifications();
                    this.#initializeWindows();
                    this.#updateWindowList();

                    // Show any pending notifications
                    this.notifications.forEach(notification => {
                        this.showNotification(notification.message, notification.type, notification.duration);
                    });
                    this.notifications = [];
                    
                    readyFunction();
                }
            }
        }, 100);
    }

    // Determines if the window is to be opened externally or internally
    open(readyFunction) {
        if(this.settings.window.external) {
            this.#openExternalGui(readyFunction);
        } else {
            this.#openInternalGui(readyFunction);
        }
    }

    // Closes the GUI if it exists
    close() {
        if(this.settings.window.external) {
            if(this.window) {
                this.window.close();
            }
        } else {
            if(this.iFrame) {
                this.iFrame.remove();
                this.iFrame = undefined;
            }
        }
    }

    saveConfig() {
        let config = [];

        if(this.document) {
            [...this.document.querySelectorAll(".form-group")].forEach(elem => {
                const inputElem = elem.querySelector("[name]");
    
                const name = inputElem.getAttribute("name"),
                      data = this.getData(name);
    
                if(data) {
                    config.push({ "name" : name, "value" : data });
                }
            });
        }

        GM_setValue("config", config);
    }

    loadConfig() {
        const config = this.getConfig();

        if(this.document && config) {
            config.forEach(elemConfig => {
                this.setData(elemConfig.name, elemConfig.value);
            })
        }
    }

    getConfig() {
        return GM_getValue("config");
    }

    resetConfig() {
        const config = this.getConfig();

        if(config) {
            GM_setValue("config", []);
        }
    }

    dispatchFormEvent(name) {
        const type = name.split("-")[0].toLowerCase();
        const properties = this.#typeProperties.find(x => type == x.type);
        const event = new Event(properties.event);

        const field = this.document.querySelector(`.field-${name}`);
        field.dispatchEvent(event);
    }

    setPrimaryColor(hex) {
        const styles = `
        #header {
            background-color: ${hex} !important;
        }
        .nav-link {
            color: ${hex} !important;
        }
        .text-primary {
            color: ${hex} !important;
        }
        `;
        
        const styleSheet = document.createElement("style")
        styleSheet.innerText = styles;
        this.document.head.appendChild(styleSheet);
    }

    // Creates an event listener a GUI element
    event(name, event, eventFunction) {
        this.document.querySelector(`.field-${name}`).addEventListener(event, eventFunction);
    }

    // Disables a GUI element
    disable(name) {
        [...this.document.querySelector(`.field-${name}`).children].forEach(childElem => {
            childElem.setAttribute("disabled", "true");
        });
    }

    // Enables a GUI element
    enable(name) {
        [...this.document.querySelector(`.field-${name}`).children].forEach(childElem => {
            if(childElem.getAttribute("disabled")) {
                childElem.removeAttribute("disabled");
            }
        });
    }

    // Gets data from types: TEXT FIELD, TEXTAREA, DATE FIELD & NUMBER
    getValue(name) {
        return this.document.querySelector(`.field-${name}`).querySelector(`[id=${name}]`).value;
    }

    // Sets data to types: TEXT FIELD, TEXT AREA, DATE FIELD & NUMBER
    setValue(name, newValue) {
        this.document.querySelector(`.field-${name}`).querySelector(`[id=${name}]`).value = newValue;

        this.dispatchFormEvent(name);
    }

    // Gets data from types: RADIO GROUP
    getSelection(name) {
        return this.document.querySelector(`.field-${name}`).querySelector(`input[name=${name}]:checked`).value;
    }

    // Sets data to types: RADIO GROUP
    setSelection(name, newOptionsValue) {
        this.document.querySelector(`.field-${name}`).querySelector(`input[value=${newOptionsValue}]`).checked = true;

        this.dispatchFormEvent(name);
    }

    // Gets data from types: CHECKBOX GROUP
    getChecked(name) {
        return [...this.document.querySelector(`.field-${name}`).querySelectorAll(`input[name*=${name}]:checked`)]
            .map(checkbox => checkbox.value);
    }

    // Sets data to types: CHECKBOX GROUP
    setChecked(name, checkedArr) {
        const checkboxes = [...this.document.querySelector(`.field-${name}`).querySelectorAll(`input[name*=${name}]`)]
        
        checkboxes.forEach(checkbox => {
            if(checkedArr.includes(checkbox.value)) {
                checkbox.checked = true;
            }
        });

        this.dispatchFormEvent(name);
    }
    
    // Gets data from types: FILE UPLOAD
    getFiles(name) {
        return this.document.querySelector(`.field-${name}`).querySelector(`input[id=${name}]`).files;
    }
    
    // Gets data from types: SELECT
    getOption(name) {
        const selectedArr = [...this.document.querySelector(`.field-${name} #${name}`).selectedOptions].map(({value}) => value);

        return selectedArr.length == 1 ? selectedArr[0] : selectedArr;
    }

    // Sets data to types: SELECT
    setOption(name, newOptionsValue) {
        if(typeof newOptionsValue == 'object') {
            newOptionsValue.forEach(optionVal => {
            this.document.querySelector(`.field-${name}`).querySelector(`option[value=${optionVal}]`).selected = true;
            });
        } else {
            this.document.querySelector(`.field-${name}`).querySelector(`option[value=${newOptionsValue}]`).selected = true;
        }

        this.dispatchFormEvent(name);
    }

    #typeProperties = [
        {
            "type": "button",
            "event": "click",
            "function": {
                "get" : null,
                "set" : null
            }
        },
        {
            "type": "radio",
            "event": "change",
            "function": {
                "get" : n => this.getSelection(n),
                "set" : (n, nV) => this.setSelection(n, nV)
            }
        },
        {
            "type": "checkbox",
            "event": "change",
            "function": {
                "get" : n => this.getChecked(n),
                "set" : (n, nV) => this.setChecked(n, nV)
            }
        },
        {
            "type": "date",
            "event": "change",
            "function": {
                "get" : n => this.getValue(n),
                "set" : (n, nV) => this.setValue(n, nV)
            }
        },
        {
            "type": "file",
            "event": "change",
            "function": {
                "get" : n => this.getFiles(n),
                "set" : null
            }
        },
        {
            "type": "number",
            "event": "input",
            "function": {
                "get" : n => this.getValue(n),
                "set" : (n, nV) => this.setValue(n, nV)
            }
        },
        {
            "type": "select",
            "event": "change",
            "function": {
                "get" : n => this.getOption(n),
                "set" : (n, nV) => this.setOption(n, nV)
            }
        },
        {
            "type": "text",
            "event": "input",
            "function": {
                "get" : n => this.getValue(n),
                "set" : (n, nV) => this.setValue(n, nV)
            }
        },
        {
            "type": "textarea",
            "event": "input",
            "function": {
                "get" : n => this.getValue(n),
                "set" : (n, nV) => this.setValue(n, nV)
            }
        },
    ];

    // The same as the event() function, but automatically determines the best listener type for the element
    // (e.g. button -> listen for "click", textarea -> listen for "input")
    smartEvent(name, eventFunction) {
        if(name.includes("-")) {
            const type = name.split("-")[0].toLowerCase();
            const properties = this.#typeProperties.find(x => type == x.type);

            if(typeof properties == "object") {
                this.event(name, properties.event, eventFunction);

            } else {
                console.warn(`${this.#projectName}'s smartEvent function did not find any matches for the type "${type}". The event could not be made.`);
            }

        } else {
            console.warn(`The input name "${name}" is invalid for ${this.#projectName}'s smartEvent. The event could not be made.`);
        }
    }

    // Will automatically determine the suitable function for data retrival
    // (e.g. file select -> use getFiles() function)
    getData(name) {
        if(name.includes("-")) {
            const type = name.split("-")[0].toLowerCase();
            const properties = this.#typeProperties.find(x => type == x.type);

            if(typeof properties == "object") {
                const getFunction = properties.function.get;

                if(typeof getFunction == "function") {
                    return getFunction(name);

                } else {
                    console.error(`${this.#projectName}'s getData function can't be used for the type "${type}". The data can't be taken.`);
                }

            } else {
                console.warn(`${this.#projectName}'s getData function did not find any matches for the type "${type}". The event could not be made.`);
            }

        } else {
            console.warn(`The input name "${name}" is invalid for ${this.#projectName}'s getData function. The event could not be made.`);
        }
    }

    // Will automatically determine the suitable function for data retrival (e.g. checkbox -> use setChecked() function)
    setData(name, newData) {
        if(name.includes("-")) {
            const type = name.split("-")[0].toLowerCase();
            const properties = this.#typeProperties.find(x => type == x.type);

            if(typeof properties == "object") {
                const setFunction = properties.function.set;

                if(typeof setFunction == "function") {
                    return setFunction(name, newData);

                } else {
                    console.error(`${this.#projectName}'s setData function can't be used for the type "${type}". The data can't be taken.`);
                }

            } else {
                console.warn(`${this.#projectName}'s setData function did not find any matches for the type "${type}". The event could not be made.`);
            }

        } else {
            console.warn(`The input name "${name}" is invalid for ${this.#projectName}'s setData function. The event could not be made.`);
        }
    }
}
