import React, { useState, useEffect } from "react";
import {
    Calendar, Save, RotateCcw, TrendingUp,
    TrendingDown, Minus, AlertCircle, CheckCircle
} from "lucide-react";

const WeeklyPricingPage = ({ api, isDarkMode }) => {
    // --- State ---
    const [pricing, setPricing] = useState({
        mondayPercent: 1.00,
        tuesdayPercent: 1.00,
        wednesdayPercent: 1.00,
        thursdayPercent: 1.00,
        fridayPercent: 1.00,
        saturdayPercent: 1.00,
        sundayPercent: 1.00
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);

    // Konfiguracja dni
    const daysConfig = [
        { key: "mondayPercent", label: "Poniedziałek" },
        { key: "tuesdayPercent", label: "Wtorek" },
        { key: "wednesdayPercent", label: "Środa" },
        { key: "thursdayPercent", label: "Czwartek" },
        { key: "fridayPercent", label: "Piątek" },
        { key: "saturdayPercent", label: "Sobota", isWeekend: true },
        { key: "sundayPercent", label: "Niedziela", isWeekend: true },
    ];

    // === STYLE DARK MODE ===
    const theme = {
        textPrimary: isDarkMode ? "text-gray-100" : "text-gray-800",
        textSecondary: isDarkMode ? "text-gray-400" : "text-gray-500",
        bgHighlight: isDarkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-800",
        actionPanel: isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200",
        inputBorder: isDarkMode ? "border-gray-600 focus:border-blue-500" : "border-gray-300 focus:border-blue-600",
        inputText: isDarkMode ? "text-white" : "text-gray-800",
        resetBtn: isDarkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-200",
        progressBarBase: isDarkMode ? "bg-gray-700" : "bg-gray-100",
        weekendBadge: isDarkMode ? "bg-purple-900/60 text-purple-200" : "bg-purple-100 text-purple-700"
    };

    // --- Effects ---
    useEffect(() => {
        loadPricing();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Handlers ---
    const loadPricing = async () => {
        try {
            setIsLoading(true);
            const response = await api.get("/WeeklyPricing");
            setPricing(response.data || response);
        } catch (err) {
            console.error("Błąd pobierania harmonogramu:", err);
            setMessage({ type: "error", text: "Nie udało się pobrać ustawień." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            setMessage(null);
            await api.put("/WeeklyPricing", pricing);
            setMessage({ type: "success", text: "Zmiany zostały zapisane pomyślnie." });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            console.error("Błąd zapisu:", err);
            setMessage({ type: "error", text: "Wystąpił błąd podczas zapisu zmian." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (key, value) => {
        setPricing(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleReset = () => {
        if (!window.confirm("Czy na pewno chcesz przywrócić domyślne ceny (1.00) dla wszystkich dni?")) return;
        setPricing({
            mondayPercent: 1.00,
            tuesdayPercent: 1.00,
            wednesdayPercent: 1.00,
            thursdayPercent: 1.00,
            fridayPercent: 1.00,
            saturdayPercent: 1.00,
            sundayPercent: 1.00
        });
    };

    // --- Helpers ---
    const getPercentageChange = (val) => {
        const num = parseFloat(val);
        if (isNaN(num)) return null;
        return Math.round((num - 1) * 100);
    };

    const getIndicator = (val) => {
        const percent = getPercentageChange(val);
        if (percent === null || percent === 0)
            return <div className={`${theme.textSecondary} flex items-center gap-1 text-xs`}><Minus size={14} /> Standard</div>;
        if (percent > 0)
            return <div className={`${isDarkMode ? 'text-green-400' : 'text-green-600'} flex items-center gap-1 text-xs font-bold`}><TrendingUp size={14} /> +{percent}%</div>;
        return <div className={`${isDarkMode ? 'text-red-400' : 'text-red-500'} flex items-center gap-1 text-xs font-bold`}><TrendingDown size={14} /> {percent}%</div>;
    };

    const getCardStyle = (val, isWeekend) => {
        const percent = getPercentageChange(val);
        let borderClass = isDarkMode ? "border-gray-700" : "border-gray-200";
        let bgClass = isDarkMode ? "bg-gray-800" : "bg-white";

        // Modyfikacja kolorów dla Dark Mode (mniej jaskrawe tła)
        if (percent > 0) {
            borderClass = isDarkMode ? "border-green-700 bg-green-900/20" : "border-green-300 bg-green-50/30";
        } else if (percent < 0) {
            borderClass = isDarkMode ? "border-red-700 bg-red-900/20" : "border-red-300 bg-red-50/30";
        }

        const ringClass = isWeekend
            ? (isDarkMode ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-purple-900/50' : 'ring-2 ring-offset-2 ring-purple-50')
            : '';

        return `relative rounded-xl p-4 border-2 transition-all hover:shadow-md ${bgClass} ${borderClass} ${ringClass}`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4">
            {/* Nagłówek */}
            <div className="mb-8">
                <h1 className={`text-3xl font-bold flex items-center gap-3 ${theme.textPrimary}`}>
                    <Calendar className="text-blue-600" size={32} />
                    Harmonogram Cenowy
                </h1>
                <p className={`mt-2 ${theme.textSecondary}`}>
                    Ustaw mnożniki cen dla poszczególnych dni tygodnia.
                    Wartość <span className={`font-mono px-1 rounded ${theme.bgHighlight}`}>1.00</span> oznacza cenę standardową.
                    <br />
                    Np. <span className={`font-mono px-1 rounded ${theme.bgHighlight}`}>1.20</span> to cena wyższa o 20%, a <span className={`font-mono px-1 rounded ${theme.bgHighlight}`}>0.90</span> to rabat 10%.
                </p>
            </div>

            {/* Komunikaty */}
            {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
                        ? (isDarkMode ? 'bg-green-900/40 text-green-300 border border-green-800' : 'bg-green-100 text-green-800')
                        : (isDarkMode ? 'bg-red-900/40 text-red-300 border border-red-800' : 'bg-red-100 text-red-800')
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    {message.text}
                </div>
            )}

            {/* Grid dni tygodnia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {daysConfig.map((day) => (
                    <div key={day.key} className={getCardStyle(pricing[day.key], day.isWeekend)}>
                        {day.isWeekend && (
                            <div className={`absolute top-0 right-0 text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg ${theme.weekendBadge}`}>
                                WEEKEND
                            </div>
                        )}

                        <label className={`block text-sm font-semibold mb-2 uppercase tracking-wide ${theme.textSecondary}`}>
                            {day.label}
                        </label>

                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={pricing[day.key]}
                                onChange={(e) => handleChange(day.key, parseFloat(e.target.value))}
                                className={`w-24 text-2xl font-bold text-center border-b-2 outline-none bg-transparent py-1 ${theme.inputBorder} ${theme.inputText}`}
                            />
                            <div className="flex flex-col justify-center">
                                {getIndicator(pricing[day.key])}
                            </div>
                        </div>

                        {/* Pasek wizualny */}
                        <div className={`mt-4 h-1.5 w-full rounded-full overflow-hidden ${theme.progressBarBase}`}>
                            <div
                                className={`h-full transition-all duration-300 ${getPercentageChange(pricing[day.key]) > 0 ? 'bg-green-500'
                                        : getPercentageChange(pricing[day.key]) < 0 ? 'bg-red-500'
                                            : 'bg-blue-400'
                                    }`}
                                style={{ width: `${Math.min(parseFloat(pricing[day.key] || 0) * 50, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Panel akcji */}
            <div className={`p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 ${theme.actionPanel}`}>
                <button
                    onClick={handleReset}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${theme.resetBtn}`}
                >
                    <RotateCcw size={18} />
                    Przywróć domyślne (1.00)
                </button>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl text-white font-medium shadow-lg transition-all 
                        ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30'}`}
                >
                    <Save size={20} />
                    {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
                </button>
            </div>
        </div>
    );
};

export default WeeklyPricingPage;