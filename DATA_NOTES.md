# Data notes

Grundlistan innehåller 30 praktiskt vanliga/igenkännbara svenska dagfjärilar. Bildlänkarna för grundarterna är direkta Wikimedia Commons-filer, medan källsidans licensinformation behöver följas upp innan publik lansering.

Den här versionen har även lokalt stöd för egna fjärilar:

- obligatoriskt svenskt/eget namn
- obligatoriskt latinskt namn
- obligatorisk bild
- obligatorisk beskrivning
- valfri extra bild

Egna arter sparas i `localStorage` under nyckeln `fjarilsguiden.customSpecies.v1`.

## v1.5.44 local species assets

- Referensbilderna för fjärilarna ligger nu lokalt i `assets/species/` som optimerade WebP-filer.
- De flesta arter använder 1 bild; arter med tydlig hane/hona-distinktion använder 2 bilder.
- Kortlayouten hanterar 1 respektive 2 bilder mer harmoniskt på mobil och desktop.
