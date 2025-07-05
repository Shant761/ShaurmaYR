// Состояние игры
let gameState = {
    roomId: '',
    players: [],
    currentPlayer: null,
    dayCount: 1,
    phase: 'night',
    gameOver: false,
    winner: null,
    logs: [],
    votes: {},
    killTarget: null,
    checkTarget: null,
    chatMessages: [],
    status: 'waiting',
    nightActions: {
        mafia: null,
        sheriff: null
    },
    nightActionsDone: []
};

// Текущий игрок
let currentPlayer = {
    id: null,
    name: '',
    role: null,
    status: 'alive',
    isHost: false
};

// Статистика пользователя
let userStats = {
    gamesPlayed: 0,
    gamesWon: 0,
    mafiaWins: 0,
    civilianWins: 0
};

// Роли
const roles = ['mafia', 'sheriff', 'civilian', 'civilian', 'civilian'];

// Описания ролей
const roleDescriptions = {
    mafia: "Вы - мафия! Ночью устраняйте игроков. Днём не попадитесь. Цель - остаться в большинстве.",
    sheriff: "Вы - шериф! Ночью проверяйте игроков. Днём помогайте мирным найти мафию.",
    civilian: "Вы - мирный житель! Ночью спите. Днём обсуждайте и голосуйте, чтобы найти мафию."
};

// DOM элементы
const authScreen = document.getElementById('authScreen');
const profileScreen = document.getElementById('profileScreen');
const joinScreen = document.getElementById('joinScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');
const resultScreen = document.getElementById('resultScreen');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const guestBtn = document.getElementById('guestBtn');
const userInfo = document.getElementById('userInfo');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const gamesPlayed = document.getElementById('gamesPlayed');
const gamesWon = document.getElementById('gamesWon');
const mafiaWins = document.getElementById('mafiaWins');
const civilianWins = document.getElementById('civilianWins');
const playBtn = document.getElementById('playBtn');
const playerNameInput = document.getElementById('playerName');
const roomIdInput = document.getElementById('roomIdInput');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const startBtn = document.getElementById('startBtn');
const playerList = document.getElementById('playerList');
const playerCount = document.getElementById('playerCount');
const gamePlayerCount = document.getElementById('gamePlayerCount');
const dayCount = document.getElementById('dayCount');
const phaseDisplay = document.getElementById('phaseDisplay');
const playerRole = document.getElementById('playerRole');
const roleInfo = document.getElementById('roleInfo');
const playerStatus = document.getElementById('playerStatus');
const actionDescription = document.getElementById('actionDescription');
const actionButtons = document.getElementById('actionButtons');
const gameLog = document.getElementById('gameLog');
const resultPlayerList = document.getElementById('resultPlayerList');
const winnerTitle = document.getElementById('winnerTitle');
const restartBtn = document.getElementById('restartBtn');
const roomIdElement = document.getElementById('roomId');
const copyBtn = document.getElementById('copyBtn');
const backBtn = document.getElementById('backBtn');
const backToLobbyBtn = document.getElementById('backToLobbyBtn');
const backToMainBtn = document.getElementById('backToMainBtn');
const backToProfileBtn = document.getElementById('backToProfileBtn');
const lobbyStatus = document.getElementById('lobbyStatus');
const firebaseStatus = document.getElementById('firebaseStatus');
const roomsList = document.getElementById('roomsList');

// Элементы чата
const chatContainer = document.getElementById('chatContainer');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatToggleBtn = document.getElementById('chatToggleBtn');
const closeChatBtn = document.getElementById('closeChatBtn');
const unreadBadge = document.getElementById('unreadBadge');
const chatPopupContainer = document.getElementById('chatPopupContainer');

// Перевод ролей
const roleTranslations = {
    'mafia': 'Мафия',
    'sheriff': 'Шериф',
    'civilian': 'Мирный'
};

// Состояние чата
let unreadMessages = 0;
let lastSeenMessageTime = 0;
let currentUser = null;

// Инициализация игры
function initGame() {
    // Обработчики событий аутентификации
    loginBtn.addEventListener('click', loginUser);
    signupBtn.addEventListener('click', signupUser);
    guestBtn.addEventListener('click', playAsGuest);
    logoutBtn.addEventListener('click', logoutUser);
    playBtn.addEventListener('click', goToJoinScreen);
    backToMainBtn.addEventListener('click', goToAuthScreen);
    backToProfileBtn.addEventListener('click', goToProfileScreen);
    
    // Обработчики игровых событий
    joinRoomBtn.addEventListener('click', joinRoom);
    createRoomBtn.addEventListener('click', createRoom);
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);
    copyBtn.addEventListener('click', copyRoomId);
    backBtn.addEventListener('click', goBackToJoinScreen);
    backToLobbyBtn.addEventListener('click', goBackToLobby);
    
    // Обработчики чата
    chatSendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
    
    chatToggleBtn.addEventListener('click', toggleChat);
    closeChatBtn.addEventListener('click', closeChat);
    
    // Авто-заполнение для демонстрации
    playerNameInput.value = 'Игрок' + Math.floor(Math.random() * 100);
    roomIdInput.value = '';
    emailInput.value = 'test@example.com';
    passwordInput.value = 'password';
    
    // Проверка статуса Firebase
    checkFirebaseConnection();
    
    // Проверка состояния аутентификации
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            showProfileScreen();
            loadUserStats();
        } else {
            authScreen.classList.add('active');
            profileScreen.classList.remove('active');
            userInfo.style.display = 'none';
        }
    });
}

// Вход пользователя
function loginUser() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
        alert('Введите email и пароль');
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            currentUser = userCredential.user;
            showProfileScreen();
            loadUserStats();
        })
        .catch(error => {
            alert('Ошибка входа: ' + error.message);
        });
}

// Регистрация пользователя
function signupUser() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
        alert('Введите email и пароль');
        return;
    }
    
    if (password.length < 6) {
        alert('Пароль должен содержать не менее 6 символов');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            currentUser = userCredential.user;
            saveUserStats(); // Создаем запись статистики
            showProfileScreen();
        })
        .catch(error => {
            alert('Ошибка регистрации: ' + error.message);
        });
}

// Играть как гость
function playAsGuest() {
    currentUser = null;
    goToJoinScreen();
}

// Выход пользователя
function logoutUser() {
    auth.signOut()
        .then(() => {
            currentUser = null;
            authScreen.classList.add('active');
            profileScreen.classList.remove('active');
            userInfo.style.display = 'none';
        })
        .catch(error => {
            alert('Ошибка выхода: ' + error.message);
        });
}

// Показать экран профиля
function showProfileScreen() {
    authScreen.classList.remove('active');
    profileScreen.classList.add('active');
    joinScreen.classList.remove('active');
    
    // Обновляем информацию профиля
    const name = currentUser.email.split('@')[0];
    const firstLetter = name.charAt(0).toUpperCase();
    
    profileAvatar.textContent = firstLetter;
    profileName.textContent = name;
    profileEmail.textContent = currentUser.email;
    
    userAvatar.textContent = firstLetter;
    userName.textContent = name;
    userInfo.style.display = 'flex';
}

// Перейти к экрану входа в игру
function goToJoinScreen() {
    profileScreen.classList.remove('active');
    joinScreen.classList.add('active');
}

// Перейти к экрану аутентификации
function goToAuthScreen() {
    profileScreen.classList.remove('active');
    authScreen.classList.add('active');
}

// Перейти к экрану профиля
function goToProfileScreen() {
    joinScreen.classList.remove('active');
    profileScreen.classList.add('active');
}

// Сохранить статистику пользователя
function saveUserStats() {
    if (!currentUser) return;
    
    const userRef = database.ref(`users/${currentUser.uid}`);
    userRef.set(userStats);
}

// Загрузить статистику пользователя
function loadUserStats() {
    if (!currentUser) return;
    
    const userRef = database.ref(`users/${currentUser.uid}`);
    userRef.once('value').then(snapshot => {
        if (snapshot.exists()) {
            userStats = snapshot.val();
            updateProfileStats();
        } else {
            // Создаем новую запись статистики
            saveUserStats();
        }
    });
}

// Обновить статистику в профиле
function updateProfileStats() {
    gamesPlayed.textContent = userStats.gamesPlayed;
    gamesWon.textContent = userStats.gamesWon;
    mafiaWins.textContent = userStats.mafiaWins;
    civilianWins.textContent = userStats.civilianWins;
}

// Обновить статистику после игры
function updateStatsAfterGame(role, won) {
    if (!currentUser) return;
    
    userStats.gamesPlayed++;
    
    if (won) {
        userStats.gamesWon++;
        
        if (role === 'mafia') {
            userStats.mafiaWins++;
        } else {
            userStats.civilianWins++;
        }
    }
    
    saveUserStats();
    updateProfileStats();
}

// Проверка соединения с Firebase
function checkFirebaseConnection() {
    const connectedRef = database.ref(".info/connected");
    connectedRef.on("value", (snap) => {
        if (snap.val() === true) {
            firebaseStatus.innerHTML = '<i class="fas fa-database"></i> Firebase Online';
            firebaseStatus.classList.remove('offline');
        } else {
            firebaseStatus.innerHTML = '<i class="fas fa-database"></i> Firebase Offline';
            firebaseStatus.classList.add('offline');
        }
    });
}

// Отправка сообщения в чат
function sendChatMessage() {
    const message = chatInput.value.trim();
    if (message && currentPlayer.id) {
        const senderName = currentUser ? currentUser.email.split('@')[0] : currentPlayer.name;
        
        const newMessage = {
            senderId: currentPlayer.id,
            senderName: senderName,
            text: message,
            timestamp: Date.now(),
            isSystem: false
        };
        
        // Добавляем сообщение в состояние игры
        gameState.chatMessages.push(newMessage);
        saveGameState();
        
        // Очищаем поле ввода
        chatInput.value = '';
        
        // Прокручиваем чат вниз
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Отображение сообщений чата
function renderChatMessages() {
    chatMessages.innerHTML = '';
    
    gameState.chatMessages.forEach(msg => {
        const messageDiv = document.createElement('div');
        
        if (msg.isSystem) {
            // Системное сообщение
            messageDiv.className = 'system-message';
            messageDiv.textContent = msg.text;
        } else {
            // Сообщение от игрока
            const isCurrentUser = msg.senderId === currentPlayer.id;
            messageDiv.className = `message ${isCurrentUser ? 'message-outgoing' : 'message-incoming'}`;
            
            const time = new Date(msg.timestamp);
            const timeString = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
            
            messageDiv.innerHTML = `
                <div class="message-sender">${msg.senderName}</div>
                <div class="message-content">${msg.text}</div>
                <div class="message-time">${timeString}</div>
            `;
            
            // Считаем непрочитанные сообщения
            if (!isCurrentUser && msg.timestamp > lastSeenMessageTime && !chatContainer.classList.contains('open')) {
                unreadMessages++;
            }
        }
        
        chatMessages.appendChild(messageDiv);
    });
    
    // Обновляем бейдж непрочитанных
    updateUnreadBadge();
    
    // Прокручиваем вниз
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Показываем popup для новых сообщений
    if (gameState.chatMessages.length > 0) {
        const lastMessage = gameState.chatMessages[gameState.chatMessages.length - 1];
        if (!lastMessage.isSystem && lastMessage.timestamp > lastSeenMessageTime) {
            showChatPopups();
        }
    }
    
    // Обновляем время последнего просмотренного сообщения
    lastSeenMessageTime = Date.now();
}

// Показать popup сообщения
function showChatPopups() {
    // Очищаем контейнер
    chatPopupContainer.innerHTML = '';
    
    // Получаем последние 2 несистемных сообщения
    const recentMessages = gameState.chatMessages
        .filter(msg => !msg.isSystem)
        .slice(-2);
    
    // Отображаем их
    recentMessages.forEach(msg => {
        const popup = document.createElement('div');
        popup.className = 'chat-popup';
        popup.innerHTML = `
            <div class="chat-popup-sender">${msg.senderName}</div>
            <div class="chat-popup-content">${msg.text}</div>
        `;
        
        chatPopupContainer.appendChild(popup);
        
        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            popup.style.opacity = '0';
            popup.style.transform = 'translateY(20px)';
            setTimeout(() => {
                if (popup.parentNode) {
                    popup.parentNode.removeChild(popup);
                }
            }, 300);
        }, 5000);
    });
}

// Обновление бейджа непрочитанных сообщений
function updateUnreadBadge() {
    if (unreadMessages > 0) {
        unreadBadge.textContent = unreadMessages;
        unreadBadge.style.display = 'flex';
    } else {
        unreadBadge.style.display = 'none';
    }
}

// Открыть/закрыть чат
function toggleChat() {
    chatContainer.classList.toggle('open');
    
    if (chatContainer.classList.contains('open')) {
        // Сбрасываем счетчик непрочитанных при открытии
        unreadMessages = 0;
        updateUnreadBadge();
        lastSeenMessageTime = Date.now();
        
        // Очищаем popup сообщения
        chatPopupContainer.innerHTML = '';
        
        // Фокусируем поле ввода
        setTimeout(() => {
            chatInput.focus();
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 300);
    }
}

// Закрыть чат
function closeChat() {
    chatContainer.classList.remove('open');
}

// Копирование ID комнаты
function copyRoomId() {
    navigator.clipboard.writeText(gameState.roomId);
    alert('ID комнаты скопирован! Отправьте его друзьям.');
}

// Создание комнаты
function createRoom() {
    const name = playerNameInput.value.trim();
    if (name.length < 2) {
        alert('Имя должно содержать не менее 2 символов');
        return;
    }
    
    // Генерируем ID комнаты
    const roomId = 'MAF-' + Math.floor(1000 + Math.random() * 9000);
    
    // Создаем игрока (хоста)
    const playerId = generatePlayerId();
    currentPlayer = {
        id: playerId,
        name: name,
        role: null,
        status: 'alive',
        isHost: true
    };
    
    // Инициализируем состояние игры
    gameState = {
        roomId: roomId,
        players: [currentPlayer],
        currentPlayer: null,
        dayCount: 1,
        phase: 'lobby',
        gameOver: false,
        winner: null,
        logs: [{message: `Комната создана. ${name} присоединился как создатель.`, timestamp: Date.now()}],
        votes: {},
        killTarget: null,
        checkTarget: null,
        chatMessages: [{
            isSystem: true,
            text: `Игра создана. ${name} присоединился как создатель.`,
            timestamp: Date.now()
        }],
        status: 'waiting',
        nightActions: {
            mafia: null,
            sheriff: null
        },
        nightActionsDone: []
    };
    
    // Сохраняем состояние в Firebase
    saveGameState();
    
    // Обновляем интерфейс
    roomIdElement.textContent = roomId;
    
    // Переключаемся на лобби
    joinScreen.classList.remove('active');
    lobbyScreen.classList.add('active');
    
    // Обновляем лобби
    updateLobby();
    
    // Слушаем изменения в Firebase
    listenForGameChanges();
}

// Присоединение к комнате
function joinRoom() {
    const name = playerNameInput.value.trim();
    const roomId = roomIdInput.value.trim();
    
    if (name.length < 2) {
        alert('Имя должно содержать не менее 2 символов');
        return;
    }
    
    if (!roomId.match(/^MAF-\d{4}$/)) {
        alert('Неверный формат ID комнаты. Пример: MAF-1234');
        return;
    }
    
    // Создаем игрока
    const playerId = generatePlayerId();
    currentPlayer = {
        id: playerId,
        name: name,
        role: null,
        status: 'alive',
        isHost: false
    };
    
    // Загружаем состояние игры из Firebase
    loadGameState(roomId, () => {
        // Проверяем, не заполнена ли комната
        if (gameState.players.length >= 5) {
            alert('Комната заполнена');
            return;
        }
        
        // Проверяем, не занято ли имя
        if (gameState.players.some(p => p.name === name)) {
            alert('Имя уже занято');
            return;
        }
        
        // Проверяем статус комнаты
        if (gameState.status !== 'waiting') {
            alert('Игра уже началась, присоединиться нельзя');
            return;
        }
        
        // Добавляем игрока
        gameState.players.push(currentPlayer);
        
        // Добавляем сообщение в чат
        gameState.chatMessages.push({
            isSystem: true,
            text: `${name} присоединился к игре.`,
            timestamp: Date.now()
        });
        
        saveGameState();
        
        // Обновляем интерфейс
        roomIdElement.textContent = gameState.roomId;
        
        // Переключаемся на лобби
        joinScreen.classList.remove('active');
        lobbyScreen.classList.add('active');
        
        // Обновляем лобби
        updateLobby();
        
        // Слушаем изменения в Firebase
        listenForGameChanges();
    });
}

// Генерация ID игрока
function generatePlayerId() {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

// Загрузка состояния игры из Firebase
function loadGameState(roomId, callback) {
    const gameRef = database.ref(`rooms/${roomId}`);
    gameRef.once('value').then(snapshot => {
        if (snapshot.exists()) {
            gameState = snapshot.val();
            callback();
        } else {
            alert('Комната не найдена');
        }
    });
}

// Сохранение состояния игры в Firebase
function saveGameState() {
    const gameRef = database.ref(`rooms/${gameState.roomId}`);
    gameRef.set(gameState);
}

// Прослушивание изменений в игре
function listenForGameChanges() {
    const gameRef = database.ref(`rooms/${gameState.roomId}`);
    gameRef.on('value', snapshot => {
        if (snapshot.exists()) {
            gameState = snapshot.val();
            
            // Обновляем интерфейс в зависимости от экрана
            if (lobbyScreen.classList.contains('active')) {
                updateLobby();
            } else if (gameScreen.classList.contains('active')) {
                updateGameScreen();
            } else if (resultScreen.classList.contains('active')) {
                updateResultScreen();
            }
            
            // Обновляем чат всегда
            renderChatMessages();
            
            // Если игра началась, переключаем на игровой экран
            if (gameState.phase !== 'lobby' && lobbyScreen.classList.contains('active')) {
                lobbyScreen.classList.remove('active');
                gameScreen.classList.add('active');
                updateGameScreen();
            }
            
            // Если игра завершена, переключаем на экран результатов
            if (gameState.gameOver && gameScreen.classList.contains('active')) {
                gameScreen.classList.remove('active');
                resultScreen.classList.add('active');
                updateResultScreen();
            }
        }
    });
}

// Обновление лобби
function updateLobby() {
    playerList.innerHTML = '';
    playerCount.textContent = gameState.players.length;
    
    // Обновляем статус лобби
    if (gameState.players.length === 0) {
        lobbyStatus.textContent = 'Ожидание игроков';
    } else if (gameState.players.length < 3) {
        lobbyStatus.textContent = `Ожидание игроков (минимум 3)`;
    } else if (gameState.players.length < 5) {
        lobbyStatus.textContent = `Ожидание игроков (${5 - gameState.players.length} из 5)`;
    } else {
        lobbyStatus.textContent = 'Лобби заполнено!';
    }
    
    // Активируем кнопку старта для хоста
    startBtn.disabled = !(currentPlayer.isHost && gameState.players.length >= 3);
    
    // Отображаем игроков
    gameState.players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = `player-card ${player.isHost ? 'host' : ''}`;
        
        let playerInfo = `<div class="player-name">${player.name}</div>`;
        if (player.isHost) {
            playerInfo += `<div class="player-status"><i class="fas fa-crown"></i> Создатель</div>`;
        } else {
            playerInfo += `<div class="player-status">Ожидание...</div>`;
        }
        
        playerCard.innerHTML = playerInfo;
        playerList.appendChild(playerCard);
    });
}

// Начало игры
function startGame() {
    // Перемешиваем роли
    shuffleRoles();
    
    // Назначаем роли
    assignRoles();
    
    // Добавляем сообщение в чат
    gameState.chatMessages.push({
        isSystem: true,
        text: 'Игра началась! Наступает ночь...',
        timestamp: Date.now()
    });
    
    // Устанавливаем первого игрока
    gameState.currentPlayer = gameState.players[0].id;
    gameState.phase = 'night';
    gameState.status = 'in-progress'; // Меняем статус комнаты
    gameState.logs = [{message: 'Игра началась! Наступает ночь...', timestamp: Date.now()}];
    
    // Сохраняем состояние
    saveGameState();
}

// Перемешивание ролей
function shuffleRoles() {
    for (let i = roles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [roles[i], roles[j]] = [roles[j], roles[i]];
    }
}

// Назначение ролей игрокам
function assignRoles() {
    gameState.players.forEach((player, index) => {
        player.role = roles[index];
    });
}

// Обновление игрового экрана
function updateGameScreen() {
    // Находим текущего игрока в состоянии
    const player = gameState.players.find(p => p.id === currentPlayer.id);
    if (!player) return;
    
    // Обновляем количество живых игроков
    const alivePlayers = gameState.players.filter(p => p.status === 'alive');
    gamePlayerCount.textContent = `${alivePlayers.length}/${gameState.players.length}`;
    
    dayCount.textContent = gameState.dayCount;
    
    // Установка фазы
    phaseDisplay.textContent = gameState.phase === 'night' ? 'НОЧЬ' : 'ДЕНЬ';
    phaseDisplay.className = `phase-display ${gameState.phase}`;
    
    // Отображение роли текущего игрока
    playerRole.textContent = roleTranslations[player.role] || 'Роль не определена';
    roleInfo.textContent = roleDescriptions[player.role] || '';
    playerStatus.textContent = `Статус: ${player.status === 'alive' ? 'жив' : 'мёртв'}`;
    playerStatus.className = `player-status ${player.status}`;
    
    // Обновление описания действий
    updateActionDescription(player);
    
    // Обновление логов
    updateGameLog();
}

// Обновление описания действий
function updateActionDescription(player) {
    actionButtons.innerHTML = '';
    
    // Если игрок мертв
    if (player.status !== 'alive') {
        actionDescription.textContent = 'Вы мертвы и не можете действовать.';
        return;
    }
    
    if (gameState.phase === 'night') {
        if (player.role === 'mafia' && !gameState.nightActionsDone.includes(player.id)) {
            actionDescription.textContent = 'Выберите игрока для устранения:';
            renderPlayerActions('kill', player);
        } else if (player.role === 'sheriff' && !gameState.nightActionsDone.includes(player.id)) {
            actionDescription.textContent = 'Выберите игрока для проверки:';
            renderPlayerActions('check', player);
        } else {
            actionDescription.textContent = 'Вы спите... Наступает ночь.';
        }
    } else {
        actionDescription.textContent = 'Обсудите и выберите игрока для исключения:';
        renderPlayerActions('vote', player);
    }
}

// Рендер действий с игроками
function renderPlayerActions(actionType, currentPlayer) {
    const alivePlayers = gameState.players.filter(p => 
        p.status === 'alive' && p.id !== currentPlayer.id
    );
    
    if (alivePlayers.length === 0) {
        actionDescription.textContent = 'Нет других игроков для действия';
        return;
    }
    
    alivePlayers.forEach(player => {
        const btn = document.createElement('button');
        btn.textContent = player.name;
        btn.style.margin = '4px';
        btn.style.fontSize = '0.9rem';
        
        btn.addEventListener('click', () => {
            if (actionType === 'kill') {
                // Мафия выбирает жертву
                gameState.nightActions.mafia = player.id;
                gameState.nightActionsDone.push(currentPlayer.id);
                addLog(`${currentPlayer.name} (мафия) выбрал(а) ${player.name} для устранения`, 'mafia');
            } else if (actionType === 'check') {
                // Шериф проверяет игрока
                gameState.nightActions.sheriff = player.id;
                gameState.nightActionsDone.push(currentPlayer.id);
                const role = roleTranslations[player.role];
                addLog(`${currentPlayer.name} (шериф) проверил(а) ${player.name}. Роль: ${role}`, 'sheriff');
            } else {
                // Голосование днем
                gameState.votes[currentPlayer.id] = player.id;
                addLog(`${currentPlayer.name} проголосовал(а) против ${player.name}`);
            }
            
            // Переходим к следующему игроку
            nextPlayer();
        });
        
        actionButtons.appendChild(btn);
    });
    
    // Кнопка пропуска
    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'Пропустить';
    skipBtn.style.margin = '4px';
    skipBtn.style.background = '#555';
    skipBtn.style.fontSize = '0.9rem';
    
    skipBtn.addEventListener('click', () => {
        addLog(`${currentPlayer.name} пропустил(а) действие`);
        nextPlayer();
    });
    
    actionButtons.appendChild(skipBtn);
}

// Добавление записи в лог
function addLog(message, type = '') {
    gameState.logs.push({message, type, timestamp: Date.now()});
    
    if (gameState.logs.length > 10) {
        gameState.logs.shift();
    }
    
    saveGameState();
}

// Обновление логов
function updateGameLog() {
    gameLog.innerHTML = '';
    
    gameState.logs.forEach(log => {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${log.type ? log.type + '-log' : ''}`;
        logEntry.innerHTML = `<i class="far fa-clock"></i> ${log.message}`;
        gameLog.appendChild(logEntry);
    });
    
    // Прокрутка вниз
    gameLog.scrollTop = gameLog.scrollHeight;
}

// Следующий игрок
function nextPlayer() {
    const currentIndex = gameState.players.findIndex(p => p.id === gameState.currentPlayer);
    let nextIndex = (currentIndex + 1) % gameState.players.length;
    
    // Пропускаем мёртвых игроков
    while (gameState.players[nextIndex].status !== 'alive') {
        nextIndex = (nextIndex + 1) % gameState.players.length;
        
        // Если все игроки мертвы, завершаем игру
        if (nextIndex === currentIndex) {
            break;
        }
    }
    
    gameState.currentPlayer = gameState.players[nextIndex].id;
    
    // Если круг завершён, меняем фазу
    if (gameState.currentPlayer === gameState.players[0].id) {
        endPhase();
    }
    
    // Сохраняем состояние
    saveGameState();
    checkGameOver();
}

// Завершение фазы
function endPhase() {
    if (gameState.phase === 'night') {
        // Обработка действий ночи
        if (gameState.nightActions.mafia) {
            const targetPlayer = gameState.players.find(p => p.id === gameState.nightActions.mafia);
            if (targetPlayer) {
                targetPlayer.status = 'dead';
                addLog(`Утром все обнаружили, что ${targetPlayer.name} был убит мафией!`);
            }
        }
        
        gameState.phase = 'day';
        addLog('Наступает день. Обсуждение начинается...');
        gameState.dayCount++;
    } else {
        // Обработка голосования днем
        const voteCounts = {};
        Object.values(gameState.votes).forEach(vote => {
            voteCounts[vote] = (voteCounts[vote] || 0) + 1;
        });
        
        let maxVotes = 0;
        let votedPlayerId = null;
        
        for (const [playerId, votes] of Object.entries(voteCounts)) {
            if (votes > maxVotes) {
                maxVotes = votes;
                votedPlayerId = playerId;
            }
        }
        
        if (votedPlayerId && maxVotes > 0) {
            const votedPlayer = gameState.players.find(p => p.id === votedPlayerId);
            if (votedPlayer) {
                votedPlayer.status = 'dead';
                addLog(`Игроки решили исключить ${votedPlayer.name}. Роль: ${roleTranslations[votedPlayer.role]}`);
            }
        } else {
            addLog('Игроки не смогли договориться, никто не исключен.');
        }
        
        gameState.votes = {};
        gameState.phase = 'night';
        addLog('Наступает ночь. Город засыпает...');
    }
    
    // Сброс ночных действий
    gameState.nightActions = { mafia: null, sheriff: null };
    gameState.nightActionsDone = [];
}

// Проверка окончания игры
function checkGameOver() {
    const alivePlayers = gameState.players.filter(p => p.status === 'alive');
    const mafiaCount = alivePlayers.filter(p => p.role === 'mafia').length;
    const civiliansCount = alivePlayers.filter(p => p.role !== 'mafia').length;
    
    if (mafiaCount === 0) {
        endGame('civilians');
    } else if (mafiaCount >= civiliansCount) {
        endGame('mafia');
    }
}

// Завершение игры
function endGame(winner) {
    gameState.gameOver = true;
    gameState.winner = winner;
    gameState.status = 'completed'; // Меняем статус комнаты
    
    // Добавляем сообщение в чат
    const winnerText = winner === 'civilians' 
        ? 'Победа мирных жителей!' 
        : 'Победа мафии!';
        
    gameState.chatMessages.push({
        isSystem: true,
        text: `Игра завершена! ${winnerText}`,
        timestamp: Date.now()
    });
    
    // Обновляем статистику пользователя
    if (currentUser) {
        const player = gameState.players.find(p => p.id === currentPlayer.id);
        if (player) {
            const won = (winner === 'civilians' && player.role !== 'mafia') || 
                        (winner === 'mafia' && player.role === 'mafia');
            updateStatsAfterGame(player.role, won);
        }
    }
    
    saveGameState();
}

// Обновление экрана результатов
function updateResultScreen() {
    // Установка заголовка
    winnerTitle.textContent = gameState.winner === 'civilians' 
        ? 'Победа мирных жителей!' 
        : 'Победа мафии!';
    
    // Отображение результатов игроков
    resultPlayerList.innerHTML = '';
    
    gameState.players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = `player-card ${player.role} ${player.status}`;
        
        const roleClass = player.role + '-badge';
        const roleName = roleTranslations[player.role];
        
        playerCard.innerHTML = `
            <div class="player-name">${player.name}</div>
            <div>
                <span class="role-badge ${roleClass}">${roleName}</span>
            </div>
            <div class="player-status ${player.status}">
                ${player.status === 'alive' ? 'Выжил' : 'Убит'}
            </div>
        `;
        
        resultPlayerList.appendChild(playerCard);
    });
}

// Перезапуск игры
function restartGame() {
    // Переключение на экран входа
    resultScreen.classList.remove('active');
    joinScreen.classList.add('active');
    
    // Сброс состояния
    gameState = {
        roomId: '',
        players: [],
        currentPlayer: null,
        dayCount: 1,
        phase: 'night',
        gameOver: false,
        winner: null,
        logs: [],
        votes: {},
        killTarget: null,
        checkTarget: null,
        chatMessages: [],
        status: 'waiting',
        nightActions: {
            mafia: null,
            sheriff: null
        },
        nightActionsDone: []
    };
    
    currentPlayer = {
        id: null,
        name: '',
        role: null,
        status: 'alive',
        isHost: false
    };
}

// Возврат на экран ввода ID
function goBackToJoinScreen() {
    // Удаляем игрока из комнаты
    if (gameState.roomId) {
        gameState.players = gameState.players.filter(p => p.id !== currentPlayer.id);
        
        // Если игроков не осталось, удаляем комнату
        if (gameState.players.length === 0) {
            const roomRef = database.ref(`rooms/${gameState.roomId}`);
            roomRef.remove();
        } else {
            // Добавляем сообщение о выходе
            gameState.chatMessages.push({
                isSystem: true,
                text: `${currentPlayer.name} покинул игру.`,
                timestamp: Date.now()
            });
            
            saveGameState();
        }
    }
    
    lobbyScreen.classList.remove('active');
    joinScreen.classList.add('active');
}

// Возврат в лобби
function goBackToLobby() {
    gameScreen.classList.remove('active');
    lobbyScreen.classList.add('active');
}

// Запуск игры при загрузке
window.onload = initGame;
