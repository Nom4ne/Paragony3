import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import ReceiptDetails from "../components/ReceiptDetails";

const ReceiptsPage = ({ products, templates, paymentMethods, api, onUpdate, isDarkMode }) => {
    const [receipts, setReceipts] = useState([]);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [stats, setStats] = useState(null);

    // PAGINACJA
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [showNewReceiptForm, setShowNewReceiptForm] = useState(false);
    const [newReceiptData, setNewReceiptData] = useState({
        templateId: "",
        paymentMethodId: "",
        discountPercent: ""
    });

    // === DEFINICJA STYLÓW DARK MODE ===
    const theme = {
        card: isDarkMode ? "bg-gray-800 text-white shadow-lg border border-gray-700" : "bg-white text-gray-900 shadow",
        subCard: isDarkMode ? "bg-gray-700 border border-gray-600" : "bg-gray-50",
        textSecondary: isDarkMode ? "text-gray-400" : "text-gray-600",
        input: isDarkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500" : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500",
        buttonNeutral: isDarkMode ? "bg-gray-700 hover:bg-gray-600 text-white disabled:bg-gray-800 disabled:text-gray-600" : "bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:opacity-50",
        buttonCancel: isDarkMode ? "bg-gray-600 hover:bg-gray-500 text-white" : "bg-gray-300 hover:bg-gray-400 text-gray-900",
        // Kolory statystyk (jaśniejsze dla dark mode)
        statGreen: isDarkMode ? "text-green-400" : "text-green-600",
        statPurple: isDarkMode ? "text-purple-400" : "text-purple-600",
        statBlue: isDarkMode ? "text-blue-400" : "text-blue-600",
        statYellow: isDarkMode ? "text-yellow-400" : "text-yellow-600",
        // Lista paragonów
        listItemActive: isDarkMode ? "bg-blue-900/40 border-blue-500" : "bg-blue-100 border-blue-500",
        listItemInactive: isDarkMode ? "bg-gray-700 hover:bg-gray-600 border border-gray-600" : "bg-gray-50 hover:bg-gray-100 border border-transparent"
    };

    // 🔥 Pobiera paragony z paginacją
    const loadReceipts = async () => {
        try {
            const data = await api.get(`/Receipts/list?page=${page}&pageSize=${pageSize}`);

            setReceipts(data.items || data || []);
            setTotalPages(data.totalPages || 1);
            setTotalCount(data.totalCount || data.items?.length || 0);
        } catch (err) {
            console.error("Błąd ładowania paragonów:", err);
        }
    };

    // 🔥 Ładuje paragony przy zmianie strony
    useEffect(() => {
        loadReceipts();
    }, [page]);

    // 🔥 Statystyki
    const loadStats = async () => {
        try {
            const response = await api.get("/Receipts/stats");
            const statsData = response.stats || response;

            setStats({
                totalReceipts: statsData.totalReceipts,
                totalSales: statsData.totalAmount,
                printedCount: statsData.printedCount,
                draftCount: statsData.draftCount,
                readyCount: statsData.readyCount,
                averageAmount: statsData.averageAmount
            });
        } catch (err) {
            console.error("Błąd pobierania statystyk:", err);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    // 🔥 Tworzenie nowego paragonu
    const createNewReceipt = async () => {
        try {
            const data = await api.post("/Receipts", {
                templateId: parseInt(newReceiptData.templateId) || templates[0]?.id,
                paymentMethodId: parseInt(newReceiptData.paymentMethodId) || paymentMethods[0]?.id,
                totalAmount: 0,
                totalVat: 0,
                paidAmount: 0,
                changeAmount: 0,
                discountPercent: parseFloat(newReceiptData.discountPercent) || 0,
                discountAmount: 0,
                status: "draft"
            });

            setSelectedReceipt(data.id);
            setShowNewReceiptForm(false);
            onUpdate();
            loadReceipts();
            loadStats();
        } catch (err) {
            console.error("Błąd tworzenia paragonu:", err);
        }
    };

    // 🔥 Drukowanie
    const printReceipt = async (id) => {
        try {
            await api.post(`/Receipts/${id}/recalculate`, {});
            await api.put(`/Receipts/${id}/status`, { status: "printed" });
            await api.post(`/Print/receipt/${id}`, {});
            alert("Paragon wysłany do druku!");
            onUpdate();
            loadReceipts();
            loadStats();
        } catch (err) {
            console.error("Błąd drukowania:", err);
        }
    };

    return (
        <div>
            {/* STATYSTYKI */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className={`p-4 rounded-lg ${theme.card}`}>
                        <div className={`text-sm ${theme.textSecondary}`}>Wszystkie paragony</div>
                        <div className="text-2xl font-bold">{stats.totalReceipts}</div>
                    </div>
                    <div className={`p-4 rounded-lg ${theme.card}`}>
                        <div className={`text-sm ${theme.textSecondary}`}>Suma sprzedaży</div>
                        <div className={`text-2xl font-bold ${theme.statGreen}`}>{stats.totalSales.toFixed(2)} zł</div>
                    </div>
                    <div className={`p-4 rounded-lg ${theme.card}`}>
                        <div className={`text-sm ${theme.textSecondary}`}>Średnia wartość</div>
                        <div className={`text-2xl font-bold ${theme.statPurple}`}>{stats.averageAmount.toFixed(2)} zł</div>
                    </div>
                    <div className={`p-4 rounded-lg ${theme.card}`}>
                        <div className={`text-sm ${theme.textSecondary}`}>Wydrukowane</div>
                        <div className={`text-2xl font-bold ${theme.statBlue}`}>{stats.printedCount}</div>
                    </div>
                    <div className={`p-4 rounded-lg ${theme.card}`}>
                        <div className={`text-sm ${theme.textSecondary}`}>Robocze</div>
                        <div className={`text-2xl font-bold ${theme.statYellow}`}>{stats.draftCount}</div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEWA KOLUMNA */}
                <div className="lg:col-span-1">
                    <div className={`rounded-lg p-4 ${theme.card}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Paragony</h2>
                            <button onClick={() => setShowNewReceiptForm(!showNewReceiptForm)} className="bg-green-600 text-white p-2 rounded hover:bg-green-700">
                                <Plus size={16} />
                            </button>
                        </div>

                        {/* NOWY PARAGON */}
                        {showNewReceiptForm && (
                            <div className={`mb-4 p-3 rounded ${theme.subCard}`}>
                                <h3 className="font-bold mb-2">Nowy paragon</h3>

                                <div className="space-y-2">
                                    <select
                                        value={newReceiptData.templateId}
                                        onChange={(e) => setNewReceiptData({ ...newReceiptData, templateId: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded text-sm outline-none ${theme.input}`}
                                    >
                                        <option value="">Wybierz szablon</option>
                                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>

                                    <select
                                        value={newReceiptData.paymentMethodId}
                                        onChange={(e) => setNewReceiptData({ ...newReceiptData, paymentMethodId: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded text-sm outline-none ${theme.input}`}
                                    >
                                        <option value="">Wybierz płatność</option>
                                        {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.displayName || pm.name}</option>)}
                                    </select>

                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Rabat %"
                                        value={newReceiptData.discountPercent}
                                        onChange={(e) => setNewReceiptData({ ...newReceiptData, discountPercent: e.target.value })}
                                        className={`w-full px-3 py-2 border rounded text-sm outline-none ${theme.input}`}
                                    />

                                    <div className="flex space-x-2">
                                        <button onClick={createNewReceipt} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Utwórz</button>
                                        <button onClick={() => setShowNewReceiptForm(false)} className={`px-3 py-1 rounded text-sm transition-colors ${theme.buttonCancel}`}>Anuluj</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* LISTA PARAGONÓW */}
                        <div className="space-y-2">
                            {receipts.map(r => (
                                <div
                                    key={r.id}
                                    onClick={() => setSelectedReceipt(r.id)}
                                    className={`p-3 rounded cursor-pointer border-2 transition-colors ${selectedReceipt === r.id ? theme.listItemActive : theme.listItemInactive
                                        }`}
                                >
                                    <div className="font-bold">{r.receiptNumber}</div>
                                    <div className={`text-sm ${theme.textSecondary}`}>{r.totalAmount?.toFixed(2)} zł</div>
                                    <div className={`text-xs ${r.status === "printed" ? theme.statGreen : theme.statYellow}`}>{r.status}</div>
                                </div>
                            ))}
                        </div>

                        {/* PAGINACJA */}
                        <div className="flex justify-center mt-4 space-x-2">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(page - 1)}
                                className={`px-3 py-1 rounded transition-colors ${theme.buttonNeutral}`}
                            >
                                ◀ Poprzednia
                            </button>

                            <span className="px-3 py-1">
                                Strona {page} / {totalPages}
                            </span>

                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(page + 1)}
                                className={`px-3 py-1 rounded transition-colors ${theme.buttonNeutral}`}
                            >
                                Następna ▶
                            </button>
                        </div>
                    </div>
                </div>

                {/* PRAWA KOLUMNA */}
                <div className="lg:col-span-2">
                    {selectedReceipt ? (
                        <ReceiptDetails
                            receiptId={selectedReceipt}
                            products={products}
                            templates={templates}
                            paymentMethods={paymentMethods}
                            api={api}
                            onUpdate={() => {
                                loadReceipts();
                                loadStats();
                            }}
                            onPrint={printReceipt}
                            isDarkMode={isDarkMode} // PRZEKAZUJEMY DARK MODE DALEJ
                        />
                    ) : (
                        <div className={`rounded-lg shadow p-8 text-center h-full flex items-center justify-center ${theme.card} ${theme.textSecondary}`}>
                            Wybierz paragon z listy lub utwórz nowy
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReceiptsPage;