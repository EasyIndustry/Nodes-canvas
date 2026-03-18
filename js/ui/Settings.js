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
        localStorage.setItem("nodesCanvasTheme", this.isDarkTheme ? "dark" : "light");
    }

    loadSettings() {
        const savedTheme = localStorage.getItem("nodesCanvasTheme");
        if (savedTheme === "light") {
            this.isDarkTheme = false;
        }
        this.applyTheme();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    window.NodesCanvas.settingsParams = new window.NodesCanvas.Settings();
});
