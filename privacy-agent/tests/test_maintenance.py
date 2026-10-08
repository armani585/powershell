"""The scheduled service purges inactive accounts without requiring secrets."""
import os
from pathlib import Path
import tempfile
from unittest.mock import patch

from cryptography.fernet import Fernet
import maintenance
from secure_store import SecureStore


def test_hourly_maintenance_runs_global_expiration():
    with tempfile.TemporaryDirectory() as directory:
        database = Path(directory) / 'privacy-secure-v2.db'
        with patch.dict(os.environ, {'PRIVACY_VAULT_KEY': Fernet.generate_key().decode()}, clear=True):
            with patch('secure_store.time.time', return_value=0), SecureStore(database, 'inactive-synthetic') as store:
                store.add('Expired fictitious value', ttl_days=1)
        with patch.dict(os.environ, {'PRIVACY_DATA_DIR': directory}, clear=True):
            with patch('maintenance.time.sleep', side_effect=InterruptedError) as sleep:
                try:
                    maintenance.main()
                except InterruptedError:
                    pass
                sleep.assert_called_once_with(3600)
        import sqlite3
        with sqlite3.connect(database) as connection:
            assert connection.execute('SELECT count(*) FROM secure_records').fetchone()[0] == 0
