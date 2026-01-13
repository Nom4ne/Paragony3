export const validateEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const validatePhone = (phone) =>
    /^\+48\d{9}$/.test(phone);

export const validateNIP = (nip) =>
    /^\d{10}$/.test(nip);

export const validatePostalCode = (code) =>
    /^\d{2}-\d{3}$/.test(code);
