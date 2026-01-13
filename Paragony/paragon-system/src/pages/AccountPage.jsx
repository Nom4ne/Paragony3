import React, { useEffect, useState } from "react";
import { Edit, Shield, ShieldOff } from "lucide-react";
import {
    validateEmail,
    validatePhone,
    validateNIP,
    validatePostalCode,
} from "../utils/validators";

const AccountPage = ({ api, onLogout, isDarkMode }) => {
    const [clientData, setClientData] = useState(null);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [validationErrors, setValidationErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [toggling2FA, setToggling2FA] = useState(false);

    // === STYLE DARK MODE ===
    const theme = {
        card: isDarkMode ? "bg-gray-800 text-gray-100 border border-gray-700" : "bg-white text-gray-900 shadow",
        textSecondary: isDarkMode ? "text-gray-400" : "text-gray-600",
        label: isDarkMode ? "text-gray-300" : "text-gray-700",
        input: isDarkMode
            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500"
            : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500",
        buttonCancel: isDarkMode ? "bg-gray-600 hover:bg-gray-500 text-white" : "bg-gray-300 hover:bg-gray-400 text-black",

        // Alerty / Statusy
        alertGreen: isDarkMode ? "bg-green-900/30 border-green-800 text-green-300" : "bg-green-50 border-green-200 text-green-800",
        alertYellow: isDarkMode ? "bg-yellow-900/30 border-yellow-800 text-yellow-300" : "bg-yellow-50 border-yellow-200 text-yellow-800",

        // Przyciski 2FA
        btn2FAOn: isDarkMode ? "bg-green-900/40 text-green-300 hover:bg-green-900/60" : "bg-green-100 text-green-700 hover:bg-green-200",
        btn2FAOff: isDarkMode ? "bg-red-900/40 text-red-300 hover:bg-red-900/60" : "bg-red-100 text-red-700 hover:bg-red-200",

        textRed: isDarkMode ? "text-red-400" : "text-red-600"
    };

    useEffect(() => {
        loadClientData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadClientData = async () => {
        try {
            const data = await api.get("/Auth/me");
            setClientData(data);
            setFormData(data || {});
        } catch (err) {
            console.error("Błąd ładowania danych konta:", err);
        }
        setLoading(false);
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.name) errors.name = "Nazwa firmy jest wymagana";

        if (!formData.email) errors.email = "Email jest wymagany";
        else if (!validateEmail(formData.email))
            errors.email = "Nieprawidłowy format email";

        if (!formData.contactEmail)
            errors.contactEmail = "Email kontaktowy jest wymagany";
        else if (!validateEmail(formData.contactEmail))
            errors.contactEmail = "Nieprawidłowy format emaila";

        if (!formData.nip) errors.nip = "NIP jest wymagany";
        else if (!validateNIP(formData.nip))
            errors.nip = "NIP musi mieć 10 cyfr";

        if (!formData.address) errors.address = "Adres jest wymagany";
        if (!formData.city) errors.city = "Miasto jest wymagane";

        if (!formData.postalCode)
            errors.postalCode = "Kod pocztowy jest wymagany";
        else if (!validatePostalCode(formData.postalCode))
            errors.postalCode = "Format: XX-XXX";

        if (!formData.phone) errors.phone = "Telefon jest wymagany";
        else if (!validatePhone(formData.phone))
            errors.phone = "Format: +48XXXXXXXXX";

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            await api.put(`/Clients/${clientData.id}`, formData);
            setClientData(formData);
            setEditing(false);
            alert("Dane zostały zaktualizowane");
        } catch (err) {
            console.error("Błąd aktualizacji danych:", err);
            alert("Błąd podczas aktualizacji danych: " + (err.message || err));
        }
    };

    const handleToggle2FA = async () => {
        if (!clientData.phone) {
            alert("Aby włączyć 2FA, musisz najpierw dodać numer telefonu w ustawieniach konta.");
            return;
        }

        const action = clientData.twoFactorEnabled ? "wyłączyć" : "włączyć";
        if (!window.confirm(`Czy na pewno chcesz ${action} uwierzytelnianie dwuskładnikowe (2FA)?`)) {
            return;
        }

        setToggling2FA(true);

        try {
            const endpoint = clientData.twoFactorEnabled
                ? "/Auth/2fa/disable"
                : "/Auth/2fa/enable";

            await api.post(endpoint);

            // Odśwież dane klienta
            await loadClientData();

            const status = clientData.twoFactorEnabled ? "wyłączone" : "włączone";
            alert(`Uwierzytelnianie 2FA zostało ${status}`);
        } catch (err) {
            console.error("Błąd przełączania 2FA:", err);
            alert("Błąd podczas zmiany ustawień 2FA: " + (err.message || err));
        } finally {
            setToggling2FA(false);
        }
    };

    const handleDelete = async () => {
        if (
            !window.confirm(
                "Czy na pewno usunąć konto? Ta operacja jest nieodwracalna i usunie wszystkie dane włącznie z paragonami!"
            )
        )
            return;
        if (
            !window.confirm(
                "Ostatnie ostrzeżenie! Wszystkie dane zostaną bezpowrotnie utracone. Kontynuować?"
            )
        )
            return;

        try {
            await api.delete(`/Clients/${clientData.id}`);
            alert("Konto zostało usunięte");
            onLogout();
        } catch (err) {
            console.error("Błąd usuwania konta:", err);
            alert("Błąd podczas usuwania konta: " + (err.message || err));
        }
    };

    const updateField = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (validationErrors[field])
            setValidationErrors({ ...validationErrors, [field]: undefined });
    };

    if (loading) return <div className={`text-center ${theme.textSecondary}`}>Ładowanie...</div>;
    if (!clientData)
        return (
            <div className={`text-center ${theme.textRed}`}>
                Błąd ładowania danych konta
            </div>
        );

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* SEKCJA BEZPIECZEŃSTWA - 2FA */}
            <div className={`rounded-lg p-6 ${theme.card}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        {clientData.twoFactorEnabled ? (
                            <Shield className={isDarkMode ? "text-green-400" : "text-green-600"} size={24} />
                        ) : (
                            <ShieldOff className="text-gray-400" size={24} />
                        )}
                        <div>
                            <h2 className="text-xl font-bold">
                                Uwierzytelnianie dwuskładnikowe (2FA)
                            </h2>
                            <p className={`text-sm ${theme.textSecondary}`}>
                                {clientData.twoFactorEnabled
                                    ? "Twoje konto jest chronione kodem SMS"
                                    : "Dodatkowa warstwa bezpieczeństwa poprzez kod SMS"
                                }
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleToggle2FA}
                        disabled={toggling2FA}
                        className={`px-4 py-2 rounded font-semibold transition ${clientData.twoFactorEnabled
                            ? theme.btn2FAOff
                            : theme.btn2FAOn
                            } ${toggling2FA ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        {toggling2FA
                            ? "Przetwarzanie..."
                            : clientData.twoFactorEnabled
                                ? "Wyłącz 2FA"
                                : "Włącz 2FA"
                        }
                    </button>
                </div>

                {clientData.twoFactorEnabled && (
                    <div className={`border rounded p-3 text-sm ${theme.alertGreen}`}>
                        <p className="font-semibold">✓ 2FA jest aktywne</p>
                        <p>Przy każdym logowaniu otrzymasz kod weryfikacyjny na numer: {clientData.phone}</p>
                    </div>
                )}

                {!clientData.twoFactorEnabled && !clientData.phone && (
                    <div className={`border rounded p-3 text-sm ${theme.alertYellow}`}>
                        <p className="font-semibold">⚠ Brak numeru telefonu</p>
                        <p>Aby włączyć 2FA, dodaj numer telefonu w ustawieniach konta poniżej.</p>
                    </div>
                )}
            </div>

            {/* SEKCJA DANYCH KONTA */}
            <div className={`rounded-lg shadow p-6 ${theme.card}`}>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Dane konta</h1>

                    {!editing && (
                        <button
                            onClick={() => setEditing(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                        >
                            <Edit size={18} />
                            <span>Edytuj</span>
                        </button>
                    )}
                </div>

                {editing ? (
                    <div className="space-y-4">
                        {/* NAZWA FIRMY */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>
                                Nazwa firmy *
                            </label>
                            <input
                                type="text"
                                value={formData.name || ""}
                                onChange={(e) =>
                                    updateField("name", e.target.value)
                                }
                                className={`w-full px-4 py-2 border rounded-lg outline-none ${theme.input} ${validationErrors.name ? "border-red-500" : ""}`}
                            />
                            {validationErrors.name && (
                                <p className={`${theme.textRed} text-xs mt-1`}>
                                    {validationErrors.name}
                                </p>
                            )}
                        </div>

                        {/* EMAIL LOGIN */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>
                                Email (Login) *
                            </label>
                            <input
                                type="email"
                                value={formData.email || ""}
                                onChange={(e) =>
                                    updateField("email", e.target.value)
                                }
                                className={`w-full px-4 py-2 border rounded-lg outline-none ${theme.input} ${validationErrors.email ? "border-red-500" : ""}`}
                            />
                            {validationErrors.email && (
                                <p className={`${theme.textRed} text-xs mt-1`}>
                                    {validationErrors.email}
                                </p>
                            )}
                        </div>

                        {/* EMAIL KONTAKTOWY */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>
                                Email kontaktowy *
                            </label>
                            <input
                                type="email"
                                value={formData.contactEmail || ""}
                                onChange={(e) =>
                                    updateField("contactEmail", e.target.value)
                                }
                                className={`w-full px-4 py-2 border rounded-lg outline-none ${theme.input} ${validationErrors.contactEmail ? "border-red-500" : ""}`}
                            />
                            {validationErrors.contactEmail && (
                                <p className={`${theme.textRed} text-xs mt-1`}>
                                    {validationErrors.contactEmail}
                                </p>
                            )}
                        </div>

                        {/* NIP */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>
                                NIP *
                            </label>
                            <input
                                type="text"
                                value={formData.nip || ""}
                                onChange={(e) =>
                                    updateField(
                                        "nip",
                                        e.target.value.replace(/\D/g, "")
                                    )
                                }
                                maxLength="10"
                                className={`w-full px-4 py-2 border rounded-lg outline-none ${theme.input} ${validationErrors.nip ? "border-red-500" : ""}`}
                            />
                            {validationErrors.nip && (
                                <p className={`${theme.textRed} text-xs mt-1`}>
                                    {validationErrors.nip}
                                </p>
                            )}
                        </div>

                        {/* ADRES */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>
                                Adres *
                            </label>
                            <input
                                type="text"
                                value={formData.address || ""}
                                onChange={(e) =>
                                    updateField("address", e.target.value)
                                }
                                className={`w-full px-4 py-2 border rounded-lg outline-none ${theme.input} ${validationErrors.address ? "border-red-500" : ""}`}
                            />
                            {validationErrors.address && (
                                <p className={`${theme.textRed} text-xs mt-1`}>
                                    {validationErrors.address}
                                </p>
                            )}
                        </div>

                        {/* MIASTO */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>
                                Miasto *
                            </label>
                            <input
                                type="text"
                                value={formData.city || ""}
                                onChange={(e) =>
                                    updateField("city", e.target.value)
                                }
                                className={`w-full px-4 py-2 border rounded-lg outline-none ${theme.input} ${validationErrors.city ? "border-red-500" : ""}`}
                            />
                            {validationErrors.city && (
                                <p className={`${theme.textRed} text-xs mt-1`}>
                                    {validationErrors.city}
                                </p>
                            )}
                        </div>

                        {/* KOD POCZTOWY */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>
                                Kod pocztowy *
                            </label>
                            <input
                                type="text"
                                maxLength="6"
                                value={formData.postalCode || ""}
                                onChange={(e) =>
                                    updateField("postalCode", e.target.value)
                                }
                                className={`w-full px-4 py-2 border rounded-lg outline-none ${theme.input} ${validationErrors.postalCode ? "border-red-500" : ""}`}
                            />
                            {validationErrors.postalCode && (
                                <p className={`${theme.textRed} text-xs mt-1`}>
                                    {validationErrors.postalCode}
                                </p>
                            )}
                        </div>

                        {/* TELEFON */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>
                                Telefon * {!clientData.twoFactorEnabled && <span className={theme.textSecondary}>(wymagany do 2FA)</span>}
                            </label>
                            <input
                                type="text"
                                maxLength="12"
                                value={formData.phone || ""}
                                onChange={(e) =>
                                    updateField("phone", e.target.value)
                                }
                                className={`w-full px-4 py-2 border rounded-lg outline-none ${theme.input} ${validationErrors.phone ? "border-red-500" : ""}`}
                            />
                            {validationErrors.phone && (
                                <p className={`${theme.textRed} text-xs mt-1`}>
                                    {validationErrors.phone}
                                </p>
                            )}
                        </div>

                        {/* PRZYCISKI */}
                        <div className="flex space-x-4 pt-4">
                            <button
                                onClick={handleSave}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                            >
                                Zapisz
                            </button>
                            <button
                                onClick={() => {
                                    setFormData(clientData);
                                    setEditing(false);
                                }}
                                className={`px-4 py-2 rounded transition-colors ${theme.buttonCancel}`}
                            >
                                Anuluj
                            </button>
                        </div>

                        <button
                            onClick={handleDelete}
                            className={`${theme.textRed} hover:underline mt-6 block`}
                        >
                            Usuń konto
                        </button>
                    </div>
                ) : (
                    /* Widok bez edycji */
                    <div className="space-y-2 text-lg">
                        <p><strong>Nazwa firmy:</strong> {clientData.name}</p>
                        <p><strong>Email (Login):</strong> {clientData.email}</p>
                        <p><strong>Email kontaktowy:</strong> {clientData.contactEmail}</p>
                        <p><strong>NIP:</strong> {clientData.nip}</p>
                        <p><strong>Adres:</strong> {clientData.address}</p>
                        <p><strong>Miasto:</strong> {clientData.city}</p>
                        <p><strong>Kod pocztowy:</strong> {clientData.postalCode}</p>
                        <p><strong>Telefon:</strong> {clientData.phone}</p>

                        <button
                            onClick={handleDelete}
                            className={`${theme.textRed} hover:underline mt-6 block`}
                        >
                            Usuń konto
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountPage;