from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv
import logging

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# 构建 DATABASE_URL 并添加错误处理
DATABASE_URL = os.getenv("DATABASE_URL")

# 如果 DATABASE_URL 不存在，从单独的环境变量构建
if not DATABASE_URL:
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', '12345')
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME', 'cac_education')
    DATABASE_URL = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

logger.info(f"正在使用数据库 URL: {DATABASE_URL}")

# 初始化數據庫連接變數
engine = None
SessionLocal = None

try:
    engine = create_engine(DATABASE_URL, echo=False)
    
    # 测试数据库连接
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))  # ✅ 修復：使用 text() 函數
        logger.info("✅ PostgreSQL 数据库连接成功")
        
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
except Exception as e:
    logger.error(f"❌ PostgreSQL 连接失败: {e}")
    logger.info("🔄 切换到 SQLite 数据库...")
    
    try:
        # 使用 SQLite 作为后备方案
        DATABASE_URL = "sqlite:///./cac_education.db"
        engine = create_engine(DATABASE_URL, echo=False)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        logger.info("✅ 使用 SQLite 数据库")
    except Exception as sqlite_error:
        logger.error(f"❌ SQLite 連接也失敗: {sqlite_error}")
        raise Exception("無法連接到任何資料庫")

Base = declarative_base()

class HealthEducationRecord(Base):
    __tablename__ = "health_education_records"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_name = Column(String(100), nullable=False)
    patient_age = Column(Integer, nullable=False)
    cac_score = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)  # Low, Moderate, High, Very High
    generated_content = Column(Text, nullable=False)
    prompt_used = Column(Text, nullable=False)
    model_used = Column(String(100), nullable=True)  # 新增：記錄使用的模型
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<HealthEducationRecord(id={self.id}, patient_name='{self.patient_name}', cac_score={self.cac_score}, model_used='{self.model_used}')>"

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(String(10), primary_key=True)
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(10), nullable=True)
    cac_score = Column(Float, nullable=False)
    medical_history = Column(Text, nullable=True)
    lifestyle_factors = Column(Text, nullable=True)
    patient_data = Column(Text, nullable=False)  # 存儲JSON字串
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Patient(id='{self.id}', name='{self.name}', cac_score={self.cac_score})>"

class PromptTemplate(Base):
    __tablename__ = "prompt_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    template_name = Column(String(100), nullable=False)
    template_content = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)  # risk_assessment, lifestyle, medication
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<PromptTemplate(id={self.id}, template_name='{self.template_name}', category='{self.category}')>"

# 获取数据库连线
def get_db():
    """
    獲取資料庫會話
    """
    if SessionLocal is None:
        raise Exception("資料庫未初始化")
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 建立数据表（添加错误处理）
def init_database():
    """
    初始化資料庫表格
    """
    try:
        if engine is None:
            raise Exception("資料庫引擎未初始化")
            
        Base.metadata.create_all(bind=engine)
        logger.info("✅ 数据表创建成功")
        return True
    except Exception as e:
        logger.error(f"❌ 创建数据表时出错: {e}")
        return False

# 檢查資料庫健康狀態
def check_database_health():
    """
    檢查資料庫連接狀態
    """
    try:
        if engine is None:
            return False
            
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))  # ✅ 修復：使用 text() 函數
            return True
    except Exception as e:
        logger.error(f"資料庫健康檢查失敗: {e}")
        return False

# 如果作為主模組執行，初始化資料庫
if __name__ == "__main__":
    init_database()