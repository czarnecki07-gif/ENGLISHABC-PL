/* ============================================================
   KONFIGURACJA KURSU
   ============================================================ */

const KONFIG = {
  tytul: "Angielski dla Polaków",
  podtytul: "Kurs A1 → C1 · 192 lekcje · Gramatyka i Tematyka",

  // Lista UKRYTYCH lekcji (np. "G16C1", "TESTG16")
  // Zostaw pustą [], jeśli nic nie ukrywasz.
  ukryte: [],

  dzialy: {
    /* ---- GRAMATYKA ---- */
    G1:  { nazwa: "Present Simple",             opis: "Czas teraźniejszy prosty" },
    G2:  { nazwa: "Present Continuous",         opis: "Czas teraźniejszy ciągły" },
    G3:  { nazwa: "Past Simple",                opis: "Czas przeszły prosty" },
    G4:  { nazwa: "Past Continuous",            opis: "Czas przeszły ciągły" },
    G5:  { nazwa: "Present Perfect",            opis: "Czas teraźniejszy dokonany" },
    G6:  { nazwa: "Future Simple",              opis: "Czas przyszły – will / going to" },
    G7:  { nazwa: "Czasowniki modalne",         opis: "can, must, should" },
    G8:  { nazwa: "Rzeczowniki policzalne",     opis: "some / any / much / many" },
    G9:  { nazwa: "Przedimki",                  opis: "a / an / the" },
    G10: { nazwa: "Stopniowanie",               opis: "Przymiotniki i przysłówki" },
    G11: { nazwa: "Zaimki",                     opis: "Osobowe, dzierżawcze, zwrotne" },
    G12: { nazwa: "Przyimki",                   opis: "in, on, at" },
    G13: { nazwa: "Mowa zależna",               opis: "Reported speech" },
    G14: { nazwa: "Strona bierna",              opis: "Passive voice" },
    G15: { nazwa: "Zdania warunkowe",           opis: "Conditionals 0–3" },
    G16: { nazwa: "Phrasal verbs",              opis: "Czasowniki frazowe" },

    /* ---- TEMATYKA ---- */
    T1:  { nazwa: "Przedstawianie się",         opis: "Powitania, imię, kraj" },
    T2:  { nazwa: "Rodzina i przyjaciele",      opis: "Opisy osób" },
    T3:  { nazwa: "Dom i mieszkanie",           opis: "Pomieszczenia, meble" },
    T4:  { nazwa: "Praca i zawody",             opis: "Rozmowa o pracy" },
    T5:  { nazwa: "Jedzenie i restauracja",     opis: "Zamawianie, menu" },
    T6:  { nazwa: "Podróże i transport",        opis: "Lotnisko, dworzec" },
    T7:  { nazwa: "Zakupy i pieniądze",         opis: "Ubrania, ceny" },
    T8:  { nazwa: "Zdrowie i ciało",            opis: "U lekarza, apteka" },
    T9:  { nazwa: "Szkoła i edukacja",          opis: "Przedmioty, uczelnia" },
    T10: { nazwa: "Sport i hobby",              opis: "Czas wolny" },
    T11: { nazwa: "Pogoda i pory roku",         opis: "Prognoza, klimat" },
    T12: { nazwa: "Technologia i internet",     opis: "Komputer, telefon" },
    T13: { nazwa: "Emocje i uczucia",           opis: "Radość, smutek, złość" },
    T14: { nazwa: "Podróże zagraniczne",        opis: "Hotel, kultura" },
    T15: { nazwa: "Praca i kariera",            opis: "CV, rozmowa kwalifikacyjna" },
    T16: { nazwa: "Kultura i sztuka",           opis: "Film, muzyka, literatura" }
  }
};
