import React, { useState, useRef, useEffect } from "react";
import {
    validateEmail,
    validatePhone,
    validateNIP,
    validatePostalCode,
} from "../utils/validators";

const API_URL = "https://localhost:7228/api";

const LoginPage = ({ onLogin }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [show2FA, setShow2FA] = useState(false);
    const [sessionToken, setSessionToken] = useState("");
    const [verificationCode, setVerificationCode] = useState("");

    // Ref dla pola input 2FA
    const twoFactorInputRef = useRef(null);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        contactEmail: "",
        name: "",
        nip: "",
        address: "",
        city: "",
        postalCode: "",
        phone: "",
    });

    const [error, setError] = useState("");
    const [validationErrors, setValidationErrors] = useState({});

    // Efekt do ustawiania kursora w polu 2FA
    useEffect(() => {
        if (show2FA && twoFactorInputRef.current) {
            // Małe opóźnienie dla pewności, że element jest wyrenderowany
            setTimeout(() => {
                twoFactorInputRef.current.focus();
            }, 50);
        }
    }, [show2FA]);

    const validateForm = () => {
        const errors = {};

        if (!formData.email) errors.email = "Email jest wymagany";
        else if (!validateEmail(formData.email))
            errors.email = "Nieprawidłowy email";

        if (!formData.password || formData.password.length < 6)
            errors.password = "Min. 6 znaków";

        if (isRegister) {
            if (!formData.name) errors.name = "Nazwa firmy wymagana";

            if (!formData.contactEmail)
                errors.contactEmail = "Email kontaktowy wymagany";
            else if (!validateEmail(formData.contactEmail))
                errors.contactEmail = "Nieprawidłowy format emaila";

            if (!formData.nip) errors.nip = "NIP wymagany";
            else if (!validateNIP(formData.nip))
                errors.nip = "NIP musi mieć 10 cyfr";

            if (!formData.address) errors.address = "Adres wymagany";
            if (!formData.city) errors.city = "Miasto wymagane";

            if (!formData.postalCode)
                errors.postalCode = "Kod wymagany";
            else if (!validatePostalCode(formData.postalCode))
                errors.postalCode = "Format: XX-XXX";

            if (!formData.phone) errors.phone = "Telefon wymagany";
            else if (!validatePhone(formData.phone))
                errors.phone = "Format: +48XXXXXXXXX";
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Wrapper dla formularza logowania (obsługa Enter)
    const onFormSubmit = (e) => {
        e.preventDefault();
        handleSubmit();
    };

    // Wrapper dla formularza 2FA (obsługa Enter)
    const on2FASubmit = (e) => {
        e.preventDefault();
        handleVerify2FA();
    };

    const handleSubmit = async () => {
        setError("");

        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const endpoint = isRegister ? "/Auth/register" : "/Auth/login";
            const body = isRegister
                ? formData
                : { email: formData.email, password: formData.password };

            const res = await fetch(`${API_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Błąd logowania");
            }

            const data = await res.json();

            // Sprawdź czy wymaga 2FA
            if (data.twoFactorRequired) {
                setSessionToken(data.sessionToken);
                setShow2FA(true);
                setError("");
            } else {
                // Bezpośrednie logowanie (bez 2FA)
                sessionStorage.setItem("token", data.token);
                onLogin(data.token);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify2FA = async () => {
        setError("");

        if (!verificationCode || verificationCode.length !== 6) {
            setError("Wprowadź 6-cyfrowy kod");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/Auth/verify-2fa`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-2FA-Session": sessionToken,
                },
                body: JSON.stringify({ code: verificationCode }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Nieprawidłowy kod");
            }

            const data = await res.json();
            sessionStorage.setItem("token", data.token);
            onLogin(data.token);
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        setError("");
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/Auth/resend-code`, {
                method: "POST",
                headers: {
                    "X-2FA-Session": sessionToken,
                },
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Błąd wysyłania kodu");
            }

            setError("");
            alert("Nowy kod został wysłany!");
        } catch (e) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const updateField = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (validationErrors[field]) {
            setValidationErrors({
                ...validationErrors,
                [field]: undefined,
            });
        }
    };

    // Ekran weryfikacji 2FA
    if (show2FA) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
                    <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
                        Weryfikacja 2FA
                    </h1>
                    <p className="text-center text-gray-600 mb-6">
                        Wprowadź kod wysłany SMS-em
                    </p>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {/* Formularz 2FA obsługujący Enter */}
                    <form onSubmit={on2FASubmit} className="space-y-4">
                        <div>
                            <input
                                ref={twoFactorInputRef} // Dodany ref
                                type="text"
                                placeholder="Kod 6-cyfrowy"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                                maxLength={6}
                                disabled={isLoading}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest"
                                autoComplete="one-time-code"
                            />
                        </div>

                        <button
                            type="submit" // Type submit dla Entera
                            disabled={isLoading}
                            className={`w-full text-white py-3 rounded-lg font-semibold transition 
                                ${isLoading
                                    ? "bg-blue-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700"
                                }`}
                        >
                            {isLoading ? "Weryfikacja..." : "Weryfikuj"}
                        </button>

                        <button
                            type="button" // Ważne: type button żeby nie submitował formularza
                            onClick={handleResendCode}
                            disabled={isLoading}
                            className="w-full text-blue-600 hover:underline"
                        >
                            Wyślij kod ponownie
                        </button>

                        <button
                            type="button" // Ważne: type button
                            onClick={() => {
                                setShow2FA(false);
                                setSessionToken("");
                                setVerificationCode("");
                                setError("");
                            }}
                            disabled={isLoading}
                            className="w-full text-gray-600 hover:underline"
                        >
                            Anuluj
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Ekran logowania/rejestracji
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

                {/* Główny formularz obsługujący Enter */}
                <form onSubmit={onFormSubmit} className="space-y-4">
                    {/* Email (Login) */}
                    <div>
                        <input
                            type="email"
                            placeholder="Email (Login) *"
                            disabled={isLoading}
                            value={formData.email}
                            onChange={(e) =>
                                updateField("email", e.target.value)
                            }
                            className={`w-full px-4 py-3 border rounded-lg ${validationErrors.email
                                ? "border-red-500"
                                : "border-gray-300"
                                }`}
                        />
                        {validationErrors.email && (
                            <p className="text-red-500 text-xs mt-1">
                                {validationErrors.email}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <input
                            type="password"
                            placeholder="Hasło (min. 6 znaków) *"
                            disabled={isLoading}
                            value={formData.password}
                            onChange={(e) =>
                                updateField("password", e.target.value)
                            }
                            className={`w-full px-4 py-3 border rounded-lg ${validationErrors.password
                                ? "border-red-500"
                                : "border-gray-300"
                                }`}
                        />
                        {validationErrors.password && (
                            <p className="text-red-500 text-xs mt-1">
                                {validationErrors.password}
                            </p>
                        )}
                    </div>

                    {/* Pola rejestracji */}
                    {isRegister && (
                        <>
                            <InputField
                                label="Nazwa firmy *"
                                field="name"
                                formData={formData}
                                updateField={updateField}
                                error={validationErrors.name}
                                disabled={isLoading}
                            />

                            <InputField
                                label="Email kontaktowy *"
                                field="contactEmail"
                                formData={formData}
                                updateField={updateField}
                                error={validationErrors.contactEmail}
                                disabled={isLoading}
                            />

                            <InputField
                                label="NIP (10 cyfr) *"
                                field="nip"
                                formData={formData}
                                updateField={(f, v) =>
                                    updateField(f, v.replace(/\D/g, ""))
                                }
                                maxLength={10}
                                error={validationErrors.nip}
                                disabled={isLoading}
                            />

                            <InputField
                                label="Adres *"
                                field="address"
                                formData={formData}
                                updateField={updateField}
                                error={validationErrors.address}
                                disabled={isLoading}
                            />

                            <InputField
                                label="Miasto *"
                                field="city"
                                formData={formData}
                                updateField={updateField}
                                error={validationErrors.city}
                                disabled={isLoading}
                            />

                            <InputField
                                label="Kod pocztowy *"
                                field="postalCode"
                                maxLength={6}
                                formData={formData}
                                updateField={updateField}
                                error={validationErrors.postalCode}
                                disabled={isLoading}
                            />

                            <InputField
                                label="Telefon (+48XXXXXXXXX) *"
                                field="phone"
                                maxLength={12}
                                formData={formData}
                                updateField={updateField}
                                error={validationErrors.phone}
                                disabled={isLoading}
                            />
                        </>
                    )}

                    <button
                        type="submit" // Type submit dla Entera
                        disabled={isLoading}
                        className={`w-full text-white py-3 rounded-lg font-semibold transition 
                            ${isLoading
                                ? "bg-blue-400 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                            }`}
                    >
                        {isLoading
                            ? "Przetwarzanie..."
                            : (isRegister ? "Zarejestruj się" : "Zaloguj się")
                        }
                    </button>
                </form>

                <button
                    type="button" // Ważne: type button żeby nie submitował formularza
                    onClick={() => setIsRegister(!isRegister)}
                    disabled={isLoading}
                    className={`w-full mt-4 text-blue-600 hover:underline ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                    {isRegister
                        ? "Masz konto? Zaloguj się"
                        : "Nie masz konta? Zarejestruj się"}
                </button>
            </div>
        </div>
    );
};

const InputField = ({
    label,
    field,
    formData,
    updateField,
    error,
    maxLength,
    disabled
}) => (
    <div>
        <input
            type="text"
            placeholder={label}
            value={formData[field]}
            onChange={(e) => updateField(field, e.target.value)}
            maxLength={maxLength}
            disabled={disabled}
            className={`w-full px-4 py-3 border rounded-lg ${error ? "border-red-500" : "border-gray-300"
                }`}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);

export default LoginPage;