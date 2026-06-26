"""Generate a VAPID key pair for Web Push.

Prints the base64'd PEM private key (the only value that goes in `.env` as
`VAPID_PRIVATE_KEY_B64`) and, for reference, the derived browser-facing
application server key. The app derives the public key from the private one at
runtime, so only the private key is stored.

Run inside the backend image (the host has no Python deps):

    docker exec -i vitaforge-backend python -m scripts.gen_vapid
"""

import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat


def main() -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    priv_b64 = base64.b64encode(pem).decode()

    raw_pub = private_key.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    app_server_key = base64.urlsafe_b64encode(raw_pub).rstrip(b"=").decode()

    print("# Add this line to backend/.env, then recreate the backend container:")
    print(f"VAPID_PRIVATE_KEY_B64={priv_b64}")
    print()
    print(f"# (derived) browser application server key: {app_server_key}")


if __name__ == "__main__":
    main()
