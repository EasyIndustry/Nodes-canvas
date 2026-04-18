// AuthPopup.js - Login and Signup modals.
// Talks to the active cloud backend via window.NodesCanvas.CloudManager
// (falls back to AuthManager for compatibility).

window.NodesCanvas = window.NodesCanvas || {};
window.NodesCanvas.Popups = window.NodesCanvas.Popups || {};

window.NodesCanvas.Popups.AuthPopup = class extends window.NodesCanvas.Popups.BasePopup {
    _cloud() {
        return window.NodesCanvas.CloudManager || window.NodesCanvas.AuthManager;
    }

    showLogin(onSuccess) {
        this._prepareOverlay('center', 'center');

        const modal = document.createElement('div');
        modal.className = 'node-form-modal glass-modal';
        modal.style.width = '320px';

        modal.innerHTML = `
            <div class="node-form-header">
                <span>Login</span>
                ${this._closeIcon()}
            </div>
            <div class="node-form-content">
                <div class="form-row">
                    <label>Email</label>
                    <input type="email" id="auth-email" placeholder="user@example.com">
                </div>
                <div class="form-row">
                    <label>Password</label>
                    <input type="password" id="auth-pass" placeholder="••••••••">
                </div>
                <div id="auth-error" style="color: #ff4d4d; font-size: 12px; margin-top: 8px; display: none;"></div>
            </div>
            <div class="form-actions" style="flex-direction: column; gap: 10px;">
                <button class="btn-primary" id="btn-auth-submit" style="width: 100%;">Login</button>
                <div style="font-size: 12px; opacity: 0.7; text-align: center;">
                    Don't have an account? <a href="#" id="link-goto-signup" style="color: var(--accent-color);">Sign Up</a>
                </div>
            </div>
        `;

        this._mount(modal);

        const btnSubmit = modal.querySelector('#btn-auth-submit');
        const errorEl = modal.querySelector('#auth-error');

        btnSubmit.addEventListener('click', async () => {
            const email = modal.querySelector('#auth-email').value;
            const pass = modal.querySelector('#auth-pass').value;

            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Authenticating...';

            const result = await this._cloud().login(email, pass);
            if (result.success) {
                if (onSuccess) onSuccess();
                this.close();
            } else {
                errorEl.textContent = result.error;
                errorEl.style.display = 'block';
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Login';
            }
        });

        modal.querySelector('#link-goto-signup').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignup(onSuccess);
        });

        this._bindClose(modal);
    }

    showSignup(onSuccess) {
        this._prepareOverlay('center', 'center');

        const modal = document.createElement('div');
        modal.className = 'node-form-modal glass-modal';
        modal.style.width = '320px';

        modal.innerHTML = `
            <div class="node-form-header">
                <span>Sign Up</span>
                ${this._closeIcon()}
            </div>
            <div class="node-form-content">
                <div class="form-row">
                    <label>Full Name</label>
                    <input type="text" id="auth-name" placeholder="John Doe">
                </div>
                <div class="form-row">
                    <label>Email</label>
                    <input type="email" id="auth-email" placeholder="user@example.com">
                </div>
                <div class="form-row">
                    <label>Password</label>
                    <input type="password" id="auth-pass" placeholder="••••••••">
                </div>
                <div id="auth-error" style="color: #ff4d4d; font-size: 12px; margin-top: 8px; display: none;"></div>
            </div>
            <div class="form-actions" style="flex-direction: column; gap: 10px;">
                <button class="btn-primary" id="btn-auth-submit" style="width: 100%;">Create Account</button>
                <div style="font-size: 12px; opacity: 0.7; text-align: center;">
                    Already have an account? <a href="#" id="link-goto-login" style="color: var(--accent-color);">Login</a>
                </div>
            </div>
        `;

        this._mount(modal);

        const btnSubmit = modal.querySelector('#btn-auth-submit');
        const errorEl = modal.querySelector('#auth-error');

        btnSubmit.addEventListener('click', async () => {
            const name = modal.querySelector('#auth-name').value;
            const email = modal.querySelector('#auth-email').value;
            const pass = modal.querySelector('#auth-pass').value;

            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Creating...';

            const result = await this._cloud().signup(name, email, pass);
            if (result.success) {
                if (onSuccess) onSuccess();
                this.close();
            } else {
                errorEl.textContent = result.error;
                errorEl.style.display = 'block';
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Create Account';
            }
        });

        modal.querySelector('#link-goto-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogin(onSuccess);
        });

        this._bindClose(modal);
    }
};
