// LibrariesPanel.js - UI for managing libraries in custom nodes

window.NodesCanvas = window.NodesCanvas || {};

window.NodesCanvas.LibrariesPanel = {
    
    init: function() {
        console.log('[LibrariesPanel] Init');
    },

    show: function() {
        console.log('[LibrariesPanel] Show');
        var panel = document.getElementById('libraries-panel');
        
        if (!panel) {
            console.log('[LibrariesPanel] Creating panel');
            this.createPanel();
            panel = document.getElementById('libraries-panel');
        }
        
        panel.classList.remove('hidden');
        
        var sidebar = document.getElementById('left-sidebar');
        if (sidebar) {
            panel.style.left = (sidebar.offsetWidth + 10) + 'px';
        }
    },

    hide: function() {
        console.log('[LibrariesPanel] Hide');
        var panel = document.getElementById('libraries-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
    },

    toggle: function() {
        console.log('[LibrariesPanel] Toggle');
        var panel = document.getElementById('libraries-panel');
        if (panel && !panel.classList.contains('hidden')) {
            this.hide();
        } else {
            this.show();
        }
    },

    createPanel: function() {
        var existing = document.getElementById('libraries-panel');
        if (existing) {
            existing.parentNode.removeChild(existing);
        }

        var libs = window.NodesCanvas.LibrariesManager.getInternalLibs();
        var cdns = window.NodesCanvas.LibrariesManager.getCDNLibs();

        var html = '';
        
        // Header
        html += '<div class="lp-header">';
        html += '<span class="lp-title">Libraries</span>';
        html += '<button id="lp-close-btn" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0 8px;">×</button>';
        html += '</div>';
        
        // Content
        html += '<div class="lp-content">';
        
        // Built-in libs
        html += '<div class="lp-section">';
        html += '<h4 class="lp-section-title">Built-in</h4>';
        for (var i = 0; i < libs.length; i++) {
            var lib = libs[i];
            html += '<div style="margin-bottom:12px;">';
            html += '<div style="font-weight:600;font-size:13px;color:#00dc82;">' + lib.name + '</div>';
            html += '<div style="font-size:11px;opacity:0.5;margin-bottom:6px;">' + lib.description + '</div>';
            var fns = Object.keys(lib.functions);
            for (var j = 0; j < fns.length; j++) {
                var fn = lib.functions[fns[j]];
                html += '<div style="font-size:11px;font-family:monospace;color:#888;padding:2px 0;">';
                html += '<span style="color:#00dc82;">' + fns[j] + '</span>' + fn.signature;
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div>';
        
        // Search libs
        html += '<div class="lp-section">';
        html += '<h4 class="lp-section-title">NPM / CDN Buscar</h4>';
        html += '<input type="text" id="lp-search-input" placeholder="Buscar librería (ej. lodash)..." style="width:100%; border:1px solid #333; background:#1e1e1e; color:#fff; font-size:12px; border-radius:4px; padding:6px; margin-bottom:8px; outline:none;" autocomplete="off">';
        html += '<div id="lp-search-results" style="max-height: 150px; overflow-y: auto;"></div>';
        html += '</div>';
        
        // Workspace libs
        html += '<div class="lp-section">';
        html += '<h4 class="lp-section-title">Instaladas en Workspace</h4>';
        html += '<div id="lp-installed-libs">Cargando...</div>';
        html += '</div>';
        
        html += '</div>'; // end content

        var div = document.createElement('div');
        div.id = 'libraries-panel';
        div.className = 'libraries-panel glass-panel hidden';
        div.innerHTML = html;
        document.body.appendChild(div);

        this.bindEvents();
        this.renderInstalledLibs();
    },

    renderInstalledLibs: async function() {
        var wm = window.NodesCanvas.workspaceManager;
        var container = document.getElementById('lp-installed-libs');
        if (!container) return;
        
        if (!wm || !wm.isReady) {
            container.innerHTML = '<div style="font-size:11px;opacity:0.5;">Workspace no disponible</div>';
            return;
        }

        try {
            var files = await wm.listLibs();
            if (files.length === 0) {
                container.innerHTML = '<div style="font-size:11px;opacity:0.5;">No hay librerías instaladas</div>';
                return;
            }

            var html = '';
            files.forEach(f => {
                html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0;">';
                html += '<span style="font-size:12px; font-weight:bold; color:#00dc82;">' + f + '</span>';
                html += '<button class="btn btn-sm btn-ghost btn-del-lib" data-file="' + f + '" style="color:#ef4444; padding:2px 6px;">Eliminar</button>';
                html += '</div>';
            });
            container.innerHTML = html;

            var delBtns = container.querySelectorAll('.btn-del-lib');
            delBtns.forEach(btn => {
                btn.onclick = async function() {
                    var file = this.getAttribute('data-file');
                    if(confirm("¿Eliminar " + file + "? Se requerirá recargar la página para limpiar memoria.")) {
                        await wm.deleteLib(file);
                        window.NodesCanvas.LibrariesPanel.renderInstalledLibs();
                    }
                };
            });
        } catch(e) {
            container.innerHTML = '<div style="font-size:11px;opacity:0.5;">Error al cargar</div>';
        }
    },

    bindEvents: function() {
        var self = this;
        
        // Close button
        var closeBtn = document.getElementById('lp-close-btn');
        if (closeBtn) {
            closeBtn.onclick = function() {
                self.hide();
            };
        }
        
        // Search Input
        var searchInput = document.getElementById('lp-search-input');
        if (searchInput) {
            var debounceTimer;
            searchInput.onkeyup = function(e) {
                if (e.key === 'Enter') {
                    self.searchLibs(this.value);
                } else {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        if (this.value.length >= 3) {
                            self.searchLibs(this.value);
                        } else if (this.value.length === 0) {
                            document.getElementById('lp-search-results').innerHTML = '';
                        }
                    }, 500);
                }
            };
        }
    },

    searchLibs: function(query) {
        if (!query.trim()) return;
        var resultsCont = document.getElementById('lp-search-results');
        resultsCont.innerHTML = '<div style="font-size:11px;opacity:0.5;">Buscando...</div>';
        
        fetch('https://api.cdnjs.com/libraries?search=' + encodeURIComponent(query) + '&fields=version,description&limit=10')
            .then(res => res.json())
            .then(data => {
                resultsCont.innerHTML = '';
                if (!data.results || data.results.length === 0) {
                    resultsCont.innerHTML = '<div style="font-size:11px;opacity:0.5;">No se encontraron resultados</div>';
                    return;
                }
                
                data.results.forEach(lib => {
                    var row = document.createElement('div');
                    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid #333;';
                    
                    row.innerHTML = `
                        <div style="flex:1; margin-right:8px; overflow:hidden;">
                            <div style="font-weight:600;font-size:13px;color:#ececf1;">${lib.name} <span style="font-size:10px;color:#00dc82;">v${lib.version}</span></div>
                            <div style="font-size:11px;opacity:0.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${lib.description || ''}">${lib.description || ''}</div>
                        </div>
                        <button class="btn btn-sm btn-ghost btn-install" style="color:#00dc82; padding:4px 8px; font-weight:bold;">Add</button>
                    `;
                    
                    row.querySelector('.btn-install').onclick = async function() {
                        this.textContent = '...';
                        try {
                            var wm = window.NodesCanvas.workspaceManager;
                            if (!wm || !wm.isReady) {
                                alert("Workspace no está listo/soportado.");
                                this.textContent = 'Error';
                                return;
                            }
                            
                            var res = await fetch('https://api.cdnjs.com/libraries/' + lib.name + '?fields=latest');
                            var libData = await res.json();
                            var url = libData.latest;
                            if(!url) throw new Error("URL no encontrada");
                            
                            var sourceRes = await fetch(url);
                            var sourceCode = await sourceRes.text();
                            
                            // Save to workspace
                            await wm.saveLib(lib.name + '.js', sourceCode);
                            
                            // Inject instantly
                            await wm.injectLib(lib.name + '.js');
                            
                            this.textContent = 'Ok';
                            this.style.color = '#fff';
                            this.disabled = true;
                            
                            window.NodesCanvas.LibrariesPanel.renderInstalledLibs();
                        } catch(err) {
                            console.error(err);
                            this.textContent = 'Err';
                        }
                    };
                    
                    resultsCont.appendChild(row);
                });
            })
            .catch(err => {
                resultsCont.innerHTML = '<div style="font-size:11px;color:#ef4444;">Error al buscar</div>';
            });
    }
};

// Global event handlers (these MUST be at global level)
document.addEventListener('click', function(e) {
    var panel = document.getElementById('libraries-panel');
    if (!panel) return;
    
    // Close button
    if (e.target.closest && e.target.closest('#lp-close-btn')) {
        console.log('[LibrariesPanel] Document click - close button');
        document.getElementById('libraries-panel').classList.add('hidden');
        return;
    }
    
    // Toggle button in sidebar
    // Event is already handled by Sidebar.js, so we just return to prevent double toggling and prevent the "click outside" logic below.
    if (e.target.closest && e.target.closest('#btn-open-libraries')) {
        return;
    }
    
    // Click outside to close
    if (!panel.classList.contains('hidden') && !panel.contains(e.target)) {
        console.log('[LibrariesPanel] Click outside - hiding');
        panel.classList.add('hidden');
    }
});

// Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        var panel = document.getElementById('libraries-panel');
        if (panel && !panel.classList.contains('hidden')) {
            console.log('[LibrariesPanel] Escape pressed');
            panel.classList.add('hidden');
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('[LibrariesPanel] DOM ready');
});
