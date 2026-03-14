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
    }

    initEvents() {
        this.btnSettings.addEventListener("click", (e) => {
            e.stopPropagation();
            this.dropdown.classList.toggle("hidden");
        });

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

        const exportBtn = document.getElementById("btn-export-js");
        if (exportBtn) {
            exportBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                this.dropdown.classList.add("hidden");
                window.NodesCanvas.CodeInspector.toggle();
            });
        }

        document.addEventListener("click", (e) => {
            if (!this.dropdown.contains(e.target) && e.target !== this.btnSettings) {
                this.dropdown.classList.add("hidden");
            }
        });
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
