"""
Settings. Everything comes from environment variables (APIFY_API_TOKEN, SCRAPE_MAX_JOBS_PER_ROLE ...).
A .env file in the folder you run manage.py from is loaded first; values already in the
environment win. JOB_SCRAPER_ENV_FILE=<path> loads another file, JOB_SCRAPER_ENV_FILE="" none.

The database is one of the project's DATABASES entries, named by JOB_SCRAPER_DB_ALIAS
(default "default"). It must be PostgreSQL.
"""
from __future__ import annotations

import os

_loaded = False


def load_env_file() -> None:
    global _loaded
    if _loaded:
        return
    _loaded = True
    path = os.environ.get('JOB_SCRAPER_ENV_FILE')
    if path and os.path.isfile(path):
        env_path = path
    else:
        # Check cwd first, then django_backend root relative to this file
        cwd_env = os.path.join(os.getcwd(), '.env')
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        backend_env = os.path.join(backend_dir, '.env')

        if os.path.isfile(cwd_env):
            env_path = cwd_env
        elif os.path.isfile(backend_env):
            env_path = backend_env
        else:
            return

    try:
        from dotenv import load_dotenv
    except ImportError:  # python-dotenv not installed: rely on the real environment
        return
    load_dotenv(env_path, override=False)


load_env_file()


def env(name: str) -> str | None:
    """The environment variable, or None when not set."""
    val = os.environ.get(name)
    if val is not None and name == 'APIFY_API_TOKEN':
        val = val.strip().replace(' ', '').replace('\t', '').replace('\r', '').replace('\n', '')
    return val


def environ() -> dict:
    return os.environ


def db_alias() -> str:
    try:
        from django.conf import settings
        alias = getattr(settings, 'JOB_SCRAPER_DB_ALIAS', None)
        if alias:
            return alias
    except Exception:  # settings not configured
        pass
    return os.environ.get('JOB_SCRAPER_DB_ALIAS') or 'default'


def data_dir() -> str:
    """DATA_DIR: where the government files are read from (default ./data)."""
    return os.environ.get('DATA_DIR') or './data'
