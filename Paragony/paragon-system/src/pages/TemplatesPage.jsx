import React, { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, ChevronDown, Check, Upload, X } from "lucide-react";

const TemplatesPage = ({ templates, api, onUpdate, isDarkMode }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);

    const [availableFonts, setAvailableFonts] = useState([]);
    const [isLoadingFonts, setIsLoadingFonts] = useState(false);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const [uploading, setUploading] = useState(false);

    // NOWY STAN: Przechowuje obiekt pliku (File) przed wysłaniem
    const [pendingFile, setPendingFile] = useState(null);

    const [formData, setFormData] = useState({
        name: "",
        headerText: "",
        footerText: "",
        logoFile: "",          // Nazwa GUID (string)
        logoOriginalName: "",  // Nazwa dla usera (string)
        fontStyle: "Consolas",
    });

    // === STYLE DLA DARK MODE ===
    const theme = {
        card: isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900',
        label: isDarkMode ? 'text-gray-300' : 'text-gray-700',
        input: isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900',
        subText: isDarkMode ? 'text-gray-400' : 'text-gray-500',
        dropdown: isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300',
        dropdownItem: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
        dropdownActive: isDarkMode ? 'bg-gray-600' : 'bg-gray-200',
        buttonCancel: isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 border border-gray-300 hover:bg-gray-100'
    };

    useEffect(() => {
        const fetchFonts = async () => {
            setIsLoadingFonts(true);
            try {
                const data = await api.get("/Print/available-fonts");
                if (data && Array.isArray(data.fonts)) {
                    setAvailableFonts(data.fonts);
                } else if (Array.isArray(data)) {
                    setAvailableFonts(data);
                } else {
                    setAvailableFonts(["Consolas"]);
                }
            } catch (err) {
                console.error("Błąd pobierania czcionek:", err);
                setAvailableFonts(["Consolas", "Arial", "Times New Roman"]);
            } finally {
                setIsLoadingFonts(false);
            }
        };
        fetchFonts();
    }, [api]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleEdit = (template) => {
        setEditingTemplate(template);
        // Resetujemy pendingFile przy edycji
        setPendingFile(null);
        setFormData({
            name: template.name,
            headerText: template.headerText || "",
            footerText: template.footerText || "",
            logoFile: template.logoFile || "",
            logoOriginalName: template.logoOriginalName || "",
            fontStyle: template.fontStyle || "Consolas",
        });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingTemplate(null);
        setPendingFile(null); // Czyścimy oczekujący plik
        setFormData({ name: "", headerText: "", footerText: "", logoFile: "", logoOriginalName: "", fontStyle: "Consolas" });
        setIsDropdownOpen(false);
    };

    // --- ZMIANA: WYBÓR PLIKU (TYLKO LOKALNIE) ---
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Zapisz plik w stanie, ale NIE wysyłaj jeszcze
        setPendingFile(file);

        // 2. Zaktualizuj nazwę w formularzu, żeby użytkownik widział co wybrał
        // Pole logoFile zostawiamy bez zmian (lub puste, jeśli to nowy) - zostanie nadpisane po uploadzie
        setFormData(prev => ({
            ...prev,
            logoOriginalName: file.name
        }));

        // Resetujemy input file, aby można było wybrać ten sam plik ponownie w razie pomyłki
        e.target.value = null;
    };

    const handleRemoveLogo = () => {
        setPendingFile(null);
        setFormData(prev => ({ ...prev, logoFile: "", logoOriginalName: "" }));
    };

    // --- ZMIANA: SUBMIT (UPLOAD + ZAPIS DANYCH) ---
    const handleSubmit = async () => {
        setUploading(true);
        try {
            // Przygotuj zmienne na finalne dane logo
            let finalLogoFile = formData.logoFile;
            let finalLogoOriginalName = formData.logoOriginalName;

            // KROK 1: Jeśli jest wybrany nowy plik (pendingFile), wyślij go teraz
            if (pendingFile) {
                const uploadData = new FormData();
                uploadData.append("file", pendingFile);

                try {
                    const response = await api.upload("/ReceiptTemplates/uploadLogo", uploadData);

                    if (response.logoFile && response.logoOriginalName) {
                        finalLogoFile = response.logoFile;
                        finalLogoOriginalName = response.logoOriginalName;
                    } else {
                        throw new Error("API nie zwróciło nazw plików.");
                    }
                } catch (uploadErr) {
                    const errMsg = uploadErr.response?.data?.message || uploadErr.message;
                    throw new Error("Błąd przesyłania logo: " + errMsg);
                }
            }

            // KROK 2: Przygotuj ostateczny obiekt do zapisu
            const finalPayload = {
                ...formData,
                logoFile: finalLogoFile,
                logoOriginalName: finalLogoOriginalName
            };

            // KROK 3: Wyślij dane formularza (PUT lub POST)
            if (editingTemplate) {
                await api.put(`/ReceiptTemplates/${editingTemplate.id}`, finalPayload);
            } else {
                await api.post("/ReceiptTemplates", finalPayload);
            }

            handleCancel();
            onUpdate();
        } catch (err) {
            console.error("Błąd zapisu:", err);
            const errMsg = err.message || err.response?.data?.title || "Wystąpił nieznany błąd";
            alert("Nie udało się zapisać: " + errMsg);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Czy na pewno usunąć szablon? Spowoduje to również usunięcie pliku logo z serwera.")) return;
        try {
            await api.delete(`/ReceiptTemplates/${id}`);
            onUpdate();
        } catch (err) {
            console.error("Błąd usuwania szablonu:", err);
            alert("Błąd podczas usuwania szablonu: " + (err.message || err));
        }
    };

    const filteredFonts = availableFonts.filter(font =>
        font.toLowerCase().includes(formData.fontStyle.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Szablony paragonów
                </h1>
                <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700">
                    <Plus size={18} />
                    <span>Dodaj szablon</span>
                </button>
            </div>

            {showForm && (
                <div className={`p-6 rounded-lg mb-6 shadow-lg ${theme.card}`}>
                    <h2 className="text-xl font-bold mb-4">{editingTemplate ? "Edytuj szablon" : "Nowy szablon"}</h2>
                    <div className="space-y-4">

                        {/* Nazwa Szablonu */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>Nazwa szablonu</label>
                            <input
                                type="text"
                                placeholder="Np. Standardowy Paragon"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={`w-full px-4 py-2 border rounded-lg outline-none ${theme.input}`}
                            />
                        </div>

                        {/* Nagłówek */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>Nagłówek paragonu</label>
                            <textarea
                                placeholder="Tekst wyświetlany na górze paragonu"
                                value={formData.headerText}
                                onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                                className={`w-full px-4 py-2 border rounded-lg h-24 outline-none ${theme.input}`}
                            />
                        </div>

                        {/* Stopka */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>Stopka paragonu</label>
                            <textarea
                                placeholder="Tekst wyświetlany na dole paragonu"
                                value={formData.footerText}
                                onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                                className={`w-full px-4 py-2 border rounded-lg h-24 outline-none ${theme.input}`}
                            />
                        </div>

                        {/* Logo Upload */}
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>Logo</label>

                            <div className="flex items-center gap-4">
                                {/* Wyświetlamy jeśli jest załadowane (logoFile) LUB jeśli użytkownik właśnie wybrał plik (pendingFile) */}
                                {(formData.logoFile || pendingFile) ? (
                                    <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${isDarkMode ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-gray-50"}`}>
                                        <Check size={18} className="text-green-500" />
                                        <span className={`text-sm truncate max-w-[200px] ${theme.subText}`}>
                                            {/* Priorytet: nazwa wybranego pliku, potem nazwa z bazy */}
                                            {pendingFile ? pendingFile.name : (formData.logoOriginalName || formData.logoFile)}
                                            {pendingFile && <span className="ml-2 text-xs text-blue-500">(Do wysłania)</span>}
                                        </span>
                                        <button
                                            onClick={handleRemoveLogo}
                                            className="ml-2 text-red-500 hover:text-red-700"
                                            title="Usuń logo"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    // Przycisk wyboru pliku
                                    <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-opacity-80 transition-colors ${isDarkMode ? "bg-gray-700 border-gray-600 text-white hover:bg-gray-600" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
                                        <Upload size={18} />
                                        <span>Wybierz plik</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            // disabled podczas finalnego zapisu
                                            disabled={uploading}
                                        />
                                    </label>
                                )}
                            </div>
                            <p className={`text-xs mt-1 ${theme.subText}`}>Obsługiwane formaty: JPG, PNG, BMP, GIF. Plik zostanie wysłany po kliknięciu "Zapisz".</p>
                        </div>

                        {/* Font Selector */}
                        <div className="relative" ref={dropdownRef}>
                            <label className={`block text-sm font-medium mb-1 ${theme.label}`}>Styl czcionki</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className={`w-full px-4 py-2 border rounded-lg pr-10 outline-none ${theme.input}`}
                                    placeholder="Wpisz nazwę czcionki..."
                                    value={formData.fontStyle}
                                    onChange={(e) => {
                                        setFormData({ ...formData, fontStyle: e.target.value });
                                        setIsDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    disabled={isLoadingFonts}
                                />
                                <div
                                    className="absolute right-3 top-2.5 text-gray-400 cursor-pointer"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                >
                                    <ChevronDown size={20} />
                                </div>
                            </div>

                            {isDropdownOpen && (
                                <div className={`absolute z-10 w-full mt-1 rounded-md shadow-lg max-h-60 overflow-y-auto border ${theme.dropdown}`}>
                                    {isLoadingFonts ? (
                                        <div className="p-3 text-sm text-gray-500">Ładowanie czcionek...</div>
                                    ) : filteredFonts.length > 0 ? (
                                        filteredFonts.map((font) => (
                                            <div
                                                key={font}
                                                className={`px-4 py-2 cursor-pointer flex justify-between items-center ${theme.dropdownItem} ${formData.fontStyle === font ? theme.dropdownActive : ""}`}
                                                onClick={() => {
                                                    setFormData({ ...formData, fontStyle: font });
                                                    setIsDropdownOpen(false);
                                                }}
                                            >
                                                <span style={{ fontFamily: font }}>{font}</span>
                                                {formData.fontStyle === font && <Check size={16} className={isDarkMode ? "text-white" : "text-blue-600"} />}
                                            </div>
                                        ))
                                    ) : (
                                        <div className={`p-3 text-sm ${theme.subText}`}>Nie znaleziono czcionki.</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex space-x-2 pt-2">
                            <button
                                onClick={handleSubmit}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
                                disabled={uploading}
                            >
                                {uploading && <span className="animate-spin mr-2">⏳</span>}
                                {uploading ? "Wysyłanie i zapisywanie..." : (editingTemplate ? "Zapisz zmiany" : "Zapisz")}
                            </button>
                            <button onClick={handleCancel} className={`px-4 py-2 rounded transition-colors ${theme.buttonCancel}`} disabled={uploading}>
                                Anuluj
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {templates.map((template) => (
                    <div key={template.id} className={`p-4 rounded-lg shadow transition-colors ${theme.card}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h3 className="font-bold text-lg">{template.name}</h3>
                                {template.headerText && <p className={`text-sm mt-2 ${theme.subText}`}>Nagłówek: {template.headerText}</p>}
                                {template.footerText && <p className={`text-sm ${theme.subText}`}>Stopka: {template.footerText}</p>}

                                {template.logoFile && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <p className={`text-sm ${theme.subText}`}>Logo:</p>
                                        <span className={`text-sm font-medium ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
                                            {template.logoOriginalName || template.logoFile}
                                        </span>
                                    </div>
                                )}

                                <p className={`text-sm ${theme.subText} mt-1`} style={{ fontFamily: template.fontStyle }}>
                                    Czcionka: <strong>{template.fontStyle}</strong>
                                </p>
                            </div>

                            <div className="flex space-x-2">
                                <button onClick={() => handleEdit(template)} className="text-blue-600 hover:text-blue-800 flex items-center space-x-1">
                                    <Edit size={16} />
                                    <span>Edytuj</span>
                                </button>
                                <button onClick={() => handleDelete(template.id)} className="text-red-600 hover:text-red-800 flex items-center space-x-1">
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

export default TemplatesPage;