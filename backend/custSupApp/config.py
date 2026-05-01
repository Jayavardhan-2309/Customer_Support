import os


class ConfigurationError(RuntimeError):
    """Raised when a required runtime configuration value is missing."""


def required_env(name: str) -> str:
    value = os.environ.get(name)
    if value:
        return value
    raise ConfigurationError(f"Missing required environment variable: {name}")
