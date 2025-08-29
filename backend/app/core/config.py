import os
from typing import List
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

class Config:
    """應用程式配置類別"""
    
    # 🔧 API 基本設定
    API_HOST: str = os.getenv("API_HOST", "127.0.0.1")
    API_PORT: int = int(os.getenv("API_PORT", 8000))
    API_WORKERS: int = int(os.getenv("API_WORKERS", 1))
    
    # 🔧 Ollama 設定
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
    OLLAMA_TIMEOUT: int = int(os.getenv("OLLAMA_TIMEOUT", 300))  # 5分鐘
    
    # 🔧 資料庫設定
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./cac_health_education.db"
    )
    
    # 🔧 CORS 設定
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000", 
        "http://localhost:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5175",
    ]
    
    # 🔧 模型相關設定
    DEFAULT_GENERATION_PARAMS = {
        "temperature": 0.7,
        "top_p": 0.9,
        "top_k": 40,
        "repeat_penalty": 1.1,
        "max_tokens": 2000
    }
    
    # 🔧 支援的模型列表
    SUPPORTED_MODELS = [
        {
            "name": "llama3.1:8b",
            "display_name": "Llama 3.1 8B",
            "description": "高品質通用模型，適合複雜任務",
            "family": "llama",
            "size": "8B",
            "recommended_timeout": 360
        },
        {
            "name": "llama3.2:3b",
            "display_name": "Llama 3.2 3B", 
            "description": "輕量快速模型，適合簡單任務",
            "family": "llama",
            "size": "3B",
            "recommended_timeout": 180
        },
        {
            "name": "mistral:7b",
            "display_name": "Mistral 7B",
            "description": "平衡性能與資源的優秀模型",
            "family": "mistral", 
            "size": "7B",
            "recommended_timeout": 300
        }
    ]
    
    # 🔧 日誌設定
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "app.log")
    
    # 🔧 快取設定
    MODEL_CACHE_TTL: int = int(os.getenv("MODEL_CACHE_TTL", 300))  # 5分鐘
    
    @classmethod
    def get_model_timeout(cls, model_name: str) -> int:
        """根據模型名稱取得建議的超時時間"""
        for model in cls.SUPPORTED_MODELS:
            if model["name"] == model_name:
                return model.get("recommended_timeout", cls.OLLAMA_TIMEOUT)
        return cls.OLLAMA_TIMEOUT
    
    @classmethod
    def get_model_info(cls, model_name: str) -> dict:
        """根據模型名稱取得模型資訊"""
        for model in cls.SUPPORTED_MODELS:
            if model["name"] == model_name:
                return model
        return {
            "name": model_name,
            "display_name": model_name,
            "description": "未知模型",
            "family": "unknown",
            "size": "unknown"
        }
    
    @classmethod
    def validate_config(cls) -> bool:
        """驗證配置是否正確"""
        try:
            # 檢查必要的環境變數
            required_vars = ["OLLAMA_URL"]
            for var in required_vars:
                if not os.getenv(var):
                    print(f"⚠️  警告：環境變數 {var} 未設定，使用預設值")
            
            # 檢查 Ollama URL 格式
            if not cls.OLLAMA_URL.startswith(("http://", "https://")):
                print(f"❌ 錯誤：OLLAMA_URL 格式不正確: {cls.OLLAMA_URL}")
                return False
            
            print("✅ 配置驗證通過")
            return True
            
        except Exception as e:
            print(f"❌ 配置驗證失敗: {e}")
            return False

# 建立配置實例
config = Config()

# 在模組載入時驗證配置
if __name__ == "__main__":
    print("🔧 CAC 衛教生成器 - 配置檢查")
    print(f"API: {config.API_HOST}:{config.API_PORT}")
    print(f"Ollama: {config.OLLAMA_URL}")
    print(f"預設模型: {config.OLLAMA_MODEL}")
    print(f"資料庫: {config.DATABASE_URL}")
    
    if config.validate_config():
        print("✅ 配置檢查通過，系統可以啟動")
    else:
        print("❌ 配置檢查失敗，請修正後再試")