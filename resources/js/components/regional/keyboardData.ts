export interface KeyboardKey {
    type: 'char' | 'space' | 'backspace' | 'clear';
    value?: string;
}

export interface KeyboardRow {
    label?: string;
    columns: number;
    keys: KeyboardKey[];
}

const char = (value: string): KeyboardKey => ({ type: 'char', value });

export const DEVANAGARI_LAYOUT: KeyboardRow[] = [
    { columns: 4, keys: ['क', 'ख', 'ग', 'घ'].map(char) },
    { columns: 4, keys: ['च', 'छ', 'ज', 'झ'].map(char) },
    { columns: 4, keys: ['ट', 'ठ', 'ड', 'ढ'].map(char) },
    { columns: 4, keys: ['त', 'थ', 'द', 'ध'].map(char) },
    { columns: 4, keys: ['न', 'प', 'फ', 'ब'].map(char) },
    { columns: 4, keys: ['भ', 'म', 'य', 'र'].map(char) },
    { columns: 4, keys: ['ल', 'व', 'श', 'ष'].map(char) },
    { columns: 4, keys: ['स', 'ह', 'ळ', 'क्ष'].map(char) },
    { columns: 4, keys: ['ज्ञ', 'ङ', 'ञ', 'ण'].map(char) },
    { label: 'Vowels', columns: 5, keys: ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ'].map(char) },
    {
        label: 'Matras',
        columns: 5,
        keys: ['ा', 'ि', 'ी', 'ु', 'ू', 'ृ', 'े', 'ै', 'ो', 'ौ', '्', 'ं', 'ँ', 'ः'].map(char),
    },
    { label: 'Digits', columns: 5, keys: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'].map(char) },
    { label: 'Symbols', columns: 4, keys: ['।', 'ॐ', 'ऽ', '(', ')', ',', '.', '!'].map(char) },
];
