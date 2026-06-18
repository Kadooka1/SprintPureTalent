/*
    Designed by: SELECTO
    Original image: https://dribbble.com/shots/5311359-Diprella-Login
*/

/* ─── Animação original (preservada) ─── */
let switchCtn    = document.querySelector("#switch-cnt");
let switchC1     = document.querySelector("#switch-c1");
let switchC2     = document.querySelector("#switch-c2");
let switchCircle = document.querySelectorAll(".switch__circle");
let switchBtn    = document.querySelectorAll(".switch-btn");
let aContainer   = document.querySelector("#a-container");
let bContainer   = document.querySelector("#b-container");
let allButtons   = document.querySelectorAll(".submit");

let getButtons = (e) => e.preventDefault();

let changeForm = (e) => {
    switchCtn.classList.add("is-gx");
    setTimeout(function() { switchCtn.classList.remove("is-gx"); }, 1500);

    switchCtn.classList.toggle("is-txr");
    switchCircle[0].classList.toggle("is-txr");
    switchCircle[1].classList.toggle("is-txr");

    switchC1.classList.toggle("is-hidden");
    switchC2.classList.toggle("is-hidden");
    aContainer.classList.toggle("is-txl");
    bContainer.classList.toggle("is-txl");
    bContainer.classList.toggle("is-z200");
};

/* ─── Força da senha ─── */
const strengthColors = ['', '#d32f2f', '#e65100', '#f9a825', '#2e7d32'];
const strengthLabels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];

function getStrength(password) {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;
    if (password.length >= 12) score++;
    return score;
}

function updateStrengthBar(password, wrapperId, labelId) {
    const wrapper = document.getElementById(wrapperId);
    const label   = document.getElementById(labelId);
    if (!wrapper) return;
    if (!password) { wrapper.style.display = 'none'; return; }
    wrapper.style.display = 'flex';
    const strength = getStrength(password);
    const color    = strengthColors[strength];
    wrapper.querySelectorAll('.strength-segment').forEach((seg, i) => {
        seg.style.background = i < strength ? color : '#e8ecf4';
    });
    label.textContent = strengthLabels[strength];
    label.style.color = color;
}

/* ─── Máscara CNPJ ─── */
function maskCNPJ(value) {
    return value.replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 18);
}

/* ─── Validação CNPJ ─── */
function validateCNPJ(cnpj) {
    const d = cnpj.replace(/[^\d]/g, '');
    if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
    let sum = 0, w = 5;
    for (let i = 0; i < 12; i++) { sum += d[i] * w; w = w === 2 ? 9 : w - 1; }
    const d1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(d[12]) !== d1) return false;
    sum = 0; w = 6;
    for (let i = 0; i < 13; i++) { sum += d[i] * w; w = w === 2 ? 9 : w - 1; }
    const d2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return parseInt(d[13]) === d2;
}

/* ─── Helpers de erro ─── */
function setFieldError(fieldName, msg) {
    const errEl   = document.getElementById('err-' + fieldName);
    const inputEl = document.querySelector('[name="' + fieldName + '"]');
    if (errEl)   errEl.textContent = msg;
    if (inputEl) msg ? inputEl.classList.add('error') : inputEl.classList.remove('error');
}

function clearErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-control').forEach(el => el.classList.remove('error'));
    const regErr = document.getElementById('reg-error');
    if (regErr) regErr.style.display = 'none';
}

/* ─── Validação Candidato ─── */
function validateCandidate() {
    const name    = document.querySelector('[name="full_name"]').value.trim();
    const email   = document.querySelector('[name="email"]').value.trim();
    const birth   = document.querySelector('[name="birth_date"]').value;
    const pass    = document.querySelector('[name="password"]').value;
    const confirm = document.querySelector('[name="confirm_password"]').value;
    let ok = true;

    if (!name) { setFieldError('full_name', 'Nome é obrigatório.'); ok = false; }
    else if (name.length < 3) { setFieldError('full_name', 'Mínimo 3 caracteres.'); ok = false; }

    if (!email) { setFieldError('email', 'E-mail é obrigatório.'); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('email', 'E-mail inválido.'); ok = false; }

    if (!birth) { setFieldError('birth_date', 'Data de nascimento é obrigatória.'); ok = false; }
    else {
        const d = new Date(birth), minDate = new Date();
        minDate.setFullYear(minDate.getFullYear() - 16);
        if (d > minDate) { setFieldError('birth_date', 'Você deve ter pelo menos 16 anos.'); ok = false; }
    }

    if (!pass) { setFieldError('password', 'Senha é obrigatória.'); ok = false; }
    else if (pass.length < 8) { setFieldError('password', 'Mínimo 8 caracteres.'); ok = false; }
    else if (!/\d/.test(pass)) { setFieldError('password', 'Inclua ao menos um número.'); ok = false; }
    else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass)) { setFieldError('password', 'Inclua ao menos um caractere especial.'); ok = false; }

    if (pass !== confirm) { setFieldError('confirm_password', 'As senhas não coincidem.'); ok = false; }

    return ok;
}

/* ─── Validação Empresa ─── */
function validateCompany() {
    const legal   = document.querySelector('[name="legal_name"]').value.trim();
    const trade   = document.querySelector('[name="trade_name"]').value.trim();
    const cnpj    = document.querySelector('[name="cnpj"]').value.trim();
    const size    = document.querySelector('[name="size"]').value;
    const email   = document.querySelector('[name="co_email"]').value.trim();
    const sector  = document.querySelector('[name="sector"]').value.trim();
    const pass    = document.querySelector('[name="co_password"]').value;
    const confirm = document.querySelector('[name="co_confirm_password"]').value;
    let ok = true;

    if (!legal)  { setFieldError('legal_name', 'Razão social é obrigatória.'); ok = false; }
    if (!trade)  { setFieldError('trade_name', 'Nome fantasia é obrigatório.'); ok = false; }

    if (!cnpj)   { setFieldError('cnpj', 'CNPJ é obrigatório.'); ok = false; }
    else if (!validateCNPJ(cnpj)) { setFieldError('cnpj', 'CNPJ inválido.'); ok = false; }

    if (!size)   { setFieldError('size', 'Selecione o porte.'); ok = false; }

    if (!email)  { setFieldError('co_email', 'E-mail é obrigatório.'); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('co_email', 'E-mail inválido.'); ok = false; }

    if (!sector) { setFieldError('sector', 'Setor é obrigatório.'); ok = false; }

    if (!pass)   { setFieldError('co_password', 'Senha é obrigatória.'); ok = false; }
    else if (pass.length < 8) { setFieldError('co_password', 'Mínimo 8 caracteres.'); ok = false; }
    else if (!/\d/.test(pass)) { setFieldError('co_password', 'Inclua ao menos um número.'); ok = false; }
    else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass)) { setFieldError('co_password', 'Inclua ao menos um caractere especial.'); ok = false; }

    if (pass !== confirm) { setFieldError('co_confirm_password', 'As senhas não coincidem.'); ok = false; }

    return ok;
}

/* ─── Init ─── */
let mainF = () => {
    /* Login: comportamento original */
    for (let i = 0; i < allButtons.length; i++)
        allButtons[i].addEventListener("click", getButtons);
    for (let i = 0; i < switchBtn.length; i++)
        switchBtn[i].addEventListener("click", changeForm);

    /* Abas Candidato / Empresa */
    const submitBtn = document.getElementById('reg-submit-btn');
    document.querySelectorAll('.reg-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.reg-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.reg-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById('panel-' + tab.dataset.tab);
            if (panel) panel.classList.add('active');
            if (submitBtn) {
                submitBtn.textContent = tab.dataset.tab === 'company' ? 'Cadastrar Empresa' : 'Criar Conta';
                tab.dataset.tab === 'company' ? submitBtn.classList.add('btn-full') : submitBtn.classList.remove('btn-full');
            }
            clearErrors();
        });
    });

    /* Toggle mostrar/ocultar senha */
    document.querySelectorAll('.btn-toggle-pass').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;
            const isPass = input.type === 'password';
            input.type = isPass ? 'text' : 'password';
            btn.textContent = isPass ? '🙈' : '👁️';
        });
    });

    /* Barra de força — Candidato */
    const rcPass = document.getElementById('rc-pass');
    if (rcPass) rcPass.addEventListener('input', function() {
        updateStrengthBar(this.value, 'strength-candidate', 'strength-label-candidate');
    });

    /* Barra de força — Empresa */
    const coPass = document.getElementById('co-pass');
    if (coPass) coPass.addEventListener('input', function() {
        updateStrengthBar(this.value, 'strength-company', 'strength-label-company');
    });

    /* Máscara CNPJ */
    const cnpjInput = document.getElementById('co-cnpj');
    if (cnpjInput) cnpjInput.addEventListener('input', function() {
        this.value = maskCNPJ(this.value);
    });

    /* Submit do cadastro */
    if (submitBtn) {
        submitBtn.addEventListener('click', e => {
            e.preventDefault();
            clearErrors();
            const activeTab = document.querySelector('.reg-tab.active');
            const isCompany = activeTab && activeTab.dataset.tab === 'company';
            const valid = isCompany ? validateCompany() : validateCandidate();
            if (!valid) return;
            /* Conectar ao backend aqui */
        });
    }
};

window.addEventListener("load", mainF);
