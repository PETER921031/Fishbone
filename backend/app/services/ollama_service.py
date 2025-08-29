import aiohttp
import asyncio
import json
import os
from typing import Dict, Any, List
from dotenv import load_dotenv
import logging

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class OllamaService:
    def __init__(self):
        self.base_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        # 預設模型仍然從環境變數讀取，但現在支援動態切換
        self.default_model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
        
        # 可用的模型列表
        self.available_models = [
            {
                "name": "llama3.1:8b",
                "display_name": "Llama 3.1 8B",
                "description": "高品質通用模型，適合複雜任務"
            },
            {
                "name": "llama3.2:3b", 
                "display_name": "Llama 3.2 3B",
                "description": "輕量快速模型，適合簡單任務"
            },
            {
                "name": "mistral:7b",
                "display_name": "Mistral 7B", 
                "description": "平衡性能與資源的優秀模型"
            }
        ]
        
        logger.info(f"Ollama URL: {self.base_url}")
        logger.info(f"預設模型: {self.default_model}")
    
    async def get_available_models(self) -> List[Dict[str, Any]]:
        """
        取得可用的模型列表
        """
        try:
            # 檢查 Ollama 上實際安裝的模型
            url = f"{self.base_url}/api/tags"
            timeout = aiohttp.ClientTimeout(total=10)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        logger.warning("無法獲取 Ollama 模型列表，返回預設列表")
                        return self.available_models
                    
                    data = await response.json()
                    installed_models = [model.get("name", "") for model in data.get("models", [])]
                    
                    # 過濾出實際安裝的模型
                    available = []
                    for model in self.available_models:
                        if model["name"] in installed_models:
                            available.append(model)
                        else:
                            logger.info(f"模型 {model['name']} 未安裝")
                    
                    if not available:
                        logger.warning("沒有找到已安裝的預設模型，返回完整列表")
                        return self.available_models
                    
                    logger.info(f"可用模型: {[m['name'] for m in available]}")
                    return available
                    
        except Exception as e:
            logger.error(f"檢查模型可用性時發生錯誤: {e}")
            return self.available_models
    
    async def generate_response(self, prompt: str, model: str = None, **options) -> str:
        """
        使用 Ollama 生成回應
        :param prompt: 輸入的提示詞
        :param model: 指定的模型名稱，如果為 None 則使用預設模型
        :param options: 其他生成選項
        """
        # 如果沒有指定模型，使用預設模型
        selected_model = model or self.default_model
        
        url = f"{self.base_url}/api/generate"
        
        default_options = {
            "temperature": 0.7,
            "top_p": 0.9,
            "max_tokens": 2000,
            "stop": ["<|eot_id|>", "<|end_of_text|>"]
        }
        default_options.update(options)
        
        data = {
            "model": selected_model,
            "prompt": prompt,
            "stream": False,
            "options": default_options
        }
        
        logger.info(f"正在向 Ollama 發送請求: {url}")
        logger.info(f"使用模型: {selected_model}")
        
        try:
            timeout = aiohttp.ClientTimeout(total=300, connect=30)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(url, json=data) as response:
                    logger.info(f"Ollama 回應狀態碼: {response.status}")
                    
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Ollama API 錯誤: {response.status} - {error_text}")
                        raise Exception(f"Ollama API 錯誤 ({response.status}): {error_text}")
                    
                    result = await response.json()
                    generated_text = result.get("response", "")
                    
                    if not generated_text:
                        logger.warning("Ollama 回應為空")
                        raise Exception("Ollama 生成的內容為空")
                    
                    logger.info(f"成功生成內容，長度: {len(generated_text)} 字符")
                    return generated_text
                    
        except asyncio.TimeoutError:
            logger.error("Ollama 請求超時")
            raise Exception("Ollama 服務請求超時，請檢查模型是否正在運行或嘗試使用較小的模型")
        except aiohttp.ClientConnectorError as e:
            logger.error(f"無法連接到 Ollama 服務: {e}")
            raise Exception(f"無法連接到 Ollama 服務 ({self.base_url})，請確認 Ollama 是否正在運行")
        except aiohttp.ClientError as e:
            logger.error(f"Ollama 客戶端錯誤: {e}")
            raise Exception(f"Ollama API 錯誤: {str(e)}")
        except json.JSONDecodeError as e:
            logger.error(f"JSON 解析錯誤: {e}")
            raise Exception(f"Ollama 回應格式錯誤: {str(e)}")
        except Exception as e:
            logger.error(f"未預期錯誤: {e}")
            raise Exception(f"生成內容時發生未預期錯誤: {str(e)}")
    
    async def health_check(self) -> bool:
        """
        檢查 Ollama 服務是否正常運作
        """
        try:
            url = f"{self.base_url}/api/tags"
            logger.info(f"檢查 Ollama 健康狀態: {url}")
            
            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url) as response:
                    is_healthy = response.status == 200
                    logger.info(f"Ollama 健康狀態: {'正常' if is_healthy else '異常'}")
                    return is_healthy
        except Exception as e:
            logger.error(f"Ollama 健康檢查失敗: {e}")
            return False
    
    async def check_model_availability(self, model: str = None) -> bool:
        """
        檢查指定模型是否可用
        :param model: 模型名稱，如果為 None 則檢查預設模型
        """
        target_model = model or self.default_model
        
        try:
            url = f"{self.base_url}/api/tags"
            timeout = aiohttp.ClientTimeout(total=10)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        return False
                    
                    data = await response.json()
                    models = data.get("models", [])
                    model_names = [model.get("name", "") for model in models]
                    
                    is_available = target_model in model_names
                    logger.info(f"模型 {target_model} 可用性: {'是' if is_available else '否'}")
                    logger.info(f"可用模型列表: {model_names}")
                    
                    return is_available
        except Exception as e:
            logger.error(f"檢查模型可用性時發生錯誤: {e}")
            return False

# 建立全域實例
ollama_service = OllamaService()