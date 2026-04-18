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
        
        // CDN libs
        html += '<div class="lp-section">';
        html += '<h4 class="lp-section-title">CDN Libraries</h4>';
        for (var k = 0; k < cdns.length; k++) {
            var cdn = cdns[k];
            html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;">';
            html += '<input type="checkbox" class="lib-cdn-cb" data-lib="' + cdn.id + '">';
            html += '<span style="font-weight:600;font-size:13px;">' + cdn.name + '</span>';
            html += '<span style="font-size:11px;opacity:0.5;">' + cdn.description + '</span>';
            html += '</div>';
        }
        html += '</div>';
        
        html += '</div>'; // end content

        var div = document.createElement('div');
        div.id = 'libraries-panel';
        div.className = 'libraries-panel glass-panel hidden';
        div.innerHTML = html;
        document.body.appendChild(div);

        this.bindEvents();
    },

    bindEvents: function() {
        var self = this;
        
        // Close button
        var closeBtn = document.getElementById('lp-close-btn');
        if (closeBtn) {
            closeBtn.onclick = function() {
                console.log('[LibrariesPanel] Close button clicked');
                self.hide();
            };
        }
        
        // Checkboxes
        var checkboxes = document.querySelectorAll('.lib-cdn-cb');
        for (var i = 0; i < checkboxes.length; i++) {
            checkboxes[i].onchange = function() {
                var libId = this.getAttribute('data-lib');
                window.NodesCanvas.LibrariesManager.toggleCDN(libId);
                window.NodesCanvas.LibrariesManager.savePreferences();
            };
        }
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
