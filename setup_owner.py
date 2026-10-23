"""Run locally in your own terminal. Do not paste the generated secrets into chat."""
import base64
import getpass
import hashlib
import secrets
password = getpass.getpass('Choose owner password (at least 16 characters): ')
if len(password) < 16:
    raise SystemExit('Use at least 16 characters.')
if password != getpass.getpass('Repeat password: '):
    raise SystemExit('Passwords did not match.')
salt = secrets.token_hex(16)
hash_value = hashlib.scrypt(password.encode(), salt=salt.encode(), n=32768, r=8, p=1, dklen=64, maxmem=64*1024*1024).hex()
secret = base64.b32encode(secrets.token_bytes(20)).decode()
print('\nSet these only in the server environment secret settings:')
print('OWNER_PASSWORD_HASH=' + salt + ':' + hash_value)
print('OWNER_TOTP_SECRET=' + secret)
print('\nAdd the TOTP secret to your authenticator using SHA1, 6 digits, 30 seconds.')
print('Save your password and authenticator backup securely. No public password-reset endpoint is provided.')
