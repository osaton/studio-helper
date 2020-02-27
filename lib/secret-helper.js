'use strict';

const os = require('os');
const Crypto = require('crypto');

class SecretHelper {
  constructor() {
    this.iterations = 196935;
  }
  /**
   * Get first non-internal MAC address if any available
   * @return {string} MAC
   */
  getFirstMAC() {
    const allowed = ['eth0', 'eth1', 'en0', 'en1'];
    const interfaces = os.networkInterfaces();

    for (let iface in interfaces) {
      if (interfaces.hasOwnProperty(iface)) {
        const interfaceArr = interfaces[iface];

        if (allowed.indexOf(iface) !== -1) {
          for (let i = 0, l = interfaceArr.length; i < l; i++) {
            const addressData = interfaceArr[i];

            if (!addressData.internal && addressData.mac) {
              return addressData.mac;
            }
          }
        }
      }
    }

    return '';
  }

  /**
   * Get first CPU Model
   * @return {string} CPU
   */
  getCPUModel() {
    // And cpu model
    const cpus = os.cpus();
    if (cpus && cpus.length) {
      return cpus[0].model;
    }
  }

  /**
   * Get parts of current path
   * @param {number} [divider=3] Return every nth letter, default is 3
   * @return {string} path
   */
  getCurrentPath(divider) {
    divider = divider >= 0 ? divider : 3;
    // Add parts of current path for little bit of extra secrecy :P
    return __dirname.split('').map((l,i) => (i + 1) % divider ? l : '').join('');
  }

  /**
   * @private
   * @param {string} secret - Secret string
   * @param {string} salt - Salt string
   * @return {Buffer} key
   */
  getKeyBuffer(secret, salt) {
    const iterations = this.iterations || 196934;

    return new Promise((resolve, reject) => {
      Crypto.pbkdf2(secret, salt, iterations, 16, 'sha512', (err, derivedKey) => {
        if (err) {
          return reject(err);
        }
        //console.log('key', derivedKey.toString('hex'));
        return resolve(derivedKey);
      });
    });
  }

  /**
   * @private
   * @param {string} secret - Secret string
   * @param {string} salt - Salt string
   * @return {Buffer} key
   */
  getKeyBufferSync(secret, salt) {
    const iterations = this.iterations || 196934;

    return Crypto.pbkdf2Sync(secret, salt, iterations, 16, 'sha512');
  }

  /**
   * Encrypts string
   * @param {string} secret - Encrypt using this as secret
   * @param {string} dataString - String to encrypt
   * @param {Object} options - options
   * @return {Promise} hash string
   */
  encrypt(secret, dataString, options) {
    const iv = Crypto.randomBytes(16);
    const salt = Crypto.randomBytes(16);

    const getCipher = (keyBuffer) => {
      const cipher = Crypto.createCipheriv('aes-128-cbc', keyBuffer, iv);
      const encrypted = cipher.update(dataString);
      const finalBuffer = Buffer.concat([encrypted, cipher.final()]);

      //Need to retain salt and IV for decryption, so this can be appended to the output with a separator (non-hex for this example)
      return salt.toString('hex') + ':' + iv.toString('hex') + ':' + finalBuffer.toString('hex');
    }

    if (options && options.sync) {
      const keyBuffer = this.getKeyBufferSync(secret, salt);
      return getCipher(keyBuffer);
    }

    return this.getKeyBuffer(secret, salt).then(keyBuffer => {
      return getCipher(keyBuffer);
    });
  }

  /**
   * Decrypts string
   * @param {string} secret - Decrypt using this as secret
   * @param {string} dataString - String to decrypt as provided by secretHelper.encrypt() (salt:iv:cipher)
   * @param {Object} options - options
   * @return {undefined}
   */
  decrypt(secret, dataString, options) {
    const parts = dataString.split(':');
    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const cipher = Buffer.from(parts[2], 'hex');

    const decipher = (keyBuffer) => {
      const decipher = Crypto.createDecipheriv('aes-128-cbc', keyBuffer, iv);
      const decrypted = decipher.update(cipher);
      const clearText = Buffer.concat([decrypted, decipher.final()]).toString();

      return clearText;
    }

    if (options && options.sync) {
      const keyBuffer = this.getKeyBufferSync(secret, salt);
      return decipher(keyBuffer);
    }

    return this.getKeyBuffer(secret, salt).then(keyBuffer => {
      return decipher(keyBuffer);
    });
  }

  decryptSync(secret, dataString) {
    return this.decrypt(secret, dataString, { 'sync': true });
  }

  encryptSync(secret, dataString) {
    return this.encrypt(secret, dataString, { 'sync': true });
  }
}

module.exports = new SecretHelper();
