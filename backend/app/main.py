# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# ✅ 設定正確的 Python 路徑
current_file = Path(__file__).resolve()
app_dir = current_file.parent  # backend/app/
backend_dir = app_dir.parent   # backend/
project_root = backend_dir.parent  # cac-health-education-generator/

# 將 backend 目錄加入 Python 路徑
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

print(f"📁 App 目錄: {app_dir}")
print(f"📁 Backend 目錄: {backend_dir}")
print(f"📁 專案根目錄: {project_root}")

# ✅ 載入環境變數
ENV_PATH = backend_dir / ".env"
load_dotenv(dotenv_path=ENV_PATH)
print(f"🔧 載入環境變數: {ENV_PATH}")

# ✅ 導入模組
try:
    from api.endpoints import router
    from models.database import init_database, check_database_health
    print("✅ 模組載入成功")
except ImportError as e:
    print(f"❌ 模組載入失敗: {e}")
    print(f"Python 路徑: {sys.path}")
    raise

# ✅ 建立 FastAPI 實例
app = FastAPI(
    title="CAC 衛教單生成器 API",
    description="基於 Ollama + Llama 3.1 8B 的冠狀動脈鈣化衛教材料自動生成系統",
    version="1.0.0",
)

# ✅ CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 註冊路由
app.include_router(router, prefix="/api/v1", tags=["CAC Education"])

# ✅ 啟動時初始化資料庫
@app.on_event("startup")
async def on_startup():
    """應用啟動時執行"""
    try:
        print("🔍 檢查資料庫連接...")
        if check_database_health():
            print("✅ 資料庫連接正常")
            if init_database():
                print("✅ 資料表初始化完成")
            else:
                print("⚠️ 資料表初始化失敗，但服務仍會啟動")
        else:
            print("⚠️ 資料庫連接失敗，但服務仍會啟動")
    except Exception as e:
        print(f"⚠️ 啟動時發生錯誤，但服務仍會啟動：{e}")

@app.get("/", response_class=HTMLResponse)
async def root():
    """首頁"""
    return """
    <html>
        <head>
            <title>CAC 衛教單生成器 API</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f8f9fa; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #2c3e50; text-align: center; }
                .info { background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db; }
                .endpoint { background: #3498db; color: white; padding: 12px; margin: 8px 0; border-radius: 6px; font-family: monospace; }
                .status { background: #2ecc71; color: white; padding: 10px; border-radius: 6px; text-align: center; margin: 10px 0; }
                a { color: #3498db; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🏥 CAC 衛教單生成器 API</h1>
                <div class="status">✅ 服務運行中</div>
                
                <div class="info">
                    <h3>📋 系統資訊</h3>
                    <ul>
                        <li>🤖 AI 模型：Ollama + Llama 3.1 8B</li>
                        <li>💾 資料庫：PostgreSQL (備援 SQLite)</li>
                        <li>🔗 API 框架：FastAPI</li>
                        <li>📊 專業領域：冠狀動脈鈣化衛教</li>
                    </ul>
                </div>

                <h3>🔗 主要 API 端點</h3>
                <div class="endpoint">POST /api/v1/generate-education - 生成衛教資料</div>
                <div class="endpoint">GET /api/v1/education-records - 取得衛教記錄</div>
                <div class="endpoint">POST /api/v1/health-check/ollama - 檢查 Ollama 狀態</div>
                <div class="endpoint">GET /api/v1/statistics - 取得統計資訊</div>

                <div style="text-align: center; margin-top: 30px;">
                    <p>📖 <a href="/docs" target="_blank">查看完整 API 文件 (Swagger UI)</a></p>
                    <p>📋 <a href="/redoc" target="_blank">查看 API 文件 (ReDoc)</a></p>
                </div>
            </div>
        </body>
    </html>
    """

@app.get("/health")
async def health_check():
    """健康檢查端點"""
    db_healthy = check_database_health()
    return {
        "status": "healthy" if db_healthy else "degraded",
        "service": "CAC Health Education Generator",
        "version": "1.0.0",
        "database": "connected" if db_healthy else "disconnected",
    }

# ✅ 手動啟動設定
if __name__ == "__main__":
    import uvicorn
    host = os.getenv("API_HOST", "127.0.0.1")
    port = int(os.getenv("API_PORT", 8000))
    
    print(f"\n🚀 CAC 衛教單生成器 API 啟動中...")
    print(f"📍 服務位置: http://{host}:{port}")
    print(f"📁 工作目錄: {os.getcwd()}")
    print(f"📖 API 文件: http://{host}:{port}/docs")
    print(f"🏥 首頁: http://{host}:{port}")
    print("=" * 60)
    
    uvicorn.run(
        app,  # 直接傳入 app 物件
        host=host, 
        port=port, 
        reload=False,  # 手動啟動建議關閉 reload
        log_level="info"
    )