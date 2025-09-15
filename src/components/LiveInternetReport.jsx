import { useEffect, useState } from "react";

// Ссылки с total=yes
const sites = [
    "/li/stat/dontr.ru/index.html?period=week&graph=table&total=yes",
    "/li/stat/hsdigital/rn/smi/61/index.html?period=week&graph=table&total=yes",
    "/li/stat/bloknot-rostov.ru/index.html?period=week&graph=table&total=yes",
    "/li/stat/donday.ru/index.html?period=week&graph=table&total=yes",
    "/li/stat/donnews.ru/index.html?period=week&graph=table&total=yes",
    "/li/stat/panram.ru/index.html?period=week&graph=table&total=yes",
    "/li/stat/privet-rostov.ru/index.html?period=week&graph=table&total=yes",
    "/li/stat/rostovgazeta.ru/index.html?period=week&graph=table&total=yes",
    "/li/stat/big-rostov.ru/index.html?period=week&graph=table&total=yes",
];

function parseHTML(html) {
    const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (!preMatch) return [];

    const lines = preMatch[1].split("\n").map((l) => l.trim()).filter(Boolean);
    const dataLines = lines.filter((line) => /^\d|^\d{1,2}\s[а-я]/i.test(line));

    return dataLines.map((line) => {
        const parts = line.split(/\s+/);
        const date = parts[0] + " " + parts[1];
        const views = parseInt(parts[2], 10);
        const visitors = parseInt(parts[3], 10);
        return { date, views, visitors };
    });
}

// Сортировка дат
function sortDates(dates) {
    const monthMap = {
        "янв": 0, "фев": 1, "мар": 2, "апр": 3, "май": 4,
        "июн": 5, "июл": 6, "авг": 7, "сен": 8, "окт": 9,
        "ноя": 10, "дек": 11
    };
    return dates.sort((a, b) => {
        const [aDay, aMonth] = a.split(" ");
        const [bDay, bMonth] = b.split(" ");
        const aDate = new Date(2025, monthMap[aMonth.toLowerCase()], parseInt(aDay));
        const bDate = new Date(2025, monthMap[bMonth.toLowerCase()], parseInt(bDay));
        return aDate - bDate;
    });
}

export default function LiveInternetReport() {
    const [data, setData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [allDates, setAllDates] = useState([]);

    useEffect(() => {
        Promise.all(
            sites.map((url) =>
                fetch(url)
                    .then((res) => res.text())
                    .then((html) => ({
                        site: url
                            .replace("/li/stat/", "")
                            .replace("/index.html?period=week&graph=table&total=yes", ""),
                        stats: parseHTML(html),
                    }))
                    .catch((err) => {
                        console.error("Ошибка парсинга:", url, err);
                        return { site: url, stats: [] };
                    })
            )
        ).then((result) => {
            setData(result);

            const datesSet = new Set();
            result.forEach(({ stats }) => stats.forEach((s) => datesSet.add(s.date)));

            const sortedDates = sortDates(Array.from(datesSet));
            setAllDates(sortedDates);
            setSelectedDate(sortedDates.at(-1));
        });
    }, []);

    // Формируем CSV с разделителем ;
    const csvLines = ["Сайт;Просмотры;Посетители"];

    const csvData = data.map(({ site, stats }) => {
        const s = stats.find((st) => st.date === selectedDate);
        return {
            site,
            views: s ? s.views : 0,
            visitors: s ? s.visitors : 0,
        };
    });

    csvData.sort((a, b) => b.visitors - a.visitors);

    csvData.forEach(({ site, views, visitors }) => {
        const v = views || "-";
        const vis = visitors || "-";
        csvLines.push(`${site};${v};${vis}`);
    });

    const csvString = "\uFEFF" + csvLines.join("\n"); // BOM для Excel

    const downloadCSV = () => {
        if (!selectedDate) return;

        const fileDate = selectedDate.replace(/\s+/g, "-");
        const fileName = `liveinternet_report_${fileDate}.csv`;

        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <h1 className="text-2xl font-bold mb-4">📊 Отчёт LiveInternet по дате</h1>

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

            <button
                onClick={downloadCSV}
                className="mb-6 px-4 py-2 bg-blue-600 text-white rounded shadow"
            >
                ⬇️ Скачать CSV
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {data.map(({ site, stats }) => {
                    const s = stats.find((st) => st.date === selectedDate);
                    return (
                        <div key={site} className="bg-white shadow-lg rounded-2xl p-4">
                            <h2 className="font-semibold text-lg mb-2">{site}</h2>
                            {s ? (
                                <div>
                                    <p>📅 {s.date}</p>
                                    <p>📑 Просмотры: <b>{s.views}</b></p>
                                    <p>👥 Посетители: <b>{s.visitors}</b></p>
                                </div>
                            ) : (
                                <p className="text-gray-500">Нет данных</p>
                            )}
                        </div>
                    );
                })}
            </div>

            <h2 className="text-xl font-semibold mb-2">CSV таблица</h2>
            <textarea
                readOnly
                className="w-full h-64 p-2 border rounded bg-white font-mono"
                value={csvString}
            />
        </div>
    );
}
