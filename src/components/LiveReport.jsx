import { useEffect, useState } from "react";

// Конфигурация сайтов - базовые URL без параметров
const sites = [
    "/li/stat/dontr.ru/index.html",
    "/li/stat/hsdigital/rn/smi/61/index.html",
    "/li/stat/bloknot-rostov.ru/index.html",
    "/li/stat/donday.ru/index.html",
    "/li/stat/donnews.ru/index.html",
    "/li/stat/panram.ru/index.html",
    "/li/stat/privet-rostov.ru/index.html",
    "/li/stat/rostovgazeta.ru/index.html",
    "/li/stat/big-rostov.ru/index.html",
    "/li/stat/don24.ru/index.html",
];

/**
 * Универсальная функция для парсинга HTML с данными LiveInternet
 * Работает как с недельными (period=week), так и с месячными (period=month) отчетами
 */
function parseHTML(html) {
    console.log("Начинаю парсинг HTML, длина:", html.length);

    // Ищем содержимое внутри тега <pre> - там находятся данные статистики
    const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (!preMatch) {
        console.log("Тег <pre> не найден в HTML");
        return [];
    }

    const preContent = preMatch[1];
    console.log("Содержимое <pre> найдено, длина:", preContent.length);

    // Разбиваем содержимое на строки, убираем пустые строки и лишние пробелы
    const lines = preContent.split("\n").map((l) => l.trim()).filter(Boolean);
    console.log("Общее количество строк:", lines.length);

    // Фильтруем строки с данными
    // Для period=week: строки вида "16 дек 1234 567" 
    // Для period=month: строки вида "Мар 23    1787096   592185"
    const dataLines = lines.filter((line) => {
        // Ищем строки с датами (начинаются с цифры или русской буквы)
        return /^\d/.test(line) || /^[а-яё]/iu.test(line);
    });

    console.log("Найдено строк с данными:", dataLines.length);
    console.log("Примеры строк:", dataLines.slice(0, 3));

    // Парсим каждую строку и извлекаем дату, просмотры и посетителей
    return dataLines.map((line, index) => {
        // Разбиваем строку по пробелам и табам, убираем пустые элементы
        const parts = line.split(/\s+/).filter(Boolean);
        console.log(`Обрабатываю строку ${index}:`, parts);

        if (parts.length < 3) {
            console.log("Недостаточно данных в строке:", line);
            return null;
        }

        let date, views, visitors;

        // Определяем формат даты и парсим соответственно
        if (/^\d{1,2}$/.test(parts[0]) && /^[а-яё]/iu.test(parts[1])) {
            // Недельный формат (period=week): "16 дек 1234 567"
            date = parts[0] + " " + parts[1]; // "16 дек"
            views = parseInt(parts[2], 10) || 0; // 1234
            visitors = parseInt(parts[3], 10) || 0; // 567
        } else if (/^[а-яё]/iu.test(parts[0])) {
            // Месячный формат (period=month): "Мар 23 1787096 592185"
            if (/^\d{2}$/.test(parts[1])) {
                // Формат с двузначным годом: "Мар 23 1787096 592185"
                date = parts[0] + " " + parts[1]; // "Мар 23"
                views = parseInt(parts[2], 10) || 0; // 1787096
                visitors = parseInt(parts[3], 10) || 0; // 592185
            } else if (/^\d{4}$/.test(parts[1])) {
                // Формат с четырехзначным годом: "дек 2024 1234 567"
                date = parts[0] + " " + parts[1]; // "дек 2024"
                views = parseInt(parts[2], 10) || 0; // 1234
                visitors = parseInt(parts[3], 10) || 0; // 567
            } else {
                // Без года: "декабрь 1234 567"
                date = parts[0]; // "декабрь"
                views = parseInt(parts[1], 10) || 0; // 1234
                visitors = parseInt(parts[2], 10) || 0; // 567
            }
        } else {
            // Fallback: если формат неожиданный
            date = parts[0];
            views = parseInt(parts[1], 10) || 0;
            visitors = parseInt(parts[2], 10) || 0;
        }

        return { date, views, visitors };
    }).filter(Boolean); // Убираем null значения
}

/**
 * Функция для правильной сортировки русских дат
 * Поддерживает как недельные ("16 дек"), так и месячные ("дек 2024") форматы
 */
function sortDates(dates, isMonthly = false) {
    // Словарь для перевода русских месяцев в числа (0-11)
    const monthMap = {
        "янв": 0, "январь": 0, "января": 0,
        "фев": 1, "февраль": 1, "февраля": 1,
        "мар": 2, "март": 2, "марта": 2,
        "апр": 3, "апрель": 3, "апреля": 3,
        "май": 4, "мая": 4,
        "июн": 5, "июнь": 5, "июня": 5,
        "июл": 6, "июль": 6, "июля": 6,
        "авг": 7, "август": 7, "августа": 7,
        "сен": 8, "сентябрь": 8, "сентября": 8,
        "окт": 9, "октябрь": 9, "октября": 9,
        "ноя": 10, "ноябрь": 10, "ноября": 10,
        "дек": 11, "декабрь": 11, "декабря": 11
    };

    return dates.sort((a, b) => {
        if (isMonthly) {
            // Для месячных данных: "Мар 23", "дек 2024" или просто "дек"
            const aParts = a.split(" ");
            const bParts = b.split(" ");

            const aMonth = monthMap[aParts[0]?.toLowerCase()] ?? 0;
            const bMonth = monthMap[bParts[0]?.toLowerCase()] ?? 0;

            let aYear, bYear;
            if (aParts[1]) {
                // Если есть год в данных
                const yearNum = parseInt(aParts[1]);
                if (yearNum < 50) {
                    // Двузначный год 00-49 = 2000-2049
                    aYear = 2000 + yearNum;
                } else if (yearNum < 100) {
                    // Двузначный год 50-99 = 1950-1999
                    aYear = 1900 + yearNum;
                } else {
                    // Четырехзначный год
                    aYear = yearNum;
                }
            } else {
                aYear = 2025; // По умолчанию текущий год
            }

            if (bParts[1]) {
                const yearNum = parseInt(bParts[1]);
                if (yearNum < 50) {
                    bYear = 2000 + yearNum;
                } else if (yearNum < 100) {
                    bYear = 1900 + yearNum;
                } else {
                    bYear = yearNum;
                }
            } else {
                bYear = 2025;
            }

            // Сначала сравниваем год, потом месяц
            if (aYear !== bYear) return aYear - bYear;
            return aMonth - bMonth;
        } else {
            // Для недельных данных: "16 дек"
            const [aDay, aMonth] = a.split(" ");
            const [bDay, bMonth] = b.split(" ");

            if (!aMonth || !bMonth) return 0;

            const aDate = new Date(2025, monthMap[aMonth.toLowerCase()] ?? 0, parseInt(aDay) || 1);
            const bDate = new Date(2025, monthMap[bMonth.toLowerCase()] ?? 0, parseInt(bDay) || 1);
            return aDate - bDate;
        }
    });
}

/**
 * Компонент навигации с переключением между недельными и месячными отчетами
 */
function Navigation({ currentPeriod, onPeriodChange }) {
    return (
        <nav className="bg-white shadow-lg mb-6">
            <div className="max-w-6xl mx-auto px-4">
                <div className="flex justify-between items-center py-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-2xl">📈</span>
                        <h1 className="text-xl font-bold text-gray-800">LiveInternet Analytics</h1>
                    </div>

                    <div className="flex space-x-1">
                        <button
                            onClick={() => onPeriodChange('week')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${currentPeriod === 'week'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <span>📅</span>
                            <span>Недельный отчет</span>
                        </button>

                        <button
                            onClick={() => onPeriodChange('month')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${currentPeriod === 'month'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <span>📊</span>
                            <span>Месячный отчет</span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}

/**
 * Главный компонент приложения
 * Управляет состоянием периода и отображает соответствующий отчет
 */
export default function LiveInternetReport() {
    // Основные состояния приложения
    const [period, setPeriod] = useState('week'); // Текущий период: 'week' или 'month'
    const [data, setData] = useState([]); // Данные всех сайтов
    const [selectedDate, setSelectedDate] = useState(null); // Выбранная дата для отображения
    const [allDates, setAllDates] = useState([]); // Все доступные даты
    const [loading, setLoading] = useState(true); // Состояние загрузки
    const [error, setError] = useState(null); // Ошибки загрузки

    const isMonthly = period === 'month';
    const title = period === 'week' ? 'Отчёт LiveInternet недельный' : 'Отчёт LiveInternet месячный';

    // Функция загрузки данных при изменении периода
    useEffect(() => {
        setLoading(true);
        setError(null);

        console.log("Загружаю данные для периода:", period);

        // Создаем URL с нужным query параметром period
        const urlsWithParams = sites.map(url =>
            `${url}?period=${period}&graph=table&total=yes`
        );

        // Параллельно загружаем данные со всех сайтов
        Promise.all(
            urlsWithParams.map((url) =>
                fetch(url)
                    .then((res) => {
                        console.log(`Ответ от ${url}: статус ${res.status}`);
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return res.text();
                    })
                    .then((html) => ({
                        // Извлекаем название сайта из URL (убираем путь и параметры)
                        site: url
                            .replace("/li/stat/", "")
                            .replace("/index.html", "")
                            .split("?")[0],
                        stats: parseHTML(html), // Парсим HTML в структурированные данные
                    }))
                    .catch((err) => {
                        console.error("Ошибка загрузки:", url, err);
                        return {
                            site: url.replace("/li/stat/", "").replace("/index.html", "").split("?")[0],
                            stats: [] // Пустой массив при ошибке
                        };
                    })
            )
        ).then((result) => {
            console.log("Все результаты загружены:", result);
            setData(result);

            // Собираем все уникальные даты со всех сайтов
            const datesSet = new Set();
            result.forEach(({ stats }) => {
                stats.forEach((s) => {
                    if (s.date) datesSet.add(s.date);
                });
            });

            // Сортируем даты и выбираем последнюю по умолчанию
            const sortedDates = sortDates(Array.from(datesSet), isMonthly);
            console.log("Отсортированные даты:", sortedDates);

            setAllDates(sortedDates);
            setSelectedDate(sortedDates.at(-1) || null);
            setLoading(false);
        }).catch((err) => {
            console.error("Глобальная ошибка:", err);
            setError(err.message);
            setLoading(false);
        });
    }, [period, isMonthly]); // Перезагружаем данные при изменении периода

    // Обработчик изменения периода
    const handlePeriodChange = (newPeriod) => {
        if (newPeriod !== period) {
            setPeriod(newPeriod);
        }
    };

    // Генерация CSV данных для выбранной даты
    const csvLines = ["Сайт;Просмотры;Посетители"];

    const csvData = data.map(({ site, stats }) => {
        const s = stats.find((st) => st.date === selectedDate);
        return {
            site,
            views: s ? s.views : 0,
            visitors: s ? s.visitors : 0,
        };
    });

    // Сортируем сайты по количеству посетителей (по убыванию)
    csvData.sort((a, b) => b.visitors - a.visitors);

    // Формируем строки CSV
    csvData.forEach(({ site, views, visitors }) => {
        const v = views || "-";
        const vis = visitors || "-";
        csvLines.push(`${site};${v};${vis}`);
    });

    // Добавляем BOM для корректного отображения кириллицы в Excel
    const csvString = "\uFEFF" + csvLines.join("\n");

    // Функция скачивания CSV файла
    const downloadCSV = () => {
        if (!selectedDate) return;

        const fileDate = selectedDate.replace(/\s+/g, "-");
        const fileName = `liveinternet_${period}_report_${fileDate}.csv`;

        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Отображение состояния загрузки
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100">
                <Navigation currentPeriod={period} onPeriodChange={handlePeriodChange} />
                <div className="p-6">
                    <div className="flex items-center justify-center">
                        <div className="text-xl">⏳ Загрузка данных...</div>
                    </div>
                </div>
            </div>
        );
    }

    // Отображение ошибок
    if (error) {
        return (
            <div className="min-h-screen bg-gray-100">
                <Navigation currentPeriod={period} onPeriodChange={handlePeriodChange} />
                <div className="p-6">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        <strong>Ошибка загрузки:</strong> {error}
                        <br />
                        <button
                            onClick={() => handlePeriodChange(period)}
                            className="mt-2 text-red-600 underline"
                        >
                            Попробовать снова
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Основное отображение приложения
    return (
        <div className="min-h-screen bg-gray-100">
            <Navigation currentPeriod={period} onPeriodChange={handlePeriodChange} />

            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">📊 {title}</h1>

                {/* Селектор даты */}
                {allDates.length > 0 && (
                    <div className="mb-6">
                        <label className="mr-2 font-semibold">Выберите дату:</label>
                        <select
                            className="p-2 border rounded shadow bg-white"
                            value={selectedDate || ""}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        >
                            {allDates.map((date) => (
                                <option key={date} value={date}>
                                    {date}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Кнопка скачивания CSV */}
                <button
                    onClick={downloadCSV}
                    className="mb-6 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 disabled:bg-gray-400"
                    disabled={!selectedDate}
                >
                    ⬇️ Скачать CSV
                </button>

                {/* Карточки сайтов */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {data.map(({ site, stats }) => {
                        const s = stats.find((st) => st.date === selectedDate);
                        return (
                            <div key={site} className="bg-white shadow-lg rounded-2xl p-4">
                                <h2 className="font-semibold text-lg mb-2">{site}</h2>
                                {s ? (
                                    <div>
                                        <p>📅 {s.date}</p>
                                        <p>📑 Просмотры: <b>{s.views.toLocaleString()}</b></p>
                                        <p>👥 Посетители: <b>{s.visitors.toLocaleString()}</b></p>
                                    </div>
                                ) : (
                                    <p className="text-gray-500">Нет данных</p>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Развертываемая секция с CSV данными */}
                <details className="mb-4">
                    <summary className="cursor-pointer text-xl font-semibold mb-2">
                        📋 Показать CSV данные
                    </summary>
                    <textarea
                        readOnly
                        className="w-full h-64 p-2 border rounded bg-white font-mono text-sm"
                        value={csvString}
                    />
                </details>
            </div>
        </div>
    );
}