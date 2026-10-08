"""Hourly ciphertext purge, including inactive users; no decryption keys required."""
import os
from pathlib import Path
import time
from secure_store import purge_expired


def main():
    path = Path(os.environ.get("PRIVACY_DATA_DIR", "data")) / "privacy-secure-v2.db"
    while True:
        # A failed purge must terminate visibly for the service manager to restart.
        purge_expired(path)
        time.sleep(3600)


if __name__ == "__main__":
    main()
