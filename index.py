import logging
import random
from datetime import datetime, timedelta
from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove
)
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ConversationHandler,
    ContextTypes,
    filters
)

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Состояния разговора
CREATE_ROOM, JOIN_ROOM, LOBBY, GAME_NIGHT, GAME_DAY, VOTING = range(6)

# Роли
ROLES = {
    'mafia': 'Мафия',
    'sheriff': 'Шериф',
    'civilian': 'Мирный житель',
    'doctor': 'Доктор',
    'lover': 'Любовница',
    'maniac': 'Маньяк'
}

# Описания ролей
ROLE_DESCRIPTIONS = {
    'mafia': "Вы - мафия! Ночью устраняйте игроков. Днём не попадитесь. Цель - остаться в большинстве.",
    'sheriff': "Вы - шериф! Ночью проверяйте игроков. Днём помогайте мирным найти мафию.",
    'civilian': "Вы - мирный житель! Ночью спите. Днём обсуждайте и голосуйте, чтобы найти мафию.",
    'doctor': "Вы - Доктор! Ночью можете лечить одного игрока, предотвращая его убийство.",
    'lover': "Вы - Любовница! Можете защитить игрока ночью, но если вас убьют, ваш избранник умрёт с вами.",
    'maniac': "Вы - Маньяк! Независимый убийца. Побеждаете, если останетесь последним выжившим."
}

# VIP-роли и их стоимость
VIP_ROLES = {
    'doctor': {'name': 'Доктор', 'cost': 10, 'description': 'Может лечить игроков ночью'},
    'lover': {'name': 'Любовница', 'cost': 15, 'description': 'Может защитить игрока ночью'},
    'maniac': {'name': 'Маньяк', 'cost': 20, 'description': 'Независимый убийца'}
}

# Хранилище данных
rooms = {}
players = {}
user_balances = {}
user_stats = {}
game_logs = {}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Начало работы с ботом, главное меню."""
    user = update.message.from_user
    logger.info(f"Пользователь {user.first_name} начал взаимодействие")
    
    # Инициализация данных пользователя
    if user.id not in players:
        players[user.id] = {
            'name': user.first_name,
            'room': None,
            'role': None,
            'status': 'alive',
            'is_host': False,
            'balance': 100,
            'games_played': 0,
            'games_won': 0,
            'mafia_wins': 0,
            'civilian_wins': 0
        }
    
    keyboard = [
        [InlineKeyboardButton("🎮 Создать комнату", callback_data='create_room')],
        [InlineKeyboardButton("🔍 Присоединиться к игре", callback_data='join_room')],
        [InlineKeyboardButton("💰 Мой баланс", callback_data='my_balance')],
        [InlineKeyboardButton("🏆 Статистика", callback_data='my_stats')],
        [InlineKeyboardButton("💎 VIP Магазин", callback_data='vip_shop')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "👋 Добро пожаловать в игру Мафия!\n\n"
        "Выберите действие:",
        reply_markup=reply_markup
    )
    return ConversationHandler.END

async def create_room(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Создание новой комнаты."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    
    # Создаем уникальный ID комнаты
    room_id = f"MAF-{random.randint(1000, 9999)}"
    while room_id in rooms:
        room_id = f"MAF-{random.randint(1000, 9999)}"
    
    # Инициализируем комнату
    rooms[room_id] = {
        'host': user.id,
        'players': [user.id],
        'status': 'waiting',
        'game_started': False,
        'phase': 'night',
        'day_count': 1,
        'votes': {},
        'kill_target': None,
        'check_target': None,
        'heal_target': None,
        'protect_target': None,
        'murder_target': None
    }
    
    # Обновляем данные игрока
    players[user.id]['room'] = room_id
    players[user.id]['is_host'] = True
    
    # Логгируем
    game_logs[room_id] = [f"Комната {room_id} создана! Хост: {user.first_name}"]
    
    await query.edit_message_text(
        f"🎉 Комната создана!\n\n"
        f"ID комнаты: {room_id}\n"
        f"Пригласите друзей, чтобы начать игру.\n\n"
        f"Игроки (1/5):\n"
        f"👤 {user.first_name} (Хост)\n\n"
        f"Когда все присоединятся, нажмите /startgame",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("⬅️ Назад в меню", callback_data='back_to_menu')]
        ])
    )
    return LOBBY

async def join_room(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Присоединение к комнате."""
    query = update.callback_query
    await query.answer()
    
    await query.edit_message_text(
        "Введите ID комнаты в формате MAF-XXXX:"
    )
    return JOIN_ROOM

async def join_room_id(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Обработка ввода ID комнаты."""
    user = update.message.from_user
    room_id = update.message.text.upper().strip()
    
    if room_id not in rooms:
        await update.message.reply_text(
            "❌ Комната не найдена. Проверьте ID и попробуйте снова."
        )
        return JOIN_ROOM
    
    room = rooms[room_id]
    
    if len(room['players']) >= 5:
        await update.message.reply_text(
            "❌ Комната заполнена. Максимум 5 игроков."
        )
        return JOIN_ROOM
    
    if user.id in room['players']:
        await update.message.reply_text(
            "ℹ️ Вы уже в этой комнате."
        )
        return LOBBY
    
    # Добавляем игрока в комнату
    room['players'].append(user.id)
    players[user.id]['room'] = room_id
    players[user.id]['is_host'] = False
    
    # Отправляем сообщение всем в комнате
    for player_id in room['players']:
        try:
            await context.bot.send_message(
                player_id,
                f"🎉 {user.first_name} присоединился к игре!"
            )
        except:
            logger.warning(f"Не удалось отправить сообщение игроку {player_id}")
    
    await update.message.reply_text(
        f"✅ Вы присоединились к комнате {room_id}!\n\n"
        f"Игроки ({len(room['players'])}/5):\n" +
        "\n".join([f"👤 {players[p]['name']}" + (" (Хост)" if p == room['host'] else "") for p in room['players']]) +
        f"\n\nОжидайте начала игры..."
    )
    return LOBBY

async def start_game(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Начало игры."""
    user = update.message.from_user
    player = players.get(user.id)
    
    if not player or not player['room']:
        await update.message.reply_text(
            "❌ Вы не в комнате. Присоединитесь к комнате сначала."
        )
        return
    
    room_id = player['room']
    room = rooms[room_id]
    
    # Проверяем, что пользователь - хост
    if user.id != room['host']:
        await update.message.reply_text(
            "❌ Только хост может начать игру."
        )
        return
    
    # Проверяем количество игроков
    if len(room['players']) < 3:
        await update.message.reply_text(
            "❌ Недостаточно игроков. Минимум 3 игрока для начала игры."
        )
        return
    
    # Меняем статус комнаты
    room['status'] = 'in_progress'
    room['game_started'] = True
    room['alive_players'] = room['players'][:]
    
    # Распределяем роли
    roles = ['mafia', 'sheriff'] + ['civilian'] * (len(room['players']) - 2)
    random.shuffle(roles)
    
    # Применяем VIP-роли
    for i, player_id in enumerate(room['players']):
        player_role = roles[i]
        
        # Если у игрока куплена VIP-роль, заменяем
        if players[player_id].get('vip_role'):
            player_role = players[player_id]['vip_role']
        
        players[player_id]['role'] = player_role
        players[player_id]['status'] = 'alive'
    
    # Отправляем сообщения игрокам с их ролями
    for player_id in room['players']:
        role = players[player_id]['role']
        role_name = ROLES.get(role, role)
        
        try:
            await context.bot.send_message(
                player_id,
                f"🎭 Ваша роль: {role_name}\n\n"
                f"{ROLE_DESCRIPTIONS[role]}\n\n"
                f"Игра начинается с ночной фазы!"
            )
        except:
            logger.warning(f"Не удалось отправить сообщение игроку {player_id}")
    
    # Добавляем запись в лог
    game_logs[room_id].append("Игра началась! Распределены роли.")
    
    # Начинаем ночную фазу
    await night_phase(context, room_id)
    return GAME_NIGHT

async def night_phase(context: ContextTypes.DEFAULT_TYPE, room_id: str) -> None:
    """Начало ночной фазы."""
    room = rooms[room_id]
    room['phase'] = 'night'
    room['phase_end'] = datetime.now() + timedelta(minutes=2)
    room['votes'] = {}
    
    # Сообщение для всех игроков
    for player_id in room['alive_players']:
        player = players[player_id]
        
        try:
            # Для мафии
            if player['role'] == 'mafia':
                alive_players = [
                    p for p in room['alive_players'] 
                    if p != player_id and players[p]['status'] == 'alive'
                ]
                
                if alive_players:
                    keyboard = [
                        [InlineKeyboardButton(players[p]['name'], callback_data=f"kill_{p}")]
                        for p in alive_players
                    ]
                    await context.bot.send_message(
                        player_id,
                        "🌑 Ночь. Выберите игрока для устранения:",
                        reply_markup=InlineKeyboardMarkup(keyboard)
                    )
                else:
                    await context.bot.send_message(
                        player_id,
                        "🌑 Ночь. Нет игроков для устранения."
                    )
            
            # Для шерифа
            elif player['role'] == 'sheriff':
                alive_players = [
                    p for p in room['alive_players'] 
                    if p != player_id and players[p]['status'] == 'alive'
                ]
                
                if alive_players:
                    keyboard = [
                        [InlineKeyboardButton(players[p]['name'], callback_data=f"check_{p}")]
                        for p in alive_players
                    ]
                    await context.bot.send_message(
                        player_id,
                        "🌑 Ночь. Выберите игрока для проверки:",
                        reply_markup=InlineKeyboardMarkup(keyboard)
                    )
                else:
                    await context.bot.send_message(
                        player_id,
                        "🌑 Ночь. Нет игроков для проверки."
                    )
            
            # Для доктора
            elif player['role'] == 'doctor':
                alive_players = [
                    p for p in room['alive_players'] 
                    if players[p]['status'] == 'alive'
                ]
                
                if alive_players:
                    keyboard = [
                        [InlineKeyboardButton(players[p]['name'], callback_data=f"heal_{p}")]
                        for p in alive_players
                    ]
                    await context.bot.send_message(
                        player_id,
                        "🌑 Ночь. Выберите игрока для лечения:",
                        reply_markup=InlineKeyboardMarkup(keyboard)
                    )
                else:
                    await context.bot.send_message(
                        player_id,
                        "🌑 Ночь. Нет игроков для лечения."
                    )
            
            # Для других игроков
            else:
                await context.bot.send_message(
                    player_id,
                    "🌑 Ночь. Вы спите..."
                )
        
        except Exception as e:
            logger.error(f"Ошибка при отправке сообщения: {e}")
    
    # Устанавливаем таймер для окончания ночи
    context.job_queue.run_once(
        end_night_phase, 
        timedelta(minutes=2), 
        data=room_id,
        name=f"night_timer_{room_id}"
    )

async def handle_night_action(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработка действий игроков ночью."""
    query = update.callback_query
    await query.answer()
    
    user = query.from_user
    player = players.get(user.id)
    action, target_id = query.data.split('_')
    target_id = int(target_id)
    
    if not player or not player['room']:
        return
    
    room_id = player['room']
    room = rooms.get(room_id)
    
    if not room or room['phase'] != 'night':
        return
    
    target_player = players.get(target_id)
    
    if not target_player or target_player['status'] != 'alive':
        await query.edit_message_text("❌ Игрок не найден или уже мертв.")
        return
    
    # Обработка действий
    if action == 'kill' and player['role'] == 'mafia':
        room['kill_target'] = target_id
        game_logs[room_id].append(f"Мафия выбрала цель: {target_player['name']}")
        await query.edit_message_text(f"✅ Вы выбрали {target_player['name']} для устранения.")
    
    elif action == 'check' and player['role'] == 'sheriff':
        room['check_target'] = target_id
        role = target_player['role']
        role_name = ROLES.get(role, role)
        game_logs[room_id].append(f"Шериф проверил игрока: {target_player['name']} ({role_name})")
        await query.edit_message_text(f"🔍 Игрок {target_player['name']} - {role_name}")
    
    elif action == 'heal' and player['role'] == 'doctor':
        room['heal_target'] = target_id
        game_logs[room_id].append(f"Доктор лечит: {target_player['name']}")
        await query.edit_message_text(f"💊 Вы лечите {target_player['name']}.")

async def end_night_phase(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Завершение ночной фазы и обработка действий."""
    room_id = context.job.data
    room = rooms.get(room_id)
    
    if not room or room['phase'] != 'night':
        return
    
    # Обработка действий
    killed_player = None
    if room['kill_target'] and room['kill_target'] != room['heal_target']:
        killed_id = room['kill_target']
        killed_player = players.get(killed_id)
        
        if killed_player and killed_player['status'] == 'alive':
            killed_player['status'] = 'dead'
            room['alive_players'].remove(killed_id)
            game_logs[room_id].append(f"⚰️ Игрок {killed_player['name']} был убит мафией!")
    
    # Сброс целей
    room['kill_target'] = None
    room['check_target'] = None
    room['heal_target'] = None
    room['protect_target'] = None
    room['murder_target'] = None
    
    # Проверка окончания игры
    if await check_game_over(context, room_id):
        return
    
    # Сообщение для всех игроков
    message = "☀️ Ночь окончена. Результаты:\n"
    if killed_player:
        message += f"⚰️ {killed_player['name']} был убит мафией!\n\n"
    else:
        message += "✅ Этой ночью никто не погиб!\n\n"
    
    message += f"День {room['day_count']} начинается!"
    
    for player_id in room['alive_players']:
        try:
            await context.bot.send_message(player_id, message)
        except:
            logger.warning(f"Не удалось отправить сообщение игроку {player_id}")
    
    # Начинаем дневную фазу
    await day_phase(context, room_id)

async def day_phase(context: ContextTypes.DEFAULT_TYPE, room_id: str) -> None:
    """Начало дневной фазы."""
    room = rooms[room_id]
    room['phase'] = 'day'
    room['phase_end'] = datetime.now() + timedelta(minutes=5)
    room['votes'] = {}
    
    # Сообщение для всех игроков
    alive_players = room['alive_players']
    player_list = "\n".join([f"👤 {players[p]['name']}" for p in alive_players])
    
    for player_id in alive_players:
        try:
            # Создаем клавиатуру для голосования
            vote_keyboard = []
            for target_id in alive_players:
                if target_id != player_id:
                    vote_keyboard.append(
                        [InlineKeyboardButton(
                            players[target_id]['name'], 
                            callback_data=f"vote_{target_id}"
                        )]
                    )
            
            # Добавляем кнопку "Воздержаться"
            vote_keyboard.append(
                [InlineKeyboardButton("🤷 Воздержаться", callback_data="vote_abstain")]
            )
            
            await context.bot.send_message(
                player_id,
                f"☀️ День {room['day_count']} начался!\n\n"
                f"Живые игроки:\n{player_list}\n\n"
                "Обсудите и проголосуйте за исключение игрока:",
                reply_markup=InlineKeyboardMarkup(vote_keyboard)
            )
        except Exception as e:
            logger.error(f"Ошибка при отправке сообщения: {e}")
    
    # Устанавливаем таймер для окончания дня
    context.job_queue.run_once(
        end_day_phase, 
        timedelta(minutes=5), 
        data=room_id,
        name=f"day_timer_{room_id}"
    )

async def handle_vote(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработка голосования игроков."""
    query = update.callback_query
    await query.answer()
    
    user = query.from_user
    player = players.get(user.id)
    
    if not player or not player['room']:
        return
    
    room_id = player['room']
    room = rooms.get(room_id)
    
    if not room or room['phase'] != 'day' or user.id not in room['alive_players']:
        return
    
    action, vote_target = query.data.split('_')
    
    # Обработка голоса
    if vote_target == 'abstain':
        room['votes'][user.id] = None
        await query.edit_message_text("✅ Вы воздержались от голосования.")
    else:
        target_id = int(vote_target)
        if target_id in room['alive_players']:
            room['votes'][user.id] = target_id
            target_name = players[target_id]['name']
            await query.edit_message_text(f"✅ Вы проголосовали против {target_name}.")
        else:
            await query.edit_message_text("❌ Игрок не найден.")
    
    # Проверяем, проголосовали ли все
    if len(room['votes']) == len(room['alive_players']):
        await end_day_phase(context, room_id)

async def end_day_phase(context: ContextTypes.DEFAULT_TYPE, room_id: str) -> None:
    """Завершение дневной фазы и подведение итогов голосования."""
    room = rooms.get(room_id)
    
    if not room or room['phase'] != 'day':
        return
    
    # Подсчет голосов
    vote_counts = {}
    for target_id in room['votes'].values():
        if target_id:
            vote_counts[target_id] = vote_counts.get(target_id, 0) + 1
    
    # Определяем исключенного игрока
    exiled_player = None
    if vote_counts:
        max_votes = max(vote_counts.values())
        candidates = [tid for tid, count in vote_counts.items() if count == max_votes]
        
        if len(candidates) == 1:
            exiled_id = candidates[0]
            exiled_player = players.get(exiled_id)
    
    # Обработка исключения
    message = "🌑 День окончен. Результаты голосования:\n\n"
    if exiled_player and exiled_player['status'] == 'alive':
        exiled_player['status'] = 'dead'
        room['alive_players'].remove(exiled_id)
        message += f"⚖️ {exiled_player['name']} был исключен игроками!\n"
    else:
        message += "✅ Никто не был исключен.\n"
    
    # Увеличиваем счетчик дней
    room['day_count'] += 1
    
    # Проверка окончания игры
    if await check_game_over(context, room_id):
        return
    
    # Отправляем сообщение всем игрокам
    for player_id in room['alive_players']:
        try:
            await context.bot.send_message(player_id, message + "\nНаступает ночь...")
        except:
            logger.warning(f"Не удалось отправить сообщение игроку {player_id}")
    
    # Начинаем ночную фазу
    await night_phase(context, room_id)

async def check_game_over(context: ContextTypes.DEFAULT_TYPE, room_id: str) -> bool:
    """Проверка условий окончания игры."""
    room = rooms.get(room_id)
    if not room:
        return False
    
    alive_players = room['alive_players']
    mafia_count = sum(1 for p in alive_players if players[p]['role'] == 'mafia')
    civilians_count = sum(1 for p in alive_players if players[p]['role'] in ['civilian', 'sheriff', 'doctor'])
    maniac_count = sum(1 for p in alive_players if players[p]['role'] == 'maniac')
    
    # Победа мафии
    if mafia_count >= len(alive_players) - mafia_count:
        await end_game(context, room_id, 'mafia')
        return True
    
    # Победа мирных
    if mafia_count == 0 and maniac_count == 0:
        await end_game(context, room_id, 'civilians')
        return True
    
    # Победа маньяка
    if maniac_count > 0 and len(alive_players) == 1:
        await end_game(context, room_id, 'maniac')
        return True
    
    return False

async def end_game(context: ContextTypes.DEFAULT_TYPE, room_id: str, winner: str) -> None:
    """Завершение игры и подведение итогов."""
    room = rooms.get(room_id)
    if not room:
        return
    
    # Определяем победителей
    winners = []
    if winner == 'mafia':
        winners = [p for p in room['players'] if players[p]['role'] == 'mafia']
    elif winner == 'civilians':
        winners = [p for p in room['alive_players']]
    elif winner == 'maniac':
        winners = [p for p in room['players'] if players[p]['role'] == 'maniac']
    
    # Обновляем статистику игроков
    for player_id in room['players']:
        players[player_id]['games_played'] += 1
        if player_id in winners:
            players[player_id]['games_won'] += 1
            if players[player_id]['role'] == 'mafia':
                players[player_id]['mafia_wins'] += 1
            else:
                players[player_id]['civilian_wins'] += 1
    
    # Формируем сообщение с результатами
    winner_name = ""
    if winner == 'mafia':
        winner_name = "Мафия"
    elif winner == 'civilians':
        winner_name = "Мирные жители"
    elif winner == 'maniac':
        winner_name = "Маньяк"
    
    message = f"🏁 Игра завершена! Победила {winner_name}!\n\n"
    message += "Результаты:\n"
    
    for player_id in room['players']:
        player = players[player_id]
        role_name = ROLES.get(player['role'], player['role'])
        status = "🏆 Победитель" if player_id in winners else "💀 Проигравший"
        message += f"👤 {player['name']} ({role_name}) - {status}\n"
    
    # Отправляем сообщение всем игрокам
    for player_id in room['players']:
        try:
            await context.bot.send_message(
                player_id, 
                message,
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton("🎮 В главное меню", callback_data='back_to_menu')]
                ])
            )
        except:
            logger.warning(f"Не удалось отправить сообщение игроку {player_id}")
    
    # Сбрасываем состояние комнаты
    for player_id in room['players']:
        players[player_id]['room'] = None
        players[player_id]['is_host'] = False
    
    # Удаляем комнату
    del rooms[room_id]
    del game_logs[room_id]

async def vip_shop(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Магазин VIP-ролей."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    
    player = players.get(user.id)
    if not player:
        return
    
    balance = player['balance']
    
    message = f"💎 VIP Магазин:\n\nВаш баланс: {balance} TON\n\n"
    keyboard = []
    
    for role_id, role_data in VIP_ROLES.items():
        cost = role_data['cost']
        can_buy = balance >= cost
        button_text = f"{role_data['name']} - {cost} TON"
        
        if can_buy:
            callback_data = f"buy_{role_id}"
        else:
            button_text += " ❌"
            callback_data = "cant_buy"
        
        keyboard.append([InlineKeyboardButton(button_text, callback_data=callback_data)])
        message += f"🎭 {role_data['name']} - {cost} TON\n{role_data['description']}\n\n"
    
    keyboard.append([InlineKeyboardButton("⬅️ Назад", callback_data='back_to_menu')])
    
    await query.edit_message_text(
        message,
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def buy_vip_role(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Покупка VIP-роли."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    
    _, role_id = query.data.split('_')
    player = players.get(user.id)
    
    if not player or role_id not in VIP_ROLES:
        return
    
    role_data = VIP_ROLES[role_id]
    cost = role_data['cost']
    
    if player['balance'] < cost:
        await query.answer("❌ Недостаточно средств!", show_alert=True)
        return
    
    # Совершаем покупку
    player['balance'] -= cost
    player['vip_role'] = role_id
    
    await query.edit_message_text(
        f"🎉 Поздравляем! Вы купили роль {role_data['name']}!\n\n"
        f"Теперь при создании новой игры вам будет автоматически выдана эта роль.\n\n"
        f"Ваш баланс: {player['balance']} TON",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("⬅️ Назад в магазин", callback_data='vip_shop')],
            [InlineKeyboardButton("🎮 В главное меню", callback_data='back_to_menu')]
        ])
    )

async def my_balance(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Показывает баланс пользователя."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    
    player = players.get(user.id)
    if not player:
        return
    
    balance = player['balance']
    
    await query.edit_message_text(
        f"💰 Ваш баланс: {balance} TON\n\n"
        "Вы можете использовать TON для покупки VIP-ролей в магазине.",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("💎 VIP Магазин", callback_data='vip_shop')],
            [InlineKeyboardButton("⬅️ Назад", callback_data='back_to_menu')]
        ])
    )

async def my_stats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Показывает статистику пользователя."""
    query = update.callback_query
    await query.answer()
    user = query.from_user
    
    player = players.get(user.id)
    if not player:
        return
    
    stats = (
        f"📊 Ваша статистика:\n\n"
        f"🎮 Игр сыграно: {player['games_played']}\n"
        f"🏆 Побед: {player['games_won']}\n"
        f"🔫 Побед за мафию: {player['mafia_wins']}\n"
        f"👨‍🌾 Побед за мирных: {player['civilian_wins']}\n"
        f"💰 Баланс: {player['balance']} TON"
    )
    
    await query.edit_message_text(
        stats,
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("⬅️ Назад", callback_data='back_to_menu')]
        ])
    )

async def back_to_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Возврат в главное меню."""
    query = update.callback_query
    await query.answer()
    
    keyboard = [
        [InlineKeyboardButton("🎮 Создать комнату", callback_data='create_room')],
        [InlineKeyboardButton("🔍 Присоединиться к игре", callback_data='join_room')],
        [InlineKeyboardButton("💰 Мой баланс", callback_data='my_balance')],
        [InlineKeyboardButton("🏆 Статистика", callback_data='my_stats')],
        [InlineKeyboardButton("💎 VIP Магазин", callback_data='vip_shop')]
    ]
    
    await query.edit_message_text(
        "👋 Добро пожаловать в игру Мафия!\n\nВыберите действие:",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )
    return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Отмена текущего действия и возврат в меню."""
    await update.message.reply_text(
        'Действие отменено.',
        reply_markup=ReplyKeyboardRemove()
    )
    return ConversationHandler.END

def main() -> None:
    """Запуск бота."""
    # Создаем приложение и передаем токен бота
    application = Application.builder().token("8073679860:AAHqweMOTy2Lun9j-H-sgbK_MbL5mUaTWLw").build()
    
    # Обработчики команд
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler('start', start)],
        states={
            CREATE_ROOM: [CallbackQueryHandler(create_room, pattern='^create_room$')],
            JOIN_ROOM: [
                CallbackQueryHandler(join_room, pattern='^join_room$'),
                MessageHandler(filters.TEXT & ~filters.COMMAND, join_room_id)
            ],
            LOBBY: [
                CommandHandler('startgame', start_game),
                CallbackQueryHandler(back_to_menu, pattern='^back_to_menu$')
            ],
            GAME_NIGHT: [
                CallbackQueryHandler(handle_night_action, pattern='^(kill|check|heal)_\d+$')
            ],
            GAME_DAY: [
                CallbackQueryHandler(handle_vote, pattern='^vote_')
            ]
        },
        fallbacks=[CommandHandler('cancel', cancel)],
    )
    
    # Регистрируем обработчики
    application.add_handler(conv_handler)
    application.add_handler(CallbackQueryHandler(vip_shop, pattern='^vip_shop$'))
    application.add_handler(CallbackQueryHandler(my_balance, pattern='^my_balance$'))
    application.add_handler(CallbackQueryHandler(my_stats, pattern='^my_stats$'))
    application.add_handler(CallbackQueryHandler(back_to_menu, pattern='^back_to_menu$'))
    application.add_handler(CallbackQueryHandler(buy_vip_role, pattern='^buy_'))
    
    # Запускаем бота
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
