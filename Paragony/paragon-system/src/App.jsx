import React, { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import ProductsPage from "./pages/ProductsPage";
import TemplatesPage from "./pages/TemplatesPage";
import ReceiptsPage from "./pages/ReceiptsPage";
import PreviewPage from "./pages/PreviewPage";
import AccountPage from "./pages/AccountPage";
import WeeklyPricingPage from "./pages/WeeklyPricingPage";
import useAPI from "./api/useAPI";

import {
    FileText,
    Package,
    Layout,
    Printer,
    User,
    LogOut,
    Calendar,
    Moon, // DODANE: Ikona księżyca
    Sun   // DODANE: Ikona słońca
} from "lucide-react";

const App = () => {
    const getStoredToken = () => {
        try {
            return sessionStorage.getItem("token");
        } catch {
            return null;
        }
    };

    const [token, setToken] = useState(getStoredToken());
    const [currentPage, setCurrentPage] = useState("receipts");
    const [isUnauthorized, setIsUnauthorized] = useState(false);

    // === DARK MODE STATE ===
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Sprawdzenie czy użytkownik ma zapisane preferencje
        try {
            return localStorage.getItem("theme") === "dark";
        } catch {
            return false;
        }
    });

    // Przełączanie motywu
    const toggleDarkMode = () => {
        setIsDarkMode((prev) => {
            const newMode = !prev;
            localStorage.setItem("theme", newMode ? "dark" : "light");
            return newMode;
        });
    };

    // Callback dla automatycznego wylogowania
    const handleAutoLogout = React.useCallback(() => {
        console.log("🚪 handleAutoLogout został wywołany!");
        setIsUnauthorized(true);
    }, []);

    const [products, setProducts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(true);

    const api = useAPI(token, handleAutoLogout);

    // Effect do wylogowania
    useEffect(() => {
        if (isUnauthorized) {
            console.log("🔒 Wylogowywanie użytkownika...");
            try {
                sessionStorage.removeItem("token");
            } catch { }
            setToken(null);
            setIsUnauthorized(false);
            alert("Twoja sesja wygasła. Zaloguj się ponownie.");
        }
    }, [isUnauthorized]);

    useEffect(() => {
        if (token) {
            loadData();
        } else {
            setLoading(false);
        }
    }, [token]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [prod, templ, rec, pay] = await Promise.all([
                api.get("/Products"),
                api.get("/ReceiptTemplates"),
                api.get("/Receipts"),
                api.get("/PaymentMethods"),
            ]);

            setProducts(prod);
            setTemplates(templ);
            setReceipts(rec);
            setPaymentMethods(pay);
        } catch (err) {
            console.error("Błąd ładowania danych:", err);
            if (!err.message?.includes("Token wygasł")) {
                // alert("Błąd ładowania danych: " + err.message);
            }
        }
        setLoading(false);
    };

    const handleLogout = () => {
        try {
            sessionStorage.removeItem("token");
        } catch { }
        setToken(null);
    };

    if (!token) {
        return <LoginPage onLogin={setToken} />;
    }

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}`}>
                <div className="text-xl">Ładowanie...</div>
            </div>
        );
    }

    // Klasy dla nawigacji w zależności od trybu
    const navClass = isDarkMode ? "bg-gray-800 text-gray-100 border-b border-gray-700" : "bg-white text-gray-700 shadow-md";
    const btnBaseClass = "flex items-center space-x-2 px-4 py-2 rounded whitespace-nowrap transition-colors";
    const btnActive = "bg-blue-600 text-white";
    const btnInactive = isDarkMode ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-gray-700";

    const getNavButtonClass = (page) =>
        `${btnBaseClass} ${currentPage === page ? btnActive : btnInactive}`;

    return (
        // Główny kontener z dynamicznym tłem
        <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
            <nav className={navClass}>
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex space-x-4 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                            <button onClick={() => setCurrentPage("receipts")} className={getNavButtonClass("receipts")}>
                                <FileText size={20} />
                                <span>Paragony</span>
                            </button>

                            <button onClick={() => setCurrentPage("products")} className={getNavButtonClass("products")}>
                                <Package size={20} />
                                <span>Produkty</span>
                            </button>

                            <button onClick={() => setCurrentPage("pricing")} className={getNavButtonClass("pricing")}>
                                <Calendar size={20} />
                                <span>Harmonogram</span>
                            </button>

                            <button onClick={() => setCurrentPage("templates")} className={getNavButtonClass("templates")}>
                                <Layout size={20} />
                                <span>Szablony</span>
                            </button>

                            <button onClick={() => setCurrentPage("preview")} className={getNavButtonClass("preview")}>
                                <Printer size={20} />
                                <span>Podgląd</span>
                            </button>

                            <button onClick={() => setCurrentPage("account")} className={getNavButtonClass("account")}>
                                <User size={20} />
                                <span>Konto</span>
                            </button>
                        </div>

                        <div className="flex items-center space-x-4 ml-4">
                            {/* PRZYCISK DARK MODE */}
                            <button
                                onClick={toggleDarkMode}
                                className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                title={isDarkMode ? "Włącz tryb jasny" : "Włącz tryb ciemny"}
                            >
                                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                            </button>

                            <button
                                onClick={handleLogout}
                                className="flex items-center space-x-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded whitespace-nowrap"
                            >
                                <LogOut size={20} />
                                <span>Wyloguj</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Przekazujemy isDarkMode do komponentów potomnych */}

                {currentPage === "receipts" && (
                    <ReceiptsPage
                        receipts={receipts}
                        products={products}
                        templates={templates}
                        paymentMethods={paymentMethods}
                        api={api}
                        onUpdate={loadData}
                        isDarkMode={isDarkMode}
                    />
                )}

                {currentPage === "products" && (
                    <ProductsPage products={products} api={api} onUpdate={loadData} isDarkMode={isDarkMode} />
                )}

                {currentPage === "pricing" && (
                    <WeeklyPricingPage api={api} isDarkMode={isDarkMode} />
                )}

                {currentPage === "templates" && (
                    <TemplatesPage
                        templates={templates}
                        api={api}
                        onUpdate={loadData}
                        isDarkMode={isDarkMode} // PRZEKAZANIE DARK MODE
                    />
                )}

                {currentPage === "preview" && (
                    <PreviewPage receipts={receipts} api={api} isDarkMode={isDarkMode} />
                )}

                {currentPage === "account" && (
                    <AccountPage api={api} onLogout={handleLogout} isDarkMode={isDarkMode} />
                )}
            </div>
        </div>
    );
};

export default App;