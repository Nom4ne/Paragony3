import React, { useState, useEffect } from 'react';
import { ShoppingCart, FileText, Plus, Trash2, Edit, Printer, LogOut, User, DollarSign, Package, Layout } from 'lucide-react';

const API_URL = 'https://localhost:7228/api';

// Komponent logowania
const LoginPage = ({ onLogin }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        nip: '',
        address: '',
        city: '',
        postalCode: '',
        phone: ''
    });
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState({});

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validatePhone = (phone) => {
        const re = /^\+48\d{9}$/;
        return re.test(phone);
    };

    const validateNIP = (nip) => {
        const re = /^\d{10}$/;
        return re.test(nip);
    };

    const validatePostalCode = (code) => {
        const re = /^\d{2}-\d{3}$/;
        return re.test(code);
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.email) {
            errors.email = 'Email jest wymagany';
        } else if (!validateEmail(formData.email)) {
            errors.email = 'Nieprawidłowy format email';
        }

        if (!formData.password || formData.password.length < 6) {
            errors.password = 'Hasło musi mieć min. 6 znaków';
        }

        if (isRegister) {
            if (!formData.name) errors.name = 'Nazwa firmy jest wymagana';

            if (!formData.nip) {
                errors.nip = 'NIP jest wymagany';
            } else if (!validateNIP(formData.nip)) {
                errors.nip = 'NIP musi mieć 10 cyfr';
            }

            if (!formData.address) errors.address = 'Adres jest wymagany';
            if (!formData.city) errors.city = 'Miasto jest wymagane';

            if (!formData.postalCode) {
                errors.postalCode = 'Kod pocztowy jest wymagany';
            } else if (!validatePostalCode(formData.postalCode)) {
                errors.postalCode = 'Format: XX-XXX';
            }

            if (!formData.phone) {
                errors.phone = 'Telefon jest wymagany';
            } else if (!validatePhone(formData.phone)) {
                errors.phone = 'Format: +48XXXXXXXXX';
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        setError('');

        if (!validateForm()) {
            return;
        }

        try {
            const endpoint = isRegister ? '/Auth/register' : '/Auth/login';
            const body = isRegister
                ? formData
                : { email: formData.email, password: formData.password };

            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Błąd logowania');
            }

            const data = await response.json();
            try {
                sessionStorage.setItem('token', data.token);
            } catch (e) {
                console.warn('sessionStorage niedostępny');
            }
            onLogin(data.token);
        } catch (err) {
            setError(err.message);
        }
    };

    const updateField = (field, value) => {
        setFormData({ ...formData, [field]: value });
        // Usuń błąd walidacji dla tego pola
        if (validationErrors[field]) {
            setValidationErrors({ ...validationErrors, [field]: undefined });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md max-h-screen overflow-y-auto">
                <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
                    System Paragonów
                </h1>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <input
                            type="email"
                            placeholder="Email *"
                            value={formData.email}
                            onChange={(e) => updateField('email', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {validationErrors.email && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                        )}
                    </div>

                    <div>
                        <input
                            type="password"
                            placeholder="Hasło (min. 6 znaków) *"
                            value={formData.password}
                            onChange={(e) => updateField('password', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {validationErrors.password && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
                        )}
                    </div>

                    {isRegister && (
                        <>
                            <div>
                                <input
                                    type="text"
                                    placeholder="Nazwa firmy *"
                                    value={formData.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {validationErrors.name && (
                                    <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                                )}
                            </div>

                            <div>
                                <input
                                    type="text"
                                    placeholder="NIP (10 cyfr) *"
                                    value={formData.nip}
                                    onChange={(e) => updateField('nip', e.target.value.replace(/\D/g, ''))}
                                    maxLength="10"
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.nip ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {validationErrors.nip && (
                                    <p className="text-red-500 text-xs mt-1">{validationErrors.nip}</p>
                                )}
                            </div>

                            <div>
                                <input
                                    type="text"
                                    placeholder="Adres *"
                                    value={formData.address}
                                    onChange={(e) => updateField('address', e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.address ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {validationErrors.address && (
                                    <p className="text-red-500 text-xs mt-1">{validationErrors.address}</p>
                                )}
                            </div>

                            <div>
                                <input
                                    type="text"
                                    placeholder="Miasto *"
                                    value={formData.city}
                                    onChange={(e) => updateField('city', e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.city ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {validationErrors.city && (
                                    <p className="text-red-500 text-xs mt-1">{validationErrors.city}</p>
                                )}
                            </div>

                            <div>
                                <input
                                    type="text"
                                    placeholder="Kod pocztowy (XX-XXX) *"
                                    value={formData.postalCode}
                                    onChange={(e) => updateField('postalCode', e.target.value)}
                                    maxLength="6"
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.postalCode ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {validationErrors.postalCode && (
                                    <p className="text-red-500 text-xs mt-1">{validationErrors.postalCode}</p>
                                )}
                            </div>

                            <div>
                                <input
                                    type="tel"
                                    placeholder="Telefon (+48XXXXXXXXX) *"
                                    value={formData.phone}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                    maxLength="12"
                                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${validationErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {validationErrors.phone && (
                                    <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>
                                )}
                            </div>
                        </>
                    )}

                    <button
                        onClick={handleSubmit}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                        {isRegister ? 'Zarejestruj się' : 'Zaloguj się'}
                    </button>
                </div>

                <button
                    onClick={() => setIsRegister(!isRegister)}
                    className="w-full mt-4 text-blue-600 hover:underline"
                >
                    {isRegister ? 'Masz konto? Zaloguj się' : 'Nie masz konta? Zarejestruj się'}
                </button>
            </div>
        </div>
    );
};

// Hook do API
const useAPI = (token) => {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    return {
        get: (url) => fetch(`${API_URL}${url}`, { headers }).then(r => r.json()),
        post: (url, data) => fetch(`${API_URL}${url}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        }).then(r => r.json()),
        put: (url, data) => fetch(`${API_URL}${url}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(data)
        }),
        delete: (url) => fetch(`${API_URL}${url}`, { method: 'DELETE', headers })
    };
};


// Główna aplikacja
const App = () => {
    const getStoredToken = () => {
        try {
            return sessionStorage.getItem('token');
        } catch (e) {
            return null;
        }
    };

    const [token, setToken] = useState(getStoredToken());
    const [currentPage, setCurrentPage] = useState('receipts');
    const [products, setProducts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(true);

    const api = useAPI(token);

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
                api.get('/Products'),
                api.get('/ReceiptTemplates'),
                api.get('/Receipts'),
                api.get('/PaymentMethods')
            ]);
            setProducts(prod);
            setTemplates(templ);
            setReceipts(rec);
            setPaymentMethods(pay);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleLogout = () => {
        try {
            sessionStorage.removeItem('token');
        } catch (e) {
            console.warn('sessionStorage niedostępny');
        }
        setToken(null);
    };

    if (!token) {
        return <LoginPage onLogin={setToken} />;
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">Ładowanie...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setCurrentPage('receipts')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded ${currentPage === 'receipts' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                                <FileText size={20} />
                                <span>Paragony</span>
                            </button>
                            <button
                                onClick={() => setCurrentPage('products')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded ${currentPage === 'products' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                                <Package size={20} />
                                <span>Produkty</span>
                            </button>
                            <button
                                onClick={() => setCurrentPage('templates')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded ${currentPage === 'templates' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                                <Layout size={20} />
                                <span>Szablony</span>
                            </button>
                            <button
                                onClick={() => setCurrentPage('preview')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded ${currentPage === 'preview' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                                <Printer size={20} />
                                <span>Podgląd</span>
                            </button>
                            <button
                                onClick={() => setCurrentPage('account')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded ${currentPage === 'account' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                                <User size={20} />
                                <span>Konto</span>
                            </button>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded"
                        >
                            <LogOut size={20} />
                            <span>Wyloguj</span>
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {currentPage === 'receipts' && (
                    <ReceiptsPage
                        receipts={receipts}
                        products={products}
                        templates={templates}
                        paymentMethods={paymentMethods}
                        api={api}
                        onUpdate={loadData}
                    />
                )}
                {currentPage === 'products' && (
                    <ProductsPage products={products} api={api} onUpdate={loadData} />
                )}
                {currentPage === 'templates' && (
                    <TemplatesPage templates={templates} api={api} onUpdate={loadData} />
                )}
                {currentPage === 'preview' && (
                    <PreviewPage receipts={receipts} api={api} />
                )}
                {currentPage === 'account' && (
                    <AccountPage api={api} onLogout={handleLogout} />
                )}
            </div>
        </div>
    );
};

// Strona produktów
const ProductsPage = ({ products, api, onUpdate }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [stats, setStats] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        vatRate: '23'
    });

    useEffect(() => {
        loadStats();
    }, [products]);

    const loadStats = async () => {
        try {
            const response = await api.get('/Products/stats');
            const statsData = response.stats || response;
            setStats(statsData);
        } catch (err) {
            console.error('Błąd ładowania statystyk produktów:', err);
        }
    };

    const handleSubmit = async () => {
        try {
            if (editingProduct) {
                await api.put(`/Products/${editingProduct.id}`, {
                    name: formData.name,
                    price: parseFloat(formData.price),
                    vatRate: parseFloat(formData.vatRate)
                });
            } else {
                await api.post('/Products', {
                    name: formData.name,
                    price: parseFloat(formData.price),
                    vatRate: parseFloat(formData.vatRate)
                });
            }
            setShowForm(false);
            setEditingProduct(null);
            setFormData({ name: '', price: '', vatRate: '23' });
            onUpdate();
        } catch (err) {
            console.error('Błąd zapisywania produktu:', err);
            alert('Błąd podczas zapisywania produktu: ' + err.message);
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            price: product.price.toString(),
            vatRate: product.vatRate.toString()
        });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingProduct(null);
        setFormData({ name: '', price: '', vatRate: '23' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Czy na pewno usunąć produkt?')) {
            await api.delete(`/Products/${id}`);
            onUpdate();
        }
    };

    return (
        <div>
            {/* Statystyki produktów */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Wszystkie produkty</div>
                        <div className="text-2xl font-bold">{products.length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Sprzedane sztuki</div>
                        <div className="text-2xl font-bold text-blue-600">
                            {stats.totalQuantity || 0}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Wartość sprzedaży</div>
                        <div className="text-2xl font-bold text-green-600">
                            {(stats.totalValue || 0).toFixed(2)} zł
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Średnia cena</div>
                        <div className="text-2xl font-bold text-purple-600">
                            {(stats.averageItemPrice || 0).toFixed(2)} zł
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Produkty</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
                >
                    <Plus size={20} />
                    <span>Dodaj produkt</span>
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-lg shadow mb-6">
                    <h2 className="text-xl font-bold mb-4">
                        {editingProduct ? 'Edytuj produkt' : 'Nowy produkt'}
                    </h2>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Nazwa produktu"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Cena brutto"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                        <select
                            value={formData.vatRate}
                            onChange={(e) => setFormData({ ...formData, vatRate: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                        >
                            <option value="23">VAT 23%</option>
                            <option value="8">VAT 8%</option>
                            <option value="5">VAT 5%</option>
                            <option value="0">VAT 0%</option>
                        </select>
                        <div className="flex space-x-2">
                            <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                                {editingProduct ? 'Zapisz zmiany' : 'Zapisz'}
                            </button>
                            <button
                                onClick={handleCancel}
                                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                            >
                                Anuluj
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(product => (
                    <div key={product.id} className="bg-white p-4 rounded-lg shadow">
                        <h3 className="font-bold text-lg">{product.name}</h3>
                        <p className="text-gray-600">Cena: {product.price?.toFixed(2)} zł</p>
                        <p className="text-gray-600">VAT: {product.vatRate}%</p>
                        <div className="flex space-x-2 mt-2">
                            <button
                                onClick={() => handleEdit(product)}
                                className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                            >
                                <Edit size={16} />
                                <span>Edytuj</span>
                            </button>
                            <button
                                onClick={() => handleDelete(product.id)}
                                className="text-red-600 hover:text-red-800 flex items-center space-x-1"
                            >
                                <Trash2 size={16} />
                                <span>Usuń</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Strona szablonów
const TemplatesPage = ({ templates, api, onUpdate }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        headerText: '',
        footerText: '',
        logoFile: '',
        fontStyle: 'mono'
    });

    const handleSubmit = async () => {
        try {
            if (editingTemplate) {
                await api.put(`/ReceiptTemplates/${editingTemplate.id}`, formData);
            } else {
                await api.post('/ReceiptTemplates', formData);
            }
            setShowForm(false);
            setEditingTemplate(null);
            setFormData({ name: '', headerText: '', footerText: '', logoFile: '', fontStyle: 'mono' });
            onUpdate();
        } catch (err) {
            console.error('Błąd zapisywania szablonu:', err);
            alert('Błąd podczas zapisywania szablonu: ' + err.message);
        }
    };

    const handleEdit = (template) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            headerText: template.headerText || '',
            footerText: template.footerText || '',
            logoFile: template.logoFile || '',
            fontStyle: template.fontStyle || 'mono'
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Czy na pewno usunąć szablon?')) {
            try {
                await api.delete(`/ReceiptTemplates/${id}`);
                onUpdate();
            } catch (err) {
                console.error('Błąd usuwania szablonu:', err);
                alert('Błąd podczas usuwania szablonu: ' + err.message);
            }
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingTemplate(null);
        setFormData({ name: '', headerText: '', footerText: '', logoFile: '', fontStyle: 'mono' });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Szablony paragonów</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
                >
                    <Plus size={20} />
                    <span>Dodaj szablon</span>
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-lg shadow mb-6">
                    <h2 className="text-xl font-bold mb-4">
                        {editingTemplate ? 'Edytuj szablon' : 'Nowy szablon'}
                    </h2>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Nazwa szablonu"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                        <textarea
                            placeholder="Nagłówek paragonu"
                            value={formData.headerText}
                            onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg h-24"
                        />
                        <textarea
                            placeholder="Stopka paragonu"
                            value={formData.footerText}
                            onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg h-24"
                        />
                        <input
                            type="text"
                            placeholder="Plik logo (opcjonalnie)"
                            value={formData.logoFile}
                            onChange={(e) => setFormData({ ...formData, logoFile: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                        <select
                            value={formData.fontStyle}
                            onChange={(e) => setFormData({ ...formData, fontStyle: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                        >
                            <option value="mono">Monospace</option>
                            <option value="sans">Sans-serif</option>
                            <option value="serif">Serif</option>
                        </select>
                        <div className="flex space-x-2">
                            <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                                {editingTemplate ? 'Zapisz zmiany' : 'Zapisz'}
                            </button>
                            <button
                                onClick={handleCancel}
                                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                            >
                                Anuluj
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {templates.map(template => (
                    <div key={template.id} className="bg-white p-4 rounded-lg shadow">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h3 className="font-bold text-lg">{template.name}</h3>
                                {template.headerText && <p className="text-sm text-gray-600 mt-2">Nagłówek: {template.headerText}</p>}
                                {template.footerText && <p className="text-sm text-gray-600">Stopka: {template.footerText}</p>}
                                {template.logoFile && <p className="text-sm text-gray-600">Logo: {template.logoFile}</p>}
                                <p className="text-sm text-gray-600">Czcionka: {template.fontStyle}</p>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleEdit(template)}
                                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                                >
                                    <Edit size={16} />
                                    <span>Edytuj</span>
                                </button>
                                <button
                                    onClick={() => handleDelete(template.id)}
                                    className="text-red-600 hover:text-red-800 flex items-center space-x-1"
                                >
                                    <Trash2 size={16} />
                                    <span>Usuń</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Strona paragonów
const ReceiptsPage = ({ receipts, products, templates, paymentMethods, api, onUpdate }) => {
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [stats, setStats] = useState(null);
    const [showNewReceiptForm, setShowNewReceiptForm] = useState(false);
    const [newReceiptData, setNewReceiptData] = useState({
        templateId: '',
        paymentMethodId: '',
        discountPercent: ""
    });

    useEffect(() => {
        loadStats();
    }, [receipts]);

    const loadStats = async () => {
        try {
            const response = await api.get('/Receipts/stats');
            // API zwraca { clientId, stats: { ... } }
            const statsData = response.stats || response;
            setStats({
                totalReceipts: statsData.totalReceipts || receipts.length,
                totalSales: statsData.totalAmount || 0,
                printedCount: statsData.printedCount || 0,
                draftCount: statsData.draftCount || 0,
                readyCount: statsData.readyCount || 0,
                averageAmount: statsData.averageAmount || 0
            });
        } catch (err) {
            console.error('Błąd ładowania statystyk:', err);
            // Jeśli API nie zwraca statystyk, oblicz je lokalnie
            const totalSales = receipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
            setStats({
                totalReceipts: receipts.length,
                totalSales: totalSales,
                printedCount: receipts.filter(r => r.status === 'printed').length,
                draftCount: receipts.filter(r => r.status === 'draft').length,
                readyCount: receipts.filter(r => r.status === 'ready').length,
                averageAmount: receipts.length > 0 ? totalSales / receipts.length : 0
            });
        }
    };

    const createNewReceipt = async () => {
        try {
            const data = await api.post('/Receipts', {
                templateId: parseInt(newReceiptData.templateId) || templates[0]?.id || 1,
                paymentMethodId: parseInt(newReceiptData.paymentMethodId) || paymentMethods[0]?.id || 1,
                totalAmount: 0,
                totalVat: 0,
                paidAmount: 0,
                changeAmount: 0,
                discountPercent: parseFloat(newReceiptData.discountPercent) || 0,
                discountAmount: 0,
                status: 'draft'
            });
            setSelectedReceipt(data.id);
            setShowNewReceiptForm(false);
            setNewReceiptData({ templateId: '', paymentMethodId: '', discountPercent: 0 });
            onUpdate();
        } catch (err) {
            console.error('Błąd tworzenia paragonu:', err);
            alert('Błąd podczas tworzenia paragonu: ' + err.message);
        }
    };

    const printReceipt = async (id) => {
        try {
            // Przelicz paragon przed drukowaniem
            await api.post(`/Receipts/${id}/recalculate`, {});

            // Zmień status na printed
            await api.put(`/Receipts/${id}/status`, { status: 'printed' });

            // Wyślij do druku
            await api.post(`/Print/receipt/${id}`, {});

            alert('Paragon wysłany do druku!');
            onUpdate();
        } catch (err) {
            console.error('Błąd drukowania:', err);
            alert('Błąd podczas drukowania paragonu: ' + err.message);
        }
    };

    return (
        <div>
            {/* Statystyki */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Wszystkie paragony</div>
                        <div className="text-2xl font-bold">{stats.totalReceipts || 0}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Suma sprzedaży</div>
                        <div className="text-2xl font-bold text-green-600">
                            {(stats.totalSales || 0).toFixed(2)} zł
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Średnia wartość</div>
                        <div className="text-2xl font-bold text-purple-600">
                            {(stats.averageAmount || 0).toFixed(2)} zł
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Wydrukowane</div>
                        <div className="text-2xl font-bold text-blue-600">
                            {stats.printedCount || 0}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="text-sm text-gray-600">Robocze</div>
                        <div className="text-2xl font-bold text-yellow-600">
                            {stats.draftCount || 0}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Paragony</h2>
                            <button
                                onClick={() => setShowNewReceiptForm(!showNewReceiptForm)}
                                className="bg-green-600 text-white p-2 rounded hover:bg-green-700"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        {/* Formularz nowego paragonu */}
                        {showNewReceiptForm && (
                            <div className="mb-4 p-3 bg-gray-50 rounded">
                                <h3 className="font-bold mb-2">Nowy paragon</h3>
                                <div className="space-y-2">
                                    <select
                                        value={newReceiptData.templateId}
                                        onChange={(e) => setNewReceiptData({ ...newReceiptData, templateId: e.target.value })}
                                        className="w-full px-3 py-2 border rounded text-sm"
                                    >
                                        <option value="">Wybierz szablon</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={newReceiptData.paymentMethodId}
                                        onChange={(e) => setNewReceiptData({ ...newReceiptData, paymentMethodId: e.target.value })}
                                        className="w-full px-3 py-2 border rounded text-sm"
                                    >
                                        <option value="">Wybierz płatność</option>
                                        {paymentMethods.map(pm => (
                                            <option key={pm.id} value={pm.id}>{pm.displayName || pm.name}</option>
                                        ))}
                                    </select>

                                    <div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="Rabat %"
                                            value={newReceiptData.discountPercent}
                                            onChange={(e) => setNewReceiptData({ ...newReceiptData, discountPercent: e.target.value })}
                                            className="w-full px-3 py-2 border rounded text-sm"
                                        />
                                        {newReceiptData.discountPercent > 0 && (
                                            <p className="text-xs text-gray-600 mt-1">
                                                Rabat {newReceiptData.discountPercent}% zostanie zastosowany do paragonu
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={createNewReceipt}
                                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                        >
                                            Utwórz
                                        </button>
                                        <button
                                            onClick={() => setShowNewReceiptForm(false)}
                                            className="bg-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-400"
                                        >
                                            Anuluj
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            {receipts.map(receipt => (
                                <div
                                    key={receipt.id}
                                    onClick={() => setSelectedReceipt(receipt.id)}
                                    className={`p-3 rounded cursor-pointer ${selectedReceipt === receipt.id ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'}`}
                                >
                                    <div className="font-bold">{receipt.receiptNumber}</div>
                                    <div className="text-sm text-gray-600">
                                        {receipt.totalAmount?.toFixed(2)} zł
                                    </div>
                                    <div className={`text-xs ${receipt.status === 'printed' ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {receipt.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    {selectedReceipt ? (
                        <ReceiptDetails
                            receiptId={selectedReceipt}
                            products={products}
                            templates={templates}
                            paymentMethods={paymentMethods}
                            api={api}
                            onUpdate={onUpdate}
                            onPrint={printReceipt}
                            onDelete={onUpdate}  
                        />
                    ) : (
                        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                            Wybierz paragon z listy lub utwórz nowy
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Szczegóły paragonu
const ReceiptDetails = ({ receiptId, products, templates, paymentMethods, api, onUpdate, onPrint, onDelete }) => {
    const [receipt, setReceipt] = useState(null);
    const [items, setItems] = useState([]);
    const [addingProduct, setAddingProduct] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [editingSettings, setEditingSettings] = useState(false);
    const [settingsData, setSettingsData] = useState({
        templateId: '',
        paymentMethodId: '',
        discountPercent: 0
    });

    const deleteReceipt = async () => {
        if (window.confirm('Czy na pewno usunąć ten paragon? Ta operacja jest nieodwracalna.')) {
            try {
                await api.delete(`/Receipts/${receiptId}`);
                alert('Paragon został usunięty');

                if (typeof onDelete === "function") {
                    onDelete();
                }

            } catch (err) {
                console.error('Błąd usuwania paragonu:', err);
                alert('Błąd podczas usuwania paragonu: ' + err.message);
            }
        }
    };


    useEffect(() => {
        loadReceipt();
    }, [receiptId]);

    const loadReceipt = async () => {
        const [rec, itm] = await Promise.all([
            api.get(`/Receipts/${receiptId}`),
            api.get(`/ReceiptItems/receipt/${receiptId}`)
        ]);
        setReceipt(rec);
        setItems(itm);
        setSettingsData({
            templateId: rec.templateId,
            paymentMethodId: rec.paymentMethodId,
            discountPercent: rec.discountPercent || 0
        });
    };

    const addProduct = async () => {
        const product = products.find(p => p.id === parseInt(selectedProduct));
        if (!product) return;

        try {
            // Dodaj produkt
            await api.post('/ReceiptItems', {
                receiptId: receiptId,
                productId: product.id,
                quantity: parseFloat(quantity)
            });

            // Przelicz paragon
            await api.post(`/Receipts/${receiptId}/recalculate`, {});

            setAddingProduct(false);
            setSelectedProduct('');
            setQuantity('1');
            await loadReceipt(); // Tylko przeładuj szczegóły paragonu
            // NIE wywołuj onUpdate() - to powoduje minimalizację
        } catch (err) {
            console.error('Błąd dodawania produktu:', err);
            alert('Błąd podczas dodawania produktu: ' + err.message);
        }
    };

    const removeItem = async (itemId) => {
        try {
            await api.delete(`/ReceiptItems/${itemId}`);
            // Przelicz paragon po usunięciu
            await api.post(`/Receipts/${receiptId}/recalculate`, {});
            await loadReceipt(); // Tylko przeładuj szczegóły
            // NIE wywołuj onUpdate()
        } catch (err) {
            console.error('Błąd usuwania produktu:', err);
            alert('Błąd podczas usuwania produktu: ' + err.message);
        }
    };

    const setPayment = async () => {
        const amount = window.prompt('Kwota zapłacona:');
        if (amount) {
            try {
                await api.put(`/Receipts/${receiptId}/payment`, { paidAmount: parseFloat(amount) });
                // Przelicz paragon po płatności (aby obliczyć resztę)
                await api.post(`/Receipts/${receiptId}/recalculate`, {});
                await loadReceipt(); // Tylko przeładuj szczegóły
                // NIE wywołuj onUpdate()
            } catch (err) {
                console.error('Błąd zapisywania płatności:', err);
                alert('Błąd podczas zapisywania płatności: ' + err.message);
            }
        }
    };

    const updateSettings = async () => {
        try {
            // Aktualizuj szablon i metodę płatności
            await api.put(`/Receipts/${receiptId}`, {
                ...receipt,
                templateId: parseInt(settingsData.templateId),
                paymentMethodId: parseInt(settingsData.paymentMethodId),
                discountPercent: parseFloat(settingsData.discountPercent)
            });

            // Zastosuj rabat (lub usuń jeśli 0)
            const discountValue = parseFloat(settingsData.discountPercent) || 0;
            await api.put(`/Receipts/${receiptId}/discount`, {
                discountPercent: discountValue
            });

            // Przelicz
            await api.post(`/Receipts/${receiptId}/recalculate`, {});

            setEditingSettings(false);
            await loadReceipt(); // Przeładuj dane
            // onUpdate() pozostaje aby zaktualizować listę paragonów
            onUpdate();
        } catch (err) {
            console.error('Błąd aktualizacji ustawień:', err);
            alert('Błąd podczas aktualizacji ustawień: ' + err.message);
        }
    };

    if (!receipt) return <div>Ładowanie...</div>;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Paragon {receipt.receiptNumber}</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={deleteReceipt}
                        className="bg-red-600 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-red-700"
                    >
                        <Trash2 size={20} />
                        <span>Usuń</span>
                    </button>
                    <button
                        onClick={() => setEditingSettings(!editingSettings)}
                        className="bg-purple-600 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-purple-700"
                    >
                        <Edit size={20} />
                        <span>Ustawienia</span>
                    </button>
                    <button
                        onClick={setPayment}
                        className="bg-green-600 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-green-700"
                    >
                        <DollarSign size={20} />
                        <span>Płatność</span>
                    </button>
                    <button
                        onClick={() => onPrint(receiptId)}
                        className="bg-blue-600 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-blue-700"
                    >
                        <Printer size={20} />
                        <span>Drukuj</span>
                    </button>
                </div>
            </div>

            {/* Formularz ustawień */}
            {editingSettings && (
                <div className="bg-gray-50 p-4 rounded mb-6">
                    <h3 className="font-bold mb-3">Ustawienia paragonu</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Szablon</label>
                            <select
                                value={settingsData.templateId}
                                onChange={(e) => setSettingsData({ ...settingsData, templateId: e.target.value })}
                                className="w-full px-3 py-2 border rounded"
                            >
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Metoda płatności</label>
                            <select
                                value={settingsData.paymentMethodId}
                                onChange={(e) => setSettingsData({ ...settingsData, paymentMethodId: e.target.value })}
                                className="w-full px-3 py-2 border rounded"
                            >
                                {paymentMethods.map(pm => (
                                    <option key={pm.id} value={pm.id}>{pm.displayName || pm.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Rabat (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={settingsData.discountPercent}
                                onChange={(e) => setSettingsData({ ...settingsData, discountPercent: e.target.value })}
                                className="w-full px-3 py-2 border rounded"
                            />
                        </div>
                    </div>

                    <div className="flex space-x-2 mt-4">
                        <button
                            onClick={updateSettings}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            Zapisz
                        </button>
                        <button
                            onClick={() => setEditingSettings(false)}
                            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                        >
                            Anuluj
                        </button>
                    </div>
                </div>
            )}

            {/* Info o paragonie */}
            <div className="bg-blue-50 p-3 rounded mb-4 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                        <span className="font-medium">Szablon:</span> {receipt.template?.name || 'Brak'}
                    </div>
                    <div>
                        <span className="font-medium">Płatność:</span> {receipt.paymentMethod?.displayName || receipt.paymentMethod?.name || 'Brak'}
                    </div>
                    <div>
                        <span className="font-medium">Status:</span> <span className={receipt.status === 'printed' ? 'text-green-600' : 'text-yellow-600'}>{receipt.status}</span>
                    </div>
                    <div>
                        <span className="font-medium">Data:</span> {new Date(receipt.createdAt).toLocaleDateString('pl-PL')}
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Produkty</h3>
                    <button
                        onClick={() => setAddingProduct(true)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                        + Dodaj
                    </button>
                </div>

                {addingProduct && (
                    <div className="bg-gray-50 p-4 rounded mb-4">
                        <select
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            className="w-full px-3 py-2 border rounded mb-2"
                        >
                            <option value="">Wybierz produkt</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} - {p.price?.toFixed(2)} zł</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            step="0.01"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="Ilość"
                            className="w-full px-3 py-2 border rounded mb-2"
                        />
                        <div className="flex space-x-2">
                            <button onClick={addProduct} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                                Dodaj
                            </button>
                            <button onClick={() => setAddingProduct(false)} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
                                Anuluj
                            </button>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    {items.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <div>
                                <div className="font-medium">{item.name || item.productName}</div>
                                <div className="text-sm text-gray-600">
                                    {item.quantity} × {item.unitPrice?.toFixed(2)} zł (VAT {item.vatRate}%)
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="font-bold">
                                    {item.totalAmount?.toFixed(2)} zł
                                </div>
                                <button
                                    onClick={() => removeItem(item.id)}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t pt-4">
                <div className="flex justify-between text-lg mb-2">
                    <span>Suma:</span>
                    <span className="font-bold">{receipt.totalAmount?.toFixed(2)} zł</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>VAT:</span>
                    <span>{receipt.totalVat?.toFixed(2)} zł</span>
                </div>
                {receipt.discountPercent > 0 && receipt.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-orange-600 mb-2">
                        <span>Rabat ({receipt.discountPercent}%):</span>
                        <span>-{receipt.discountAmount?.toFixed(2)} zł</span>
                    </div>
                )}
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Zapłacono:</span>
                    <span>{receipt.paidAmount?.toFixed(2)} zł</span>
                </div>
                {receipt.changeAmount > 0 && (
                    <div className="flex justify-between text-lg text-green-600 font-bold">
                        <span>Reszta:</span>
                        <span>{receipt.changeAmount?.toFixed(2)} zł</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// Strona podglądu paragonów
const PreviewPage = ({ receipts, api }) => {
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [receipt, setReceipt] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadReceiptPreview = async (id) => {
        setLoading(true);
        try {
            const [rec, itm] = await Promise.all([
                api.get(`/Receipts/${id}`),
                api.get(`/ReceiptItems/receipt/${id}`)
            ]);
            setReceipt(rec);
            setItems(itm);
        } catch (err) {
            console.error('Błąd ładowania paragonu:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (selectedReceipt) {
            loadReceiptPreview(selectedReceipt);
        }
    }, [selectedReceipt]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista paragonów */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-4">
                    <h2 className="text-xl font-bold mb-4">Wybierz paragon</h2>
                    <div className="space-y-2">
                        {receipts.map(r => (
                            <button
                                key={r.id}
                                onClick={() => setSelectedReceipt(r.id)}
                                className={`w-full text-left p-3 rounded ${selectedReceipt === r.id
                                        ? 'bg-blue-100 border-2 border-blue-500'
                                        : 'bg-gray-50 hover:bg-gray-100'
                                    }`}
                            >
                                <div className="font-bold">{r.receiptNumber}</div>
                                <div className="text-sm text-gray-600">{r.totalAmount?.toFixed(2)} zł</div>
                                <div className={`text-xs ${r.status === 'printed' ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {r.status}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Podgląd paragonu */}
            <div className="lg:col-span-2">
                {loading ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <div className="text-xl">Ładowanie...</div>
                    </div>
                ) : receipt ? (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-2xl font-bold mb-6 text-center">Podgląd paragonu</h2>

                        {/* Papier termiczny 80mm - proporcje */}
                        <div className="mx-auto bg-white border-2 border-gray-300 p-6" style={{ width: '320px', fontFamily: 'monospace', fontSize: '12px' }}>
                            {/* Nagłówek */}
                            {receipt.template?.headerText && (
                                <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-2">
                                    {receipt.template.headerText.split('\n').map((line, i) => (
                                        <div key={i}>{line}</div>
                                    ))}
                                </div>
                            )}

                            {/* Dane firmy */}
                            {receipt.client && (
                                <div className="text-center mb-4 text-xs">
                                    <div className="font-bold">{receipt.client.name}</div>
                                    <div>NIP: {receipt.client.nip}</div>
                                    <div>{receipt.client.address}</div>
                                    <div>{receipt.client.postalCode} {receipt.client.city}</div>
                                    <div>Tel: {receipt.client.phone}</div>
                                </div>
                            )}

                            <div className="border-t border-dashed border-gray-400 my-2"></div>

                            {/* Numer paragonu */}
                            <div className="text-center font-bold mb-2">
                                PARAGON FISKALNY
                            </div>
                            <div className="text-center text-xs mb-2">
                                NR: {receipt.receiptNumber}
                            </div>

                            <div className="border-t border-dashed border-gray-400 my-2"></div>

                            {/* Produkty */}
                            <div className="mb-2">
                                {items.map((item, index) => (
                                    <div key={index} className="mb-2">
                                        <div className="flex justify-between">
                                            <span>{item.name || item.productName}</span>
                                            <span>{item.totalAmount?.toFixed(2)}</span>
                                        </div>
                                        <div className="text-xs text-gray-600 flex justify-between">
                                            <span>{item.quantity} x {item.unitPrice?.toFixed(2)}</span>
                                            <span>PTU {item.vatRate}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-gray-400 my-2"></div>

                            {/* Podsumowanie */}
                            <div className="space-y-1">
                                <div className="flex justify-between font-bold">
                                    <span>SUMA:</span>
                                    <span>{receipt.totalAmount?.toFixed(2)} PLN</span>
                                </div>

                                {receipt.discountPercent > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span>Rabat ({receipt.discountPercent}%):</span>
                                        <span>-{receipt.discountAmount?.toFixed(2)} PLN</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-xs">
                                    <span>w tym PTU:</span>
                                    <span>{receipt.totalVat?.toFixed(2)} PLN</span>
                                </div>
                            </div>

                            <div className="border-t border-dashed border-gray-400 my-2"></div>

                            {/* Sposób płatności */}
                            <div className="text-center mb-2">
                                <div className="text-xs">SPOSÓB PŁATNOŚCI:</div>
                                <div className="font-bold">{receipt.paymentMethod?.displayName || receipt.paymentMethod?.name}</div>
                                <div className="font-bold">{receipt.paidAmount?.toFixed(2)}</div>
                            </div>

                            {receipt.changeAmount > 0 && (
                                <div className="text-center text-xs mb-2">
                                    Reszta: {receipt.changeAmount?.toFixed(2)} PLN
                                </div>
                            )}

                            <div className="border-t border-dashed border-gray-400 my-2"></div>

                            {/* Data i godzina */}
                            <div className="text-center text-xs mb-4">
                                {formatDate(receipt.createdAt)}
                            </div>

                            {/* Stopka */}
                            {receipt.template?.footerText && (
                                <div className="text-center text-xs border-t border-dashed border-gray-400 pt-2">
                                    {receipt.template.footerText.split('\n').map((line, i) => (
                                        <div key={i}>{line}</div>
                                    ))}
                                </div>
                            )}

                            {/* Kod kreskowy (symulacja) */}
                            <div className="text-center mt-4">
                                <div className="inline-block px-4 py-2 border border-gray-400">
                                    <div style={{
                                        height: '40px',
                                        background: 'repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px)',
                                        width: '150px'
                                    }}></div>
                                    <div className="text-xs mt-1">{receipt.receiptNumber}</div>
                                </div>
                            </div>
                        </div>

                        {/* Przyciski akcji */}
                        <div className="flex justify-center space-x-4 mt-6">
                            <button
                                onClick={() => window.print()}
                                className="bg-blue-600 text-white px-6 py-2 rounded flex items-center space-x-2 hover:bg-blue-700"
                            >
                                <Printer size={20} />
                                <span>Drukuj podgląd</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                        Wybierz paragon z listy aby zobaczyć podgląd
                    </div>
                )}
            </div>
        </div>
    );
};

// Strona konta użytkownika
const AccountPage = ({ api, onLogout }) => {
    const [clientData, setClientData] = useState(null);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [validationErrors, setValidationErrors] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadClientData();
    }, []);

    const loadClientData = async () => {
        try {
            const data = await api.get('/Clients/me');
            setClientData(data);
            setFormData(data);
            setLoading(false);
        } catch (err) {
            console.error('Błąd ładowania danych:', err);
            setLoading(false);
        }
    };

    const validatePhone = (phone) => {
        const re = /^\+48\d{9}$/;
        return re.test(phone);
    };

    const validateNIP = (nip) => {
        const re = /^\d{10}$/;
        return re.test(nip);
    };

    const validatePostalCode = (code) => {
        const re = /^\d{2}-\d{3}$/;
        return re.test(code);
    };

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.name) errors.name = 'Nazwa firmy jest wymagana';
        if (!formData.email) {
            errors.email = 'Email jest wymagany';
        } else if (!validateEmail(formData.email)) {
            errors.email = 'Nieprawidłowy format email';
        }
        if (!formData.nip) {
            errors.nip = 'NIP jest wymagany';
        } else if (!validateNIP(formData.nip)) {
            errors.nip = 'NIP musi mieć 10 cyfr';
        }
        if (!formData.address) errors.address = 'Adres jest wymagany';
        if (!formData.city) errors.city = 'Miasto jest wymagane';
        if (!formData.postalCode) {
            errors.postalCode = 'Kod pocztowy jest wymagany';
        } else if (!validatePostalCode(formData.postalCode)) {
            errors.postalCode = 'Format: XX-XXX';
        }
        if (!formData.phone) {
            errors.phone = 'Telefon jest wymagany';
        } else if (!validatePhone(formData.phone)) {
            errors.phone = 'Format: +48XXXXXXXXX';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            await api.put(`/Clients/${clientData.id}`, formData);
            setClientData(formData);
            setEditing(false);
            alert('Dane zostały zaktualizowane');
        } catch (err) {
            console.error('Błąd aktualizacji danych:', err);
            alert('Błąd podczas aktualizacji danych: ' + err.message);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Czy na pewno usunąć konto? Ta operacja jest nieodwracalna i usunie wszystkie dane włącznie z paragonami!')) {
            if (window.confirm('Ostatnie ostrzeżenie! Wszystkie dane zostaną bezpowrotnie utracone. Kontynuować?')) {
                try {
                    await api.delete(`/Clients/${clientData.id}`);
                    alert('Konto zostało usunięte');
                    onLogout();
                } catch (err) {
                    console.error('Błąd usuwania konta:', err);
                    alert('Błąd podczas usuwania konta: ' + err.message);
                }
            }
        }
    };

    const updateField = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (validationErrors[field]) {
            setValidationErrors({ ...validationErrors, [field]: undefined });
        }
    };

    if (loading) {
        return <div className="text-center">Ładowanie...</div>;
    }

    if (!clientData) {
        return <div className="text-center text-red-600">Błąd ładowania danych konta</div>;
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Moje konto</h1>
                    {!editing && (
                        <button
                            onClick={() => setEditing(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-blue-700"
                        >
                            <Edit size={20} />
                            <span>Edytuj</span>
                        </button>
                    )}
                </div>

                {editing ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nazwa firmy *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg ${validationErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {validationErrors.name && <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Email *</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => updateField('email', e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg ${validationErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {validationErrors.email && <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">NIP *</label>
                            <input
                                type="text"
                                value={formData.nip}
                                onChange={(e) => updateField('nip', e.target.value.replace(/\D/g, ''))}
                                maxLength="10"
                                className={`w-full px-4 py-2 border rounded-lg ${validationErrors.nip ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {validationErrors.nip && <p className="text-red-500 text-xs mt-1">{validationErrors.nip}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Adres *</label>
                            <input
                                type="text"
                                value={formData.address}
                                onChange={(e) => updateField('address', e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg ${validationErrors.address ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {validationErrors.address && <p className="text-red-500 text-xs mt-1">{validationErrors.address}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Miasto *</label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(e) => updateField('city', e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg ${validationErrors.city ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {validationErrors.city && <p className="text-red-500 text-xs mt-1">{validationErrors.city}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Kod pocztowy *</label>
                            <input
                                type="text"
                                value={formData.postalCode}
                                onChange={(e) => updateField('postalCode', e.target.value)}
                                maxLength="6"
                                className={`w-full px-4 py-2 border rounded-lg ${validationErrors.postalCode ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {validationErrors.postalCode && <p className="text-red-500 text-xs mt-1">{validationErrors.postalCode}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Telefon *</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => updateField('phone', e.target.value)}
                                maxLength="12"
                                className={`w-full px-4 py-2 border rounded-lg ${validationErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                            />
                            {validationErrors.phone && <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>}
                        </div>

                        <div className="flex space-x-2">
                            <button
                                onClick={handleSave}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                            >
                                Zapisz zmiany
                            </button>
                            <button
                                onClick={() => {
                                    setEditing(false);
                                    setFormData(clientData);
                                    setValidationErrors({});
                                }}
                                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                            >
                                Anuluj
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600">Nazwa firmy</label>
                            <p className="text-lg">{clientData.name}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600">Email</label>
                            <p className="text-lg">{clientData.email}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600">NIP</label>
                            <p className="text-lg">{clientData.nip}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600">Adres</label>
                            <p className="text-lg">{clientData.address}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600">Miasto</label>
                            <p className="text-lg">{clientData.city}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600">Kod pocztowy</label>
                            <p className="text-lg">{clientData.postalCode}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600">Telefon</label>
                            <p className="text-lg">{clientData.phone}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600">Data utworzenia</label>
                            <p className="text-lg">{new Date(clientData.createdAt).toLocaleDateString('pl-PL')}</p>
                        </div>
                    </div>
                )}

                {!editing && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-bold text-red-600 mb-2">Strefa niebezpieczna</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Usunięcie konta spowoduje trwałe usunięcie wszystkich danych, w tym paragonów, produktów i szablonów.
                        </p>
                        <button
                            onClick={handleDelete}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center space-x-2"
                        >
                            <Trash2 size={20} />
                            <span>Usuń konto</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;