import yaml
from typing import Optional, Any
from pydantic import BaseModel
import os
import logging

class Agent(BaseModel):
    name: str
    model: str
    temperature: Optional[float] = 0.0

class OpenAIConfig(BaseModel):
    api_key: str

class GoogleConfig(BaseModel):
    api_key: str

class LocalStorageConfig(BaseModel):
    path: str
class StorageConfig(BaseModel):
    local: LocalStorageConfig

class AWSAccessKeyConfig(BaseModel):
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_DEFAULT_REGION: str

class S3Config(BaseModel):
    USER_ASSETS_BUCKET: str
    USER_ASSETS_BUCKET_VERSION: str

class DynamoDBConfig(BaseModel):
    DASHBOARDS_TABLE: str

class AWSConfig(BaseModel):
    access_key: AWSAccessKeyConfig
    s3: S3Config
    dynamodb: Optional[DynamoDBConfig] = None

class Config(BaseModel):
    openai: OpenAIConfig
    google: GoogleConfig
    agent: list[Agent]
    storage: StorageConfig
    aws: Optional[AWSConfig] = None

def load_config() -> Config:
    """
    Load configuration from config.yaml, using the specified environment (default: 'prod').
    Returns a Config instance.
    """
    # Accept both .yml and .yaml extensions
    config_path = "config/config.yaml"
    if not os.path.exists(config_path):
        config_path = "config/config.yml"
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Config file not found: {config_path}")

    with open(config_path, "r") as f:
        raw_cfg = yaml.safe_load(f)

    cfg = Config(**raw_cfg)
    if not cfg.aws or not cfg.aws.access_key:
        logging.getLogger("morpheus").warning(
            "AWS credentials missing from config file located at %s", config_path
        )
    return cfg

config = load_config()
