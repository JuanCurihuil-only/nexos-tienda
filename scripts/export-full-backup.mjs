/**
 * LEGACY — exportaba un respaldo completo desde Neon.
 * La tienda ahora usa Firestore. Para respaldar:
 *   - Panel admin → Respaldo
 *   - O Firebase Console (Firestore + Storage)
 * Para sembrar: npm run seed:firestore
 */
console.error(
  "export-full-backup.mjs es legacy (Neon). La tienda usa Firestore.\n" +
    "Usá el botón Respaldo del admin, o exportá desde Firebase Console.\n" +
    "Para sembrar Firestore: npm run seed:firestore",
);
process.exit(1);
