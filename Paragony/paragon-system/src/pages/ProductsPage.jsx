import React, { useState, useEffect } from "react";
import {
    Plus, Edit, Trash2, X, Search,
    Tag, Zap, Percent, BarChart3, TrendingUp
} from "lucide-react";

// --- Komponent Modala ---
const ProductModal = ({
    editingProduct,
    handleCloseForm,
    handleSubmit,
    error,
    formData,
    setFormData,
    isLoading,
    isDarkMode // Odbieramy propsa
}) => {
    // Style dla Modala
    const theme = {
        bg: isDarkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800",
        header: isDarkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200",
        input: isDarkMode
            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500"
            : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500",
        label: isDarkMode ? "text-gray-300" : "text-gray-700",
        subText: isDarkMode ? "text-gray-400" : "text-gray-500",
        buttonCancel: isDarkMode ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700",
        checkboxBg: isDarkMode ? "bg-gray-600" : "bg-gray-300"
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className={`rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 ${theme.bg}`}>
                <div className={`flex justify-between items-center p-6 border-b ${theme.header}`}>
                    <h2 className="text-xl font-bold">
                        {editingProduct ? "Edycja produktu" : "Nowy produkt"}
                    </h2>
                    <button onClick={handleCloseForm} type="button" className={`${theme.subText} hover:text-gray-700 transition-colors`}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${theme.label}`}>Nazwa produktu</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={`w-full p-2.5 border rounded-lg focus:ring-2 outline-none transition-all ${theme.input}`}
                            placeholder="np. T-Shirt Bawełniany"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>Cena Aktualna</label>
                            <div className="relative">
                                <span className={`absolute left-3 top-2.5 text-sm ${theme.subText}`}>zł</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    className={`w-full pl-8 p-2.5 border rounded-lg focus:ring-2 outline-none ${theme.input}`}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>Cena Bazowa</label>
                            <div className="relative">
                                <span className={`absolute left-3 top-2.5 text-sm ${theme.subText}`}>zł</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.basePrice}
                                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                                    className={`w-full pl-8 p-2.5 border rounded-lg focus:ring-2 outline-none ${theme.input}`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-center">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>Stawka VAT</label>
                            <div className="relative">
                                <Percent size={16} className={`absolute left-3 top-3 ${theme.subText}`} />
                                <select
                                    value={formData.vatRate}
                                    onChange={(e) => setFormData({ ...formData, vatRate: e.target.value })}
                                    className={`w-full pl-9 p-2.5 border rounded-lg focus:ring-2 outline-none ${theme.input}`}
                                >
                                    <option value="23">23%</option>
                                    <option value="8">8%</option>
                                    <option value="5">5%</option>
                                    <option value="0">0%</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center mt-6">
                            <label className="flex items-center cursor-pointer select-none">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={formData.isDynamicPrice}
                                        onChange={(e) => setFormData({ ...formData, isDynamicPrice: e.target.checked })}
                                    />
                                    <div className={`block w-14 h-8 rounded-full transition-colors ${formData.isDynamicPrice ? 'bg-purple-600' : theme.checkboxBg}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${formData.isDynamicPrice ? 'transform translate-x-6' : ''}`}></div>
                                </div>
                                <div className={`ml-3 font-medium text-sm flex items-center gap-1 ${theme.label}`}>
                                    <Zap size={16} className={formData.isDynamicPrice ? "text-purple-500" : "text-gray-400"} />
                                    Dynamiczna cena
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className={`flex justify-end gap-3 mt-8 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                        <button
                            type="button"
                            onClick={handleCloseForm}
                            className={`px-5 py-2.5 rounded-lg transition-colors font-medium ${theme.buttonCancel}`}
                        >
                            Anuluj
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-lg shadow-blue-500/30"
                        >
                            {isLoading ? "Zapisywanie..." : (editingProduct ? "Zapisz zmiany" : "Dodaj produkt")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ProductsPage = ({ products: initialProducts = [], api, onUpdate, isDarkMode }) => {
    // --- State ---
    const [localProducts, setLocalProducts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [stats, setStats] = useState(null);

    // --- Style Dark Mode dla strony ---
    const theme = {
        textPrimary: isDarkMode ? "text-gray-100" : "text-gray-800",
        textSecondary: isDarkMode ? "text-gray-400" : "text-gray-500",
        card: isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100",
        cardHeader: isDarkMode ? "from-gray-800 to-gray-700 border-gray-700" : "from-white to-gray-50 border-gray-50",
        cardActionBg: isDarkMode ? "bg-gray-900/50" : "bg-gray-50",
        input: isDarkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500" : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500",
        statCard: isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
        statIconBg: (color) => {
            if (!isDarkMode) {
                if (color === 'blue') return 'bg-blue-50';
                if (color === 'green') return 'bg-green-50';
                if (color === 'purple') return 'bg-purple-50';
            } else {
                if (color === 'blue') return 'bg-blue-900/30';
                if (color === 'green') return 'bg-green-900/30';
                if (color === 'purple') return 'bg-purple-900/30';
            }
        },
        statText: (color) => {
            if (!isDarkMode) {
                if (color === 'purple') return 'text-purple-600';
                return 'text-gray-800';
            } else {
                if (color === 'purple') return 'text-purple-400';
                return 'text-white';
            }
        },
        actionBtn: isDarkMode ? "bg-gray-700 border-gray-600 text-gray-300 hover:text-white hover:border-gray-500" : "bg-white border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-300"
    };

    const initialFormState = {
        name: "",
        price: "",
        basePrice: "",
        vatRate: "23",
        isDynamicPrice: false
    };
    const [formData, setFormData] = useState(initialFormState);

    // --- Effects ---
    useEffect(() => {
        setLocalProducts(initialProducts);
    }, [initialProducts]);

    useEffect(() => {
        loadStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localProducts]);

    // --- Helpers ---
    const loadStats = async () => {
        try {
            const response = await api.get("/Products/stats");
            setStats(response.data?.stats || response.data);
        } catch (err) {
            console.warn("Nie udało się pobrać statystyk z API, liczę lokalnie...");
            const total = localProducts.length;
            const dynamicCount = localProducts.filter(p => p.isDynamicPrice).length;
            setStats({
                totalProducts: total,
                averagePrice: 0,
                dynamicPriceCount: dynamicCount
            });
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN'
        }).format(price || 0);
    };

    // --- Handlers ---
    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            price: product.price,
            basePrice: product.basePrice,
            vatRate: product.vatRate,
            isDynamicPrice: product.isDynamicPrice
        });
        setShowForm(true);
        setError(null);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingProduct(null);
        setFormData(initialFormState);
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!formData.name || !formData.price || !formData.basePrice) {
            setError("Nazwa, cena i cena bazowa są wymagane.");
            setIsLoading(false);
            return;
        }

        const payload = {
            name: formData.name,
            price: parseFloat(formData.price),
            basePrice: parseFloat(formData.basePrice),
            vatRate: parseFloat(formData.vatRate),
            isDynamicPrice: formData.isDynamicPrice
        };

        try {
            if (editingProduct) {
                await api.put(`/Products/${editingProduct.id}`, payload);
            } else {
                await api.post("/Products", payload);
            }
            handleCloseForm();
            onUpdate();
        } catch (err) {
            console.error("Błąd zapisu:", err);
            setError(err.response?.data?.message || "Wystąpił błąd podczas zapisu.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Czy na pewno chcesz usunąć ten produkt?")) return;

        try {
            setIsLoading(true);
            await api.delete(`/Products/${id}`);
            onUpdate();
        } catch (err) {
            alert("Błąd usuwania: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredProducts = localProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- Main Render ---
    return (
        <div className="p-4 max-w-7xl mx-auto">
            {/* Statystyki */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className={`p-5 rounded-xl shadow-sm border flex items-center justify-between ${theme.statCard}`}>
                        <div>
                            <div className={`text-sm font-medium mb-1 ${theme.textSecondary}`}>Produkty</div>
                            <div className={`text-2xl font-bold ${theme.statText('default')}`}>{stats.totalProducts}</div>
                        </div>
                        <div className={`p-3 rounded-lg ${theme.statIconBg('blue')}`}><Tag className={isDarkMode ? "text-blue-400" : "text-blue-600"} /></div>
                    </div>

                    <div className={`p-5 rounded-xl shadow-sm border flex items-center justify-between ${theme.statCard}`}>
                        <div>
                            <div className={`text-sm font-medium mb-1 ${theme.textSecondary}`}>Średnia Cena</div>
                            <div className={`text-2xl font-bold ${theme.statText('default')}`}>{formatPrice(stats.averagePrice)}</div>
                        </div>
                        <div className={`p-3 rounded-lg ${theme.statIconBg('green')}`}><BarChart3 className={isDarkMode ? "text-green-400" : "text-green-600"} /></div>
                    </div>

                    <div className={`p-5 rounded-xl shadow-sm border flex items-center justify-between ${theme.statCard}`}>
                        <div>
                            <div className={`text-sm font-medium mb-1 ${theme.textSecondary}`}>Ceny dynamiczne</div>
                            <div className={`text-2xl font-bold ${theme.statText('purple')}`}>{stats.dynamicPriceCount}</div>
                        </div>
                        <div className={`p-3 rounded-lg ${theme.statIconBg('purple')}`}><Zap className={isDarkMode ? "text-purple-400" : "text-purple-600"} /></div>
                    </div>
                </div>
            )}

            {/* Header i Wyszukiwanie */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className={`text-3xl font-bold tracking-tight ${theme.textPrimary}`}>Twoje Produkty</h1>

                <div className="flex w-full md:w-auto gap-3">
                    <div className="relative flex-grow md:flex-grow-0">
                        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme.textSecondary}`} size={18} />
                        <input
                            type="text"
                            placeholder="Szukaj produktu..."
                            className={`pl-10 pr-4 py-2.5 border rounded-xl w-full md:w-64 outline-none shadow-sm ${theme.input}`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-medium whitespace-nowrap"
                    >
                        <Plus size={20} />
                        <span>Dodaj</span>
                    </button>
                </div>
            </div>

            {/* Grid Produktów */}
            {localProducts.length === 0 ? (
                <div className={`text-center py-16 rounded-2xl border-2 border-dashed ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <Tag className={`h-8 w-8 ${theme.textSecondary}`} />
                    </div>
                    <h3 className={`text-lg font-semibold ${theme.textPrimary}`}>Brak produktów</h3>
                    <p className={`mt-1 ${theme.textSecondary}`}>Dodaj swój pierwszy produkt, aby rozpocząć sprzedaż.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
                        <div key={product.id} className={`rounded-2xl shadow-sm border hover:shadow-md transition-all group overflow-hidden ${theme.card}`}>
                            {/* Header karty */}
                            <div className={`p-5 border-b bg-gradient-to-br ${theme.cardHeader}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-bold text-lg truncate pr-2 ${theme.textPrimary}`} title={product.name}>
                                        {product.name}
                                    </h3>
                                    {product.isDynamicPrice && (
                                        <div className={`${isDarkMode ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-700'} p-1.5 rounded-lg`} title="Cena dynamiczna aktywna">
                                            <Zap size={16} />
                                        </div>
                                    )}
                                </div>
                                <div className={`text-xs font-medium inline-block px-2 py-0.5 rounded ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-500'}`}>
                                    VAT {product.vatRate}%
                                </div>
                            </div>

                            {/* Ceny */}
                            <div className="p-5 space-y-3">
                                <div className="flex items-baseline justify-between">
                                    <span className={`text-sm ${theme.textSecondary}`}>Cena aktualna</span>
                                    <span className={`text-2xl font-bold ${theme.textPrimary}`}>{formatPrice(product.price)}</span>
                                </div>

                                <div className={`flex items-center justify-between pt-2 border-t border-dashed ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                    <span className={`text-xs uppercase font-semibold tracking-wider flex items-center gap-1 ${theme.textSecondary}`}>
                                        <TrendingUp size={12} /> Baza
                                    </span>
                                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {formatPrice(product.basePrice)}
                                    </span>
                                </div>
                            </div>

                            {/* Akcje */}
                            <div className={`px-5 py-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${theme.cardActionBg}`}>
                                <button
                                    onClick={() => handleEdit(product)}
                                    className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-lg transition-colors shadow-sm ${theme.actionBtn}`}
                                >
                                    <Edit size={16} /> Edytuj
                                </button>
                                <button
                                    onClick={() => handleDelete(product.id)}
                                    className={`flex items-center justify-center px-3 text-sm rounded-lg transition-colors shadow-sm ${theme.actionBtn.replace('hover:text-blue-600', 'hover:text-red-600').replace('hover:border-blue-300', 'hover:border-red-300')}`}
                                    title="Usuń produkt"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showForm && (
                <ProductModal
                    editingProduct={editingProduct}
                    handleCloseForm={handleCloseForm}
                    handleSubmit={handleSubmit}
                    error={error}
                    formData={formData}
                    setFormData={setFormData}
                    isLoading={isLoading}
                    isDarkMode={isDarkMode}
                />
            )}
        </div>
    );
};

export default ProductsPage;