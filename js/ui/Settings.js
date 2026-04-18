// Settings.js - Manages Global settings and Theme toggling

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.Settings = class {
    constructor() {
        this.btnSettings = document.getElementById("btn-settings");
        this.dropdown = document.getElementById("settings-dropdown");
        this.toggleThemeBtn = document.getElementById("toggle-theme");
        this.clearCacheBtn = document.getElementById("btn-clear-cache");

        this.isDarkTheme = true;

        this.initEvents();
        this.loadSettings();

        // Listen for board title updates
        if (window.NodesCanvas.CanvasState) {
            const originalLoadRemote = window.NodesCanvas.CanvasState.loadRemote;
            window.NodesCanvas.CanvasState.loadRemote = async (...args) => {
                const res = await originalLoadRemote.apply(window.NodesCanvas.CanvasState, args);
                this.updateBoardLabel();
                return res;
            };
        }

        // Standalone mode: hide cloud/auth UI, inject save button
        const SK = window.NodesCanvas.StorageKeys;
        if (localStorage.getItem(SK.STANDALONE_MODE) === 'true') {
            this._initStandaloneUI();
        }
    }

    _initStandaloneUI() {
        // Hide cloud-specific elements
        const hide = ['btn-login', 'btn-logout', 'board-info-section', 'board-persistence-actions'];
        hide.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Inject standalone save button after btn-login (first item in dropdown)
        const dropdown = document.getElementById('settings-dropdown');
        if (!dropdown) return;

        // First divider after btn-login
        const firstDivider = dropdown.querySelector('.settings-divider');
        const saveBtn = document.createElement('div');
        saveBtn.className = 'settings-item';
        saveBtn.id = 'btn-save-standalone';
        saveBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
            </svg>
            <span>Save Board</span>
            <span id="btn-save-status" style="margin-left:auto;font-size:10px;color:#00dc82;opacity:0;transition:opacity 0.3s">✓ Saved</span>`;

        // Insert before the board-info-section
        const boardInfoDiv = document.getElementById('board-info-section');
        if (boardInfoDiv && boardInfoDiv.parentNode === dropdown) {
            dropdown.insertBefore(saveBtn, boardInfoDiv);
        } else {
            dropdown.appendChild(saveBtn);
        }

        saveBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this._standaloneFileSave();
        });
    }

    async _standaloneFileSave() {
        const dropSaveStatus = document.getElementById('btn-save-status');

        await window.NodesCanvas.CanvasState.save();

        if (dropSaveStatus) {
            dropSaveStatus.style.opacity = '1';
            setTimeout(() => { dropSaveStatus.style.opacity = '0'; }, 2000);
        }
        // Reset dirty flag
        if (window.NodesCanvas._markClean) window.NodesCanvas._markClean();
    }

    initEvents() {
        this.btnSettings.addEventListener("click", (e) => {
            e.stopPropagation();
            this.dropdown.classList.toggle("hidden");
        });

        // Auth Listeners
        if (window.NodesCanvas.AuthManager) {
            window.NodesCanvas.AuthManager.onChange((user) => this.syncUserUI(user));
        }

        this.toggleThemeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggleTheme();
        });

        if (this.clearCacheBtn) {
            this.clearCacheBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (confirm("Clear canvas? All unsaved nodes and connections will be lost.")) {
                    window.NodesCanvas.CanvasState.clearAndReset();
                }
            });
        }

        const loginBtn = document.getElementById("btn-login");
        if (loginBtn) {
            loginBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.dropdown.classList.add("hidden");
                window.NodesCanvas.popupManager.showLoginForm();
            });
        }

        const saveBoardBtn = document.getElementById("btn-save-board");
        if (saveBoardBtn) {
            saveBoardBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.dropdown.classList.add("hidden");
                const currentTitle = window.NodesCanvas.CanvasState.currentBoardTitle;
                window.NodesCanvas.popupManager.showBoardSavePrompt(currentTitle, async (newTitle) => {
                    const success = await window.NodesCanvas.CanvasState.saveRemote(newTitle);
                    if (success) {
                        alert("Board saved to cloud!");
                    } else {
                        alert("Error saving board.");
                    }
                });
            });
        }

        const myBoardsBtn = document.getElementById("btn-my-boards");
        if (myBoardsBtn) {
            myBoardsBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.dropdown.classList.add("hidden");
                window.NodesCanvas.popupManager.showBoardsList(async (boardId) => {
                    if (confirm("Load this board? Current unsaved changes might be lost.")) {
                        await window.NodesCanvas.CanvasState.loadRemote(boardId);
                    }
                });
            });
        }

        const logoutBtn = document.getElementById("btn-logout");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                window.NodesCanvas.AuthManager.logout();
                this.dropdown.classList.add("hidden");
            });
        }

        const exportBtn = document.getElementById("btn-export-js");
        if (exportBtn) {
            exportBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.dropdown.classList.add("hidden");
                window.NodesCanvas.CodeInspector.toggle();
            });
        }

        const saveRemoteBtn = document.getElementById("btn-save-remote");
        if (saveRemoteBtn) {
            saveRemoteBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                saveRemoteBtn.classList.add('saving');
                const title = window.NodesCanvas.CanvasState.currentBoardTitle;
                const success = await window.NodesCanvas.CanvasState.saveRemote(title);
                saveRemoteBtn.classList.remove('saving');
                if (success) {
                    console.log('Board saved remotely');
                } else {
                    alert('Error saving board to cloud.');
                }
            });
        }

        document.addEventListener("click", (e) => {
            if (!this.dropdown.contains(e.target) && e.target !== this.btnSettings) {
                this.dropdown.classList.add("hidden");
            }
        });
    }

    syncUserUI(user) {
        const userInfoEl = document.getElementById('user-info-display');
        const loginBtn = document.getElementById('btn-login');
        const logoutBtn = document.getElementById('btn-logout');
        const boardActions = document.getElementById('board-persistence-actions');
        const boardInfoSection = document.getElementById('board-info-section');

        if (user) {
            // Logged In
            const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            this.btnSettings.innerHTML = `<div class="user-avatar-initials">${initials}</div>`;

            if (userInfoEl) {
                userInfoEl.innerHTML = `
                    <div class="user-details" style="padding: 10px 16px;">
                        <span class="user-name" style="display: block; font-weight: 600; color: white;">${user.name}</span>
                        <span class="user-email" style="display: block; font-size: 11px; opacity: 0.6; color: white;">${user.email}</span>
                    </div>
                `;
                userInfoEl.style.display = 'block';
            }
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'flex';
            if (boardActions) boardActions.style.display = 'block';
            if (boardInfoSection) {
                boardInfoSection.style.display = 'block';
                this.updateBoardLabel();
            }
        } else {
            // Guest
            this.btnSettings.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
            if (userInfoEl) userInfoEl.style.display = 'none';
            if (loginBtn) loginBtn.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (boardActions) boardActions.style.display = 'none';
            if (boardInfoSection) boardInfoSection.style.display = 'none';
        }
    }

    updateBoardLabel() {
        const boardLabel = document.getElementById('label-board-name');
        if (boardLabel) {
            const title = window.NodesCanvas.CanvasState.currentBoardTitle || 'New Board';
            boardLabel.textContent = `{ ${title} }`;
        }
    }

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        this.applyTheme();
        this.saveSettings();
    }

    applyTheme() {
        const switchInner = this.toggleThemeBtn.querySelector('.toggle-switch');
        if (this.isDarkTheme) {
            document.body.classList.remove("light-theme");
            if (switchInner) switchInner.classList.remove("right");
        } else {
            document.body.classList.add("light-theme");
            if (switchInner) switchInner.classList.add("right");
        }
    }

    saveSettings() {
        const SK = window.NodesCanvas.StorageKeys;
        localStorage.setItem(SK.THEME, this.isDarkTheme ? "dark" : "light");
    }

    loadSettings() {
        const SK = window.NodesCanvas.StorageKeys;
        const savedTheme = localStorage.getItem(SK.THEME);
        if (savedTheme === "light") {
            this.isDarkTheme = false;
        }
        this.applyTheme();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    window.NodesCanvas.settingsParams = new window.NodesCanvas.Settings();
});
