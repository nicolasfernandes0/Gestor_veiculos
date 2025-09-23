import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { supabaseConfig } from './config.js';

// Configuração do Supabase - AGORA SEGURA
const supabaseUrl = supabaseConfig.url;
const supabaseAnonKey = supabaseConfig.anonKey;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Referências para os elementos DOM
const appContainer = document.getElementById('app-container');
const loginContainer = document.getElementById('login-container');
const signupContainer = document.getElementById('signup-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupBtn = document.getElementById('show-signup-btn');
const showLoginBtn = document.getElementById('show-login-btn');
const logoutBtn = document.getElementById('logout-btn');

const appContent = document.getElementById('app-content');
const veiculosTabBtn = document.getElementById('veiculos-tab');
const pontoTabBtn = document.getElementById('ponto-tab');
const utilizadoresTabBtn = document.getElementById('utilizadores-tab');
const useDetailsModal = document.getElementById('use-details-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const closeModalBtnBottom = document.getElementById('close-modal-btn-bottom');
const modalContent = document.getElementById('modal-content');
const loadingSpinner = document.getElementById('loading-spinner');
const messageBox = document.getElementById('message-box');
const messageBoxTitle = document.getElementById('message-box-title');
const messageBoxText = document.getElementById('message-box-text');
const messageBoxCloseBtn = document.getElementById('message-box-close-btn');
const returnVehicleModal = document.getElementById('return-vehicle-modal');
const returnVehicleForm = document.getElementById('return-vehicle-form');
const cancelReturnBtn = document.getElementById('cancel-return-btn');
const confirmModal = document.getElementById('confirm-modal');
const confirmModalTitle = document.getElementById('confirm-modal-title');
const confirmModalText = document.getElementById('confirm-modal-text');
const confirmModalCancelBtn = document.getElementById('confirm-modal-cancel-btn');
const confirmModalConfirmBtn = document.getElementById('confirm-modal-confirm-btn');
const addMaintenanceModal = document.getElementById('add-maintenance-modal');
const addMaintenanceForm = document.getElementById('add-maintenance-form');
const cancelMaintenanceBtn = document.getElementById('cancel-maintenance-btn');

// Estado da aplicação
let users = [];
let vehicles = [];
let vehicleUses = [];
let pointRecords = [];
let maintenances = [];
let activeTab = 'veiculos';
let selectedVehicleId = null;
let isEditing = false;
let editedVehicle = null;
let currentUser = null;
let showAddVehicleForm = false;
let currentUserRole = 'user';

// Variáveis para controlar a paginação de cada aba
let currentPage = {
    veiculos: 1,
    ponto: 1,
    utilizadores: 1
};

let currentFilters = {
    date: null,
    user: null
};

// Funções para manipulação do estado e da UI
const showMessage = (title, message) => {
    messageBoxTitle.textContent = title;
    messageBoxText.textContent = message;
    messageBox.classList.remove('hidden');
};

const hideMessage = () => {
    messageBox.classList.add('hidden');
};

const showLogin = () => {
    loginContainer.classList.remove('hidden');
    signupContainer.classList.add('hidden');
    appContainer.classList.add('hidden');
};

const showSignup = () => {
    signupContainer.classList.remove('hidden');
    loginContainer.classList.add('hidden');
    appContainer.classList.add('hidden');
};

const showApp = () => {
    appContainer.classList.remove('hidden');
    loginContainer.classList.add('hidden');
    signupContainer.classList.add('hidden');
};

const setActiveTab = (tab) => {
    activeTab = tab;
    showAddVehicleForm = false;
    selectedVehicleId = null;
    renderApp();
    updateTabButtons();
};

const updateTabButtons = () => {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${activeTab}-tab`).classList.add('active');
};

const updateNavbarForRole = () => {
    if (currentUserRole === 'master') {
        utilizadoresTabBtn.classList.remove('hidden');
    } else {
        utilizadoresTabBtn.classList.add('hidden');
    }
};

const showLoading = () => {
    loadingSpinner.classList.remove('hidden');
    appContent.innerHTML = '';
    appContent.appendChild(loadingSpinner);
};

const hideLoading = () => {
    loadingSpinner.classList.add('hidden');
};

// Função para abrir mapa com a localização
const openLocationMap = (latitude, longitude) => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, '_blank');
};

// Função para obter localização atual
const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocalização não é suportada por este navegador."));
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                let errorMessage;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Permissão de localização negada.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Informações de localização indisponíveis.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Tempo de solicitação de localização esgotado.";
                        break;
                    default:
                        errorMessage = "Erro desconhecido ao obter localização.";
                }
                reject(new Error(errorMessage));
            },
            options
        );
    });
};

const fetchData = async () => {
    showLoading();
    
    try {
        console.log("A buscar dados iniciais após login...");

        const { data: userProfile, error: profileError } = await supabase.from('users').select('*').eq('id', currentUser.id).single();
        if (profileError) {
            console.warn("Perfil de utilizador não encontrado, a criar um novo.");
            await supabase.from('users').insert({ id: currentUser.id, email: currentUser.email, acesso: 'user', nome: 'Novo Utilizador', funcao: 'Não Atribuída' });
            currentUserRole = 'user';
        } else {
            currentUserRole = userProfile.acesso;
        }
        updateNavbarForRole();
        
        setupRealtimeListeners();
        
        const { data: usersData, error: usersError } = await supabase.from('users').select('*');
        if (usersError) throw usersError;
        users = usersData;

        const { data: vehiclesData, error: vehiclesError } = await supabase.from('vehicles').select('*');
        if (vehiclesError) throw vehiclesError;
        vehicles = vehiclesData;

        const { data: usesData, error: usesError } = await supabase.from('vehicle_uses').select('*');
        if (usesError) throw usesError;
        vehicleUses = usesData;
        
        const { data: maintenancesData, error: maintenancesError } = await supabase.from('maintenances').select('*');
        if (maintenancesError) throw maintenancesError;
        maintenances = maintenancesData;

        const { data: recordsData, error: recordsError } = await supabase.from('point_records').select('*');
        if (recordsError) throw recordsError;
        pointRecords = recordsData;

        console.log("Dados carregados com sucesso. A renderizar a aplicação...");
        renderApp();

    } catch (e) {
        console.error("Erro ao buscar dados:", e);
        const errorMessage = `Erro ao carregar dados. Detalhes: ${e.message}`;
        showMessage("Erro de Conexão", errorMessage);
    } finally {
        hideLoading();
    }
};

const setupRealtimeListeners = () => {
    // Listener para users
    supabase
        .channel('public:users')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
            console.log('User change received!', payload);
            if (payload.eventType === 'INSERT') {
                users.push(payload.new);
            } else if (payload.eventType === 'UPDATE') {
                users = users.map(u => (u.id === payload.old.id ? payload.new : u));
            } else if (payload.eventType === 'DELETE') {
                users = users.filter(u => u.id !== payload.old.id);
            }
            renderApp();
        })
        .subscribe();

    // Listener para vehicles
    supabase
        .channel('public:vehicles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, payload => {
            console.log('Vehicle change received!', payload);
            if (payload.eventType === 'INSERT') {
                vehicles.push(payload.new);
            } else if (payload.eventType === 'UPDATE') {
                vehicles = vehicles.map(v => (v.id === payload.old.id ? payload.new : v));
            } else if (payload.eventType === 'DELETE') {
                vehicles = vehicles.filter(v => v.id !== payload.old.id);
            }
            renderApp();
        })
        .subscribe();

    // Listener para vehicle_uses
    supabase
        .channel('public:vehicle_uses')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_uses' }, payload => {
            console.log('Vehicle use change received!', payload);
            if (payload.eventType === 'INSERT') {
                vehicleUses.push(payload.new);
            } else if (payload.eventType === 'UPDATE') {
                vehicleUses = vehicleUses.map(u => (u.id === payload.old.id ? payload.new : u));
            } else if (payload.eventType === 'DELETE') {
                vehicleUses = vehicleUses.filter(u => u.id !== payload.old.id);
            }
            renderApp();
        })
        .subscribe();

    // Listener para maintenances
    supabase
        .channel('public:maintenances')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenances' }, payload => {
            console.log('Maintenance change received!', payload);
            if (payload.eventType === 'INSERT') {
                maintenances.push(payload.new);
            } else if (payload.eventType === 'UPDATE') {
                maintenances = maintenances.map(m => (m.id === payload.old.id ? payload.new : m));
            } else if (payload.eventType === 'DELETE') {
                maintenances = maintenances.filter(m => m.id !== payload.old.id);
            }
            renderApp();
        })
        .subscribe();

    // Listener para point_records
    supabase
        .channel('public:point_records')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'point_records' }, payload => {
            console.log('Point record change received!', payload);
            if (payload.eventType === 'INSERT') {
                pointRecords.push(payload.new);
            } else if (payload.eventType === 'UPDATE') {
                pointRecords = pointRecords.map(r => (r.id === payload.old.id ? payload.new : r));
            } else if (payload.eventType === 'DELETE') {
                pointRecords = pointRecords.filter(r => r.id !== payload.old.id);
            }
            renderApp();
        })
        .subscribe();
};

const handleAddVehicle = async (event) => {
    event.preventDefault();
    if (currentUserRole !== 'master') {
        showMessage("Acesso Negado", "Apenas a liderança podem adicionar veículos.");
        return;
    }
    const form = event.target;
    const newVehicle = {
        foto: form.elements['vehicle-foto'].value || 'https://placehold.co/50x50/e0e0e0/ffffff?text=Sem+foto',
        placa: form.elements['vehicle-placa'].value,
        marca: form.elements['vehicle-marca'].value,
        modelo: form.elements['vehicle-modelo'].value,
        status: 'DISPONÍVEL',
        tipo: form.elements['vehicle-tipo'].value
    };
    const { error } = await supabase.from('vehicles').insert(newVehicle);
    if (error) {
        console.error("Erro ao adicionar veículo:", error);
        showMessage("Erro", `Não foi possível adicionar o veículo. Detalhes: ${error.message}`);
    } else {
        showMessage("Sucesso", "Veículo adicionado com sucesso!");
        showAddVehicleForm = false;
        renderApp();
    }
};

const handleDeleteVehicle = (id) => {
    if (currentUserRole !== 'master') {
        showMessage("Acesso Negado", "Apenas a liderança pode excluir veículos.");
        return;
    }
    confirmModalTitle.textContent = "Confirmar Exclusão";
    confirmModalText.textContent = "Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.";
    confirmModal.classList.remove('hidden');
    confirmModalConfirmBtn.onclick = async () => {
        const { error } = await supabase.from('vehicles').delete().eq('id', id);
        if (error) {
            console.error("Erro ao excluir veículo:", error);
            showMessage("Erro", `Não foi possível excluir o veículo. Detalhes: ${error.message}`);
        }
        confirmModal.classList.add('hidden');
    };
};

const handleRegisterPoint = async (type) => {
    if (!currentUser) {
        showMessage("Erro de Autenticação", "Utilizador não autenticado. Por favor, faça login.");
        return;
    }
    
    try {
        // Obter localização atual
        const location = await getCurrentLocation();
        
        const newRecord = {
            tipo: type,
            utilizador: currentUser.email,
            data: new Date().toLocaleString('pt-BR'),
            latitude: location.latitude,
            longitude: location.longitude
        };
        
        const { error } = await supabase.from('point_records').insert(newRecord);
        if (error) {
            console.error("Erro ao registar ponto:", error);
            showMessage("Erro", `Não foi possível registar o ponto. Detalhes: ${error.message}`);
        } else {
            showMessage("Sucesso", `Ponto de ${type} registado com sucesso!`);
        }
    } catch (error) {
        console.error("Erro ao obter localização:", error);
        
        // Registrar sem localização se não for possível obtê-la
        const newRecord = {
            tipo: type,
            utilizador: currentUser.email,
            data: new Date().toLocaleString('pt-BR')
        };
        
        const { error: insertError } = await supabase.from('point_records').insert(newRecord);
        if (insertError) {
            console.error("Erro ao registar ponto:", insertError);
            showMessage("Erro", `Não foi possível registar o ponto. Detalhes: ${insertError.message}`);
        } else {
            showMessage("Sucesso", `Ponto de ${type} registado com sucesso! (sem localização)`);
        }
    }
};

const handleAddMaintenance = (vehicleId) => {
    if (currentUserRole !== 'master') {
        showMessage("Acesso Negado", "Apenas a liderança pode adicionar manutenções.");
        return;
    }
    selectedVehicleId = vehicleId;
    addMaintenanceModal.classList.remove('hidden');
};

const handleAddMaintenanceFormSubmit = async (event) => {
    event.preventDefault();
    if (currentUserRole !== 'master') {
        showMessage("Acesso Negado", "Apenas a liderança pode adicionar manutenções.");
        return;
    }
    
    const newMaintenance = {
        vehicle_id: selectedVehicleId,
        data_manutencao: document.getElementById('maintenance-date').value,
        descricao: document.getElementById('maintenance-description').value,
        custo: parseFloat(document.getElementById('maintenance-cost').value),
        status: document.getElementById('maintenance-status').value,
    };

    try {
        const { error } = await supabase.from('maintenances').insert(newMaintenance);
        if (error) throw error;
        
        addMaintenanceModal.classList.add('hidden');
        addMaintenanceForm.reset();
        showMessage("Sucesso", "Manutenção adicionada com sucesso!");
        
    } catch (e) {
        console.error("Erro ao adicionar manutenção:", e);
        showMessage("Erro", `Não foi possível adicionar a manutenção. Detalhes: ${e.message}`);
    }
};

const handleCompleteMaintenance = async (maintenanceId) => {
    if (currentUserRole !== 'master') {
        showMessage("Acesso Negado", "Apenas a liderança pode concluir manutenções.");
        return;
    }

    confirmModalTitle.textContent = "Confirmar Conclusão";
    confirmModalText.textContent = "Tem certeza que deseja marcar esta manutenção como 'Concluída'?";
    confirmModal.classList.remove('hidden');

    confirmModalConfirmBtn.onclick = async () => {
        try {
            const { error } = await supabase
                .from('maintenances')
                .update({ status: 'Concluído' })
                .eq('id', maintenanceId);

            if (error) throw error;

            showMessage("Sucesso", "Manutenção concluída com sucesso!");
            confirmModal.classList.add('hidden');
            renderApp();

        } catch (e) {
            console.error("Erro ao concluir manutenção:", e);
            showMessage("Erro", `Não foi possível concluir a manutenção. Detalhes: ${e.message}`);
            confirmModal.classList.add('hidden');
        }
    };
};

const handleSaveVehicle = async (editedVehicle) => {
    if (currentUserRole !== 'master') {
        showMessage("Acesso Negado", "Apenas a liderança pode editar veículos.");
        return;
    }
    const { error } = await supabase.from('vehicles').update({
        placa: editedVehicle.placa,
        modelo: editedVehicle.modelo,
        marca: editedVehicle.marca,
        tipo: editedVehicle.tipo,
        status: editedVehicle.status
    }).eq('id', editedVehicle.id);
    if (error) {
        console.error("Erro ao salvar veículo:", error);
        showMessage("Erro", `Não foi possível salvar o veículo. Detalhes: ${error.message}`);
    } else {
        isEditing = false;
        renderApp();
    }
};

const showVehicleDetails = (vehicleId) => {
    selectedVehicleId = vehicleId;
    isEditing = false;
    renderApp();
};

const handleViewUseDetails = (use) => {
    modalContent.innerHTML = `
        <p><strong>Utilizador:</strong> ${use.utilizador}</p>
        <p><strong>Período:</strong> ${use.data_inicio} a ${use.data_fim || 'Ainda em uso'}</p>
        <p><strong>Quilometragem:</strong> ${use.quilometragem}</p>
        <p><strong>Finalidade:</strong> ${use.finalidade}</p>
        <p><strong>Status:</strong> ${use.status}</p>
    `;
    useDetailsModal.classList.remove('hidden');
};

const handleCloseUseDetailsModal = () => {
    useDetailsModal.classList.add('hidden');
};

const handleRegisterVehicleUse = async () => {
    if (currentUserRole !== 'master') {
        showMessage("Acesso Negado", "Apenas a liderança pode editar veículos.");
        return;
    }
    const newUseForm = document.getElementById('new-use-form');
    const utilizador = newUseForm.querySelector('select[name="utilizador"]').value;
    const quilometragemInicial = newUseForm.querySelector('input[name="quilometragemInicial"]').value;
    const finalidade = newUseForm.querySelector('textarea[name="finalidade"]').value;
    
    const dataInicio = new Date().toLocaleString('pt-BR');

    if (!selectedVehicleId || !utilizador || !quilometragemInicial || !finalidade) {
        showMessage("Campos Faltando", "Por favor, preencha todos os campos obrigatórios para registrar o uso do veículo.");
        return;
    }

    const newVehicleUse = {
        utilizador: utilizador,
        data_inicio: dataInicio,
        data_fim: null,
        quilometragem: `${quilometragemInicial} / N/A`,
        finalidade: finalidade,
        status: 'EM USO',
        vehicle_id: selectedVehicleId,
    };

    try {
        const { error: useError } = await supabase.from('vehicle_uses').insert(newVehicleUse);
        if (useError) throw useError;

        const { error: vehicleUpdateError } = await supabase.from('vehicles').update({ status: 'EM USO' }).eq('id', selectedVehicleId);
        if (vehicleUpdateError) throw vehicleUpdateError;
        
        newUseForm.reset();
        showMessage("Sucesso", "Uso do veículo registado com sucesso!");
        renderApp();

    } catch (e) {
        console.error("Erro ao registrar uso do veículo:", e);
        showMessage("Erro", `Não foi possível registrar o uso do veículo. Detalhes: ${e.message}`);
    }
};

const showReturnVehicleModal = () => {
    if (currentUserRole !== 'master') {
        showMessage("Acesso Negado", "Apenas a liderança pode devolver veículos.");
        return;
    }
    returnVehicleModal.classList.remove('hidden');
};

const handleReturnVehicle = async (event) => {
    event.preventDefault();
    if (currentUserRole !== 'master') {
        showMessage("Acesso Negado", "Apenas a liderança pode devolver veículos.");
        return;
    }
    const finalMileage = document.getElementById('final-mileage').value;
    
    if (!finalMileage) {
        showMessage("Campos Faltando", "Por favor, insira a quilometragem final para confirmar a devolução.");
        return;
    }

    const activeUse = vehicleUses
        .filter(use => use.vehicle_id === selectedVehicleId && use.status === 'EM USO')
        .sort((a, b) => new Date(b.data_inicio) - new Date(a.data_inicio))[0];

    if (!activeUse) {
        showMessage("Erro", "Não há uso ativo para este veículo para ser devolvido.");
        return;
    }

    try {
        const originalMileage = activeUse.quilometragem.split('/')[0].trim();
        const newMileage = `${originalMileage} / ${finalMileage}`;
        
        const { error: useError } = await supabase
            .from('vehicle_uses')
            .update({
                data_fim: new Date().toLocaleString('pt-BR'),
                quilometragem: newMileage,
                status: 'CONCLUÍDO'
            })
            .eq('id', activeUse.id);
        if (useError) throw useError;

        const { error: vehicleUpdateError } = await supabase
            .from('vehicles')
            .update({ status: 'DISPONÍVEL' })
            .eq('id', selectedVehicleId);
        if (vehicleUpdateError) throw vehicleUpdateError;
        
        returnVehicleModal.classList.add('hidden');
        document.getElementById('final-mileage').value = '';
        showMessage("Sucesso", "Veículo devolvido com sucesso!");

    } catch (e) {
        console.error("Erro ao devolver veículo:", e);
        showMessage("Erro", `Não foi possível devolver o veículo. Detalhes: ${e.message}`);
    }
};

const handleEditUser = async (user) => {
    if (currentUserRole !== 'master') {
        showMessage("Acesso Negado", "Apenas a liderança pode editar outros utilizadores.");
        return;
    }
    const novoNome = prompt("Insira o novo nome do utilizador:", user.nome);
    if (novoNome) {
        const { error } = await supabase.from('users').update({ nome: novoNome }).eq('id', user.id);
        if (error) console.error("Erro ao editar utilizador:", error);
    }
};

const handleDeleteUser = (id) => {
    if (currentUserRole !== 'master') {
        showMessage("Acesso Negado", "Apenas a liderança pode excluir outros utilizadores.");
        return;
    }
    confirmModalTitle.textContent = "Confirmar Exclusão";
    confirmModalText.textContent = "Tem certeza que deseja excluir este utilizador? Esta ação não pode ser desfeita.";
    confirmModal.classList.remove('hidden');
    confirmModalConfirmBtn.onclick = async () => {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) {
            console.error("Erro ao excluir utilizador:", error);
            showMessage("Erro", `Não foi possível excluir o utilizador. Detalhes: ${error.message}`);
        }
        confirmModal.classList.add('hidden');
    };
};

// Funções de Autenticação
const handleLogin = async (event) => {
    event.preventDefault();
    const email = loginForm.elements['email'].value;
    const password = loginForm.elements['password'].value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        console.error("Erro de login:", error.message);
        showMessage("Erro de Login", error.message);
    }
};

const handleSignup = async (event) => {
    event.preventDefault();
    const email = signupForm.elements['signup-email'].value;
    const password = signupForm.elements['signup-password'].value;

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
        console.error("Erro de registo:", error.message);
        showMessage("Erro de Registo", error.message);
    } else {
        showMessage("Registo Concluído", "Confirme o seu e-mail para ativar a sua conta. Depois, pode iniciar sessão.");
        showLogin();
    }
};

const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Erro ao sair:", error.message);
        showMessage("Erro", "Não foi possível terminar a sessão. Por favor, tente novamente.");
    }
};

// Funções de paginação
const nextPage = (tab) => {
    const totalPages = Math.ceil(
        tab === 'veiculos' ? vehicles.length / 10 :
        tab === 'ponto' ? pointRecords.length / 10 :
        users.length / 10
    );
    
    if (currentPage[tab] < totalPages) {
        currentPage[tab]++;
        renderApp();
    }
};

const prevPage = (tab) => {
    if (currentPage[tab] > 1) {
        currentPage[tab]--;
        renderApp();
    }
};

const applyFilters = () => {
    const dateFilter = document.getElementById('filter-date')?.value || '';
    const userFilter = document.getElementById('filter-user')?.value || '';
    
    currentFilters = {
        date: dateFilter,
        user: userFilter
    };
    
    currentPage.ponto = 1;
    renderApp();
};

const clearFilters = () => {
    currentFilters = { date: null, user: null };
    currentPage.ponto = 1;
    renderApp();
    
    setTimeout(() => {
        const dateInput = document.getElementById('filter-date');
        const userSelect = document.getElementById('filter-user');
        if (dateInput) dateInput.value = '';
        if (userSelect) userSelect.value = '';
    }, 100);
};

// Renderização principal da aplicação
const renderApp = () => {
    if (selectedVehicleId) {
        const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
        if (!selectedVehicle) {
            appContent.innerHTML = `<div class="text-center text-gray-500">Veículo não encontrado. <button onclick="window.showAllVehicles()" class="ml-4 text-blue-600 hover:underline">Voltar</button></div>`;
            return;
        }

        if (isEditing) {
            editedVehicle = { ...selectedVehicle };
        } else {
            editedVehicle = null;
        }
        
        const vehicleSpecificUses = vehicleUses.filter(use => use.vehicle_id === selectedVehicleId);
        const vehicleSpecificMaintenances = maintenances.filter(m => m.vehicle_id === selectedVehicleId);

        const statusText = selectedVehicle.status === 'EM USO' ? 'INDISPONÍVEL' : 'DISPONÍVEL';
        const statusColor = selectedVehicle.status === 'EM USO' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';

        appContent.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow space-y-6">
                <div class="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                    <h2 class="text-xl font-semibold">Detalhes do Veículo: ${selectedVehicle.placa}</h2>
                    <div class="flex flex-wrap justify-center space-x-2">
                        ${currentUserRole === 'master' ? `
                            ${isEditing ? 
                                `<button onclick="window.handleSaveVehicleFromDOM()" class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">Salvar</button>
                                 <button onclick="window.cancelEdit()" class="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors">Cancelar</button>`
                                :
                                `<button onclick="window.startEdit()" class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">Editar</button>`
                            }
                            ${selectedVehicle.status === 'EM USO' ?
                                `<button onclick="window.showReturnVehicleModal()" class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">Devolver Veículo</button>`
                                :
                                ''
                            }
                        ` : ''}
                        <button onclick="window.showAllVehicles()" class="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors">Voltar</button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-gray-100 p-4 rounded-lg">
                        <h3 class="text-lg font-medium mb-2">Informações</h3>
                        <div class="space-y-2">
                            <p><strong>Placa:</strong> ${isEditing ? `<input type="text" id="edit-placa" value="${selectedVehicle.placa}" class="border rounded-md px-2 py-1 w-full"/>` : selectedVehicle.placa}</p>
                            <p><strong>Marca:</strong> ${isEditing ? `<input type="text" id="edit-marca" value="${selectedVehicle.marca}" class="border rounded-md px-2 py-1 w-full"/>` : selectedVehicle.marca}</p>
                            <p><strong>Modelo:</strong> ${isEditing ? `<input type="text" id="edit-modelo" value="${selectedVehicle.modelo}" class="border rounded-md px-2 py-1 w-full"/>` : selectedVehicle.modelo}</p>
                            <p><strong>Tipo:</strong> ${isEditing ? `<input type="text" id="edit-tipo" value="${selectedVehicle.tipo}" class="border rounded-md px-2 py-1 w-full"/>` : selectedVehicle.tipo}</p>
                            <p><strong>Status:</strong> ${isEditing ? `<input type="text" id="edit-status" value="${selectedVehicle.status}" class="border rounded-md px-2 py-1 w-full"/>` : `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">${statusText}</span>`}</p>
                        </div>
                    </div>
                    <div class="bg-gray-100 p-4 rounded-lg flex items-center justify-center"> ${selectedVehicle.foto ? `<img src="${selectedVehicle.foto}" alt="Foto do veículo" class="max-h-48 rounded-lg shadow"/>` : `<p class="text-gray-500">Foto Principal: Nenhuma foto cadastrada</p>`}
                </div>

                </div>

                <div class="bg-gray-100 p-4 rounded-lg ${selectedVehicle.status === 'EM USO' ? 'hidden' : ''}">
                    <h3 class="text-lg font-medium mb-2">Registrar Uso do Veículo</h3>
                    <p class="text-sm text-gray-600">Usuário que fará o uso</p>
                    <form id="new-use-form" class="mt-2 space-y-4">
                        <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                            <select name="utilizador" class="w-full p-2 border rounded-md">
                                <option value="">Selecione um utilizador</option>
                                ${users.map(user => `<option key="${user.id}" value="${user.nome}">${user.nome}</option>`).join('')}
                            </select>
                            <input type="date" name="dataInicio" class="w-full p-2 border rounded-md"/>
                        </div>
                        <div class="flex space-x-4">
                            <input type="number" name="quilometragemInicial" placeholder="Quilometragem Inicial (km)" class="w-full p-2 border rounded-md" />
                        </div>
                        <textarea name="finalidade" placeholder="Finalidade" rows="3" class="w-full p-2 border rounded-md"></textarea>
                        <button type="button" onclick="window.handleRegisterVehicleUse()" class="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">Registrar Uso</button>
                    </form>
                </div>
                
            <div>
                    <div class="flex flex-col sm:flex-row justify-between items-center mb-2 space-y-2 sm:space-y-0">
                        <h3 class="text-lg font-medium">Manutenções do Veículo</h3>
                        ${currentUserRole === 'master' ? `<button onclick="window.handleAddMaintenance('${selectedVehicleId}')" class="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">Nova Manutenção</button>` : ''}
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow-inner overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DATA</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DESCRIÇÃO</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CUSTO</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                                    ${currentUserRole === 'master' ? `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AÇÕES</th>` : ''}
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${vehicleSpecificMaintenances.length > 0 ?
                                    vehicleSpecificMaintenances.map(m => `
                                        <tr key="${m.id}">
                                            <td class="px-6 py-4 whitespace-nowrap">${m.data_manutencao}</td>
                                            <td class="px-6 py-4 whitespace-nowrap">${m.descricao}</td>
                                            <td class="px-6 py-4 whitespace-nowrap">R$ ${m.custo.toFixed(2)}</td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${m.status === 'Concluído' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                    ${m.status}
                                                </span>
                                            </td>
                                            ${currentUserRole === 'master' ? `
                                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    ${m.status === 'Pendente' ? `
                                                        <button onclick="window.handleCompleteMaintenance('${m.id}')" class="text-green-600 hover:text-green-900">Concluir</button>
                                                    ` : ''}
                                                </td>
                                            ` : ''}
                                        </tr>
                                    `).join('')
                                    :
                                    `<tr><td colspan="${currentUserRole === 'master' ? '5' : '4'}" class="px-6 py-4 text-center text-gray-500">Nenhuma manutenção registada.</td></tr>`
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
                </div>

                <div>
                    <h3 class="text-lg font-medium mb-2">Histórico de Usos</h3>
                    <div class="bg-white p-4 rounded-lg shadow-inner overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DATA INÍCIO</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DATA FIM</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTILIZADOR</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QUILOMETRAGEM (INÍCIO/FIM)</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FINALIDADE</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${vehicleSpecificUses.map(h => `
                                    <tr key="${h.id}">
                                        <td class="px-6 py-4 whitespace-nowrap">${h.data_inicio}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">${h.data_fim || 'Ainda em uso'}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">${h.utilizador}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">${h.quilometragem}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">${h.finalidade}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">${h.status}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button onclick="window.handleViewUseDetails(${JSON.stringify(h).replace(/"/g, '&quot;')})" class="text-blue-600 hover:text-blue-900">Detalhes</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } else {
        switch (activeTab) {
            case 'veiculos':
                // Paginação para veículos
                const pageSizeVeiculos = 10;
                const totalPagesVeiculos = Math.max(1, Math.ceil(vehicles.length / pageSizeVeiculos));
                const paginatedVehicles = vehicles.slice((currentPage.veiculos - 1) * pageSizeVeiculos, currentPage.veiculos * pageSizeVeiculos);
                
                appContent.innerHTML = `
                    <div class="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-4 sm:space-y-0">
                        <h2 class="text-xl font-semibold">Todos os Veículos Cadastrados</h2>
                        <div class="flex space-x-2">
                            ${currentUserRole === 'master' ? `<button onclick="window.toggleAddVehicleForm()" class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">${showAddVehicleForm ? 'Cancelar' : 'Novo Veículo'}</button>` : ''}
                        </div>
                    </div>
                    ${showAddVehicleForm && currentUserRole === 'master' ? `
                        <div class="bg-white p-6 rounded-lg shadow mb-4">
                            <h3 class="text-lg font-semibold mb-4">Adicionar Novo Veículo</h3>
                            <form id="add-vehicle-form" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" name="vehicle-placa" placeholder="Placa" class="p-2 border rounded-md" required />
                                <input type="text" name="vehicle-marca" placeholder="Marca" class="p-2 border rounded-md" required />
                                <input type="text" name="vehicle-modelo" placeholder="Modelo" class="p-2 border rounded-md" required />
                                <input type="text" name="vehicle-tipo" placeholder="Tipo" class="p-2 border rounded-md" required />
                                <input type="text" name="vehicle-foto" placeholder="URL da Foto (opcional)" class="p-2 border rounded-md md:col-span-2" />
                                <div class="md:col-span-2 text-right">
                                    <button type="submit" class="w-full sm:w-auto bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">Adicionar</button>
                                </div>
                            </form>
                        </div>
                    ` : ''}
                    <div class="bg-white p-6 rounded-lg shadow table-container">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FOTO</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PLACA</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MODELO</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${paginatedVehicles.map(vehicle => `
                                    <tr key="${vehicle.id}">
                                        <td class="px-6 py-4 whitespace-nowrap"><img src="${vehicle.foto}" alt="Veículo" class="w-10 h-10 rounded-full object-cover"/></td>
                                        <td class="px-6 py-4 whitespace-nowrap">${vehicle.placa}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">${vehicle.modelo}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${vehicle.status === 'DISPONÍVEL' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                ${vehicle.status === 'EM USO' ? 'INDISPONÍVEL' : 'DISPONÍVEL'}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button onclick="window.showVehicleDetails('${vehicle.id}')" class="text-blue-600 hover:text-blue-900">Detalhes</button>
                                            ${currentUserRole === 'master' ? `<button onclick="window.handleDeleteVehicle('${vehicle.id}')" class="text-red-600 hover:text-red-900">Excluir</button>` : ''}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ${totalPagesVeiculos > 1 ? `
                        <div class="flex justify-between items-center mt-4">
                            <button onclick="window.prevPage('veiculos')" class="px-4 py-2 bg-gray-200 rounded ${currentPage.veiculos === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}">Anterior</button>
                            <span class="text-sm">Página ${currentPage.veiculos} de ${totalPagesVeiculos}</span>
                            <button onclick="window.nextPage('veiculos')" class="px-4 py-2 bg-gray-200 rounded ${currentPage.veiculos === totalPagesVeiculos ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}">Próxima</button>
                        </div>
                        ` : ''}
                    </div>
                `;
                if (showAddVehicleForm) {
                    setTimeout(() => {
                        document.getElementById('add-vehicle-form').addEventListener('submit', handleAddVehicle);
                    }, 0);
                }
                break;
                
            case 'ponto':
                // Função para converter formato brasileiro para Date
                const parseBrazilianDate = (dateString) => {
                    try {
                        const [datePart, timePart] = dateString.split(', ');
                        const [day, month, year] = datePart.split('/');
                        const [hours, minutes, seconds] = timePart.split(':');
                        return new Date(year, month - 1, day, hours, minutes, seconds);
                    } catch (error) {
                        console.error('Erro ao analisar data:', error);
                        return new Date();
                    }
                };

                // Função para formatar a data para exibição
                const formatDateTime = (dateString) => {
                    try {
                        const date = parseBrazilianDate(dateString);
                        return date.toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        });
                    } catch (error) {
                        console.error('Erro ao formatar data:', error);
                        return dateString;
                    }
                };

                // Filtrar: master vê tudo, user vê só os próprios registros
                let filteredRecords = currentUserRole === 'master' 
                    ? [...pointRecords] 
                    : pointRecords.filter(r => r.utilizador === currentUser.email);
                
                // Aplicar filtros adicionais
                if (currentFilters.date) {
                    filteredRecords = filteredRecords.filter(record => {
                        try {
                            const recordDate = parseBrazilianDate(record.data);
                            const filterDate = new Date(currentFilters.date);
                            return recordDate.toDateString() === filterDate.toDateString();
                        } catch (error) {
                            console.error('Erro ao filtrar por data:', error);
                            return false;
                        }
                    });
                }
                
                if (currentFilters.user && currentUserRole === 'master') {
                    filteredRecords = filteredRecords.filter(record => record.utilizador === currentFilters.user);
                }
                
                // ORDENAR POR DATA EM ORDEM DECRESCENTE
                const sortedRecords = filteredRecords.sort((a, b) => {
                    try {
                        const dateA = parseBrazilianDate(a.data);
                        const dateB = parseBrazilianDate(b.data);
                        return dateB - dateA;
                    } catch (error) {
                        console.error('Erro ao ordenar registros:', error);
                        return 0;
                    }
                });

                // Paginação: 10 por página
                const pageSizePonto = 10;
                const totalPagesPonto = Math.max(1, Math.ceil(sortedRecords.length / pageSizePonto));
                const paginatedRecords = sortedRecords.slice((currentPage.ponto - 1) * pageSizePonto, currentPage.ponto * pageSizePonto);

                const getUserNameByEmail = (email) => {
                    const user = users.find(u => u.email === email);
                    return user ? user.nome : 'Utilizador Desconhecido';
                };

                // Preencher o dropdown de usuários (apenas para masters)
                let userFilterOptions = '';
                if (currentUserRole === 'master') {
                    const uniqueEmails = [...new Set(pointRecords.map(r => r.utilizador))];
                    userFilterOptions = uniqueEmails.map(email => {
                        const userName = getUserNameByEmail(email);
                        return `<option value="${email}" ${currentFilters.user === email ? 'selected' : ''}>${userName}</option>`;
                    }).join('');
                }

                appContent.innerHTML = `
                    <div class="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-4 sm:space-y-0">
                        <h2 class="text-xl font-semibold">Registro de Ponto Global</h2>
                        <div class="flex space-x-2">
                            <button onclick="window.handleRegisterPoint('ENTRADA')" class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">Registrar Entrada</button>
                            <button onclick="window.handleRegisterPoint('SAÍDA')" class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors">Registrar Saída</button>
                        </div>
                    </div>

                    <!-- Seção de Filtros SIMPLIFICADA -->
                    <div class="bg-white p-4 rounded-lg shadow mb-4">
                        <h3 class="text-lg font-medium mb-3">Filtros</h3>
                        
                        <div class="flex flex-col md:flex-row gap-4 items-end">
                            <!-- Filtro de Data -->
                            <div class="w-full md:w-auto">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Data</label>
                                <input type="date" id="filter-date" value="${currentFilters.date || ''}" class="w-full p-2 border border-gray-300 rounded-md">
                            </div>
                            
                            <!-- Filtro de Utilizador (apenas para masters) -->
                            ${currentUserRole === 'master' ? `
                            <div class="w-full md:w-auto">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Utilizador</label>
                                <select id="filter-user" class="w-full p-2 border border-gray-300 rounded-md">
                                    <option value="">Todos os utilizadores</option>
                                    ${userFilterOptions}
                                </select>
                            </div>
                            ` : ''}
                            
                            <!-- Botões -->
                            <div class="flex gap-2 w-full md:w-auto">
                                <button onclick="window.applyFilters()" class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors flex-1">Aplicar</button>
                                <button onclick="window.clearFilters()" class="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors flex-1">Limpar</button>
                            </div>
                        </div>
                    </div>

                    <!-- Tabela de registros -->
                    <div class="bg-white p-6 rounded-lg shadow overflow-x-auto">
                        <table class="min-w-full">
                            <thead>
                                <tr class="border-b">
                                    <th class="text-left font-medium text-gray-700 py-2">TIPO</th>
                                    <th class="text-left font-medium text-gray-700 py-2">UTILIZADOR</th>
                                    <th class="text-left font-medium text-gray-700 py-2">DATA/HORA</th>
                                    <th class="text-left font-medium text-gray-700 py-2">LOCALIZAÇÃO</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${paginatedRecords.length > 0 ? paginatedRecords.map(record => `
                                    <tr class="border-b">
                                        <td class="py-3 ${record.tipo === 'ENTRADA' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}">${record.tipo}</td>
                                        <td class="py-3">${getUserNameByEmail(record.utilizador)}</td>
                                        <td class="py-3">${formatDateTime(record.data)}</td>
                                        <td class="py-3">
                                            ${record.latitude && record.longitude ? 
                                                `<button onclick="window.openLocationMap(${record.latitude}, ${record.longitude})" 
                                                class="text-blue-600 hover:text-blue-900 underline" title="Abrir no mapa">
                                                Ver no mapa
                                                </button>` : 
                                                'Não registada'
                                            }
                                        </td>
                                    </tr>
                                `).join('') : `
                                    <tr>
                                        <td colspan="4" class="py-4 text-center text-gray-500">Nenhum registro encontrado</td>
                                    </tr>
                                `}
                            </tbody>
                        </table>

                        <!-- Paginação -->
                        ${totalPagesPonto > 1 ? `
                        <div class="flex justify-between items-center mt-4">
                            <button onclick="window.prevPage('ponto')" class="px-4 py-2 bg-gray-200 rounded ${currentPage.ponto === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}">Anterior</button>
                            <span class="text-sm">Página ${currentPage.ponto} de ${totalPagesPonto}</span>
                            <button onclick="window.nextPage('ponto')" class="px-4 py-2 bg-gray-200 rounded ${currentPage.ponto === totalPagesPonto ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}">Próxima</button>
                        </div>
                        ` : ''}
                    </div>
                `;
                break;
                
            case 'utilizadores':
                // Paginação para utilizadores
                const pageSizeUtilizadores = 10;
                const totalPagesUtilizadores = Math.max(1, Math.ceil(users.length / pageSizeUtilizadores));
                const paginatedUsers = users.slice((currentPage.utilizadores - 1) * pageSizeUtilizadores, currentPage.utilizadores * pageSizeUtilizadores);
                
                appContent.innerHTML = `
                    <div class="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-4 sm:space-y-0">
                        <h2 class="text-xl font-semibold">Gestão de Utilizadores</h2>
                        <div class="flex space-x-2">
                            <button onclick="window.showMessage('Informação','Novos utilizadores devem ser registados através da página de Registo inicial da aplicação.')" class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">Novo Utilizador</button>
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-lg shadow table-container">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NOME</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-MAIL</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FUNÇÃO</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACESSO</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${paginatedUsers.map(user => `
                                    <tr key="${user.id}">
                                        <td class="px-6 py-4 whitespace-nowrap">${user.nome}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">${user.email}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">${user.funcao}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">${user.acesso}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button onclick="window.handleEditUser(${JSON.stringify(user).replace(/"/g, '&quot;')})" class="text-blue-600 hover:text-blue-900">Editar</button>
                                            <button onclick="window.handleDeleteUser('${user.id}')" class="text-red-600 hover:text-red-900">Excluir</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ${totalPagesUtilizadores > 1 ? `
                        <div class="flex justify-between items-center mt-4">
                            <button onclick="window.prevPage('utilizadores')" class="px-4 py-2 bg-gray-200 rounded ${currentPage.utilizadores === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}">Anterior</button>
                            <span class="text-sm">Página ${currentPage.utilizadores} de ${totalPagesUtilizadores}</span>
                            <button onclick="window.nextPage('utilizadores')" class="px-4 py-2 bg-gray-200 rounded ${currentPage.utilizadores === totalPagesUtilizadores ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}">Próxima</button>
                        </div>
                        ` : ''}
                    </div>
                `;
                break;
        }
    }
};

// Atribuir funções ao objeto window para que sejam acessíveis no HTML inline
window.showMessage = showMessage;
window.hideMessage = hideMessage;
window.setActiveTab = setActiveTab;
window.showVehicleDetails = showVehicleDetails;
window.showAllVehicles = () => { selectedVehicleId = null; renderApp(); };
window.handleAddVehicle = handleAddVehicle;
window.handleDeleteVehicle = handleDeleteVehicle;
window.handleRegisterPoint = handleRegisterPoint;
window.handleEditUser = handleEditUser;
window.handleDeleteUser = handleDeleteUser;
window.showReturnVehicleModal = showReturnVehicleModal;
window.handleReturnVehicle = handleReturnVehicle;
window.handleViewUseDetails = handleViewUseDetails;
window.handleCloseUseDetailsModal = handleCloseUseDetailsModal;
window.handleAddMaintenance = handleAddMaintenance;
window.handleCompleteMaintenance = handleCompleteMaintenance;
window.handleRegisterVehicleUse = handleRegisterVehicleUse;
window.openLocationMap = openLocationMap;
window.getCurrentLocation = getCurrentLocation;
window.startEdit = () => { isEditing = true; renderApp(); };
window.cancelEdit = () => { isEditing = false; renderApp(); };
window.toggleAddVehicleForm = () => { showAddVehicleForm = !showAddVehicleForm; renderApp(); };
window.handleSaveVehicleFromDOM = () => {
    const placa = document.getElementById('edit-placa').value;
    const marca = document.getElementById('edit-marca').value;
    const modelo = document.getElementById('edit-modelo').value;
    const tipo = document.getElementById('edit-tipo').value;
    const status = document.getElementById('edit-status').value;
    const updatedVehicle = {
        id: selectedVehicleId,
        placa,
        marca,
        modelo,
        tipo,
        status,
    };
    handleSaveVehicle(updatedVehicle);
};
window.nextPage = nextPage;
window.prevPage = prevPage;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;

// Event Listeners
veiculosTabBtn.addEventListener('click', () => setActiveTab('veiculos'));
pontoTabBtn.addEventListener('click', () => setActiveTab('ponto'));
utilizadoresTabBtn.addEventListener('click', () => {
    if (currentUserRole === 'master') {
        setActiveTab('utilizadores');
    } else {
        showMessage('Acesso Negado', 'Você não tem permissão para aceder a esta página.');
    }
});
closeModalBtn.addEventListener('click', handleCloseUseDetailsModal);
closeModalBtnBottom.addEventListener('click', handleCloseUseDetailsModal);
messageBoxCloseBtn.addEventListener('click', hideMessage);
returnVehicleForm.addEventListener('submit', handleReturnVehicle);
cancelReturnBtn.addEventListener('click', () => returnVehicleModal.classList.add('hidden'));
confirmModalCancelBtn.addEventListener('click', () => confirmModal.classList.add('hidden'));
addMaintenanceForm.addEventListener('submit', handleAddMaintenanceFormSubmit);
cancelMaintenanceBtn.addEventListener('click', () => addMaintenanceModal.classList.add('hidden'));

// Eventos para o login e registo
loginForm.addEventListener('submit', handleLogin);
signupForm.addEventListener('submit', handleSignup);
showSignupBtn.addEventListener('click', showSignup);
showLoginBtn.addEventListener('click', showLogin);
logoutBtn.addEventListener('click', handleLogout);

// Listener para o estado de autenticação
supabase.auth.onAuthStateChange((event, session) => {
    console.log("Estado de autenticação alterado:", event, session);
    if (session) {
        currentUser = session.user;
        showApp();
        fetchData();
    } else {
        currentUser = null;
        showLogin();
    }
});

// Inicializar a aplicação: verificar se já existe uma sessão
window.onload = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        showApp();
        fetchData();
    } else {
        showLogin();
    }
};