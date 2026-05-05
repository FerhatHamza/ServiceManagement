// ======================= CONFIGURATION =======================
const API_BASE = 'https://blue-firefly-9e2d.didcrist.workers.dev/api';

// ======================= VARIABLES GLOBALES =======================
let currentUser = null;
let currentView = '';

// ======================= FONCTIONS API =======================
async function apiFetch(url, options = {}) {
    try {
        const res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || 'Erreur réseau');
        }
        return await res.json();
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

// Récupération des données pour le consultant (public)
async function loadPublicData() {
    try {
        const [tests, rxStatus] = await Promise.all([
            apiFetch(`${API_BASE}/tests`),
            apiFetch(`${API_BASE}/rx-status`),
        ]);
        return { tests, rxStatus };
    } catch {
        return { tests: [], rxStatus: { isWorking: false } };
    }
}

// ======================= AFFICHAGE PUBLIC (CONSULTANT) =======================
async function renderPublicConsultant() {
    const { tests, rxStatus } = await loadPublicData();
    const activeTests = tests.filter(t => t.isActive);
    const inactiveTests = tests.filter(t => !t.isActive);

    const container = document.getElementById('publicConsultantView');
    container.innerHTML = `
        <!-- Rx Status -->
        <div class="card p-5 mb-6 ${rxStatus.isWorking ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}">
            <div class="flex items-center gap-4">
                <span class="pulse-dot ${rxStatus.isWorking ? 'active' : 'inactive'}"></span>
                <div>
                    <p class="font-bold ${rxStatus.isWorking ? 'text-emerald-700' : 'text-red-700'}">
                        Service Pharmacie : ${rxStatus.isWorking ? 'Opérationnel ✓' : 'Indisponible ✕'}
                    </p>
                    <p class="text-xs ${rxStatus.isWorking ? 'text-emerald-600' : 'text-red-500'}">
                        ${rxStatus.isWorking ? 'Vous pouvez envoyer des ordonnances.' : 'Merci de ne pas envoyer de prescriptions actuellement.'}
                    </p>
                </div>
            </div>
        </div>

        <!-- Tests disponibles -->
        <h2 class="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
            <span class="w-3 h-3 bg-emerald-500 rounded-full"></span> Tests disponibles (${activeTests.length})
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            ${activeTests.map(t => `
                <div class="card p-4 border-l-4 border-l-emerald-400">
                    <p class="font-semibold text-slate-800 text-sm">${t.name}</p>
                    <span class="text-xs text-slate-400">${t.category}</span>
                </div>
            `).join('')}
            ${activeTests.length === 0 ? '<p class="text-slate-400 text-sm col-span-full text-center py-6">Aucun test disponible pour le moment.</p>' : ''}
        </div>

        ${inactiveTests.length > 0 ? `
        <h2 class="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2 opacity-70">
            <span class="w-3 h-3 bg-red-400 rounded-full"></span> Tests indisponibles (${inactiveTests.length})
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60">
            ${inactiveTests.map(t => `
                <div class="card p-4 border-l-4 border-l-red-300 bg-slate-50">
                    <p class="font-semibold text-slate-500 text-sm">${t.name}</p>
                    <span class="text-xs text-slate-400">${t.category}</span>
                </div>
            `).join('')}
        </div>
        ` : ''}
    `;
}

// ======================= AUTHENTIFICATION =======================
async function login(email, password) {
    try {
        const user = await apiFetch(`${API_BASE}/login`, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        currentUser = user;
        return user;
    } catch {
        return null;
    }
}

function logout() {
    currentUser = null;
    currentView = '';
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('publicPage').classList.remove('hidden');
    document.getElementById('sidebar').classList.add('sidebar-mobile-hidden');
    document.getElementById('sidebarOverlay').classList.add('hidden');
    renderPublicConsultant();
}

// ======================= INTERFACE EMPLOYÉE =======================
function showLoginScreen() {
    document.getElementById('publicPage').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}

function showApp() {
    document.getElementById('publicPage').classList.add('hidden');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
}

function updateSidebarInfo() {
    if (!currentUser) return;
    document.getElementById('sidebarUserName').textContent = currentUser.name;
    document.getElementById('sidebarUserEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    const roles = { admin: 'Administrateur', lab: 'Laboratoire', rx: 'Pharmacie' };
    document.getElementById('sidebarRole').textContent = roles[currentUser.role] || currentUser.role;

    const nav = document.getElementById('sidebarNav');
    let navItems = [];
    switch (currentUser.role) {
        case 'admin':
            navItems = [
                { view: 'adminDashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1', label: 'Tableau de bord' },
                { view: 'adminUsers', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z', label: 'Utilisateurs' },
                { view: 'adminServices', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', label: 'Services' },
            ];
            break;
        case 'lab':
            navItems = [{ view: 'labTests', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Gestion des tests' }];
            break;
        case 'rx':
            navItems = [{ view: 'rxStatus', icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'État Pharmacie' }];
            break;
    }
    nav.innerHTML = navItems.map(item => `
        <div class="nav-item flex items-center gap-3 px-4 py-3 text-slate-300 text-sm" data-view="${item.view}" onclick="switchView('${item.view}')">
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="${item.icon}" /></svg>
            <span>${item.label}</span>
        </div>
    `).join('');
}

function switchView(viewName) {
    currentView = viewName;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById({
        adminDashboard: 'viewAdminDashboard',
        adminUsers: 'viewAdminUsers',
        adminServices: 'viewAdminServices',
        labTests: 'viewLabTests',
        rxStatus: 'viewRxStatus',
    }[viewName]);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`[data-view="${viewName}"]`);
    if (activeNav) activeNav.classList.add('active');

    document.getElementById('pageTitleMobile').textContent = {
        adminDashboard: 'Tableau de bord',
        adminUsers: 'Gestion des utilisateurs',
        adminServices: 'Services',
        labTests: 'Gestion des tests',
        rxStatus: 'État Pharmacie',
    }[viewName] || '';

    if (window.innerWidth < 1024) {
        document.getElementById('sidebar').classList.add('sidebar-mobile-hidden');
        document.getElementById('sidebarOverlay').classList.add('hidden');
    }
    renderView(viewName);
}

// ======================= RENDU DES VUES (avec appels API) =======================
async function renderView(viewName) {
    switch (viewName) {
        case 'adminDashboard': await renderAdminDashboard(); break;
        case 'adminUsers': await renderAdminUsers(); break;
        case 'adminServices': await renderAdminServices(); break;
        case 'labTests': await renderLabTests(); break;
        case 'rxStatus': await renderRxStatus(); break;
    }
}

async function renderAdminDashboard() {
    try {
        const [users, tests, rxStatus] = await Promise.all([
            apiFetch(`${API_BASE}/users`),
            apiFetch(`${API_BASE}/tests`),
            apiFetch(`${API_BASE}/rx-status`),
        ]);
        const totalUsers = users.length;
        const totalTests = tests.length;
        const activeTests = tests.filter(t => t.isActive).length;
        const rxWorking = rxStatus.isWorking;
        document.getElementById('viewAdminDashboard').innerHTML = `
            <h2 class="text-2xl font-bold mb-6">Tableau de bord administrateur</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div class="card stat-card p-5" style="border-left-color:#0ea5e9"><p class="text-slate-500 text-xs">Utilisateurs</p><p class="text-3xl font-bold">${totalUsers}</p></div>
                <div class="card stat-card p-5" style="border-left-color:#10b981"><p class="text-slate-500 text-xs">Tests actifs</p><p class="text-3xl font-bold">${activeTests}/${totalTests}</p></div>
                <div class="card stat-card p-5" style="border-left-color:${rxWorking?'#10b981':'#ef4444'}"><p class="text-slate-500 text-xs">Pharmacie</p><p class="text-3xl font-bold ${rxWorking?'text-emerald-600':'text-red-500'}">${rxWorking?'Actif':'Inactif'}</p></div>
                <div class="card stat-card p-5" style="border-left-color:#8b5cf6"><p class="text-slate-500 text-xs">Total services</p><p class="text-3xl font-bold">${totalTests+1}</p></div>
            </div>
        `;
    } catch { /* gestion d'erreur silencieuse */ }
}

async function renderAdminUsers() {
    try {
        const users = await apiFetch(`${API_BASE}/users`);
        const container = document.getElementById('viewAdminUsers');
        container.innerHTML = `
            <div class="flex justify-between mb-4"><h2 class="text-2xl font-bold">Utilisateurs</h2><button onclick="openAddUserModal()" class="px-5 py-2.5 bg-primary-500 text-white rounded-xl">+ Ajouter</button></div>
            <div class="card overflow-hidden"><div class="responsive-table">
            <table class="w-full text-sm"><thead class="bg-slate-50"><tr><th class="p-4 text-left">Nom</th><th class="p-4 text-left">Email</th><th class="p-4 text-left">Rôle</th><th class="p-4 text-right">Actions</th></tr></thead>
            <tbody>${users.map(u=>`<tr class="border-b"><td class="p-4">${u.name}</td><td class="p-4">${u.email}</td><td class="p-4"><span class="badge-role bg-slate-200">${u.role}</span></td><td class="p-4 text-right"><button onclick="openEditUserModal('${u.id}')" class="text-primary-600 mr-3">Modifier</button><button onclick="deleteUser('${u.id}')" class="text-red-500">Supprimer</button></td></tr>`).join('')}</tbody></table>
            </div></div>
        `;
    } catch { }
}

async function renderAdminServices() {
    try {
        const tests = await apiFetch(`${API_BASE}/tests`);
        const container = document.getElementById('viewAdminServices');
        container.innerHTML = `
            <div class="flex justify-between mb-4"><h2 class="text-2xl font-bold">Services</h2><button onclick="openAddTestModal()" class="px-5 py-2.5 bg-primary-500 text-white rounded-xl">+ Ajouter un test</button></div>
            <div class="card overflow-hidden"><div class="responsive-table">
            <table class="w-full text-sm"><thead class="bg-slate-50"><tr><th class="p-4 text-left">Test</th><th class="p-4 text-left">Catégorie</th><th class="p-4 text-left">Statut</th><th class="p-4 text-right">Actions</th></tr></thead>
            <tbody>${tests.map(t=>`<tr class="border-b"><td class="p-4">${t.name}</td><td class="p-4">${t.category}</td><td class="p-4"><span class="${t.isActive?'text-emerald-600 bg-emerald-50':'text-red-500 bg-red-50'} px-2 py-1 rounded-full text-xs">${t.isActive?'Actif':'Inactif'}</span></td><td class="p-4 text-right"><button onclick="toggleLabTest('${t.id}', ${!t.isActive})" class="text-primary-600 mr-3">${t.isActive?'Désactiver':'Activer'}</button><button onclick="deleteTest('${t.id}')" class="text-red-500">Supprimer</button></td></tr>`).join('')}</tbody></table>
            </div></div>
        `;
    } catch { }
}

async function renderLabTests() {
    try {
        const tests = await apiFetch(`${API_BASE}/tests`);
        const container = document.getElementById('viewLabTests');
        container.innerHTML = `
            <h2 class="text-2xl font-bold mb-6">Gestion des tests de laboratoire</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${tests.map(t=>`
                    <div class="card p-5 ${t.isActive?'border-l-4 border-l-emerald-400':'border-l-4 border-l-red-300'}">
                        <div class="flex justify-between mb-2"><h4 class="font-semibold">${t.name}</h4>
                        <label class="toggle-switch"><input type="checkbox" ${t.isActive?'checked':''} onchange="toggleLabTest('${t.id}', this.checked)"><span class="toggle-slider"></span></label></div>
                        <p class="text-xs text-slate-400">${t.category}</p>
                    </div>
                `).join('')}
            </div>
        `;
    } catch { }
}

async function renderRxStatus() {
    try {
        const rx = await apiFetch(`${API_BASE}/rx-status`);
        document.getElementById('viewRxStatus').innerHTML = `
            <h2 class="text-2xl font-bold mb-6">État du service Pharmacie</h2>
            <div class="card p-8 max-w-md mx-auto text-center">
                <div class="w-20 h-20 ${rx.isWorking?'bg-emerald-100':'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-5">
                    <span class="pulse-dot ${rx.isWorking?'active':'inactive'}" style="width:24px;height:24px;"></span>
                </div>
                <h3 class="text-xl font-bold mb-2">${rx.isWorking?'Service opérationnel':'Service indisponible'}</h3>
                <label class="toggle-switch mx-auto" style="width:64px;height:34px;">
                    <input type="checkbox" ${rx.isWorking?'checked':''} onchange="toggleRxService(this.checked)">
                    <span class="toggle-slider" style="border-radius:34px;"></span>
                </label>
                <p class="text-xs text-slate-400 mt-4">Dernière mise à jour : ${rx.updatedAt}</p>
            </div>
        `;
    } catch { }
}

// ======================= ACTIONS (avec API) =======================
async function toggleLabTest(testId, isActive) {
    try {
        await apiFetch(`${API_BASE}/tests/${testId}`, {
            method: 'PUT',
            body: JSON.stringify({ isActive }),
        });
        showToast(`Test ${isActive ? 'activé' : 'désactivé'}`, isActive ? 'success' : 'warning');
        renderView(currentView);
        renderPublicConsultant();
    } catch { }
}

async function toggleRxService(isWorking) {
    try {
        await apiFetch(`${API_BASE}/rx-status`, {
            method: 'PUT',
            body: JSON.stringify({ isWorking }),
        });
        showToast(`Service Pharmacie ${isWorking ? 'activé' : 'désactivé'}`, isWorking ? 'success' : 'error');
        renderView(currentView);
        renderPublicConsultant();
    } catch { }
}

async function deleteTest(testId) {
    if (!confirm('Supprimer ce test ?')) return;
    try {
        await apiFetch(`${API_BASE}/tests/${testId}`, { method: 'DELETE' });
        showToast('Test supprimé', 'info');
        renderView('adminServices');
        renderPublicConsultant();
    } catch { }
}

function openAddTestModal() {
    const body = `
        <div><label class="block text-sm font-medium mb-1">Nom du test</label><input id="newTestName" class="w-full px-4 py-2.5 border rounded-xl"></div>
        <div class="mt-3"><label class="block text-sm font-medium mb-1">Catégorie</label><input id="newTestCategory" class="w-full px-4 py-2.5 border rounded-xl"></div>
    `;
    openModal('Ajouter un test', body, async () => {
        const name = document.getElementById('newTestName').value.trim();
        const category = document.getElementById('newTestCategory').value.trim();
        if (!name || !category) return showToast('Veuillez remplir tous les champs', 'error');
        try {
            await apiFetch(`${API_BASE}/tests`, {
                method: 'POST',
                body: JSON.stringify({ name, category }),
            });
            closeModal();
            showToast('Test ajouté', 'success');
            renderView('adminServices');
            renderPublicConsultant();
        } catch { }
    });
}

function openAddUserModal() {
    const body = `
        <div><label>Nom</label><input id="newUserName" class="w-full px-4 py-2.5 border rounded-xl"></div>
        <div class="mt-3"><label>Email</label><input id="newUserEmail" type="email" class="w-full px-4 py-2.5 border rounded-xl"></div>
        <div class="mt-3"><label>Mot de passe</label><input id="newUserPassword" type="text" class="w-full px-4 py-2.5 border rounded-xl"></div>
        <div class="mt-3"><label>Rôle</label><select id="newUserRole" class="w-full px-4 py-2.5 border rounded-xl"><option value="admin">Administrateur</option><option value="lab">Laboratoire</option><option value="rx">Pharmacie</option></select></div>
    `;
    openModal('Ajouter un utilisateur', body, async () => {
        const name = document.getElementById('newUserName').value.trim();
        const email = document.getElementById('newUserEmail').value.trim();
        const password = document.getElementById('newUserPassword').value.trim();
        const role = document.getElementById('newUserRole').value;
        if (!name || !email || !password) return showToast('Champs requis', 'error');
        try {
            await apiFetch(`${API_BASE}/users`, {
                method: 'POST',
                body: JSON.stringify({ name, email, password, role }),
            });
            closeModal();
            showToast('Utilisateur créé', 'success');
            renderView('adminUsers');
        } catch { }
    });
}

async function openEditUserModal(userId) {
    try {
        const users = await apiFetch(`${API_BASE}/users`);
        const user = users.find(u => u.id === userId);
        if (!user) return;
        const body = `
            <div><label>Nom</label><input id="editUserName" value="${user.name}" class="w-full px-4 py-2.5 border rounded-xl"></div>
            <div class="mt-3"><label>Email</label><input id="editUserEmail" value="${user.email}" class="w-full px-4 py-2.5 border rounded-xl"></div>
            <div class="mt-3"><label>Mot de passe</label><input id="editUserPassword" value="${user.password}" class="w-full px-4 py-2.5 border rounded-xl"></div>
            <div class="mt-3"><label>Rôle</label><select id="editUserRole" class="w-full px-4 py-2.5 border rounded-xl">
                <option value="admin" ${user.role==='admin'?'selected':''}>Administrateur</option>
                <option value="lab" ${user.role==='lab'?'selected':''}>Laboratoire</option>
                <option value="rx" ${user.role==='rx'?'selected':''}>Pharmacie</option>
            </select></div>
        `;
        openModal('Modifier utilisateur', body, async () => {
            const name = document.getElementById('editUserName').value.trim();
            const email = document.getElementById('editUserEmail').value.trim();
            const password = document.getElementById('editUserPassword').value.trim();
            const role = document.getElementById('editUserRole').value;
            if (!name || !email || !password) return showToast('Champs requis', 'error');
            try {
                await apiFetch(`${API_BASE}/users/${userId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ name, email, password, role }),
                });
                closeModal();
                showToast('Utilisateur mis à jour', 'success');
                if (currentUser.id === userId) {
                    currentUser.name = name;
                    currentUser.email = email;
                    currentUser.role = role;
                    updateSidebarInfo();
                }
                renderView('adminUsers');
            } catch { }
        });
    } catch { }
}

async function deleteUser(userId) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    if (userId === currentUser.id) return showToast('Vous ne pouvez pas supprimer votre propre compte', 'error');
    try {
        await apiFetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
        showToast('Utilisateur supprimé', 'info');
        renderView('adminUsers');
    } catch { }
}

// ======================= UI HELPERS =======================
function showToast(message, type = 'success') {
    const colors = { success: 'bg-emerald-500', error: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-primary-500' };
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${colors[type]} text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-medium`;
    toast.innerHTML = `<span class="text-lg">${icons[type]}</span> ${message}`;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('sidebar-mobile-hidden');
    overlay.classList.toggle('hidden');
}

function openModal(title, bodyHTML, onSave) {
    const overlay = document.getElementById('modalOverlay');
    document.getElementById('modalContent').innerHTML = `
        <div class="flex justify-between mb-5"><h3 class="text-lg font-bold">${title}</h3><button onclick="closeModal()" class="p-1.5 hover:bg-slate-100 rounded-lg">✕</button></div>
        <div>${bodyHTML}</div>
        <div class="flex gap-3 mt-6 justify-end">
            <button onclick="closeModal()" class="px-5 py-2.5 border rounded-xl text-slate-600">Annuler</button>
            <button id="modalSaveBtn" class="px-5 py-2.5 bg-primary-500 text-white rounded-xl">Enregistrer</button>
        </div>`;
    document.getElementById('modalSaveBtn').addEventListener('click', onSave);
    overlay.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
}

// ======================= INITIALISATION =======================
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const user = await login(email, password);
    if (!user) return;
    showApp();
    updateSidebarInfo();
    switchView(user.role === 'admin' ? 'adminDashboard' : user.role === 'lab' ? 'labTests' : 'rxStatus');
    showToast(`Bienvenue ${user.name}`, 'success');
});

document.getElementById('showLoginBtn').addEventListener('click', showLoginScreen);
document.getElementById('backToPublicBtn').addEventListener('click', function() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('publicPage').classList.remove('hidden');
    renderPublicConsultant();
});
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('sidebarOverlay').addEventListener('click', toggleSidebar);
document.getElementById('modalOverlay').addEventListener('click', function(e) { if (e.target === this) closeModal(); });

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
});

// Page publique au chargement
renderPublicConsultant();
