import React, { useEffect, useState } from "react";
import { Trash2, Edit, DollarSign, Printer } from "lucide-react";

const ReceiptDetails = ({
    receiptId,
    products,
    templates,
    paymentMethods,
    api,
    onUpdate,
    onPrint,
    onDelete,
    isDarkMode
}) => {
    const [receipt, setReceipt] = useState(null);
    const [items, setItems] = useState([]);
    const [addingProduct, setAddingProduct] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [editingSettings, setEditingSettings] = useState(false);
    const [settingsData, setSettingsData] = useState({
        templateId: "",
        paymentMethodId: "",
        discountPercent: 0
    });

    const theme = {
        card: isDarkMode ? "bg-gray-800 text-gray-100 border border-gray-700" : "bg-white text-gray-900 shadow",
        subCard: isDarkMode ? "bg-gray-700 border border-gray-600" : "bg-gray-50",
        infoBox: isDarkMode ? "bg-blue-900/30 border border-blue-800 text-blue-100" : "bg-blue-50 text-gray-900",
        input: isDarkMode ? "bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:ring-blue-500" : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500",
        listItem: isDarkMode ? "bg-gray-700/50 hover:bg-gray-700 text-gray-100" : "bg-gray-50 hover:bg-gray-100 text-gray-900",
        textSecondary: isDarkMode ? "text-gray-400" : "text-gray-600",
        buttonCancel: isDarkMode ? "bg-gray-600 hover:bg-gray-500 text-white" : "bg-gray-300 hover:bg-gray-400 text-gray-900",
        borderTop: isDarkMode ? "border-gray-700" : "border-gray-200"
    };

    useEffect(() => {
        loadReceipt();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [receiptId]);

    const loadReceipt = async () => {
        try {
            const [rec, itm] = await Promise.all([
                api.get(`/Receipts/${receiptId}?_t=${Date.now()}`),
                api.get(`/ReceiptItems/receipt/${receiptId}?_t=${Date.now()}`)
            ]);
            setReceipt(rec);
            setItems(itm);
            setSettingsData({
                templateId: rec.templateId,
                paymentMethodId: rec.paymentMethodId,
                discountPercent: rec.discountPercent || 0
            });
        } catch (err) {
            console.error("Błąd ładowania paragonu:", err);
        }
    };

    const deleteReceipt = async () => {
        if (!window.confirm("Czy na pewno usunąć ten paragon?")) return;
        try {
            await api.delete(`/Receipts/${receiptId}`);
            alert("Paragon został usunięty");
            if (typeof onDelete === "function") onDelete();
        } catch (err) {
            console.error("Błąd usuwania:", err);
            alert("Błąd: " + (err.message || err));
        }
    };

    // --- DODAWANIE PRODUKTU (Z WYRAŻENIEM MATEMATYCZNYM NA FRONCIE) ---
    const addProduct = async () => {
        const product = products.find(p => p.id === parseInt(selectedProduct));
        if (!product) return alert("Wybierz produkt");

        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) return alert("Nieprawidłowa ilość");

        try {
            // 1. OBLICZAMY NOWĄ SUMĘ NA FRONCIE
            // Pobieramy obecną sumę z paragonu (lub 0)
            const currentTotal = parseFloat(receipt.totalAmount || 0);

            // Obliczamy wartość dodawanego produktu: Cena * Ilość
            let addedValue = product.price * qty;

            // Jeśli paragon ma rabat, musimy go uwzględnić dla nowej pozycji
            // (bo TotalAmount w bazie jest już po rabacie)
            if (receipt.discountPercent > 0) {
                const multiplier = 1 - (receipt.discountPercent / 100);
                addedValue = addedValue * multiplier;
            }

            // Przewidywana nowa suma
            const estimatedNewTotal = currentTotal + addedValue;

            console.log(`🧮 Frontend Math: ${currentTotal} + ${addedValue.toFixed(2)} = ${estimatedNewTotal.toFixed(2)}`);

            // 2. WYSYŁAMY ŻĄDANIA RÓWNOLEGLE LUB SEKWENCYJNIE

            // A. Dodaj pozycję do bazy
            await api.post("/ReceiptItems", {
                receiptId,
                productId: product.id,
                quantity: qty
            });

            // B. Od razu aktualizuj "Zapłacono" naszą wyliczoną kwotą
            await api.put(`/Receipts/${receiptId}/payment`, { paidAmount: estimatedNewTotal });

            // C. Dla porządku wymuś przeliczenie backendowe (zaokrąglenia groszowe)
            await api.post(`/Receipts/${receiptId}/recalculate`, {});

            // 3. Odśwież widok
            setAddingProduct(false);
            setSelectedProduct("");
            setQuantity("1");
            await loadReceipt();

        } catch (err) {
            console.error("Błąd dodawania produktu:", err);
            alert("Błąd: " + (err.message || err));
        }
    };

    // --- USUWANIE PRODUKTU (Z WYRAŻENIEM MATEMATYCZNYM NA FRONCIE) ---
    const removeItem = async (item) => {
        if (receipt.status === 'printed') {
            alert("Nie można usuwać pozycji z wydrukowanego paragonu.");
            return;
        }
        try {
            // 1. OBLICZAMY NOWĄ SUMĘ NA FRONCIE
            const currentTotal = parseFloat(receipt.totalAmount || 0);
            const itemValue = parseFloat(item.totalAmount || 0);

            // Nowa suma to Obecna - Wartość usuwanej pozycji
            // (item.totalAmount w bazie już uwzględnia rabat paragonu, więc po prostu odejmujemy)
            let estimatedNewTotal = currentTotal - itemValue;

            if (estimatedNewTotal < 0) estimatedNewTotal = 0; // Zabezpieczenie

            console.log(`🧮 Frontend Math (Remove): ${currentTotal} - ${itemValue} = ${estimatedNewTotal.toFixed(2)}`);

            // 2. API
            await api.delete(`/ReceiptItems/${item.id}`);

            // Aktualizuj Zapłacono wyliczoną kwotą
            await api.put(`/Receipts/${receiptId}/payment`, { paidAmount: estimatedNewTotal });

            await api.post(`/Receipts/${receiptId}/recalculate`, {});

            // 3. Odśwież
            await loadReceipt();

        } catch (err) {
            console.error("Błąd usuwania pozycji:", err);
            alert("Błąd: " + (err.message || err));
        }
    };

    const setPayment = async () => {
        const defaultAmount = receipt.totalAmount ? receipt.totalAmount.toFixed(2) : "0.00";
        let amountStr = window.prompt("Kwota zapłacona:", defaultAmount);

        if (amountStr === null) return;

        amountStr = amountStr.replace(',', '.');
        const amount = parseFloat(amountStr);

        if (isNaN(amount)) {
            alert("Nieprawidłowa kwota! Wpisz liczbę.");
            return;
        }

        try {
            await api.put(`/Receipts/${receiptId}/payment`, { paidAmount: amount });
            await api.post(`/Receipts/${receiptId}/recalculate`, {});
            await loadReceipt();
        } catch (err) {
            console.error("Błąd zapisu płatności:", err);
            alert("Błąd: " + (err.message || err));
        }
    };

    const updateSettings = async () => {
        try {
            // 1. Zapisz ustawienia
            await api.put(`/Receipts/${receiptId}`, {
                ...receipt,
                templateId: parseInt(settingsData.templateId),
                paymentMethodId: parseInt(settingsData.paymentMethodId),
                discountPercent: parseFloat(settingsData.discountPercent)
            });

            // 2. Zapisz rabat
            const discountValue = parseFloat(settingsData.discountPercent) || 0;
            await api.put(`/Receipts/${receiptId}/discount`, { discountPercent: discountValue });

            // 3. Przelicz backend
            await api.post(`/Receipts/${receiptId}/recalculate`, {});

            // 4. Tutaj trudniej wyliczyć na froncie zmianę rabatu, 
            // więc pobieramy świeżą sumę z backendu i ją ustawiamy jako zapłacono.
            // Ponieważ recalculate poszło wcześniej, powinno być ok, ale dla pewności:
            const tempReceipt = await api.get(`/Receipts/${receiptId}?_t=${Date.now()}`);

            // Automatyczne wyrównanie po zmianie rabatu
            if (tempReceipt && tempReceipt.totalAmount && tempReceipt.status !== 'printed') {
                await api.put(`/Receipts/${receiptId}/payment`, { paidAmount: tempReceipt.totalAmount });
            }

            setEditingSettings(false);
            await loadReceipt();

            if (typeof onUpdate === "function") onUpdate();
        } catch (err) {
            console.error("Błąd aktualizacji ustawień:", err);
            alert("Błąd: " + (err.message || err));
        }
    };

    if (!receipt) return <div className={isDarkMode ? "text-white" : "text-black"}>Ładowanie...</div>;

    return (
        <div className={`rounded-lg p-6 ${theme.card}`}>
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold">Paragon {receipt.receiptNumber}</h2>
                <div className="flex flex-wrap gap-2">
                    <button onClick={deleteReceipt} className="bg-red-600 text-white px-3 py-2 rounded flex items-center space-x-2 hover:bg-red-700 text-sm">
                        <Trash2 size={16} /><span>Usuń</span>
                    </button>

                    <button onClick={() => setEditingSettings(!editingSettings)} className="bg-purple-600 text-white px-3 py-2 rounded flex items-center space-x-2 hover:bg-purple-700 text-sm">
                        <Edit size={16} /><span>Ustawienia</span>
                    </button>

                    <button onClick={setPayment} className="bg-green-600 text-white px-3 py-2 rounded flex items-center space-x-2 hover:bg-green-700 text-sm">
                        <DollarSign size={16} /><span>Płatność</span>
                    </button>

                    <button onClick={() => onPrint(receiptId)} className="bg-blue-600 text-white px-3 py-2 rounded flex items-center space-x-2 hover:bg-blue-700 text-sm">
                        <Printer size={16} /><span>Drukuj</span>
                    </button>
                </div>
            </div>

            {/* EDYCJA USTAWIEŃ */}
            {editingSettings && (
                <div className={`p-4 rounded mb-6 ${theme.subCard}`}>
                    <h3 className="font-bold mb-3">Ustawienia paragonu</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.textSecondary}`}>Szablon</label>
                            <select
                                value={settingsData.templateId}
                                onChange={(e) => setSettingsData({ ...settingsData, templateId: e.target.value })}
                                className={`w-full px-3 py-2 border rounded outline-none ${theme.input}`}
                            >
                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.textSecondary}`}>Metoda płatności</label>
                            <select
                                value={settingsData.paymentMethodId}
                                onChange={(e) => setSettingsData({ ...settingsData, paymentMethodId: e.target.value })}
                                className={`w-full px-3 py-2 border rounded outline-none ${theme.input}`}
                            >
                                {paymentMethods.map(pm => <option key={pm.id} value={pm.id}>{pm.displayName || pm.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.textSecondary}`}>Rabat (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={settingsData.discountPercent}
                                onChange={(e) => setSettingsData({ ...settingsData, discountPercent: e.target.value })}
                                className={`w-full px-3 py-2 border rounded outline-none ${theme.input}`}
                            />
                        </div>
                    </div>

                    <div className="flex space-x-2 mt-4">
                        <button onClick={updateSettings} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Zapisz</button>
                        <button onClick={() => setEditingSettings(false)} className={`px-4 py-2 rounded transition-colors ${theme.buttonCancel}`}>Anuluj</button>
                    </div>
                </div>
            )}

            {/* INFO PANEL */}
            <div className={`p-3 rounded mb-4 text-sm ${theme.infoBox}`}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div><span className="font-medium opacity-75">Szablon:</span> {receipt.template?.name || "Brak"}</div>
                    <div><span className="font-medium opacity-75">Płatność:</span> {receipt.paymentMethod?.displayName || receipt.paymentMethod?.name || "Brak"}</div>
                    <div><span className="font-medium opacity-75">Status:</span> <span className={receipt.status === "printed" ? "text-green-500 font-bold" : "text-yellow-500 font-bold"}>{receipt.status}</span></div>
                    <div><span className="font-medium opacity-75">Data:</span> {new Date(receipt.createdAt).toLocaleDateString("pl-PL")}</div>
                </div>
            </div>

            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Produkty</h3>
                    <button onClick={() => setAddingProduct(true)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors">+ Dodaj</button>
                </div>

                {/* FORMULARZ DODAWANIA PRODUKTU */}
                {addingProduct && (
                    <div className={`p-4 rounded mb-4 ${theme.subCard}`}>
                        <select
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            className={`w-full px-3 py-2 border rounded mb-2 outline-none ${theme.input}`}
                        >
                            <option value="">Wybierz produkt</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name} - {p.price?.toFixed(2)} zł</option>)}
                        </select>

                        <input
                            type="number"
                            step="0.01"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="Ilość"
                            className={`w-full px-3 py-2 border rounded mb-2 outline-none ${theme.input}`}
                        />

                        <div className="flex space-x-2">
                            <button onClick={addProduct} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Dodaj</button>
                            <button onClick={() => setAddingProduct(false)} className={`px-4 py-2 rounded transition-colors ${theme.buttonCancel}`}>Anuluj</button>
                        </div>
                    </div>
                )}

                {/* LISTA PRODUKTÓW */}
                <div className="space-y-2">
                    {items.map(item => (
                        <div key={item.id} className={`flex justify-between items-center p-3 rounded transition-colors ${theme.listItem}`}>
                            <div>
                                <div className="font-medium">{item.name || item.productName}</div>
                                <div className={`text-sm ${theme.textSecondary}`}>
                                    {item.quantity} × {item.unitPrice?.toFixed(2)} zł (VAT {item.vatRate}%)
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                <div className="font-bold">{item.totalAmount?.toFixed(2)} zł</div>
                                <button onClick={() => removeItem(item)} className="text-red-500 hover:text-red-700 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className={`text-center py-4 ${theme.textSecondary}`}>Brak produktów na paragonie</div>
                    )}
                </div>
            </div>

            {/* PODSUMOWANIE */}
            <div className={`border-t pt-4 ${theme.borderTop}`}>
                <div className="flex justify-between text-lg mb-2">
                    <span className={theme.textSecondary}>Suma:</span>
                    <span className="font-bold text-xl">{receipt.totalAmount?.toFixed(2)} zł</span>
                </div>

                <div className={`flex justify-between text-sm mb-2 ${theme.textSecondary}`}>
                    <span>VAT:</span>
                    <span>{receipt.totalVat?.toFixed(2)} zł</span>
                </div>

                {receipt.discountPercent > 0 && receipt.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-orange-500 mb-2">
                        <span>Rabat ({receipt.discountPercent}%):</span>
                        <span>-{receipt.discountAmount?.toFixed(2)} zł</span>
                    </div>
                )}

                <div className={`flex justify-between text-sm mb-2 ${theme.textSecondary}`}>
                    <span>Zapłacono:</span>
                    <span>{receipt.paidAmount?.toFixed(2)} zł</span>
                </div>

                {receipt.changeAmount > 0 && (
                    <div className="flex justify-between text-lg text-green-500 font-bold mt-2">
                        <span>Reszta:</span>
                        <span>{receipt.changeAmount?.toFixed(2)} zł</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReceiptDetails;