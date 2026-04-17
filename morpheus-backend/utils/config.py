import yaml
from typing import Optional, Any, List, Dict
from pydantic import BaseModel, Field
import os

class AppConfig(BaseModel):
    name: str
    version: str
    secret_key: str
    debug: bool
    host: str
    port: int

class ApiConfig(BaseModel):
    version: str
    prefix: str
    cors_origins: List[str] = ["*"]

class FileStorageConfig(BaseModel):
    root: str
    uploads_dir: str
    processed_dir: str
    temp_dir: str
    metadata_root: str
    metadata_uploads_dir: str
    metadata_dashboards_dir: str

class FileUploadConfig(BaseModel):
    max_file_size: int = 52428800
    upload_folder: str = "uploads"
    allowed_extensions: List[str] = Field(default_factory=lambda: ["csv", "xlsx", "xls", "json"])
    storage: Optional[FileStorageConfig] = None

class LoggingConfig(BaseModel):
    level: str
    file: str

class SecurityConfig(BaseModel):
    jwt_secret_key: str
    jwt_access_token_expires: int
    jwt_refresh_token_expires: int

class ExternalServicesConfig(BaseModel):
    openai_api_key: Optional[str] = None
    google_analytics_id: Optional[str] = None

class StripeConfig(BaseModel):
    publishable_key: str
    secret_key: str
    webhook_secret: str

class AWSAccessKeyConfig(BaseModel):
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_DEFAULT_REGION: str

class S3Config(BaseModel):
    USER_ASSETS_BUCKET: str
    USER_ASSETS_BUCKET_VERSION: str
    CONVERSATIONS_BUCKET: str

class DynamoDBConfig(BaseModel):
    PROJECTS_TABLE: str
    ASSETS_TABLE: str
    CONVERSATIONS_TABLE: str
    WORKFLOW_STATUS_TABLE: str
    DASHBOARDS_TABLE: str

class ClerkConfig(BaseModel):
    CLERK_SECRET_KEY: str
    CLERK_JWT_KEY: str

class AdminConfig(BaseModel):
    admins: List[Dict[str, str]]

class AWSConfig(BaseModel):
    access_key: AWSAccessKeyConfig
    s3: S3Config
    dynamodb: DynamoDBConfig
    
class Config(BaseModel):
    app: AppConfig
    api: ApiConfig
    file_upload: Optional[FileUploadConfig] = None
    logging: LoggingConfig
    security: SecurityConfig
    external_services: Optional[ExternalServicesConfig] = None
    stripe: StripeConfig
    aws: AWSConfig
    clerk: ClerkConfig
    admin: Optional[AdminConfig] = None

def load_config() -> Config:
    """
    Load configuration from config.yaml, using the specified environment (default: 'prod').
    Returns a Config instance.
    """
    # Accept both .yml and .yaml extensions
    # Try multiple paths based on where the script is run from
    possible_paths = [
        "config/config.yaml",
        os.path.join(os.path.dirname(__file__), "..", "config", "config.yaml"),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", "config.yaml"),
    ]
    
    config_path = None
    for path in possible_paths:
        abs_path = os.path.abspath(path)
        if os.path.exists(abs_path):
            config_path = abs_path
            break
    
    if not config_path:
        # Try .yml extension
        yml_paths = [
            "config/config.yml",
            os.path.join(os.path.dirname(__file__), "..", "config", "config.yml"),
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", "config.yml"),
        ]
        for path in yml_paths:
            abs_path = os.path.abspath(path)
            if os.path.exists(abs_path):
                config_path = abs_path
                break
    
    if not config_path:
        raise FileNotFoundError(f"Config file not found. Tried: {possible_paths}")

    with open(config_path, "r") as f:
        raw_cfg = yaml.safe_load(f) or {}
    
    # Set default file storage paths if file_upload.storage is not provided but file_upload exists
    if 'file_upload' in raw_cfg and raw_cfg['file_upload'] and 'storage' not in raw_cfg['file_upload']:
        storage_root = raw_cfg['file_upload'].get('storage_root', 'file-storage')
        raw_cfg['file_upload']['storage'] = {
            'root': storage_root,
            'uploads_dir': f"{storage_root}/uploads",
            'processed_dir': f"{storage_root}/processed",
            'temp_dir': f"{storage_root}/temp",
            'metadata_root': f"{storage_root}/metadata",
            'metadata_uploads_dir': f"{storage_root}/metadata/uploads",
            'metadata_dashboards_dir': f"{storage_root}/metadata/dashboards"
        }

    # Map VERSION to USER_ASSETS_BUCKET_VERSION
    if 'aws' in raw_cfg and 's3' in raw_cfg['aws']:
        if 'VERSION' in raw_cfg['aws']['s3']:
            raw_cfg['aws']['s3']['USER_ASSETS_BUCKET_VERSION'] = raw_cfg['aws']['s3']['VERSION']
            del raw_cfg['aws']['s3']['VERSION']

    # Strip CLERK_JWT_KEY if present (only leading/trailing whitespace, preserve PEM format)
    if 'clerk' in raw_cfg and 'CLERK_JWT_KEY' in raw_cfg['clerk']:
        # Only strip leading/trailing whitespace to preserve PEM format structure
        raw_cfg['clerk']['CLERK_JWT_KEY'] = raw_cfg['clerk']['CLERK_JWT_KEY'].strip()

    config = Config(**raw_cfg)
    _validate_and_setup(config)
    return config

def _validate_and_setup(config: Config) -> None:
    """Validate settings and create required directories."""
    # Validate secret keys
    if not config.app.secret_key or config.app.secret_key == "dev-secret-key":
        print("Warning: Using default secret key. Set app.secret_key for production.")
    
    if not config.security.jwt_secret_key or config.security.jwt_secret_key == "jwt-secret-key":
        print("Warning: Using default JWT secret key. Set security.jwt_secret_key for production.")
    
    # Note: Local file storage directories are no longer created.
    # All files are stored in S3. Local storage paths are kept for backward compatibility
    # but directories are not created.
    
    # Ensure logs directory exists
    log_dir = os.path.dirname(config.logging.file)
    if log_dir:
        os.makedirs(log_dir, exist_ok=True)

class Settings:
    """Backward compatibility wrapper for old settings API."""
    def __init__(self, config: Config):
        self.APP_NAME = config.app.name
        self.APP_VERSION = config.app.version
        self.DEBUG = config.app.debug
        self.SECRET_KEY = config.app.secret_key
        self.HOST = config.app.host
        self.PORT = config.app.port
        
        # File upload config with defaults
        if config.file_upload:
            self.UPLOAD_FOLDER = config.file_upload.upload_folder
            self.ALLOWED_EXTENSIONS = config.file_upload.allowed_extensions
            
            if config.file_upload.storage:
                # DEPRECATED: Local file storage paths. Files are now stored in S3.
                self.FILE_STORAGE_ROOT = config.file_upload.storage.root
                self.FILE_UPLOADS_DIR = config.file_upload.storage.uploads_dir
                self.FILE_PROCESSED_DIR = config.file_upload.storage.processed_dir
                self.FILE_TEMP_DIR = config.file_upload.storage.temp_dir
                self.FILE_METADATA_ROOT = config.file_upload.storage.metadata_root
                self.FILE_METADATA_UPLOADS_DIR = config.file_upload.storage.metadata_uploads_dir
                self.FILE_METADATA_DASHBOARDS_DIR = config.file_upload.storage.metadata_dashboards_dir
            else:
                # DEPRECATED: Default file storage paths. Files are now stored in S3.
                self.FILE_STORAGE_ROOT = "file-storage"
                self.FILE_UPLOADS_DIR = "file-storage/uploads"
                self.FILE_PROCESSED_DIR = "file-storage/processed"
                self.FILE_TEMP_DIR = "file-storage/temp"
                self.FILE_METADATA_ROOT = "file-storage/metadata"
                self.FILE_METADATA_UPLOADS_DIR = "file-storage/metadata/uploads"
                self.FILE_METADATA_DASHBOARDS_DIR = "file-storage/metadata/dashboards"
        else:
            # DEPRECATED: Default file upload settings. Files are now stored in S3.
            self.UPLOAD_FOLDER = "uploads"
            self.ALLOWED_EXTENSIONS = ["csv", "xlsx", "xls", "json"]
            self.FILE_STORAGE_ROOT = "file-storage"
            self.FILE_UPLOADS_DIR = "file-storage/uploads"
            self.FILE_PROCESSED_DIR = "file-storage/processed"
            self.FILE_TEMP_DIR = "file-storage/temp"
            self.FILE_METADATA_ROOT = "file-storage/metadata"
            self.FILE_METADATA_UPLOADS_DIR = "file-storage/metadata/uploads"
            self.FILE_METADATA_DASHBOARDS_DIR = "file-storage/metadata/dashboards"
        
        self.CORS_ORIGINS = config.api.cors_origins
        
        self.API_VERSION = config.api.version
        self.API_PREFIX = config.api.prefix
        
        self.LOG_LEVEL = config.logging.level
        self.LOG_FILE = config.logging.file
        
        self.JWT_SECRET_KEY = config.security.jwt_secret_key
        self.JWT_ACCESS_TOKEN_EXPIRES = config.security.jwt_access_token_expires
        self.JWT_REFRESH_TOKEN_EXPIRES = config.security.jwt_refresh_token_expires
        
        # External services with defaults
        if config.external_services:
            self.OPENAI_API_KEY = config.external_services.openai_api_key
            self.GOOGLE_ANALYTICS_ID = config.external_services.google_analytics_id
        else:
            self.OPENAI_API_KEY = None
            self.GOOGLE_ANALYTICS_ID = None

def get_settings() -> Settings:
    """Get application settings (backward compatibility wrapper)."""
    return Settings(config)

config = load_config()
os.environ["AWS_ACCESS_KEY_ID"] = config.aws.access_key.AWS_ACCESS_KEY_ID
os.environ["AWS_SECRET_ACCESS_KEY"] = config.aws.access_key.AWS_SECRET_ACCESS_KEY
os.environ["AWS_DEFAULT_REGION"] = config.aws.access_key.AWS_DEFAULT_REGION

