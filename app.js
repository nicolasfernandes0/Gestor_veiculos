import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Definição dos tipos de dados (apenas para referência)
// interface User { id: string; nome: string; email: string; funcao: string; acesso: 'user' | 'master'; }
// interface Vehicle { id: string; foto: string; placa: string; marca: string; modelo: string; status: 'DISPONÍVEL' | 'EM USO'; tipo: string; }
// interface VehicleUse { id: string; data_inicio: string; data_fim: string; utilizador: string; quilometragem: string; finalidade: string; status: string; vehicle_id: string; }
// interface Maintenance { id: string; data_manutencao: string; descricao: string; custo: number; status: string; vehicle_id: string; }
// interface PointRecord { id: string; tipo: 'ENTRADA' | 'SAÍDA'; utilizador: string; data: string; }

// Configuração do Supabase - CREDENCIAIS ATUALIZADAS
const supabaseUrl = 'https://kelzcwwdntxuplvqgjdg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlbHpjd3dkbnR4dXBsdnFnamRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMDQ5ODcsImV4cCI6MjA3MDc4MDk4N30.KO6zEZXewXk2UUkjPEB3vDKoFXryIrEPmaefv58nCkg';

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
let maintenances = []; // Nova variável para armazenar manutenções
let activeTab = 'veiculos';
let selectedVehicleId = null;
let isEditing = false;
let editedVehicle = null;
let currentUser = null;
let showAddVehicleForm = false;
let currentUserRole = 'user'; // Por padrão, o utilizador é 'user'

// Variáveis de paginação para cada aba
let currentPage = {
    veiculos: 1,
    ponto: 1,
    utilizadores: 1
};

let itemsPerPage = {
    veiculos: 10,
    ponto: 10,
    utilizadores: 10
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
    selectedVehicleId = null; // reset vehicle details view
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

const fetchData = async () => {
    showLoading();
    
    try {
        console.log("A buscar dados iniciais após login...");

        const { data: userProfile, error: profileError } = await supabase.from('users').select('*').eq('id', currentUser.id).single();
        if (profileError) {
            // Se o utilizador não tiver um perfil na tabela, criar um por padrão
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
    const newRecord = {
        tipo: type,
        utilizador: currentUser.email,
        data: new Date().toLocaleString('pt-BR')
    };
    const { error } = await supabase.from('point_records').insert(newRecord);
    if (error) {
        console.error("Erro ao registar ponto:", error);
        showMessage("Erro", `Não foi possível registar o ponto. Detalhes: ${error.message}`);
    } else {
        showMessage("Sucesso", `Ponto de ${type} registado com sucesso!`);
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
    
    // Adicione esta linha para capturar a data e hora atuais
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
        
        // Clear the form
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
    // Placeholder: Em uma aplicação real, você mostraria um formulário para editar
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
const nextPage = () => {
    const totalPages = Math.ceil(getFilteredRecords().length / itemsPerPage.ponto);
    if (currentPage.ponto < totalPages) {
        currentPage.ponto++;
        renderApp();
    }
};

const prevPage = () => {
    if (currentPage.ponto > 1) {
        currentPage.ponto--;
        renderApp();
    }
};

const applyFilters = () => {
    const dateFilter = document.getElementById('filter-date').value;
    const userFilter = document.getElementById('filter-user').value;
    
    currentFilters = {
        date: dateFilter || null,
        user: userFilter || null
    };
    
    currentPage.ponto = 1;
    renderApp();
};

const clearFilters = () => {
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-user').value = '';
    currentFilters = { date: null, user: null };
    currentPage.ponto = 1;
    renderApp();
};

const getFilteredRecords = () => {
    // Filtrar: master vê tudo, user vê só os próprios registros
    let filteredRecords = currentUserRole === 'master' 
        ? [...pointRecords] 
        : pointRecords.filter(r => r.utilizador === currentUser.email);
    
    // Aplicar filtros adicionais
    if (currentFilters.date) {
        filteredRecords = filteredRecords.filter(record => {
            const recordDate = parseBrazilianDate(record.data);
            const filterDate = new Date(currentFilters.date);
            return recordDate.toDateString() === filterDate.toDateString();
        });
    }
    
    if (currentFilters.user) {
        filteredRecords = filteredRecords.filter(record => record.utilizador === currentFilters.user);
    }
    
    return filteredRecords;
};

// Função para converter formato brasileiro para Date
const parseBrazilianDate = (dateString) => {
    try {
        const [datePart, timePart] = dateString.split(', ');
        const [day, month, year] = datePart.split('/');
        const [hours, minutes, seconds] = timePart.split(':');
        return new Date(year, month - 1, day, hours, minutes, seconds);
    } catch (error) {
        return new Date(); // Retorna data atual se houver erro
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
        return dateString; // Retorna o original se houver erro
    }
};

const getUserNameByEmail = (email) => {
    const user = users.find(u => u.email === email);
    return user ? user.nome : 'Utilizador Desconhecido';
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

        // Variável para determinar o texto do status
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
                        <h3 class="text-lg font-medium">Histórico de Uso</h3>
                        ${currentUserRole === 'master' ? `<button onclick="window.handleAddMaintenance('${selectedVehicleId}')" class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">Adicionar Manutenção</button>` : ''}
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full bg-white border border-gray-200">
                            <thead>
                                <tr>
                                    <th class="px-4 py-2 border-b">Utilizador</th>
                                    <th class="px-4 py-2 border-b">Data Início</th>
                                    <th class="px-4 py-2 border-b">Data Fim</th>
                                    <th class="px-4 py-2 border-b">Quilometragem</th>
                                    <th class="px-4 py-2 border-b">Finalidade</th>
                                    <th class="px-4 py-2 border-b">Status</th>
                                    <th class="px-4 py-2 border-b">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${vehicleSpecificUses.length > 0 ? vehicleSpecificUses.map(use => `
                                    <tr>
                                        <td class="px-4 py-2 border-b">${use.utilizador}</td>
                                        <td class="px-4 py-2 border-b">${use.data_inicio}</td>
                                        <td class="px-4 py-2 border-b">${use.data_fim || 'N/A'}</td>
                                        <td class="px-4 py-2 border-b">${use.quilometragem}</td>
                                        <td class="px-4 py-2 border-b">${use.finalidade}</td>
                                        <td class="px-4 py-2 border-b">${use.status}</td>
                                        <td class="px-4 py-2 border-b">
                                            <button onclick="window.handleViewUseDetails(${JSON.stringify(use).replace(/"/g, '&quot;')})" class="text-blue-600 hover:underline">Ver Detalhes</button>
                                        </td>
                                    </tr>
                                `).join('') : `<tr><td colspan="7" class="px-4 py-2 text-center border-b">Nenhum uso registrado para este veículo.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div>
                    <h3 class="text-lg font-medium mb-2">Histórico de Manutenções</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full bg-white border border-gray-200">
                            <thead>
                                <tr>
                                    <th class="px-4 py-2 border-b">Data</th>
                                    <th class="px-4 py-2 border-b">Descrição</th>
                                    <th class="px-4 py-2 border-b">Custo</th>
                                    <th class="px-4 py-2 border-b">Status</th>
                                    <th class="px-4 py-2 border-b">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${vehicleSpecificMaintenances.length > 0 ? vehicleSpecificMaintenances.map(maintenance => `
                                    <tr>
                                        <td class="px-4 py-2 border-b">${maintenance.data_manutencao}</td>
                                        <td class="px-4 py-2 border-b">${maintenance.descricao}</td>
                                        <td class="px-4 py-2 border-b">R$ ${maintenance.custo.toFixed(2)}</td>
                                        <td class="px-4 py-2 border-b">${maintenance.status}</td>
                                        <td class="px-4 py-2 border-b">
                                            ${maintenance.status !== 'Concluído' && currentUserRole === 'master' ? 
                                                `<button onclick="window.handleCompleteMaintenance('${maintenance.id}')" class="text-green-600 hover:underline">Concluir</button>` : 
                                                ''
                                            }
                                        </td>
                                    </tr>
                                `).join('') : `<tr><td colspan="5" class="px-4 py-2 text-center border-b">Nenhuma manutenção registrada para este veículo.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } else {
        switch (activeTab) {
            case 'veiculos':
                renderVehiclesTab();
                break;
            case 'ponto':
                renderPointTab();
                break;
            case 'utilizadores':
                renderUsersTab();
                break;
        }
    }
};

const renderVehiclesTab = () => {
    const startIndex = (currentPage.veiculos - 1) * itemsPerPage.veiculos;
    const endIndex = startIndex + itemsPerPage.veiculos;
    const paginatedVehicles = vehicles.slice(startIndex, endIndex);
    const totalPages = Math.ceil(vehicles.length / itemsPerPage.veiculos);

    appContent.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow space-y-6">
            <div class="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <h2 class="text-xl font-semibold">Gestão de Veículos</h2>
                ${currentUserRole === 'master' ? `<button onclick="window.toggleAddVehicleForm()" class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">${showAddVehicleForm ? 'Cancelar' : 'Adicionar Veículo'}</button>` : ''}
            </div>

            ${showAddVehicleForm && currentUserRole === 'master' ? `
                <div class="bg-gray-100 p-4 rounded-lg">
                    <h3 class="text-lg font-medium mb-2">Adicionar Novo Veículo</h3>
                    <form id="add-vehicle-form" onsubmit="window.handleAddVehicle(event)" class="space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input type="text" name="vehicle-placa" placeholder="Placa" required class="w-full p-2 border rounded-md"/>
                            <input type="text" name="vehicle-marca" placeholder="Marca" required class="w-full p-2 border rounded-md"/>
                            <input type="text" name="vehicle-modelo" placeholder="Modelo" required class="w-full p-2 border rounded-md"/>
                            <input type="text" name="vehicle-tipo" placeholder="Tipo" required class="w-full p-2 border rounded-md"/>
                            <input type="url" name="vehicle-foto" placeholder="URL da Foto (opcional)" class="w-full p-2 border rounded-md"/>
                        </div>
                        <button type="submit" class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">Adicionar Veículo</button>
                    </form>
                </div>
            ` : ''}

            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-gray-200">
                    <thead>
                        <tr>
                            <th class="px-4 py-2 border-b">Foto</th>
                            <th class="px-4 py-2 border-b">Placa</th>
                            <th class="px-4 py-2 border-b">Marca</th>
                            <th class="px-4 py-2 border-b">Modelo</th>
                            <th class="px-4 py-2 border-b">Tipo</th>
                            <th class="px-4 py-2 border-b">Status</th>
                            <th class="px-4 py-2 border-b">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedVehicles.length > 0 ? paginatedVehicles.map(vehicle => {
                            const statusColor = vehicle.status === 'EM USO' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
                            const statusText = vehicle.status === 'EM USO' ? 'INDISPONÍVEL' : 'DISPONÍVEL';
                            return `
                                <tr>
                                    <td class="px-4 py-2 border-b">
                                        ${vehicle.foto ? `<img src="${vehicle.foto}" alt="Foto do veículo" class="w-10 h-10 object-cover rounded"/>` : 'Sem foto'}
                                    </td>
                                    <td class="px-4 py-2 border-b">${vehicle.placa}</td>
                                    <td class="px-4 py-2 border-b">${vehicle.marca}</td>
                                    <td class="px-4 py-2 border-b">${vehicle.modelo}</td>
                                    <td class="px-4 py-2 border-b">${vehicle.tipo}</td>
                                    <td class="px-4 py-2 border-b"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">${statusText}</span></td>
                                    <td class="px-4 py-2 border-b">
                                        <button onclick="window.showVehicleDetails('${vehicle.id}')" class="text-blue-600 hover:underline mr-2">Detalhes</button>
                                        ${currentUserRole === 'master' ? `
                                            <button onclick="window.handleDeleteVehicle('${vehicle.id}')" class="text-red-600 hover:underline">Excluir</button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `;
                        }).join('') : `<tr><td colspan="7" class="px-4 py-2 text-center border-b">Nenhum veículo cadastrado.</td></tr>`}
                    </tbody>
                </table>
            </div>

            ${totalPages > 1 ? `
                <div class="flex justify-center items-center space-x-4 mt-4">
                    <button onclick="window.changeVehiclesPage(${currentPage.veiculos - 1})" ${currentPage.veiculos === 1 ? 'disabled' : ''} class="px-4 py-2 bg-gray-200 rounded-md ${currentPage.veiculos === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}">Anterior</button>
                    <span>Página ${currentPage.veiculos} de ${totalPages}</span>
                    <button onclick="window.changeVehiclesPage(${currentPage.veiculos + 1})" ${currentPage.veiculos === totalPages ? 'disabled' : ''} class="px-4 py-2 bg-gray-200 rounded-md ${currentPage.veiculos === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}">Próxima</button>
                </div>
            ` : ''}
        </div>
    `;
};

const renderPointTab = () => {
    const filteredRecords = getFilteredRecords();
    const startIndex = (currentPage.ponto - 1) * itemsPerPage.ponto;
    const endIndex = startIndex + itemsPerPage.ponto;
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage.ponto);

    appContent.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow space-y-6">
            <div class="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <h2 class="text-xl font-semibold">Registro de Ponto</h2>
                <div class="flex space-x-2">
                    <button onclick="window.handleRegisterPoint('ENTRADA')" class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors">Registrar Entrada</button>
                    <button onclick="window.handleRegisterPoint('SAÍDA')" class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors">Registrar Saída</button>
                </div>
            </div>

            <div class="bg-gray-100 p-4 rounded-lg">
                <h3 class="text-lg font-medium mb-2">Filtros</h3>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Data</label>
                        <input type="date" id="filter-date" class="w-full p-2 border rounded-md" value="${currentFilters.date || ''}">
                    </div>
                    ${currentUserRole === 'master' ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Utilizador</label>
                            <select id="filter-user" class="w-full p-2 border rounded-md">
                                <option value="">Todos os utilizadores</option>
                                ${users.map(user => `<option value="${user.email}" ${currentFilters.user === user.email ? 'selected' : ''}>${user.nome}</option>`).join('')}
                            </select>
                        </div>
                    ` : ''}
                    <div class="flex items-end space-x-2">
                        <button onclick="window.applyFilters()" class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors">Aplicar Filtros</button>
                        <button onclick="window.clearFilters()" class="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors">Limpar</button>
                    </div>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-gray-200">
                    <thead>
                        <tr>
                            <th class="px-4 py-2 border-b">Utilizador</th>
                            <th class="px-4 py-2 border-b">Tipo</th>
                            <th class="px-4 py-2 border-b">Data/Hora</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedRecords.length > 0 ? paginatedRecords.map(record => `
                            <tr>
                                <td class="px-4 py-2 border-b">${getUserNameByEmail(record.utilizador)}</td>
                                <td class="px-4 py-2 border-b">
                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.tipo === 'ENTRADA' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${record.tipo}
                                    </span>
                                </td>
                                <td class="px-4 py-2 border-b">${formatDateTime(record.data)}</td>
                            </tr>
                        `).join('') : `<tr><td colspan="3" class="px-4 py-2 text-center border-b">Nenhum registro encontrado.</td></tr>`}
                    </tbody>
                </table>
            </div>

            ${totalPages > 1 ? `
                <div class="flex justify-center items-center space-x-4 mt-4">
                    <button onclick="window.prevPage()" ${currentPage.ponto === 1 ? 'disabled' : ''} class="px-4 py-2 bg-gray-200 rounded-md ${currentPage.ponto === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}">Anterior</button>
                    <span>Página ${currentPage.ponto} de ${totalPages}</span>
                    <button onclick="window.nextPage()" ${currentPage.ponto === totalPages ? 'disabled' : ''} class="px-4 py-2 bg-gray-200 rounded-md ${currentPage.ponto === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}">Próxima</button>
                </div>
            ` : ''}
        </div>
    `;
};

const renderUsersTab = () => {
    const startIndex = (currentPage.utilizadores - 1) * itemsPerPage.utilizadores;
    const endIndex = startIndex + itemsPerPage.utilizadores;
    const paginatedUsers = users.slice(startIndex, endIndex);
    const totalPages = Math.ceil(users.length / itemsPerPage.utilizadores);

    appContent.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow space-y-6">
            <h2 class="text-xl font-semibold">Gestão de Utilizadores</h2>
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-gray-200">
                    <thead>
                        <tr>
                            <th class="px-4 py-2 border-b">Nome</th>
                            <th class="px-4 py-2 border-b">Email</th>
                            <th class="px-4 py-2 border-b">Função</th>
                            <th class="px-4 py-2 border-b">Acesso</th>
                            <th class="px-4 py-2 border-b">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedUsers.length > 0 ? paginatedUsers.map(user => `
                            <tr>
                                <td class="px-4 py-2 border-b">${user.nome}</td>
                                <td class="px-4 py-2 border-b">${user.email}</td>
                                <td class="px-4 py-2 border-b">${user.funcao}</td>
                                <td class="px-4 py-2 border-b">
                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.acesso === 'master' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}">
                                        ${user.acesso}
                                    </span>
                                </td>
                                <td class="px-4 py-2 border-b">
                                    ${user.id !== currentUser.id ? `
                                        <button onclick="window.handleEditUser(${JSON.stringify(user).replace(/"/g, '&quot;')})" class="text-blue-600 hover:underline mr-2">Editar</button>
                                        <button onclick="window.handleDeleteUser('${user.id}')" class="text-red-600 hover:underline">Excluir</button>
                                    ` : '<span class="text-gray-500">Utilizador atual</span>'}
                                </td>
                            </tr>
                        `).join('') : `<tr><td colspan="5" class="px-4 py-2 text-center border-b">Nenhum utilizador cadastrado.</td></tr>`}
                    </tbody>
                </table>
            </div>

            ${totalPages > 1 ? `
                <div class="flex justify-center items-center space-x-4 mt-4">
                    <button onclick="window.changeUsersPage(${currentPage.utilizadores - 1})" ${currentPage.utilizadores === 1 ? 'disabled' : ''} class="px-4 py-2 bg-gray-200 rounded-md ${currentPage.utilizadores === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}">Anterior</button>
                    <span>Página ${currentPage.utilizadores} de ${totalPages}</span>
                    <button onclick="window.changeUsersPage(${currentPage.utilizadores + 1})" ${currentPage.utilizadores === totalPages ? 'disabled' : ''} class="px-4 py-2 bg-gray-200 rounded-md ${currentPage.utilizadores === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}">Próxima</button>
                </div>
            ` : ''}
        </div>
    `;
};

// Funções auxiliares para manipulação do DOM
const toggleAddVehicleForm = () => {
    showAddVehicleForm = !showAddVehicleForm;
    renderApp();
};

const showAllVehicles = () => {
    selectedVehicleId = null;
    renderApp();
};

const startEdit = () => {
    isEditing = true;
    renderApp();
};

const cancelEdit = () => {
    isEditing = false;
    renderApp();
};

const handleSaveVehicleFromDOM = () => {
    if (!editedVehicle) return;
    editedVehicle.placa = document.getElementById('edit-placa').value;
    editedVehicle.marca = document.getElementById('edit-marca').value;
    editedVehicle.modelo = document.getElementById('edit-modelo').value;
    editedVehicle.tipo = document.getElementById('edit-tipo').value;
    editedVehicle.status = document.getElementById('edit-status').value;
    handleSaveVehicle(editedVehicle);
};

const changeVehiclesPage = (page) => {
    const totalPages = Math.ceil(vehicles.length / itemsPerPage.veiculos);
    if (page >= 1 && page <= totalPages) {
        currentPage.veiculos = page;
        renderApp();
    }
};

const changeUsersPage = (page) => {
    const totalPages = Math.ceil(users.length / itemsPerPage.utilizadores);
    if (page >= 1 && page <= totalPages) {
        currentPage.utilizadores = page;
        renderApp();
    }
};

// Event Listeners
loginForm.addEventListener('submit', handleLogin);
signupForm.addEventListener('submit', handleSignup);
showSignupBtn.addEventListener('click', showSignup);
showLoginBtn.addEventListener('click', showLogin);
logoutBtn.addEventListener('click', handleLogout);
veiculosTabBtn.addEventListener('click', () => setActiveTab('veiculos'));
pontoTabBtn.addEventListener('click', () => setActiveTab('ponto'));
utilizadoresTabBtn.addEventListener('click', () => setActiveTab('utilizadores'));
closeModalBtn.addEventListener('click', handleCloseUseDetailsModal);
closeModalBtnBottom.addEventListener('click', handleCloseUseDetailsModal);
messageBoxCloseBtn.addEventListener('click', hideMessage);
returnVehicleForm.addEventListener('submit', handleReturnVehicle);
cancelReturnBtn.addEventListener('click', () => returnVehicleModal.classList.add('hidden'));
confirmModalCancelBtn.addEventListener('click', () => confirmModal.classList.add('hidden'));
addMaintenanceForm.addEventListener('submit', handleAddMaintenanceFormSubmit);
cancelMaintenanceBtn.addEventListener('click', () => addMaintenanceModal.classList.add('hidden'));

// Inicialização da aplicação
const initApp = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        showApp();
        await fetchData();
    } else {
        showLogin();
    }
};

// Listener para mudanças de autenticação
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;
        showApp();
        await fetchData();
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        showLogin();
    }
});

// Inicializar a aplicação
initApp();

// Expor funções para o escopo global
window.showVehicleDetails = showVehicleDetails;
window.showAllVehicles = showAllVehicles;
window.toggleAddVehicleForm = toggleAddVehicleForm;
window.handleAddVehicle = handleAddVehicle;
window.handleDeleteVehicle = handleDeleteVehicle;
window.handleRegisterPoint = handleRegisterPoint;
window.handleViewUseDetails = handleViewUseDetails;
window.handleCloseUseDetailsModal = handleCloseUseDetailsModal;
window.showReturnVehicleModal = showReturnVehicleModal;
window.handleReturnVehicle = handleReturnVehicle;
window.handleEditUser = handleEditUser;
window.handleDeleteUser = handleDeleteUser;
window.startEdit = startEdit;
window.cancelEdit = cancelEdit;
window.handleSaveVehicleFromDOM = handleSaveVehicleFromDOM;
window.handleRegisterVehicleUse = handleRegisterVehicleUse;
window.handleAddMaintenance = handleAddMaintenance;
window.handleCompleteMaintenance = handleCompleteMaintenance;
window.nextPage = nextPage;
window.prevPage = prevPage;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.changeVehiclesPage = changeVehiclesPage;
window.changeUsersPage = changeUsersPage;