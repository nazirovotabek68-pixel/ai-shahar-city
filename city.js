// AI SHAHAR 2036 — robot megapolis. 1 follower = 1 robot + 1 house.
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ======================= error overlay (shows the real reason if something breaks) =======================
const __errs = [];
function showErr(msg) { __errs.push(String(msg).slice(0, 400)); let el = document.getElementById('errbox'); if (!el) { el = document.createElement('pre'); el.id = 'errbox'; el.style.cssText = 'position:fixed;left:8px;right:8px;bottom:90px;z-index:99;max-height:40vh;overflow:auto;background:#300;color:#fdd;font:12px monospace;padding:10px;border-radius:8px;white-space:pre-wrap'; document.body.appendChild(el); } el.textContent = 'XATO / ERROR:\n' + __errs.join('\n---\n'); }
addEventListener('error', (e) => showErr((e.message || '') + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
addEventListener('unhandledrejection', (e) => showErr('promise: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
const CFG = Object.assign({ owner: 'otabeknazirov.aii', supabaseUrl: '', supabaseAnonKey: '', table: 'residents_claims', residentsTable: 'residents', overridesTable: 'robot_overrides', timezone: 'Asia/Tashkent', siteUrl: 'https://ai-shahar-city.vercel.app', botUsername: '' }, window.AISHAHAR_CONFIG || {});
const $ = (s) => document.querySelector(s);
const MOBILE = matchMedia('(pointer:coarse)').matches || innerWidth < 700;
const QS = new URLSearchParams(location.search);
const SEASON = (() => { const q = QS.get('season'); if (q) return q; const d = new Date(), m = d.getMonth(), day = d.getDate(); if (m === 11 || (m === 0 && day <= 15)) return 'winter'; if (m === 2 && day >= 14) return 'navruz'; return 'none'; })();
const ADMIN = (() => { try { if (QS.has('admin')) localStorage.setItem('aishahar_admin', '1'); return localStorage.getItem('aishahar_admin') === '1'; } catch (e) { return QS.has('admin'); } })();
const snowy = (c, k = 0.82) => SEASON === 'winter' ? '#' + new THREE.Color(c).lerp(new THREE.Color('#eef3f7'), k).getHexString() : c;
const LITE = MOBILE || /[?&]lite/.test(location.search) || (() => { try { return localStorage.getItem('aishahar_lite') === '1'; } catch (e) { return false; } })();
const OWNER = CFG.owner;

// ======================= i18n =======================
const I18N = {
  uz: { pop: 'aholi', tag: '1 obunachi = 1 robot', random: '🎲 Tasodifiy robot', tour: '✦ Kino rejimi', find: 'Top', map: 'XARITA',
    ph: 'Instagram nikneymingni yoz...', hint: 'Nikneymingni yoz va robotingni top', loader: "SHAHAR UYG'ONMOQDA...",
    home: 'Uyi', homeV: '{b}-mavze, {l}-uy', num: 'Aholi raqami', height: "Bo'yi", status: 'Hozir', type: 'Turi', boy: "O'g'il robot", girl: 'Qiz robot',
    near: 'Yaqinlashish', goHome: 'Uyiga', tourBtn: 'Kino rejimi', story: 'Storisga joylash', storyLive: 'Men AI SHAHAR 2036 da yashayman 🤖', storyFind: 'Sen ham robotingni top 👇', dl: 'Rasmni yuklab olish', share: 'Ulashish', copy: 'Havolani nusxalash', copied: 'Havola nusxalandi ✅', storyHint: "Rasmni storisga qo'ying, keyin «Havola» (Link) stikerini qo'shib, nusxalangan havolani joylang. Do'stlaring bosib, o'z robotini topadi.", making: 'Rasm tayyorlanmoqda...', tapHint: "Robot, uy yoki mashina ustiga bosing · sichqoncha bilan torting — shahar bo'ylab yuring · o'ng tugma — aylantiring · W A S D",
    newText: "Bu sening robotingning ko'rinishi 👆 U nikneymingdan yaratildi, boshqa hech kimda bunday robot yo'q.<br><br>Hozircha u shaharda yashamaydi. Tugmani bos — robot shaharga tushadi va unga uy quriladi.",
    claim: "Robotimni shaharga qo'y", toastNew: 'Roboting shaharga tushdi va uy oldi! 🤖🏠', typeNick: 'Nikneymingni yoz', full: "Shahar to'ldi, yangilanishni kuting",
    ownerRole: 'Shahar asoschisi', ownerAddr: 'Markaziy maydon', ownerH: "Shaharning eng katta roboti", randomRes: 'Tasodifiy aholi',
    cineExit: 'Chiqish uchun ekranga bosing', saveErr: "Saqlab bo'lmadi, internetni tekshirib qayta urinib ko'ring",
    st: { home: 'uyi oldida dam olyapti', walkHome: 'mahallasida sayr qilyapti', walkCity: "shahar bo'ylab sayr qilyapti", jog: 'stadionda yugurmoqda',
      cafe: "kafeda qahva ichyapti", restaurant: 'restoranda tushlik qilyapti', pool: 'basseyn yonida', fitness: 'fitnesda shug\'ullanyapti', billiard: 'bilyard o\'ynayapti', park: 'parkda dam olyapti', sports: 'sport majmuasida', mall: 'savdo markazida' },
    sign: { stadium: 'STADION', sports: 'SPORT MAJMUA', pool: 'BASSEYN', fitness: 'FITNES', restaurant: 'RESTORAN', cafe: 'KAFE', billiard: 'BILYARD', mall: 'SAVDO MARKAZI', park: 'PARK', free: "BO'SH JOYLAR · OBUNA BO'L" },
    lg: { down: 'Markaz', res: 'Turar joy', amen: 'Dam olish', park: 'Park', you: 'Siz', bots: 'Robotlar' },
    roles: ['Kontent menejeri', 'Tarjimon', 'Dasturchi', 'Dizayner', 'Montajchi', 'Marketolog', 'Ssenariy yozuvchi', 'Tahlilchi', 'Ustoz', 'Sotuv agenti', 'Musiqachi', 'Tadqiqotchi', 'Kotib', 'Strateg'] },
  ru: { pop: 'жителей', tag: '1 подписчик = 1 робот', random: '🎲 Случайный робот', tour: '✦ Режим кино', find: 'Найти', map: 'КАРТА',
    ph: 'Введи свой ник в Instagram...', hint: 'Введи ник и найди своего робота', loader: 'ГОРОД ПРОСЫПАЕТСЯ...',
    home: 'Дом', homeV: 'квартал {b}, дом {l}', num: 'Номер жителя', height: 'Рост', status: 'Сейчас', type: 'Тип', boy: 'Робот-парень', girl: 'Робот-девушка',
    near: 'Приблизить', goHome: 'К дому', tourBtn: 'Режим кино', story: 'В сторис', storyLive: 'Я живу в AI SHAHAR 2036 🤖', storyFind: 'Найди своего робота 👇', dl: 'Скачать картинку', share: 'Поделиться', copy: 'Копировать ссылку', copied: 'Ссылка скопирована ✅', storyHint: 'Поставь картинку в сторис, добавь стикер «Ссылка» и вставь скопированную ссылку. Друзья нажмут и найдут своего робота.', making: 'Готовим картинку...', tapHint: 'Нажми на робота, дом или машину · тяни мышью — двигайся по городу · правая кнопка — поворот · W A S D',
    newText: 'Так выглядит твой робот 👆 Он создан из твоего ника — ни у кого больше такого нет.<br><br>Пока он не живёт в городе. Нажми кнопку — робот появится и получит свой дом.',
    claim: 'Поселить моего робота', toastNew: 'Твой робот в городе и получил дом! 🤖🏠', typeNick: 'Введи свой ник', full: 'Город заполнен, ждите обновления',
    ownerRole: 'Основатель города', ownerAddr: 'Центральная площадь', ownerH: 'Самый большой робот города', randomRes: 'Случайный житель',
    cineExit: 'Нажми на экран, чтобы выйти', saveErr: 'Не удалось сохранить, проверь интернет и попробуй ещё раз',
    st: { home: 'отдыхает у дома', walkHome: 'гуляет по району', walkCity: 'гуляет по городу', jog: 'бегает на стадионе',
      cafe: 'пьёт кофе в кафе', restaurant: 'обедает в ресторане', pool: 'у бассейна', fitness: 'тренируется в фитнесе', billiard: 'играет в бильярд', park: 'отдыхает в парке', sports: 'в спорткомплексе', mall: 'в торговом центре' },
    sign: { stadium: 'СТАДИОН', sports: 'СПОРТКОМПЛЕКС', pool: 'БАССЕЙН', fitness: 'ФИТНЕС', restaurant: 'РЕСТОРАН', cafe: 'КАФЕ', billiard: 'БИЛЬЯРД', mall: 'ТОРГОВЫЙ ЦЕНТР', park: 'ПАРК', free: 'СВОБОДНЫЕ УЧАСТКИ · ПОДПИШИСЬ' },
    lg: { down: 'Центр', res: 'Жилой район', amen: 'Отдых', park: 'Парк', you: 'Вы', bots: 'Роботы' },
    roles: ['Контент-менеджер', 'Переводчик', 'Программист', 'Дизайнер', 'Монтажёр', 'Маркетолог', 'Сценарист', 'Аналитик', 'Наставник', 'Агент продаж', 'Музыкант', 'Исследователь', 'Секретарь', 'Стратег'] },
  en: { pop: 'residents', tag: '1 follower = 1 robot', random: '🎲 Random robot', tour: '✦ Cinema mode', find: 'Find', map: 'MAP',
    ph: 'Type your Instagram username...', hint: 'Type your username and find your robot', loader: 'THE CITY IS WAKING UP...',
    home: 'Home', homeV: 'block {b}, house {l}', num: 'Resident no.', height: 'Height', status: 'Now', type: 'Type', boy: 'Boy robot', girl: 'Girl robot',
    near: 'Zoom in', goHome: 'Go home', tourBtn: 'Cinema mode', story: 'Share to story', storyLive: 'I live in AI SHAHAR 2036 🤖', storyFind: 'Find your robot 👇', dl: 'Download image', share: 'Share', copy: 'Copy link', copied: 'Link copied ✅', storyHint: 'Post the image to your story, add the «Link» sticker and paste the copied link. Friends tap it and find their own robot.', making: 'Making the image...', tapHint: 'Tap a robot, house or car · drag to move around · right-drag to rotate · W A S D',
    newText: "This is what your robot looks like 👆 It was generated from your username — nobody else has this one.<br><br>It doesn't live in the city yet. Tap the button and it moves in and gets its own house.",
    claim: 'Move my robot in', toastNew: 'Your robot moved in and got a house! 🤖🏠', typeNick: 'Type your username', full: 'The city is full, wait for the next update',
    ownerRole: 'City founder', ownerAddr: 'Central square', ownerH: 'The biggest robot in town', randomRes: 'Random resident',
    cineExit: 'Tap the screen to exit', saveErr: "Couldn't save — check your connection and try again",
    st: { home: 'relaxing at home', walkHome: 'strolling the neighbourhood', walkCity: 'walking around town', jog: 'running at the stadium',
      cafe: 'having coffee at the cafe', restaurant: 'having lunch at the restaurant', pool: 'at the pool', fitness: 'working out at the gym', billiard: 'playing billiards', park: 'relaxing in the park', sports: 'at the sports center', mall: 'at the mall' },
    sign: { stadium: 'STADIUM', sports: 'SPORTS CENTER', pool: 'POOL', fitness: 'FITNESS', restaurant: 'RESTAURANT', cafe: 'CAFE', billiard: 'BILLIARDS', mall: 'MALL', park: 'PARK', free: 'FREE LOTS · FOLLOW' },
    lg: { down: 'Downtown', res: 'Residential', amen: 'Leisure', park: 'Park', you: 'You', bots: 'Robots' },
    roles: ['Content manager', 'Translator', 'Developer', 'Designer', 'Video editor', 'Marketer', 'Scriptwriter', 'Analyst', 'Mentor', 'Sales agent', 'Musician', 'Researcher', 'Assistant', 'Strategist'] },
};
const I18N_X = {
  uz: { chat: 'Shahar chati', online: 'onlayn', chatPh: 'Xabar yozing...', chatSend: 'Yuborish', chatWho: 'Nikneymingiz (shahar aholisi bo\'lsangiz)', chatGuest: "Shaharda bo'lmasangiz, mehmon sifatida yozasiz", chatSlow: 'Biroz kuting, juda tez yozyapsiz', chatLimit: "10 daqiqada 20 tadan ko'p yozib bo'lmaydi", chatSoon: 'Chat tez orada ishga tushadi', chatEmpty: "Hali xabar yo'q. Birinchi bo'lib yozing! 👋", chatAdmin: 'Admin paroli', chatPwWrong: "Parol noto'g'ri, qaytadan yozing", chatNickBad: "Bu nikneym shaharda yo'q — maydonni bo'sh qoldiring, mehmon sifatida yozasiz", chatErr: "Yuborib bo'lmadi", chatRules: "Hurmat bilan yozing. Havolalar va so'kinishlar avtomatik bloklanadi.", drive: 'Boshqarish', driveHint: "Joystik yoki W A S D bilan yuring", driveExit: 'Chiqish', more: 'Batafsil', upgrade: '💎 Uyimni yaxshilash', sponsors: 'Shahar homiylari', sponsorsHint: "Uyini donat orqali yaxshilagan obunachilar ❤️ Rahmat!", level: 'Daraja', tierNames: { 1: 'Kumush villa', 2: 'Oltin qasr', 3: 'Olmos saroy' }, upgradedLive: '💎 @{n} uyini {t}ga aylantirdi!', newText: "Bu sening robotingning ko'rinishi 👆 U nikneymingdan yaratildi, boshqa hech kimda bunday robot yo'q. Hozircha u shaharda yashamaydi.", soon: 'OBUNACHIDA OCHILADI', goalDone: 'Barcha bosqichlar ochildi 🏆', unlocked: '{x} ochildi! 🎉 Sahifani yangilang', follow: "📸 Instagramda obuna bo'lish",
    followFirst: "Shaharga ko'chib o'tish uchun <b>@{o}</b> ga obuna bo'l. Yangi obunachilar muntazam shaharga ko'chiriladi va robotingga uy quriladi 🏠", moved: "shaharga ko'chib keldi", liveNew: "🆕 @{n} hozirgina shaharga ko'chib keldi!",
    vipTitle: 'Haftaning faollari', vipBadge: 'Haftaning faoli', vipHint: "Eng ko'p izoh qoldirgan obunachilar — robotlariga toj kiygizildi 👑", rec: '🎬 Reel', recording: 'Yozilmoqda...', recDone: 'Video tayyor va yuklab olindi ✅', recNo: "Bu brauzer video yozishni qo'llamaydi",
    goals: { airport: 'Aeroport', metro: 'Metro', beach: "Dengiz bo'yi", f1: 'Formula-1 trassasi' },
    says: { home: ['Uyimda dam olyapman 🏠', "Bugun AI haqida yangi narsa o'rgandim 🤖", 'Qo\'shnilarim juda yaxshi odamlar'], walk: ['Shahar bugun juda chiroyli ✨', 'Sayr — eng yaxshi dam olish 🚶', 'Aeroport qachon ochilarkan? ✈️'], sport: ['Yana bir aylana! 🏃', "Sport — robotning moyi 💪", 'Bugun rekord qo\'yaman 🏆'], food: ['Bu yerda qahva zo\'r ☕', 'Plov qachon tayyor bo\'ladi? 🍛', 'Yangi naushnik olmoqchiman 🎧'], fun: ['Bu zarbani ko\'r! 🎱', 'Daraxtlar ostida o\'ylayapman 🌳', 'Dam olish ham kerak 😌'], all: ['@{o} ning yangi videosini ko\'rdingmi? 👀', "Do'stlarimni ham shaharga chaqiraman 📲"] } },
  ru: { chat: 'Чат города', online: 'онлайн', chatPh: 'Напишите сообщение...', chatSend: 'Отправить', chatWho: 'Ваш ник (если вы житель города)', chatGuest: 'Если вас нет в городе — пишете как гость', chatSlow: 'Подождите немного', chatLimit: 'Не больше 20 сообщений за 10 минут', chatSoon: 'Чат скоро заработает', chatEmpty: 'Пока нет сообщений. Напишите первым! 👋', chatAdmin: 'Пароль админа', chatPwWrong: 'Неверный пароль, попробуйте ещё раз', chatNickBad: 'Такого ника нет в городе — оставьте поле пустым и пишите как гость', chatErr: 'Не удалось отправить', chatRules: 'Пишите уважительно. Ссылки и мат блокируются автоматически.', drive: 'Управлять', driveHint: 'Джойстик или W A S D', driveExit: 'Выйти', more: 'Подробнее', upgrade: '💎 Улучшить дом', sponsors: 'Спонсоры города', sponsorsHint: 'Подписчики, улучшившие дом через донат ❤️ Спасибо!', level: 'Уровень', tierNames: { 1: 'Серебряная вилла', 2: 'Золотой замок', 3: 'Бриллиантовый дворец' }, upgradedLive: '💎 @{n} превратил(а) дом в «{t}»!', newText: 'Так выглядит твой робот 👆 Он создан из твоего ника — ни у кого больше такого нет. Пока он не живёт в городе.', soon: 'ПОДПИСЧИКОВ — ОТКРЫТИЕ', goalDone: 'Все этапы открыты 🏆', unlocked: '{x} открыт! 🎉 Обнови страницу', follow: '📸 Подписаться в Instagram',
    followFirst: 'Чтобы переехать в город, подпишись на <b>@{o}</b>. Новых подписчиков регулярно заселяют в город и строят роботу дом 🏠', moved: 'переехал(а) в город', liveNew: '🆕 @{n} только что переехал(а) в город!',
    vipTitle: 'Активисты недели', vipBadge: 'Активист недели', vipHint: 'Подписчики с самыми активными комментариями — их роботы в коронах 👑', rec: '🎬 Reel', recording: 'Запись...', recDone: 'Видео готово и скачано ✅', recNo: 'Этот браузер не умеет записывать видео',
    goals: { airport: 'Аэропорт', metro: 'Метро', beach: 'Пляж', f1: 'Трасса Формулы-1' },
    says: { home: ['Отдыхаю дома 🏠', 'Сегодня узнал новое про ИИ 🤖', 'У меня классные соседи'], walk: ['Город сегодня очень красивый ✨', 'Прогулка — лучший отдых 🚶', 'Когда откроют аэропорт? ✈️'], sport: ['Ещё один круг! 🏃', 'Спорт — масло для робота 💪', 'Сегодня поставлю рекорд 🏆'], food: ['Здесь отличный кофе ☕', 'Когда будет плов? 🍛', 'Хочу новые наушники 🎧'], fun: ['Смотри, какой удар! 🎱', 'Думаю под деревьями 🌳', 'Отдыхать тоже нужно 😌'], all: ['Видел новое видео @{o}? 👀', 'Позову друзей в город 📲'] } },
  en: { chat: 'City chat', online: 'online', chatPh: 'Type a message...', chatSend: 'Send', chatWho: 'Your username (if you live in the city)', chatGuest: "If you're not in the city you'll write as a guest", chatSlow: 'Slow down a little', chatLimit: 'Max 20 messages per 10 minutes', chatSoon: 'Chat is coming soon', chatEmpty: 'No messages yet. Say hi first! 👋', chatAdmin: 'Admin password', chatPwWrong: 'Wrong password, try again', chatNickBad: 'This username is not in the city — leave it empty to write as a guest', chatErr: "Couldn't send", chatRules: 'Be respectful. Links and swearing are blocked automatically.', drive: 'Drive', driveHint: 'Joystick or W A S D', driveExit: 'Exit', more: 'Details', upgrade: '💎 Upgrade my house', sponsors: 'City sponsors', sponsorsHint: 'Followers who upgraded their house with a donation ❤️ Thank you!', level: 'Level', tierNames: { 1: 'Silver villa', 2: 'Gold castle', 3: 'Diamond palace' }, upgradedLive: '💎 @{n} turned their house into a {t}!', newText: "This is your robot 👆 It was generated from your username — nobody else has this one. It doesn't live in the city yet.", soon: 'FOLLOWERS TO UNLOCK', goalDone: 'All stages unlocked 🏆', unlocked: '{x} unlocked! 🎉 Reload the page', follow: '📸 Follow on Instagram',
    followFirst: 'To move into the city, follow <b>@{o}</b>. New followers are moved in regularly and their robot gets a house 🏠', moved: 'moved into the city', liveNew: '🆕 @{n} just moved into the city!',
    vipTitle: 'Top fans of the week', vipBadge: 'Top fan of the week', vipHint: 'Followers with the most comments — their robots wear crowns 👑', rec: '🎬 Reel', recording: 'Recording...', recDone: 'Video ready and downloaded ✅', recNo: "This browser can't record video",
    goals: { airport: 'Airport', metro: 'Metro', beach: 'Beach', f1: 'Formula-1 track' },
    says: { home: ['Chilling at home 🏠', 'Learned something new about AI today 🤖', 'My neighbours are great'], walk: ['The city looks amazing today ✨', 'A walk is the best rest 🚶', 'When does the airport open? ✈️'], sport: ['One more lap! 🏃', 'Sport is oil for robots 💪', 'Going for a record today 🏆'], food: ['Great coffee here ☕', 'When is the plov ready? 🍛', 'I want new headphones 🎧'], fun: ['Check out this shot! 🎱', 'Thinking under the trees 🌳', 'Rest matters too 😌'], all: ['Seen the new video by @{o}? 👀', "I'll invite my friends to the city 📲"] } },
};
const SIGN_X = { uz: { airport: 'AEROPORT', metro: 'METRO', beach: "DENGIZ BO'YI", f1: 'FORMULA-1', winter: 'YANGI YIL MUBORAK! 🎄', navruz: "NAVRO'Z MUBORAK! 🌷" },
  ru: { airport: 'АЭРОПОРТ', metro: 'МЕТРО', beach: 'ПЛЯЖ', f1: 'ФОРМУЛА-1', winter: 'С НОВЫМ ГОДОМ! 🎄', navruz: 'С НАВРУЗОМ! 🌷' },
  en: { airport: 'AIRPORT', metro: 'METRO', beach: 'BEACH', f1: 'FORMULA-1', winter: 'HAPPY NEW YEAR! 🎄', navruz: 'HAPPY NAVRUZ! 🌷' } };
for (const l of Object.keys(I18N)) { Object.assign(I18N[l], I18N_X[l]); Object.assign(I18N[l].sign, SIGN_X[l]); }
const I18N_G = {"uz": {"driveOwn": "Faqat o'z robotingizni boshqara olasiz 🎮 Avval robotingizni toping va «🙋 Bu men» ni bosing", "isMe": "🙋 Bu men", "shop": "🛍 Do'kon", "board": "Reyting", "boardC": "💎 Kristallar", "boardS": "🔥 Seriya", "boardL": "❤️ Eng chiroyli uylar", "likesW": "bu hafta", "meSet": "Endi siz @{n} sifatida o'ynaysiz! 🎮 Robotingni boshqarib, kristallarni yig'", "taken": "Bu robot boshqa qurilmaga bog'langan", "bonus": "🔥 {s} kunlik seriya! Bugungi sovg'a: +{b} 💎", "crystalHint": "💎 Kristallarni yig'ish uchun o'z robotingni boshqar (kartada 🙋 Bu men → 🎮 Boshqarish)", "got": "+{v} 💎", "allGot": "🎉 Bugungi hamma kristallarni yig'ding! Ertaga yangilari chiqadi", "poor": "Kristall yetmaydi 💎", "buy": "Olish", "equip": "Kiyish", "unequip": "Yechish", "owned": "bor", "liked": "❤️ Like qo'yildi!", "likeBtn": "Like", "shopTitle": "Robot do'koni", "shopHint": "Kristallarni shahar bo'ylab yig'asiz, har kuni kirsangiz sovg'a beriladi 🔥", "items": {"cap_red": "Qizil kepka", "cap_blue": "Ko'k kepka", "cap_gold": "Oltin kepka", "shades": "Qora ko'zoynak", "neon_phones": "Neon naushnik", "cape": "Qahramon plashi", "halo": "Nur halqasi", "dog": "Robo-kuchukcha 🐕", "cat": "Robo-mushuk 🐈"}, "today": "Bugun", "left": "qoldi", "onb": ["🔎 Pastdagi qatorga Instagram nikneymingni yoz — robotingni top", "🙋 Kartada «Bu men» ni bos, keyin 🎮 «Boshqarish» bilan shahar bo'ylab yur", "💎 Kristallarni yig', har kuni kir — 🔥 seriya o'ssin! Do'kondan robotingga kiyim va uy hayvoni ol"], "onbTitle": "AI SHAHAR ga xush kelibsiz! 🤖", "next": "Keyingi ▸", "start": "Boshladik! 🚀", "skip": "O'tkazib yuborish", "weekTop": "Haftaning eng chiroyli uyi 🏆"}, "ru": {"driveOwn": "Управлять можно только своим роботом 🎮 Найдите своего робота и нажмите «🙋 Это я»", "isMe": "🙋 Это я", "shop": "🛍 Магазин", "board": "Рейтинг", "boardC": "💎 Кристаллы", "boardS": "🔥 Серия", "boardL": "❤️ Самые красивые дома", "likesW": "на этой неделе", "meSet": "Теперь вы играете как @{n}! 🎮 Управляйте роботом и собирайте кристаллы", "taken": "Этот робот привязан к другому устройству", "bonus": "🔥 Серия {s} дн.! Подарок сегодня: +{b} 💎", "crystalHint": "💎 Чтобы собирать кристаллы, управляйте своим роботом (в карточке 🙋 Это я → 🎮 Управлять)", "got": "+{v} 💎", "allGot": "🎉 Все кристаллы на сегодня собраны! Завтра появятся новые", "poor": "Не хватает кристаллов 💎", "buy": "Купить", "equip": "Надеть", "unequip": "Снять", "owned": "есть", "liked": "❤️ Лайк поставлен!", "likeBtn": "Лайк", "shopTitle": "Магазин робота", "shopHint": "Кристаллы собираются по городу, за ежедневный вход — подарок 🔥", "items": {"cap_red": "Красная кепка", "cap_blue": "Синяя кепка", "cap_gold": "Золотая кепка", "shades": "Тёмные очки", "neon_phones": "Неон-наушники", "cape": "Плащ героя", "halo": "Нимб", "dog": "Робо-щенок 🐕", "cat": "Робо-кот 🐈"}, "today": "Сегодня", "left": "осталось", "onb": ["🔎 Введите свой ник в Instagram внизу — найдите своего робота", "🙋 В карточке нажмите «Это я», затем 🎮 «Управлять» и гуляйте по городу", "💎 Собирайте кристаллы и заходите каждый день — 🔥 серия растёт! В магазине — одежда и питомцы"], "onbTitle": "Добро пожаловать в AI SHAHAR! 🤖", "next": "Далее ▸", "start": "Поехали! 🚀", "skip": "Пропустить", "weekTop": "Самый красивый дом недели 🏆"}, "en": {"driveOwn": "You can only drive your own robot 🎮 Find your robot and tap «🙋 That's me»", "isMe": "🙋 That's me", "shop": "🛍 Shop", "board": "Leaderboard", "boardC": "💎 Crystals", "boardS": "🔥 Streak", "boardL": "❤️ Prettiest houses", "likesW": "this week", "meSet": "You're now playing as @{n}! 🎮 Drive your robot and collect crystals", "taken": "This robot is linked to another device", "bonus": "🔥 {s}-day streak! Today's gift: +{b} 💎", "crystalHint": "💎 To collect crystals, drive your own robot (card → 🙋 That's me → 🎮 Drive)", "got": "+{v} 💎", "allGot": "🎉 You collected all of today's crystals! New ones tomorrow", "poor": "Not enough crystals 💎", "buy": "Buy", "equip": "Wear", "unequip": "Take off", "owned": "owned", "liked": "❤️ Liked!", "likeBtn": "Like", "shopTitle": "Robot shop", "shopHint": "Collect crystals around the city, come back daily for a gift 🔥", "items": {"cap_red": "Red cap", "cap_blue": "Blue cap", "cap_gold": "Gold cap", "shades": "Sunglasses", "neon_phones": "Neon headphones", "cape": "Hero cape", "halo": "Halo", "dog": "Robo-puppy 🐕", "cat": "Robo-cat 🐈"}, "today": "Today", "left": "left", "onb": ["🔎 Type your Instagram username below — find your robot", "🙋 On the card tap «That's me», then 🎮 «Drive» around the city", "💎 Collect crystals and come back daily — 🔥 grow your streak! Buy outfits and pets in the shop"], "onbTitle": "Welcome to AI SHAHAR! 🤖", "next": "Next ▸", "start": "Let's go! 🚀", "skip": "Skip", "weekTop": "Prettiest house of the week 🏆"}};
for (const l of Object.keys(I18N)) Object.assign(I18N[l], I18N_G[l]);
const I18N_A = {"uz": {"recTitle": "🔑 Robotingizni tiklash kodi", "recText": "Bu kodni saqlab qo'ying (skrinshot qiling)! Telefon almashsa yoki brauzer tozalansa, robotingiz va kristallaringizni shu kod bilan qaytarasiz.", "recAsk": "Bu robot boshqa qurilmaga bog'langan. Agar u sizniki bo'lsa, tiklash kodini kiriting:", "recBtn": "Tiklash", "recBad": "Kod noto'g'ri", "recOk": "Robotingiz qaytdi! 🎉", "recSaved": "Tiklash kodi", "admin": "Admin", "adminPw": "Admin paroli", "adminSave": "Kirish", "stats": "Statistika", "visitors": "Tashrif buyuruvchilar (kunlik)", "players": "O'yinchilar", "msgs": "Chat xabarlari", "refs": "Qayerdan kelishgan (7 kun)", "unlink": "Robotni bo'shatish (nikneym)", "unlinkBtn": "Bo'shatish", "unlinked": "Robot bo'shatildi", "bans": "Bloklanganlar", "unban": "Blokdan chiqarish", "banned": "Siz chatda bloklangansiz", "delAsk": "O'chirildi", "banAsk": "Bloklandi"}, "ru": {"recTitle": "🔑 Код восстановления робота", "recText": "Сохраните этот код (сделайте скриншот)! Если смените телефон или очистите браузер — вернёте робота и кристаллы этим кодом.", "recAsk": "Этот робот привязан к другому устройству. Если он ваш — введите код восстановления:", "recBtn": "Восстановить", "recBad": "Неверный код", "recOk": "Робот вернулся! 🎉", "recSaved": "Код восстановления", "admin": "Админ", "adminPw": "Пароль админа", "adminSave": "Войти", "stats": "Статистика", "visitors": "Посетители (по дням)", "players": "Игроки", "msgs": "Сообщения в чате", "refs": "Откуда пришли (7 дней)", "unlink": "Освободить робота (ник)", "unlinkBtn": "Освободить", "unlinked": "Робот освобождён", "bans": "Заблокированные", "unban": "Разблокировать", "banned": "Вы заблокированы в чате", "delAsk": "Удалено", "banAsk": "Заблокирован"}, "en": {"recTitle": "🔑 Your robot recovery code", "recText": "Save this code (take a screenshot)! If you change phone or clear the browser, this code brings back your robot and crystals.", "recAsk": "This robot is linked to another device. If it is yours, enter the recovery code:", "recBtn": "Recover", "recBad": "Wrong code", "recOk": "Your robot is back! 🎉", "recSaved": "Recovery code", "admin": "Admin", "adminPw": "Admin password", "adminSave": "Log in", "stats": "Stats", "visitors": "Visitors (daily)", "players": "Players", "msgs": "Chat messages", "refs": "Where they came from (7 days)", "unlink": "Release a robot (username)", "unlinkBtn": "Release", "unlinked": "Robot released", "bans": "Banned", "unban": "Unban", "banned": "You are banned from the chat", "delAsk": "Deleted", "banAsk": "Banned"}};
for (const l of Object.keys(I18N)) Object.assign(I18N[l], I18N_A[l]);
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
let LANG = store.get('aishahar_lang') || (/^(ru|kk|ky|be|uk|tg)/.test(navigator.language || '') ? 'ru' : 'uz');
if (!I18N[LANG]) LANG = 'uz';
const T = (k) => I18N[LANG][k] ?? I18N.uz[k] ?? k;

// ======================= helpers =======================
function hash(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const clean = (s) => s.trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._]/g, '').slice(0, 30);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ease = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const NEON = ['#39ff88', '#50d7ff', '#ff4fd8', '#a78bff', '#ffc94a', '#ff6a5c', '#4dffe4'];

// ======================= data =======================
const shared = { on: !!(CFG.supabaseUrl && CFG.supabaseAnonKey), client: null };
let sbPromise = null;
function sb() {
  if (!shared.on) return Promise.resolve(null);
  if (!sbPromise) sbPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
    .then(({ createClient }) => (shared.client = createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: false } })))
    .catch((e) => { console.warn('supabase', e); shared.on = false; return null; });
  return sbPromise;
}
async function fetchAll(table, cols, order) {
  const c = await sb(); if (!c) throw new Error('no client');
  const out = []; let from = 0;
  while (true) { const q = c.from(table).select(cols); const { data, error } = await (order ? q.order(order, { ascending: true }) : q).range(from, from + 999); if (error) throw error; out.push(...data); if (data.length < 1000) break; from += 1000; }
  return out;
}
function demoNames(n) {
  const A = ['aziz','dilnoza','javohir','madina','sardor','nilufar','bekzod','shahzod','malika','jasur','kamola','umid','sevara','doniyor','zarina','islom','gulnora','rustam','feruza','timur'];
  const r = rng(2036), set = new Set();
  while (set.size < n) set.add(pick(r, A) + pick(r, ['', '_', '.']) + Math.floor(r() * 900 + 10));
  return [...set];
}
async function loadResidents() {
  try { const res = await fetch('residents.json', { cache: 'no-cache' }); if (res.ok) { const j = await res.json(); const list = (Array.isArray(j) ? j : j.residents || []).map((s) => clean(String(s))).filter(Boolean); if (list.length) return { list, demo: !!j.demo }; } } catch (e) {}
  if (shared.on) { try { const rows = await fetchAll(CFG.residentsTable, 'nickname', 'ord'); if (rows.length) return { list: rows.map((r) => clean(r.nickname)).filter(Boolean), demo: false }; } catch (e) { console.warn('residents', e); } }
  return { list: demoNames(300), demo: true };
}
let CLAIM_ROWS = [];
async function loadClaims() {
  if (shared.on) { try { const rows = await fetchAll(CFG.table, 'nickname,created_at', 'created_at'); CLAIM_ROWS = rows; return rows.map((r) => r.nickname); } catch (e) { console.warn('claims', e); shared.on = false; } }
  try { return JSON.parse(store.get('aishahar_claimed') || '[]'); } catch (e) { return []; }
}
async function loadOverrides() {
  const m = new Map();
  try { const res = await fetch('overrides.json', { cache: 'no-cache' }); if (res.ok) for (const [k, v] of Object.entries(await res.json())) if (v === 'm' || v === 'f') m.set(clean(k), v); } catch (e) {}
  if (shared.on) { try { for (const r of await fetchAll(CFG.overridesTable, 'nickname,gender')) if (r.gender === 'm' || r.gender === 'f') m.set(clean(r.nickname), r.gender); } catch (e) { /* table optional */ } }
  return m;
}
const VIP = new Map(); let VIP_WEEK = '';
async function loadVip() {
  try { const res = await fetch('vip.json', { cache: 'no-cache' }); if (!res.ok) return; const j = await res.json(); VIP_WEEK = j.week || '';
    (j.top || []).forEach((e, i) => { const n = clean(String(e.nick || e)); if (n) VIP.set(n, i + 1); }); } catch (e) {}
}
async function saveClaim(name) {
  if (shared.on && (await sb())) { const { error } = await shared.client.from(CFG.table).insert({ nickname: name }); if (error && error.code !== '23505') throw error; return; }
  const arr = JSON.parse(store.get('aishahar_claimed') || '[]'); arr.push(name); store.set('aishahar_claimed', JSON.stringify(arr));
}

// ======================= gender heuristic =======================
const FEM_NAMES = ['malika','madina','dilnoza','zarina','nilufar','sevara','zilola','feruza','gulnora','laylo','nodira','mohira','nigora','zuhra','ziyoda','ruhsora','ruxsora','shaxzoda','shahzoda','parizod','umida','farangis','aisha','oisha','bonu','asal','muslima','sabina','kristi','mira','angel','lili','mona','mavluda','khanifa','xanifa','ruhshona','ruxshona','munisa','munitta','kamola','gulya','dildora','nargiza','shahnoza','nozima','diyora','mohinur','mahliyo','sarvinoz','sitora','yulduz','dinara','aziza','barno','hilola','lola','marjona','robiya','soliha','fotima','fatima','oydin','mehriniso','nasiba','gulnoza','komila','nafisa','shoira','maftuna','iroda','durdona','charos','dilshoda','girl','princess','queen','lady','miss','sweety','pretty','prett','dear'];
function isFemale(n) {
  const s = n.replace(/[^a-z]/g, ' ');
  if (/(ovna|evna|owna|qizi|kizi|kyzy|ovaa|evaa)/.test(n)) return true;
  if (/(^|[^a-z])[a-z]*(ova|eva)($|[^a-z])/.test(s)) return true;
  if (/xon($|[^a-z])|khon($|[^a-z])/.test(s)) return true;
  return FEM_NAMES.some((f) => n.includes(f));
}

// ======================= city layout =======================
const LOTS = 3, LOT = 14.66, INNER = LOTS * LOT, SLAB = INNER + 6, ROAD = 10, PITCH = SLAB + ROAD; // 60
const HPB = 8; // houses per residential block (centre lot = garden)
const BLOCKS = [];
{ const R = 14; for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) BLOCKS.push([x, z]);
  BLOCKS.sort((a, b) => (Math.max(Math.abs(a[0]), Math.abs(a[1])) - Math.max(Math.abs(b[0]), Math.abs(b[1]))) || (Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]))); }
const ringOf = (b) => Math.max(Math.abs(b[0]), Math.abs(b[1]));
const AMEN_TYPES = ['stadium', 'restaurant', 'cafe', 'pool', 'park', 'fitness', 'mall', 'cafe', 'sports', 'billiard', 'park', 'restaurant', 'cafe', 'park', 'fitness', 'cafe'];
const blockInfo = BLOCKS.map((b, i) => {
  const r = ringOf(b); let type = 'res';
  if (r === 0) type = 'plaza'; else if (r === 1) type = 'down'; else if (r === 2) type = AMEN_TYPES[(i - 9) % AMEN_TYPES.length];
  return { bx: b[0], bz: b[1], cx: b[0] * PITCH, cz: b[1] * PITCH, ring: r, type };
});
const resBlocks = blockInfo.filter((b) => b.type === 'res');
const LOT_ORDER = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1]];
function houseSlot(i) {
  const bi = Math.floor(i / HPB), l = i % HPB, b = resBlocks[bi];
  const [lx, lz] = LOT_ORDER[l];
  const x = b.cx + (lx - 1) * LOT, z = b.cz + (lz - 1) * LOT;
  // house faces the nearest street (outward from block centre)
  const dx = lx - 1, dz = lz - 1; let face;
  if (dz !== 0 && (dx === 0 || hash('f' + i) % 2)) face = dz > 0 ? 0 : Math.PI; else face = dx > 0 ? Math.PI / 2 : -Math.PI / 2;
  return { b, bi, l, x, z, face, block: bi + 1, lotNo: l + 1 };
}

// ======================= renderer / scene =======================
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, LITE ? 1.25 : 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.debug.onShaderError = (gl, prog, vs, fs) => showErr('shader: ' + (gl.getShaderInfoLog(vs) || '') + ' ' + (gl.getShaderInfoLog(fs) || '') + ' ' + (gl.getProgramInfoLog(prog) || ''));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const SHADOWS = !LITE;
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); try { localStorage.setItem('aishahar_lite', '1'); } catch (_) {} if (!LITE) location.reload(); else showErr('WebGL context lost'); });
if (SHADOWS) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe0ee, 260, 1300);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.5, 6000);
const controls = new MapControls(camera, renderer.domElement);
controls.screenSpacePanning = false; controls.zoomToCursor = true; controls.panSpeed = MOBILE ? 1.6 : 1.2; controls.rotateSpeed = 0.6; controls.zoomSpeed = MOBILE ? 1.4 : 1;
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }; renderer.domElement.style.touchAction = 'none';
for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI * 0.48; controls.minDistance = 6; controls.maxDistance = 1600;
const skyCanvas = document.createElement('canvas'); skyCanvas.width = 4; skyCanvas.height = 256;
const skyTex = new THREE.CanvasTexture(skyCanvas); skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex;
const hemi = new THREE.HemisphereLight(0xdfefff, 0x55606b, 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dd, 2.2); scene.add(sun); scene.add(sun.target);
if (SHADOWS) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const c = sun.shadow.camera; c.left = -140; c.right = 140; c.top = 140; c.bottom = -140; c.near = 10; c.far = 900; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.6; }
const SUN_DIR = new THREE.Vector3(0.45, 0.8, 0.35).normalize();
let stars;
{ const n = 900, p = new Float32Array(n * 3), r = rng(7); for (let i = 0; i < n; i++) { const th = r() * Math.PI * 2, ph = r() * 0.45 * Math.PI, R = 2600; p[i * 3] = R * Math.cos(th) * Math.cos(ph); p[i * 3 + 1] = R * Math.sin(ph) + 100; p[i * 3 + 2] = R * Math.sin(th) * Math.cos(ph); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xbfd8ff, size: 2, sizeAttenuation: false, fog: false, transparent: true })); scene.add(stars); }

// ======================= textures =======================
function canvasTex(w, h, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; }
const towerTex = canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#d9dee5'; g.fillRect(0, 0, w, h); const r = rng(5);
  for (let y = 6; y < h; y += 16) for (let x = 6; x < w; x += 16) { g.fillStyle = r() > .4 ? '#2b3a4a' : '#3d5268'; g.fillRect(x, y, 11, 11); } });
const towerEmi = canvasTex(128, 512, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const r = rng(6);
  for (let y = 6; y < h; y += 16) for (let x = 6; x < w; x += 16) { if (r() > .45) { g.fillStyle = r() > .5 ? '#ffd9a0' : '#fff2d6'; g.fillRect(x, y, 11, 11); } } });
const houseTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  for (const y of [22, 74]) for (const x of [14, 54, 94]) { g.fillStyle = '#2f3e4e'; g.fillRect(x, y, 22, 30); g.fillStyle = '#ffffff'; g.fillRect(x + 10, y, 2, 30); g.fillRect(x, y + 14, 22, 2); } });
const houseEmi = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); const r = rng(9);
  for (const y of [22, 74]) for (const x of [14, 54, 94]) { if (r() > .35) { g.fillStyle = '#ffcf8a'; g.fillRect(x, y, 22, 30); } } });

// ======================= static instanced batches =======================
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler(), COL = new THREE.Color(), YAX = new THREE.Vector3(0, 1, 0);
const up = (g) => g.translate(0, 0.5, 0);
let HLOG = null; const houseParts = [], houseOfInst = [];
// ---- static collision grid (houses, towers, fences, trees…) used when driving your robot ----
const CCELL = 8, CGRID = new Map(); const ckey = (cx, cz) => cx * 100003 + cz;
function addColl(c) { for (let cx = Math.floor(c.x0 / CCELL); cx <= Math.floor(c.x1 / CCELL); cx++) for (let cz = Math.floor(c.z0 / CCELL); cz <= Math.floor(c.z1 / CCELL); cz++) { const k = ckey(cx, cz); (CGRID.get(k) || CGRID.set(k, []).get(k)).push(c); } }
function remColl(c) { if (c) c.dead = true; }
function collBox(x, y, z, sx, sy, sz, ry, base) { const y0 = base ? y : y - sy / 2, y1 = y0 + sy; if (y0 > 1.5 || y1 < 0.55 || sx < 0.12 || sz < 0.12) return null;
  const cs = Math.abs(Math.cos(ry)), sn = Math.abs(Math.sin(ry)), hx = (cs * sx + sn * sz) / 2, hz = (sn * sx + cs * sz) / 2; if (hx > 70 || hz > 70) return null;
  const c = { x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz }; addColl(c); return c; }
function hitStatic(x, z, r) { const k = ckey(Math.floor(x / CCELL), Math.floor(z / CCELL)); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const l = CGRID.get(k + dx * 100003 + dz); if (!l) continue;
  for (const c of l) if (!c.dead && x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1) return true; } return false; }
class Batch {
  constructor(geo, mat, cap, { cast = true, recv = true } = {}) { this.mesh = new THREE.InstancedMesh(geo, mat, cap); this.cap = cap; this.n = 0; this.mesh.count = 0; this.mesh.castShadow = SHADOWS && cast; this.mesh.receiveShadow = SHADOWS && recv; scene.add(this.mesh); }
  add(x, y, z, sx, sy, sz, color, ry = 0, rx = 0, rz = 0) { if (this.n >= this.cap) return -1; const i = this.n++; if (HLOG) HLOG.push([this, i]); E.set(rx, ry, rz); Q.setFromEuler(E); M.compose(P.set(x, y, z), Q, S.set(sx, sy, sz)); this.mesh.setMatrixAt(i, M); this.mesh.setColorAt(i, COL.set(color)); if (this.solid) { (this.col ||= [])[i] = collBox(x, y, z, sx, sy, sz, ry, this.solid === 1); } return i; }
  done() { this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; this.mesh.computeBoundingSphere(); this.mesh.computeBoundingBox && this.mesh.computeBoundingBox(); }
}
const matStd = (o = {}) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0.05 }, o));
const B = {
  box: new Batch(up(new THREE.BoxGeometry(1, 1, 1)), matStd(), 40000),
  cyl: new Batch(up(new THREE.CylinderGeometry(0.5, 0.5, 1, 12)), matStd(), 12000),
  cone: new Batch(up(new THREE.ConeGeometry(0.5, 1, 10)), matStd(), 6000),
  sph: new Batch(new THREE.SphereGeometry(0.5, 12, 8), matStd(), 8000),
  roof: new Batch(up(new THREE.ConeGeometry(0.7072, 1, 4).rotateY(Math.PI / 4)), matStd({ roughness: 0.7 }), 3000),
  tower: new Batch(up(new THREE.BoxGeometry(1, 1, 1)), matStd({ map: towerTex, emissiveMap: towerEmi, emissive: new THREE.Color(0xffe2b0), emissiveIntensity: 0.0, roughness: 0.25, metalness: 0.5 }), 600),
  house: new Batch(up(new THREE.BoxGeometry(1, 1, 1)), matStd({ map: houseTex, emissiveMap: houseEmi, emissive: new THREE.Color(0xffd29a), emissiveIntensity: 0.0 }), 3000),
  paint: new Batch(up(new THREE.BoxGeometry(1, 1, 1)), matStd({ roughness: 0.6 }), 20000, { cast: false }),
  glow: new Batch(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), 6000, { cast: false, recv: false }),
  water: new Batch(up(new THREE.BoxGeometry(1, 1, 1)), matStd({ color: 0xffffff, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 }), 1500, { cast: false }),
};
for (const k of ['box', 'cyl', 'cone', 'house', 'tower']) B[k].solid = 1;
const box = (...a) => B.box.add(...a);
const glowBase = []; // remember glow colours for day/night dimming
function glow(x, y, z, s, color, nightOnly = true) { const i = B.glow.add(x, y, z, s, s, s, color); glowBase[i] = { c: new THREE.Color(color), nightOnly }; return i; }

// signs (individual meshes so they can be re-rendered when language changes)
const signs = [];
function signTex(text, bg, fg) {
  return canvasTex(512, 128, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = fg; let fs = 70; g.font = `700 ${fs}px "Space Grotesk", Arial`; while (g.measureText(text).width > w - 40 && fs > 20) { fs -= 4; g.font = `700 ${fs}px "Space Grotesk", Arial`; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4); });
}
function addSign(key, x, y, z, w, ry, bg = '#0b1020', fg = '#39ff88') {
  const mat = new THREE.MeshBasicMaterial({ map: signTex(typeof key === 'function' ? key() : T('sign')[key], bg, fg), toneMapped: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), mat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
  const back = new THREE.Mesh(m.geometry, mat); back.rotation.y = Math.PI; back.position.z = -0.05; m.add(back);
  signs.push({ m, key, bg, fg }); return m;
}
function refreshSigns() { for (const s of signs) { s.m.material.map.dispose(); s.m.material.map = signTex(typeof s.key === 'function' ? s.key() : T('sign')[s.key], s.bg, s.fg); s.m.material.needsUpdate = true; } }
const faceToCentre = (cx, cz) => Math.abs(cx) >= Math.abs(cz) ? (cx > 0 ? -Math.PI / 2 : Math.PI / 2) : (cz > 0 ? Math.PI : 0);
const dirOf = (ry) => [Math.sin(ry), Math.cos(ry)];

// ======================= spots where robots spend time =======================
const SPOTS = {}; // type -> [{x,z,yaw}]
const spot = (type, x, z, yaw) => (SPOTS[type] ||= []).push({ x, z, yaw });
const amenityBlocks = {};

// ======================= city builders =======================
const asphaltMat = matStd({ color: 0x3a3f47, roughness: 0.95 });
const grassMat = matStd({ color: 0x6f9e4f, roughness: 1 });
let cityExtent = 0, HWY = 0, cityRings = 3;

function buildGround(rings) {
  cityRings = rings; cityExtent = (rings + 0.5) * PITCH; HWY = cityExtent + 30;
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), grassMat); grass.rotation.x = -Math.PI / 2; grass.position.y = -0.05; grass.receiveShadow = SHADOWS; scene.add(grass);
  const asph = new THREE.Mesh(new THREE.PlaneGeometry(2 * (HWY + 14), 2 * (HWY + 14)), asphaltMat); asph.rotation.x = -Math.PI / 2; asph.position.y = -0.02; asph.receiveShadow = SHADOWS; scene.add(asph);
  // green belt between the grid and the highway
  const belt = (x, z, w, d) => box(x, -0.02, z, w, 0.12, d, snowy('#6f9e4f'));
  const g0 = cityExtent + 4, g1 = HWY - 11, mid = (g0 + g1) / 2, wd = g1 - g0;
  belt(0, mid, 2 * g1, wd); belt(0, -mid, 2 * g1, wd); belt(mid, 0, wd, 2 * g0); belt(-mid, 0, wd, 2 * g0);
  const r = rng(77);
  for (let i = 0; i < 260; i++) { const side = i % 4, t = (r() - 0.5) * 2 * g1, o = g0 + 3 + r() * (wd - 6);
    const [x, z] = side === 0 ? [t, o] : side === 1 ? [t, -o] : side === 2 ? [o, t] : [-o, t]; tree(x, z, 0.8 + r() * 0.6, r); }
  // lane paint on grid roads + crosswalks
  for (let k = -rings; k <= rings + 1; k++) {
    const v = (k - 0.5) * PITCH;
    for (let j = -rings; j <= rings; j++) {
      const c = j * PITCH;
      for (let s = -SLAB / 2 + 3; s < SLAB / 2 - 3; s += 6) { B.paint.add(c + s, 0, v, 3, 0.04, 0.25, '#f2f2f2'); B.paint.add(v, 0, c + s, 0.25, 0.04, 3, '#f2f2f2'); }
    }
    for (let j = -rings; j <= rings + 1; j++) {
      const w = (j - 0.5) * PITCH;
      for (let s = -3.5; s <= 3.5; s += 1.4) { B.paint.add(w + s, 0, v - ROAD / 2 - 1.6, 0.7, 0.04, 2.6, '#ffffff'); B.paint.add(w + s, 0, v + ROAD / 2 + 1.6, 0.7, 0.04, 2.6, '#ffffff'); }
    }
  }
  // highway: wide 4-lane loop with yellow median + white dashes
  for (const sgn of [-1, 1]) for (const axis of [0, 1]) {
    const L = 2 * HWY;
    const at = (a, b) => axis === 0 ? [a, sgn * HWY + b] : [sgn * HWY + b, a];
    { const [x, z] = at(0, -0.4); B.paint.add(x, 0, z, axis === 0 ? L : 0.25, 0.05, axis === 0 ? 0.25 : L, '#f5c518'); }
    { const [x, z] = at(0, 0.4); B.paint.add(x, 0, z, axis === 0 ? L : 0.25, 0.05, axis === 0 ? 0.25 : L, '#f5c518'); }
    for (let s = -HWY; s < HWY; s += 9) for (const o of [-5.5, 5.5]) { const [x, z] = at(s, o); B.paint.add(x, 0, z, axis === 0 ? 4 : 0.25, 0.05, axis === 0 ? 0.25 : 4, '#f2f2f2'); }
    for (const o of [-11.5, 11.5]) { const [x, z] = at(0, o); B.box.add(x, 0, z, axis === 0 ? L + 24 : 0.6, 0.9, axis === 0 ? 0.6 : L + 24, '#b0b6be'); } // guard rails
  }
}

function tree(x, z, s, r) { B.cyl.add(x, 0, z, 0.5 * s, 2.6 * s, 0.5 * s, '#6b4a2f'); const g = pick(r, ['#3f7d3a', '#4b8f3f', '#2f6b34', '#5a9a46']);
  if (r() < 0.5) B.sph.add(x, 3.6 * s, z, 3.4 * s, 3.2 * s, 3.4 * s, g); else B.cone.add(x, 2.2 * s, z, 3.2 * s, 4.6 * s, 3.2 * s, g); }
function bench(x, z, ry) { box(x, 0.45, z, 2.4, 0.15, 0.8, '#8a5a3b', ry); const [dx, dz] = dirOf(ry); box(x - dx * 0.35, 0.6, z - dz * 0.35, 2.4, 0.7, 0.12, '#8a5a3b', ry); }
function streetLamp(x, z) { B.cyl.add(x, 0, z, 0.22, 6.5, 0.22, '#3b4048'); glow(x, 6.6, z, 0.9, '#ffe7b5'); }

function slab(b, top) { box(b.cx, 0, b.cz, SLAB, 0.3, SLAB, '#b9bec6'); if (top) box(b.cx, 0.3, b.cz, INNER, 0.06, INNER, top); }
function blockLamps(b) { for (const sx of [-1, 1]) for (const sz of [-1, 1]) streetLamp(b.cx + sx * (SLAB / 2 - 1), b.cz + sz * (SLAB / 2 - 1)); }

function buildPlaza(b) {
  slab(b, '#cfc8bb');
  for (let i = -3; i <= 3; i++) { box(b.cx + i * 6, 0.36, b.cz, 0.3, 0.02, INNER, '#b9b2a4'); box(b.cx, 0.36, b.cz + i * 6, INNER, 0.02, 0.3, '#b9b2a4'); }
  B.cyl.add(b.cx, 0.3, b.cz, 26, 0.8, 26, '#9aa3ad'); B.water.add(b.cx, 0.6, b.cz, 24, 0.5, 24, '#4fb3e8');
  const r = rng(3); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; tree(b.cx + Math.cos(a) * 19, b.cz + Math.sin(a) * 19, 0.7, r); bench(b.cx + Math.cos(a + 0.26) * 16, b.cz + Math.sin(a + 0.26) * 16, -a - Math.PI / 2); }
  blockLamps(b);
}
function buildDowntown(b, idx) {
  slab(b, '#a9aeb6'); const r = rng(1000 + idx);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = b.cx + sx * 11, z = b.cz + sz * 11, w = 15 + r() * 4, h = 45 + Math.pow(r(), 1.5) * 120;
    const tint = pick(r, ['#9fb4c9', '#c9d3dd', '#8fa7a0', '#b9a98f', '#a3b0c2', '#d8dde3']);
    B.tower.add(x, 0.3, z, w, h, w, tint);
    box(x, h + 0.3, z, w * 0.8, 3, w * 0.8, '#6b7480');
    if (r() < 0.6) { B.cyl.add(x, h + 3.3, z, 0.4, 10 + r() * 14, 0.4, '#d0d4da'); glow(x, h + 14 + r() * 8, z, 1.2, '#ff3b3b', false); }
  }
  blockLamps(b);
}
function buildAmenity(b) {
  const t = b.type, cx = b.cx, cz = b.cz, ry = faceToCentre(cx, cz), [fx, fz] = dirOf(ry), r = rng(hash(t + cx + ',' + cz));
  (amenityBlocks[t] ||= []).push(b);
  const signAt = (dist, y, w, bg, fg) => addSign(t, cx + fx * dist, y, cz + fz * dist, w, ry, bg, fg);
  if (t === 'stadium') {
    slab(b, '#9aa29a');
    const field = new THREE.Mesh(new THREE.CircleGeometry(1, 48), matStd({ color: 0x3d9a46 })); field.rotation.x = -Math.PI / 2; field.scale.set(13, 8, 1); field.position.set(cx, 0.4, cz); field.receiveShadow = SHADOWS; scene.add(field);
    const track = new THREE.Mesh(new THREE.RingGeometry(1, 1.28, 64), matStd({ color: 0xb8553a })); track.rotation.x = -Math.PI / 2; track.scale.set(14, 9, 1); track.position.set(cx, 0.38, cz); track.receiveShadow = SHADOWS; scene.add(track);
    for (let i = 0; i < 72; i++) { if (i % 18 < 2) continue; const a = i / 72 * Math.PI * 2, rx = 20.5, rz = 15; for (let k = 0; k < 4; k++) box(cx + Math.cos(a) * (rx + k * 0.9), 0.3, cz + Math.sin(a) * (rz + k * 0.9), 2.2, 1.2 + k * 1.3, 1.1, k % 2 ? '#2d6cdf' : '#e8eef5', -a); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { B.cyl.add(cx + sx * 21, 0.3, cz + sz * 16, 0.5, 22, 0.5, '#8d949c'); box(cx + sx * 21, 22, cz + sz * 16, 4, 2, 0.6, '#30353d'); glow(cx + sx * 21, 23, cz + sz * 16, 1.6, '#fffbe8'); }
    box(cx, 0.4, cz, 0.3, 0.02, 15, '#ffffff'); signAt(23, 9, 20, '#0b1020', '#ffffff');
    for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2; spot('stadium', cx + Math.cos(a) * 18, cz + Math.sin(a) * 12, -a); }
  } else if (t === 'pool') {
    slab(b, '#d8d2c4');
    box(cx - fx * 14, 0.3, cz - fz * 14, Math.abs(fx) ? 12 : 40, 9, Math.abs(fx) ? 40 : 12, '#e9edf2', 0);
    B.water.add(cx + fx * 4, 0.32, cz + fz * 4, Math.abs(fx) ? 16 : 30, 0.12, Math.abs(fx) ? 30 : 16, '#2fb7e6');
    for (let i = -4; i <= 4; i++) { const px = cx + fx * 15 + (Math.abs(fx) ? 0 : i * 3.4), pz = cz + fz * 15 + (Math.abs(fx) ? i * 3.4 : 0); box(px, 0.36, pz, 1.2, 0.35, 2.4, '#ffffff', ry); B.cone.add(px + 1.3, 0.36, pz, 0.12, 3, 0.12, '#888'); B.cone.add(px + 1.3, 2.6, pz, 3, 0.9, 3, pick(r, ['#ff6b6b', '#ffd166', '#4dd0e1'])); spot('pool', px, pz, ry + Math.PI); }
    signAt(-7.8, 7.5, 14, '#0f4c81', '#ffffff');
  } else if (t === 'fitness' || t === 'billiard' || t === 'restaurant' || t === 'cafe' || t === 'mall') {
    const big = t === 'mall', W = big ? 38 : t === 'restaurant' ? 26 : t === 'fitness' ? 30 : 20, D = big ? 30 : 16, H = big ? 22 : t === 'fitness' ? 12 : 8;
    slab(b, t === 'cafe' || t === 'restaurant' ? '#cdbfa8' : '#b4b9c1');
    const bx = cx - fx * (big ? 3 : 8), bz = cz - fz * (big ? 3 : 8);
    const colors = { fitness: '#2b2f3a', billiard: '#1e2a24', restaurant: '#7a3e2b', cafe: '#c98b5b', mall: '#d9dee5' };
    if (big) B.tower.add(bx, 0.3, bz, Math.abs(fx) ? D : W, H, Math.abs(fx) ? W : D, '#cfd6de'); else box(bx, 0.3, bz, Math.abs(fx) ? D : W, H, Math.abs(fx) ? W : D, colors[t]);
    // glass front + awning
    const gx = bx + fx * (D / 2 + 0.05), gz = bz + fz * (D / 2 + 0.05);
    box(gx, 0.3, gz, Math.abs(fx) ? 0.2 : W * 0.85, H * 0.55, Math.abs(fx) ? W * 0.85 : 0.2, '#3a5068');
    if (t === 'cafe' || t === 'restaurant') { const aw = pick(r, ['#e74c3c', '#2ecc71', '#f39c12', '#16a085']); for (let i = 0; i < 8; i++) { const o = (i - 3.5) * (W * 0.85 / 8); box(gx + fx * 1.4 + (Math.abs(fx) ? 0 : o), H * 0.58, gz + fz * 1.4 + (Math.abs(fx) ? o : 0), Math.abs(fx) ? 3 : W * 0.85 / 8, 0.3, Math.abs(fx) ? W * 0.85 / 8 : 3, i % 2 ? '#ffffff' : aw, 0, Math.abs(fz) ? -fz * 0.35 : 0, Math.abs(fx) ? fx * 0.35 : 0); } }
    signAt(D / 2 - (big ? 3 : 8) + 0.3, H * 0.8, big ? 24 : 12, t === 'billiard' ? '#0b0b0b' : '#0b1020', t === 'billiard' ? '#ff4fd8' : t === 'fitness' ? '#ffc94a' : '#39ff88');
    // terrace / outdoor area in front
    const n = t === 'mall' ? 6 : 6;
    for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 6.5; const tx = cx + fx * 12 + (Math.abs(fx) ? 0 : o), tz = cz + fz * 12 + (Math.abs(fx) ? o : 0);
      if (t === 'fitness') { box(tx, 0.36, tz, 0.2, 2.6, 0.2, '#555'); box(tx + 1.8, 0.36, tz, 0.2, 2.6, 0.2, '#555'); box(tx + 0.9, 2.8, tz, 2, 0.15, 0.15, '#777'); spot('fitness', tx + 0.9, tz + 1.2, ry); }
      else if (t === 'billiard') { box(tx, 0.36, tz, 3.4, 0.9, 2, '#1f6b3a'); box(tx, 1.25, tz, 3.6, 0.15, 2.2, '#5a3a22'); spot('billiard', tx, tz + 1.8, ry + Math.PI); }
      else if (t === 'mall') { bench(tx, tz, ry); spot('mall', tx, tz + 1.5, ry); tree(tx, tz - 4, 0.7, r); }
      else { B.cyl.add(tx, 0.36, tz, 1.8, 1.0, 1.8, '#f2efe8'); B.cyl.add(tx, 0.36, tz, 0.12, 3.2, 0.12, '#666'); B.cone.add(tx, 3.2, tz, 4, 1.1, 4, pick(r, ['#e74c3c', '#ffffff', '#2ecc71', '#f39c12'])); spot(t, tx + 1.6, tz, -Math.PI / 2 + ry); spot(t, tx - 1.6, tz, Math.PI / 2 + ry); }
    }
    for (let i = 0; i < 4; i++) tree(cx + (i < 2 ? -1 : 1) * 19, cz + (i % 2 ? -1 : 1) * 19, 0.7, r);
  } else if (t === 'sports') {
    slab(b, '#a8b0a5');
    const court = (x, z, w, d, col, lines) => { box(x, 0.3, z, w, 0.1, d, col); box(x, 0.4, z, w - 1, 0.02, 0.25, lines); box(x, 0.4, z - d / 2 + 0.6, w - 1, 0.02, 0.2, lines); box(x, 0.4, z + d / 2 - 0.6, w - 1, 0.02, 0.2, lines); };
    court(cx - 10, cz - 10, 18, 16, '#2f7d5b', '#ffffff'); court(cx + 10, cz - 10, 18, 16, '#2f5f9e', '#ffffff'); court(cx, cz + 10, 38, 18, '#c46b3b', '#ffffff');
    box(cx - 10, 0.4, cz - 10, 0.15, 1.1, 14, '#eeeeee'); box(cx + 10, 0.4, cz - 10, 0.15, 1.1, 14, '#eeeeee');
    for (const sx of [-1, 1]) { B.cyl.add(cx + sx * 17, 0.3, cz + 10, 0.2, 3.4, 0.2, '#777'); box(cx + sx * 17, 3.4, cz + 10, 0.2, 1.2, 1.8, '#ffffff'); }
    for (let i = 0; i < 10; i++) spot('sports', cx + (r() - 0.5) * 34, cz + (r() - 0.5) * 34, r() * 6.28);
    signAt(22.5, 5, 16);
  } else { // park
    slab(b, snowy('#7fb05a'));
    for (let i = 0; i < 14; i++) tree(cx + (r() - 0.5) * 40, cz + (r() - 0.5) * 40, 0.6 + r() * 0.6, r);
    box(cx, 0.36, cz, INNER, 0.04, 3, '#d8cfb5'); box(cx, 0.36, cz, 3, 0.04, INNER, '#d8cfb5');
    B.water.add(cx + 10, 0.3, cz + 10, 12, 0.15, 9, '#3aa0d8');
    for (let i = 0; i < 6; i++) { const bx2 = cx + (i % 2 ? 3 : -3), bz2 = cz - 18 + i * 6; bench(bx2, bz2, i % 2 ? -Math.PI / 2 : Math.PI / 2); spot('park', bx2 + (i % 2 ? -1 : 1), bz2, i % 2 ? Math.PI / 2 : -Math.PI / 2); }
    signAt(23, 3, 8, '#1b4d2a', '#ffffff');
  }
  blockLamps(b);
}
const houseIdx = []; // resident index -> house instance info
const MINI = ['cafe', 'park', 'sports', 'fitness', 'pool', 'restaurant', 'billiard', 'park', 'cafe', 'sports'];
function buildResidentialBlock(b, bi) {
  slab(b, snowy('#7aa85a')); blockLamps(b);
  // the middle lot of every block is a small neighbourhood place, so leisure is spread over the whole city
  const t = MINI[(bi * 7 + (b.bx & 3)) % MINI.length], cx = b.cx, cz = b.cz, r = rng(500 + bi), ry = faceToCentre(cx, cz), A = LOT - 2;
  const sign = (key, y = 3.2, bg = '#0b1020', fg = '#39ff88') => { const [fx, fz] = dirOf(ry); addSign(key, cx + fx * (A / 2 - 0.4), y, cz + fz * (A / 2 - 0.4), 5.2, ry, bg, fg); };
  if (t === 'cafe' || t === 'restaurant') {
    box(cx, 0.32, cz, A, 0.06, A, '#d9cbb2'); const [fx, fz] = dirOf(ry), kx = cx - fx * 3.4, kz = cz - fz * 3.4;
    box(kx, 0.36, kz, Math.abs(fx) ? 3.4 : 6, 3, Math.abs(fx) ? 6 : 3.4, t === 'cafe' ? '#c98b5b' : '#7a3e2b'); box(kx + fx * 1.9, 2.6, kz + fz * 1.9, Math.abs(fx) ? 1.2 : 6.4, 0.25, Math.abs(fx) ? 6.4 : 1.2, pick(r, ['#e74c3c', '#2ecc71', '#f39c12', '#16a085']));
    for (const o of [-2.6, 0, 2.6]) { const tx = cx + fx * 2 + (Math.abs(fx) ? 0 : o), tz = cz + fz * 2 + (Math.abs(fx) ? o : 0); B.cyl.add(tx, 0.36, tz, 1.2, 0.8, 1.2, '#f2efe8'); B.cyl.add(tx, 0.36, tz, 0.1, 2.6, 0.1, '#666'); B.cone.add(tx, 2.6, tz, 2.8, 0.8, 2.8, pick(r, ['#e74c3c', '#ffffff', '#ffd166'])); spot(t, tx + 1.1, tz, -Math.PI / 2); spot(t, tx - 1.1, tz, Math.PI / 2); }
    sign(t);
  } else if (t === 'park') {
    box(cx, 0.32, cz, A, 0.06, A, snowy('#86b866')); box(cx + 2.5, 0.36, cz - 2.5, 4.5, 0.12, 4.5, '#e8d39a'); // sandbox
    box(cx - 2.5, 0.36, cz + 1, 0.2, 2.6, 0.2, '#e74c3c'); box(cx - 2.5, 2.6, cz + 1, 0.4, 0.4, 2.8, '#3498db', 0, 0.6); box(cx - 3.2, 0.36, cz - 2, 0.15, 2.4, 0.15, '#f1c40f'); box(cx - 1.4, 0.36, cz - 2, 0.15, 2.4, 0.15, '#f1c40f'); box(cx - 2.3, 2.6, cz - 2, 2.2, 0.15, 0.15, '#f1c40f'); // slide + swing
    tree(cx + 3.5, cz + 3.5, 0.55, r); tree(cx - 4, cz + 4.2, 0.45, r); bench(cx + 3, cz + 0.6, Math.PI / 2); spot('park', cx + 2.2, cz + 0.6, -Math.PI / 2); spot('park', cx + 2.4, cz - 2.5, 0);
  } else if (t === 'sports') {
    box(cx, 0.32, cz, A, 0.08, A, '#c46b3b'); box(cx, 0.42, cz, A - 1, 0.02, 0.18, '#ffffff'); B.cyl.add(cx, 0.4, cz, 2, 0.02, 2, '#ffffff');
    for (const sg of [-1, 1]) { B.cyl.add(cx + sg * (A / 2 - 0.6), 0.36, cz, 0.15, 3.4, 0.15, '#777'); box(cx + sg * (A / 2 - 0.9), 3.3, cz, 0.15, 1.1, 1.7, '#ffffff'); }
    for (let k = 0; k < 4; k++) spot('sports', cx + (r() - 0.5) * 8, cz + (r() - 0.5) * 8, r() * 6.28); sign('sports', 3, '#0b1020', '#ffc94a');
  } else if (t === 'fitness') {
    box(cx, 0.32, cz, A, 0.07, A, '#5b6b7a');
    for (let k = 0; k < 4; k++) { const tx = cx - 4 + k * 2.7, tz = cz - 1.5; box(tx, 0.36, tz, 0.15, 2.4, 0.15, '#555'); box(tx + 1.5, 0.36, tz, 0.15, 2.4, 0.15, '#555'); box(tx + 0.75, 2.6, tz, 1.6, 0.12, 0.12, '#888'); spot('fitness', tx + 0.75, tz + 1.1, Math.PI); }
    box(cx, 0.36, cz + 3, 4, 0.5, 1, '#ffc94a'); spot('fitness', cx + 1, cz + 3.8, Math.PI); sign('fitness', 3, '#0b1020', '#ffc94a');
  } else if (t === 'pool') {
    box(cx, 0.32, cz, A, 0.06, A, '#e8e2d4'); B.water.add(cx, 0.36, cz - 1, 8, 0.12, 5, '#2fb7e6');
    for (const o of [-3, 0, 3]) { box(cx + o, 0.36, cz + 3.6, 1.1, 0.35, 2.2, '#ffffff'); spot('pool', cx + o, cz + 3.6, Math.PI); } sign('pool', 3, '#0f4c81', '#ffffff');
  } else { // billiard club
    box(cx, 0.32, cz, A, 0.06, A, '#b4b9c1'); box(cx, 0.36, cz - 1, 8, 3.6, 6, '#1e2a24'); box(cx, 3.96, cz - 1, 8.4, 0.3, 6.4, '#111');
    const [fx, fz] = dirOf(ry); for (const o of [-2.5, 2.5]) { const tx = cx + fx * 4 + (Math.abs(fx) ? 0 : o), tz = cz + fz * 4 + (Math.abs(fx) ? o : 0); box(tx, 0.36, tz, 2.4, 0.8, 1.5, '#1f6b3a'); spot('billiard', tx, tz + 1.2, Math.PI); }
    sign('billiard', 4.6, '#0b0b0b', '#ff4fd8');
  }
}
const UPG = new Map(); let UPG_ROWS = [];
async function loadUpgrades() { if (QS.has('upgdemo')) { const l = await loadResidents(); [3, 2, 1].forEach((t, k) => { const n = l.list[k * 9 + 4]; UPG.set(n, t); UPG_ROWS.push({ nickname: n, tier: t, stars: [0, 100, 250, 500][t], created_at: '' }); }); return; } if (!shared.on) return; try { UPG_ROWS = await fetchAll('upgrades', 'nickname,tier,stars,created_at', 'created_at'); for (const r of UPG_ROWS) { const n = clean(r.nickname); UPG.set(n, Math.max(UPG.get(n) || 0, r.tier)); } } catch (e) { /* table optional until donations are set up */ } }
const TIER_INFO = { 1: { icon: '🥈', bg: 'rgba(205,214,224,.96)', fg: '#10151c' }, 2: { icon: '🥇', bg: 'rgba(255,196,0,.96)', fg: '#1c1400' }, 3: { icon: '💎', bg: 'rgba(80,215,255,.96)', fg: '#03141c' } };
function houseType(name) {
  const tier = UPG.get(name) || 0; if (tier === 3) return 'palace'; if (tier === 2) return 'goldcastle'; if (tier === 1) return 'silvervilla';
  if (VIP.has(name)) return 'castle';
  const v = hash(name + 'htype') % 100;
  return v < 7 ? 'castle' : v < 30 ? 'villa' : v < 55 ? 'modern' : v < 70 ? 'twin' : 'cottage';
}
function addHouse(i, name) {
  HLOG = []; const h = houseSlot(i), r = rng(hash(name + 'house')); let type = houseType(name); const tierT = type;
  const gold = type === 'goldcastle', silver = type === 'silvervilla'; if (gold) type = 'castle'; if (silver) type = 'villa';
  const [fx, fz] = dirOf(h.face), ax = Math.abs(fx) > 0.5;
  // lot-local helpers: f = towards the street, s = sideways
  const P2 = (f, s) => [h.x + fx * f + (ax ? 0 : s), h.z + fz * f + (ax ? s : 0)];
  const S2 = (w, d) => (ax ? [d, w] : [w, d]);
  const bx = (f, s, y, w, hgt, d, c, batch = B.box) => { const [x, z] = P2(f, s), [sx, sz] = S2(w, d); return batch.add(x, y, z, sx, hgt, sz, c, ax ? 0 : 0); };
  const HL = LOT / 2 - 0.35;
  const hedge = (c, hgt, gap = 3) => { // perimeter with an opening at the front
    bx(-HL, 0, 0.3, LOT - 0.7, hgt, 0.5, c); bx(0, -HL, 0.3, 0.5, hgt, LOT - 0.7, c); bx(0, HL, 0.3, 0.5, hgt, LOT - 0.7, c);
    const half = (LOT - 0.7 - gap) / 2; bx(HL, -(gap / 2 + half / 2), 0.3, half, hgt, 0.5, c); bx(HL, gap / 2 + half / 2, 0.3, half, hgt, 0.5, c); };
  const roofC = () => snowy(pick(r, ['#8e3b2f', '#5b4636', '#3e4a5a', '#7a2e2e', '#4f5d4a', '#2f3e46']), 0.6);
  const wall = pick(r, ['#f3efe6', '#e9d8c4', '#d8e3ec', '#f5e1c8', '#e6e6e6', '#cfe0d0', '#f0d6d6', '#d9d2e9']);
  bx(4.6, 0, 0.36, 2.2, 0.05, 3.4, '#c9c3b6'); // front path
  if (type === 'palace') {
    bx(0, 0, 0.32, LOT - 0.6, 0.06, LOT - 0.6, snowy('#9ccc65')); const G = '#d4af37', W2 = '#f7efdc';
    bx(-HL, 0, 0.3, 0.3, 1.8, LOT - 0.7, G); bx(0, -HL, 0.3, LOT - 0.7, 1.8, 0.3, G); bx(0, HL, 0.3, LOT - 0.7, 1.8, 0.3, G); bx(HL, -4.3, 0.3, 0.3, 1.8, 5, G); bx(HL, 4.3, 0.3, 0.3, 1.8, 5, G);
    for (const sg of [-1, 1]) { const [px, pz] = P2(HL, sg * 1.9); B.cyl.add(px, 0.3, pz, 0.6, 3.2, 0.6, G); glow(px, 3.7, pz, 0.6, '#ffd84d', false); }
    const [hx, hz] = P2(-1.8, 0), [sx, sz] = S2(8.6, 6.4); const hi = B.house.add(hx, 0.36, hz, sx, 8, sz, W2); houseOfInst[hi] = i;
    bx(-1.8, 0, 8.36, 5.6, 2.6, 4.4, W2); B.sph.add(hx, 11.6, hz, 4.4, 4.4, 4.4, G); B.cyl.add(hx, 13.6, hz, 0.15, 2.6, 0.15, G); glow(hx, 16.4, hz, 0.8, '#ffffff', false);
    for (const [cf, cs] of [[1.4, -4.3], [1.4, 4.3], [-5, -4.3], [-5, 4.3]]) { const [tx, tz] = P2(cf, cs); B.cyl.add(tx, 0.36, tz, 2.2, 11, 2.2, W2); B.cone.add(tx, 11.36, tz, 2.7, 4, 2.7, G); glow(tx, 15.6, tz, 0.5, '#fff1a8', false); }
    bx(-1.8 + 3.25, 0, 0.36, 0.25, 4, 2.4, '#5a3a22'); for (const sg of [-1, 1]) bx(-1.8 + 3.3, sg * 1.6, 0.36, 0.5, 4.4, 0.5, G);
    const [ffx, ffz] = P2(4.4, 3.4); B.cyl.add(ffx, 0.36, ffz, 2.6, 0.6, 2.6, G); B.water.add(ffx, 0.7, ffz, 2.2, 0.15, 2.2, '#7fe3ff'); B.cyl.add(ffx, 0.7, ffz, 0.3, 1.8, 0.3, G); glow(ffx, 2.6, ffz, 0.5, '#7fe3ff', false);
    const [lx, lz] = P2(4.6, -4.2); tree(lx, lz, 0.45, r); addPalaceBeam(hx, hz);
  } else if (type === 'castle') {
    const stone = gold ? '#f3e7c4' : pick(r, ['#e6dcc3', '#d8cdb4', '#f1ece0', '#cfc6b0']), roof = gold ? '#d4af37' : pick(r, ['#2d4a8a', '#6b1d2e', '#1f5c3a', '#3a2a5c']);
    bx(0, 0, 0.32, LOT - 0.6, 0.06, LOT - 0.6, snowy('#8fbf6a')); // lawn
    bx(-HL, 0, 0.3, 0.8, 1.6, LOT - 0.7, '#b9ae95'); bx(0, -HL, 0.3, LOT - 0.7, 1.6, 0.8, '#b9ae95'); bx(0, HL, 0.3, LOT - 0.7, 1.6, 0.8, '#b9ae95');
    bx(HL, -4.2, 0.3, 0.8, 1.6, 5, '#b9ae95'); bx(HL, 4.2, 0.3, 0.8, 1.6, 5, '#b9ae95'); bx(HL, -1.9, 0.3, 0.9, 3.2, 0.9, '#b9ae95'); bx(HL, 1.9, 0.3, 0.9, 3.2, 0.9, '#b9ae95');
    const [hx, hz] = P2(-1.6, 0), [sx, sz] = S2(7.6, 6.4); houseOfInst[B.house.add(hx, 0.36, hz, sx, 7.5, sz, stone)] = i;
    for (let k = -3; k <= 3; k += 2) { bx(-1.6 + 3.25, k, 7.86, 0.7, 0.8, 0.7, stone); bx(-1.6 - 3.25, k, 7.86, 0.7, 0.8, 0.7, stone); }
    bx(-1.6 + 3.25, 0, 0.36, 0.25, 3.2, 2, '#3b2a1e'); { const [gx, gz] = P2(1.75, -1.4); glow(gx, 3.4, gz, 0.35, '#ffd27a'); const [gx2, gz2] = P2(1.75, 1.4); glow(gx2, 3.4, gz2, 0.35, '#ffd27a'); }
    for (const [cf, cs] of [[1.8, -3.8], [1.8, 3.8], [-5, -3.8], [-5, 3.8]]) { const [tx, tz] = P2(cf, cs); B.cyl.add(tx, 0.36, tz, 2.3, 10, 2.3, stone); B.cone.add(tx, 10.36, tz, 2.9, 3.6, 2.9, snowy(roof, 0.5)); glow(tx, 14.2, tz, 0.4, '#ffd84d', false); }
    const [ffx, ffz] = P2(4.4, 3.6); B.cyl.add(ffx, 0.36, ffz, 2.2, 0.5, 2.2, '#cfd6de'); B.water.add(ffx, 0.6, ffz, 1.8, 0.15, 1.8, '#5ec8f2'); B.cyl.add(ffx, 0.6, ffz, 0.25, 1.4, 0.25, '#cfd6de');
    { const [tx, tz] = P2(4.6, -4.4); tree(tx, tz, 0.45, r); }
  } else if (type === 'villa') {
    bx(0, 0, 0.32, LOT - 0.6, 0.06, LOT - 0.6, snowy('#7fb661')); hedge(snowy('#2f6b34', 0.5), 1.3, 3.2);
    const [hx, hz] = P2(-2.4, -1.2), [sx, sz] = S2(8.6, 6); houseOfInst[B.house.add(hx, 0.36, hz, sx, 3.8, sz, silver ? '#f4f6f8' : wall)] = i;
    { const [rx2, rz2] = P2(-2.4, -1.2), [rsx, rsz] = S2(9.6, 7); B.roof.add(rx2, 4.16, rz2, rsx, 2.4, rsz, silver ? '#c9d1d9' : roofC()); }
    if (silver) for (const [gf, gs] of [[-HL + 0.2, -4], [-HL + 0.2, 4], [HL - 0.2, -4], [HL - 0.2, 4]]) { const [gx, gz] = P2(gf, gs); glow(gx, 1.8, gz, 0.45, '#e8f1ff', false); }
    bx(-2.4 + 3.05, -1.2, 0.36, 0.2, 2.4, 1.4, '#5a3a22');
    const [px, pz] = P2(2.6, 2.8), [psx, psz] = S2(3.2, 5.2); B.box.add(px, 0.33, pz, psx + 1, 0.1, psz + 1, '#e8e2d4'); B.water.add(px, 0.36, pz, psx, 0.12, psz, '#2fb7e6');
    { const [lx, lz] = P2(2.6, -0.2); box(lx, 0.36, lz, ax ? 1 : 2.2, 0.4, ax ? 2.2 : 1, '#ffffff'); }
    for (const sgn of [-1, 1]) { const [lx, lz] = P2(5.6, sgn * 1.9); B.cyl.add(lx, 0.36, lz, 0.15, 2.4, 0.15, '#333'); glow(lx, 2.9, lz, 0.45, '#ffe7b5'); }
    { const [tx, tz] = P2(-5.4, 5); tree(tx, tz, 0.55, r); } { const [tx, tz] = P2(4.8, -4.6); tree(tx, tz, 0.45, r); }
    if (r() < 0.6) { const [cx2, cz2] = P2(3.6, -3.3); parkedCar(cx2, cz2, h.face, r); }
  } else if (type === 'modern') {
    bx(0, 0, 0.32, LOT - 0.6, 0.06, LOT - 0.6, snowy('#8ec26e'));
    const dark = pick(r, ['#2b2f36', '#3b3f46', '#6b4f3a', '#e9e9e9']), [hx, hz] = P2(-2, 0.8), [sx, sz] = S2(8.4, 6.2); houseOfInst[B.house.add(hx, 0.36, hz, sx, 3.4, sz, pick(r, ['#f5f5f5', '#e8e4dc', '#dfe6ec']))] = i;
    bx(-1.2, -1.2, 3.76, 7.4, 3.0, 5.6, dark); bx(-1.2, -1.2, 6.76, 8.2, 0.35, 6.4, '#5b6470'); bx(-1.2, -1.2, 3.76, 7.6, 0.25, 6.6, '#cfd6de');
    bx(1.62, -1.2, 4.3, 0.08, 1.9, 5.2, '#3a5068'); bx(1.1, 0.8, 0.36, 0.08, 2.6, 4.2, '#3a5068');
    bx(1.9, -2.6, 3.76, 1.6, 0.9, 3, '#cfd6de'); // balcony rail
    bx(3.6, -3.4, 0.33, 4.6, 0.05, 4.2, '#9aa0a8'); if (r() < 0.8) { const [cx2, cz2] = P2(3.6, -3.4); parkedCar(cx2, cz2, h.face, r); }
    for (let k = 0; k < 4; k++) { const [gx, gz] = P2(5.6, 1 + k * 1.4); B.sph.add(gx, 0.8, gz, 1, 0.9, 1, snowy('#3f7d3a', 0.5)); }
  } else if (type === 'twin') {
    hedge('#ffffff', 0.8, 2.6);
    const [hx, hz] = P2(-1.6, 0), [sx, sz] = S2(10.4, 6.6); houseOfInst[B.house.add(hx, 0.36, hz, sx, 6.4, sz, wall)] = i;
    { const [rx2, rz2] = P2(-1.6, 0), [rsx, rsz] = S2(11.2, 7.4); B.roof.add(rx2, 6.76, rz2, rsx, 2.6, rsz, roofC()); }
    for (const sgn of [-1, 1]) { bx(1.75, sgn * 2.6, 0.36, 0.2, 2.4, 1.3, '#5a3a22'); bx(2.6, sgn * 2.6, 3.2, 1.6, 0.2, 2.6, '#7d8793'); }
    { const [tx, tz] = P2(4.6, -4.4); tree(tx, tz, 0.5, r); } { const [tx, tz] = P2(4.6, 4.4); tree(tx, tz, 0.5, r); }
  } else { // cottage
    if (r() < 0.6) hedge(snowy('#3f7d3a', 0.5), 0.9, 2.6);
    const w = 7.6 + r() * 1.6, d = 6.8 + r() * 1.2, floors = 1 + Math.floor(r() * 2), hh = floors * 3.3;
    const [hx, hz] = P2(-1.2, 0), [sx, sz] = S2(w, d); houseOfInst[B.house.add(hx, 0.36, hz, sx, hh, sz, wall)] = i;
    { const [rsx, rsz] = S2(w + 1.2, d + 1.2); B.roof.add(hx, 0.36 + hh, hz, rsx, 2.4 + r() * 1.2, rsz, roofC()); }
    bx(-1.2 + d / 2 + 0.05, 0, 0.36, 0.2, 2.4, 1.4, '#5a3a22');
    if (r() < 0.5) { const [cx2, cz2] = P2(4, 3.6); parkedCar(cx2, cz2, h.face, r); } else { const [tx, tz] = P2(3.6, -3.6); tree(tx, tz, 0.5, r); }
    if (r() < 0.5) { const [tx, tz] = P2(-5.6, 4.6); tree(tx, tz, 0.45, r); }
  }
  houseIdx[i] = { x: h.x, z: h.z, face: h.face, front: [h.x + fx * 5.2, h.z + fz * 5.2], block: h.block, lot: h.lotNo, bc: [h.b.cx, h.b.cz], type: tierT };
  houseParts[i] = HLOG; HLOG = null;
}
function parkedCar(x, z, ry, r) { const c = pick(r, CAR_COLORS); box(x, 0.5, z, 2, 1.0, 4.2, c, ry); box(x, 1.5, z, 1.8, 0.8, 2.2, '#26323d', ry); }
const CAR_COLORS = ['#e74c3c', '#ecf0f1', '#2c3e50', '#3498db', '#f1c40f', '#95a5a6', '#1abc9c', '#8e44ad', '#d35400', '#111111'];

// ======================= traffic lights =======================
const lights = []; // {axis, idx:[r,y,g]}
function buildTrafficLights(rings) {
  for (let i = -rings; i <= rings + 1; i++) for (let j = -rings; j <= rings + 1; j++) {
    const x = (i - 0.5) * PITCH, z = (j - 0.5) * PITCH;
    for (const [axis, ox, oz, ry] of [[0, -ROAD / 2 - 1.5, ROAD / 2 + 1.5, Math.PI / 2], [1, ROAD / 2 + 1.5, ROAD / 2 + 1.5, 0]]) {
      const px = x + ox, pz = z + oz;
      B.cyl.add(px, 0, pz, 0.25, 4.6, 0.25, '#2b2f35'); box(px, 4.4, pz, 0.7, 2.2, 0.7, '#1c1f24', ry);
      const [dx, dz] = dirOf(ry + Math.PI);
      const ids = [glow(px + dx * 0.4, 6.1, pz + dz * 0.4, 0.5, '#ff3030', false), glow(px + dx * 0.4, 5.4, pz + dz * 0.4, 0.5, '#ffb000', false), glow(px + dx * 0.4, 4.7, pz + dz * 0.4, 0.5, '#20e070', false)];
      lights.push({ axis, ids });
    }
  }
}
const LIGHT_CYCLE = 14;
function lightState(axis, t) { const p = t % LIGHT_CYCLE; const a = axis === 0 ? p : (p + LIGHT_CYCLE / 2) % LIGHT_CYCLE; return a < 6 ? 'g' : a < 7 ? 'y' : 'r'; }
const DIM = new THREE.Color(0x222222);
let lastLightKey = '';
function updateLights(t) {
  const k = lightState(0, t) + lightState(1, t); if (k === lastLightKey) return; lastLightKey = k;
  for (const L of lights) { const s = lightState(L.axis, t); const on = { r: 0, y: 1, g: 2 }[s]; L.ids.forEach((id, n) => B.glow.mesh.setColorAt(id, n === on ? glowBase[id].c : DIM)); }
  B.glow.mesh.instanceColor.needsUpdate = true;
}

// ======================= moving cars (real-world models) =======================
const cars = [];
let carBody, carCab, carLamp, carTail, carWheel;
// body: [W, H, L], cab: [w, h, l, offsetForward], wheel radius, colours, weight
const CAR_MODELS = [
  { n: 'Chevrolet Cobalt', b: [1.85, 0.85, 4.5], c: [1.7, 0.72, 2.2, -0.15], wr: 0.36, cols: ['#f2f2f2', '#c0c4c8', '#1c1c1c', '#7a8794', '#8a1c1c'], w: 6 },
  { n: 'Chevrolet Gentra (Lacetti)', b: [1.85, 0.85, 4.55], c: [1.7, 0.72, 2.3, -0.1], wr: 0.36, cols: ['#f2f2f2', '#c0c4c8', '#1c1c1c', '#2f4f6f'], w: 5 },
  { n: 'Chevrolet Nexia', b: [1.75, 0.82, 4.3], c: [1.6, 0.7, 2.1, -0.1], wr: 0.34, cols: ['#f2f2f2', '#d8d2c0', '#1c1c1c', '#5a6b3a'], w: 4 },
  { n: 'Chevrolet Spark', b: [1.65, 0.95, 3.6], c: [1.55, 0.8, 2.0, -0.25], wr: 0.32, cols: ['#f2f2f2', '#e8443a', '#3a7bd5', '#ffc400', '#9acd32'], w: 4 },
  { n: 'Daewoo Matiz', b: [1.5, 0.95, 3.4], c: [1.42, 0.82, 1.9, -0.2], wr: 0.3, cols: ['#f2f2f2', '#ff6b6b', '#4dd0e1', '#ffd166', '#a78bff'], w: 4 },
  { n: 'Chevrolet Damas', b: [1.45, 1.75, 3.5], c: [1.47, 0.7, 2.6, -0.3], wr: 0.3, cols: ['#f2f2f2', '#e6e6e6'], w: 3, van: true },
  { n: 'Chevrolet Malibu', b: [1.9, 0.85, 4.9], c: [1.72, 0.7, 2.5, -0.15], wr: 0.38, cols: ['#1c1c1c', '#f2f2f2', '#2c3e50', '#7a1f1f'], w: 2 },
  { n: 'Chevrolet Tracker', b: [1.85, 1.15, 4.3], c: [1.7, 0.75, 2.4, -0.3], wr: 0.4, cols: ['#f2f2f2', '#1c1c1c', '#c0392b', '#2c3e50'], w: 2 },
  { n: 'Mercedes-Benz S-Class', b: [1.95, 0.9, 5.2], c: [1.75, 0.72, 2.7, -0.2], wr: 0.4, cols: ['#0d0d0d', '#1c1c1c', '#c0c4c8'], w: 1.5 },
  { n: 'Mercedes-Benz G-Class', b: [1.95, 1.35, 4.7], c: [1.85, 0.95, 2.6, -0.45], wr: 0.45, cols: ['#0d0d0d', '#f2f2f2', '#4a5a3a'], w: 1 },
  { n: 'BMW 5 Series', b: [1.9, 0.85, 4.95], c: [1.72, 0.7, 2.5, -0.2], wr: 0.4, cols: ['#0d0d0d', '#1f3b73', '#f2f2f2', '#7a8794'], w: 1.5 },
  { n: 'BMW X5', b: [2.0, 1.2, 4.9], c: [1.85, 0.8, 2.8, -0.3], wr: 0.45, cols: ['#0d0d0d', '#f2f2f2', '#2c3e50'], w: 1 },
  { n: 'Toyota Camry', b: [1.85, 0.85, 4.9], c: [1.7, 0.72, 2.5, -0.15], wr: 0.38, cols: ['#f2f2f2', '#1c1c1c', '#c0c4c8', '#6b1d2e'], w: 1.5 },
  { n: 'Kia K5', b: [1.86, 0.82, 4.9], c: [1.7, 0.68, 2.6, -0.2], wr: 0.38, cols: ['#f2f2f2', '#1c1c1c', '#7a8794'], w: 1 },
  { n: 'BYD Song Plus', b: [1.9, 1.15, 4.7], c: [1.75, 0.75, 2.6, -0.25], wr: 0.42, cols: ['#f2f2f2', '#3a5068', '#1c1c1c'], w: 1 },
  { n: 'Tesla Model 3', b: [1.85, 0.8, 4.7], c: [1.7, 0.7, 2.7, -0.1], wr: 0.38, cols: ['#e8e8e8', '#c0392b', '#1c1c1c', '#1f3b73'], w: 0.8 },
  { n: 'Porsche 911', b: [1.9, 0.72, 4.5], c: [1.6, 0.55, 1.8, -0.4], wr: 0.38, cols: ['#ffd400', '#c0392b', '#f2f2f2', '#1c1c1c'], w: 0.6 },
  { n: 'Lamborghini Huracán', b: [2.0, 0.62, 4.5], c: [1.5, 0.5, 1.7, -0.1], wr: 0.36, cols: ['#ff7a00', '#8cff2e', '#ffd400', '#7b2cff'], w: 0.5 },
  { n: 'Isuzu avtobus', b: [2.5, 2.4, 10.5], c: [2.54, 1.0, 9.6, 0.1], wr: 0.55, cols: ['#ffd400', '#f2f2f2', '#1e88e5', '#2e9d4f'], w: 0, bus: true },
];
function buildCars(rings) {
  const N = MOBILE ? 70 : LITE ? 110 : 170, unit = () => up(new THREE.BoxGeometry(1, 1, 1));
  carBody = new THREE.InstancedMesh(unit(), matStd({ roughness: 0.3, metalness: 0.55 }), N);
  carCab = new THREE.InstancedMesh(unit(), matStd({ color: 0x1d2833, roughness: 0.12, metalness: 0.6 }), N);
  carLamp = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.22, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff6d8, toneMapped: false }), N);
  carTail = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.22, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false }), N);
  carWheel = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 14).rotateZ(Math.PI / 2), matStd({ color: 0x151515, roughness: 0.8 }), N * 4);
  for (const m of [carBody, carCab, carWheel]) { m.castShadow = SHADOWS; scene.add(m); } scene.add(carLamp, carTail);
  const r = rng(42), lines = [], tot = CAR_MODELS.reduce((a, m) => a + m.w, 0);
  const pickModel = () => { let x = r() * tot; for (const m of CAR_MODELS) { x -= m.w; if (x <= 0) return m; } return CAR_MODELS[0]; };
  for (let k = -rings; k <= rings + 1; k++) lines.push((k - 0.5) * PITCH);
  for (let i = 0; i < N; i++) {
    const hw = i % 4 === 0, bus = !hw && i % 23 === 5, m = bus ? CAR_MODELS[CAR_MODELS.length - 1] : pickModel();
    const sporty = m.n.startsWith('Porsche') || m.n.startsWith('Lambo');
    const c = { hw, m, dir: r() < .5 ? 1 : -1, speed: bus ? 7 : (hw ? 16 + r() * 8 : 9 + r() * 6) * (sporty ? 1.35 : 1), v: 0, color: pick(r, m.cols), x: 0, z: 0 };
    if (hw) { c.s = r() * 8 * HWY; c.lane = r() < .5 ? 2.8 : 7.6; }
    else { c.axis = r() < .5 ? 0 : 1; c.line = pick(r, lines); c.s = (r() - 0.5) * 2 * cityExtent; }
    carBody.setColorAt(i, COL.set(c.color)); cars.push(c);
  }
  carBody.instanceColor.needsUpdate = true;
}
function hwyPos(s, lane, dir) { // square loop around the city, anticlockwise for dir=1
  const L = 2 * HWY, per = 4 * L; s = ((s % per) + per) % per; const R = HWY + (dir > 0 ? lane : -lane);
  const side = Math.floor(s / L), u = s % L - HWY; const Rl = HWY - (dir > 0 ? -lane : lane);
  if (side === 0) return [u, -Rl, 0]; if (side === 1) return [Rl, u, 1]; if (side === 2) return [-u, Rl, 2]; return [-Rl, -u, 3];
}
function updateCars(t, dt) {
  // group by lane for simple following
  const lanes = new Map();
  for (const c of cars) if (!c.hw) { const k = c.axis + ':' + c.line + ':' + c.dir; (lanes.get(k) || lanes.set(k, []).get(k)).push(c); }
  for (const list of lanes.values()) list.sort((a, b) => (b.s - a.s) * b.dir);
  for (const list of lanes.values()) {
    list.forEach((c, n) => {
      let target = c.speed;
      // traffic light ahead?
      const st = lightState(c.axis, t);
      if (st !== 'g') { const next = (Math.floor((c.s * c.dir) / PITCH + 0.5) + 0.5) * PITCH; const stop = next - (ROAD / 2 + 3); const dist = stop - c.s * c.dir; if (dist > -0.5 && dist < 7) target = Math.max(0, (dist - 0.5) * 2); }
      if (n > 0) { const lead = list[n - 1]; const gap = (lead.s - c.s) * c.dir, need = (lead.m.b[2] + c.m.b[2]) / 2 + 1.6; if (gap > 0 && gap < need + 3) target = Math.min(target, Math.max(0, (gap - need) * 2)); }
      if (drive) { const lx = c.axis === 0 ? 0 : 1, rs = lx ? drive.z : drive.x, rl = lx ? drive.x : drive.z, laneC = c.axis === 0 ? c.line + (c.dir > 0 ? 2.6 : -2.6) : c.line + (c.dir > 0 ? -2.6 : 2.6);
        if (Math.abs(rl - laneC) < c.m.b[0] / 2 + 0.9) { const gap = (rs - c.s) * c.dir - c.m.b[2] / 2 - 0.6; if (gap > -0.5 && gap < 9) target = Math.min(target, Math.max(0, gap * 1.6)); } }
      c.v += (target - c.v) * Math.min(1, dt * 2.5); c.s += c.v * c.dir * dt;
      if (c.s > cityExtent + 10) c.s = -cityExtent - 10; if (c.s < -cityExtent - 10) c.s = cityExtent + 10;
    });
  }
  cars.forEach((c, i) => {
    let x, z, ry;
    if (c.hw) { c.s += c.speed * dt; const [hx, hz, side] = hwyPos(c.s * c.dir, c.lane, c.dir); x = hx; z = hz; ry = [Math.PI / 2, 0, -Math.PI / 2, Math.PI][side] + (c.dir < 0 ? Math.PI : 0); }
    else if (c.axis === 0) { x = c.s; z = c.line + (c.dir > 0 ? 2.6 : -2.6); ry = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { z = c.s; x = c.line + (c.dir > 0 ? -2.6 : 2.6); ry = c.dir > 0 ? 0 : Math.PI; }
    c.x = x; c.z = z; c.ax = Math.abs(Math.cos(ry)) > 0.5; const m = c.m, [W, H, L] = m.b, [cw, ch, cl, co] = m.c, wr = m.wr, y0 = wr * 0.75, [dx, dz] = dirOf(ry), sx = dz, sz = -dx;
    Q.setFromAxisAngle(YAX, ry); M.compose(P.set(x, y0, z), Q, S.set(W, H, L)); carBody.setMatrixAt(i, M);
    if (m.bus) M.compose(P.set(x + dx * co, y0 + H * 0.45, z + dz * co), Q, S.set(cw, ch, cl)); else if (m.van) M.compose(P.set(x + dx * co, y0 + H * 0.5, z + dz * co), Q, S.set(cw, ch, cl));
    else M.compose(P.set(x + dx * co, y0 + H, z + dz * co), Q, S.set(cw, ch, cl)); carCab.setMatrixAt(i, M);
    M.compose(P.set(x + dx * (L / 2 + 0.02), y0 + H * 0.62, z + dz * (L / 2 + 0.02)), Q, S.set(W * 0.82, 1, 1)); carLamp.setMatrixAt(i, M);
    M.compose(P.set(x - dx * (L / 2 + 0.02), y0 + H * 0.62, z - dz * (L / 2 + 0.02)), Q, S.set(W * 0.82, 1, 1)); carTail.setMatrixAt(i, M);
    const ax2 = L / 2 - wr * 1.5; let k = i * 4;
    for (const fw of [ax2, -ax2]) for (const sd of [W / 2 - 0.12, -(W / 2 - 0.12)]) { M.compose(P.set(x + dx * fw + sx * sd, wr, z + dz * fw + sz * sd), Q, S.set(0.32, wr, wr)); carWheel.setMatrixAt(k++, M); }
  });
  for (const m of [carBody, carCab, carLamp, carTail, carWheel]) m.instanceMatrix.needsUpdate = true;
}

// ======================= robots (GPU-animated, instanced) =======================
const UTIME = { value: 0 };
const WALK_HEAD = `
uniform float uTime;
attribute vec4 aP1; attribute vec4 aP2; attribute vec4 aJ;
struct WS { vec2 pos; float yaw; float ang; float bob; };
vec3 wRotY(vec3 v, float a){ float c=cos(a), s=sin(a); return vec3(c*v.x + s*v.z, v.y, -s*v.x + c*v.z); }
vec3 wRotX(vec3 v, float a){ float c=cos(a), s=sin(a); return vec3(v.x, c*v.y - s*v.z, s*v.y + c*v.z); }
WS walkState(){
  WS s; float kind = aP2.z; float t = uTime*aP2.y; float dist = 0.0; float mv = 1.0;
  if (kind < 0.5) {
    float hx=aP1.z, hz=aP1.w, Pm=4.0*(hx+hz); float d = mod(t + aP2.x*Pm, Pm); vec2 p; vec2 dir;
    if (d < 2.0*hx) { p = vec2(-hx + d, -hz); dir = vec2(1.0,0.0); }
    else if (d < 2.0*hx+2.0*hz) { p = vec2(hx, -hz + d - 2.0*hx); dir = vec2(0.0,1.0); }
    else if (d < 4.0*hx+2.0*hz) { p = vec2(hx - (d-2.0*hx-2.0*hz), hz); dir = vec2(-1.0,0.0); }
    else { p = vec2(-hx, hz - (d-4.0*hx-2.0*hz)); dir = vec2(0.0,-1.0); }
    s.pos = aP1.xy + p; s.yaw = atan(dir.x, dir.y); dist = d;
  } else if (kind < 1.5) {
    float rx=aP1.z, rz=aP1.w, rr=(rx+rz)*0.5; float a = t/rr + aP2.x*6.2831853;
    s.pos = aP1.xy + vec2(rx*cos(a), rz*sin(a)); vec2 dir = vec2(-rx*sin(a), rz*cos(a)); s.yaw = atan(dir.x, dir.y); dist = a*rr;
  } else {
    s.pos = aP1.xy; s.yaw = aP2.w + sin(uTime*0.35 + aP2.x*40.0)*0.45; mv = 0.0;
  }
  float st = dist / (0.42*aJ.z);
  s.ang = mv * sin(st) * aJ.y + (1.0-mv) * sin(uTime*1.3 + aP2.x*30.0) * aJ.y * 0.08;
  s.bob = mv * abs(cos(st)) * 0.05 * aJ.z;
  return s;
}
`;
const WALK_NORMAL = `
  WS wsN = walkState();
  vec3 wn = objectNormal;
  #ifdef USE_INSTANCING
    mat3 wim = mat3(instanceMatrix);
    wn /= vec3(dot(wim[0],wim[0]), dot(wim[1],wim[1]), dot(wim[2],wim[2]));
    wn = wim * wn;
  #endif
  wn = wRotY(wRotX(wn, wsN.ang), wsN.yaw);
  vec3 transformedNormal = normalMatrix * wn;
  #ifdef FLIP_SIDED
    transformedNormal = - transformedNormal;
  #endif
`;
const WALK_PROJECT = `
  WS wsP = walkState();
  vec4 lp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    lp = instanceMatrix * lp;
  #endif
  lp.y -= aJ.x; lp.xyz = wRotX(lp.xyz, wsP.ang); lp.y += aJ.x + wsP.bob;
  vec3 wp = wRotY(lp.xyz, wsP.yaw) + vec3(wsP.pos.x, 0.0, wsP.pos.y);
  vec4 mvPosition = modelViewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mvPosition;
`;
function walkify(mat, normals = true) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = UTIME;
    sh.vertexShader = WALK_HEAD + sh.vertexShader.replace('#include <project_vertex>', WALK_PROJECT);
    if (normals) sh.vertexShader = sh.vertexShader.replace('#include <defaultnormal_vertex>', WALK_NORMAL);
  };
  mat.customProgramCacheKey = () => 'walk' + (normals ? 'n' : '');
  return mat;
}
const RKINDS = {
  mBox: [() => up(new THREE.BoxGeometry(1, 1, 1)), () => new THREE.MeshStandardMaterial({ metalness: 0.75, roughness: 0.28 })],
  mSph: [() => new THREE.SphereGeometry(0.5, 16, 12), () => new THREE.MeshStandardMaterial({ metalness: 0.75, roughness: 0.25 })],
  mCyl: [() => up(new THREE.CylinderGeometry(0.5, 0.5, 1, 10)), () => new THREE.MeshStandardMaterial({ metalness: 0.75, roughness: 0.3 })],
  fCone: [() => up(new THREE.ConeGeometry(0.5, 1, 14)), () => new THREE.MeshStandardMaterial({ metalness: 0.0, roughness: 0.85 })],
  fBox: [() => up(new THREE.BoxGeometry(1, 1, 1)), () => new THREE.MeshStandardMaterial({ metalness: 0.0, roughness: 0.9 })],
  fSph: [() => new THREE.SphereGeometry(0.5, 14, 10), () => new THREE.MeshStandardMaterial({ metalness: 0.0, roughness: 0.85 })],
  fCyl: [() => up(new THREE.CylinderGeometry(0.5, 0.5, 1, 14)), () => new THREE.MeshStandardMaterial({ metalness: 0.0, roughness: 0.9 })],
  fSkirt: [() => up(new THREE.CylinderGeometry(0.33, 0.56, 1, 16)), () => new THREE.MeshStandardMaterial({ metalness: 0.0, roughness: 0.85 })],
  vBox: [() => up(new THREE.BoxGeometry(1, 1, 1)), () => new THREE.MeshStandardMaterial({ color: 0x0a0d12, metalness: 0.4, roughness: 0.08 })],
  gBox: [() => up(new THREE.BoxGeometry(1, 1, 1)), () => new THREE.MeshBasicMaterial({ toneMapped: false })],
};
const RP = {}, RCNT = {};
function makeRobotMeshes(cap) {
  for (const [k, [g, m]] of Object.entries(RKINDS)) {
    const geo = g(); const n = typeof cap === 'function' ? cap(k) : cap;
    geo.setAttribute('aP1', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
    geo.setAttribute('aP2', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
    geo.setAttribute('aJ', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
    const mat = walkify(m(), true);
    const mesh = new THREE.InstancedMesh(geo, mat, n); mesh.count = 0; mesh.frustumCulled = false;
    if (SHADOWS && k !== 'gBox') { mesh.castShadow = true; mesh.customDepthMaterial = walkify(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), false); }
    scene.add(mesh); RP[k] = mesh; RCNT[k] = 0;
  }
}
const METAL = ['#c9ced6', '#e8ebef', '#9aa3ad', '#d4b483', '#6b7280', '#b8c4d0'];
const METAL_F = ['#e8ebef', '#f0d9d9', '#c9ced6', '#e3cfa4', '#d7d2ea'];
const SHIRT = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#ecf0f1', '#34495e', '#e67e22', '#222831', '#00adb5', '#c0392b', '#2980b9'];
const PANTS = ['#2c3e50', '#34495e', '#1f2a44', '#5d4037', '#212121', '#3e5c76', '#c2b280', '#4a6741'];
const DRESS = ['#ff6b9d', '#c44569', '#f8b195', '#6c5ce7', '#00b894', '#fdcb6e', '#e84393', '#2d3436', '#ffffff', '#74b9ff'];
const HAIR_F = ['#2b1b17', '#5a3825', '#b5651d', '#e6c07b', '#1c1c1c', '#7b3f00', '#c0392b'];
const HAIR_M = ['#1c1c1c', '#3b2a20', '#5a3825', '#2b1b17'];
const SHOES = ['#111111', '#ffffff', '#7a4b2a', '#c0392b', '#2c3e50'];
const overrides = new Map();
function traits(name) {
  const r = rng(hash(name + 'bot'));
  const g = overrides.get(name) || (isFemale(name) ? 'f' : 'm');
  const f = g === 'f';
  return { g, f, vip: VIP.get(name) || 0, santa: SEASON === 'winter', eq: (PLAYERS.get(name) || {}).equipped || {},
    u: f ? 0.93 + r() * 0.06 : 1.0 + r() * 0.08,
    metal: f ? pick(r, METAL_F) : pick(r, METAL), eye: pick(r, NEON), led: pick(r, NEON),
    top: f ? pick(r, DRESS) : pick(r, SHIRT), bottom: f ? pick(r, DRESS) : pick(r, PANTS), shoe: pick(r, SHOES),
    hair: f ? pick(r, HAIR_F) : pick(r, HAIR_M),
    style: f ? pick(r, ['dress', 'skirt', 'skirt', 'pants']) : pick(r, ['tshirt', 'jacket', 'hoodie', 'tshirt', 'suit']),
    shorts: !f && r() < 0.2, hairStyle: f ? pick(r, ['long', 'pony', 'bob']) : pick(r, ['short', 'short', 'none']),
    cap: !f && r() < 0.3, phones: r() < 0.22, glasses: r() < 0.25, backpack: r() < 0.3, bag: f && r() < 0.45, watch: r() < 0.5, tie: !f && r() < 0.25,
    jacket: pick(r, ['#2c3e50', '#7f8c8d', '#1b1b1b', '#8e5a3c', '#34495e']),
  };
}
// returns list of parts in robot-local space (feet at y=0, facing +z). height ≈ 3.2*u
function robotParts(t, part) {
  const u = t.u, f = t.f, sw = f ? 0.4 : 0.5, hip = 1.5;
  const P_ = (k, x, y, z, sx, sy, sz, c, piv = 0, swing = 0, ry = 0, rz = 0) => part(k, x * u, y * u, z * u, sx * u, sy * u, sz * u, c, piv * u, swing, ry, rz);
  for (const side of [-1, 1]) {
    const lx = side * (f ? 0.17 : 0.2), swing = side * 0.5;
    P_('fBox', lx, 0, 0.05, 0.25, 0.2, 0.46, t.shoe, hip, swing);
    if (f && t.style !== 'pants') { P_('mCyl', lx, 0.18, 0, 0.17, 1.25, 0.17, t.metal, hip, swing); P_('mSph', lx, 0.95, 0, 0.2, 0.2, 0.2, t.metal, hip, swing); }
    else if (t.shorts) { P_('mCyl', lx, 0.18, 0, 0.18, 0.8, 0.18, t.metal, hip, swing); P_('fBox', lx, 0.95, 0, 0.29, 0.55, 0.31, t.bottom, hip, swing); }
    else P_('fBox', lx, 0.18, 0, f ? 0.24 : 0.27, 1.32, f ? 0.27 : 0.3, t.bottom, hip, swing);
  }
  if (f && (t.style === 'skirt' || t.style === 'dress')) P_('fSkirt', 0, t.style === 'dress' ? 0.85 : 1.08, 0, 1, t.style === 'dress' ? 0.8 : 0.55, 0.8, t.style === 'dress' ? t.top : t.bottom);
  else P_('fBox', 0, 1.36, 0, f ? 0.56 : 0.62, 0.32, 0.36, t.bottom);
  // torso
  const tw = f ? 0.62 : 0.8, td = f ? 0.4 : 0.44;
  P_('fBox', 0, 1.62, 0, tw, 0.86, td, t.top);
  if (!f && (t.style === 'jacket' || t.style === 'suit')) { for (const s of [-1, 1]) P_('fBox', s * (tw / 2 - 0.12), 1.6, 0.01, 0.28, 0.9, td + 0.04, t.jacket); }
  if (!f && t.style === 'hoodie') P_('fBox', 0, 2.3, -0.24, 0.5, 0.28, 0.12, t.top);
  if (t.tie || t.style === 'suit') P_('fBox', 0, 1.85, td / 2 + 0.01, 0.09, 0.55, 0.02, '#8e1b1b');
  if (f) { P_('fSph', -0.13, 2.12, td / 2 - 0.06, 0.2, 0.18, 0.12, t.top); P_('fSph', 0.13, 2.12, td / 2 - 0.06, 0.2, 0.18, 0.12, t.top); }
  P_('gBox', 0, 2.05, td / 2 + 0.01, 0.12, 0.12, 0.02, t.led);
  if (t.backpack) P_('fBox', 0, 1.7, -td / 2 - 0.13, 0.5, 0.62, 0.24, pick(rng(hash(t.top + t.metal)), ['#2c3e50', '#c0392b', '#f39c12', '#16a085', '#111']));
  // arms
  for (const side of [-1, 1]) {
    const ax = side * (tw / 2 + (f ? 0.1 : 0.12)), swing = -side * 0.45, sh = 2.44;
    P_('fBox', ax, 1.92, 0, f ? 0.16 : 0.2, 0.52, f ? 0.17 : 0.22, t.style === 'dress' ? t.metal : (!f && (t.style === 'jacket' || t.style === 'suit') ? t.jacket : t.top), sh, swing);
    P_('mCyl', ax, 1.45, 0, f ? 0.13 : 0.16, 0.5, f ? 0.13 : 0.16, t.metal, sh, swing);
    P_('mSph', ax, 1.38, 0, f ? 0.15 : 0.18, 0.17, f ? 0.15 : 0.18, t.metal, sh, swing);
    if (t.watch && side === -1) P_('gBox', ax, 1.55, 0, 0.18, 0.06, 0.18, t.led, sh, swing);
    if (t.bag && side === 1) { P_('fBox', ax + 0.12, 1.3, 0.02, 0.1, 0.32, 0.36, pick(rng(hash(t.hair)), ['#c0392b', '#111', '#8e5a3c', '#f5e6cc'])); }
  }
  // neck + head
  P_('mCyl', 0, 2.46, 0, 0.17, 0.16, 0.17, t.metal);
  const hs = f ? 0.5 : 0.54;
  P_('mSph', 0, 2.9, 0, hs, hs * 1.08, hs * 0.96, t.metal);
  P_('vBox', 0, 2.82, hs * 0.42, hs * 0.82, 0.2, 0.08, '#000');
  for (const s of [-1, 1]) P_('gBox', s * 0.1, 2.88, hs * 0.47, 0.1, 0.07, 0.02, t.eye);
  P_('gBox', 0, 2.68, hs * 0.44, 0.13, 0.025, 0.02, t.eye);
  for (const s of [-1, 1]) P_('mCyl', s * hs * 0.5, 2.82, 0, 0.12, 0.14, 0.12, t.metal, 0, 0, 0, Math.PI / 2);
  if (f) {
    P_('fSph', 0, 3.02, -0.03, hs * 1.08, hs * 0.66, hs * 1.06, t.hair);
    if (t.hairStyle === 'long') P_('fBox', 0, 2.38, -hs * 0.38, hs * 0.98, 0.72, 0.16, t.hair);
    if (t.hairStyle === 'pony') { P_('fSph', 0, 2.92, -hs * 0.6, 0.18, 0.18, 0.18, t.hair); P_('fBox', 0, 2.42, -hs * 0.66, 0.14, 0.5, 0.12, t.hair); }
    if (t.hairStyle === 'bob') P_('fSph', 0, 2.82, -0.06, hs * 1.14, hs * 0.85, hs * 1.08, t.hair);
    P_('gBox', -hs * 0.52, 2.74, 0, 0.05, 0.08, 0.05, '#ffd166'); P_('gBox', hs * 0.52, 2.74, 0, 0.05, 0.08, 0.05, '#ffd166');
  } else {
    if (t.hairStyle === 'short' && !t.cap) P_('fSph', 0, 3.06, -0.03, hs * 1.04, hs * 0.5, hs * 1.02, t.hair);
    if (t.hairStyle === 'none' && !t.cap) { P_('mCyl', 0, 3.15, 0, 0.04, 0.28, 0.04, t.metal); P_('gBox', 0, 3.42, 0, 0.09, 0.09, 0.09, t.led); }
    if (t.cap) { P_('fCyl', 0, 3.02, 0, hs * 1.06, 0.2, hs * 1.06, t.top); P_('fBox', 0, 3.04, hs * 0.55, hs * 0.75, 0.04, 0.3, t.top); }
  }
  if (t.glasses) P_('vBox', 0, 2.86, hs * 0.5, hs * 0.86, 0.11, 0.03, '#000');
  if (t.santa) { P_('fCyl', 0, 3.0, -0.02, hs * 1.16, 0.16, hs * 1.16, '#ffffff'); P_('fCone', 0, 3.1, -0.02, hs * 1.08, 0.8, hs * 1.08, '#d62828', 0, 0, 0, -0.2); P_('fSph', -0.16, 3.84, -0.02, 0.2, 0.2, 0.2, '#ffffff'); }
  { const eq = t.eq || {}, HAT = { cap_red: '#e53935', cap_blue: '#1e88e5', cap_gold: '#ffc400' };
    if (HAT[eq.hat]) { P_('fCyl', 0, 3.02, 0, hs * 1.08, 0.22, hs * 1.08, HAT[eq.hat]); P_('fBox', 0, 3.05, hs * 0.55, hs * 0.8, 0.05, 0.34, HAT[eq.hat]); }
    if (eq.glasses === 'shades') { P_('vBox', 0, 2.86, hs * 0.52, hs * 0.92, 0.14, 0.03, '#000'); P_('gBox', 0, 2.94, hs * 0.53, hs * 0.92, 0.02, 0.02, '#ffd84d'); }
    if (eq.phones === 'neon_phones') { P_('gBox', 0, 3.16, 0, hs * 1.14, 0.06, 0.1, '#ff4fd8'); for (const sg of [-1, 1]) P_('gBox', sg * hs * 0.56, 2.72, 0, 0.12, 0.26, 0.26, '#50d7ff'); }
    if (eq.cape === 'cape') P_('fBox', 0, 1.0, -(td / 2 + 0.06), tw * 0.98, 1.38, 0.05, '#c0392b');
    if (eq.halo === 'halo') for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; P_('gBox', Math.cos(a) * hs * 0.62, 3.62, Math.sin(a) * hs * 0.62, 0.16, 0.06, 0.16, '#fff1a8'); } }
  if (t.vip) { const cy = t.santa ? 3.95 : 3.22; P_('mCyl', 0, cy, 0, hs * 0.9, 0.22, hs * 0.9, '#ffc400'); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; P_('gBox', Math.cos(a) * hs * 0.4, cy + 0.2, Math.sin(a) * hs * 0.4, 0.1, 0.22, 0.1, '#ffd84d'); } }
  if (t.phones) { P_('mBox', 0, 3.12 + (t.cap ? 0.08 : 0), 0, hs * 1.12, 0.06, 0.08, '#2b2f35'); for (const s of [-1, 1]) P_('fCyl', s * hs * 0.55, 2.78, 0, 0.2, 0.1, 0.2, '#1c1f24', 0, 0, 0, Math.PI / 2); }
}
const RE = new THREE.Euler();
function placeRobot(sp) {
  const t = sp.traits;
  robotParts(t, (k, x, y, z, sx, sy, sz, c, piv, swing, ry, rz) => {
    const m = RP[k]; if (RCNT[k] >= m.instanceMatrix.count) return; const i = RCNT[k]++;
    RE.set(0, ry, rz); Q.setFromEuler(RE); M.compose(P.set(x, y, z), Q, S.set(sx, sy, sz)); m.setMatrixAt(i, M); m.setColorAt(i, COL.set(c)); (sp.parts ||= []).push([k, i, M.clone()]);
    m.geometry.attributes.aP1.setXYZW(i, sp.p1[0], sp.p1[1], sp.p1[2], sp.p1[3]);
    m.geometry.attributes.aP2.setXYZW(i, sp.p2[0], sp.p2[1], sp.p2[2], sp.p2[3]);
    m.geometry.attributes.aJ.setXYZW(i, piv, swing, t.u, 0);
  });
}
function refreshRobots() { for (const [k, m] of Object.entries(RP)) { m.count = RCNT[k]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; for (const a of ['aP1', 'aP2', 'aJ']) m.geometry.attributes[a].needsUpdate = true; } }

// activity / path for each robot
const SIDEWALK = SLAB / 2 - 1.5;
function assignActivity(sp) {
  const r = rng(hash(sp.name + 'life')), roll = r(), h = houseIdx[sp.i];
  const amen = (type) => { const list = SPOTS[type]; return list && list.length ? list[Math.floor(r() * list.length)] : null; };
  let act = 'home', p1, p2;
  const speed = 1.1 + r() * 0.5;
  if (roll < 0.32) { act = 'walkHome'; p1 = [h.bc[0], h.bc[1], SIDEWALK, SIDEWALK]; p2 = [r(), speed, 0, 0]; }
  else if (roll < 0.52) { const types = Object.keys(amenityBlocks); const b = r() < 0.4 ? pick(r, amenityBlocks[pick(r, types)]) : pick(r, resBlocks.filter((x) => x.ring <= cityRings)); act = 'walkCity'; p1 = [b.cx, b.cz, SIDEWALK, SIDEWALK]; p2 = [r(), speed, 0, 0]; }
  else if (roll < 0.6 && amenityBlocks.stadium) { const b = amenityBlocks.stadium[0]; act = 'jog'; const k = r() * 1.4; p1 = [b.cx, b.cz, 15.6 + k, 10.2 + k * 0.7]; p2 = [r(), 2.6 + r(), 1, 0]; }
  else if (roll < 0.82) { const type = pick(r, ['cafe', 'cafe', 'restaurant', 'park', 'pool', 'fitness', 'billiard', 'sports', 'mall', 'stadium']); const s = amen(type);
    if (s) { act = type === 'stadium' ? 'jog' : type; p1 = [s.x + (r() - 0.5) * 0.6, s.z + (r() - 0.5) * 0.6, 0, 0]; p2 = [r(), 1, 2, s.yaw]; } }
  if (!p1) { act = 'home'; p1 = [h.front[0], h.front[1], 0, 0]; p2 = [r(), 1, 2, h.face + Math.PI]; }
  sp.act = act; sp.p1 = p1; sp.p2 = p2;
}
function robotPos(sp, t) { // CPU mirror of the GLSL path
  if (sp.drv) return [sp.drv.x, sp.drv.z];
  const [cx, cz, a, b] = sp.p1, [ph, spd, kind] = sp.p2, tt = t * spd;
  if (kind < 0.5) { const Pm = 4 * (a + b); const d = ((tt + ph * Pm) % Pm + Pm) % Pm;
    if (d < 2 * a) return [cx - a + d, cz - b]; if (d < 2 * a + 2 * b) return [cx + a, cz - b + d - 2 * a]; if (d < 4 * a + 2 * b) return [cx + a - (d - 2 * a - 2 * b), cz + b]; return [cx - a, cz + b - (d - 4 * a - 2 * b)]; }
  if (kind < 1.5) { const rr = (a + b) / 2, an = tt / rr + ph * Math.PI * 2; return [cx + a * Math.cos(an), cz + b * Math.sin(an)]; }
  return [cx, cz];
}

// ======================= nickname labels (pooled sprites) =======================
const LABELS = MOBILE ? 50 : 130;
const labelPool = [], labelTexCache = new Map();
function labelTex(name, me) {
  const key = name + (me ? '*' : '') + (UPG.get(name) || ''); if (labelTexCache.has(key)) return labelTexCache.get(key);
  const t = canvasTex(256, 56, (g, w, h) => { g.font = '700 26px "JetBrains Mono", monospace'; const tw = Math.min(w - 8, g.measureText('@' + name).width + 22);
    const vip = VIP.has(name), ti = TIER_INFO[UPG.get(name)]; g.fillStyle = me ? 'rgba(57,255,136,.95)' : ti ? ti.bg : vip ? 'rgba(255,196,0,.95)' : 'rgba(8,12,22,.78)'; const x = (w - tw) / 2; g.beginPath(); g.roundRect(x, 6, tw, 40, 12); g.fill();
    g.fillStyle = me ? '#04140b' : ti ? ti.fg : vip ? '#04140b' : '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((ti ? ti.icon + ' ' : vip ? '👑 ' : '') + '@' + name, w / 2, 27, w - 16); });
  if (labelTexCache.size > 600) labelTexCache.clear();
  labelTexCache.set(key, t); return t;
}
function makeLabels() { for (let i = 0; i < LABELS; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: false })); s.scale.set(4.6, 1.0, 1); s.visible = false; s.renderOrder = 10; scene.add(s); labelPool.push({ s, sp: null }); } }
let labelAssignT = 0;
function updateLabels(t) {
  const tgt = controls.target;
  if (t - labelAssignT > 0.6) { labelAssignT = t;
    const cand = specs.map((sp) => { const [x, z] = robotPos(sp, t); return { sp, d: (x - tgt.x) ** 2 + (z - tgt.z) ** 2 + (camera.position.distanceToSquared(tgt) > 9e4 ? 0 : 0) }; });
    cand.sort((a, b) => a.d - b.d);
    const maxD = Math.max(220, camera.position.distanceTo(tgt) * 1.4) ** 2;
    labelPool.forEach((L, i) => { const c = cand[i]; if (c && c.d < maxD) { if (L.sp !== c.sp) { L.sp = c.sp; L.s.material.map = labelTex(c.sp.name, c.sp === selected); L.s.material.needsUpdate = true; } L.s.visible = true; } else { L.sp = null; L.s.visible = false; } });
  }
  const camD = camera.position.distanceTo(tgt), sc = THREE.MathUtils.clamp(camD / 40, 0.55, 8);
  for (const L of labelPool) if (L.sp) { const [x, z] = robotPos(L.sp, t); L.s.position.set(x, 3.5 * L.sp.traits.u + 0.3 + sc * 0.45, z); L.s.scale.set(3.4 * sc, 3.4 * sc * 0.2187, 1); }
}

// ======================= robot avatar SVG =======================
function robotSVG(name, codeOverride) {
  const t = traits(name), id = 'g' + hash(name), m = t.metal, e = t.eye;
  const code = codeOverride || ('RX-' + String(hash(name + 'rx') % 9000 + 1000));
  let s = `<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="${id}" cx=".4" cy=".35"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="${m}"/><stop offset="1" stop-color="#5b6470"/></radialGradient></defs>`;
  s += `<rect x="40" y="112" width="80" height="48" rx="18" fill="${t.top}"/>`;
  if (t.f) s += `<ellipse cx="80" cy="56" rx="44" ry="40" fill="${t.hair}"/>` + (t.hairStyle === 'long' ? `<rect x="38" y="56" width="84" height="56" rx="14" fill="${t.hair}"/>` : '');
  s += `<rect x="70" y="96" width="20" height="18" fill="${m}"/><ellipse cx="80" cy="66" rx="${t.f ? 34 : 37}" ry="${t.f ? 38 : 40}" fill="url(#${id})"/>`;
  if (t.f) s += `<path d="M44 52 Q80 18 116 52 Q100 36 80 38 Q60 36 44 52Z" fill="${t.hair}"/>`;
  else if (t.cap) s += `<path d="M42 50 Q80 14 118 50 Z" fill="${t.top}"/><rect x="70" y="44" width="56" height="8" rx="4" fill="${t.top}"/>`;
  else if (t.hairStyle === 'short') s += `<path d="M44 52 Q80 16 116 52 Q98 38 80 40 Q62 38 44 52Z" fill="${t.hair}"/>`;
  else s += `<line x1="80" y1="26" x2="80" y2="12" stroke="${m}" stroke-width="3"/><circle cx="80" cy="10" r="5" fill="${t.led}"/>`;
  s += `<rect x="52" y="58" width="56" height="20" rx="10" fill="#0a0d12"/><circle cx="68" cy="68" r="5" fill="${e}"/><circle cx="92" cy="68" r="5" fill="${e}"/><rect x="72" y="86" width="16" height="3" rx="1.5" fill="${e}"/>`;
  if (t.glasses) s += `<rect x="50" y="62" width="60" height="9" rx="4" fill="#000" opacity=".85"/>`;
  if (t.phones) s += `<path d="M40 64 Q40 22 80 22 Q120 22 120 64" stroke="#2b2f35" stroke-width="5" fill="none"/><rect x="34" y="58" width="12" height="20" rx="5" fill="#1c1f24"/><rect x="114" y="58" width="12" height="20" rx="5" fill="#1c1f24"/>`;
  if (t.f) s += `<circle cx="44" cy="80" r="3" fill="#ffd166"/><circle cx="116" cy="80" r="3" fill="#ffd166"/>`;
  s += `<rect x="56" y="126" width="48" height="22" rx="7" fill="#0b1020"/><text x="80" y="141" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="${e}">${code}</text></svg>`;
  return s;
}

// ======================= day / night =======================
const THEMES = {
  night: { sky: ['#03040c', '#0e1230', '#25204a', '#3a2a55'], fog: '#141a33', ground: '#2a3a2a', asph: '#202328', hemi: 0.35, sun: 0.25, sunCol: '#8fa8ff', exp: 1.05, win: 1.0, glow: 1.0, stars: 1, bloom: 0.75 },
  day: { sky: ['#2f74c8', '#6fa6e0', '#bcd8ef', '#eef1f4'], fog: '#cfdeee', ground: '#6f9e4f', asph: '#3a3f47', hemi: 1.0, sun: 2.3, sunCol: '#fff2dd', exp: 1.0, win: 0.0, glow: 0.12, stars: 0, bloom: 0.08 },
};
function tashkentHour() { try { return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: CFG.timezone, hour: 'numeric', hour12: false }).format(new Date()), 10) % 24; } catch (e) { return new Date().getHours(); } }
let themeK = (() => { const s = Date.now() - +(store.get('aishahar_theme_ts') || 0) < 3 * 3600e3 ? store.get('aishahar_theme') : ''; if (s === 'day') return 1; if (s === 'night') return 0; const h = tashkentHour(); return h >= 6 && h < 19 ? 1 : 0; })();
let themeTarget = themeK;
const CA = new THREE.Color(), CB = new THREE.Color();
const mixHex = (a, b, k) => '#' + CA.set(a).lerp(CB.set(b), k).getHexString();
let bloom = null;
function applyTheme(k) {
  const n = THEMES.night, d = THEMES.day, lerp = (a, b) => a + (b - a) * k;
  const g = skyCanvas.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  [0, .55, .82, 1].forEach((p, i) => gr.addColorStop(p, mixHex(n.sky[i], d.sky[i], k))); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); skyTex.needsUpdate = true;
  scene.fog.color.set(mixHex(n.fog, d.fog, k)); grassMat.color.set(mixHex(n.ground, d.ground, k)); asphaltMat.color.set(mixHex(n.asph, d.asph, k));
  hemi.intensity = lerp(n.hemi, d.hemi); sun.intensity = lerp(n.sun, d.sun); sun.color.set(mixHex(n.sunCol, d.sunCol, k));
  renderer.toneMappingExposure = lerp(n.exp, d.exp);
  B.tower.mesh.material.emissiveIntensity = lerp(n.win, d.win) * 1.1; B.house.mesh.material.emissiveIntensity = lerp(n.win, d.win) * 0.9;
  const gk = lerp(n.glow, d.glow);
  glowBase.forEach((gb, i) => { if (gb && gb.nightOnly) B.glow.mesh.setColorAt(i, CA.copy(gb.c).multiplyScalar(gk)); }); if (B.glow.mesh.instanceColor) B.glow.mesh.instanceColor.needsUpdate = true;
  if (SEASON === 'winter') grassMat.color.lerp(CB.set(k > 0.5 ? '#eef3f7' : '#9aa6b8'), 0.85);
  stars.material.opacity = 1 - k; stars.visible = k < 0.99; if (bloom) bloom.strength = lerp(n.bloom, d.bloom);
  if (carLamp) { carLamp.material.color.set(mixHex('#fff6d8', '#e9e9e9', k)); }
  if (window.__wxApply) window.__wxApply(k);
  document.body.classList.toggle('day', k > 0.5); $('#btnTheme').textContent = k > 0.5 ? '☀' : '☾';
}
$('#btnTheme').onclick = () => { themeTarget = themeTarget > 0.5 ? 0 : 1; store.set('aishahar_theme', themeTarget ? 'day' : 'night'); };

// ======================= state + UI =======================
let follow = false;
let specs = [], index = new Map(), selected = null, cardState = null, fly = null, tour = null, CAP_RES = 0;
let HOME_P = new THREE.Vector3(260, 230, 330); const HOME_T = new THREE.Vector3(0, 0, 0);
function flyTo(pos, target, dur = 1.8) { fly = { t0: performance.now(), dur: dur * 1000, p0: camera.position.clone(), q0: controls.target.clone(), p1: pos.clone(), q1: target.clone() }; }
function toast(t, ms = 2800) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('on'), ms); }
function spec(name, i) {
  const t = traits(name); const sp = { name, i, traits: t, role: hash(name + 'role') % 14, code: 'RX-' + String(hash(name + 'rx') % 9000 + 1000) };
  return sp;
}
function viewDir(sp, x, z) { const [cx, cz, , ] = sp.p1, kind = sp.p2[2]; const d = kind === 1 ? new THREE.Vector3(cx - x, 0, cz - z) : kind === 0 ? new THREE.Vector3(x - cx, 0, z - cz) : new THREE.Vector3(Math.sin(sp.p2[3]), 0, Math.cos(sp.p2[3])); if (d.lengthSq() < 0.01) d.set(1, 0, 1); return d.normalize(); }
function select(sp, fresh = false) {
  selected = sp; labelAssignT = -9; const [x, z] = robotPos(sp, UTIME.value); const tg = new THREE.Vector3(x, 2, z);
  const dir = viewDir(sp, x, z).applyAxisAngle(YAX, 0.35);
  follow = true; flyTo(tg.clone().add(dir.multiplyScalar(12)).setY(7.5), tg); cardState = { kind: 'res', sp, fresh }; renderCard();
}
function home() { selected = null; cardState = null; labelAssignT = -9; $('#card').classList.remove('on'); document.body.classList.remove('cardopen'); flyTo(HOME_P, HOME_T); }
function renderCard() {
  const c = $('#card'), st = cardState; if (!st) return;
  if (window.__cardExt && window.__cardExt(c, st)) { /* v7 cards */ } else if (st.kind === 'res') {
    const sp = st.sp, h = houseIdx[sp.i];
    c.innerHTML = `<button class="x" aria-label="×">×</button><div class="hdr"><div class="bot">${robotSVG(sp.name)}</div><div class="ttl"><h2>@${esc(sp.name)}</h2>
      <div class="code">${sp.code} · ${T('roles')[sp.role]}</div><div class="mini">🏠 ${T('homeV').replace('{b}', h.block).replace('{l}', h.lot)} · ${T('st')[sp.act] || ''}</div></div></div>
      <button class="more" data-a="more">${T('more')} ▾</button><dl><dt>${T('type')}</dt><dd>${sp.traits.f ? T('girl') : T('boy')}</dd>
      <dt>${T('home')}</dt><dd>${T('homeV').replace('{b}', h.block).replace('{l}', h.lot)}</dd>
      <dt>${T('num')}</dt><dd>#${(sp.i + 1).toLocaleString('ru-RU')}</dd>
      <dt>${T('status')}</dt><dd>${T('st')[sp.act] || ''}</dd>${sp.traits.vip ? `<dt>👑</dt><dd>${T('vipBadge')} #${sp.traits.vip}</dd>` : ''}${UPG.get(sp.name) ? `<dt>${TIER_INFO[UPG.get(sp.name)].icon}</dt><dd>${T('tierNames')[UPG.get(sp.name)]}</dd>` : ''}</dl>
      <div class="acts"><button class="pri" data-a="near">${T('near')}</button><button data-a="house">🏠 ${T('goHome')}</button>${GAME.me === sp.name ? `<button class="drive" data-a="drive">🎮 ${T('drive')}</button>` : ''}${GAME.me === sp.name ? `<button class="shopb" data-a="shop">${T('shop')}</button>` : !GAME.me ? `<button class="meb" data-a="me">${T('isMe')}</button>` : ''}${GAME.me !== sp.name ? `<button class="likeb${GAME.liked.has(sp.name) ? ' on' : ''}" data-a="like">❤️ ${LIKES.get(sp.name) || 0}</button>` : ''}<button data-a="guest">📖 ${T('guestBtn')}</button><button class="story" data-a="story">📲 ${T('story')}</button>${CFG.botUsername && (UPG.get(sp.name) || 0) < 3 ? `<a class="upg" href="https://t.me/${CFG.botUsername}?start=up_${sp.name.replace(/\./g, '-')}" target="_blank" rel="noopener">${T('upgrade')}</a>` : ''}</div>`;
    if (st.fresh) { toast(T('toastNew')); st.fresh = false; }
  } else if (st.kind === 'new') {
    c.innerHTML = `<button class="x" aria-label="×">×</button><div class="bot">${robotSVG(st.name)}</div><div class="new"><h2>@${esc(st.name)}</h2><p>${T('newText')}</p><p>${T('followFirst').replace('{o}', esc(OWNER))}</p></div><div class="acts"><a class="ig" href="https://instagram.com/${OWNER}" target="_blank" rel="noopener">${T('follow')}</a></div>`;
  } else if (st.kind === 'recovery') {
    c.innerHTML = `<button class="x" aria-label="×">×</button><h2>${T('recTitle')}</h2><div class="reccode">${esc(st.code)}</div><p class="vh">${T('recText')}</p>`;
  } else if (st.kind === 'recover') {
    c.innerHTML = `<button class="x" aria-label="×">×</button><h2>@${esc(st.nick)}</h2><p class="vh">${T('recAsk')}</p><input id="recIn" class="cardin" placeholder="XXXX-XXXX" maxlength="12" autocapitalize="characters"><div class="acts"><button class="pri" data-a="recover">${T('recBtn')}</button></div>`;
  } else if (st.kind === 'admin') {
    const pw = store.get('aishahar_admin_pw');
    if (!pw) c.innerHTML = `<button class="x" aria-label="×">×</button><h2>🛠 ${T('admin')}</h2><input id="admPw" class="cardin" type="password" placeholder="🔑 ${T('adminPw')}"><div class="acts"><button class="pri" data-a="admlogin">${T('adminSave')}</button></div>`;
    else { const S = st.stats; const days = S ? S.daily.map((d) => `<div class="bar"><span>${d.day.slice(5)}</span><i style="width:${Math.max(4, d.uniques / Math.max(...S.daily.map((x) => x.uniques), 1) * 100)}%"></i><b>${d.uniques}</b></div>`).join('') : '…';
      c.innerHTML = `<button class="x" aria-label="×">×</button><h2>🛠 ${T('admin')}</h2><div class="acts"><button class="pri" data-a="weekly">🎬 ${T('weekly')}</button></div><div class="code">${T('stats')}</div>
        ${S ? `<dl><dt>${T('players')}</dt><dd>${S.players}</dd><dt>${T('msgs')}</dt><dd>${S.chat}</dd></dl><p class="vh">${T('visitors')}</p><div class="bars">${days}</div><p class="vh">${T('refs')}</p><div class="refs">${S.refs.map((r) => `<span>${esc(r.ref)}: <b>${r.visits}</b></span>`).join('')}</div>` : '<p class="vh">…</p>'}
        <p class="vh">${T('unlink')}</p><div class="row2"><input id="admNick" class="cardin" placeholder="nikneym"><button data-a="admunlink">${T('unlinkBtn')}</button></div>
        <p class="vh">${T('bans')}</p><div class="vlist">${(st.bans || []).map((b) => `<button class="vrow" data-a="admunban" data-n="${esc(b.nick)}">🚫 @${esc(b.nick)} · ${T('unban')}</button>`).join('') || '<p class="vh">—</p>'}</div>`;
      if (!S) loadAdmin(); }
  } else if (st.kind === 'shop') {
    const P = GAME.player || { crystals: 0, items: [], equipped: {} }, rows = Object.entries(GAME_SHOP).map(([id, it]) => { const own = (P.items || []).includes(id), on = (P.equipped || {})[it.kind] === id;
      return `<div class="srow"><span>${T('items')[id]}</span><b>${own ? '✓ ' + T('owned') : it.price + ' 💎'}</b>${own ? (on ? `<button data-a="unequip" data-i="${id}" data-k="${it.kind}">${T('unequip')}</button>` : `<button data-a="equip" data-i="${id}">${T('equip')}</button>`) : `<button class="pri" data-a="buy" data-i="${id}" ${P.crystals < it.price ? 'disabled' : ''}>${T('buy')}</button>`}</div>`; }).join('');
    const rc = store.get('aishahar_rec_' + GAME.me);
    c.innerHTML = `<button class="x" aria-label="×">×</button><h2>🛍 ${T('shopTitle')}</h2><div class="code">💎 ${P.crystals} · 🔥 ${P.streak || 0}</div><p class="vh">${T('shopHint')}</p><div class="shop">${rows}</div>${CFG.botUsername ? (P.tg ? `<p class="vh">${T('tgOn')}</p>` : `<div class="acts"><button class="pri" data-a="tglink">${T('tgBtn')}</button></div><p class="vh">${T('tgHint')}</p>`) : ''}${rc ? `<p class="vh">🔑 ${T('recSaved')}: <b class="rc">${esc(rc)}</b></p>` : ''}`;
  } else if (st.kind === 'board') {
    const tab = st.tab || 'c'; let rows = '';
    if (tab === 'l') rows = [...LIKES.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([n, v], k) => `<button class="vrow" data-a="pick" data-n="${esc(n)}"><b>${k + 1}.</b> @${esc(n)} · ❤️ ${v}</button>`).join('');
    else if (tab === 'r') rows = (GAME.board.r || []).map((r, k) => `<button class="vrow" data-a="pick" data-n="${esc(r.nick)}"><b>${k === 0 ? '🥇' : k === 1 ? '🥈' : k === 2 ? '🥉' : k + 1 + '.'}</b> @${esc(r.nick)} · ⏱ ${Number(r.race_best).toFixed(2)} s</button>`).join('');
    else rows = (GAME.board[tab] || []).map((r, k) => `<button class="vrow" data-a="pick" data-n="${esc(r.nick)}"><b>${k === 0 ? '🥇' : k === 1 ? '🥈' : k === 2 ? '🥉' : k + 1 + '.'}</b> @${esc(r.nick)} · ${tab === 'c' ? '💎 ' + r.crystals : '🔥 ' + r.streak}</button>`).join('');
    c.innerHTML = `<button class="x" aria-label="×">×</button><h2>📊 ${T('board')}</h2><div class="tabs"><button class="${tab === 'c' ? 'on' : ''}" data-a="tab" data-t="c">${T('boardC')}</button><button class="${tab === 's' ? 'on' : ''}" data-a="tab" data-t="s">${T('boardS')}</button><button class="${tab === 'l' ? 'on' : ''}" data-a="tab" data-t="l">${T('boardL')}</button><button class="${tab === 'r' ? 'on' : ''}" data-a="tab" data-t="r">${T('boardR')}</button></div><div class="vlist">${rows || '<p class="vh">—</p>'}</div>`;
    if (tab !== 'l' && !GAME.board[tab]) loadBoard(tab);
  } else if (st.kind === 'sponsors') {
    const best = new Map(); for (const r of UPG_ROWS) { const n = clean(r.nickname); const b = best.get(n) || { tier: 0, stars: 0 }; best.set(n, { tier: Math.max(b.tier, r.tier), stars: b.stars + (r.stars || 0) }); }
    const rows = [...best.entries()].sort((a, b) => b[1].tier - a[1].tier || b[1].stars - a[1].stars).map(([n, v]) => `<button class="vrow" data-a="pick" data-n="${esc(n)}"><b>${TIER_INFO[v.tier].icon}</b> @${esc(n)} · ${T('tierNames')[v.tier]}</button>`).join('');
    c.innerHTML = `<button class="x" aria-label="×">×</button><h2>💎 ${T('sponsors')}</h2><p class="vh">${T('sponsorsHint')}</p><div class="vlist">${rows}</div>`;
  } else if (st.kind === 'vip') {
    const rows = [...VIP.entries()].sort((a, b) => a[1] - b[1]).map(([n, r]) => `<button class="vrow" data-a="pick" data-n="${esc(n)}"><b>${r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : '#' + r}</b> @${esc(n)}</button>`).join('');
    c.innerHTML = `<button class="x" aria-label="×">×</button><h2>🏆 ${T('vipTitle')}</h2><div class="code">${esc(VIP_WEEK)}</div><p class="vh">${T('vipHint')}</p><div class="vlist">${rows}</div>`;
  } else if (st.kind === 'owner') {
    c.innerHTML = `<button class="x" aria-label="×">×</button><div class="hdr"><div class="bot">${robotSVG(OWNER, 'RX-0001')}</div><div class="ttl"><h2>@${esc(OWNER)}</h2><div class="code">RX-0001 · ${T('ownerRole')}</div></div></div>
      <dl><dt>${T('home')}</dt><dd>${T('ownerAddr')}</dd><dt>${T('height')}</dt><dd>${T('ownerH')}</dd></dl>
      <div class="acts"><button data-a="tour">${T('tourBtn')}</button><button class="pri" data-a="random">${T('randomRes')}</button><button data-a="admin">🛠 ${T('admin')}</button></div>`;
  }
  c.classList.add('on'); c.classList.remove('exp'); document.body.classList.add('cardopen');
}
function showOwner() { selected = null; flyTo(new THREE.Vector3(30, 26, 44), new THREE.Vector3(0, 12, 0)); cardState = { kind: 'owner' }; renderCard(); }
function showNew(name) { selected = null; cardState = { kind: 'new', name }; renderCard(); }
let claiming = false;
async function claim(name) {
  if (index.has(name)) return select(specs[index.get(name)]);
  if (specs.length >= CAP_RES || claiming) { if (!claiming) toast(T('full')); return; }
  claiming = true; try { await saveClaim(name); } catch (e) { claiming = false; return toast(T('saveErr')); } claiming = false;
  const sp = addLive(name); if (sp) select(sp, true);
}
function addLive(name) {
  const sp = addResident(name); if (!sp) return null; B.house.done(); B.box.done(); B.roof.done(); B.cyl.done(); B.cone.done(); B.sph.done(); refreshRobots(); animatePop(specs.length + 1); drawMapStatic();
  recent.unshift(name); checkGoals(true); return sp;
}
function addResident(name) {
  if (index.has(name) || name === OWNER) return null;
  const sp = spec(name, specs.length); index.set(name, sp.i); specs.push(sp);
  addHouse(sp.i, name); assignActivity(sp); placeRobot(sp); return sp;
}
const randomRes = () => specs.length && select(specs[Math.floor(Math.random() * specs.length)]);
$('#card').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.classList.contains('x')) return home();
  const a = b.dataset.a; if (window.__cardAct && window.__cardAct(a, b)) return;
  if (a === 'near' && selected) { follow = true; const [x, z] = robotPos(selected, UTIME.value); const tg = new THREE.Vector3(x, 2.2, z); const d = viewDir(selected, x, z).applyAxisAngle(YAX, 0.5).multiplyScalar(8.5); flyTo(tg.clone().add(d).setY(5.5), tg, 1.2); }
  if (a === 'house' && selected) { const h = houseIdx[selected.i]; const tg = new THREE.Vector3(h.x, 3, h.z); const [fx, fz] = dirOf(h.face); followOff = false; selected = null; labelAssignT = -9; flyTo(new THREE.Vector3(h.x + fx * 22 + 6, 12, h.z + fz * 22 + 6), tg); }
  if (a === 'tour') startTour();
  if (a === 'story' && cardState?.sp) openStory(cardState.sp);
  if (a === 'claim' && cardState?.name) claim(cardState.name);
  if (a === 'random') randomRes();
  if (a === 'drive' && cardState?.sp) startDrive(cardState.sp);
  if (a === 'me' && cardState?.sp) claimMe(cardState.sp.name);
  if (a === 'shop') { cardState = { kind: 'shop', back: cardState }; renderCard(); }
  if (a === 'like' && cardState?.sp) likeHouse(cardState.sp.name, b);
  if (a === 'buy' || a === 'equip' || a === 'unequip') shopAction(a, b.dataset.i, b.dataset.k);
  if (a === 'recover') doRecover(cardState.nick, ($('#recIn') || {}).value || '');
  if (a === 'admin') { cardState = { kind: 'admin' }; renderCard(); }
  if (a === 'admlogin') { const v = (($('#admPw') || {}).value || '').trim(); if (v) { store.set('aishahar_admin_pw', v); renderCard(); } }
  if (a === 'admunlink') adminUnlink(clean(($('#admNick') || {}).value || ''));
  if (a === 'admunban') adminChat('unban', { nick: b.dataset.n }).then(() => { cardState = { kind: 'admin' }; renderCard(); });
  if (a === 'tab') { cardState = { kind: 'board', tab: b.dataset.t }; renderCard(); }
  if (a === 'more') { $('#card').classList.toggle('exp'); b.textContent = T('more') + ($('#card').classList.contains('exp') ? ' ▴' : ' ▾'); }
  if (a === 'pick' && index.has(b.dataset.n)) select(specs[index.get(b.dataset.n)]);
});
let followOff = false;
$('#sform').addEventListener('submit', (e) => {
  e.preventDefault(); const n = clean($('#q').value); $('#q').value = n; $('#q').blur();
  if (!n) return toast(T('typeNick')); if (n === OWNER) return showOwner();
  if (index.has(n)) select(specs[index.get(n)]); else showNew(n);
});
$('#btnHome').onclick = home; $('#btnRand').onclick = randomRes; $('#btnTour').onclick = () => startTour();
function applyLang() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = T(el.dataset.t); });
  $('#q').placeholder = T('ph'); if ($('#chatInput')) { $('#chatInput').placeholder = T('chatPh'); $('#chatNick').placeholder = T('chatWho'); } const lt = $('#ltext'); if (lt) lt.textContent = T('loader');
  document.querySelectorAll('#langs button').forEach((b) => b.classList.toggle('on', b.dataset.l === LANG));
  $('#ownerTag').textContent = '@' + OWNER; $('#ownerTag').href = 'https://instagram.com/' + OWNER; const lg = T('lg');
  $('#legend').innerHTML = `<span><i style="background:#5a6170"></i>${lg.down}</span><span><i style="background:#c98b5b"></i>${lg.amen}</span><span><i style="background:#7aa85a"></i>${lg.res}</span><span><i style="background:#39ff88;border-radius:50%"></i>${lg.bots}</span><span><i style="background:#ff4fd8;border-radius:50%"></i>${lg.you}</span>`;
  if (cardState) renderCard();
}
document.querySelectorAll('#langs button').forEach((b) => b.onclick = () => { LANG = b.dataset.l; store.set('aishahar_lang', LANG); applyLang(); refreshSigns(); applyTheme(themeK); checkGoals(false); });
function startTour() { document.body.classList.add('cinema'); fly = null; tour = { t0: performance.now() }; controls.enabled = false; }
function stopTour() { if (!tour || recording) return; tour = null; document.body.classList.remove('cinema'); controls.enabled = true; }
addEventListener('pointerdown', () => { if (tour && performance.now() - tour.t0 > 400) stopTour(); }, true);
addEventListener('keydown', (e) => { if (e.key === 'Escape') stopTour(); });
function animatePop(to) { const el = $('#pop'), from = parseInt(el.dataset.v || '0', 10), t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / 1600); const v = Math.round(from + (to - from) * ease(k)); el.textContent = v.toLocaleString('ru-RU'); el.dataset.v = v; if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }


// ======================= click / tap on robots, labels, houses =======================
const ray = new THREE.Raycaster(), NDC = new THREE.Vector2(), PV = new THREE.Vector3(); let downXY = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downXY = [e.clientX, e.clientY, performance.now()]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downXY || tour || drive) return; const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]), dt = performance.now() - downXY[2]; downXY = null;
  if (moved > 7 || dt > 600) return; pickAt(e.clientX, e.clientY);
});
function pickAt(cx, cy) {
  const t = UTIME.value, rect = renderer.domElement.getBoundingClientRect();
  const ppu = (d) => rect.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * d);
  const toScreen = (x, y, z) => { PV.set(x, y, z).project(camera); if (PV.z > 1 || PV.z < -1) return null; return [(PV.x + 1) / 2 * rect.width + rect.left, (1 - PV.y) / 2 * rect.height + rect.top]; };
  let best = null, bestScore = Infinity;
  // nickname labels first (easiest to hit)
  for (const L of labelPool) { if (!L.sp || !L.s.visible) continue; const p = L.s.position, sc = toScreen(p.x, p.y, p.z); if (!sc) continue;
    const k = ppu(camera.position.distanceTo(p)), hw = L.s.scale.x * k * 0.42, hh = L.s.scale.y * k * 0.5;
    if (Math.abs(cx - sc[0]) < hw && Math.abs(cy - sc[1]) < hh) { const sc2 = Math.abs(cy - sc[1]) / hh * 0.5; if (sc2 < bestScore) { bestScore = sc2; best = L.sp; } } }
  // robot bodies
  for (const sp of specs) { const [x, z] = robotPos(sp, t), u = sp.traits.u; const y = 1.6 * u, sc = toScreen(x, y, z); if (!sc) continue;
    const dist = camera.position.distanceTo(PV.set(x, y, z)); const r = Math.max(16, 1.9 * u * ppu(dist)); const d = Math.hypot(cx - sc[0], cy - sc[1]);
    if (d < r) { const score = d / r + dist / 4000; if (score < bestScore) { bestScore = score; best = sp; } } }
  if (best) return select(best);
  { let bc = null, bd = Infinity; for (const c of cars) { const sc = toScreen(c.x, 1, c.z); if (!sc) continue; const dist = camera.position.distanceTo(PV.set(c.x, 1, c.z)), rr = Math.max(14, c.m.b[2] * 0.5 * ppu(dist)), d = Math.hypot(cx - sc[0], cy - sc[1]); if (d < rr && d < bd) { bd = d; bc = c; } }
    if (bc) return toast('🚗 ' + bc.m.n); }
  // houses and the owner's giant robot
  NDC.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1); ray.setFromCamera(NDC, camera);
  const hits = ray.intersectObjects([B.house.mesh, ownerGroup, ...(window.__bbMeshes || [])], true);
  if (hits.length) { const h = hits[0]; if (h.object.userData.bb) return window.__bbOpen(); if (h.object === B.house.mesh && specs[houseOfInst[h.instanceId]]) return select(specs[houseOfInst[h.instanceId]]); if (h.object !== B.house.mesh) return showOwner(); }
}

// ======================= Instagram story image =======================
const siteLink = (name) => CFG.siteUrl.replace(/\/$/, '') + '/#' + name;
const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function fitFont(g, text, weight, size, family, maxW) { let s = size; do { g.font = `${weight} ${s}px ${family}`; s -= 2; } while (g.measureText(text).width > maxW && s > 20); }
async function makeStory(sp) {
  try { await document.fonts.ready; } catch (e) {}
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const SG = '"Space Grotesk", Arial, sans-serif', MONO = '"JetBrains Mono", monospace';
  g.fillStyle = '#05060c'; g.fillRect(0, 0, W, H);
  // live city snapshot as background
  try { beam.visible = false; if (composer) composer.render(); else renderer.render(scene, camera); const src = renderer.domElement, sw = src.width, sh = src.height, k = Math.max(W / sw, H / sh) * 1.05;
    g.globalAlpha = 0.9; g.drawImage(src, (W - sw * k) / 2, (H - sh * k) / 2, sw * k, sh * k); g.globalAlpha = 1; } catch (e) {}
  let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(5,6,12,.55)'); gr.addColorStop(0.35, 'rgba(5,6,12,.35)'); gr.addColorStop(0.6, 'rgba(5,6,12,.88)'); gr.addColorStop(1, 'rgba(5,6,12,.97)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 74px ${SG}`; const t1 = 'AI SHAHAR ', t2 = '2036', w1 = g.measureText(t1).width, w2 = g.measureText(t2).width, x0 = W / 2 - (w1 + w2) / 2;
  g.textAlign = 'left'; g.fillStyle = '#e8f6ee'; g.fillText(t1, x0, 250); g.fillStyle = '#39ff88'; g.shadowColor = 'rgba(57,255,136,.7)'; g.shadowBlur = 24; g.fillText(t2, x0 + w1, 250); g.shadowBlur = 0; g.textAlign = 'center';
  g.font = `500 34px ${MONO}`; g.fillStyle = 'rgba(232,246,238,.75)'; g.fillText(T('tag'), W / 2, 315);
  // robot avatar with glow
  const t = sp.traits, glowC = t.eye; gr = g.createRadialGradient(W / 2, 760, 40, W / 2, 760, 360); gr.addColorStop(0, glowC + '66'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 380, W, 760);
  g.strokeStyle = glowC; g.lineWidth = 6; g.shadowColor = glowC; g.shadowBlur = 30; g.beginPath(); g.arc(W / 2, 760, 300, 0, Math.PI * 2); g.stroke(); g.shadowBlur = 0;
  try { const img = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(robotSVG(sp.name))); g.drawImage(img, W / 2 - 280, 480, 560, 560); } catch (e) {}
  g.fillStyle = '#ffffff'; fitFont(g, '@' + sp.name, 700, 86, SG, W - 120); g.fillText('@' + sp.name, W / 2, 1150);
  g.font = `700 38px ${MONO}`; g.fillStyle = '#39ff88'; g.fillText(sp.code + ' · ' + T('roles')[sp.role], W / 2, 1220);
  const h = houseIdx[sp.i], pill = `🏠 ${T('homeV').replace('{b}', h.block).replace('{l}', h.lot)}  ·  #${sp.i + 1}  ·  ${t.f ? T('girl') : T('boy')}`;
  g.font = `600 34px ${SG}`; const pw = Math.min(W - 100, g.measureText(pill).width + 70); rr(g, (W - pw) / 2, 1268, pw, 74, 37); g.fillStyle = 'rgba(255,255,255,.1)'; g.fill(); g.strokeStyle = 'rgba(57,255,136,.5)'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#e8f6ee'; g.fillText(pill, W / 2, 1306, W - 140);
  g.fillStyle = '#ffffff'; fitFont(g, T('storyLive'), 700, 52, SG, W - 120); g.fillText(T('storyLive'), W / 2, 1420);
  g.font = `500 36px ${SG}`; g.fillStyle = 'rgba(232,246,238,.8)'; g.fillText(T('storyFind'), W / 2, 1490);
  const link = CFG.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''); rr(g, 110, 1530, W - 220, 104, 52); g.fillStyle = '#39ff88'; g.fill();
  g.fillStyle = '#04140b'; fitFont(g, link, 700, 44, MONO, W - 300); g.fillText(link, W / 2, 1584);
  g.font = `500 30px ${MONO}`; g.fillStyle = 'rgba(232,246,238,.6)'; g.fillText('@' + OWNER, W / 2, 1680);
  return await new Promise((ok) => c.toBlob(ok, 'image/png'));
}
async function openStory(sp) {
  let m = document.getElementById('storyModal'); if (m) m.remove();
  m = document.createElement('div'); m.id = 'storyModal';
  m.style.cssText = 'position:fixed;inset:0;z-index:50;background:rgba(3,4,10,.86);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;font-family:"Space Grotesk",system-ui,sans-serif;color:#e8f6ee';
  m.innerHTML = `<div style="font:600 14px JetBrains Mono,monospace;color:#39ff88">${T('making')}</div>`; document.body.appendChild(m);
  const blob = await makeStory(sp); const url = URL.createObjectURL(blob), link = siteLink(sp.name), fname = `ai-shahar-${sp.name}.png`;
  const btn = 'border:1px solid rgba(57,255,136,.45);background:#0b1020;color:#e8f6ee;font:600 15px inherit;font-family:inherit;padding:12px 16px;border-radius:12px;cursor:pointer;flex:1;min-width:140px';
  m.innerHTML = `<button data-s="x" style="position:absolute;top:12px;right:16px;background:none;border:0;color:#fff;font-size:30px;cursor:pointer">×</button>
    <img src="${url}" alt="" style="max-height:58vh;max-width:88vw;border-radius:16px;box-shadow:0 0 40px rgba(57,255,136,.25)">
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:520px;width:100%">
      <button data-s="share" style="${btn};background:#39ff88;color:#04140b">📲 ${T('share')}</button>
      <button data-s="dl" style="${btn}">⬇ ${T('dl')}</button>
      <button data-s="copy" style="${btn}">🔗 ${T('copy')}</button></div>
    <div style="font:500 12px JetBrains Mono,monospace;color:#39ff88;word-break:break-all;text-align:center">${esc(link)}</div>
    <div style="max-width:520px;font-size:13px;line-height:1.45;opacity:.8;text-align:center">${T('storyHint')}</div>`;
  const file = new File([blob], fname, { type: 'image/png' });
  const download = () => { const a = document.createElement('a'); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove(); };
  const copy = async () => { try { await navigator.clipboard.writeText(link); } catch (e) { const ta = document.createElement('textarea'); ta.value = link; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (_) {} ta.remove(); } toast(T('copied')); };
  m.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) { if (e.target === m) m.remove(); return; }
    const k = b.dataset.s;
    if (k === 'x') { m.remove(); URL.revokeObjectURL(url); }
    if (k === 'dl') download();
    if (k === 'copy') copy();
    if (k === 'share') { await copy(); try { if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text: T('storyFind') + ' ' + link }); else download(); } catch (err) { if (err && err.name !== 'AbortError') download(); } }
  });
}

// ======================= city growth goals =======================
const GOALS = [{ key: 'airport', n: 500, icon: '✈️' }, { key: 'metro', n: 750, icon: '🚇' }, { key: 'beach', n: 1000, icon: '🏖' }, { key: 'f1', n: 2000, icon: '🏎' }];
let POP = 1, recent = [], recording = false;
const goalSite = {}; const anims = [];
const towardCity = (x, z) => faceToCentre(x, z);
function goalSign(key, x, z, w, y = 4.5) { const ry = towardCity(x, z), [fx, fz] = dirOf(ry); const g = GOALS.find((q) => q.key === key);
  return addSign(() => POP >= g.n ? `${g.icon} ${T('sign')[key]}` : `${g.icon} ${T('sign')[key]} · ${g.n} ${T('soon')}`, x + fx * 0.1, y, z + fz * 0.1, w, ry, POP >= g.n ? '#0b1020' : '#f2c94c', POP >= g.n ? '#39ff88' : '#111111'); }
function construction(key, x, z) {
  const r = rng(hash(key)); box(x, 0, z, 64, 0.15, 64, '#a1887f');
  for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; box(x + Math.cos(a) * 32, 0, z + Math.sin(a) * 32, 5.8, 2.2, 0.3, i % 2 ? '#f2c94c' : '#e0e0e0', -a + Math.PI / 2); }
  for (let i = 0; i < 7; i++) box(x - 18 + r() * 36, 0.15, z - 18 + r() * 36, 3 + r() * 6, 1.5 + r() * 4, 3 + r() * 6, pick(r, ['#8d6e63', '#bdbdbd', '#ffb300', '#607d8b']));
  box(x + 12, 0, z - 6, 1.8, 46, 1.8, '#f2b705'); box(x + 2, 46, z - 6, 34, 1.5, 1.5, '#f2b705'); box(x + 16, 40, z - 6, 0.25, 6, 0.25, '#333'); box(x + 16, 38, z - 6, 2.4, 1.6, 2.4, '#888'); glow(x + 12, 48, z - 6, 1.2, '#ff3b3b', false);
  const ry = towardCity(x, z), [fx, fz] = dirOf(ry); goalSign(key, x + fx * 34, z + fz * 34, 44, 7);
}
function planeGroup(color) {
  const g = new THREE.Group(), body = matStd({ color, roughness: 0.35, metalness: 0.4 }), white = matStd({ color: 0xf2f4f7, roughness: 0.4 });
  const add = (geo, m, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = SHADOWS; g.add(o); return o; };
  add(new THREE.CylinderGeometry(1.7, 1.5, 24, 14), white, 0, 2.6, 0, Math.PI / 2); add(new THREE.SphereGeometry(1.7, 14, 10), white, 0, 2.6, 12);
  add(new THREE.BoxGeometry(26, 0.4, 4.5), body, 0, 2.2, 1); add(new THREE.BoxGeometry(9, 0.3, 2.4), body, 0, 3, -10.5); add(new THREE.BoxGeometry(0.4, 5, 3.2), body, 0, 5, -10.5);
  for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.8, 0.8, 3.2, 10), body, sx * 6, 1.4, 2, Math.PI / 2);
  scene.add(g); return g;
}
function buildAirport(x, z) {
  box(x + 28, 0.02, z, 30, 0.1, 400, '#2b2f36');
  for (let s = -185; s < 185; s += 16) B.paint.add(x + 28, 0.12, z + s, 0.9, 0.04, 8, '#ffffff');
  for (const sx of [-1, 1]) for (let s = -195; s <= 195; s += 13) glow(x + 28 + sx * 15, 0.5, z + s, 0.7, '#ffd27a');
  box(x - 6, 0.02, z, 26, 0.1, 210, '#3a3f47');
  B.tower.add(x - 32, 0, z, 20, 15, 100, '#cfd6de'); box(x - 32, 15, z, 23, 1.4, 103, '#7d8793');
  B.cyl.add(x - 30, 0, z - 78, 3.2, 36, 3.2, '#d8dde3'); B.cyl.add(x - 30, 36, z - 78, 8, 5, 8, '#3a5068'); box(x - 30, 41, z - 78, 9, 0.8, 9, '#6b7480'); glow(x - 30, 43, z - 78, 1.4, '#ff3b3b', false);
  for (const [dz, c] of [[-50, 0x2d6cdf], [40, 0xd62828]]) { const p = planeGroup(c); p.position.set(x - 6, 0, z + dz); p.rotation.y = Math.PI / 2; }
  goalSign('airport', x - 43, z, 34, 20);
  const pl = planeGroup(0x39b36b); pl.rotation.y = 0;
  anims.push((t) => { const p = (t % 26) / 26; const zz = -190 + 640 * Math.pow(p, 1.7); const y = Math.max(0, (zz - 30) * 0.28); pl.position.set(x + 28, y, z + zz); pl.rotation.x = y > 0 ? -0.22 : 0; pl.visible = p < 0.96; });
}
function rectPos(s, R) { const L = 2 * R, per = 4 * L; s = ((s % per) + per) % per; const side = Math.floor(s / L), u = s % L - R;
  return side === 0 ? [u, -R, Math.PI / 2] : side === 1 ? [R, u, 0] : side === 2 ? [-u, R, -Math.PI / 2] : [-R, -u, Math.PI]; }
function buildMetro() {
  const R = 1.5 * PITCH, H = 13, near = (v) => { const k = Math.round(v / PITCH + 0.5); return Math.abs(v - (k - 0.5) * PITCH) < 9; };
  for (let s = 0; s < 8 * R; s += 3) { const [x, z, ry] = rectPos(s, R); box(x, H, z, 3.4, 0.9, 3.4, '#9aa3ad', ry); }
  for (let s = 0; s < 8 * R; s += 16) { const [x, z] = rectPos(s, R); const along = Math.abs(x) === R ? z : x; if (near(along)) continue; B.cyl.add(x, 0, z, 1.4, H, 1.4, '#b8c0c8'); }
  box(0, H - 0.4, -R - 4.2, 34, 0.6, 5, '#cfd6de'); box(0, H + 4.6, -R - 4.2, 36, 0.4, 7, '#3a5068'); for (const sx of [-1, 1]) box(sx * 16, H, -R - 6.4, 0.5, 4.6, 0.5, '#6b7480');
  goalSign('metro', 0, -R - 7.2, 14, H + 7.2);
  const cars = []; const cm = matStd({ color: 0xe8ebef, roughness: 0.3, metalness: 0.5 }), stripe = new THREE.MeshBasicMaterial({ color: 0x39ff88, toneMapped: false });
  for (let i = 0; i < 4; i++) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 8.4), cm); b.position.y = 2; b.castShadow = SHADOWS; g.add(b); const st = new THREE.Mesh(new THREE.BoxGeometry(3.08, 0.35, 8.5), stripe); st.position.y = 2.2; g.add(st); scene.add(g); cars.push(g); }
  anims.push((t) => { const s0 = t * 14; cars.forEach((g, i) => { const [x, z, ry] = rectPos(s0 - i * 9, R); g.position.set(x, H + 0.45, z); g.rotation.y = ry; }); });
}
function palm(x, z, r) { const h = 7 + r() * 4; for (let k = 0; k < 6; k++) B.cyl.add(x + k * 0.15, k * h / 6, z, 0.6 - k * 0.05, h / 6 + 0.2, 0.6 - k * 0.05, '#8d6e4f'); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; box(x + 0.9 + Math.cos(a) * 2.2, h, z + Math.sin(a) * 2.2, 5, 0.25, 1.4, '#3f8f3a', -a, 0, 0.35); } }
function buildBeach(z0) {
  box(0, 0, z0 + 45, 640, 0.18, 90, '#ecd9a0');
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2600, 1200), new THREE.MeshStandardMaterial({ color: 0x1f8fd0, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.92 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.12, z0 + 90 + 600); sea.receiveShadow = SHADOWS; scene.add(sea);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(2600, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })); foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.2, z0 + 90); scene.add(foam);
  anims.push((t) => { foam.position.z = z0 + 90 + Math.sin(t * 0.8) * 1.5; foam.material.opacity = 0.45 + Math.sin(t * 0.8) * 0.25; });
  const r = rng(99);
  for (let i = 0; i < 26; i++) { const x = -290 + i * 23 + r() * 6, z = z0 + 40 + r() * 30; B.cyl.add(x, 0, z, 0.15, 3.4, 0.15, '#999'); B.cone.add(x, 3.2, z, 4.4, 1.2, 4.4, pick(r, ['#ff6b6b', '#ffd166', '#4dd0e1', '#ffffff', '#ff4fd8'])); box(x + 2, 0.18, z + 1, 1.3, 0.4, 2.6, '#ffffff'); }
  for (let i = 0; i < 16; i++) palm(-300 + i * 40 + r() * 10, z0 + 12 + r() * 10, r);
  box(120, 0, z0 + 90 + 60, 6, 1.2, 120, '#8d6e4f'); // pier
  goalSign('beach', 0, z0 + 6, 26, 6);
}
function buildF1(cx, cz) {
  const rx = 115, rz = 72, shape = new THREE.Shape(); shape.absellipse(0, 0, rx + 7, rz + 7, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absellipse(0, 0, rx - 7, rz - 7, 0, Math.PI * 2, true); shape.holes.push(hole);
  const tr = new THREE.Mesh(new THREE.ShapeGeometry(shape, 96).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.9 })); tr.position.set(cx, 0.08, cz); tr.receiveShadow = SHADOWS; scene.add(tr);
  for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2; for (const o of [7.6, -7.6]) box(cx + Math.cos(a) * (rx + o), 0.05, cz + Math.sin(a) * (rz + o), 3.2, 0.25, 1.1, i % 2 ? '#ffffff' : '#e53935', -a + Math.PI / 2); }
  for (let k = -6; k <= 6; k++) box(cx + rx, 0.1, cz + k * 1.1, 14, 0.05, 1.1, (k + 6) % 2 ? '#111' : '#fff');
  for (let k = 0; k < 6; k++) box(cx + rx + 22 + k * 1.5, 0, cz, 1.5, 1.4 + k * 1.3, 70, k % 2 ? '#d62828' : '#e8eef5');
  goalSign('f1', cx + rx + 32, cz, 30, 14);
  const cols = [0xd62828, 0x1565c0, 0xffd600, 0xc0c0c0, 0x00b894]; const cars = cols.map((c, i) => { const g = new THREE.Group(); const m = matStd({ color: c, roughness: 0.3, metalness: 0.5 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 5), m); b.position.y = 0.6; b.castShadow = SHADOWS; g.add(b); const w = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 0.8), m); w.position.set(0, 1.1, -2.3); g.add(w);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), matStd({ color: 0x111111 })); h.position.set(0, 1.15, 0.2); g.add(h); scene.add(g); return { g, sp: 0.55 + i * 0.04, ph: i * 0.35, lane: (i % 2 ? 2.6 : -2.6) }; });
  anims.push((t) => { for (const c of cars) { const a = t * c.sp + c.ph, x = cx + Math.cos(a) * (rx + c.lane), z = cz + Math.sin(a) * (rz + c.lane); c.g.position.set(x, 0.1, z); c.g.rotation.y = Math.atan2(-rx * Math.sin(a), rz * Math.cos(a)) + Math.PI; } });
}
function buildGoals() {
  const E = HWY + 40;
  goalSite.airport = { x: E + 110, z: 0 }; goalSite.metro = POP >= 500 + 250 ? { x: 0, z: -1.5 * PITCH } : { x: 0, z: -(E + 40) };
  goalSite.beach = { x: 0, z: E + 50 }; goalSite.f1 = { x: -(E + 130), z: 0 };
  POP >= 500 ? buildAirport(goalSite.airport.x, 0) : construction('airport', E + 40, 0);
  POP >= 750 ? buildMetro() : construction('metro', 0, -(E + 40));
  POP >= 1000 ? buildBeach(E - 10) : construction('beach', 0, E + 40);
  POP >= 2000 ? buildF1(goalSite.f1.x, 0) : construction('f1', -(E + 40), 0);
  if (POP < 500) goalSite.airport.x = E + 40; if (POP < 1000) goalSite.beach.z = E + 40; if (POP < 2000) goalSite.f1.x = -(E + 40);
}
function flyToGoal(key) { const s = goalSite[key]; if (!s) return; selected = null; labelAssignT = -9; cardState = null; $('#card').classList.remove('on');
  const tg = new THREE.Vector3(s.x, 0, s.z), d = new THREE.Vector3(s.x, 0, s.z).normalize(); if (d.lengthSq() < 0.5) d.set(0, 0, 1);
  flyTo(tg.clone().addScaledVector(d, -95).setY(55), tg, 2.2); }
let goalsBuiltAt = 0;
function checkGoals(live) {
  POP = specs.length + 1; if (!goalsBuiltAt) goalsBuiltAt = POP;
  const next = GOALS.find((g) => POP < g.n), el = $('#goal'); if (!el) return;
  if (!next) { el.innerHTML = `<span>${T('goalDone')}</span>`; el.dataset.k = ''; }
  else { const prev = [...GOALS].reverse().find((g) => POP >= g.n), from = prev ? prev.n : 0, k = Math.max(0, Math.min(1, (POP - from) / (next.n - from)));
    el.innerHTML = `<span>${next.icon} ${T('goals')[next.key]}: <b>${POP.toLocaleString('ru-RU')}</b>/${next.n}</span><i><u style="width:${(k * 100).toFixed(1)}%"></u></i>`; el.dataset.k = next.key; }
  if (live) for (const g of GOALS) if (goalsBuiltAt < g.n && POP >= g.n) { toast(T('unlocked').replace('{x}', T('goals')[g.key])); goalsBuiltAt = POP; }
}

// ======================= seasons =======================
let snow = null;
function buildSeason() {
  if (SEASON === 'winter') {
    const tx = -16, tz = -16;
    for (let k = 0; k < 5; k++) B.cone.add(tx, 1 + k * 3.4, tz, 13 - k * 2.3, 6, 13 - k * 2.3, '#1f6b34');
    B.cyl.add(tx, 0.3, tz, 1.2, 2, 1.2, '#5a3a22'); glow(tx, 19.5, tz, 2.2, '#ffd84d', false);
    const r = rng(12); for (let i = 0; i < 60; i++) { const h = 2 + r() * 16, rad = (13 - (h / 3.4) * 2.3) * 0.5 * 0.95, a = r() * Math.PI * 2; glow(tx + Math.cos(a) * rad, h + 1, tz + Math.sin(a) * rad, 0.55, pick(r, ['#ff3b3b', '#ffd166', '#4dd0e1', '#ff4fd8', '#39ff88']), false); }
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; glow(Math.cos(a) * 22, 5 + Math.sin(i * 1.3) * 0.4, Math.sin(a) * 22, 0.4, pick(r, ['#ff3b3b', '#ffd166', '#4dd0e1', '#ffffff']), false); }
    addSign('winter', 22, 10, 22, 22, Math.PI / 4, '#b71c1c', '#ffffff');
    const N = MOBILE ? 1500 : 3500, pos = new Float32Array(N * 3), rr = rng(5); for (let i = 0; i < N; i++) { pos[i * 3] = (rr() - 0.5) * 300; pos[i * 3 + 1] = rr() * 120; pos[i * 3 + 2] = (rr() - 0.5) * 300; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    snow = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.32, transparent: true, opacity: 0.9, depthWrite: false })); snow.frustumCulled = false; scene.add(snow);
  } else if (SEASON === 'navruz') {
    const r = rng(21); B.cyl.add(-16, 0.3, -16, 7, 3.4, 7, '#3b3b3b'); B.cyl.add(-16, 3.7, -16, 6.4, 0.3, 6.4, '#5a3a22'); glow(-16, 1, -16, 4, '#ff7a1a', false);
    for (const b of blockInfo) { if (b.ring > cityRings || (b.type !== 'res' && b.type !== 'park' && b.type !== 'plaza')) continue; for (let i = 0; i < 10; i++) { const x = b.cx + (r() - 0.5) * 40, z = b.cz + (r() - 0.5) * 40; B.cyl.add(x, 0.3, z, 0.08, 0.7, 0.08, '#2e7d32'); B.sph.add(x, 1.05, z, 0.6, 0.45, 0.6, pick(r, ['#ff4fd8', '#ffd166', '#ff3b3b', '#ffffff', '#a78bff'])); } }
    addSign('navruz', 22, 10, 22, 22, Math.PI / 4, '#1b5e20', '#ffffff');
  }
}

// ======================= per-frame extras =======================
const bubbleV = new THREE.Vector3(); let bubbleT = -99, bubbleTxt = '';
const SAY_CAT = { home: 'home', walkHome: 'walk', walkCity: 'walk', jog: 'sport', fitness: 'sport', sports: 'sport', pool: 'sport', cafe: 'food', restaurant: 'food', mall: 'food', billiard: 'fun', park: 'fun' };
function updateExtras(t, dt) {
  for (const f of anims) f(t, dt);
  if (snow) { const p = snow.geometry.attributes.position.array, tg = controls.target; for (let i = 0; i < p.length; i += 3) { p[i + 1] -= dt * (4 + (i % 7)); p[i] += Math.sin(t + i) * dt * 0.6; if (p[i + 1] < 0) p[i + 1] += 120;
      if (p[i] - tg.x > 150) p[i] -= 300; else if (p[i] - tg.x < -150) p[i] += 300; if (p[i + 2] - tg.z > 150) p[i + 2] -= 300; else if (p[i + 2] - tg.z < -150) p[i + 2] += 300; } snow.geometry.attributes.position.needsUpdate = true; }
  const bub = $('#bubble'); if (!bub) return;
  if (selected && camera.position.distanceTo(controls.target) < 90 && !tour) {
    if (t - bubbleT > 7 || bubbleT < 0) { bubbleT = t; const says = T('says'), pool = [...(says[SAY_CAT[selected.act]] || says.walk), ...says.all]; bubbleTxt = pool[Math.floor(Math.random() * pool.length)].replace('{o}', OWNER); bub.textContent = bubbleTxt; }
    const [x, z] = robotPos(selected, t); bubbleV.set(x, 4.1 * selected.traits.u + 0.6, z).project(camera);
    if (bubbleV.z < 1) { bub.style.left = ((bubbleV.x + 1) / 2 * innerWidth) + 'px'; bub.style.top = ((1 - bubbleV.y) / 2 * innerHeight) + 'px'; bub.classList.add('on'); } else bub.classList.remove('on');
  } else { bub.classList.remove('on'); if (!selected) bubbleT = -99; }
}

// ======================= ambient sound (generated, no files) =======================
const SND = { ctx: null, on: false, master: null, dest: null };
function soundStart() {
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  if (!SND.ctx) { const ctx = new C(); SND.ctx = ctx; const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination); SND.master = master; try { SND.dest = ctx.createMediaStreamDestination(); master.connect(SND.dest); } catch (e) {}
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; const g = ctx.createGain(); g.gain.value = 0.12; src.connect(lp).connect(g).connect(master); src.start();
    startMusic(ctx, master);
    setInterval(() => { if (!SND.on) return; const s = ctx.createBufferSource(); s.buffer = buf; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500 + Math.random() * 600; bp.Q.value = 0.8; const gg = ctx.createGain(), now = ctx.currentTime;
      gg.gain.setValueAtTime(0, now); gg.gain.linearRampToValueAtTime(0.1, now + 1.1); gg.gain.linearRampToValueAtTime(0, now + 2.6); s.connect(bp).connect(gg).connect(master); s.start(now, Math.random() * 1.2, 3); }, 3200); }
  SND.ctx.resume(); SND.on = true; SND.master.gain.cancelScheduledValues(SND.ctx.currentTime); SND.master.gain.linearRampToValueAtTime(0.55, SND.ctx.currentTime + 1.2);
}
function soundStop() { if (!SND.ctx) return; SND.on = false; SND.master.gain.cancelScheduledValues(SND.ctx.currentTime); SND.master.gain.linearRampToValueAtTime(0, SND.ctx.currentTime + 0.4); }

function startMusic(ctx, master) {
  // quiet lo-fi chord loop: Dm9 – G13 – Cmaj9 – Am9, soft pad + bass + plucked arpeggio with echo
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const CH = [[38, [53, 57, 60, 64]], [43, [53, 59, 64, 65]], [36, [52, 55, 59, 62]], [45, [55, 60, 64, 67]]];
  const bus = ctx.createGain(); bus.gain.value = 1.0; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; bus.connect(lp).connect(master);
  const dl = ctx.createDelay(1); dl.delayTime.value = 0.375; const fb = ctx.createGain(); fb.gain.value = 0.32; const wet = ctx.createGain(); wet.gain.value = 0.35; dl.connect(fb).connect(dl); dl.connect(wet).connect(bus);
  const note = (m, t, dur, type, vol, toEcho) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = mtof(m); const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    if (type === 'sine' && dur < 1) { g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); } else { g.gain.linearRampToValueAtTime(vol, t + 0.9); g.gain.setValueAtTime(vol, t + dur - 0.8); g.gain.linearRampToValueAtTime(0, t + dur + 0.6); }
    o.connect(g).connect(bus); if (toEcho) g.connect(dl); o.start(t); o.stop(t + dur + 0.8); };
  const BAR = 4.8, STEP = BAR / 8; let next = ctx.currentTime + 0.2, step = 0;
  const ARP = [0, 1, 2, 3, 2, 1, 3, 0];
  setInterval(() => { if (!SND.on) { next = ctx.currentTime + 0.2; return; }
    while (next < ctx.currentTime + 0.6) { const ci = Math.floor(step / 8) % CH.length, [bass, tones] = CH[ci], s = step % 8;
      if (s === 0) { for (const m of tones) note(m, next, BAR, 'triangle', 0.035, false); note(bass, next, BAR * 0.9, 'sine', 0.09, false); }
      if (Math.random() < 0.7) note(tones[ARP[s]] + 12, next, 0.55, 'sine', 0.045, true);
      next += STEP; step++; } }, 100);
}

// ======================= Reel recorder (admin) =======================
async function recordReel(secs = 15, custom = null) {
  if (recording) return; const mime = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9', 'video/webm'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  if (!mime || !canvas.captureStream) return toast(T('recNo'));
  const W = 720, H = 1280, oldPR = renderer.getPixelRatio(); recording = true;
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); if (composer) composer.setSize(W, H);
  const stream = canvas.captureStream(30); if (SND.on && SND.dest) for (const tr of SND.dest.stream.getAudioTracks()) stream.addTrack(tr);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 }), chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data); const done = new Promise((r) => (rec.onstop = r));
  const badge = $('#recbadge'); badge.classList.add('on'); if (custom) custom.start(); else startTour(); rec.start(500);
  for (let s = secs; s > 0; s--) { badge.textContent = `● ${T('recording')} ${s}s`; await new Promise((r) => setTimeout(r, 1000)); }
  rec.stop(); await done; recording = false; if (custom) custom.stop(); else stopTour(); badge.classList.remove('on');
  renderer.setPixelRatio(oldPR); dispatchEvent(new Event('resize'));
  const ext = mime.includes('mp4') ? 'mp4' : 'webm', blob = new Blob(chunks, { type: 'video/' + ext }), url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `ai-shahar-reel-${new Date().toISOString().slice(0, 10)}.${ext}`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); toast(T('recDone'));
}

// ======================= extras UI: goal bar, ticker, VIP, sound, Reel, live updates =======================
function initExtrasUI() {
  $('#goal').onclick = () => { const k = $('#goal').dataset.k; if (k) flyToGoal(k); };
  const vb = $('#btnVip'); if (VIP.size) { vb.style.display = ''; vb.onclick = () => { selected = null; cardState = { kind: 'vip' }; renderCard(); }; }
  const rb = $('#btnRec'); if (window.MediaRecorder && canvas.captureStream) { rb.style.display = ''; rb.onclick = () => recordReel(15); }
  const sbtn = $('#btnSound'), setS = () => (sbtn.textContent = SND.on ? '🔊' : '🔇');
  sbtn.onclick = () => { if (SND.on) { soundStop(); store.set('aishahar_sound', '0'); } else { soundStart(); store.set('aishahar_sound', '1'); } setS(); };
  if (store.get('aishahar_sound') === '1') addEventListener('pointerdown', function once() { removeEventListener('pointerdown', once); if (!SND.on) { soundStart(); setS(); } }, { once: true });
  setS();
  // ticker of newest residents
  let ti = 0; const tk = $('#ticker'); const tick = () => { if (!recent.length) return; const n = recent[ti++ % Math.min(recent.length, 12)]; tk.innerHTML = `🆕 <b>@${esc(n)}</b> ${T('moved')}`; tk.classList.remove('in'); void tk.offsetWidth; tk.classList.add('in'); };
  tick(); setInterval(tick, 4500);
  tk.onclick = () => { const n = recent[(ti - 1) % Math.min(recent.length, 12)]; if (n && index.has(n)) select(specs[index.get(n)]); };

}

// ======================= donations: palace beams, fireworks, live upgrades =======================
const palaceBeams = [];
function addPalaceBeam(x, z) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.8, 260, 14, 1, true).translate(0, 130, 0), new THREE.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); m.position.set(x, 0, z); scene.add(m); palaceBeams.push(m); }
const FW_N = 900, fwPos = new Float32Array(FW_N * 3), fwCol = new Float32Array(FW_N * 3), fwVel = new Float32Array(FW_N * 3), fwLife = new Float32Array(FW_N);
const fwGeo = new THREE.BufferGeometry(); fwGeo.setAttribute('position', new THREE.BufferAttribute(fwPos, 3)); fwGeo.setAttribute('color', new THREE.BufferAttribute(fwCol, 3));
const fireworks = new THREE.Points(fwGeo, new THREE.PointsMaterial({ size: 1.1, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); fireworks.frustumCulled = false; scene.add(fireworks);
for (let i = 0; i < FW_N; i++) fwPos[i * 3 + 1] = -999;
let fwNext = 0, fwI = 0; const FWC = new THREE.Color();
function updateDonations(t, dt) {
  for (const b of palaceBeams) b.material.opacity = (0.1 + Math.sin(t * 2 + b.position.x) * 0.05) * (1.2 - themeK * 0.7);
  if (palaceBeams.length && t > fwNext) { fwNext = t + 1.6 + Math.random() * 2; const b = palaceBeams[Math.floor(Math.random() * palaceBeams.length)], cx = b.position.x + (Math.random() - 0.5) * 10, cz = b.position.z + (Math.random() - 0.5) * 10, cy = 28 + Math.random() * 18;
    FWC.setHSL(Math.random(), 1, 0.6); for (let k = 0; k < 110; k++) { const i = fwI++ % FW_N, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), sp = 9 + Math.random() * 5;
      fwPos[i * 3] = cx; fwPos[i * 3 + 1] = cy; fwPos[i * 3 + 2] = cz; fwVel[i * 3] = Math.sin(ph) * Math.cos(th) * sp; fwVel[i * 3 + 1] = Math.cos(ph) * sp; fwVel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp; fwLife[i] = 1.6; fwCol[i * 3] = FWC.r; fwCol[i * 3 + 1] = FWC.g; fwCol[i * 3 + 2] = FWC.b; } }
  for (let i = 0; i < FW_N; i++) { if (fwLife[i] <= 0) continue; fwLife[i] -= dt; const k = Math.max(0, fwLife[i] / 1.6); fwVel[i * 3 + 1] -= 9 * dt; fwPos[i * 3] += fwVel[i * 3] * dt; fwPos[i * 3 + 1] += fwVel[i * 3 + 1] * dt; fwPos[i * 3 + 2] += fwVel[i * 3 + 2] * dt; fwCol[i * 3] *= 0.985; fwCol[i * 3 + 1] *= 0.985; fwCol[i * 3 + 2] *= 0.985; if (k <= 0) fwPos[i * 3 + 1] = -999; }
  fwGeo.attributes.position.needsUpdate = true; fwGeo.attributes.color.needsUpdate = true;
}
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
function rebuildHouse(i) { // swap a resident's house in place (used when a donation arrives)
  for (const [b, idx] of houseParts[i] || []) { if (b.col) remColl(b.col[idx]); b.mesh.setMatrixAt(idx, ZERO); b.mesh.instanceMatrix.needsUpdate = true; }
  addHouse(i, specs[i].name); for (const b of Object.values(B)) b.done();
}
function initDonations() {
  const chip = $('#btnSponsors'); const showChip = () => { if (UPG_ROWS.length) { chip.style.display = ''; chip.onclick = () => { selected = null; cardState = { kind: 'sponsors' }; renderCard(); }; } }; showChip();
  if (!shared.on) return; let last = UPG_ROWS.length ? UPG_ROWS[UPG_ROWS.length - 1].created_at : new Date(Date.now() - 60000).toISOString();
  setInterval(async () => { if (document.hidden) return; try { const c = await sb(); if (!c) return; const { data } = await c.from('upgrades').select('nickname,tier,stars,created_at').gt('created_at', last).order('created_at', { ascending: true }).limit(50);
    for (const r of data || []) { last = r.created_at; UPG_ROWS.push(r); const n = clean(r.nickname), old = UPG.get(n) || 0; if (r.tier > old) { UPG.set(n, r.tier); if (index.has(n)) { rebuildHouse(index.get(n)); labelAssignT = -9; } toast(T('upgradedLive').replace('{n}', n).replace('{t}', T('tierNames')[r.tier]), 6000); } }
    showChip(); drawMapStatic(); } catch (e) {} }, 20000);
}

// ======================= drive your own robot (joystick / WASD) =======================
let drive = null; const JOY = { x: 0, y: 0 }; const DF = new THREE.Vector3(), DR = new THREE.Vector3(), DM = new THREE.Vector3();
function buildRobotGroup(t) {
  const g = new THREE.Group(), pivots = [], geos = {};
  robotParts(t, (k, x, y, z, sx, sy, sz, c, piv, swing, ry, rz) => {
    const [gF, mF] = RKINDS[k]; geos[k] ||= gF(); const mat = mF(); if (mat.color) mat.color.set(c);
    const mesh = new THREE.Mesh(geos[k], mat); mesh.scale.set(sx, sy, sz); mesh.rotation.set(0, ry, rz); mesh.castShadow = SHADOWS;
    if (swing) { const pv = new THREE.Group(); pv.position.set(0, piv, 0); mesh.position.set(x, y - piv, z); pv.add(mesh); g.add(pv); pivots.push([pv, swing]); } else { mesh.position.set(x, y, z); g.add(mesh); }
  });
  return { g, pivots };
}
function setRobotHidden(sp, hidden) { for (const [k, i, m] of sp.parts || []) { RP[k].setMatrixAt(i, hidden ? ZERO : m); RP[k].instanceMatrix.needsUpdate = true; } }
let sceneColl = false; const CB3 = new THREE.Box3();
function collectSceneColliders() { if (sceneColl) return; sceneColl = true; scene.updateMatrixWorld(true);
  const walk = (o) => { if (o.userData.noColl) return; if (o.isMesh && !o.isInstancedMesh && o.material && !o.material.isMeshBasicMaterial && !o.material.transparent) { CB3.setFromObject(o);
      if (isFinite(CB3.min.x) && CB3.min.y < 1.5 && CB3.max.y > 0.55 && CB3.max.x - CB3.min.x < 140 && CB3.max.z - CB3.min.z < 140 && (CB3.max.x - CB3.min.x > 0.12) && (CB3.max.z - CB3.min.z > 0.12)) addColl({ x0: CB3.min.x, x1: CB3.max.x, z0: CB3.min.z, z1: CB3.max.z }); }
    for (const ch of o.children) walk(ch); };
  for (const ch of scene.children) walk(ch); }
const RR = 0.42; // robot radius
function hitCar(x, z) { for (const c of cars) { const dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz > 64) continue; const [W, , L] = c.m.b; const along = c.ax ? Math.abs(dz) : Math.abs(dx), across = c.ax ? Math.abs(dx) : Math.abs(dz);
    if (along < L / 2 + RR && across < W / 2 + RR) return true; } return false; }
const blocked = (x, z) => hitStatic(x, z, RR) || (!(drive && drive.turbo) && hitCar(x, z));
function startDrive(sp) {
  if (GAME.me !== sp.name) { toast(T('driveOwn'), 6000); return; }
  if (drive) stopDrive(); stopTour();
  collectSceneColliders(); const [x, z] = robotPos(sp, UTIME.value), { g, pivots } = buildRobotGroup(sp.traits); g.position.set(x, 0, z); scene.add(g);
  setRobotHidden(sp, true); drive = { sp, g, pivots, x, z, yaw: 0, phase: 0, speed: 0 }; sp.drv = drive;
  controls.enablePan = false; controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE; controls.touches.ONE = THREE.TOUCH.ROTATE; controls.minDistance = 4; controls.rotateSpeed = MOBILE ? 0.9 : 0.7;
  selected = sp; follow = true; lastSel = null; labelAssignT = -9; $('#card').classList.remove('on'); document.body.classList.remove('cardopen'); document.body.classList.add('driving');
  $('#driveHint').textContent = '🎮 @' + sp.name + ' · ' + T('driveHint'); $('#driveExit').textContent = '✕ ' + T('driveExit');
  const tg = new THREE.Vector3(x, 2, z); flyTo(new THREE.Vector3(x + 9, 8, z + 11), tg, 1.0);
}
function stopDrive() {
  if (!drive) return; const sp = drive.sp; scene.remove(drive.g); drive.g.traverse((o) => o.material && o.material.dispose());
  sp.drv = null; setRobotHidden(sp, false); drive = null;
  controls.enablePan = true; controls.mouseButtons.LEFT = THREE.MOUSE.PAN; controls.touches.ONE = THREE.TOUCH.PAN; controls.minDistance = 6; controls.rotateSpeed = 0.6; JOY.x = JOY.y = 0; document.body.classList.remove('driving'); follow = false; labelAssignT = -9;
}
function updateDrive(dt) {
  if (!drive) return; let ix = JOY.x, iy = JOY.y;
  if (KEYS.has('KeyW') || KEYS.has('ArrowUp')) iy -= 1; if (KEYS.has('KeyS') || KEYS.has('ArrowDown')) iy += 1; if (KEYS.has('KeyA') || KEYS.has('ArrowLeft')) ix -= 1; if (KEYS.has('KeyD') || KEYS.has('ArrowRight')) ix += 1;
  const mag = Math.min(1, Math.hypot(ix, iy)); camera.getWorldDirection(DF); DF.y = 0; DF.normalize(); DR.crossVectors(DF, YAX).normalize();
  DM.set(0, 0, 0).addScaledVector(DF, -iy).addScaledVector(DR, ix); const target = drive.freeze && performance.now() < drive.freeze ? 0 : mag > 0.08 ? 7.5 * mag * (drive.turbo || 1) : 0; drive.speed += (target - drive.speed) * Math.min(1, dt * 6);
  if (DM.lengthSq() > 0.001 && mag > 0.08) { DM.normalize(); const want = Math.atan2(DM.x, DM.z); let d = want - drive.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); drive.yaw += d * Math.min(1, dt * 10);
    const lim = HWY + 400, nx = THREE.MathUtils.clamp(drive.x + DM.x * drive.speed * dt, -lim, lim), nz = THREE.MathUtils.clamp(drive.z + DM.z * drive.speed * dt, -lim, lim);
    const stuck = blocked(drive.x, drive.z); // already inside something (e.g. start spot) → let it walk out
    if (stuck || !blocked(nx, nz)) { drive.x = nx; drive.z = nz; } else if (!blocked(nx, drive.z)) drive.x = nx; else if (!blocked(drive.x, nz)) drive.z = nz; else drive.speed *= 0.3; }
  drive.phase += drive.speed * dt * 2.4 / Math.max(0.9, drive.sp.traits.u); const amp = Math.min(1, drive.speed / 3);
  for (const [pv, sw] of drive.pivots) pv.rotation.x = Math.sin(drive.phase) * sw * (0.4 + amp * 0.8) * (drive.speed > 0.2 ? 1 : 0);
  drive.g.position.set(drive.x, Math.abs(Math.cos(drive.phase)) * 0.05 * amp, drive.z); drive.g.rotation.y = drive.yaw;
  if (!fly) { const dx = drive.x - controls.target.x, dz = drive.z - controls.target.z; controls.target.x += dx; controls.target.z += dz; controls.target.y += (2 - controls.target.y) * Math.min(1, dt * 4); camera.position.x += dx; camera.position.z += dz; }
  follow = false;
}
function initDriveUI() {
  const joy = $('#joy'), knob = $('#joyk'); let jid = null, jc = null;
  const moveJ = (e) => { const R = 46; let dx = e.clientX - jc[0], dy = e.clientY - jc[1]; const L = Math.hypot(dx, dy); if (L > R) { dx *= R / L; dy *= R / L; } JOY.x = dx / R; JOY.y = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; };
  joy.addEventListener('pointerdown', (e) => { jid = e.pointerId; joy.setPointerCapture(jid); const r = joy.getBoundingClientRect(); jc = [r.left + r.width / 2, r.top + r.height / 2]; moveJ(e); e.preventDefault(); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === jid) moveJ(e); });
  const endJ = (e) => { if (e.pointerId !== jid) return; jid = null; JOY.x = JOY.y = 0; knob.style.transform = ''; }; joy.addEventListener('pointerup', endJ); joy.addEventListener('pointercancel', endJ);
  $('#driveExit').onclick = () => { const sp = drive && drive.sp; stopDrive(); if (sp) select(sp); };
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && drive) stopDrive(); });
}

// ======================= online counter + city chat =======================
const CHAT = { open: false, unread: 0, ready: false, seen: new Set(), myId: (() => { let v = store.get('aishahar_uid'); if (!v) { v = Math.random().toString(36).slice(2, 10); store.set('aishahar_uid', v); } return v; })() };
const chatBubbles = [];
function chatNick() { let n = clean(store.get('aishahar_chat_nick') || ''); if (!n) { n = 'mehmon_' + String(Math.floor(1000 + Math.random() * 9000)); } return n; }
function fmtTime(iso) { try { const d = new Date(iso); return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: CFG.timezone }); } catch (e) { return ''; } }
function addMsg(m, live) {
  if (!m || CHAT.seen.has(m.id)) return; CHAT.seen.add(m.id); const list = $('#chatList'); const empty = list.querySelector('.empty'); if (empty) empty.remove();
  const el = document.createElement('div'); el.className = 'msg' + (m.nick === OWNER ? ' own' : '') + (m.nick === clean(store.get('aishahar_chat_nick') || '') ? ' me' : '');
  const resident = index.has(m.nick) || m.nick === OWNER;
  el.dataset.id = m.id; el.innerHTML = `<span class="who${resident ? ' res' : ''}" data-n="${esc(m.nick)}">@${esc(m.nick)}${m.verified ? ' ✔️' : ''}</span> <span class="tx"></span> <i>${fmtTime(m.created_at)}</i>${store.get('aishahar_admin_pw') && m.nick !== OWNER ? `<span class="mod"><button data-del="${m.id}">🗑</button><button data-ban="${esc(m.nick)}">🚫</button></span>` : ''}`; el.querySelector('.tx').textContent = m.text;
  list.appendChild(el); while (list.children.length > 120) list.firstChild.remove(); list.scrollTop = list.scrollHeight;
  if (live) { if (!CHAT.open) { CHAT.unread++; updChatBtn(); } if (index.has(m.nick)) showChatBubble(specs[index.get(m.nick)], m.text); }
}
function showChatBubble(sp, text) {
  const el = document.createElement('div'); el.className = 'cbub'; el.textContent = text.length > 70 ? text.slice(0, 68) + '…' : text; document.body.appendChild(el);
  chatBubbles.push({ sp, el, until: performance.now() + 7000 }); while (chatBubbles.length > 4) { const b = chatBubbles.shift(); b.el.remove(); }
}
const CBV = new THREE.Vector3();
function updateChatBubbles(t) {
  const now = performance.now();
  for (let i = chatBubbles.length - 1; i >= 0; i--) { const b = chatBubbles[i]; if (now > b.until) { b.el.remove(); chatBubbles.splice(i, 1); continue; }
    const [x, z] = robotPos(b.sp, t); CBV.set(x, 4.6 * b.sp.traits.u + 1.2, z).project(camera); const vis = CBV.z < 1 && Math.abs(CBV.x) < 1.1 && Math.abs(CBV.y) < 1.1;
    b.el.style.display = vis ? '' : 'none'; if (vis) { b.el.style.left = ((CBV.x + 1) / 2 * innerWidth) + 'px'; b.el.style.top = ((1 - CBV.y) / 2 * innerHeight) + 'px'; } }
}
function updChatBtn() { const n = CHAT.online || 1; $('#onlN').textContent = n; $('#onlN2').textContent = n; const u = $('#chatUnread'); u.textContent = CHAT.unread; u.style.display = CHAT.unread ? '' : 'none'; }
async function sendChat(e) {
  e.preventDefault(); const inp = $('#chatInput'), text = inp.value.trim(); if (!text) return;
  let nick = clean($('#chatNick').value || ''); if (!nick || (!index.has(nick) && nick !== OWNER)) { nick = clean(store.get('aishahar_guest') || '') || chatNick(); if (!/^mehmon_\d{4}$/.test(nick)) nick = chatNick(); store.set('aishahar_guest', nick); $('#chatNick').value = nick; }
  store.set('aishahar_chat_nick', nick); let admin;
  if (nick === OWNER) { const pw = $('#chatPw'); admin = (pw.value || store.get('aishahar_admin_pw') || '').trim(); if (!admin) { document.body.classList.add('needpw'); pw.focus(); toast('🔑 ' + T('chatAdmin')); return; } store.set('aishahar_admin_pw', admin); }
  $('#chatSendBtn').disabled = true;
  try { const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nick, text, admin }) }); const j = await r.json().catch(() => ({}));
    if (r.ok) { inp.value = ''; document.body.classList.remove('needpw'); if (window.__qBump) window.__qBump('chat'); } else { if (j.error === 'owner') { store.set('aishahar_admin_pw', ''); $('#chatPw').value = ''; document.body.classList.add('needpw'); toast('🔑 ' + T('chatPwWrong')); } else toast(j.error === 'banned' ? T('banned') : j.error === 'slow' ? T('chatSlow') : j.error === 'limit' ? T('chatLimit') : j.error === 'nick' ? T('chatNickBad') : T('chatErr') + (j.detail ? ': ' + j.detail : '')); } }
  catch (err) { toast(T('chatErr')); } finally { $('#chatSendBtn').disabled = false; inp.focus(); }
}
function setChatOpen(v) { CHAT.open = v; document.body.classList.toggle('chatopen', v); if (v) { CHAT.unread = 0; updChatBtn(); const l = $('#chatList'); l.scrollTop = l.scrollHeight; } }
async function initChat() {
  $('#chatBtn').onclick = () => setChatOpen(!CHAT.open); $('#chatClose').onclick = () => setChatOpen(false); $('#chatForm').addEventListener('submit', sendChat);
  $('#chatNick').value = store.get('aishahar_chat_nick') || ''; const pwToggle = () => document.body.classList.toggle('needpw', clean($('#chatNick').value) === OWNER && !store.get('aishahar_admin_pw')); $('#chatNick').addEventListener('input', pwToggle); pwToggle(); $('#chatPw').placeholder = '🔑 ' + T('chatAdmin'); $('#chatList').innerHTML = `<div class="empty">${T('chatEmpty')}</div>`; updChatBtn();
  const c = await sb(); if (!c) { $('#chatList').innerHTML = `<div class="empty">${T('chatSoon')}</div>`; return; }
  // who is online right now (Supabase Realtime presence — no database needed)
  try { const ch = c.channel('city-online', { config: { presence: { key: CHAT.myId } } });
    ch.on('presence', { event: 'sync' }, () => { CHAT.online = Object.keys(ch.presenceState()).length; updChatBtn(); });
    ch.subscribe(async (st) => { if (st === 'SUBSCRIBED') await ch.track({ at: Date.now() }); }); } catch (e) {}
  // chat history + live messages
  try { const { data, error } = await c.from('chat').select('id,nick,text,verified,created_at').order('id', { ascending: false }).limit(60); if (error) throw error;
    CHAT.ready = true; (data || []).reverse().forEach((m) => addMsg(m, false));
    c.channel('chat-live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat' }, (p) => addMsg(p.new, true)).on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat' }, (p) => { const id = p.old && p.old.id; const el = id && $(`#chatList .msg[data-id="${id}"]`); if (el) el.remove(); }).subscribe();
    setInterval(async () => { if (document.hidden) return; const last = Math.max(0, ...CHAT.seen); const { data } = await c.from('chat').select('id,nick,text,verified,created_at').gt('id', last).order('id', { ascending: true }).limit(30); (data || []).forEach((m) => addMsg(m, true)); }, 15000);
  } catch (e) { $('#chatList').innerHTML = `<div class="empty">${T('chatSoon')}</div>`; $('#chatSendBtn').disabled = true; }
  $('#chatList').addEventListener('click', async (e) => { const d = e.target.closest('[data-del]'), bn = e.target.closest('[data-ban]');
    if (d) { const r = await adminChat('delete', { id: Number(d.dataset.del) }); if (r.ok) { d.closest('.msg').remove(); toast(T('delAsk')); } return; }
    if (bn) { const n = bn.dataset.ban; const r = await adminChat('ban', { nick: n }); if (r.ok) { document.querySelectorAll(`#chatList .msg .who[data-n="${n}"]`).forEach((w) => w.closest('.msg').remove()); toast(T('banAsk') + ': @' + n); } return; } });
  $('#chatList').addEventListener('click', (e) => { const w = e.target.closest('.who'); if (w && index.has(w.dataset.n)) { setChatOpen(innerWidth > 700); select(specs[index.get(w.dataset.n)]); } });
}

// ======================= game: daily crystals, streaks, shop, pets, house likes, onboarding =======================
const GAME_SHOP = { cap_red: { price: 15, kind: 'hat' }, cap_blue: { price: 15, kind: 'hat' }, cap_gold: { price: 30, kind: 'hat' }, shades: { price: 20, kind: 'glasses' }, neon_phones: { price: 25, kind: 'phones' }, cape: { price: 40, kind: 'cape' }, halo: { price: 80, kind: 'halo' }, dog: { price: 60, kind: 'pet' }, cat: { price: 60, kind: 'pet' } };
const PLAYERS = new Map(), LIKES = new Map();
const GAME = { me: clean(store.get('aishahar_me') || ''), player: null, board: {}, liked: new Set(), busy: false };
const tkDay = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
function isoWeek(d = new Date()) { const t = new Date(tkDay(d) + 'T00:00:00Z'); const dn = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - dn + 3); const y = t.getUTCFullYear(); const w1 = new Date(Date.UTC(y, 0, 4)); return y + '-W' + String(1 + Math.round(((t - w1) / 864e5 - 3 + ((w1.getUTCDay() + 6) % 7)) / 7)).padStart(2, '0'); }
try { const L = JSON.parse(store.get('aishahar_liked') || '{}'); if (L.w === isoWeek()) for (const n of L.n || []) GAME.liked.add(n); } catch (e) {}
async function loadPlayers() { if (!shared.on) return; try { for (const r of await fetchAll('players', 'nick,crystals,streak,equipped')) PLAYERS.set(clean(r.nick), r); } catch (e) {} }
async function loadLikes() { if (!shared.on) return; try { const c = await sb(); const { data } = await c.from('house_likes_week').select('target,likes').eq('week', isoWeek()); for (const r of data || []) LIKES.set(clean(r.target), r.likes); } catch (e) {} }
async function loadBoard(tab) { try { const c = await sb(); if (tab === 'r') { const { data } = await c.from('players').select('nick,race_best').eq('race_week', isoWeek()).not('race_best', 'is', null).order('race_best', { ascending: true }).limit(15); GAME.board.r = data || []; if (cardState && cardState.kind === 'board') renderCard(); return; } const col = tab === 'c' ? 'crystals' : 'streak'; const { data } = await c.from('players').select('nick,crystals,streak').order(col, { ascending: false }).limit(15); GAME.board[tab] = data || []; if (cardState && cardState.kind === 'board') renderCard(); } catch (e) {} }
async function api(body) { const r = await fetch('/api/game', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ uid: CHAT.myId, ...body }) }); const j = await r.json().catch(() => ({})); return { ok: r.ok && j.ok, ...j }; }
function setPlayer(p) { GAME.player = p; PLAYERS.set(p.nick, { ...(PLAYERS.get(p.nick) || {}), crystals: p.crystals, streak: p.streak, equipped: p.equipped }); for (const c of CRYSTALS) c.got = !!(p.col_mask & (1 << c.id)); updHud(); }
function updHud() { const el = $('#gameHud'); if (!el) return; if (!GAME.me || !GAME.player) { el.style.display = 'none'; return; } const left = CRYSTALS.filter((c) => !c.got).length;
  el.style.display = ''; el.innerHTML = `🙋 <b>@${esc(GAME.me)}</b> · 💎 <b>${GAME.player.crystals}</b> · 🔥 <b>${GAME.player.streak || 0}</b> <span class="cl">· ${T('today')}: ${left} ${T('left')}</span>`; }
async function claimMe(nick) { const r = await api({ action: 'hello', nick }); if (!r.ok) { if (r.error === 'taken') { cardState = { kind: 'recover', nick }; renderCard(); return; } return toast(T('chatErr')); }
  if (r.recovery) { store.set('aishahar_rec_' + nick, r.recovery); setTimeout(() => { cardState = { kind: 'recovery', code: r.recovery }; renderCard(); }, 400); }
  GAME.me = nick; store.set('aishahar_me', nick); setPlayer(r.player); if (!store.get('aishahar_chat_nick')) store.set('aishahar_chat_nick', nick); toast(T('meSet').replace('{n}', nick), 6000);
  if (r.bonus) setTimeout(() => toast(T('bonus').replace('{s}', r.player.streak).replace('{b}', r.bonus), 6000), 6200); renderCard(); }
async function shopAction(a, item, kind) { if (GAME.busy || !GAME.me) return; GAME.busy = true; const r = await api({ action: a === 'unequip' ? 'equip' : a, nick: GAME.me, item: a === 'unequip' ? '' : item, kind }); GAME.busy = false;
  if (!r.ok) return toast(r.error === 'poor' ? T('poor') : T('chatErr')); setPlayer(r.player); if (index.has(GAME.me)) reRobot(specs[index.get(GAME.me)]); renderCard(); }
async function likeHouse(n, btn) { if (GAME.liked.has(n)) return toast(T('liked')); const r = await api({ action: 'like', target: n }); if (!r.ok) return toast(T('chatErr'));
  GAME.liked.add(n); store.set('aishahar_liked', JSON.stringify({ w: isoWeek(), n: [...GAME.liked] })); LIKES.set(n, r.likes); btn.textContent = '❤️ ' + r.likes; btn.classList.add('on'); toast(T('liked')); if (window.__qBump) window.__qBump('like'); }
function reRobot(sp) { const wasDriving = drive && drive.sp === sp; if (wasDriving) stopDrive(); setRobotHidden(sp, true); sp.parts = []; sp.traits = traits(sp.name); placeRobot(sp); refreshRobots(); syncPet(sp); labelAssignT = -9; if (wasDriving) startDrive(sp); }
async function doRecover(nick, code) { const r = await api({ action: 'recover', nick, code }); if (!r.ok) return toast(T('recBad'));
  store.set('aishahar_rec_' + nick, code.toUpperCase()); GAME.me = nick; store.set('aishahar_me', nick); setPlayer(r.player); toast(T('recOk')); if (index.has(nick)) select(specs[index.get(nick)]); }
async function loadAdmin() { const pw = store.get('aishahar_admin_pw'); try { const [st, bn] = await Promise.all([fetch('/api/hit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'stats', admin: pw }) }).then((r) => r.json()), adminChat('bans', {})]);
  if (!st.ok) { store.set('aishahar_admin_pw', ''); toast('🔑 ' + T('chatPwWrong')); } if (cardState && cardState.kind === 'admin') { cardState.stats = st.ok ? st : null; cardState.bans = (bn && bn.bans) || []; if (st.ok) renderCard(); else renderCard(); } } catch (e) {} }
async function adminChat(action, extra) { const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, admin: store.get('aishahar_admin_pw'), ...extra }) }); return r.json().catch(() => ({})); }
async function adminUnlink(nick) { if (!nick) return; const r = await api({ action: 'unlink', nick, admin: store.get('aishahar_admin_pw') }); toast(r.ok ? T('unlinked') : T('chatErr')); }
// ---- crystals: 20 per day, same spots for everybody (seeded by the Tashkent date) ----
const CRYSTALS = []; let crystalMesh = null, crystalBeams = null; const CQ = new THREE.Quaternion(), CE = new THREE.Euler();
function buildCrystals() {
  const r = rng(hash('crystals-' + tkDay())), blocks = blockInfo.filter((b) => b.ring >= 1 && b.ring <= cityRings), H2 = SLAB / 2 - 1.2;
  for (let id = 0; id < 20; id++) { const b = blocks[Math.floor(r() * blocks.length)], side = Math.floor(r() * 4), u = (r() - 0.5) * 2 * (H2 - 2);
    const [x, z] = side === 0 ? [b.cx + u, b.cz - H2] : side === 1 ? [b.cx + H2, b.cz + u] : side === 2 ? [b.cx + u, b.cz + H2] : [b.cx - H2, b.cz + u]; CRYSTALS.push({ id, x, z, big: id % 5 === 0, got: false, ph: r() * 6 }); }
  crystalMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.62, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 20);
  crystalBeams = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.6, 40, 8, 1, true).translate(0, 20, 0), new THREE.MeshBasicMaterial({ color: 0x7fe3ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 20);
  CRYSTALS.forEach((c, i) => crystalMesh.setColorAt(i, COL.set(c.big ? '#ff4fd8' : '#7fe3ff'))); crystalMesh.frustumCulled = crystalBeams.frustumCulled = false; scene.add(crystalMesh, crystalBeams);
}
let crystalHinted = false, collecting = new Set();
function updateGame(t, dt) {
  if (crystalMesh) { CRYSTALS.forEach((c, i) => { const s = c.got ? 0 : (c.big ? 1.5 : 1); CE.set(0, t * 1.6 + c.ph, 0); CQ.setFromEuler(CE); M.compose(P.set(c.x, 1.3 + Math.sin(t * 2.2 + c.ph) * 0.25, c.z), CQ, S.set(s, s * 1.4, s)); crystalMesh.setMatrixAt(i, M);
      M.compose(P.set(c.x, 0, c.z), Q.identity(), S.set(c.got ? 0 : 1, 1, c.got ? 0 : 1)); crystalBeams.setMatrixAt(i, M); }); crystalMesh.instanceMatrix.needsUpdate = crystalBeams.instanceMatrix.needsUpdate = true; }
  if (drive) { const mine = GAME.me && drive.sp.name === GAME.me && GAME.player;
    for (const c of CRYSTALS) { if (c.got || collecting.has(c.id)) continue; if ((c.x - drive.x) ** 2 + (c.z - drive.z) ** 2 > 2.6 * 2.6) continue;
      if (!mine) { if (!crystalHinted) { crystalHinted = true; toast(T('crystalHint'), 6000); } continue; }
      collecting.add(c.id); api({ action: 'collect', nick: GAME.me, id: c.id }).then((r) => { collecting.delete(c.id); if (r.ok && r.player) { setPlayer(r.player); if (!r.already) { toast(T('got').replace('{v}', r.value)); sparkle(c.x, c.z, c.big); } if (CRYSTALS.every((q) => q.got)) setTimeout(() => toast(T('allGot'), 6000), 1500); } }); } }
  for (const pet of PETS.values()) updatePet(pet, t, dt);
}
function sparkle(x, z, big) { FWC.set(big ? '#ff4fd8' : '#7fe3ff'); for (let k = 0; k < 60; k++) { const i = fwI++ % FW_N, th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1), sp = 3 + Math.random() * 3;
  fwPos[i * 3] = x; fwPos[i * 3 + 1] = 1.5; fwPos[i * 3 + 2] = z; fwVel[i * 3] = Math.sin(ph) * Math.cos(th) * sp; fwVel[i * 3 + 1] = Math.abs(Math.cos(ph)) * sp + 2; fwVel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp; fwLife[i] = 1.1; fwCol[i * 3] = FWC.r; fwCol[i * 3 + 1] = FWC.g; fwCol[i * 3 + 2] = FWC.b; } }
// ---- pets that follow their robot ----
const PETS = new Map();
function makePet(kind, color) {
  const g = new THREE.Group(); g.userData.noColl = true; const m = (c, met = 0.6) => matStd({ color: c, metalness: met, roughness: 0.35 }), body = m(color), dark = m('#2b2f35', 0.3), glowM = new THREE.MeshBasicMaterial({ color: 0x39ff88, toneMapped: false });
  const add = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = SHADOWS; g.add(o); return o; };
  const cat = kind === 'cat', s = cat ? 0.85 : 1;
  add(new THREE.BoxGeometry(0.55 * s, 0.42 * s, 0.95 * s), body, 0, 0.58 * s, 0); const head = add(new THREE.BoxGeometry(0.46 * s, 0.4 * s, 0.42 * s), body, 0, 0.92 * s, 0.55 * s);
  for (const sx of [-1, 1]) { add(new THREE.BoxGeometry(0.06, 0.06, 0.02), glowM, sx * 0.11 * s, 0.96 * s, 0.77 * s); if (cat) add(new THREE.ConeGeometry(0.09, 0.2, 4), body, sx * 0.14, 1.2 * s, 0.5 * s); else add(new THREE.BoxGeometry(0.1, 0.22, 0.08), dark, sx * 0.2, 1.12, 0.5); }
  const legs = []; for (const [lx, lz] of [[-0.18, 0.3], [0.18, 0.3], [-0.18, -0.3], [0.18, -0.3]]) legs.push(add(new THREE.BoxGeometry(0.12 * s, 0.4 * s, 0.12 * s).translate(0, -0.2 * s, 0), dark, lx * s, 0.42 * s, lz * s));
  const tail = add(new THREE.BoxGeometry(0.08, 0.08, cat ? 0.6 : 0.35).translate(0, 0, -0.2), body, 0, 0.75 * s, -0.5 * s); tail.rotation.x = cat ? -0.9 : -0.5;
  scene.add(g); return { g, legs, tail, head };
}
function syncPet(sp) { const want = ((sp.traits && sp.traits.eq) || {}).pet; const cur = PETS.get(sp.name);
  if (cur && cur.kind !== want) { scene.remove(cur.g); PETS.delete(sp.name); } if (want && (!cur || cur.kind !== want)) { const p = makePet(want === 'cat' ? 'cat' : 'dog', want === 'cat' ? '#f0a35e' : '#c9ced6'); const [x, z] = robotPos(sp, UTIME.value); p.g.position.set(x, 0, z); PETS.set(sp.name, { ...p, kind: want, sp, x, z, yaw: 0, ph: 0 }); } }
const PV2 = new THREE.Vector3();
function updatePet(p, t, dt) { const [x, z] = robotPos(p.sp, t), [x0, z0] = robotPos(p.sp, t - 0.25); let yaw = Math.atan2(x - x0, z - z0); if (Math.hypot(x - x0, z - z0) < 0.02) yaw = p.yaw;
  if (p.sp.drv) yaw = p.sp.drv.yaw; const tx = x - Math.sin(yaw) * 1.6 + Math.cos(yaw) * 0.9, tz = z - Math.cos(yaw) * 1.6 - Math.sin(yaw) * 0.9, d = Math.hypot(tx - p.x, tz - p.z);
  const k = Math.min(1, dt * 4); p.x += (tx - p.x) * k; p.z += (tz - p.z) * k; if (d > 0.05) p.yaw = Math.atan2(tx - p.x, tz - p.z) || p.yaw; p.ph += Math.min(d, 2) * dt * 14;
  p.g.position.set(p.x, Math.abs(Math.sin(p.ph)) * 0.05, p.z); p.g.rotation.y = p.yaw; p.legs.forEach((l, i) => (l.rotation.x = Math.sin(p.ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.6 * Math.min(1, d)));
  p.tail.rotation.y = Math.sin(t * 8) * 0.5; }
// ---- weekly prettiest house ----
function placeWeekTrophy() { let best = null, bv = 0; for (const [n, v] of LIKES) if (v > bv && index.has(n)) { best = n; bv = v; } if (!best || bv < 2) return;
  const h = houseIdx[index.get(best)], y = 14; B.cyl.add(h.x, y, h.z, 1.2, 1.6, 1.2, '#ffc400'); B.cyl.add(h.x, y - 1.2, h.z, 0.3, 1.2, 0.3, '#ffc400'); B.sph.add(h.x, y + 1.8, h.z, 1.6, 1.6, 1.6, '#ffc400'); glow(h.x, y + 3.2, h.z, 1.4, '#fff1a8', false); B.cyl.done(); B.sph.done(); B.glow.done(); GAME.weekTop = best; }
// ---- UI: hud, leaderboard chip, onboarding ----
function pingVisit() { const k = 'aishahar_hit_' + tkDay(); if (store.get(k)) return; store.set(k, '1');
  let ref = new URLSearchParams(location.search).get('ref') || ''; if (!ref) { try { ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : 'direct'; } catch (e) { ref = 'direct'; } } if (location.hash) ref = ref === 'direct' ? 'robot-link' : ref;
  fetch('/api/hit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ uid: CHAT.myId, ref, m: MOBILE }) }).catch(() => {}); }
async function initGame() {
  pingVisit();
  $('#btnBoard').onclick = () => { selected = null; cardState = { kind: 'board', tab: 'c' }; renderCard(); };
  $('#gameHud').onclick = () => { if (GAME.me) { cardState = { kind: 'shop' }; renderCard(); } };
  if (GAME.me && index.has(GAME.me)) { const r = await api({ action: 'hello', nick: GAME.me }); if (r.ok) { setPlayer(r.player); if (r.bonus) setTimeout(() => toast(T('bonus').replace('{s}', r.player.streak).replace('{b}', r.bonus), 6000), 5000); } else if (r.error === 'taken') { GAME.me = ''; store.set('aishahar_me', ''); } }
  updHud();
  if (!store.get('aishahar_onb') && !location.hash) setTimeout(showOnboarding, 4200);
}
function showOnboarding() { let step = 0; const o = $('#onb'); const draw = () => { const steps = T('onb');
    o.innerHTML = `<div class="ob"><h3>${T('onbTitle')}</h3><div class="dots">${steps.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div><p>${steps[step]}</p><div class="acts"><button data-o="skip">${T('skip')}</button><button class="pri" data-o="next">${step < steps.length - 1 ? T('next') : T('start')}</button></div></div>`; };
  draw(); o.classList.add('on'); o.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.o === 'next' && step < T('onb').length - 1) { step++; draw(); return; } o.classList.remove('on'); store.set('aishahar_onb', '1'); setTimeout(() => $('#q').focus(), 200); }; }

// ======================= minimap =======================
const mapC = $('#mapc'), mapG = mapC.getContext('2d'); let mapStatic = null;
const W2M = (x, z) => { const E = HWY + 20, s = mapC.width / (2 * E); return [(x + E) * s, (z + E) * s]; };
function drawMapStatic() {
  const c = document.createElement('canvas'); c.width = mapC.width; c.height = mapC.height; const g = c.getContext('2d');
  g.fillStyle = '#2c4a2c'; g.fillRect(0, 0, c.width, c.height);
  const [a0] = W2M(-HWY - 12, 0), [a1] = W2M(HWY + 12, 0); g.fillStyle = '#3a3f47'; g.fillRect(a0, a0, a1 - a0, a1 - a0);
  const [g0] = W2M(-HWY + 12, 0), [g1] = W2M(HWY - 12, 0); g.fillStyle = '#3b5a35'; g.fillRect(g0, g0, g1 - g0, g1 - g0);
  const [e0] = W2M(-cityExtent, 0), [e1] = W2M(cityExtent, 0); g.fillStyle = '#4a4f57'; g.fillRect(e0, e0, e1 - e0, e1 - e0);
  const col = { plaza: '#d8cfbd', down: '#5a6170', res: '#7aa85a', park: '#4f9a4a', stadium: '#3d9a46', pool: '#2fb7e6', cafe: '#c98b5b', restaurant: '#b5653f', fitness: '#e0a43a', billiard: '#a1458f', sports: '#c46b3b', mall: '#c9d3dd' };
  for (const b of blockInfo) { if (b.ring > cityRings) continue; const [x0, z0] = W2M(b.cx - SLAB / 2, b.cz - SLAB / 2), [x1, z1] = W2M(b.cx + SLAB / 2, b.cz + SLAB / 2); g.fillStyle = col[b.type] || '#7aa85a'; g.fillRect(x0, z0, x1 - x0, z1 - z0); }
  g.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < specs.length; i++) { const h = houseIdx[i]; const [x, z] = W2M(h.x, h.z); g.fillRect(x - 1.2, z - 1.2, 2.4, 2.4); }
  const icon = { stadium: '⚽', pool: '🏊', cafe: '☕', restaurant: '🍽', fitness: '🏋', billiard: '🎱', sports: '🏀', mall: '🛍', park: '🌳' };
  g.font = '14px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const b of blockInfo) if (icon[b.type] && b.ring <= cityRings) { const [x, z] = W2M(b.cx, b.cz); g.fillText(icon[b.type], x, z); }
  mapStatic = c;
}
let mapT = 0;
function drawMap(t) {
  if (!mapStatic || t - mapT < 0.25) return; mapT = t;
  mapG.drawImage(mapStatic, 0, 0);
  mapG.fillStyle = '#7fe3ff'; for (const c of CRYSTALS) if (!c.got) { const [mx, mz] = W2M(c.x, c.z); mapG.beginPath(); mapG.arc(mx, mz, 3.2, 0, 7); mapG.fill(); }
  mapG.fillStyle = '#39ff88'; for (const sp of specs) { const [x, z] = robotPos(sp, t); const [mx, mz] = W2M(x, z); mapG.fillRect(mx - 1.5, mz - 1.5, 3, 3); }
  if (selected) { const [x, z] = robotPos(selected, t); const [mx, mz] = W2M(x, z); mapG.fillStyle = '#ff4fd8'; mapG.beginPath(); mapG.arc(mx, mz, 6, 0, 7); mapG.fill(); }
  const [cx, cz] = W2M(controls.target.x, controls.target.z); const [px, pz] = W2M(camera.position.x, camera.position.z);
  mapG.strokeStyle = '#ffffff'; mapG.lineWidth = 2; mapG.beginPath(); mapG.moveTo(px, pz); mapG.lineTo(cx, cz); mapG.stroke(); mapG.beginPath(); mapG.arc(cx, cz, 5, 0, 7); mapG.stroke();
}
mapC.addEventListener('click', (e) => { const r = mapC.getBoundingClientRect(); const E = HWY + 20; const x = ((e.clientX - r.left) / r.width) * 2 * E - E, z = ((e.clientY - r.top) / r.height) * 2 * E - E; selected = null; labelAssignT = -9; const tg = new THREE.Vector3(x, 0, z); flyTo(tg.clone().add(new THREE.Vector3(40, 60, 70)), tg, 1.4); });
$('#mapBig').onclick = () => $('#map').classList.toggle('big');

// ======================= loop =======================
const clock = new THREE.Clock(); const prevSel = new THREE.Vector3(); let lastSel = null;
const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 300, 16, 1, true).translate(0, 150, 0), new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
const hring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.0, 40), new THREE.MeshBasicMaterial({ color: 0x39ff88, side: THREE.DoubleSide, transparent: true, toneMapped: false }));
hring.rotation.x = -Math.PI / 2; beam.visible = hring.visible = false; scene.add(beam, hring);
let composer = null;
if (!LITE) { composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); bvec4 n = isnan(c); bvec4 f = isinf(c); if (any(n) || any(f)) c = vec4(0.0, 0.0, 0.0, 1.0); gl_FragColor = clamp(c, 0.0, 32.0); }' }));
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.4, 0.85); composer.addPass(bloom); composer.addPass(new OutputPass()); }
const ownerGroup = new THREE.Group();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05); UTIME.value += dt; const t = UTIME.value;
  if (Math.abs(themeTarget - themeK) > 0.001) { themeK += Math.sign(themeTarget - themeK) * Math.min(Math.abs(themeTarget - themeK), dt / 1.4); applyTheme(themeK); }
  if (fly) { const k = Math.min(1, (performance.now() - fly.t0) / fly.dur), e = ease(k); camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.q0, fly.q1, e); if (k >= 1) fly = null; }
  if (selected) {
    const [x, z] = robotPos(selected, t); beam.visible = hring.visible = true; beam.position.set(x, 0, z); hring.position.set(x, 0.45, z);
    if (lastSel === selected && !tour && follow) { const dx = x - prevSel.x, dz = z - prevSel.z; camera.position.x += dx; camera.position.z += dz; controls.target.x += dx; controls.target.z += dz; if (fly) for (const v of [fly.p0, fly.p1, fly.q0, fly.q1]) { v.x += dx; v.z += dz; } }
    prevSel.set(x, 0, z); lastSel = selected;
  } else { lastSel = null; beam.visible = hring.visible = false; }
  if (tour) { const tt = (performance.now() - tour.t0) / 1000, a = tt * 0.08;
    const around = selected ? (() => { const [x, z] = robotPos(selected, t); return new THREE.Vector3(x, 2, z); })() : new THREE.Vector3(0, 10, 0);
    const r = selected ? 18 : cityExtent * 0.9, y = selected ? 8 + Math.sin(tt * 0.2) * 3 : 90 + Math.sin(tt * 0.15) * 40;
    camera.position.set(around.x + Math.cos(a) * r, y, around.z + Math.sin(a) * r); controls.target.copy(around); }
  moveKeys(dt); controls.update();
  if (SHADOWS) { sun.target.position.copy(controls.target); sun.position.copy(controls.target).addScaledVector(SUN_DIR, 400); const d = THREE.MathUtils.clamp(camera.position.distanceTo(controls.target) * 1.2, 60, 260); const c = sun.shadow.camera; if (Math.abs(c.right - d) > 5) { c.left = -d; c.right = d; c.top = d; c.bottom = -d; c.updateProjectionMatrix(); } }
  updateCars(t, dt); updateLights(t); updateLabels(t); drawMap(t); updateExtras(t, dt); updateDonations(t, dt); updateDrive(dt); updateChatBubbles(t); updateGame(t, dt); if (window.__v7u) window.__v7u(t, dt);
  ownerGroup.rotation.y = Math.sin(t * 0.2) * 0.5;
  if (beam.visible) { const cd = camera.position.distanceTo(controls.target); beam.material.opacity = (0.14 + Math.sin(t * 3) * 0.06) * THREE.MathUtils.clamp((cd - 25) / 60, 0, 1); const s = 1 + (t % 1.4) * 0.9; hring.scale.set(s, s, s); hring.material.opacity = 1 - (t % 1.4) / 1.4; }
  if (composer) composer.render(); else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); if (composer) composer.setSize(innerWidth, innerHeight); });

// free camera: user drag stops follow-cam; WASD / arrow keys move; stay inside the world
controls.addEventListener('start', () => { if (!drive) follow = false; fly = null; });
const KEYS = new Set();
addEventListener('keydown', (e) => { if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; const k = e.code; if (/^(Key[WASDQE]|Arrow(Up|Down|Left|Right))$/.test(k)) { KEYS.add(k); follow = false; fly = null; e.preventDefault(); } });
addEventListener('keyup', (e) => KEYS.delete(e.code)); addEventListener('blur', () => KEYS.clear());
const KV = new THREE.Vector3(), KF = new THREE.Vector3(), KR = new THREE.Vector3();
function moveKeys(dt) {
  if (KEYS.size && !tour && !drive) { const sp = Math.max(20, camera.position.distanceTo(controls.target) * 1.1) * dt; camera.getWorldDirection(KF); KF.y = 0; KF.normalize(); KR.crossVectors(KF, YAX).normalize(); KV.set(0, 0, 0);
    if (KEYS.has('KeyW') || KEYS.has('ArrowUp')) KV.add(KF); if (KEYS.has('KeyS') || KEYS.has('ArrowDown')) KV.sub(KF); if (KEYS.has('KeyD') || KEYS.has('ArrowRight')) KV.add(KR); if (KEYS.has('KeyA') || KEYS.has('ArrowLeft')) KV.sub(KR);
    if (KV.lengthSq()) { KV.normalize().multiplyScalar(sp); camera.position.add(KV); controls.target.add(KV); }
    const rot = (KEYS.has('KeyQ') ? 1 : 0) - (KEYS.has('KeyE') ? 1 : 0); if (rot) { const off = camera.position.clone().sub(controls.target).applyAxisAngle(YAX, rot * dt * 1.2); camera.position.copy(controls.target).add(off); } }
  const lim = HWY + 420, tx = THREE.MathUtils.clamp(controls.target.x, -lim, lim) - controls.target.x, tz = THREE.MathUtils.clamp(controls.target.z, -lim, lim) - controls.target.z;
  if (tx || tz) { controls.target.x += tx; controls.target.z += tz; camera.position.x += tx; camera.position.z += tz; }
}

// ======================= boot =======================
applyLang();
const [{ list }, ovr] = await Promise.all([loadResidents(), loadOverrides(), loadVip(), loadUpgrades(), loadPlayers(), loadLikes()]); const claims = [];
for (const [k, v] of ovr) overrides.set(k, v);
const names = []; { const seen = new Set([OWNER]); for (const n of [...list, ...claims.map((s) => clean(String(s)))]) if (n && !seen.has(n)) { seen.add(n); names.push(n); } }
// size the city: residential rings needed for all residents + room to grow
const need = names.length + 60; let rings = 3, cap = 0; while (true) { cap = resBlocks.filter((b) => b.ring <= rings).length * HPB; if (cap >= need) break; rings++; }
CAP_RES = cap;
buildGround(rings);
blockInfo.forEach((b, i) => { if (b.ring > rings) return; if (b.type === 'plaza') buildPlaza(b); else if (b.type === 'down') buildDowntown(b, i); else if (b.type !== 'res') buildAmenity(b); });
resBlocks.forEach((b, bi) => { if (b.ring <= rings) buildResidentialBlock(b, bi); });
// free-lot signs on the outermost residential blocks that are still empty
buildTrafficLights(rings); buildCars(rings);
POP = names.length + 1; buildGoals(); buildSeason();
recent = list.slice(-12).reverse();
{ const need = {}, maxPer = {}; const cnt = (n) => { const c = {}; robotParts(traits(n), (k) => { c[k] = (c[k] || 0) + 1; }); return c; };
  for (const n of names) for (const [k, v] of Object.entries(cnt(n))) { need[k] = (need[k] || 0) + v; maxPer[k] = Math.max(maxPer[k] || 0, v); }
  makeRobotMeshes((k) => (need[k] || 0) + (maxPer[k] || 4) * 120 + 8); }
for (const n of names) addResident(n);
buildCrystals(); for (const sp of specs) syncPet(sp); placeWeekTrophy();
{ const firstFree = specs.length; const freeBlocks = new Set(); for (let i = firstFree; i < CAP_RES; i++) freeBlocks.add(Math.floor(i / HPB));
  let c = 0; for (const bi of freeBlocks) { if (c++ > 6) break; const b = resBlocks[bi]; const ry = faceToCentre(b.cx, b.cz); const [fx, fz] = dirOf(ry); addSign('free', b.cx + fx * 2, 2.2, b.cz + fz * 2, 7, ry, '#39ff88', '#04140b'); } }
// owner: giant robot in the plaza
{ const t = Object.assign(traits(OWNER), { f: false, g: 'm', u: 1, cap: false, hairStyle: 'short', phones: true, glasses: false, backpack: false, bag: false, style: 'suit', top: '#0b1020', jacket: '#111827', bottom: '#111827', eye: '#39ff88', led: '#39ff88', metal: '#e8ebef' });
  const geos = {}; for (const [k, [g, m]] of Object.entries(RKINDS)) geos[k] = { g: g(), m: m() };
  robotParts(t, (k, x, y, z, sx, sy, sz, c, piv, swing, ry, rz) => { const mat = geos[k].m.clone(); mat.color = new THREE.Color(c); const mesh = new THREE.Mesh(geos[k].g, mat); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.rotation.set(0, ry, rz); mesh.castShadow = SHADOWS; ownerGroup.add(mesh); });
  ownerGroup.scale.setScalar(5); ownerGroup.position.set(0, 1.1, 0); scene.add(ownerGroup);
  B.cyl.add(0, 0.3, 0, 9, 0.8, 9, '#30353d'); }
for (const b of Object.values(B)) b.done();
refreshRobots(); makeLabels(); drawMapStatic();
HOME_P = new THREE.Vector3(cityExtent * 0.75, cityExtent * 0.62, cityExtent * 0.95).multiplyScalar(1 / Math.min(1, (innerWidth / innerHeight) * 1.35));
applyTheme(themeK);
camera.position.set(HOME_P.x * 2.2, HOME_P.y * 2.2, HOME_P.z * 2.2); controls.target.copy(HOME_T);
frame();
if (!LITE) setTimeout(() => { try { const g = renderer.getContext(), px = new Uint8Array(4 * 9); let white = 0;
  for (let k = 0; k < 9; k++) { const p = new Uint8Array(4); renderer.setRenderTarget(null); if (composer) composer.render(); else renderer.render(scene, camera); g.readPixels(Math.floor(g.drawingBufferWidth * (0.2 + 0.3 * (k % 3))), Math.floor(g.drawingBufferHeight * (0.2 + 0.3 * Math.floor(k / 3))), 1, 1, g.RGBA, g.UNSIGNED_BYTE, p); if (p[0] > 245 && p[1] > 245 && p[2] > 245) white++; }
  if (white >= 8) { try { localStorage.setItem('aishahar_lite', '1'); } catch (_) {} location.reload(); } } catch (e) {} }, 6000);
setTimeout(() => { $('#loader').style.opacity = 0; setTimeout(() => $('#loader').remove(), 700); flyTo(HOME_P, HOME_T, 3.2); animatePop(specs.length + 1); setTimeout(() => { if (!cardState) toast('👆 ' + T('tapHint'), 7000); }, 3600); }, 500);
const hashNick = clean(decodeURIComponent(location.hash.slice(1) || ''));
if (QS.has('admin') || hashNick === 'admin') setTimeout(() => { selected = null; cardState = { kind: 'admin' }; renderCard(); }, 3800);
else if (hashNick) setTimeout(() => { if (hashNick === OWNER) showOwner(); else if (index.has(hashNick)) select(specs[index.get(hashNick)]); else showNew(hashNick); }, 3800);
checkGoals(false); initExtrasUI(); initDonations(); initDriveUI(); initChat(); initGame();
// ======================= v7: daily quests · race · football · guestbook · weather · billboard · weekly reel · perf =======================
{
const I18N_7 = {
  uz: { quests: 'Kunlik vazifalar', qHint: "Har kuni 3 ta yangi vazifa. Har biri +10 💎, hammasi bajarilsa yana +15 💎!", qNeedMe: "Vazifalar uchun avval o'z robotingizni toping: qidiruvga nikneymingizni yozing va «Bu menman»ni bosing.", qClaim: 'Olish', qDone: '🎯 Vazifa bajarildi: {q} — mukofotni oling!', qGot: '+{v} 💎 vazifa mukofoti!',
    q: { crystals: "💎 5 ta kristall yig'", like: "❤️ 2 ta qo'shni uyiga layk bos", stadium: '🏟 Robotingni stadionga olib bor', mall: '🛍 Savdo markaziga bor', race: '🏁 Shahar poygasini tugat', guest: "📖 Biror uyning mehmonlar daftariga yoz", walk: '🚶 Robotingda 300 m yur', goal: '⚽ Stadionda gol ur', chat: '💬 Shahar chatiga yoz' },
    race: 'Poyga', raceGo: 'Start! Yashil halqalardan o\'ting 🏁', raceGate: 'Halqa', raceDone: '🏁 Marra! Vaqtingiz: {t} s', raceBest: '🏆 Haftalik rekordingiz: {t} s!', raceAbort: 'Poyga to\'xtatildi', boardR: '🏁 Poyga',
    goal: '⚽ GOOOL! @{n}', guestBtn: 'Mehmonlar daftari', guestTitle: 'Mehmonlar daftari', guestEmpty: "Hali hech kim yozmagan. Birinchi bo'ling!", guestPh: 'Uy egasiga iliq so\'z yozing…', guestSend: 'Yozish', guestNeed: "Yozish uchun avval o'z robotingizni toping (qidiruvga nikneymingiz → «Bu menman»).", guestOk: 'Yozildi! 📖', noLinks: 'Havola yuborish mumkin emas', visit: 'Mehmonga kirish',
    tgOn: '🔔 Telegram eslatmalari ulangan ✅', tgBtn: '🔔 Telegram eslatmalarini yoqish', tgHint: "Bot streak yo'qolay deganda, uyingizga layk yoki daftaringizga xabar kelganda yozadi.",
    wx: { 0: 'ochiq osmon', 1: 'asosan ochiq', 2: 'qisman bulutli', 3: 'bulutli', 45: 'tuman', 51: "mayda yomg'ir", 61: "yomg'ir", 65: "kuchli yomg'ir", 71: 'qor', 75: "kuchli qor", 80: "jala", 95: "momaqaldiroq" }, wxToast: "Toshkentda hozir {d}, {t}°C — shaharda ham shunday!",
    bbTitle: 'Telegram kanal', bbTap: '👆 Bosing — kanalga o\'ting', bbSub: "Obuna bo'ling: t.me/{c}", weekly: 'Haftalik Reel', wkTop: 'AI SHAHAR 2036 · BU HAFTA', wkNew: '+{n} YANGI ROBOT', wkMoved: "ko'chib keldi 🏠", wkEnd1: 'Robotingni ol 🤖', wkEnd2: 'Profildagi havola 👆', perfOn: '⚡ Yengil rejim yoqildi — sayt tezroq ishlaydi', perfBtn: 'Yengil rejim' },
  ru: { quests: 'Ежедневные задания', qHint: 'Каждый день 3 новых задания. Каждое +10 💎, все три — ещё +15 💎!', qNeedMe: 'Для заданий сначала найдите своего робота: введите ник в поиск и нажмите «Это я».', qClaim: 'Забрать', qDone: '🎯 Задание выполнено: {q} — заберите награду!', qGot: '+{v} 💎 за задание!',
    q: { crystals: '💎 Собери 5 кристаллов', like: '❤️ Лайкни 2 дома соседей', stadium: '🏟 Приведи робота на стадион', mall: '🛍 Зайди в торговый центр', race: '🏁 Пройди городскую гонку', guest: '📖 Напиши в гостевую книгу', walk: '🚶 Пройди роботом 300 м', goal: '⚽ Забей гол на стадионе', chat: '💬 Напиши в чат города' },
    race: 'Гонка', raceGo: 'Старт! Проходи через зелёные кольца 🏁', raceGate: 'Кольцо', raceDone: '🏁 Финиш! Время: {t} с', raceBest: '🏆 Рекорд недели: {t} с!', raceAbort: 'Гонка остановлена', boardR: '🏁 Гонка',
    goal: '⚽ ГОООЛ! @{n}', guestBtn: 'Гостевая книга', guestTitle: 'Гостевая книга', guestEmpty: 'Пока никто не писал. Будьте первым!', guestPh: 'Напишите хозяину тёплые слова…', guestSend: 'Написать', guestNeed: 'Чтобы писать, сначала найдите своего робота (ник в поиск → «Это я»).', guestOk: 'Записано! 📖', noLinks: 'Ссылки отправлять нельзя', visit: 'Зайти в гости',
    tgOn: '🔔 Уведомления в Telegram подключены ✅', tgBtn: '🔔 Включить уведомления в Telegram', tgHint: 'Бот напишет, когда серия сгорает, или дому поставили лайк, или вам написали в книгу.',
    wx: { 0: 'ясно', 1: 'преимущественно ясно', 2: 'переменная облачность', 3: 'облачно', 45: 'туман', 51: 'морось', 61: 'дождь', 65: 'сильный дождь', 71: 'снег', 75: 'сильный снег', 80: 'ливень', 95: 'гроза' }, wxToast: 'В Ташкенте сейчас {d}, {t}°C — в городе так же!',
    bbTitle: 'Telegram канал', bbTap: '👆 Нажмите — перейти в канал', bbSub: 'Подписывайтесь: t.me/{c}', weekly: 'Reel недели', wkTop: 'AI SHAHAR 2036 · ЭТА НЕДЕЛЯ', wkNew: '+{n} НОВЫХ РОБОТОВ', wkMoved: 'переехал(а) 🏠', wkEnd1: 'Получи своего робота 🤖', wkEnd2: 'Ссылка в профиле 👆', perfOn: '⚡ Включён лёгкий режим — сайт работает быстрее', perfBtn: 'Лёгкий режим' },
  en: { quests: 'Daily quests', qHint: '3 new quests every day. Each +10 💎, finish all three for +15 💎 more!', qNeedMe: 'For quests, first find your robot: type your username in search and tap “That\'s me”.', qClaim: 'Claim', qDone: '🎯 Quest done: {q} — claim your reward!', qGot: '+{v} 💎 quest reward!',
    q: { crystals: '💎 Collect 5 crystals', like: '❤️ Like 2 neighbours\' houses', stadium: '🏟 Take your robot to the stadium', mall: '🛍 Visit the mall', race: '🏁 Finish the city race', guest: '📖 Sign someone\'s guestbook', walk: '🚶 Walk 300 m with your robot', goal: '⚽ Score a goal at the stadium', chat: '💬 Write in the city chat' },
    race: 'Race', raceGo: 'Go! Pass through the green rings 🏁', raceGate: 'Ring', raceDone: '🏁 Finish! Your time: {t} s', raceBest: '🏆 Your best this week: {t} s!', raceAbort: 'Race stopped', boardR: '🏁 Race',
    goal: '⚽ GOOOAL! @{n}', guestBtn: 'Guestbook', guestTitle: 'Guestbook', guestEmpty: 'No one has written yet. Be the first!', guestPh: 'Write something nice to the owner…', guestSend: 'Sign', guestNeed: 'To write, first find your robot (username in search → “That\'s me”).', guestOk: 'Signed! 📖', noLinks: 'Links are not allowed', visit: 'Visit',
    tgOn: '🔔 Telegram reminders connected ✅', tgBtn: '🔔 Turn on Telegram reminders', tgHint: 'The bot writes when your streak is about to burn, or your house got likes or guestbook notes.',
    wx: { 0: 'clear sky', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'fog', 51: 'drizzle', 61: 'rain', 65: 'heavy rain', 71: 'snow', 75: 'heavy snow', 80: 'showers', 95: 'thunderstorm' }, wxToast: 'Right now in Tashkent: {d}, {t}°C — same in the city!',
    bbTitle: 'Telegram channel', bbTap: '👆 Tap — open the channel', bbSub: 'Follow: t.me/{c}', weekly: 'Weekly Reel', wkTop: 'AI SHAHAR 2036 · THIS WEEK', wkNew: '+{n} NEW ROBOTS', wkMoved: 'moved in 🏠', wkEnd1: 'Get your robot 🤖', wkEnd2: 'Link in bio 👆', perfOn: '⚡ Light mode on — the site runs faster', perfBtn: 'Light mode' },
};
for (const l of Object.keys(I18N)) Object.assign(I18N[l], I18N_7[l] || I18N_7.en);
const TQ = (k) => T('q')[k] || k;

// ---------- daily quests ----------
const QUESTS = ['crystals', 'like', 'stadium', 'mall', 'race', 'guest', 'walk', 'goal', 'chat'];
function questsFor(dayStr) { let h = 2166136261; for (const c of dayStr) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const out = []; let x = h >>> 0; while (out.length < 3) { x = (Math.imul(x ^ (x >>> 15), 2246822507) + 0x9e3779b9) >>> 0; const q = x % QUESTS.length; if (!out.includes(q)) out.push(q); } return out; }
const qkey = (k) => 'aishahar_q_' + tkDay() + '_' + k;
const pop = (m) => { let c = 0; m >>>= 0; while (m) { c += m & 1; m >>>= 1; } return c; };
const QMEM = { walk: +(store.get(qkey('walk')) || 0), told: new Set(), lastSave: 0 };
function qProgress(kind) { const P = GAME.player || {};
  if (kind === 'crystals') return [Math.min(5, pop(P.col_mask || 0)), 5];
  if (kind === 'like') return [Math.min(2, +(store.get(qkey('like')) || 0)), 2];
  if (kind === 'walk') return [Math.min(300, Math.floor(QMEM.walk)), 300];
  return [store.get(qkey(kind)) ? 1 : 0, 1]; }
const todayQ = () => questsFor(tkDay()).map((q) => QUESTS[q]);
const qClaimed = (slot) => { const P = GAME.player; return !!(P && P.day === tkDay() && (P.q_mask & (1 << slot))); };
function qReadyCount() { if (!GAME.me || !GAME.player) return 0; return todayQ().filter((k, s) => { const [a, b] = qProgress(k); return a >= b && !qClaimed(s); }).length; }
function updQuestBtn() { const b = $('#btnQuest'); if (!b) return; const n = qReadyCount(); b.innerHTML = '🎯' + (n ? `<i class="qdot">${n}</i>` : ''); }
function qCheck() { if (!GAME.me || !GAME.player) return; todayQ().forEach((k, s) => { const [a, b] = qProgress(k); if (a >= b && !qClaimed(s) && !QMEM.told.has(k)) { QMEM.told.add(k); toast(T('qDone').replace('{q}', TQ(k)), 5000); } }); updQuestBtn(); }
function qBump(kind, add = 1) { if (!GAME.me) return; if (kind === 'like') store.set(qkey('like'), String((+(store.get(qkey('like')) || 0)) + add)); else store.set(qkey(kind), '1'); qCheck(); if (cardState && cardState.kind === 'quests') renderCard(); }
window.__qBump = qBump;
async function claimQuest(slot) { const r = await api({ action: 'quest', nick: GAME.me, slot }); if (!r.ok) return toast(T('chatErr')); setPlayer(r.player); toast(T('qGot').replace('{v}', r.value || 10), 4000);
  if (drive) sparkle(drive.x, drive.z, true); updQuestBtn(); renderCard(); }

// ---------- race: 8 green rings around the inner city ring road ----------
const RR_ = 1.5 * PITCH, GATES = [[RR_, 0], [RR_, RR_], [0, RR_], [-RR_, RR_], [-RR_, 0], [-RR_, -RR_], [0, -RR_], [RR_, -RR_], [RR_, 0]];
let race = null;
const gateMat = new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.85, toneMapped: false, side: THREE.DoubleSide });
const gate = new THREE.Mesh(new THREE.TorusGeometry(5, 0.35, 10, 40), gateMat); gate.visible = false; gate.userData.noColl = true; scene.add(gate);
const gateBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 60, 10, 1, true).translate(0, 30, 0), new THREE.MeshBasicMaterial({ color: 0x39ff88, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); gateBeam.visible = false; scene.add(gateBeam);
const raceHud = document.createElement('div'); raceHud.id = 'raceHud'; document.body.appendChild(raceHud);
function placeGate(i) { const [x, z] = GATES[i], [px, pz] = GATES[Math.max(0, i - 1)]; gate.position.set(x, 4.2, z); gate.rotation.set(0, Math.atan2(x - px, z - pz), 0); gateBeam.position.set(x, 0, z); gate.visible = gateBeam.visible = true; }
function startRace() { if (!drive) return; drive.x = GATES[0][0]; drive.z = GATES[0][1] - 4; drive.yaw = 0; drive.speed = 0; drive.turbo = 2.7; drive.freeze = performance.now() + 3000;
  race = { i: 1, t0: performance.now() + 3000 }; placeGate(1); raceHud.classList.add('on');
  const tg = new THREE.Vector3(drive.x, 2, drive.z); flyTo(new THREE.Vector3(drive.x, 9, drive.z - 14), tg, 0.8); }
function endRace(msg) { race = null; gate.visible = gateBeam.visible = false; raceHud.classList.remove('on'); if (drive) { drive.turbo = 0; drive.freeze = 0; } if (msg) toast(msg); }
async function finishRace(time) { endRace(); toast(T('raceDone').replace('{t}', time.toFixed(2)), 6000); qBump('race'); if (drive) sparkle(drive.x, drive.z, true);
  const r = await api({ action: 'race', nick: GAME.me, time }); if (r.ok) { setPlayer(r.player); GAME.board.r = null; if (r.best) setTimeout(() => toast(T('raceBest').replace('{t}', time.toFixed(2)), 6000), 2500); } }
function updateRace() { if (!race) return; if (!drive) return endRace();
  const now = performance.now(); if (now < race.t0) { raceHud.textContent = '🏁 ' + Math.ceil((race.t0 - now) / 1000); return; }
  if (!race.go) { race.go = true; toast(T('raceGo')); }
  const el = (now - race.t0) / 1000; raceHud.textContent = `🏁 ${race.i}/${GATES.length - 1} · ${el.toFixed(1)} s`;
  const [gx, gz] = GATES[race.i]; if ((drive.x - gx) ** 2 + (drive.z - gz) ** 2 < 7 * 7) { if (race.i === GATES.length - 1) return finishRace(el); race.i++; placeGate(race.i); sparkle(gx, gz, false); }
  gate.rotation.z += 0.02; }

// ---------- football at the stadium ----------
const STAD = (amenityBlocks.stadium || [])[0]; const ball = { x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0, lock: 0 };
let ballMesh = null;
if (STAD) {
  const bt = canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, w, h); g.fillStyle = '#16181c'; for (const [x, y] of [[16, 14], [48, 40], [80, 14], [112, 40], [32, 54], [96, 54], [64, 4]]) { g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 - 1.57; g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); } g.fill(); } });
  ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 14), matStd({ map: bt, roughness: 0.5 })); ballMesh.castShadow = SHADOWS; ballMesh.userData.noColl = true; scene.add(ballMesh);
  ball.x = STAD.cx; ball.z = STAD.cz;
  for (const sd of [-1, 1]) { const gx = STAD.cx + sd * 12.6; for (const zz of [-2.6, 2.6]) B.cyl.add(gx, 0.4, STAD.cz + zz, 0.22, 2.6, 0.22, '#ffffff'); box(gx, 2.9, STAD.cz, 0.22, 0.22, 5.4, '#ffffff'); box(gx + sd * 1.2, 0.4, STAD.cz, 0.08, 2.5, 5.2, '#d9dde2'); }
  B.cyl.done(); B.box.done();
}
function updateBall(dt) { if (!ballMesh) return; const cx = STAD.cx, cz = STAD.cz;
  if (drive && Math.abs(drive.x - cx) < 30 && Math.abs(drive.z - cz) < 22) { const dx = ball.x - drive.x, dz = ball.z - drive.z, d = Math.hypot(dx, dz);
    if (d < 1.15 && performance.now() > ball.lock) { const fx = Math.sin(drive.yaw), fz = Math.cos(drive.yaw); let kx = dx / (d || 1) * 0.6 + fx * 0.4, kz = dz / (d || 1) * 0.6 + fz * 0.4; const kl = Math.hypot(kx, kz) || 1; const pw = 5 + drive.speed * 1.7;
      ball.vx = kx / kl * pw; ball.vz = kz / kl * pw; ball.vy = drive.speed > 5 ? 3 : 1; ball.lock = performance.now() + 250; } }
  ball.x += ball.vx * dt; ball.z += ball.vz * dt; const f = Math.max(0, 1 - 0.9 * dt); ball.vx *= f; ball.vz *= f;
  ball.vy -= 18 * dt; ball.y = Math.max(0, ball.y + ball.vy * dt); if (ball.y === 0 && ball.vy < 0) ball.vy = Math.abs(ball.vy) > 1.5 ? -ball.vy * 0.45 : 0;
  const ex = (ball.x - cx) / 12.4, ez = (ball.z - cz) / 7.6;
  if (Math.abs(ball.x - cx) > 12.6 && Math.abs(ball.z - cz) < 2.3 && ball.y < 2.6 && !ball.scored) { ball.scored = true; const who = drive ? drive.sp.name : '…'; toast(T('goal').replace('{n}', who), 4000); sparkle(ball.x, ball.z, true); sparkle(ball.x, ball.z, false); qBump('goal');
    setTimeout(() => { ball.x = cx; ball.z = cz; ball.vx = ball.vz = 0; ball.scored = false; }, 1600); }
  else if (!ball.scored && ex * ex + ez * ez > 1 && !(Math.abs(ball.z - cz) < 2.3 && ball.y < 2.6)) { const nx = ex / 12.4, nz = ez / 7.6, nl = Math.hypot(nx, nz) || 1, ux = nx / nl, uz = nz / nl, dot = ball.vx * ux + ball.vz * uz;
    if (dot > 0) { ball.vx = (ball.vx - 2 * dot * ux) * 0.7; ball.vz = (ball.vz - 2 * dot * uz) * 0.7; } const k = 1 / Math.sqrt(ex * ex + ez * ez); ball.x = cx + (ball.x - cx) * k * 0.999; ball.z = cz + (ball.z - cz) * k * 0.999; }
  ballMesh.position.set(ball.x, 0.95 + ball.y, ball.z); const sp = Math.hypot(ball.vx, ball.vz); if (sp > 0.05) { ballMesh.rotation.x += ball.vz * dt / 0.55; ballMesh.rotation.z -= ball.vx * dt / 0.55; } }

// ---------- guestbook + "visit" while driving ----------
const GB = new Map();
async function loadGuest(nick) { try { const c = await sb(); const { data } = await c.from('guestbook').select('author,text,created_at').eq('target', nick).order('id', { ascending: false }).limit(40); GB.set(nick, data || []); } catch (e) { GB.set(nick, []); } if (cardState && cardState.kind === 'guest' && cardState.nick === nick) renderCard(); }
async function sendGuest() { const inp = $('#gbIn'), text = (inp && inp.value || '').trim(), nick = cardState.nick; if (!text) return;
  const r = await api({ action: 'guest', nick: GAME.me, target: nick, text }); if (!r.ok) return toast(r.error === 'link' ? T('noLinks') : r.error === 'slow' ? T('chatSlow') : T('chatErr'));
  toast(T('guestOk')); qBump('guest'); setPlayer(r.player); loadGuest(nick); }
const visitBtn = document.createElement('button'); visitBtn.id = 'visitBtn'; document.body.appendChild(visitBtn); let visitNick = null, visitT = 0;
visitBtn.onclick = () => { if (!visitNick) return; const n = visitNick; stopDrive(); cardState = { kind: 'guest', nick: n }; renderCard(); };
function updateVisit(t) { if (!drive || race) { if (visitNick) { visitNick = null; visitBtn.classList.remove('on'); } return; } if (t - visitT < 0.4) return; visitT = t;
  let best = null, bd = 81; for (let i = 0; i < specs.length; i++) { const h = houseIdx[i]; if (!h || specs[i].name === drive.sp.name) continue; const d = (h.x - drive.x) ** 2 + (h.z - drive.z) ** 2; if (d < bd) { bd = d; best = specs[i].name; } }
  if (best !== visitNick) { visitNick = best; visitBtn.classList.toggle('on', !!best); if (best) visitBtn.textContent = `🚪 ${T('visit')}: @${best}`; } }

// ---------- Telegram reminders ----------
async function linkTelegram() { const w = window.open('', '_blank'); const r = await api({ action: 'tglink', nick: GAME.me }); if (!r.ok) { if (w) w.close(); return toast(T('chatErr')); }
  const url = `https://t.me/${CFG.botUsername}?start=link_${r.code}`; if (w) w.location.href = url; else location.href = url; }

// ---------- cards ----------
window.__cardExt = (c, st) => {
  if (st.kind === 'quests') {
    if (!GAME.me || !GAME.player) { c.innerHTML = `<button class="x" aria-label="×">×</button><h2>🎯 ${T('quests')}</h2><p class="vh">${T('qNeedMe')}</p>`; return true; }
    const rows = todayQ().map((k, s) => { const [a, b] = qProgress(k), got = qClaimed(s), ok = a >= b;
      return `<div class="qrow${got ? ' got' : ''}"><div class="qt">${TQ(k)}<div class="qbar"><i style="width:${Math.round(a / b * 100)}%"></i></div><span class="qn">${b > 1 ? a + ' / ' + b : ''}</span></div>${got ? '<b class="qok">✅</b>' : `<button class="${ok ? 'pri' : ''}" data-a="qclaim" data-s="${s}" ${ok ? '' : 'disabled'}>${T('qClaim')} +10</button>`}</div>`; }).join('');
    c.innerHTML = `<button class="x" aria-label="×">×</button><h2>🎯 ${T('quests')}</h2><div class="code">${tkDay()} · 💎 ${GAME.player.crystals}</div><p class="vh">${T('qHint')}</p><div class="qlist">${rows}</div>`; return true; }
  if (st.kind === 'guest') { const list = GB.get(st.nick); if (!list) loadGuest(st.nick);
    const rows = (list || []).map((m) => `<div class="gb"><b data-n="${esc(m.author)}">@${esc(m.author)}</b> <span></span><i>${fmtTime(m.created_at)} · ${String(m.created_at).slice(5, 10)}</i></div>`).join('');
    c.innerHTML = `<button class="x" aria-label="×">×</button><h2>📖 ${T('guestTitle')}</h2><div class="code">🏠 @${esc(st.nick)}</div><div class="gblist">${list ? rows || `<p class="vh">${T('guestEmpty')}</p>` : '<p class="vh">…</p>'}</div>
      ${GAME.me ? `<div class="row2"><input id="gbIn" class="cardin" maxlength="200" placeholder="${T('guestPh')}"><button data-a="gbsend">${T('guestSend')}</button></div>` : `<p class="vh">${T('guestNeed')}</p>`}`;
    if (list) c.querySelectorAll('.gb span').forEach((el, i) => (el.textContent = list[i].text)); return true; }
  return false; };
window.__cardAct = (a, b) => {
  if (a === 'qclaim') { claimQuest(Number(b.dataset.s)); return true; }
  if (a === 'guest' && cardState?.sp) { cardState = { kind: 'guest', nick: cardState.sp.name }; renderCard(); return true; }
  if (a === 'gbsend') { sendGuest(); return true; }
  if (a === 'tglink') { linkTelegram(); return true; }
  if (a === 'weekly') { weeklyReel(); return true; }
  return false; };
$('#card').addEventListener('click', (e) => { const n = e.target.closest('.gb b'); if (n && index.has(n.dataset.n)) select(specs[index.get(n.dataset.n)]); });
$('#card').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'gbIn') sendGuest(); });
$('#btnQuest').onclick = () => { selected = null; cardState = { kind: 'quests' }; renderCard(); };
$('#raceBtn').textContent = '🏁 ' + T('race'); $('#raceBtn').onclick = () => (race ? endRace(T('raceAbort')) : startRace());

// ---------- real Tashkent weather + time ----------
const WX = { code: -1, temp: null, rain: 0, snow: 0, cloud: 0, fog: 0, thunder: false, sunrise: null, sunset: null };
const DROPS = LITE ? 1400 : 4000, AREA = 150, rainPos = new Float32Array(DROPS * 6), snowPos = new Float32Array(DROPS * 3);
for (let i = 0; i < DROPS; i++) { const x = (Math.random() - 0.5) * AREA, y = Math.random() * 70, z = (Math.random() - 0.5) * AREA; rainPos.set([x, y, z, x, y - 1.1, z], i * 6); snowPos.set([x, y, z], i * 3); }
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xa9c8ff, transparent: true, opacity: 0.45, depthWrite: false })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.9, depthWrite: false })); snow.frustumCulled = false; snow.visible = false; scene.add(snow);
const wxChip = document.createElement('button'); wxChip.className = 'chip'; wxChip.id = 'wxChip'; wxChip.style.display = 'none'; $('.tbtns').insertBefore(wxChip, $('#btnTheme'));
const wxIcon = (c) => (c >= 95 ? '⛈' : c >= 71 && c <= 86 && !(c >= 80 && c <= 82) ? '🌨' : c >= 51 ? '🌧' : c >= 45 ? '🌫' : c === 3 ? '☁' : c >= 1 ? '⛅' : WX.isDay === 0 ? '🌙' : '☀');
const wxName = (c) => { const m = T('wx'); const ks = Object.keys(m).map(Number).sort((a, b) => a - b); let best = ks[0]; for (const k of ks) if (k <= c) best = k; return m[best]; };
wxChip.onclick = () => toast(T('wxToast').replace('{d}', wxName(WX.code)).replace('{t}', Math.round(WX.temp)), 5000);
async function loadWeather() { try {
  const j = await fetch('https://api.open-meteo.com/v1/forecast?latitude=41.2995&longitude=69.2401&current=temperature_2m,weather_code,is_day,precipitation&daily=sunrise,sunset&timezone=Asia%2FTashkent&forecast_days=1').then((r) => r.json());
  const c = j.current; if (!c || c.temperature_2m == null) return; WX.code = c.weather_code ?? 0; WX.temp = c.temperature_2m; WX.isDay = c.is_day; WX.sunrise = j.daily && j.daily.sunrise && j.daily.sunrise[0]; WX.sunset = j.daily && j.daily.sunset && j.daily.sunset[0];
  const k = WX.code; WX.snow = (k >= 71 && k <= 77) || k === 85 || k === 86 ? (k === 75 || k === 86 ? 1 : 0.6) : 0; WX.rain = !WX.snow && ((k >= 51 && k <= 67) || (k >= 80 && k <= 82) || k >= 95) ? (k === 65 || k === 82 || k >= 95 ? 1 : k >= 61 ? 0.7 : 0.4) : 0;
  WX.cloud = k >= 3 ? (WX.rain || WX.snow ? 0.8 : 0.45) : k === 2 ? 0.2 : 0; WX.fog = k === 45 || k === 48 ? 1 : 0; WX.thunder = k >= 95;
  wxChip.style.display = ''; wxChip.textContent = `${wxIcon(k)} ${Math.round(WX.temp)}°`; autoTheme(); applyTheme(themeK); } catch (e) {} }
window.__wxApply = () => { const cl = WX.cloud; if (cl) { sun.intensity *= 1 - 0.6 * cl; hemi.intensity *= 1 - 0.25 * cl; }
  scene.fog.near = WX.fog ? 60 : 260 - 100 * cl; scene.fog.far = WX.fog ? 420 : 1300 - 450 * cl; };
function tkMinutes(iso) { const m = /T(\d\d):(\d\d)/.exec(iso || ''); return m ? +m[1] * 60 + +m[2] : null; }
function autoTheme() { const ts = +(store.get('aishahar_theme_ts') || 0); if (store.get('aishahar_theme') && Date.now() - ts < 3 * 3600e3) return;
  const now = new Date(), nm = (() => { try { const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: CFG.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(now).split(':'); return (+h % 24) * 60 + +m; } catch (e) { return now.getHours() * 60 + now.getMinutes(); } })();
  const sr = tkMinutes(WX.sunrise) ?? 390, ss = tkMinutes(WX.sunset) ?? 1110, ramp = 40, sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  themeTarget = Math.round(sm(sr - ramp, sr + ramp, nm) * (1 - sm(ss - ramp, ss + ramp, nm)) * 20) / 20; }
$('#btnTheme').onclick = () => { themeTarget = themeTarget > 0.5 ? 0 : 1; store.set('aishahar_theme', themeTarget ? 'day' : 'night'); store.set('aishahar_theme_ts', String(Date.now())); };
let flashT = 0;
function updateWeather(t, dt) { const tgt = controls.target, far = camera.position.y > 260;
  rain.visible = WX.rain > 0 && !far; snow.visible = WX.snow > 0 && !far;
  if (rain.visible) { const n = Math.floor(DROPS * WX.rain), p = rainPos; for (let i = 0; i < n; i++) { const o = i * 6; let y = p[o + 1] - 55 * dt; if (y < 0) y += 70; p[o + 1] = y; p[o + 4] = y - 1.1; } rainGeo.setDrawRange(0, n * 2); rainGeo.attributes.position.needsUpdate = true; rain.position.set(tgt.x, 0, tgt.z); }
  if (snow.visible) { const n = Math.floor(DROPS * WX.snow), p = snowPos; for (let i = 0; i < n; i++) { const o = i * 3; let y = p[o + 1] - 5 * dt; if (y < 0) y += 70; p[o + 1] = y; p[o] += Math.sin(t + i) * 0.02; } snowGeo.setDrawRange(0, n); snowGeo.attributes.position.needsUpdate = true; snow.position.set(tgt.x, 0, tgt.z); }
  if (WX.thunder) { if (t > flashT) { flashT = t + 7 + Math.random() * 10; hemi.intensity += 2.2; setTimeout(() => applyTheme(themeK), 140); } } }

// ---------- billboard with the Telegram channel ----------
const BB = { posts: [], i: 0, ch: 'otabek_ai_agent', meshes: [] };
const bbCanvas = document.createElement('canvas'); bbCanvas.width = 1024; bbCanvas.height = 576; const bbTex = new THREE.CanvasTexture(bbCanvas); bbTex.colorSpace = THREE.SRGBColorSpace; bbTex.anisotropy = 4;
function drawBB() { const g = bbCanvas.getContext('2d'), W = 1024, H = 576; const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#0b1230'); gr.addColorStop(1, '#14082a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = '#2aa3e0'; g.fillRect(0, 0, W, 86); g.fillStyle = '#fff'; g.font = '700 42px "Space Grotesk", system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText('✈ ' + T('bbTitle') + ' · @' + BB.ch, 30, 44);
  const p = BB.posts[BB.i % Math.max(1, BB.posts.length)]; g.fillStyle = '#e9f1ff'; g.font = '500 38px "Space Grotesk", system-ui, sans-serif'; g.textBaseline = 'top';
  const text = p ? p.text : T('bbSub').replace('{c}', BB.ch); const lines = []; for (const para of text.split('\n')) { let cur = ''; for (const w of para.split(' ')) { const t2 = cur ? cur + ' ' + w : w; if (g.measureText(t2).width > W - 70) { lines.push(cur); cur = w; } else cur = t2; } lines.push(cur); if (lines.length > 9) break; }
  lines.filter((l, i) => !(l === '' && lines[i - 1] === '')).slice(0, 9).forEach((l, i) => g.fillText(l, 34, 110 + i * 46));
  g.fillStyle = 'rgba(57,255,136,.95)'; g.fillRect(0, H - 60, W, 60); g.fillStyle = '#04140b'; g.font = '700 32px "Space Grotesk", system-ui, sans-serif'; g.textBaseline = 'middle'; g.fillText(T('bbTap') + (BB.posts.length ? `  ·  ${BB.i % BB.posts.length + 1}/${BB.posts.length}` : ''), 30, H - 30);
  bbTex.needsUpdate = true; }
{ const ry = Math.PI / 4, cx = -12, cz = -12, ux = Math.cos(ry), uz = -Math.sin(ry);
  for (const s of [-7, 7]) B.cyl.add(cx + ux * s, 0.3, cz + uz * s, 0.9, 16, 0.9, '#30353d'); B.cyl.done();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(17, 10, 0.5), matStd({ color: 0x11151c, metalness: 0.6, roughness: 0.3 })); frame.position.set(cx, 11, cz); frame.rotation.y = ry; frame.userData.bb = true; scene.add(frame);
  const mat = new THREE.MeshBasicMaterial({ map: bbTex, toneMapped: false, color: 0xd8d8d8 });
  for (const sd of [1, -1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), mat); pl.position.set(cx + Math.sin(ry) * 0.27 * sd, 11, cz + Math.cos(ry) * 0.27 * sd); pl.rotation.y = sd > 0 ? ry : ry + Math.PI; pl.userData.bb = true; scene.add(pl); BB.meshes.push(pl); }
  BB.meshes.push(frame); drawBB(); }
window.__bbMeshes = BB.meshes;
window.__bbOpen = () => { const p = BB.posts[BB.i % Math.max(1, BB.posts.length)]; open(p ? 'https://t.me/' + p.id : 'https://t.me/' + BB.ch, '_blank', 'noopener'); };
async function loadFeed() { try { const j = await fetch('/api/tgfeed').then((r) => r.json()); if (j.channel) BB.ch = j.channel; BB.posts = j.posts || []; BB.i = 0; drawBB(); } catch (e) {} }
setInterval(() => { if (BB.posts.length > 1 && !document.hidden) { BB.i++; drawBB(); } }, 9000);

// ---------- weekly Reel (admin): new residents fly-through with captions ----------
async function weeklyReel() {
  let names = []; try { const j = await fetch('residents.json', { cache: 'no-store' }).then((r) => r.json()); const jo = j.joined || {}, wk = Date.now() - 7 * 864e5; names = Object.entries(jo).filter(([, d]) => Date.parse(d) >= wk).map(([n]) => clean(n)).filter((n) => index.has(n)); } catch (e) {}
  if (!names.length) names = specs.slice(-8).map((s) => s.name); names = names.slice(-10);
  const W = 720, H = 1280, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })); pl.renderOrder = 999; pl.userData.noColl = true;
  const draw = (top, big, small) => { const g = cv.getContext('2d'); g.clearRect(0, 0, W, H); const gt = g.createLinearGradient(0, 0, 0, 300); gt.addColorStop(0, 'rgba(5,6,12,.85)'); gt.addColorStop(1, 'rgba(5,6,12,0)'); g.fillStyle = gt; g.fillRect(0, 0, W, 300);
    const gb = g.createLinearGradient(0, H - 380, 0, H); gb.addColorStop(0, 'rgba(5,6,12,0)'); gb.addColorStop(1, 'rgba(5,6,12,.9)'); g.fillStyle = gb; g.fillRect(0, H - 380, W, 380); g.textAlign = 'center';
    g.fillStyle = '#39ff88'; g.font = '700 34px "Space Grotesk", system-ui'; g.fillText(top, W / 2, 110); g.fillStyle = '#ffffff'; g.font = '800 64px "Space Grotesk", system-ui'; g.fillText(big, W / 2, H - 200); g.fillStyle = '#50d7ff'; g.font = '600 38px "Space Grotesk", system-ui'; g.fillText(small, W / 2, H - 130); tx.needsUpdate = true; };
  const fit = () => { const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2); pl.scale.set(h * camera.aspect, h, 1); pl.position.set(0, 0, -1); };
  const steps = []; const timers = [];
  const secs = Math.ceil(3 + names.length * 1.8 + 3.5);
  await recordReel(secs, { start() { if (!camera.parent) scene.add(camera); camera.add(pl); fit(); selected = null;
      draw(T('wkTop'), T('wkNew').replace('{n}', names.length), '@' + OWNER); flyTo(new THREE.Vector3(cityExtent * 0.6, cityExtent * 0.5, cityExtent * 0.7), new THREE.Vector3(0, 0, 0), 2.6);
      names.forEach((n, k) => timers.push(setTimeout(() => { fit(); const sp = specs[index.get(n)], h = houseIdx[sp.i], [fx, fz] = dirOf(h.face); selected = sp; follow = false;
        flyTo(new THREE.Vector3(h.x + fx * 16 + 5, 9, h.z + fz * 16 + 5), new THREE.Vector3(h.x, 2, h.z), 1.2); draw(T('wkTop'), '@' + n, T('wkMoved')); }, 3000 + k * 1800)));
      timers.push(setTimeout(() => { fit(); selected = null; draw('AI SHAHAR 2036', T('wkEnd1'), T('wkEnd2')); flyTo(new THREE.Vector3(70, 60, 90), new THREE.Vector3(0, 8, 0), 3); }, 3000 + names.length * 1800)); },
    stop() { timers.forEach(clearTimeout); camera.remove(pl); pl.material.map.dispose(); pl.material.dispose(); selected = null; } });
}

// ---------- performance: auto light mode for weak phones ----------
const PERF = { lvl: +(store.get('aishahar_perf') || 0), n: 0, acc: 0, since: performance.now() + 9000, told: false };
function applyPerf(l) { if (l >= 1) { renderer.setPixelRatio(Math.min(devicePixelRatio, 1)); composer = null; }
  if (l >= 2) { renderer.setPixelRatio(0.85); sun.castShadow = false; rain.material.opacity = 0.3; } if (l >= 3) renderer.setPixelRatio(0.7); dispatchEvent(new Event('resize')); }
if (PERF.lvl) applyPerf(PERF.lvl);
function updatePerf(dt) { if (recording || document.hidden) { PERF.since = performance.now() + 3000; PERF.n = PERF.acc = 0; return; } if (performance.now() < PERF.since) return;
  PERF.n++; PERF.acc += dt; if (PERF.acc < 4) return; const fps = PERF.n / PERF.acc; PERF.n = PERF.acc = 0;
  if (fps < 24 && PERF.lvl < 3) { PERF.lvl++; store.set('aishahar_perf', String(PERF.lvl)); applyPerf(PERF.lvl); PERF.since = performance.now() + 3000; if (!PERF.told) { PERF.told = true; toast(T('perfOn'), 5000); } } }
const pb = $('#btnPerf'); const setPB = () => pb.classList.toggle('on', LITE || PERF.lvl > 0); setPB(); pb.title = T('perfBtn');
pb.onclick = () => { const on = LITE || PERF.lvl > 0; if (on) { store.set('aishahar_perf', '0'); store.set('aishahar_lite', '0'); } else { store.set('aishahar_perf', '2'); store.set('aishahar_lite', '1'); } location.reload(); };

// ---------- per-frame hook ----------
let lastX = null, lastZ = null, amenT = 0;
window.__v7u = (t, dt) => { updateRace(); updateBall(dt); updateVisit(t); updateWeather(t, dt); updatePerf(dt);
  if (drive && GAME.me === drive.sp.name) { if (lastX != null) { const d = Math.hypot(drive.x - lastX, drive.z - lastZ); if (d < 5) QMEM.walk += d; } lastX = drive.x; lastZ = drive.z;
    if (t - QMEM.lastSave > 2) { QMEM.lastSave = t; store.set(qkey('walk'), String(Math.floor(QMEM.walk))); qCheck(); }
    if (t - amenT > 1) { amenT = t; for (const k of ['stadium', 'mall']) for (const b of amenityBlocks[k] || []) if ((b.cx - drive.x) ** 2 + (b.cz - drive.z) ** 2 < 28 * 28 && !store.get(qkey(k))) qBump(k); } } else lastX = null; };
loadWeather(); setInterval(() => { loadWeather(); }, 15 * 60e3); setInterval(autoTheme, 60e3); loadFeed(); setInterval(loadFeed, 10 * 60e3);
setTimeout(() => { updQuestBtn(); qCheck(); }, 4000); setInterval(updQuestBtn, 5000);
}

window.__city = { hitStatic, blocked, getDrive: () => drive, CGRID, reRobot, PLAYERS, CRYSTALS, startDrive, cars, recordReel, GOALS, goalSite, specs, B, RP, robotPos, UTIME, labelPool, scene, camera, controls, THREE, signs, carBody, carCab, carLamp, carTail, ownerGroup, stars, beam };
