// SliderFormPopup.js - Grasshopper-style slider settings modal.

window.NodesCanvas = window.NodesCanvas || {};
window.NodesCanvas.Popups = window.NodesCanvas.Popups || {};

window.NodesCanvas.Popups.SliderFormPopup = class extends window.NodesCanvas.Popups.BasePopup {
    show(sliderInstance, onSave) {
        this._prepareOverlay('center', 'center');

        const config = {
            label: sliderInstance.title,
            min: sliderInstance.config.min,
            max: sliderInstance.config.max,
            step: sliderInstance.config.step,
            value: sliderInstance.value,
            rounding: sliderInstance.rounding || 'R',
            precision: sliderInstance.precision || 2
        };

        const modal = document.createElement('div');
        modal.className = 'node-form-modal slider-form-modal glass-modal';
        modal.style.width = '360px';

        modal.innerHTML = `
            <div class="node-form-header">
                <span>Slider Settings</span>
                ${this._closeIcon()}
            </div>

            <div class="node-form-content">
                <div class="form-row">
                    <label>Name</label>
                    <input type="text" id="sld-name" value="${config.label}">
                </div>

                <div class="form-section-title">Rounding</div>
                <div class="rounding-options">
                    <button class="round-btn ${config.rounding === 'R' ? 'active' : ''}" data-type="R" title="Floating Point (Real)">R</button>
                    <button class="round-btn ${config.rounding === 'N' ? 'active' : ''}" data-type="N" title="Integers">N</button>
                    <button class="round-btn ${config.rounding === 'E' ? 'active' : ''}" data-type="E" title="Even Integers">E</button>
                    <button class="round-btn ${config.rounding === 'O' ? 'active' : ''}" data-type="O" title="Odd Integers">O</button>
                </div>

                <div class="form-row" id="precision-row" style="display: ${config.rounding === 'R' ? 'flex' : 'none'}">
                    <label>Precision (decimals)</label>
                    <input type="number" id="sld-precision" value="${config.precision}" min="0" max="6">
                </div>

                <div class="form-section-title">Numeric Domain</div>
                <div class="domain-grid">
                    <div class="form-row">
                        <label>Min</label>
                        <input type="number" id="sld-min" value="${config.min}">
                    </div>
                    <div class="form-row">
                        <label>Max</label>
                        <input type="number" id="sld-max" value="${config.max}">
                    </div>
                </div>

                <div class="form-row" style="margin-top: 10px;">
                    <label>Current Value</label>
                    <input type="number" id="sld-val" value="${config.value}">
                </div>
            </div>

            <div class="form-actions">
                <button class="btn-secondary" id="btn-cancel">Cancel</button>
                <button class="btn-primary" id="btn-save">Apply</button>
            </div>
        `;

        const roundBtns = modal.querySelectorAll('.round-btn');
        let currentRounding = config.rounding;
        const precRow = modal.querySelector('#precision-row');

        roundBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                roundBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentRounding = btn.dataset.type;
                precRow.style.display = currentRounding === 'R' ? 'flex' : 'none';
            });
        });

        modal.querySelector('#btn-save').addEventListener('click', () => {
            const finalConfig = {
                label: modal.querySelector('#sld-name').value.trim() || 'Slider',
                min: parseFloat(modal.querySelector('#sld-min').value) || 0,
                max: parseFloat(modal.querySelector('#sld-max').value) || 100,
                value: parseFloat(modal.querySelector('#sld-val').value) || 0,
                rounding: currentRounding,
                precision: parseInt(modal.querySelector('#sld-precision').value) || 0
            };

            if (finalConfig.rounding === 'R') {
                finalConfig.step = Math.pow(10, -finalConfig.precision);
            } else {
                finalConfig.step = (finalConfig.rounding === 'E' || finalConfig.rounding === 'O') ? 2 : 1;
                if (finalConfig.rounding === 'N') finalConfig.value = Math.round(finalConfig.value);
                if (finalConfig.rounding === 'E') finalConfig.value = Math.round(finalConfig.value / 2) * 2;
                if (finalConfig.rounding === 'O') finalConfig.value = Math.round((finalConfig.value - 1) / 2) * 2 + 1;
            }

            if (onSave) onSave(finalConfig);
            this.close();
        });

        this._bindClose(modal, ['.close-btn', '#btn-cancel']);
        this._mount(modal);
    }
};
