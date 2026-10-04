const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Contraseña temporal legible (evita caracteres ambiguos 0/O, 1/l/I) para
// que el admin la pueda dictar/copiar sin errores.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateTempPassword(length = 12) {
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

module.exports = { generateTempPassword, hashPassword };
